"use client";

import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";

/**
 * Cloud Save — kullanıcı oyun state'ini Supabase'e kaydeder/yükler.
 *
 * Mantık:
 * 1. Kullanıcı giriş yapınca: Supabase'den state yükle, varsa localStorage'ı güncelle
 * 2. State değişince: debounce'lu olarak Supabase'e kaydet (3 saniye gecikme)
 * 3. Çakışma yok — tek cihaz/multi-cihaz için "last write wins"
 *
 * State JSON olarak user_game_state tablosunda saklanır.
 *
 * P0 FIX v2.9.0: BLACKLIST mantığı — TÜM state alanları kaydedilir,
 * sadece cihaza özel/geçici alanlar hariç tutulur. Yeni alan eklendiğinde
 * bu listeye eklenmesi gerekmez (otomatik kaydedilir). Bu, "yeni alan
 * eklendi ama cloud-save'e unutuldu" regresyonlarını yapısal olarak önler.
 */

// HARIÇ TUTULAN (blacklist) — cihaza özel veya geçici alanlar
const CLOUD_SAVE_BLACKLIST = new Set<string>([
  "isAuthed",      // session-only, kalıcı olmamalı
  "_persist",      // zustand persist middleware (kullanılmıyor ama güvenlik)
  "__internal__",  // internal flag'ler
]);

/**
 * BULGU #9 DÜZELTME (v2.9.2): Hibrit blacklist + convention yaklaşımı.
 * Gelecekte transient alan eklenecekse "_" prefix ile başlatmak yeterli —
 * otomatik olarak cloud-save'e yazılmaz. Bu, "yeni alan eklendi ama cloud-save'e
 * yanlışlıkla dahil edildi" regresyonlarını önler (örn: isSettingsModalOpen,
 * isSyncing, pendingAction gibi UI state'leri).
 *
 * Convention:
 * - Kalıcı veri: normal isim (managerName, clubs, tactics, ...)
 * - Transient UI state: "_" prefix (örn: _pendingAction, _isModalOpen)
 * - Session-only: isAuthed (blacklist'te)
 */
function isBlacklisted(key: string): boolean {
  if (CLOUD_SAVE_BLACKLIST.has(key)) return true;
  // "_" prefix ile başlayan tüm alanlar transient sayılır
  if (key.startsWith("_")) return true;
  return false;
}

/**
 * State'in tüm kalıcı alanlarını döndürür (blacklist hariç).
 * Yeni state alanı eklendiğinde otomatik olarak cloud-save'e dahil edilir.
 */
function pickPersistentState(state: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(state)) {
    if (isBlacklisted(key)) continue;
    // Function tipindeki alanları (action'lar) atla — sadece veri kaydedilmeli
    if (typeof state[key] === "function") continue;
    result[key] = state[key];
  }
  return result;
}

const SAVE_DEBOUNCE_MS = 3000;
let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isLoaded = false;
let unsubscribeFn: (() => void) | null = null;

// P0 FIX: localStorage yedeği — bulut bağlantısı yoksa veya hata verirse
const LOCAL_STORAGE_KEY = "tm_game_state_backup";

/**
 * Kullanıcının cloud state'ini yükler.
 * Supabase'de state varsa localStorage'ı günceller.
 * Yoksa mevcut localStorage state'ini cloud'a yükler (ilk senkronizasyon).
 */
export async function loadGameState(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc("rpc_load_game_state", { p_profile_id: userId });

    if (error) {
      console.warn("[cloud-save] Load error:", error.message);
      // P0 FIX: Bulut yüklemesi başarısız olursa localStorage yedeğini dene
      return loadFromLocalStorage();
    }

    if (data && Object.keys(data).length > 0) {
      // Cloud'da state var — store'u güncelle
      const cloudState = data as Record<string, unknown>;

      useAppStore.setState((prev) => ({
        ...prev,
        ...cloudState,
        isAuthed: true,
      }));

      // P0 FIX: localStorage'a da yedekle
      saveToLocalStorage(cloudState);

      console.log("[cloud-save] State loaded from cloud");
      isLoaded = true;
      return true;
    }

    // Cloud'da state yok — mevcut state'i cloud'a yükle
    console.log("[cloud-save] No cloud state, uploading current");
    await saveGameState(userId);
    isLoaded = true;
    return true;
  } catch (e) {
    console.warn("[cloud-save] Load exception:", e);
    // P0 FIX: Bulut hatasında localStorage yedeğini dene
    return loadFromLocalStorage();
  }
}

/**
 * P0 FIX: localStorage'a state yedeği kaydet.
 * Bulut bağlantısı yoksa veya hata verirse kullanılır.
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
 * Bulut bağlantısı yoksa kullanılır.
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
 * Mevcut store state'ini Supabase'e kaydeder.
 * Debounce'lu — 3 saniye içinde birden fazla çağrı gelirse sonuncusu çalışır.
 *
 * P0 FIX v2.9.0: BLACKLIST mantığı — TÜM kalıcı alanlar otomatik kaydedilir.
 * Yeni state alanı eklerseniz otomatik olarak dahil edilir (manuel liste YOK).
 * Sadece CLOUD_SAVE_BLACKLIST'teki alanlar ve function'lar (action'lar) hariç tutulur.
 */
export function saveGameState(userId: string, immediate: boolean = false) {
  if (!isLoaded && !immediate) return;

  const doSave = async () => {
    try {
      const state = useAppStore.getState();
      // P0 FIX v2.9.0: pickPersistentState — blacklist hariç TÜM veri alanlarını kaydet
      // Yeni state alanı eklendiğinde burayı güncellemeye GEREK YOK.
      const stateToSave = pickPersistentState(state as unknown as Record<string, unknown>);

      // P0 FIX: localStorage'a da yedekle
      saveToLocalStorage(stateToSave);

      const { error } = await supabase.rpc("rpc_save_game_state", {
        p_profile_id: userId,
        p_state: stateToSave,
        p_version: 1,
      });

      if (error) {
        console.warn("[cloud-save] Save error:", error.message);
      }
    } catch (e) {
      console.warn("[cloud-save] Save exception:", e);
    }
  };

  if (immediate) {
    doSave();
    return;
  }

  // Debounce
  if (saveTimeoutId) clearTimeout(saveTimeoutId);
  saveTimeoutId = setTimeout(doSave, SAVE_DEBOUNCE_MS);
}

/**
 * Cloud save'i başlat — store değişikliklerini dinler.
 * Auth context'te kullanıcı giriş yapınca çağrılır.
 *
 * P0 FIX v2.9.0: BLACKLIST mantığı — TÜM kalıcı alanlar izlenir.
 * Yeni state alanı eklendiğinde otomatik olarak izlenir (manuel liste YOK).
 * Sadece function'lar (action'lar) ve blacklist'teki alanlar izlenmez.
 */
export function initCloudSave(userId: string) {
  // Önce yükle
  loadGameState(userId).then(() => {
    // Sonra store değişikliklerini dinle
    // P0 FIX v2.9.0: Duplicate subscribe önle — önce eski subscriber'ı temizle
    if (unsubscribeFn) {
      unsubscribeFn();
      unsubscribeFn = null;
    }
    unsubscribeFn = useAppStore.subscribe((state, prevState) => {
      // P0 FIX v2.9.0: BLACKLIST mantığı — herhangi bir kalıcı alan değiştiyse tetikle
      // Yeni state alanı eklendiğinde otomatik izlenir.
      const stateKeys = Object.keys(state);
      for (const key of stateKeys) {
        if (isBlacklisted(key)) continue;
        if (typeof (state as any)[key] === "function") continue;
        if ((state as any)[key] !== (prevState as any)[key]) {
          saveGameState(userId);
          return; // bir değişiklik bulundu, save tetikle, çık
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
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
    saveTimeoutId = null;
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
 * Çıkış yapmadan önce çağrılır.
 */
export async function flushGameState(userId: string): Promise<void> {
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
    saveTimeoutId = null;
  }
  // Immediate save
  return new Promise((resolve) => {
    saveGameState(userId, true);
    setTimeout(resolve, 500); // RPC'nin tamamlanması için kısa bekle
  });
}
