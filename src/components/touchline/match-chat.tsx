"use client";

import { useEffect, useState, useRef } from "react";
import { Send, X } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { haptic } from "@/hooks/touchline";

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  at: number;
};

/**
 * Hazırlık maçı sohbet sistemi — Supabase real-time channel.
 * İki kullanıcı maçı izlerken birbiriyle mesajlaşabilir.
 * Supabase yoksa chat çalışmaz (sadece bot fallback).
 */
export function useMatchChat(matchId: string, userId: string, userName: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || !matchId) return;

    const channel = supabase.channel(`match_chat_${matchId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "message" }, (payload: any) => {
      const msg = payload.payload as ChatMessage;
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

  const sendMessage = (text: string) => {
    if (!text.trim() || !channelRef.current || !connected) return;
    haptic("light");
    const msg: ChatMessage = {
      id: `${userId}_${Date.now()}`,
      userId,
      userName,
      text: text.trim(),
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
                  <div className="text-[9px] font-bold opacity-70 mb-0.5">
                    {msg.userName}
                  </div>
                )}
                <div className="text-[11px] leading-tight">{msg.text}</div>
              </div>
            </div>
          );
        })}
      </div>

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
    </div>
  );
}
