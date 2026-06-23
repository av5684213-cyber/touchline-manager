"use client";

import { Check, Trophy, TrendingDown, TrendingUp, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { SeasonSummary } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SeasonEndModal({
  summary,
  onClose,
}: {
  summary: SeasonSummary;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-[360px] bg-background rounded-2xl border border-border p-5 max-h-[90vh] overflow-y-auto tm-thin-scrollbar">
        {/* Close */}
        <button
          onClick={onClose}
          className="tm-tap absolute top-3 right-3 p-1 text-muted-foreground"
        >
          <X size={16} />
        </button>

        {/* Title */}
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">{summary.promoted ? "🏆" : summary.relegated ? "📉" : "⚽"}</div>
          <h2 className="text-lg font-bold">Sezon Sonu</h2>
          <p className="text-[11px] text-muted-foreground">2025–26 sezonu tamamlandı</p>
        </div>

        {/* Final position */}
        <div className="tm-card p-3 mb-3 text-center">
          <div className="text-[10px] uppercase text-muted-foreground mb-1">Final Sıralama</div>
          <div className="text-4xl font-bold tabular-nums">{summary.finalPosition}</div>
          <div className="text-[10px] text-muted-foreground">/ 18 takım</div>
          {summary.promoted && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
              <TrendingUp size={10} /> Süper Lig'e Yükseldi!
            </div>
          )}
          {summary.relegated && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
              <TrendingDown size={10} /> 2. Lig'e Düştü
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
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {name}
                </span>
              ))}
              {summary.retiredPlayers.length > 5 && (
                <span className="text-[9px] text-muted-foreground">
                  +{summary.retiredPlayers.length - 5} daha
                </span>
              )}
            </div>
          </div>
        )}

        {/* New season button */}
        <button
          onClick={onClose}
          className="tm-tap w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold mt-2"
        >
          Yeni Sezona Başla
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="tm-card p-2 text-center">
      <div className={cn("text-lg font-bold tabular-nums", color)}>{value}</div>
      <div className="text-[9px] text-muted-foreground uppercase">{label}</div>
    </div>
  );
}
