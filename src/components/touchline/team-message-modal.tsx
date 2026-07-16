"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { ClubBadge } from "./ui-bits";
import type { Team } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

type Message = {
  id: string;
  from: "me" | "them";
  text: string;
  at: number;
};

// Bot cevap havuzu
const BOT_REPLIES = [
  "Maçtan sonra görüşürüz. Hazırlıklı olun.",
  "Takımımız bugün iyi durumda. Kolay maç olmayacak.",
  "Transfer penceresinde birkaç hamle yapmayı düşünüyoruz.",
  "Oyuncularımız formda. İyi bir maç olmasını bekliyoruz.",
  "Saygılı davranmanızı bekleriz, saha içinde her şey olabilir.",
  "Geçen maçtaki performansımızdan memnunuz.",
  "Genç oyuncularımıza şans vermeye devam edeceğiz.",
  "Bütçemiz kısıtlı ama kalitemiz yüksek.",
  "Saha avantajını kullanmak istiyoruz.",
  "Menajerlik sabır işi, sonuçlar gelecek.",
];

export function TeamMessageModal({
  team,
  myTeam,
  onClose,
}: {
  team: Team;
  myTeam: Team;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "init",
      from: "them",
      text: BOT_REPLIES[Math.floor(Math.random() * 3)],
      at: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    haptic("light");
    const myMsg: Message = {
      id: `me_${Date.now()}`,
      from: "me",
      text: input.trim(),
      at: Date.now(),
    };
    setMessages((prev) => [...prev, myMsg]);
    setInput("");

    // Bot cevap
    setTimeout(() => {
      const reply: Message = {
        id: `them_${Date.now()}`,
        from: "them",
        text: BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)],
        at: Date.now(),
      };
      setMessages((prev) => [...prev, reply]);
      haptic("light");
    }, 1000 + Math.random() * 1500);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border" style={{ background: team.primaryColor }}>
          <div className="flex items-center gap-2">
            <ClubBadge short={team.shortName} primaryColor={team.primaryColor} size={28} />
            <div>
              <div className="text-sm font-bold text-white">{team.name}</div>
              <div className="text-[11px] text-white/70">Menajer görüşmesi</div>
            </div>
          </div>
          <button onClick={onClose} className="tm-tap p-1 text-white/80">
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto tm-thin-scrollbar p-3 space-y-2"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.from === "me" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] px-3 py-2 rounded-2xl text-xs",
                  msg.from === "me"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-2 border-t border-border flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="Mesaj yazın..."
            className="flex-1 bg-card border border-border rounded-full px-3 py-2 text-xs"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={cn(
              "tm-tap w-10 h-10 rounded-full flex items-center justify-center shrink-0",
              input.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
