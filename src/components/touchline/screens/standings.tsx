"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { computeStandings, SEASON_INFO } from "@/lib/mock/season";
import { ClubBadge } from "../ui-bits";
import { TeamDetailModal } from "../team-detail-modal";
import { TeamMessageModal } from "../team-message-modal";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import type { FormResult } from "@/lib/mock/season";
import type { Team } from "@/lib/mock/data";

// 18 takım için: 0-1 promotion, 2-5 playoff, 15-17 relegation
function getZone(idx: number): "promotion" | "playoff" | "relegation" | "middle" {
  if (idx <= 1) return "promotion";
  if (idx <= 5) return "playoff";
  if (idx >= 15) return "relegation";
  return "middle";
}

const ZONE_COLORS: Record<string, string> = {
  promotion: "border-l-emerald-500",
  playoff: "border-l-amber-500",
  relegation: "border-l-red-500",
  middle: "border-l-transparent",
};

const ZONE_DOT: Record<string, string> = {
  promotion: "bg-emerald-500",
  playoff: "bg-amber-500",
  relegation: "bg-red-500",
  middle: "bg-transparent",
};

export function StandingsScreen() {
  const { t } = useI18n();
  const { clubs, fixtures } = useAppStore();
  const team = useMyTeam();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [messageTeam, setMessageTeam] = useState<Team | null>(null);

  const standings = useMemo(
    () => computeStandings(clubs, fixtures),
    [clubs, fixtures]
  );

  const myPos = useMemo(
    () => standings.findIndex((s) => s.teamId === (team?.id ?? "")),
    [standings, team]
  );

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      {/* Header */}
      <div className="tm-card p-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">{t("standings.title")}</h1>
          <p className="text-[11px] text-muted-foreground">
            {t("dash.1lig")} · {t("standings.matchday")} {SEASON_INFO.matchday}/{SEASON_INFO.totalMatchdays}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t("standings.col.pos")}
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {myPos >= 0 ? myPos + 1 : "—"}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="tm-card overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[24px_1fr_22px_22px_22px_22px_24px_28px_22px_22px] gap-1 px-2 py-2 text-[9px] font-bold uppercase text-muted-foreground border-b border-border bg-muted/30">
          <div className="text-center">{t("standings.col.pos")}</div>
          <div>{t("standings.col.team")}</div>
          <div className="text-center">{t("standings.col.played")}</div>
          <div className="text-center">{t("standings.col.won")}</div>
          <div className="text-center">{t("standings.col.drawn")}</div>
          <div className="text-center">{t("standings.col.lost")}</div>
          <div className="text-center">{t("standings.col.gd")}</div>
          <div className="text-center font-bold text-foreground">{t("standings.col.points")}</div>
          <div className="text-center" style={{ gridColumn: "span 2" }}>{t("standings.col.form")}</div>
        </div>

        {/* Rows */}
        <div className="overflow-y-auto tm-thin-scrollbar max-h-[60vh]">
          {standings.map((row, idx) => {
            const isMe = row.teamId === team?.id;
            const zone = getZone(idx);
            const gd = row.goalsFor - row.goalsAgainst;
            const teamData = clubs.find((c) => c.id === row.teamId);
            return (
              <button
                key={row.teamId}
                onClick={() => {
                  haptic("light");
                  if (teamData) setSelectedTeam(teamData);
                }}
                className={cn(
                  "grid grid-cols-[24px_1fr_22px_22px_22px_22px_24px_28px_22px_22px] gap-1 px-2 py-2 text-xs items-center border-l-2 border-b border-border/40 last:border-b-0 w-full text-left hover:bg-accent/50 transition-colors",
                  ZONE_COLORS[zone],
                  isMe && "bg-primary/5"
                )}
              >
                {/* Position + zone dot */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold tabular-nums w-4 text-center">
                    {idx + 1}
                  </span>
                  <span className={cn("w-1 h-3 rounded-full shrink-0", ZONE_DOT[zone])} />
                </div>

                {/* Team */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <ClubBadge
                    short={row.shortName}
                    primaryColor={row.primaryColor}
                    size={18}
                  />
                  <span
                    className={cn(
                      "truncate text-[11px]",
                      isMe ? "font-bold text-primary" : "font-medium"
                    )}
                  >
                    {row.teamName}
                  </span>
                  {isMe && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-primary text-primary-foreground font-bold shrink-0">
                      {t("standings.you")}
                    </span>
                  )}
                </div>

                {/* O G B M */}
                <div className="text-center tabular-nums">{row.played}</div>
                <div className="text-center tabular-nums text-emerald-700">{row.won}</div>
                <div className="text-center tabular-nums text-muted-foreground">{row.drawn}</div>
                <div className="text-center tabular-nums text-red-600">{row.lost}</div>

                {/* GD */}
                <div className="text-center tabular-nums">
                  {gd > 0 ? `+${gd}` : gd}
                </div>

                {/* Points (bold) */}
                <div className="text-center tabular-nums font-bold">{row.points}</div>

                {/* Form */}
                <div className="col-span-2 flex items-center justify-center gap-0.5">
                  {row.form.length === 0 ? (
                    <span className="text-[9px] text-muted-foreground">—</span>
                  ) : (
                    row.form.map((f, i) => <FormDot key={i} result={f} />)
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="tm-card p-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
          {t("standings.legend")}
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <LegendItem color="bg-emerald-500" label={t("standings.zone.promotion")} />
          <LegendItem color="bg-amber-500" label={t("standings.zone.playoff")} />
          <LegendItem color="bg-red-500" label={t("standings.zone.relegation")} />
        </div>
      </div>

      {/* Team detail modal */}
      {selectedTeam && team && (
        <TeamDetailModal
          team={selectedTeam}
          isMyTeam={selectedTeam.id === team.id}
          onClose={() => setSelectedTeam(null)}
          onMessage={(t) => {
            setSelectedTeam(null);
            setMessageTeam(t);
          }}
        />
      )}

      {/* Team message modal */}
      {messageTeam && team && (
        <TeamMessageModal
          team={messageTeam}
          myTeam={team}
          onClose={() => setMessageTeam(null)}
        />
      )}
    </div>
  );
}

function FormDot({ result }: { result: FormResult }) {
  const cls =
    result === "W"
      ? "bg-emerald-500 text-white"
      : result === "D"
      ? "bg-amber-400 text-amber-900"
      : "bg-red-500 text-white";
  const label = result === "W" ? "G" : result === "D" ? "B" : "M";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-4 h-4 rounded text-[8px] font-bold",
        cls
      )}
    >
      {label}
    </span>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", color)} />
      <span className="text-[10px] leading-tight">{label}</span>
    </div>
  );
}
