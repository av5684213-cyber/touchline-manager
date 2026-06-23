"use client";

import { useMemo } from "react";
import { Award, Crown, Star, Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { computeStandings } from "@/lib/mock/season";
import { cn } from "@/lib/utils";

export function AwardsScreen() {
  const { t, locale } = useI18n();
  const team = useMyTeam();
  const { clubs, fixtures } = useAppStore();

  const awards = useMemo(() => {
    if (!team) return null;
    const standings = computeStandings(clubs, fixtures);
    const myStat = standings.find((s) => s.teamId === team.id);
    if (!myStat) return null;
    const myPos = standings.findIndex((s) => s.teamId === team.id) + 1;

    // Top scorer
    let topScorer = { name: "—", goals: 0, team: "" };
    let topAssist = { name: "—", assists: 0, team: "" };
    for (const club of clubs) {
      for (const p of club.players) {
        if (p.goals > topScorer.goals) {
          topScorer = { name: `${p.firstName} ${p.lastName}`, goals: p.goals, team: club.name };
        }
        if (p.assists > topAssist.assists) {
          topAssist = { name: `${p.firstName} ${p.lastName}`, assists: p.assists, team: club.name };
        }
      }
    }

    // MVP — en yüksek rating'li oyuncu
    let mvp = { name: "—", rating: 0, team: "" };
    for (const club of clubs) {
      for (const p of club.players) {
        if (p.rating > mvp.rating) {
          mvp = { name: `${p.firstName} ${p.lastName}`, rating: p.rating, team: club.name };
        }
      }
    }

    return { myPos, myStat, topScorer, topAssist, mvp, champion: standings[0] };
  }, [clubs, fixtures, team]);

  if (!team || !awards) return null;

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      <h1 className="text-base font-bold">{t("awards.title")}</h1>

      {/* Season awards */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={14} className="text-amber-400" />
          <span className="text-xs font-bold">{t("awards.season")} 2025–26</span>
        </div>

        {/* Champion */}
        <div className="space-y-2">
          <AwardRow
            icon={<Crown size={16} className="text-amber-400" />}
            label={t("awards.champion")}
            name={awards.champion?.teamName ?? "—"}
            sub={`${awards.champion?.points ?? 0} puan`}
            highlight={awards.myPos === 1}
          />
          <AwardRow
            icon={<Trophy size={16} className="text-emerald-400" />}
            label={t("awards.top_scorer")}
            name={awards.topScorer.name}
            sub={`${awards.topScorer.goals} gol · ${awards.topScorer.team}`}
          />
          <AwardRow
            icon={<Star size={16} className="text-sky-400" />}
            label={t("awards.top_assist")}
            name={awards.topAssist.name}
            sub={`${awards.topAssist.assists} asist · ${awards.topAssist.team}`}
          />
          <AwardRow
            icon={<Award size={16} className="text-purple-400" />}
            label={t("awards.mvp")}
            name={awards.mvp.name}
            sub={`OVR ${awards.mvp.rating} · ${awards.mvp.team}`}
          />
        </div>
      </div>

      {/* Your position */}
      <div className="tm-card p-3 text-center">
        <div className="text-[10px] uppercase text-muted-foreground mb-1">Senin Sıralaman</div>
        <div className="text-3xl font-bold tabular-nums">{awards.myPos}</div>
        <div className="text-[10px] text-muted-foreground">/ 18 takım</div>
        <div className="text-[11px] mt-1">
          {awards.myStat.won}G · {awards.myStat.drawn}B · {awards.myStat.lost}M · {awards.myStat.points}P
        </div>
      </div>

      {/* Legends Hall */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Star size={14} className="text-amber-400" />
          <span className="text-xs font-bold">{t("awards.legends")}</span>
        </div>
        <div className="text-[11px] text-muted-foreground text-center py-4">
          {t("awards.legends_empty")}
        </div>
      </div>
    </div>
  );
}

function AwardRow({
  icon,
  label,
  name,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 p-2 rounded-md",
      highlight ? "bg-amber-500/10 border border-amber-500/30" : "bg-muted/30"
    )}>
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="text-xs font-bold truncate">{name}</div>
      </div>
      <div className="text-[9px] text-muted-foreground text-right">{sub}</div>
    </div>
  );
}
