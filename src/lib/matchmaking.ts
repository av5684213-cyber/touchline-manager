"use client";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";

/**
 * Multiplayer Matchmaking — gerçek kullanıcı-kullanıcı hazırlık maçı eşleşmesi.
 *
 * Supabase real-time presence kullanır:
 * 1. Kullanıcı sıraya girer → presence channel'a katılır
 * 2. Diğer online kullanıcıları görür
 * 3. Eşleşme için iki kullanıcı birbiriyle anlaşır (matched_by alanı)
 * 4. Eşleşen iki kullanıcı maça başlar
 *
 * P0 FIX BUG #14: Engellenen kullanıcılarla eşleşmeyi önler.
 * P0 FIX BUG #12: Dürüst etiketleme — gerçek maç sunucu tarafında değil,
 * bot'a karşı oynanır. Eşleşen rakiple sadece sohbet edilebilir.
 *
 * Supabase yapılandırılmadıysa fallback: bot ile oynar (eski davranış).
 */

const QUEUE_CHANNEL = "friendly_match_queue";
const MATCH_TIMEOUT_MS = 30_000; // 30 saniye sonra sıradan çık

/**
 * P0 FIX BUG #14: Basit küfür/argo filtresi — managerName için
 * (match-chat.tsx ile aynı liste, küçük tutuyoruz)
 */
const BANNED_NAME_WORDS = [
  "fuck", "shit", "bitch", "asshole", "bastard",
  "amk", "aq", "sik", "yarrak", "oruspu", "pezevenk", "göt", "piç",
  "salak", "aptal", "mal", "gerizekalı", "öküz",
];

export function sanitizeDisplayName(name: string): string {
  if (!name) return "Menajer";
  let filtered = name.trim().slice(0, 24); // max 24 karakter
  for (const word of BANNED_NAME_WORDS) {
    try {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      filtered = filtered.replace(regex, "*".repeat(word.length));
    } catch {
      filtered = filtered.split(word).join("*".repeat(word.length));
    }
  }
  return filtered || "Menajer";
}

export type QueueUser = {
  userId: string;
  managerName: string; // P0 FIX BUG #14: sanitize edilmiş
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
 *
 * P0 FIX BUG #14: Engellenen kullanıcılarla eşleşmez.
 * P0 FIX BUG #14: managerName presence verisinde sanitize edilir.
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

  // P0 FIX BUG #14: managerName'i presence verisinde sanitize et
  const sanitizedUser: QueueUser = {
    ...user,
    managerName: sanitizeDisplayName(user.managerName),
    teamName: user.teamName?.slice(0, 32) ?? "Takım",
    teamShort: user.teamShort?.slice(0, 4) ?? "TM",
  };

  const channel = supabase.channel(QUEUE_CHANNEL, {
    config: { presence: { key: sanitizedUser.userId } },
  });

  let matched = false;
  let timeoutId: ReturnType<typeof setTimeout>;

  // P0 FIX BUG #14: Engellenen kullanıcılar listesi (yerel state'ten)
  const blockedUsers = useAppStore.getState().blockedUsers ?? [];

  // Presence tracking — online kullanıcıları izle
  channel.on("presence", { event: "sync" }, () => {
    if (matched) return;
    const state = channel.presenceState<QueueUser>();
    const users = Object.values(state).flat() as QueueUser[];
    // Kendisi hariç, eşleşmemiş, engellenmemiş kullanıcıları bul
    const candidates = users.filter(
      (u) =>
        u.userId !== sanitizedUser.userId &&
        !u.matchedWith &&
        !blockedUsers.includes(u.userId) && // P0 FIX BUG #14: engelli kullanıcıyı atla
        Date.now() - u.joinedAt < MATCH_TIMEOUT_MS
    );
    if (candidates.length > 0) {
      // İlk adayı seç (FIFO)
      const opponent = candidates.sort((a, b) => a.joinedAt - b.joinedAt)[0];
      matched = true;
      // Eşleşmeyi işaretle — her iki taraf da matchedWith set eder
      channel.track({ ...sanitizedUser, matchedWith: opponent.userId });
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
      await channel.track(sanitizedUser);
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
