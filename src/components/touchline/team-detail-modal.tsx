"use client";

import { useState, useMemo } from "react";
import { MessageSquare, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore } from "@/lib/store";
import { POSITION_GROUP, type Player, type PositionGroup, type Team } from "@/lib/mock/data";
import { ClubBadge, PlayerAvatar, PositionPill, RatingBadge } from "./ui-bits";
import { PlayerProfileModal } from "./player-profile-modal";
import { MatchReplayModal } from "./match-replay-modal";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

// Mevki pozisyon grubuna göre satır arka planı — taktik sekmesiyle aynı
const POSITION_ROW_BG: Record<PositionGroup, string> = {
  GK: "bg-amber-100/70 dark:bg-amber-950/30",
  DEF: "bg-sky-100/70 dark:bg-sky-950/30",
  MID: "bg-emerald-100/70 dark:bg-emerald-950/30",
  FWD: "bg-rose-100/70 dark:bg-rose-950/30",
};

// Mevki sıralaması — önce kaleci, sonra defans, orta saha, forvet
const POSITION_GROUP_ORDER: PositionGroup[] = ["GK", "DEF", "MID", "FWD"];

function sortByPositionThenRating(players: Player[]): Player[] {
  return players.slice().sort((a, b) => {
    const ga = POSITION_GROUP_ORDER.indexOf(POSITION_GROUP[a.specificPosition]);
    const gb = POSITION_GROUP_ORDER.indexOf(POSITION_GROUP[b.specificPosition]);
    if (ga !== gb) return ga - gb;
    return b.rating - a.rating;
  });
}

export function TeamDetailModal({
  team,
  isMyTeam,
  onClose,
  onMessage,
}: {
  team: Team;
  isMyTeam: boolean;
  onClose: () => void;
  onMessage: (team: Team) => void;
}) {
  const { t, locale } = useI18n();
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
  const [posFilter, setPosFilter] = useState<"ALL" | "GK" | "DEF" | "MID" | "FWD">("ALL");
  const [detailTab, setDetailTab] = useState<"players" | "matches">("players");
  const [replayMatch, setReplayMatch] = useState<{ homeId: string; awayId: string; homeScore: number; awayScore: number; matchday: number } | null>(null);
  const { clubs, fixtures } = useAppStore();

  // Bu takımın fikstürü
  const teamFixtures = useMemo(() => {
    return fixtures
      .filter((f) => f.homeId === team.id || f.awayId === team.id)
      .sort((a, b) => a.matchday - b.matchday);
  }, [fixtures, team.id]);

  const filteredPlayers = posFilter === "ALL"
    ? team.players
    : team.players.filter((p) => POSITION_GROUP[p.specificPosition] === posFilter);

  // Mevkiiye göre sırala (GK → DEF → MID → FWD), aynı grupta rating'e göre
  const sortedPlayers = sortByPositionThenRating(filteredPlayers);
  const avgOvr = Math.round(team.players.reduce((s, p) => s + p.rating, 0) / team.players.length);
  const totalValue = team.players.reduce((s, p) => s + p.marketValue, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border" style={{ background: team.primaryColor }}>
          <div className="flex items-center gap-2">
            <ClubBadge short={team.shortName} primaryColor={team.primaryColor} size={32} />
            <div>
              <div className="text-sm font-bold text-white">{team.name}</div>
              <div className="text-[9px] text-white/70">{t("dash.1lig")} · {t("dash.season")} 2025–26</div>
            </div>
          </div>
          <button onClick={onClose} className="tm-tap p-1 text-white/80">
            <X size={16} />
          </button>
        </div>

        {/* Team info grid */}
        <div className="grid grid-cols-3 gap-2 p-3 border-b border-border">
          <div className="tm-card p-2 text-center">
            <div className="text-lg font-bold tabular-nums">{team.players.length}</div>
            <div className="text-[8px] text-muted-foreground uppercase">Oyuncu</div>
          </div>
          <div className="tm-card p-2 text-center">
            <div className="text-lg font-bold tabular-nums">{avgOvr}</div>
            <div className="text-[8px] text-muted-foreground uppercase">Ort. OVR</div>
          </div>
          <div className="tm-card p-2 text-center">
            <div className="text-[11px] font-bold tabular-nums">{formatEuro(totalValue, locale)}</div>
            <div className="text-[8px] text-muted-foreground uppercase">Değer</div>
          </div>
        </div>

        {/* Message button (kendi takımın değilse) */}
        {!isMyTeam && (
          <div className="p-2 border-b border-border">
            <button
              onClick={() => { haptic("light"); onMessage(team); }}
              className="tm-tap w-full py-2 rounded-md bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center gap-2"
            >
              <MessageSquare size={14} /> Mesaj Gönder
            </button>
          </div>
        )}

        {/* Tab navigation: Oyuncular / Maçlar */}
        <div className="flex border-b border-border">
          <button
            onClick={() => { haptic("light"); setDetailTab("players"); }}
            className={cn(
              "tm-tap flex-1 py-2 text-xs font-bold",
              detailTab === "players" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            )}
          >
            Oyuncular ({team.players.length})
          </button>
          <button
            onClick={() => { haptic("light"); setDetailTab("matches"); }}
            className={cn(
              "tm-tap flex-1 py-2 text-xs font-bold",
              detailTab === "matches" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            )}
          >
            Maçlar ({teamFixtures.filter((f) => f.played).length}/{teamFixtures.length})
          </button>
        </div>

        {/* Oyuncular tab */}
        {detailTab === "players" && (
          <>
        {/* Position filter */}
        <div className="flex gap-1 p-2 border-b border-border overflow-x-auto tm-no-scrollbar">
          {(["ALL", "GK", "DEF", "MID", "FWD"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setPosFilter(g)}
              className={cn(
                "tm-tap px-2 py-1 rounded-full text-[10px] font-semibold border whitespace-nowrap",
                posFilter === g ? "bg-foreground text-background border-foreground" : "bg-card border-border"
              )}
            >
              {g === "ALL" ? t("common.all") : t(`pos.${g.toLowerCase()}`)}
            </button>
          ))}
        </div>

        {/* Player list — taktik sekmesindeki 'Oyuncularım' ile aynı görünüm */}
        <div className="flex-1 overflow-y-auto tm-thin-scrollbar p-2">
          <div className="tm-card divide-y divide-border">
            {sortedPlayers.map((p) => {
              const posGroup = POSITION_GROUP[p.specificPosition];
              return (
                <button
                  key={p.id}
                  onClick={() => { haptic("light"); setProfilePlayer(p); }}
                  className={cn(
                    "tm-tap w-full flex items-center gap-3 p-2.5 text-left transition-colors",
                    POSITION_ROW_BG[posGroup]
                  )}
                >
                  <PlayerAvatar
                    initials={p.specificPosition}
                    color={team.primaryColor}
                    size={32}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold truncate">{p.firstName} {p.lastName}</span>
                      <PositionPill label={p.specificPosition} group={POSITION_GROUP[p.specificPosition]} />
                      {p.archetype && (
                        <span className="text-[9px] text-amber-300 truncate">{p.archetype}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {p.age}{t("common.year")} · {p.nationality === "TR" ? "🇹🇷" : "🌍"} · {p.foot}
                    </div>
                  </div>
                  <div className="text-right">
                    <RatingBadge value={p.formRating} />
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      {p.specificPosition === "GK" ? `${p.saves}K` : `${p.goals}G·${p.assists}A`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
          </>
        )}

        {/* Maçlar tab — takımın tüm fikstürü, skorlar tıklanabilir */}
        {detailTab === "matches" && (
          <div className="flex-1 overflow-y-auto tm-thin-scrollbar p-2 space-y-1.5">
            {teamFixtures.map((f) => {
              const isHome = f.homeId === team.id;
              const oppId = isHome ? f.awayId : f.homeId;
              const opp = clubs.find((c) => c.id === oppId);
              if (!opp) return null;
              const us = isHome ? f.homeScore : f.awayScore;
              const them = isHome ? f.awayScore : f.homeScore;
              const outcome = f.played
                ? (us ?? 0) > (them ?? 0) ? "W" : (us ?? 0) < (them ?? 0) ? "L" : "D"
                : null;
              return (
                <div key={f.id} className="tm-card p-2.5 flex items-center gap-2.5">
                  <div className="w-8 text-center shrink-0">
                    <div className="text-[8px] uppercase text-muted-foreground">Hafta</div>
                    <div className="text-xs font-bold tabular-nums">{f.matchday}</div>
                  </div>
                  <span className={cn(
                    "text-[9px] px-1 py-0.5 rounded font-bold shrink-0 w-7 text-center",
                    isHome ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300"
                  )}>
                    {isHome ? "Ev" : "Dep"}
                  </span>
                  <ClubBadge short={opp.shortName} primaryColor={opp.primaryColor} size={20} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold truncate">{opp.name}</div>
                  </div>
                  {f.played ? (
                    <button
                      onClick={() => {
                        haptic("light");
                        setReplayMatch({
                          homeId: f.homeId,
                          awayId: f.awayId,
                          homeScore: f.homeScore ?? 0,
                          awayScore: f.awayScore ?? 0,
                          matchday: f.matchday,
                        });
                      }}
                      className={cn(
                        "tm-tap text-sm font-bold tabular-nums px-1.5 py-0.5 rounded hover:bg-accent/50 transition-colors",
                        outcome === "W" ? "text-emerald-400"
                        : outcome === "L" ? "text-red-400"
                        : "text-amber-400"
                      )}
                    >
                      {us} - {them}
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Player profile modal (nested) */}
      {profilePlayer && (
        <PlayerProfileModal
          player={profilePlayer}
          teamColor={team.primaryColor}
          onClose={() => setProfilePlayer(null)}
        />
      )}

      {/* Maç tekrar izleme modal'ı (nested) */}
      {replayMatch && (() => {
        const home = clubs.find((c) => c.id === replayMatch.homeId);
        const away = clubs.find((c) => c.id === replayMatch.awayId);
        if (!home || !away) return null;
        return (
          <MatchReplayModal
            homeTeam={home}
            awayTeam={away}
            homeScore={replayMatch.homeScore}
            awayScore={replayMatch.awayScore}
            matchday={replayMatch.matchday}
            onClose={() => setReplayMatch(null)}
          />
        );
      })()}
    </div>
  );
}
