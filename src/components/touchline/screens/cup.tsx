"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { ClubBadge } from "../ui-bits";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import { formatEuro } from "@/lib/format";

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
  const { clubs, cup } = useAppStore();
  const playCupRound = useAppStore((s) => s.playCupRound);
  const [lastResult, setLastResult] = useState<string | null>(null);

  if (!team) return null;

  const getTeam = (id: string) => clubs.find((c) => c.id === id);
  const cupMatches = cup.matches;
  const currentRound = cup.currentRound;

  // Kullanıcının maçı var mı?
  const myCupMatch = cupMatches.find(
    (m) => (m.homeId === team.id || m.awayId === team.id) && !m.played && m.round === currentRound
  );

  const handlePlay = () => {
    haptic("success");
    const res = playCupRound();
    if (res.myResult) {
      setLastResult(res.myResult);
    }
  };

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
        <div className="text-[10px] text-amber-400 font-bold uppercase mb-1">🏆 Şampiyonluk Ödülü</div>
        <div className="text-sm font-bold text-amber-300">{formatEuro(ROUND_REWARD[4])}</div>
      </div>

      {/* Sonuç mesajı */}
      {lastResult && (
        <div className="tm-card p-2 text-center text-xs font-bold bg-amber-500/10 border-amber-500/30 text-amber-300">
          {lastResult}
        </div>
      )}

      {/* Şampiyon */}
      {cup.champion && (
        <div className="tm-card p-3 text-center bg-amber-500/15 border-amber-500/40">
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-sm font-bold text-amber-300">Şampiyon: {getTeam(cup.champion)?.name}</div>
          {cup.champion === team.id && (
            <div className="text-[10px] text-emerald-400 mt-1">+{formatEuro(ROUND_REWARD[4])} ödül kazandınız!</div>
          )}
        </div>
      )}

      {/* Play butonu */}
      {myCupMatch && !cup.champion && !cup.eliminated && (
        <div className="tm-card p-3">
          <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2 text-center">
            {t(ROUND_LABELS[currentRound] ?? "cup.round")}
          </div>
          <div className="flex items-center justify-center gap-3 py-2">
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
            onClick={handlePlay}
            className="tm-tap w-full mt-2 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold"
          >
            {t("cup.play")}
          </button>
        </div>
      )}

      {/* Elenen kullanıcı */}
      {cup.eliminated && !cup.champion && (
        <div className="tm-card p-3 text-center text-xs text-muted-foreground">
          Kupadan elendiniz. Diğer maçları izlemek için aşağıdaki sonuçları takip edin.
        </div>
      )}

      {/* Tur eşleşmeleri */}
      <div>
        <div className="text-xs font-bold mb-2">
          {t(ROUND_LABELS[currentRound] ?? "cup.round")}
        </div>
        <div className="space-y-1">
          {cupMatches.filter(m => m.round === currentRound).length === 0 && (
            <div className="tm-card p-4 text-center text-xs text-muted-foreground">
              {t("cup.no_matches")}
            </div>
          )}
          {cupMatches.filter(m => m.round === currentRound).map((m, i) => {
            const home = getTeam(m.homeId);
            const away = getTeam(m.awayId);
            if (!home || !away) return null;
            const isMine = m.homeId === team.id || m.awayId === team.id;
            return (
              <div
                key={i}
                className={cn(
                  "tm-card py-1.5 px-2.5 flex items-center gap-2",
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

      {/* Önceki turlar */}
      {cupMatches.filter(m => m.round < currentRound).length > 0 && (
        <div>
          <div className="text-xs font-bold mb-2 text-muted-foreground">Önceki Turlar</div>
          <div className="space-y-1">
            {cupMatches.filter(m => m.round < currentRound).map((m, i) => {
              const home = getTeam(m.homeId);
              const away = getTeam(m.awayId);
              if (!home || !away) return null;
              const isMine = m.homeId === team.id || m.awayId === team.id;
              const homeWon = (m.homeScore ?? 0) > (m.awayScore ?? 0);
              return (
                <div
                  key={i}
                  className={cn(
                    "tm-card py-1 px-2.5 flex items-center gap-2 opacity-60",
                    isMine && "border-primary/30"
                  )}
                >
                  <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
                    <span className={cn("text-[10px] truncate", homeWon ? "font-bold" : "text-muted-foreground")}>{home.shortName}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold px-1">
                    {m.homeScore} - {m.awayScore}
                  </span>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className={cn("text-[10px] truncate", !homeWon ? "font-bold" : "text-muted-foreground")}>{away.shortName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
