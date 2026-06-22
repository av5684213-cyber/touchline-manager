"use client";

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { ClubBadge } from "../ui-bits";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

type CupMatch = {
  round: number;
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
};

const ROUND_LABELS: Record<number, string> = {
  1: "cup.round.last16",
  2: "cup.round.quarter",
  3: "cup.round.semi",
  4: "cup.round.final",
};

const ROUND_REWARD: Record<number, number> = {
  1: 50_000,
  2: 150_000,
  3: 400_000,
  4: 1_000_000,
};

export function CupScreen() {
  const { t } = useI18n();
  const team = useMyTeam();
  const { clubs } = useAppStore();

  // Kupa fikstürü üret — 8 takım, 4 tur (çeyrek/yarı/final)
  // Basit: ilk 8 takım rastgele eşleştir
  const cupMatches = useMemo(() => {
    if (!team) return [];
    const top8 = [...clubs].sort((a, b) =>
      b.players.reduce((s, p) => s + p.rating, 0) -
      a.players.reduce((s, p) => s + p.rating, 0)
    ).slice(0, 8);

    const matches: CupMatch[] = [];
    // Çeyrek final (4 maç)
    for (let i = 0; i < 4; i++) {
      matches.push({
        round: 2,
        homeId: top8[i * 2].id,
        awayId: top8[i * 2 + 1].id,
        homeScore: null,
        awayScore: null,
        played: false,
      });
    }
    return matches;
  }, [clubs, team]);

  if (!team) return null;

  const getTeam = (id: string) => clubs.find((c) => c.id === id);
  const currentRound = 2; // çeyrek final başlangıç

  // Kullanıcının takımı kupa'da var mı?
  const myCupMatch = cupMatches.find(
    (m) => (m.homeId === team.id || m.awayId === team.id) && !m.played
  );

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      {/* Header */}
      <div className="tm-card p-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">{t("cup.title")}</h1>
          <p className="text-[11px] text-muted-foreground">{t("cup.weekend")}</p>
        </div>
        <div className="w-10 h-10 rounded-md bg-amber-500/20 flex items-center justify-center">
          <Trophy size={20} className="text-amber-400" />
        </div>
      </div>

      {/* Şampiyon ödülü */}
      <div className="tm-card p-3 border-amber-500/30 bg-amber-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <div>
              <div className="text-xs font-bold text-amber-300">{t("cup.champion")}</div>
              <div className="text-[10px] text-muted-foreground">{t("cup.reward")}</div>
            </div>
          </div>
          <div className="text-lg font-bold tabular-nums text-amber-300">€1M</div>
        </div>
      </div>

      {/* Kullanıcının maçı */}
      {myCupMatch && (
        <div className="tm-card p-3 border-primary/30">
          <div className="text-[10px] uppercase tracking-wide text-primary font-bold mb-2">
            {t("cup.your_match")} · {t(ROUND_LABELS[myCupMatch.round] ?? "cup.round")}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {(() => {
              const home = getTeam(myCupMatch.homeId);
              const away = getTeam(myCupMatch.awayId);
              return (
                <>
                  <div className="flex flex-col items-center gap-1">
                    {home && <ClubBadge short={home.shortName} primaryColor={home.primaryColor} size={36} />}
                    <span className="text-[9px] font-bold">{home?.shortName}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold">{t("dash.vs")}</span>
                  <div className="flex flex-col items-center gap-1">
                    {away && <ClubBadge short={away.shortName} primaryColor={away.primaryColor} size={36} />}
                    <span className="text-[9px] font-bold">{away?.shortName}</span>
                  </div>
                </>
              );
            })()}
          </div>
          <button
            onClick={() => { haptic("medium"); }}
            className="tm-tap w-full mt-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold"
          >
            {t("cup.play")}
          </button>
        </div>
      )}

      {/* Tur eşleşmeleri */}
      <div>
        <div className="text-xs font-bold mb-2">
          {t(ROUND_LABELS[currentRound] ?? "cup.round")}
        </div>
        <div className="space-y-1.5">
          {cupMatches.length === 0 && (
            <div className="tm-card p-4 text-center text-xs text-muted-foreground">
              {t("cup.no_matches")}
            </div>
          )}
          {cupMatches.map((m, i) => {
            const home = getTeam(m.homeId);
            const away = getTeam(m.awayId);
            if (!home || !away) return null;
            const isMine = m.homeId === team.id || m.awayId === team.id;
            return (
              <div
                key={i}
                className={cn(
                  "tm-card p-2.5 flex items-center gap-2",
                  isMine && "border-primary/50"
                )}
              >
                <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
                  <span className="text-[10px] font-semibold truncate">{home.name}</span>
                  <ClubBadge short={home.shortName} primaryColor={home.primaryColor} size={20} />
                </div>
                <span className="text-[10px] text-muted-foreground font-bold px-1">
                  {m.played ? `${m.homeScore} - ${m.awayScore}` : "vs"}
                </span>
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <ClubBadge short={away.shortName} primaryColor={away.primaryColor} size={20} />
                  <span className="text-[10px] font-semibold truncate">{away.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
