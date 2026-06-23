"use client";

import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { POSITION_GROUP, type Player, type Team } from "@/lib/mock/data";
import { ClubBadge, PlayerAvatar, PositionPill, RatingBadge } from "./ui-bits";
import { PlayerProfileModal } from "./player-profile-modal";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

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

  const filteredPlayers = posFilter === "ALL"
    ? team.players
    : team.players.filter((p) => POSITION_GROUP[p.specificPosition] === posFilter);

  const sortedPlayers = [...filteredPlayers].sort((a, b) => b.rating - a.rating);
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

        {/* Player list */}
        <div className="flex-1 overflow-y-auto tm-thin-scrollbar p-2 space-y-1">
          {sortedPlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => { haptic("light"); setProfilePlayer(p); }}
              className="tm-tap w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-accent text-left"
            >
              <PlayerAvatar
                initials={`${p.firstName[0]}${p.lastName[0]}`}
                color={team.primaryColor}
                size={30}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold truncate">{p.firstName} {p.lastName}</span>
                  <PositionPill label={p.specificPosition} group={POSITION_GROUP[p.specificPosition]} />
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {p.age}{t("common.year")} · {p.archetype ?? "—"} · {p.nationality === "TR" ? "🇹🇷" : "🌍"}
                </div>
              </div>
              <RatingBadge value={p.formRating} />
              <span className="text-[10px] font-bold tabular-nums w-6 text-right">{p.rating}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Player profile modal (nested) */}
      {profilePlayer && (
        <PlayerProfileModal
          player={profilePlayer}
          teamColor={team.primaryColor}
          onClose={() => setProfilePlayer(null)}
        />
      )}
    </div>
  );
}
