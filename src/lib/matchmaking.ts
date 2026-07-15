"use client";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Multiplayer Matchmaking — gerçek kullanıcı-kullanıcı hazırlık maçı eşleşmesi.
 *
 * Supabase real-time presence kullanır:
 * 1. Kullanıcı sıraya girer → presence channel'a katılır
 * 2. Diğer online kullanıcıları görür
 * 3. Eşleşme için iki kullanıcı birbiriyle anlaşır (matched_by alanı)
 * 4. Eşleşen iki kullanıcı maça başlar
 *
 * Supabase yapılandırılmadıysa fallback: bot ile oynar (eski davranış).
 */

const QUEUE_CHANNEL = "friendly_match_queue";
const MATCH_TIMEOUT_MS = 30_000; // 30 saniye sonra sıradan çık

export type QueueUser = {
  userId: string;
  managerName: string;
  teamName: string;
  teamShort: string;
  teamColor: string;
  teamOvr: number;
  joinedAt: number;
  matchedWith?: string; // eşleşilen kullanıcının ID'si
};

export type MatchmakingCallbacks = {
  onSearching: () => void;
  onMatched: (opponent: QueueUser) => void;
  onTimeout: () => void;
  onError: (msg: string) => void;
};

/**
 * Sıraya gir — multiplayer eşleşme ara
 * Supabase yapılandırılmadıysa false döner (bot fallback çağrılmalı)
 */
export async function joinFriendlyQueue(
  user: QueueUser,
  callbacks: MatchmakingCallbacks
): Promise<() => void> {
  // Supabase yoksa bot fallback
  if (!isSupabaseConfigured()) {
    callbacks.onError("NO_SUPABASE");
    return () => {};
  }

  const channel = supabase.channel(QUEUE_CHANNEL, {
    config: { presence: { key: user.userId } },
  });

  let matched = false;
  let timeoutId: ReturnType<typeof setTimeout>;

  // Presence tracking — online kullanıcıları izle
  channel.on("presence", { event: "sync" }, () => {
    if (matched) return;
    const state = channel.presenceState<QueueUser>();
    const users = Object.values(state).flat() as QueueUser[];
    // Kendisi hariç, eşleşmemiş kullanıcıları bul
    const candidates = users.filter(
      (u) => u.userId !== user.userId && !u.matchedWith && Date.now() - u.joinedAt < MATCH_TIMEOUT_MS
    );
    if (candidates.length > 0) {
      // İlk adayı seç (FIFO)
      const opponent = candidates.sort((a, b) => a.joinedAt - b.joinedAt)[0];
      matched = true;
      // Eşleşmeyi işaretle — her iki taraf da matchedWith set eder
      channel.track({ ...user, matchedWith: opponent.userId });
      callbacks.onMatched(opponent);
      cleanup();
    }
  });

  // Timeout — 30 saniye sonra eşleşme yoksa bot fallback
  timeoutId = setTimeout(() => {
    if (!matched) {
      callbacks.onTimeout();
      cleanup();
    }
  }, MATCH_TIMEOUT_MS);

  function cleanup() {
    if (timeoutId) clearTimeout(timeoutId);
    channel.untrack();
    channel.unsubscribe();
  }

  // Sıraya katıl
  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track(user);
      callbacks.onSearching();
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      callbacks.onError("Bağlantı hatası");
      cleanup();
    }
  });

  return cleanup;
}

/**
 * Maç sonu — eşleşmeyi temizle
 */
export function leaveFriendlyQueue(cleanupFn: () => void) {
  cleanupFn();
}
