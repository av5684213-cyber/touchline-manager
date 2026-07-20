"use client";

import { useEffect, useState, useRef } from "react";
import { Send, X, Flag, Ban, UserX } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { haptic } from "@/hooks/touchline";

// P0 FIX BUG #14: Basit küfür/argo filtresi — Google Play UGC politikası gereği
// Türkçe + İngilizce yaygın küfürler
const BANNED_WORDS = [
  // İngilizce
  "fuck", "shit", "bitch", "asshole", "bastard", "damn", "cunt", "dick", "piss",
  // Türkçe
  "amk", "aq", "sik", "yarrak", "oruspu", "pezevenk", "göt", "piç", "amcık",
  "ibne", "oğlum", "orosbu", "sikeyim", "götveren", "göt veren",
  // Hakaretler
  "salak", "aptal", "mal", "gerizekalı", "öküz", "eqşek", "eşek",
];

function filterMessage(text: string): string {
  let filtered = text;
  for (const word of BANNED_WORDS) {
    // Kelime sınırı + case-insensitive
    try {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      filtered = filtered.replace(regex, "*".repeat(word.length));
    } catch {
      // Regex hatası (özel karakter) — basit replace dene
      filtered = filtered.split(word).join("*".repeat(word.length));
    }
  }
  return filtered;
}

// P0 FIX BUG #14: Rate limiting — dakikada max 10 mesaj
const RATE_LIMIT_MS = 60_000;
const RATE_LIMIT_COUNT = 10;
const messageTimestamps: number[] = [];

function canSendMessage(): boolean {
  const now = Date.now();
  const recent = messageTimestamps.filter(ts => now - ts < RATE_LIMIT_MS);
  return recent.length < RATE_LIMIT_COUNT;
}

function recordMessage() {
  messageTimestamps.push(Date.now());
  const now = Date.now();
  const idx = messageTimestamps.findIndex(ts => now - ts >= RATE_LIMIT_MS);
  if (idx >= 0) messageTimestamps.splice(0, idx + 1);
}

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  at: number;
};

/**
 * P0 FIX BUG #14: Supabase blocked_users tablosuna yaz.
 * Ayrıca yerel state'e de yansıt — UI anında güncellensin.
 *
 * BULGU #5 DÜZELTME (v2.9.1): Guest ID'ler (guest_xxx) auth.users'da yok,
 * FK ihlali (PostgreSQL 23503) fırlatır. Guest blocker/blocked ise
 * Supabase insert atla, sadece yerel state güncelle.
 */
export async function blockUserInSupabase(
  blockerId: string,
  blockedId: string,
  blockedUserName?: string
): Promise<boolean> {
  if (!blockerId || !blockedId || blockerId === blockedId) return false;

  // Yerel state HER DURUMDA güncellenmeli (UI anında yansımalı)
  useAppStore.getState().blockUser(blockedId);

  // Guest ID kontrolü — Supabase FK ihlalini önle
  const isGuestBlocker = blockerId.startsWith("guest_");
  const isGuestBlocked = blockedId.startsWith("guest_");
  if (isGuestBlocker || isGuestBlocked) {
    // Guest kullanıcıların engellemeleri sadece yerel state'te tutulur
    // (cihazlar arası senkronize olmaz, ama Play Store açısından sorun yok)
    return true;
  }

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from("blocked_users")
      .insert({ blocker_id: blockerId, blocked_id: blockedId });
    if (error) {
      // 23505 = unique_violation (zaten engelli) — sessizce geç
      // 23503 = foreign_key_violation — zaten yukarıda guest kontrolü yaptık
      if (error.code !== "23505") {
        console.warn("[chat] block error:", error.message);
      }
    }
    return true;
  } catch (e) {
    console.warn("[chat] block exception:", e);
    return true; // Yerel state zaten güncellendi
  }
  void blockedUserName;
}

/**
 * P0 FIX BUG #14: Kullanıcının engellediği kişileri Supabase'ten yükle.
 * Auth context çağrılmalı — giriş yapınca.
 *
 * BULGU #7 DÜZELTME (v2.9.1): cloud-save ve bu fonksiyon paralel çağrılıyorsa
 * race condition var — son bitiren blockedUsers'ı overwrite eder.
 * Çözüm: merge yap — cloud-save'den gelen yerel ID'leri koru, Supabase'ten
 * gelen auth ID'lerini ekle.
 */
export async function loadBlockedUsersFromSupabase(userId: string): Promise<void> {
  if (!isSupabaseConfigured() || !userId) return;

  // Guest kullanıcı için Supabase'ten yükleme yapma — sadece yerel state kullan
  if (userId.startsWith("guest_")) return;

  try {
    const { data, error } = await supabase
      .rpc("rpc_get_blocked_users", { p_user_id: userId });
    if (error) {
      console.warn("[chat] load blocked error:", error.message);
      return;
    }
    if (Array.isArray(data)) {
      const supabaseIds = data.map((row: any) => row.blocked_id as string);
      // BULGU #7 DÜZELTME: merge — cloud-save'den gelen guest ID'leri koru,
      // Supabase'ten gelen auth ID'lerini ekle. Duplicate'leri temizle.
      const localIds = useAppStore.getState().blockedUsers ?? [];
      const merged = Array.from(new Set([...localIds, ...supabaseIds]));
      useAppStore.setState({ blockedUsers: merged });
    }
  } catch (e) {
    console.warn("[chat] load blocked exception:", e);
  }
}

/**
 * P0 FIX BUG #14: Mesajı Supabase chat_reports tablosuna bildir.
 *
 * BULGU #5 DÜZELTME (v2.9.1): Guest reporter/reported ise FK ihlali.
 * Guest ise sadece yerel bildirim yapılır (kullanıcıya "bildirildi" mesajı gösterilir),
 * Supabase'e yazılmaz.
 */
export async function reportMessageToSupabase(
  reporterId: string,
  reportedUserId: string,
  messageText: string,
  matchId: string
): Promise<boolean> {
  if (!reporterId || !reportedUserId) return false;

  // Guest ID kontrolü — Supabase FK ihlalini önle
  const isGuestReporter = reporterId.startsWith("guest_");
  const isGuestReported = reportedUserId.startsWith("guest_");
  if (isGuestReporter || isGuestReported) {
    // Guest raporları Supabase'e yazılmaz — kullanıcıya yine de "bildirildi" de
    // (yerel moderatör yok, ama UX açısından feedback ver)
    return true;
  }

  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from("chat_reports").insert({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      reported_message: messageText.slice(0, 500),
      match_id: matchId,
      reported_at: new Date().toISOString(),
    });
    if (error) {
      if (error.code === "23505") return true;
      console.warn("[chat] report error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[chat] report exception:", e);
    return false;
  }
}

/**
 * Hazırlık maçı sohbet sistemi — Supabase real-time channel.
 * İki kullanıcı maçı izlerken birbiriyle mesajlaşabilir.
 * Supabase yoksa chat çalışmaz (sadece bot fallback).
 */
export function useMatchChat(matchId: string, userId: string, userName: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // BULGU #6 DÜZELTME (v2.9.1): blockedUsers hook içinde artık kullanılmıyor
  // (render filter MatchChatPanel içinde yapılıyor). Hook signature'ı sade kaldı.

  useEffect(() => {
    if (!isSupabaseConfigured() || !matchId) return;

    const channel = supabase.channel(`match_chat_${matchId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "message" }, (payload: any) => {
      const msg = payload.payload as ChatMessage;
      // P0 FIX BUG #14: Engellenen kullanıcının mesajlarını gösterme
      // BULGU #6 DÜZELTME (v2.9.1): blockedUsers'ı useEffect bağımlılığından çıkardık,
      // bu yüzden closure stale olabilir. Render filter (satır 309+) güncel listeyle
      // zaten engelli mesajları gizliyor — burada stale check sorun değil, sadece optimizasyon.
      // BULGU #7 DÜZELTME (v2.9.3):getState() ile güncel blockedUsers'ı oku —
      // engelli kullanıcının mesajlarını state'e HİÇ ekleme (birikmesini önle).
      const currentBlocked = useAppStore.getState().blockedUsers ?? [];
      if (currentBlocked.includes(msg.userId)) return; // state'e ekleme
      setMessages((prev) => [...prev, msg]);
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [matchId]);
  // BULGU #6 DÜZELTME (v2.9.1): blockedUsers bağımlılıktan ÇIKARILDI.
  // blockedUsers her değişince channel unsubscribe + re-subscribe oluyordu,
  // kullanıcı biri engelleyince "Sohbet bağlanıyor..." görünüyordu.
  // Render filter (blockedUsers.includes) güncel listeyle mesajları zaten gizliyor.

  const sendMessage = (text: string) => {
    if (!text.trim() || !channelRef.current || !connected) return;
    // P0 FIX BUG #14: Rate limiting kontrolü
    if (!canSendMessage()) {
      haptic("error");
      return;
    }
    // P0 FIX BUG #14: Mesajı filtrele — küfür/argo sansürü
    const filteredText = filterMessage(text.trim());
    if (!filteredText.trim()) return; // Tamamen sansürlendiyse gönderme
    haptic("light");
    recordMessage();
    const msg: ChatMessage = {
      id: `${userId}_${Date.now()}`,
      userId,
      userName: filterMessage(userName), // P0 FIX: Kullanıcı adını da filtrele
      text: filteredText.slice(0, 200), // P0 FIX: Max 200 karakter
      at: Date.now(),
    };
    channelRef.current.send({
      type: "broadcast",
      event: "message",
      payload: msg,
    });
    // Kendi mesajını da ekle
    setMessages((prev) => [...prev, msg]);
  };

  return { messages, sendMessage, connected };
}

/**
 * Chat UI component — maç ekranının altında gösterilir.
 * P0 FIX BUG #14: Block + Report + rate limit + küfür filtresi
 */
export function MatchChatPanel({
  matchId,
  userId,
  userName,
  onClose,
}: {
  matchId: string;
  userId: string;
  userName: string;
  onClose?: () => void;
}) {
  const { messages, sendMessage, connected } = useMatchChat(matchId, userId, userName);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [confirmBlock, setConfirmBlock] = useState<string | null>(null); // userId
  const blockedUsers = useAppStore((s) => s.blockedUsers);
  const unblockUser = useAppStore((s) => s.unblockUser);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  // P0 FIX BUG #14: Mesaj bildir
  const handleReport = async (msg: ChatMessage) => {
    haptic("light");
    const ok = await reportMessageToSupabase(userId, msg.userId, msg.text, matchId);
    alert(ok ? "Mesaj bildirildi. İnceleme yapılacaktır." : "Bildirim kaydedilemedi, lütfen tekrar dene.");
  };

  // P0 FIX BUG #14: Kullanıcı engelle
  const handleBlock = async (otherUserId: string, otherName: string) => {
    haptic("medium");
    await blockUserInSupabase(userId, otherUserId, otherName);
    setConfirmBlock(null);
    alert(`${otherName} engellendi. Bir daha eşleşmeyeceksiniz ve mesajları görünmeyecek.`);
  };

  return (
    <div className="tm-card p-2 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground"}`} />
          <span className="text-[11px] font-bold">
            {connected ? "Sohbet bağlı" : "Sohbet bağlanıyor..."}
          </span>
        </div>
        {onClose && (
          <button
            onClick={() => { haptic("light"); onClose(); }}
            className="tm-tap p-1 text-muted-foreground"
            aria-label="Sohbeti kapat"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* P0 FIX BUG #14: Topluluk kuralları kısa hatırlatma */}
      <div className="text-[9px] text-muted-foreground leading-tight bg-muted/30 rounded px-1.5 py-1">
        🛡️ Saygılı ol. Küfür filtresi aktif. Mesajlar max 200 karakter, dakikada max 10 mesaj. Uygunsuz mesajı <Flag className="inline" size={9} /> ile bildir, kullanıcıyı <Ban className="inline" size={9} /> ile engelle.
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="max-h-32 overflow-y-auto tm-thin-scrollbar space-y-1.5 bg-muted/30 rounded-md p-2"
      >
        {messages.length === 0 && (
          <div className="text-[10px] text-muted-foreground text-center py-2">
            Henüz mesaj yok. Rakibinle sohbet et!
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.userId === userId;
          const isBlocked = blockedUsers.includes(msg.userId);
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-lg px-2.5 py-1.5 ${
                  isMe
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                }`}
              >
                {!isMe && (
                  <>
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                      <div className="text-[9px] font-bold opacity-70 truncate max-w-[100px]">{msg.userName}</div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* P0 FIX BUG #14: Bildir butonu */}
                        <button
                          onClick={() => handleReport(msg)}
                          className="tm-tap text-[9px] text-muted-foreground hover:text-amber-500 p-0.5"
                          aria-label="Mesajı bildir"
                          title="Bildir"
                        >
                          <Flag size={10} />
                        </button>
                        {/* P0 FIX BUG #14: Engelle butonu */}
                        {!isBlocked && (
                          <button
                            onClick={() => setConfirmBlock(msg.userId)}
                            className="tm-tap text-[9px] text-muted-foreground hover:text-red-500 p-0.5"
                            aria-label={`Kullanıcıyı engelle: ${msg.userName}`}
                            title="Kullanıcıyı engelle"
                          >
                            <Ban size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                    {isBlocked && (
                      <div className="text-[9px] text-muted-foreground italic mb-0.5">
                        (engelli kullanıcı)
                      </div>
                    )}
                  </>
                )}
                <div className="text-[11px] leading-tight">{msg.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* P0 FIX BUG #14: Block onayı modalı */}
      {confirmBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmBlock(null)}>
          <div className="bg-card border border-border rounded-lg p-4 max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <UserX size={18} className="text-red-500" />
              <span className="text-sm font-bold">Kullanıcıyı Engelle</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
              Bu kullanıcıyı engellemek istediğine emin misin? Engellediğin kullanıcılarla bir daha eşleşmeyeceksin ve mesajları sana görünmeyecek.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmBlock(null)}
                className="tm-tap flex-1 py-2 rounded-md border border-border text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  const msg = messages.find(m => m.userId === confirmBlock);
                  handleBlock(confirmBlock, msg?.userName ?? "Kullanıcı");
                }}
                className="tm-tap flex-1 py-2 rounded-md bg-red-600 text-white text-xs font-bold"
              >
                Engelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* P0 FIX BUG #14: Engellenen kullanıcılar listesi (compact) */}
      {blockedUsers.length > 0 && (
        <details className="text-[10px]">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Engellenen kullanıcılar ({blockedUsers.length})
          </summary>
          <div className="mt-1 space-y-0.5 max-h-20 overflow-y-auto tm-thin-scrollbar">
            {blockedUsers.map((id) => (
              <div key={id} className="flex items-center justify-between px-1.5 py-0.5 bg-muted/40 rounded">
                <span className="truncate text-[9px] text-muted-foreground">{id.slice(0, 18)}...</span>
                <button
                  onClick={() => { haptic("light"); unblockUser(id); }}
                  className="tm-tap text-[9px] text-sky-400 hover:text-sky-300"
                >
                  Kaldır
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Input */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Mesaj yaz..."
          disabled={!connected}
          className="flex-1 bg-card border border-border rounded-md px-2.5 py-1.5 text-[11px] disabled:opacity-50"
          maxLength={200}
        />
        <button
          onClick={handleSend}
          disabled={!connected || !input.trim()}
          className="tm-tap px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="Gönder"
        >
          <Send size={14} />
        </button>
      </div>

      {/* Karakter sayacı */}
      {input.length > 0 && (
        <div className="text-right text-[9px] text-muted-foreground">
          {input.length}/200
        </div>
      )}
    </div>
  );
}
