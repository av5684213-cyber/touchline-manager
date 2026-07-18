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
 * P0 FIX: cup, sponsors, credits, seasonStartStats artık kaydediliyor.
 * ÖNCE: sadece clubs/fixtures/tactics/transfer/training/facilities/news kaydediliyordu.
 * Yeni state alanı eklendiğinde aşağıdaki stateToSave objesine EKLENMELİ (regresyon önleme).
 */

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
 * P0 FIX: Artık TÜM state alanları kaydediliyor:
 * cup, sponsors, credits, seasonStartStats dahil.
 * Yeni state alanı eklerseniz stateToSave'e EKLEYİN (regresyon önleme).
 */
export function saveGameState(userId: string, immediate: boolean = false) {
  if (!isLoaded && !immediate) return;

  const doSave = async () => {
    try {
      const state = useAppStore.getState();
      // P0 FIX: TÜM oyun verisini kaydet — cup, sponsors, credits, seasonStartStats DAHİL
      // YENİ STATE ALANI EKLENİRSE BURAYA DA EKLENMELİ (regresyon önleme comment'i)
      const stateToSave = {
        managerName: state.managerName,
        myTeamId: state.myTeamId,
        seasonMatchday: state.seasonMatchday,
        seasonNumber: state.seasonNumber,
        news: state.news,
        clubs: state.clubs,
        fixtures: state.fixtures,
        tactics: state.tactics,
        transfer: state.transfer,
        training: state.training,
        facilities: state.facilities,
        // P0 FIX: Eksik alanlar eklendi
        cup: state.cup,
        sponsors: state.sponsors,
        credits: state.credits,
        seasonStartStats: state.seasonStartStats,
      };

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
 * P0 FIX: Artık cup, sponsors, credits değişikliklerini de dinliyor.
 */
export function initCloudSave(userId: string) {
  // Önce yükle
  loadGameState(userId).then(() => {
    // Sonra store değişikliklerini dinle
    // P0 FIX: cup, sponsors, credits, seasonStartStats değişikliklerini de izle
    unsubscribeFn = useAppStore.subscribe((state, prevState) => {
      if (
        state.clubs !== prevState.clubs ||
        state.fixtures !== prevState.fixtures ||
        state.tactics !== prevState.tactics ||
        state.transfer !== prevState.transfer ||
        state.training !== prevState.training ||
        state.facilities !== prevState.facilities ||
        state.seasonMatchday !== prevState.seasonMatchday ||
        state.news !== prevState.news ||
        // P0 FIX: Yeni izlenen alanlar
        state.cup !== prevState.cup ||
        state.sponsors !== prevState.sponsors ||
        state.credits !== prevState.credits ||
        state.seasonStartStats !== prevState.seasonStartStats ||
        state.seasonNumber !== prevState.seasonNumber
      ) {
        saveGameState(userId);
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
