"use client";

import { useEffect, useState } from "react";
import { Check, Trophy, TrendingDown, TrendingUp, X, Sparkles, PartyPopper, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { SeasonSummary } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptic, useBodyScrollLock, useEscapeToClose } from "@/hooks/touchline"  // P0: escape + scroll lock;

export function SeasonEndModal({
  summary,
  onClose,
}: {
  summary: SeasonSummary;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<"summary" | "transition" | "ready">("summary");
  useEscapeToClose(onClose);
  useBodyScrollLock(true);

  // P2: Faz geçişlerinde titreşim
  useEffect(() => {
    haptic("medium");
  }, [phase]);

  const isChampion = summary.finalPosition === 1;
  const isPromoted = summary.promoted;
  const isRelegated = summary.relegated;

  // FAZ 1: Sezon Özeti
  if (phase === "summary") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/85" />
        <div className="relative w-full max-w-[360px] bg-background rounded-2xl border border-border p-5 max-h-[90vh] overflow-y-auto tm-thin-scrollbar">
          {/* Close */}
          <button
            onClick={onClose}
            className="tm-tap absolute top-3 right-3 p-1 text-muted-foreground"
          >
            <X size={16} />
          </button>

          {/* Şampiyonluk kutlaması */}
          {isChampion && (
            <div className="text-center mb-4 -mt-2">
              <div className="text-6xl mb-2 animate-bounce">🏆</div>
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                <Sparkles size={10} /> ŞAMPİYON
              </div>
            </div>
          )}

          {/* Title */}
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">
              {isChampion ? "🏆" : isPromoted ? "⬆️" : isRelegated ? "📉" : "⚽"}
            </div>
            <h2 className="text-lg font-bold">
              {isChampion ? "Şampiyonluk!" : "Sezon Sonu"}
            </h2>
            <p className="text-[11px] text-muted-foreground">2025–26 sezonu tamamlandı</p>
          </div>

          {/* Final position */}
          <div className="tm-card p-3 mb-3 text-center">
            <div className="text-[10px] uppercase text-muted-foreground mb-1">Final Sıralama</div>
            <div className={cn(
              "text-4xl font-bold tabular-nums",
              isChampion && "text-amber-300"
            )}>
              {summary.finalPosition}
            </div>
            <div className="text-[10px] text-muted-foreground">/ 18 takım</div>
            {summary.promoted && (
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                <TrendingUp size={10} /> Üst Lige Yükseldi!
              </div>
            )}
            {summary.relegated && (
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                <TrendingDown size={10} /> Alt Lige Düştü
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <StatBox label="O" value={summary.played} />
            <StatBox label="G" value={summary.won} color="text-emerald-400" />
            <StatBox label="B" value={summary.drawn} color="text-amber-400" />
            <StatBox label="M" value={summary.lost} color="text-red-400" />
          </div>

          {/* Points */}
          <div className="tm-card p-2.5 mb-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Toplam Puan</span>
            <span className="text-xl font-bold tabular-nums text-primary">{summary.points}</span>
          </div>

          {/* Top scorer */}
          {summary.topScorer && (
            <div className="tm-card p-2.5 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-amber-400" />
                <span className="text-xs text-muted-foreground">Gol Kralı</span>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold">{summary.topScorer.name}</div>
                <div className="text-[10px] text-muted-foreground">{summary.topScorer.goals} gol</div>
              </div>
            </div>
          )}

          {/* Retired players */}
          {summary.retiredPlayers.length > 0 && (
            <div className="tm-card p-2.5 mb-3">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">Emekli Olan Oyuncular</div>
              <div className="flex flex-wrap gap-1">
                {summary.retiredPlayers.slice(0, 5).map((name, i) => (
                  <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {name}
                  </span>
                ))}
                {summary.retiredPlayers.length > 5 && (
                  <span className="text-[11px] text-muted-foreground">
                    +{summary.retiredPlayers.length - 5} daha
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Devam butonu — "Yeni Sezona Hazırlan" */}
          <button
            onClick={() => { haptic("success"); setPhase("transition"); }}
            className="tm-tap w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold mt-2 flex items-center justify-center gap-2"
          >
            Devam Et <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // FAZ 2: Geçiş animasyonu — şampiyonluk kutlaması / yükseilme / düşme
  if (phase === "transition") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={cn(
          "absolute inset-0",
          isChampion ? "bg-gradient-to-b from-amber-900/90 to-black/95" :
          isPromoted ? "bg-gradient-to-b from-emerald-900/90 to-black/95" :
          isRelegated ? "bg-gradient-to-b from-red-900/90 to-black/95" :
          "bg-black/90"
        )} />
        <div className="relative text-center max-w-[320px]">
          {/* Büyük emoji animasyon */}
          <div className="text-8xl mb-4 animate-bounce">
            {isChampion ? "🏆" : isPromoted ? "⬆️" : isRelegated ? "📉" : "⚽"}
          </div>

          {/* Başlık */}
          <h2 className="text-2xl font-bold mb-2 text-white">
            {isChampion ? "ŞAMPİYON!" : isPromoted ? "YÜKSELDİ!" : isRelegated ? "DÜŞTÜ" : "SEZON BİTTİ"}
          </h2>
          <p className="text-sm text-white/70 mb-6">
            {isChampion
              ? "Tarihi bir sezon! Trophy sahibi sensin."
              : isPromoted
              ? "Üst ligde mücadele etmeye hak kazandın!"
              : isRelegated
              ? "Sezon hayal kırıklığı oldu. Önümüzdeki sezon geri döneceğiz."
              : "Sezon tamamlandı. Yeni sezona hazır ol."}
          </p>

          {/* Konfeti efekti — basit CSS */}
          {isChampion && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <span
                  key={i}
                  className="absolute text-2xl animate-ping"
                  style={{
                    left: `${10 + i * 8}%`,
                    top: `${20 + (i % 3) * 20}%`,
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: "2s",
                  }}
                >
                  {["🎉", "✨", "🎊", "⭐"][i % 4]}
                </span>
              ))}
            </div>
          )}

          {/* Devam butonu */}
          <button
            onClick={() => { haptic("success"); setPhase("ready"); }}
            className="tm-tap px-8 py-3 rounded-lg bg-white text-black text-sm font-bold flex items-center justify-center gap-2 mx-auto"
          >
            <PartyPopper size={16} /> Yeni Sezona Geç
          </button>
        </div>
      </div>
    );
  }

  // FAZ 3: Yeni sezon hazır ekranı
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-black/90" />
      <div className="relative w-full max-w-[340px] bg-background rounded-2xl border border-border p-6 text-center">
        <div className="text-5xl mb-3">⚽</div>
        <h2 className="text-xl font-bold mb-1">Yeni Sezon Başlıyor</h2>
        <p className="text-[11px] text-muted-foreground mb-4">
          2026–27 sezonuna hazır mısın? Kadro yenilendi, taktikleri gözden geçir.
        </p>

        {/* Hazırlık listesi */}
        <div className="space-y-2 mb-5 text-left">
          <div className="flex items-center gap-2 text-[11px]">
            <Check size={12} className="text-emerald-400 shrink-0" />
            <span>Oyuncular yaşlandırıldı ve form sıfırlandı</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Check size={12} className="text-emerald-400 shrink-0" />
            <span>Sakatlık ve loan durumları temizlendi</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Check size={12} className="text-emerald-400 shrink-0" />
            <span>Yeni fikstür oluşturuldu</span>
          </div>
          {summary.newRegens > 0 && (
            <div className="flex items-center gap-2 text-[11px]">
              <Check size={12} className="text-emerald-400 shrink-0" />
              <span>{summary.newRegens} yeni genç oyuncu kadroya eklendi</span>
            </div>
          )}
        </div>

        {/* Başla butonu */}
        <button
          onClick={() => { haptic("success"); onClose(); }}
          className="tm-tap w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2"
        >
          <Sparkles size={14} /> Yeni Sezona Başla
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="tm-card p-2 text-center">
      <div className={cn("text-lg font-bold tabular-nums", color)}>{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase">{label}</div>
    </div>
  );
}
