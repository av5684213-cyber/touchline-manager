"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Mail, Trash2, X } from "lucide-react";
import { useAppStore, useMyTeam } from "@/lib/store";
import type { MessageItem } from "@/lib/store";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

/**
 * Mesaj kutusu — iki mod:
 * 1. Dashboard'a yerleşik kalıcı liste (panel)
 * 2. Hareketli toast banner — yeni mesaj gelince otomatik görünür, 5sn sonra kaybolur
 */

// ===== Hareketli Toast Banner =====
export function MessageToast() {
  const messages = useAppStore((s) => s.transfer.messages);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // En yeni okunmamış mesaj
  const latestUnread = messages.find((m) => !m.read && !dismissed.has(m.id));

  // 5sn sonra otomatik dismiss
  useEffect(() => {
    if (!latestUnread) return;
    const id = setTimeout(() => {
      setDismissed((prev) => new Set(prev).add(latestUnread.id));
      useAppStore.getState().markMessageRead(latestUnread.id);
    }, 5000);
    return () => clearTimeout(id);
  }, [latestUnread]);

  if (!latestUnread) return null;

  const kindStyle = getKindStyle(latestUnread.kind);

  return (
    <div
      className="tm-card tm-fade-up fixed left-1/2 -translate-x-1/2 z-40 px-3 py-2.5 max-w-[360px] w-[calc(100%-24px)] flex items-start gap-2.5 shadow-2xl"
      style={{ top: "calc(var(--safe-top) + 56px)" }}
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", kindStyle.bg)}>
        <Mail size={16} className={kindStyle.text} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={cn("text-[10px] font-bold uppercase tracking-wide", kindStyle.text)}>
            {kindStyle.label}
          </span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="text-[11px] text-muted-foreground truncate">{latestUnread.fromTeamName}</span>
        </div>
        <div className="text-[11px] leading-tight line-clamp-2">{latestUnread.message}</div>
      </div>
      <button
        onClick={() => {
          haptic("light");
          setDismissed((prev) => new Set(prev).add(latestUnread.id));
          useAppStore.getState().markMessageRead(latestUnread.id);
        }}
        className="tm-tap p-1 text-muted-foreground shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ===== Dashboard panel — kalıcı mesaj listesi =====
export function MessagePanel() {
  const team = useMyTeam();
  const transfer = useAppStore((s) => s.transfer);
  const markMessageRead = useAppStore((s) => s.markMessageRead);
  const markAllMessagesRead = useAppStore((s) => s.markAllMessagesRead);
  const clearMessage = useAppStore((s) => s.clearMessage);
  const respondToIncomingMessage = useAppStore((s) => s.respondToIncomingMessage);
  const [expanded, setExpanded] = useState(false);

  if (!team) return null;

  const messages = transfer.messages;
  const unreadCount = messages.filter((m) => !m.read).length;
  const visibleMessages = expanded ? messages : messages.slice(0, 3);

  if (messages.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Mail size={14} className="text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <h2 className="text-sm font-bold">Mesajlar</h2>
          {unreadCount > 0 && (
            <span className="tm-chip bg-red-500 text-white">{unreadCount} yeni</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => { haptic("light"); markAllMessagesRead(); }}
            className="tm-tap text-[10px] font-semibold text-primary"
          >
            Tümünü okundu işaretle
          </button>
        )}
      </div>

      <div className="tm-card divide-y divide-border">
        {visibleMessages.map((m) => {
          const kindStyle = getKindStyle(m.kind);
          const isPendingOffer = m.kind === "transfer_accepted" && m.relatedOfferId;
          return (
            <div
              key={m.id}
              className={cn(
                "p-2.5 transition-colors",
                !m.read && "bg-primary/5"
              )}
            >
              <div className="flex items-start gap-2">
                <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", kindStyle.bg)}>
                  <Mail size={12} className={kindStyle.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn("text-[11px] font-bold uppercase tracking-wide", kindStyle.text)}>
                      {kindStyle.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground truncate">{m.fromTeamName}</span>
                    {!m.read && <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-auto shrink-0" />}
                  </div>
                  <div className="text-[11px] leading-tight">{m.message}</div>

                  {/* Aktif aksiyon butonları */}
                  {isPendingOffer && (
                    <div className="flex gap-1.5 mt-2">
                      <button
                        onClick={() => {
                          haptic("success");
                          const offer = transfer.incomingOffers.find((o) => o.id === m.relatedOfferId);
                          if (offer) {
                            const res = useAppStore.getState().completeTransfer(offer.id);
                            if (!res.success) {
                              haptic("error");
                              alert(res.reason === "budget" ? "Yetersiz bütçe" : "Transfer tamamlanamadı");
                            }
                          }
                        }}
                        className="tm-tap flex-1 py-1 rounded text-[10px] font-bold bg-emerald-600 text-white"
                      >
                        Transferi Tamamla
                      </button>
                      <button
                        onClick={() => { haptic("light"); clearMessage(m.id); }}
                        className="tm-tap px-2 py-1 rounded text-[10px] font-bold border border-border text-muted-foreground"
                      >
                        Reddet
                      </button>
                    </div>
                  )}

                  {/* Gelen transfer teklifine yanıt */}
                  {m.kind === "transfer_offer_incoming" && m.playerId && (
                    <div className="flex gap-1.5 mt-2">
                      <button
                        onClick={() => {
                          haptic("success");
                          respondToIncomingMessage(m.id, "accept");
                        }}
                        className="tm-tap flex-1 py-1 rounded text-[10px] font-bold bg-emerald-600 text-white"
                      >
                        Sat ({formatEuro(m.amount ?? 0)})
                      </button>
                      <button
                        onClick={() => { haptic("light"); respondToIncomingMessage(m.id, "reject"); }}
                        className="tm-tap flex-1 py-1 rounded text-[10px] font-bold border border-border text-muted-foreground"
                      >
                        Reddet
                      </button>
                    </div>
                  )}

                  {/* Counter teklif yanıt */}
                  {m.kind === "transfer_negotiated" && m.relatedOfferId && m.counterOffer && (
                    <div className="flex gap-1.5 mt-2">
                      <button
                        onClick={() => {
                          haptic("success");
                          const res = useAppStore.getState().acceptCounterOffer(m.relatedOfferId!);
                          if (!res.success) {
                            haptic("error");
                            alert(res.reason === "budget" ? "Yetersiz bütçe" : "Hata");
                          } else {
                            clearMessage(m.id);
                          }
                        }}
                        className="tm-tap flex-1 py-1 rounded text-[10px] font-bold bg-emerald-600 text-white"
                      >
                        Kabul ({formatEuro(m.counterOffer)})
                      </button>
                      <button
                        onClick={() => {
                          haptic("light");
                          if (m.relatedOfferId) useAppStore.getState().rejectCounterOffer(m.relatedOfferId);
                          clearMessage(m.id);
                        }}
                        className="tm-tap flex-1 py-1 rounded text-[10px] font-bold border border-border text-muted-foreground"
                      >
                        Reddet
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { haptic("light"); clearMessage(m.id); }}
                  className="tm-tap p-1 text-muted-foreground shrink-0"
                  aria-label="Sil"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Genişlet/Daralt */}
      {messages.length > 3 && (
        <button
          onClick={() => { haptic("light"); setExpanded(!expanded); }}
          className="tm-tap w-full mt-2 py-1.5 rounded-md text-[11px] font-semibold border border-border text-muted-foreground"
        >
          {expanded ? "▲ Daralt" : `▼ ${messages.length - 3} mesaj daha`}
        </button>
      )}
    </section>
  );
}

// ===== Mesaj tipine göre stil =====
function getKindStyle(kind: MessageItem["kind"]): { bg: string; text: string; label: string } {
  switch (kind) {
    case "transfer_accepted":
      return { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Teklif Kabul" };
    case "transfer_rejected":
      return { bg: "bg-red-500/15", text: "text-red-400", label: "Teklif Red" };
    case "transfer_negotiated":
      return { bg: "bg-sky-500/15", text: "text-sky-400", label: "Counter Teklif" };
    case "transfer_offer_incoming":
      return { bg: "bg-amber-500/15", text: "text-amber-400", label: "Gelen Teklif" };
    case "transfer_offer_response":
      return { bg: "bg-purple-500/15", text: "text-purple-400", label: "Teklif Yanıtı" };
    case "loan_request":
      return { bg: "bg-cyan-500/15", text: "text-cyan-400", label: "Kiralık Talebi" };
    case "general":
    default:
      return { bg: "bg-muted", text: "text-muted-foreground", label: "Mesaj" };
  }
}
