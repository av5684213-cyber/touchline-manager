"use client";

import { useState } from "react";
import { Inbox, Mail, Trash2, X } from "lucide-react";
import { useAppStore, useMyTeam } from "@/lib/store";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

const KIND_STYLE: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  transfer_accepted: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Teklif Kabul", icon: "✓" },
  transfer_rejected: { bg: "bg-red-500/15", text: "text-red-400", label: "Teklif Red", icon: "✗" },
  transfer_negotiated: { bg: "bg-sky-500/15", text: "text-sky-400", label: "Counter Teklif", icon: "💬" },
  transfer_offer_incoming: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Gelen Teklif", icon: "📩" },
  transfer_offer_response: { bg: "bg-purple-500/15", text: "text-purple-400", label: "Teklif Yanıtı", icon: "↩️" },
  loan_request: { bg: "bg-cyan-500/15", text: "text-cyan-400", label: "Kiralık Talebi", icon: "🔄" },
  general: { bg: "bg-muted", text: "text-muted-foreground", label: "Mesaj", icon: "✉️" },
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "az önce";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} dk önce`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} saat önce`;
  return `${Math.floor(diff / 86_400_000)} gün önce`;
}

export function MessagesScreen() {
  const team = useMyTeam();
  const transfer = useAppStore((s) => s.transfer);
  const markMessageRead = useAppStore((s) => s.markMessageRead);
  const markAllMessagesRead = useAppStore((s) => s.markAllMessagesRead);
  const clearMessage = useAppStore((s) => s.clearMessage);
  const respondToIncomingMessage = useAppStore((s) => s.respondToIncomingMessage);
  const [filter, setFilter] = useState<"ALL" | "unread">("ALL");

  const messages = transfer?.messages ?? [];
  const unreadCount = messages.filter((m) => !m.read).length;
  const visibleMessages = filter === "unread" ? messages.filter((m) => !m.read) : messages;

  if (!team) return null;

  return (
    <div className="px-3 py-3 pb-24 space-y-3">
      <div className="tm-card p-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold flex items-center gap-2">
            <Inbox size={18} className="text-primary" />
            Mesajlar
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} okunmamış mesaj` : `${messages.length} mesaj`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => { haptic("light"); markAllMessagesRead(); }}
            className="tm-tap px-2.5 py-1.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/30"
          >
            Tümünü okundu işaretle
          </button>
        )}
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() => { haptic("light"); setFilter("ALL"); }}
          className={cn(
            "tm-tap px-3 py-1.5 rounded-full text-[11px] font-semibold border",
            filter === "ALL" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
          )}
        >
          Tümü ({messages.length})
        </button>
        <button
          onClick={() => { haptic("light"); setFilter("unread"); }}
          className={cn(
            "tm-tap px-3 py-1.5 rounded-full text-[11px] font-semibold border",
            filter === "unread" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
          )}
        >
          Okunmamış ({unreadCount})
        </button>
      </div>

      {visibleMessages.length === 0 ? (
        <div className="tm-card p-8 text-center">
          <Mail size={32} className="text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs font-bold mb-1">
            {filter === "unread" ? "Okunmamış mesaj yok" : "Henüz mesaj yok"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Transfer teklifi gönderdiğinde takım sahiplerinden yanıt gelecek.
          </p>
        </div>
      ) : (
        <div className="tm-card divide-y divide-border">
          {visibleMessages.map((m) => {
            const style = KIND_STYLE[m.kind] ?? KIND_STYLE.general;
            return (
              <div
                key={m.id}
                className={cn("p-3 transition-colors", !m.read && "bg-primary/5")}
                onClick={() => { haptic("light"); markMessageRead(m.id); }}
              >
                <div className="flex items-start gap-2.5">
                  <div className={cn("w-9 h-9 rounded-md flex items-center justify-center shrink-0 text-base", style.bg)}>
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={cn("text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded", style.bg, style.text)}>
                        {style.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">{m.fromTeamName}</span>
                      {!m.read && <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-auto shrink-0" />}
                    </div>
                    <p className="text-[11px] leading-relaxed mb-1.5">{m.message}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{relativeTime(m.at)}</span>
                      {m.amount && (
                        <span className="font-bold text-emerald-400">{formatEuro(m.amount)}</span>
                      )}
                      {m.counterOffer && (
                        <span className="font-bold text-sky-400">Counter: {formatEuro(m.counterOffer)}</span>
                      )}
                    </div>

                    {/* Aktif aksiyon butonları */}
                    <div className="mt-2 flex gap-1.5">
                      {m.kind === "transfer_accepted" && m.relatedOfferId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            haptic("success");
                            const res = useAppStore.getState().completeTransfer(m.relatedOfferId!);
                            if (!res.success) {
                              haptic("error");
                              alert(res.reason === "budget" ? "Yetersiz bütçe" : "Transfer tamamlanamadı");
                            }
                          }}
                          className="tm-tap flex-1 py-1.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white"
                        >
                          Transferi Tamamla
                        </button>
                      )}
                      {m.kind === "transfer_negotiated" && m.relatedOfferId && m.counterOffer && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              haptic("success");
                              const res = useAppStore.getState().acceptCounterOffer(m.relatedOfferId!);
                              if (!res.success) {
                                haptic("error");
                                alert(res.reason === "budget" ? "Yetersiz bütçe" : "Hata");
                              } else {
                                clearMessage(m.id);
                              }
                            }}
                            className="tm-tap flex-1 py-1.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white"
                          >
                            Kabul ({formatEuro(m.counterOffer)})
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              haptic("light");
                              if (m.relatedOfferId) useAppStore.getState().rejectCounterOffer(m.relatedOfferId);
                              clearMessage(m.id);
                            }}
                            className="tm-tap px-3 py-1.5 rounded-md text-[10px] font-bold border border-border text-muted-foreground"
                          >
                            Reddet
                          </button>
                        </>
                      )}
                      {m.kind === "transfer_offer_incoming" && m.playerId && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              haptic("success");
                              respondToIncomingMessage(m.id, "accept");
                            }}
                            className="tm-tap flex-1 py-1.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white"
                          >
                            Sat ({formatEuro(m.amount ?? 0)})
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              haptic("light");
                              respondToIncomingMessage(m.id, "reject");
                            }}
                            className="tm-tap flex-1 py-1.5 rounded-md text-[10px] font-bold border border-border text-muted-foreground"
                          >
                            Reddet
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); haptic("light"); clearMessage(m.id); }}
                    className="tm-tap p-1 text-muted-foreground shrink-0"
                    aria-label="Sil"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
