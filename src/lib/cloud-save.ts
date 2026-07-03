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
 */

const SAVE_DEBOUNCE_MS = 3000;
let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isLoaded = false;

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
      return false;
    }

    if (data && Object.keys(data).length > 0) {
      // Cloud'da state var — localStorage'ı güncelle
      const cloudState = data as Record<string, unknown>;

      // Store'u cloud state ile güncelle
      useAppStore.setState((prev) => ({
        ...prev,
        ...cloudState,
        isAuthed: true, // giriş yapılmış
      }));

      console.log("[cloud-save] State loaded from cloud");
      isLoaded = true;
      return true;
    }

    // Cloud'da state yok — mevcut localStorage state'ini cloud'a yükle
    console.log("[cloud-save] No cloud state, uploading current");
    await saveGameState(userId);
    isLoaded = true;
    return true;
  } catch (e) {
    console.warn("[cloud-save] Load exception:", e);
    return false;
  }
}

/**
 * Mevcut store state'ini Supabase'e kaydeder.
 * Debounce'lu — 3 saniye içinde birden fazla çağrı gelirse sonuncusu çalışır.
 */
export function saveGameState(userId: string, immediate: boolean = false) {
  if (!isLoaded && !immediate) return; // yükleme tamamlanmadan kaydetme

  const doSave = async () => {
    try {
      const state = useAppStore.getState();
      // Sadece oyun verisini kaydet (auth bilgisi hariç)
      const stateToSave = {
        managerName: state.managerName,
        myTeamId: state.myTeamId,
        seasonMatchday: state.seasonMatchday,
        seasonNumber: state.seasonNumber,
        news: state.news,
        notifications: state.notifications,
        cupBracket: state.cupBracket,
        cupChampion: state.cupChampion,
        cupSeason: state.cupSeason,
        youthPlayers: state.youthPlayers,
        clubs: state.clubs,
        fixtures: state.fixtures,
        tactics: state.tactics,
        transfer: state.transfer,
        training: state.training,
        facilities: state.facilities,
      };

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
 */
export function initCloudSave(userId: string) {
  // Önce yükle
  loadGameState(userId).then(() => {
    // Sonra store değişikliklerini dinle
    // Zustand subscribe ile her state değişiminde kaydet
    useAppStore.subscribe((state, prevState) => {
      // Sadece oyun verisi değiştiyse kaydet (auth değişikliği hariç)
      if (
        state.clubs !== prevState.clubs ||
        state.fixtures !== prevState.fixtures ||
        state.tactics !== prevState.tactics ||
        state.transfer !== prevState.transfer ||
        state.training !== prevState.training ||
        state.facilities !== prevState.facilities ||
        state.seasonMatchday !== prevState.seasonMatchday ||
        state.news !== prevState.news ||
        state.notifications !== prevState.notifications ||
        state.cupBracket !== prevState.cupBracket ||
        state.youthPlayers !== prevState.youthPlayers
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
