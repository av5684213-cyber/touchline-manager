"use client";

import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { simulateBotMatch } from "@/lib/botAI";

/**
 * Cloud Save — kullanıcı oyun state'ini Supabase'e kaydeder/yükler.
 *
 * v2.9.20 GÖREV 1: Birleşik debounce'lu auto-save.
 * Tüm state değişiklikleri 3 sn genel debounce ile kaydedilir.
 * Taktik değişiklikleri ek olarak 1.5 sn hızlı debounce ile ayrı
 * active_tactics tablosuna da yazılır (multiplayer uyumu için).
 *
 * Tek bir bulut-save mekanizması:
 * 1. user_game_state.state (JSONB) — tüm state'in tam kopyası (rx_load_game_state)
 * 2. active_tactics — taktik + lineup + roller + talimatlar (multiplayer join'leri için)
 * 3. app_state.state (JSONB) — tesis/antrenman/haberler/kupa/sponsor/kredi (multiplayer için)
 *
 * Eskiden store.ts'te saveToCloud/saveTacticsToCloud vardı — dead code idi
 * (use-cloud-sync.ts tarafından çağrılıyordu, o da çağrılmıyordu).
 * Artık tek bulut-save mekanizması cloud-save.ts içinde.
 */

// HARIÇ TUTULAN (blacklist) — cihaza özel veya geçici alanlar
const CLOUD_SAVE_BLACKLIST = new Set<string>([
  "isAuthed",      // session-only, kalıcı olmamalı
  "_persist",      // zustand persist middleware (kullanılmıyor ama güvenlik)
  "__internal__",  // internal flag'ler
  // v2.9.62: allLeagues cloud-save'e YAZILMAZ — ~25-33MB payload çok büyük
  // localStorage limitini (5-10MB) aşar, Supabase RPC timeout riski
  // allLeagues her login'de generateAllLeagues ile yeniden üretilir (deterministic)
  "allLeagues",
]);

// v2.9.64: _archetypeMigrationDone whitelist — kalıcı flag, cloud'a kaydedilmeli
const CLOUD_SAVE_WHITELIST = new Set<string>([
  "_archetypeMigrationDone",
]);

/**
 * BULGU #9 DÜZELTME (v2.9.2): Hibrit blacklist + convention yaklaşımı.
 * "_" prefix ile başlayan tüm alanlar transient sayılır.
 * v2.9.64: Whitelist öncelikli — _archetypeMigrationDone kalıcı flag
 */
function isBlacklisted(key: string): boolean {
  if (CLOUD_SAVE_WHITELIST.has(key)) return false; // whitelist öncelikli
  if (CLOUD_SAVE_BLACKLIST.has(key)) return true;
  if (key.startsWith("_")) return true;
  return false;
}

/**
 * State'in tüm kalıcı alanlarını döndürür (blacklist hariç).
 */
function pickPersistentState(state: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(state)) {
    if (isBlacklisted(key)) continue;
    if (typeof state[key] === "function") continue;
    result[key] = state[key];
  }
  return result;
}

const SAVE_DEBOUNCE_MS = 3000;           // Genel state için 3 sn
const TACTICS_SAVE_DEBOUNCE_MS = 1500;   // Taktik için 1.5 sn (daha hızlı)

let generalSaveTimeoutId: ReturnType<typeof setTimeout> | null = null;
let tacticsSaveTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isLoaded = false;
let unsubscribeFn: (() => void) | null = null;

// P0 FIX: localStorage yedeği — bulut bağlantısı yoksa veya hata verirse
const LOCAL_STORAGE_KEY = "tm_game_state_backup";

/**
 * Kullanıcının cloud state'ini yükler.
 */
export async function loadGameState(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc("rpc_load_game_state", { p_profile_id: userId });

    if (error) {
      console.warn("[cloud-save] Load error:", error.message);
      return loadFromLocalStorage();
    }

    if (data && Object.keys(data).length > 0) {
      const cloudState = data as Record<string, unknown>;

      // v2.9.74 FIX O8: Shallow merge yerine deep merge.
      // Eski kod: {...prev, ...cloudState} — nested objeler (tactics.slotRoles,
      // transfer.freeAgents) cloud'dan gelen ile tamamen değiştirilirdi →
      // slotRoles kaybolur. Yeni: deep merge ile nested objeleri birleştir.
      useAppStore.setState((prev) => {
        const merged = { ...prev };
        for (const key of Object.keys(cloudState)) {
          const cloudVal = cloudState[key];
          const prevVal = (prev as any)[key];
          // Sadece plain objeleri deep merge et (array, function, primitive değil)
          if (
            cloudVal && typeof cloudVal === "object" && !Array.isArray(cloudVal) &&
            prevVal && typeof prevVal === "object" && !Array.isArray(prevVal)
          ) {
            (merged as any)[key] = { ...prevVal, ...cloudVal };
          } else {
            (merged as any)[key] = cloudVal;
          }
        }
        return { ...merged, isAuthed: true } as any;
      });

      // v2.9.62: allLeagues cloud'dan gelmez (blacklist) — eksikse yeniden üret
      // Kullanıcının ligindeki clubs array'i ile senkronize et
      if (!useAppStore.getState().allLeagues || Object.keys(useAppStore.getState().allLeagues).length === 0) {
        const currentState = useAppStore.getState() as any;
        const userCountry = currentState.userCountryCode || "TR";
        const userTier = (currentState.clubs?.[0]?.leagueTier ?? 2) as any;
        const { generateAllLeagues, makeLeagueKey } = await import("@/lib/global-leagues");
        const freshLeagues = generateAllLeagues(userCountry, userTier);
        const userKey = makeLeagueKey(userCountry, userTier);
        if (freshLeagues[userKey] && currentState.clubs) {
          freshLeagues[userKey].hasUser = true;
          freshLeagues[userKey].clubs = currentState.clubs;
          freshLeagues[userKey].fixtures = currentState.fixtures ?? [];
          freshLeagues[userKey].seasonMatchday = currentState.seasonMatchday ?? 1;
        }

        // v2.9.63 FIX: Catch-up — kullanıcının mevcut matchday'ine kadar diğer liglerin maçlarını oynat
        // Eski kod: diğer ligler matchday 1'de kalıyordu → CL katılımcıları rastgele, global gol kralı boş
        // Yeni: kullanıcı hangi matchday'deyse, diğer ligleri de oraya kadar simüle et
        const targetMatchday = currentState.seasonMatchday ?? 1;
        if (targetMatchday > 1) {
          console.log(`[cloud-save] Catch-up: diğer ligleri matchday ${targetMatchday}'e kadar oynat`);
          catchUpAllLeagues(freshLeagues, targetMatchday);
        }

        useAppStore.setState({ allLeagues: freshLeagues });
        console.log("[cloud-save] allLeagues regenerated (was missing from cloud)");
      }

      saveToLocalStorage(cloudState);

      console.log("[cloud-save] State loaded from cloud");
      isLoaded = true;
      return true;
    }

    // Cloud'da state yok — mevcut state'i cloud'a yükle
    console.log("[cloud-save] No cloud state, uploading current");
    await saveGameState(userId, true);
    isLoaded = true;
    return true;
  } catch (e) {
    console.warn("[cloud-save] Load exception:", e);
    return loadFromLocalStorage();
  }
}

/**
 * P0 FIX: localStorage'a state yedeği kaydet.
 */
function saveToLocalStorage(state: Record<string, unknown>) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("[cloud-save] localStorage save error:", e);
  }
}

/**
 * P0 FIX: localStorage'dan state yükle.
 */
function loadFromLocalStorage(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return false;

    const localState = JSON.parse(saved);
    if (localState && Object.keys(localState).length > 0) {
      useAppStore.setState((prev) => ({
        ...prev,
        ...localState,
        isAuthed: true,
      }));
      console.log("[cloud-save] State loaded from localStorage backup");
      isLoaded = true;
      return true;
    }
    return false;
  } catch (e) {
    console.warn("[cloud-save] localStorage load error:", e);
    return false;
  }
}

/**
 * v2.9.20 GÖREV 1: Ayrı tablolara multiplayer uyumlu kayıt.
 * - active_tactics: taktik + lineup + roller + talimatlar
 * - app_state: tesis/antrenman/haberler/kupa/sponsor/kredi/cosmetics/blockedUsers
 *
 * Bu, loadMultiplayerState fonksiyonunun okuduğu tablolara yazar.
 * Böylece multiplayer modda taktik ve tesis verisi güncel kalır.
 */
async function saveToMultiplayerTables(userId: string): Promise<void> {
  try {
    const { supabase: supabaseClient } = await import("@/lib/supabase/client");
    const s = useAppStore.getState();

    // active_tactics — taktik + lineup + roller + talimatlar
    const { error: tacErr } = await supabaseClient().from("active_tactics").upsert({
      profile_id: userId,
      tactic_data: s.tactics.active,
      lineup_data: s.tactics.lineup,
      slot_roles: s.tactics.slotRoles,
      active_instructions: s.tactics.activeInstructions,
      // v2.9.86: Yedek sabitleme — pinned_bench kolonu (migration 039 ile eklendi)
      pinned_bench: s.tactics.pinnedBench ?? [],
    }, { onConflict: "profile_id" });
    if (tacErr) {
      console.warn("[cloud-save] active_tactics save error:", tacErr.message);
    }

    // app_state — tesis/antrenman/haberler/kupa/sponsor/kredi/cosmetics/blockedUsers
    // + sezon bilgisi (loadMultiplayerState tarafından app_state'ten okunur)
    const { error: appErr } = await supabaseClient().from("app_state").upsert({
      user_id: userId,
      state: {
        facilities: s.facilities,
        training: s.training,
        news: s.news,
        cup: s.cup,
        sponsors: s.sponsors,
        credits: s.credits,
        cosmetics: s.cosmetics,
        blockedUsers: s.blockedUsers,
        seasonMatchday: s.seasonMatchday,
        seasonNumber: s.seasonNumber,
        seasonStartStats: s.seasonStartStats,
        pendingGains: s.pendingGains, // v2.9.34 F2
        championsLeague: s.championsLeague, // v2.9.41
        transfer: s.transfer,
        youthAcademy: s.youthAcademy,
        // v2.9.50: Günlük görevler cloud-save'e dahil
        dailyTasks: s.dailyTasks,
        // v2.9.54: Dil tercihi cloud-save'e dahil (cihazlar arası senkron)
        locale: typeof localStorage !== "undefined" ? localStorage.getItem("tm.locale") : null,
        // v2.9.29 P2-5: cardInventory multiplayer save'e ekle
        cardInventory: s.cardInventory,
        // v2.9.20 GÖREV 7: onboarding state — grace period için
        onboarding: s.onboarding,
      },
    }, { onConflict: "user_id" });
    if (appErr) {
      console.warn("[cloud-save] app_state save error:", appErr.message);
    }
  } catch (e: any) {
    console.warn("[cloud-save] Multiplayer tables save exception:", e?.message ?? e);
  }
}

/**
 * Sadece active_tactics tablosuna kayıt yapar (taktik değiştiğinde çağrılır).
 * app_state zaten genel debounce ile kaydedilecektir.
 *
 * v2.9.27 G1: Retry mekanizması eklendi — başarısız olursa 3 kez dener
 * (1s, 2s, 4s gecikme ile exponential backoff).
 */
async function saveTacticsToTable(userId: string): Promise<void> {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { supabase: supabaseClient } = await import("@/lib/supabase/client");
      const s = useAppStore.getState();

      const { error: tacErr } = await supabaseClient().from("active_tactics").upsert({
        profile_id: userId,
        tactic_data: s.tactics.active,
        lineup_data: s.tactics.lineup,
        slot_roles: s.tactics.slotRoles,
        active_instructions: s.tactics.activeInstructions,
        // v2.9.86: Yedek sabitleme — pinned_bench kolonu
        pinned_bench: s.tactics.pinnedBench ?? [],
      }, { onConflict: "profile_id" });

      if (tacErr) {
        console.warn(`[cloud-save] tactics save error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, tacErr.message);
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
          continue;
        }
        // Son deneme de başarısız — localStorage'a yedekle
        if (typeof window !== "undefined") {
          try {
            const state = useAppStore.getState();
            localStorage.setItem("tm_tactics_pending_sync", JSON.stringify({
              tactics: state.tactics,
              _pendingAt: Date.now(),
            }));
          } catch { /* ignore */ }
        }
        return;
      }

      // Başarılı — pending sync varsa temizle
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("tm_tactics_pending_sync");
        } catch { /* ignore */ }
      }
      return; // başarılı, döngüden çık
    } catch (e: any) {
      console.warn(`[cloud-save] Tactics save exception (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, e?.message ?? e);
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
        continue;
      }
      // Son deneme de başarısız — localStorage'a yedekle
      if (typeof window !== "undefined") {
        try {
          const state = useAppStore.getState();
          localStorage.setItem("tm_tactics_pending_sync", JSON.stringify({
            tactics: state.tactics,
            _pendingAt: Date.now(),
          }));
        } catch { /* ignore */ }
      }
    }
  }
}

/**
 * Mevcut store state'ini Supabase'e kaydeder.
 * Debounce'lu — 3 saniye içinde birden fazla çağrı gelirse sonuncusu çalışır.
 *
 * v2.9.20: Artık user_game_state (JSONB) + active_tactics + app_state
 * tablolarının üçüne de yazıyor (multiplayer uyumu için).
 */

/**
 * v2.9.74 FIX Y8: Offline queue'yu flush et — login olduğunda çağrılır.
 * Eski kod: saveGameState retry'lar başarısız olunca tm_state_pending_sync
 * localStorage'ına push yapıyordu, ama initCloudSave bunu okumuyordu →
 * 5 kayıttan sonrası kaybolurdu.
 * Yeni: login'de queue'yu oku, her bir kaydı Supabase'e yaz, sonra temizle.
 */
async function flushPendingSyncQueue(userId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("tm_state_pending_sync");
    if (!raw) return;
    const pending = JSON.parse(raw) as Array<{ state: any; _pendingAt: number }>;
    if (!Array.isArray(pending) || pending.length === 0) return;

    console.log(`[cloud-save] Flushing ${pending.length} pending state(s) from offline queue`);
    for (const item of pending) {
      try {
        await supabase.rpc("rpc_save_game_state", {
          p_profile_id: userId,
          p_state: item.state,
          p_version: 1,
        });
      } catch (e) {
        console.warn("[cloud-save] Pending sync item failed:", e);
        // Devam et — diğer item'ları dene
      }
    }
    // Tüm item'lar işlendi (başarılı veya değil) — queue'yu temizle
    localStorage.removeItem("tm_state_pending_sync");
    console.log("[cloud-save] Pending queue flushed");
  } catch (e) {
    console.warn("[cloud-save] flushPendingSyncQueue exception:", e);
  }
}

export function saveGameState(userId: string, immediate: boolean = false) {
  if (!isLoaded && !immediate) return;

  const doSave = async () => {
    try {
      const state = useAppStore.getState();
      const stateToSave = pickPersistentState(state as unknown as Record<string, unknown>);

      // P0 FIX: localStorage'a da yedekle
      saveToLocalStorage(stateToSave);

      // v2.9.73: rpc_save_game_state için retry + exponential backoff
      // (saveTacticsToTable ile aynı pattern — network hatası durumunda state kaybolmasın)
      const MAX_RETRIES = 3;
      const RETRY_DELAYS = [1000, 2000, 4000];
      let savedSuccessfully = false;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const { error } = await supabase.rpc("rpc_save_game_state", {
          p_profile_id: userId,
          p_state: stateToSave,
          p_version: 1,
        });

        if (!error) {
          savedSuccessfully = true;
          break;
        }

        console.warn(
          `[cloud-save] Save error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`,
          error.message
        );

        // 42501 = forbidden (auth.uid mismatch), 23505 = unique_violation
        // Bu hatalar retry ile çözülmez — döngüden çık
        if (error.code === "42501" || error.code === "23505") {
          break;
        }

        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
        }
      }

      if (!savedSuccessfully) {
        // Tüm denemeler başarısız — localStorage'a yedekle (offline queue)
        if (typeof window !== "undefined") {
          try {
            const pending = JSON.parse(localStorage.getItem("tm_state_pending_sync") ?? "[]");
            pending.push({ state: stateToSave, _pendingAt: Date.now() });
            // Son 5 kaydı tut
            localStorage.setItem(
              "tm_state_pending_sync",
              JSON.stringify(pending.slice(-5))
            );
          } catch { /* ignore */ }
        }
      } else {
        // Başarılı — pending sync varsa temizle
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("tm_state_pending_sync");
          } catch { /* ignore */ }
        }
      }

      // v2.9.20: Multiplayer tablolarına da yaz (active_tactics + app_state)
      // Eğer rpc_save_game_state başarısız olursa bile multiplayer tabloları denenecek
      await saveToMultiplayerTables(userId);
    } catch (e) {
      console.warn("[cloud-save] Save exception:", e);
    }
  };

  if (immediate) {
    doSave();
    return;
  }

  // Debounce
  if (generalSaveTimeoutId) clearTimeout(generalSaveTimeoutId);
  generalSaveTimeoutId = setTimeout(doSave, SAVE_DEBOUNCE_MS);
}

/**
 * v2.9.26 T1: Taktik için hızlı debounce'lu kayıt.
 * Taktik değişikliği daha kritik (kullanıcı anında görmek istiyor) — 1.5 sn.
 * user_game_state JSON'a yazmaz, sadece active_tactics tablosuna yazar.
 * (JSON'a yazım genel debounce ile 3 sn sonra yapılır.)
 *
 * v2.9.26 T1: isLoaded kontrolü KALDIRILDI — taktik her zaman kaydedilsin.
 * Eski: isLoaded false ise taktik kaydedilmiyordu (loadGameState bitmeden önce).
 * Yeni: isLoaded bağımsız, taktik değişikliği her zaman kaydedilir.
 * Bu, Android'de beforeunload güvenilmez olduğu için kritik —
 * kullanıcı taktik değiştirip ana ekrana dönerse, değişiklik 1.5 sn içinde kaydedilir.
 */
export function saveTacticsState(userId: string, immediate: boolean = false) {
  // v2.9.26: isLoaded kontrolü yok — her zaman kaydet
  const doSave = async () => {
    try {
      await saveTacticsToTable(userId);
      // v2.9.26: localStorage'a da taktik yedekle (offline koruma)
      if (typeof window !== "undefined") {
        try {
          const state = useAppStore.getState();
          const tacticsBackup = { tactics: state.tactics, _timestamp: Date.now() };
          localStorage.setItem("tm_tactics_backup", JSON.stringify(tacticsBackup));
        } catch {
          /* localStorage erişilemezse sessizce geç */
        }
      }
    } catch (e: any) {
      console.warn("[cloud-save] Tactics save failed:", e?.message ?? e);
    }
  };

  if (immediate) {
    doSave();
    return;
  }

  if (tacticsSaveTimeoutId) clearTimeout(tacticsSaveTimeoutId);
  tacticsSaveTimeoutId = setTimeout(doSave, TACTICS_SAVE_DEBOUNCE_MS);
}

/**
 * Cloud save'i başlat — store değişikliklerini dinler.
 * Auth context'te kullanıcı giriş yapınca çağrılır.
 *
 * v2.9.20: Taktik değiştiyse ek olarak hızlı debounce tetiklenir.
 * v2.9.26 T1: visibilitychange ile arka plana atınca hemen kaydet (Android güvenilirliği)
 */
let currentUserId: string | null = null;
let visibilityHandler: (() => void) | null = null;

export function initCloudSave(userId: string) {
  currentUserId = userId;
  // v2.9.74 FIX Y8: Önce offline queue'yu flush et (login öncesi bekleyen state'ler)
  flushPendingSyncQueue(userId);
  // Sonra yükle
  loadGameState(userId).then(() => {
    // Sonra store değişikliklerini dinle
    if (unsubscribeFn) {
      unsubscribeFn();
      unsubscribeFn = null;
    }
    unsubscribeFn = useAppStore.subscribe((state, prevState) => {
      const stateKeys = Object.keys(state);
      for (const key of stateKeys) {
        if (isBlacklisted(key)) continue;
        if (typeof (state as any)[key] === "function") continue;
        if ((state as any)[key] !== (prevState as any)[key]) {
          // v2.9.20: Taktik değiştiyse ek olarak hızlı debounce tetikle
          if (key === "tactics") {
            saveTacticsState(userId);
          }
          // Genel debounce (user_game_state JSON + active_tactics + app_state)
          saveGameState(userId);
          return;
        }
      }
    });

    // v2.9.26 T1: visibilitychange — Android'de arka plana atınca hemen kaydet
    // beforeunload güvenilir değil, ama visibilitychange daha güvenilir.
    // Kullanıcı ana ekran tuşuna basınca document.visibilityState = 'hidden' olur.
    if (typeof document !== "undefined") {
      // Eski handler'ı temizle
      if (visibilityHandler) {
        document.removeEventListener("visibilitychange", visibilityHandler);
      }
      visibilityHandler = () => {
        if (document.visibilityState === "hidden" && currentUserId) {
          // Bekleyen debounce'lu save'leri hemen çalıştır
          if (tacticsSaveTimeoutId) {
            clearTimeout(tacticsSaveTimeoutId);
            tacticsSaveTimeoutId = null;
          }
          if (generalSaveTimeoutId) {
            clearTimeout(generalSaveTimeoutId);
            generalSaveTimeoutId = null;
          }
          // Immediate save — arka plana atılmadan önce kaydet
          saveTacticsState(currentUserId, true);
          saveGameState(currentUserId, true);
        }
      };
      document.addEventListener("visibilitychange", visibilityHandler);
    }

    console.log("[cloud-save] Auto-save started for user:", userId);
  });
}

/**
 * Cloud save'i durdur — kullanıcı çıkış yapınca.
 */
export function stopCloudSave() {
  if (generalSaveTimeoutId) {
    clearTimeout(generalSaveTimeoutId);
    generalSaveTimeoutId = null;
  }
  if (tacticsSaveTimeoutId) {
    clearTimeout(tacticsSaveTimeoutId);
    tacticsSaveTimeoutId = null;
  }
  if (unsubscribeFn) {
    unsubscribeFn();
    unsubscribeFn = null;
  }
  // v2.9.26 T1: visibilitychange handler'ı temizle
  if (visibilityHandler && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = null;
  }
  currentUserId = null;
  isLoaded = false;
  console.log("[cloud-save] Stopped");
}

/**
 * State'i hemen Supabase'e kaydet (debounce beklemeden).
 * Çıkış yapmadan önce veya sayfa kapatılmadan önce çağrılır.
 */
export async function flushGameState(userId: string): Promise<void> {
  if (generalSaveTimeoutId) {
    clearTimeout(generalSaveTimeoutId);
    generalSaveTimeoutId = null;
  }
  if (tacticsSaveTimeoutId) {
    clearTimeout(tacticsSaveTimeoutId);
    tacticsSaveTimeoutId = null;
  }
  // Immediate save
  // v2.9.65 FIX: flushGameState artık gerçek RPC'leri bekliyor
  // Eski kod: setTimeout(resolve, 800) — RPC'ler bitmeden resolve ediyordu
  return new Promise(async (resolve) => {
    try {
      await saveGameState(userId, true);
      await saveTacticsState(userId, true);
    } catch (e) {
      console.error("[cloud-save] flush error:", e);
    }
    resolve();
  });
}

// ============================================================================
// v2.9.63: Catch-up — eski kayıtlar için allLeagues maçlarını oynat
// ============================================================================

/**
 * Eski kayıttan yüklenen kullanıcının allLeagues'ini targetMatchday'e kadar oynat.
 *
 * Senaryo: Kullanıcı cloud'dan matchday 15'i yükledi. allLeagues yeniden üretildi (matchday 1).
 * Bu fonksiyon matchday 1'den 14'e kadar tüm diğer liglerin maçlarını simüle eder.
 *
 * Performans: ~14 matchday × 135 maç = ~1890 maç × 1ms = ~1.9 sn
 * Kullanıcı login sırasında bekler, ama sadece bir kerelik.
 */
function catchUpAllLeagues(allLeagues: any, targetMatchday: number): void {
  if (targetMatchday <= 1) return;
  if (!allLeagues) return;

  // v2.9.76 Fix 5.1: Dead require() kaldırıldı — simulateBotMatch burada
  // kullanılmıyor, simulateBotMatchSeeded kendi require'ını yapıyor (satır 748).

  for (const key of Object.keys(allLeagues)) {
    const league = allLeagues[key];
    if (league.hasUser) continue; // Kullanıcının ligi zaten oynanmış

    // Matchday 1'den targetMatchday-1'e kadar oyna
    for (let md = 1; md < targetMatchday; md++) {
      const weekMatches = league.fixtures.filter(
        (f: any) => f.matchday === md && !f.played
      );
      if (weekMatches.length === 0) continue;

      for (const match of weekMatches) {
        const homeTeam = league.clubs.find((c: any) => c.id === match.homeId);
        const awayTeam = league.clubs.find((c: any) => c.id === match.awayId);
        if (!homeTeam || !awayTeam) continue;

        // v2.9.65 FIX: Deterministic seed — cihazlar arası tutarlı sonuç
        // Eski kod: simulateBotMatch Math.random kullanıyor → her cihazda farklı sonuç
        // Yeni: matchday + homeId + awayId ile seed'lenmiş PRNG kullan
        const seedStr = `${md}-${match.homeId}-${match.awayId}`;
        const result = simulateBotMatchSeeded(homeTeam, awayTeam, md, seedStr);

        // Fixture'ı güncelle
        const idx = league.fixtures.findIndex((f: any) => f.id === match.id);
        if (idx >= 0) {
          league.fixtures[idx] = {
            ...league.fixtures[idx],
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            played: true,
          };
        }

        // Oyuncu stats'larını güncelle (gol/asist/appearances)
        const homeXI = homeTeam.players
          .filter((p: any) => !p.is_injured)
          .sort((a: any, b: any) => b.rating - a.rating)
          .slice(0, 11);
        const awayXI = awayTeam.players
          .filter((p: any) => !p.is_injured)
          .sort((a: any, b: any) => b.rating - a.rating)
          .slice(0, 11);

        // Appearances
        for (const p of homeXI) {
          p.appearances = (p.appearances ?? 0) + 1;
        }
        for (const p of awayXI) {
          p.appearances = (p.appearances ?? 0) + 1;
        }

        // v2.9.65: Deterministic gol dağıt — seeded scorer pick
        const scorerRng = mulberry32(hashStringToSeed(`${seedStr}-scorers`));
        for (let g = 0; g < result.homeScore; g++) {
          const scorer = pickScorerSeeded(homeXI, scorerRng);
          if (scorer) scorer.goals = (scorer.goals ?? 0) + 1;
        }
        for (let g = 0; g < result.awayScore; g++) {
          const scorer = pickScorerSeeded(awayXI, scorerRng);
          if (scorer) scorer.goals = (scorer.goals ?? 0) + 1;
        }
      }

      league.seasonMatchday = md + 1;
    }
  }

  console.log(`[cloud-save] Catch-up tamamlandı — matchday ${targetMatchday}`);
}

// v2.9.67: pickScorerSimple KALDIRILDI — dead code (pickScorerSeeded kullanılıyor)

// v2.9.65: Deterministic seed'li PRNG —Mulberry32
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// v2.9.65+v2.9.74: Deterministic simulateBotMatch — catch-up için cihazlar arası tutarlı
// v2.9.74 FIX K2: Math.random global override KALDIRILDI (güvenlik açığı).
// Eski kod: Math.random = rng; try {...} finally { Math.random = originalRandom; }
// Bu pencerede eş zamanlı crypto.randomUUID() / Supabase token generation seeded RNG
// kullanıyordu → token tahmin edilebilir.
// Yeni: simulateBotMatch'e rng parametresi geçirilir, global Math.random'a dokunulmaz.
function simulateBotMatchSeeded(homeTeam: any, awayTeam: any, matchday: number, seedStr: string): { homeScore: number; awayScore: number } {
  const seed = hashStringToSeed(seedStr);
  const rng = mulberry32(seed);
  return simulateBotMatch(homeTeam, awayTeam, matchday, rng);
}

// v2.9.65: Deterministic scorer pick
function pickScorerSeeded(squad: any[], rng: () => number): any | null {
  if (squad.length === 0) return null;
  const attackers = squad.filter((p) =>
    ["ST", "CF", "LW", "RW", "LM", "RM", "CAM", "CM"].includes(p.specificPosition)
  );
  const pool = attackers.length > 0 ? attackers : squad;
  return pool[Math.floor(rng() * pool.length)] ?? null;
}
