"use client";

import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";

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
]);

/**
 * BULGU #9 DÜZELTME (v2.9.2): Hibrit blacklist + convention yaklaşımı.
 * "_" prefix ile başlayan tüm alanlar transient sayılır.
 */
function isBlacklisted(key: string): boolean {
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

      useAppStore.setState((prev) => ({
        ...prev,
        ...cloudState,
        isAuthed: true,
      }));

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
        transfer: s.transfer,
        youthAcademy: s.youthAcademy,
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
 */
async function saveTacticsToTable(userId: string): Promise<void> {
  try {
    const { supabase: supabaseClient } = await import("@/lib/supabase/client");
    const s = useAppStore.getState();

    const { error: tacErr } = await supabaseClient().from("active_tactics").upsert({
      profile_id: userId,
      tactic_data: s.tactics.active,
      lineup_data: s.tactics.lineup,
      slot_roles: s.tactics.slotRoles,
      active_instructions: s.tactics.activeInstructions,
    }, { onConflict: "profile_id" });
    if (tacErr) {
      console.warn("[cloud-save] tactics save error:", tacErr.message);
    }
  } catch (e: any) {
    console.warn("[cloud-save] Tactics save exception:", e?.message ?? e);
  }
}

/**
 * Mevcut store state'ini Supabase'e kaydeder.
 * Debounce'lu — 3 saniye içinde birden fazla çağrı gelirse sonuncusu çalışır.
 *
 * v2.9.20: Artık user_game_state (JSONB) + active_tactics + app_state
 * tablolarının üçüne de yazıyor (multiplayer uyumu için).
 */
export function saveGameState(userId: string, immediate: boolean = false) {
  if (!isLoaded && !immediate) return;

  const doSave = async () => {
    try {
      const state = useAppStore.getState();
      const stateToSave = pickPersistentState(state as unknown as Record<string, unknown>);

      // P0 FIX: localStorage'a da yedekle
      saveToLocalStorage(stateToSave);

      // user_game_state — tam state JSON olarak
      const { error } = await supabase.rpc("rpc_save_game_state", {
        p_profile_id: userId,
        p_state: stateToSave,
        p_version: 1,
      });

      if (error) {
        console.warn("[cloud-save] Save error:", error.message);
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
 * v2.9.20 GÖREV 1: Taktik için hızlı debounce'lu kayıt.
 * Taktik değişikliği daha kritik (kullanıcı anında görmek istiyor) — 1.5 sn.
 * user_game_state JSON'a yazmaz, sadece active_tactics tablosuna yazar.
 * (JSON'a yazım genel debounce ile 3 sn sonra yapılır.)
 */
export function saveTacticsState(userId: string, immediate: boolean = false) {
  if (!isLoaded && !immediate) return;

  const doSave = async () => {
    await saveTacticsToTable(userId);
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
 */
export function initCloudSave(userId: string) {
  // Önce yükle
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
  return new Promise((resolve) => {
    saveGameState(userId, true);
    saveTacticsState(userId, true);
    setTimeout(resolve, 800); // RPC'lerin tamamlanması için kısa bekle
  });
}
