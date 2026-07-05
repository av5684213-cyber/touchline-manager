"use client";

import { useMemo, useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { ClubBadge } from "../ui-bits";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import { formatEuro } from "@/lib/format";

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
  const [cupState, setCupState] = useState<{ matches: CupMatch[]; round: number; champion?: string }>({
    matches: [],
    round: 2,
  });
  const [lastResult, setLastResult] = useState<string | null>(null);

  // İlk açılışta kupa fikstürü üret
  useEffect(() => {
    if (!team || cupState.matches.length > 0) return;
    const top8 = [...clubs].sort((a, b) =>
      b.players.reduce((s, p) => s + p.rating, 0) -
      a.players.reduce((s, p) => s + p.rating, 0)
    ).slice(0, 8);
    const matches: CupMatch[] = [];
    for (let i = 0; i < 4; i++) {
      matches.push({ round: 2, homeId: top8[i * 2].id, awayId: top8[i * 2 + 1].id, homeScore: null, awayScore: null, played: false });
    }
    setCupState({ matches, round: 2 });
  }, [clubs, team, cupState.matches.length]);

  // Maç simülasyonu — basit kalite farkı + random
  const simulateCupMatch = (homeId: string, awayId: string): { hs: number; as: number } => {
    const home = clubs.find(c => c.id === homeId);
    const away = clubs.find(c => c.id === awayId);
    if (!home || !away) return { hs: 0, as: 0 };
    const homeStr = home.players.slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11;
    const awayStr = away.players.slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11;
    const diff = homeStr - awayStr;
    const homeAdv = diff > 5 ? 0.3 : diff < -5 ? -0.3 : 0;
    const hs = Math.max(0, Math.floor(Math.random() * 4 + homeAdv * 2));
    const as = Math.max(0, Math.floor(Math.random() * 3 - homeAdv * 2));
    // Beraberlik olmasın — penaltılara gerek yok, uzatma golü
    if (hs === as) return { hs: hs + 1, as };
    return { hs, as };
  };

  // Play butonu — kullanıcının maçını simüle et + diğer maçları da oyna
  const playCupRound = () => {
    haptic("success");
    const currentMatches = cupState.matches.filter(m => m.round === cupState.round && !m.played);
    if (currentMatches.length === 0) return;

    // Tüm maçları simüle et
    const updatedMatches = cupState.matches.map(m => {
      if (m.round !== cupState.round || m.played) return m;
      const { hs, as } = simulateCupMatch(m.homeId, m.awayId);
      return { ...m, homeScore: hs, awayScore: as, played: true };
    });

    // Kullanıcının maçı sonucu
    const myMatch = currentMatches.find(m => m.homeId === team?.id || m.awayId === team?.id);
    if (myMatch) {
      const played = updatedMatches.find(m => m === updatedMatches.find(u => u.homeId === myMatch.homeId && u.awayId === myMatch.awayId && u.round === myMatch.round));
      if (played && played.homeScore !== null) {
        const isHome = played.homeId === team?.id;
        const myScore = isHome ? played.homeScore : played.awayScore;
        const oppScore = isHome ? played.awayScore : played.homeScore;
        if ((myScore ?? 0) > (oppScore ?? 0)) {
          setLastResult(`🎉 Tur atladınız! ${myScore}-${oppScore}`);
        } else {
          setLastResult(`😢 Kupadan elendiniz. ${myScore}-${oppScore}`);
        }
      }
    }

    // Kazananları belirle, sonraki tur eşleşmelerini üret
    const winners = updatedMatches
      .filter(m => m.round === cupState.round && m.played)
      .map(m => ((m.homeScore ?? 0) > (m.awayScore ?? 0)) ? m.homeId : m.awayId);

    const nextRound = cupState.round + 1;
    let nextMatches: CupMatch[] = [];

    if (winners.length >= 2) {
      for (let i = 0; i < winners.length; i += 2) {
        if (winners[i + 1]) {
          nextMatches.push({ round: nextRound, homeId: winners[i], awayId: winners[i + 1], homeScore: null, awayScore: null, played: false });
        }
      }
    }

    // Şampiyon var mı?
    let champion: string | undefined;
    if (winners.length === 1 && nextMatches.length === 0) {
      champion = winners[0];
      // Ödül ver
      if (champion === team?.id) {
        const reward = ROUND_REWARD[4] ?? 1_000_000;
        const t2 = clubs.find(c => c.id === team.id);
        if (t2) {
          t2.budget += reward;
          useAppStore.setState({ clubs: [...clubs] });
        }
      }
    }

    setCupState({ matches: [...updatedMatches, ...nextMatches], round: nextMatches.length > 0 ? nextRound : cupState.round, champion });
  };

  if (!team) return null;

  const getTeam = (id: string) => clubs.find((c) => c.id === id);
  const currentRound = cupState.round;
  const cupMatches = cupState.matches;

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
          {lastResult && (
            <div className="tm-card p-2 text-center text-xs font-bold bg-amber-500/10 border-amber-500/30 text-amber-300">
              {lastResult}
            </div>
          )}

          {cupState.champion && (
            <div className="tm-card p-3 text-center bg-amber-500/15 border-amber-500/40">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-sm font-bold text-amber-300">Şampiyon: {getTeam(cupState.champion)?.name}</div>
              {cupState.champion === team.id && (
                <div className="text-[10px] text-emerald-400 mt-1">+{formatEuro(ROUND_REWARD[4])} ödül kazandınız!</div>
              )}
            </div>
          )}

          {myCupMatch && !cupState.champion && (
            <button
              onClick={playCupRound}
              className="tm-tap w-full mt-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold"
            >
              {t("cup.play")}
            </button>
          )}
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
