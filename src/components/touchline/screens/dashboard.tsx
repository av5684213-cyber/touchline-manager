"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  Clock,
  Flame,
  Heart,
  ListChecks,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import {
  computeStandings,
  myNextMatch,
  myRecentMatches,
  myStanding,
  nextMatchTarget,
  SEASON_INFO,
  seedNotifications,
  type Notification,
} from "@/lib/mock/season";
import { ClubBadge, ResultBadge } from "../ui-bits";
import { countdownParts, formatEuro, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "flat";
  icon: typeof Trophy;
}) {
  return (
    <div className="tm-card p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[11px] uppercase tracking-wide font-semibold">
          {label}
        </span>
        <Icon size={14} />
      </div>
      <div className="text-xl font-bold tabular-nums leading-tight">{value}</div>
      {sub && (
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          {trend === "up" && <TrendingUp size={11} className="text-emerald-600" />}
          {trend === "down" && <TrendingUp size={11} className="text-red-500 rotate-180" />}
          {sub}
        </div>
      )}
    </div>
  );
}

export function DashboardScreen() {
  const { t, locale } = useI18n();
  const { clubs, fixtures } = useAppStore();
  const team = useMyTeam();

  const [notifs] = useState<Notification[]>(() => seedNotifications());
  const [target] = useState(() => nextMatchTarget());
  const [, force] = useState(0);

  // Geri sayım her dakika güncelle
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const standings = useMemo(() => computeStandings(clubs, fixtures), [clubs, fixtures]);
  const myStat = useMemo(() => {
    if (!team) return null;
    return myStanding(standings, team.id);
  }, [standings, team]);

  const recent = useMemo(() => {
    if (!team) return [];
    return myRecentMatches(fixtures, team.id, 4);
  }, [fixtures, team]);

  const next = useMemo(() => {
    if (!team) return null;
    return myNextMatch(fixtures, team.id);
  }, [fixtures, team]);

  if (!team || !myStat) return null;

  const teamQuality = Math.round(
    team.players.sort((a, b) => b.rating - a.rating).slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11
  );
  const goalsScored = recent.reduce(
    (s, f) =>
      s +
      (f.homeId === team.id ? (f.homeScore ?? 0) : (f.awayScore ?? 0)),
    0
  );
  const moraleAvg = Math.round(
    team.players.reduce((s, p) => s + p.morale, 0) / team.players.length
  );
  const moraleLabel =
    moraleAvg >= 80 ? t("dash.morale.great")
    : moraleAvg >= 65 ? t("dash.morale.good")
    : moraleAvg >= 45 ? t("dash.morale.ok")
    : t("dash.morale.bad");

  const opponent = next
    ? clubs.find((c) => c.id === (next.homeId === team.id ? next.awayId : next.homeId))
    : null;

  return (
    <div className="px-4 py-4 space-y-4 pb-6">
      {/* Team summary compact row */}
      <div className="tm-card p-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            {t("dash.squad_size")}
          </div>
          <div className="text-base font-bold tabular-nums">
            {team.players.length}{" "}
            <span className="text-[10px] font-normal text-muted-foreground">
              {t("dash.players")}
            </span>
          </div>
        </div>
        <div className="border-x border-border">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            {t("dash.squad_quality")}
          </div>
          <div className="text-base font-bold tabular-nums">{teamQuality}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            {t("dash.season_day")}
          </div>
          <div className="text-base font-bold tabular-nums">
            {SEASON_INFO.matchday}/{SEASON_INFO.totalMatchdays}
          </div>
        </div>
      </div>

      {/* 2x2 stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t("dash.points")}
          value={String(myStat.points)}
          sub={`${myStat.position}. ${t("dash.position")}`}
          icon={Trophy}
          trend="up"
        />
        <StatCard
          label={t("dash.winloss")}
          value={`${myStat.won}-${myStat.lost}`}
          sub={`${myStat.drawn} ${t("dash.draws")}`}
          icon={ListChecks}
          trend="flat"
        />
        <StatCard
          label={t("dash.goals_scored")}
          value={String(myStat.goalsFor)}
          sub={`${(myStat.goalsFor / Math.max(1, myStat.played)).toFixed(2)} ${t("common.per_match")}`}
          icon={Flame}
          trend="up"
        />
        <StatCard
          label={t("dash.morale")}
          value={moraleLabel}
          sub={`${moraleAvg}/100 · ${t("common.last_3")} ↑`}
          icon={Heart}
          trend="up"
        />
      </div>

      {/* Recent matches */}
      <section>
        <SectionTitle icon={ListChecks} title={t("dash.recent")} />
        <div className="tm-card divide-y divide-border">
          {recent.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              {t("dash.recent")} —
            </div>
          )}
          {recent.map((f) => {
            const isHome = f.homeId === team.id;
            const us = isHome ? f.homeScore : f.awayScore;
            const them = isHome ? f.awayScore : f.homeScore;
            const oppId = isHome ? f.awayId : f.homeId;
            const opp = clubs.find((c) => c.id === oppId);
            const outcome: "win" | "draw" | "loss" =
              (us ?? 0) > (them ?? 0) ? "win" : (us ?? 0) < (them ?? 0) ? "loss" : "draw";
            return (
              <div key={f.id} className="flex items-center gap-2 p-3">
                <div className="text-[10px] w-6 text-center font-bold text-muted-foreground">
                  {f.matchday}
                </div>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                    isHome ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                  )}
                >
                  {isHome ? t("dash.home").charAt(0) : t("dash.away").charAt(0)}
                </span>
                <ClubBadge short={team.shortName} primaryColor={team.primaryColor} size={24} />
                <span className="text-[10px] text-muted-foreground">{t("dash.vs")}</span>
                {opp && (
                  <ClubBadge short={opp.shortName} primaryColor={opp.primaryColor} size={24} />
                )}
                <div className="flex-1 truncate text-xs font-medium">
                  {opp?.name ?? "—"}
                </div>
                <ResultBadge outcome={outcome} score={`${us}-${them}`} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Next match countdown */}
      {next && opponent && (
        <section>
          <SectionTitle icon={Clock} title={t("dash.next_match")} />
          <div className="tm-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col items-center gap-1 flex-1">
                <ClubBadge short={team.shortName} primaryColor={team.primaryColor} size={44} />
                <span className="text-[11px] font-semibold truncate max-w-[100px]">
                  {team.name}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {next.homeId === team.id ? t("dash.home") : t("dash.away")}
                </span>
              </div>
              <div className="px-2 text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {t("dash.kickoff_in")}
                </div>
                <div className="text-lg font-bold tabular-nums">
                  {countdownParts(target, locale)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(target)}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 flex-1">
                <ClubBadge short={opponent.shortName} primaryColor={opponent.primaryColor} size={44} />
                <span className="text-[11px] font-semibold truncate max-w-[100px]">
                  {opponent.name}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {next.awayId === opponent.id ? t("dash.away") : t("dash.home")}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Notifications */}
      <section>
        <SectionTitle icon={Bell} title={t("dash.notifications")} />
        <div className="tm-card divide-y divide-border">
          {notifs.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              {t("dash.notifications.empty")}
            </div>
          )}
          {notifs.map((n) => (
            <div key={n.id} className="flex items-start gap-3 p-3">
              <NotifIcon kind={n.kind} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{n.title[locale]}</div>
                <div className="text-xs text-muted-foreground">{n.body[locale]}</div>
              </div>
              <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                {relativeTime(n.at, locale)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof Trophy;
  title: string;
  action?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-muted-foreground" />
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      {action && (
        <button className="tm-tap text-[11px] text-primary font-semibold flex items-center gap-0.5">
          {action} <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

function NotifIcon({ kind }: { kind: Notification["kind"] }) {
  const map = {
    injury: { Icon: Heart, c: "bg-red-100 text-red-600" },
    result: { Icon: Trophy, c: "bg-emerald-100 text-emerald-700" },
    transfer: { Icon: ChevronRight, c: "bg-sky-100 text-sky-700" },
    training: { Icon: Users, c: "bg-amber-100 text-amber-700" },
  }[kind];
  const { Icon, c } = map;
  return (
    <span className={cn("inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0", c)}>
      <Icon size={14} />
    </span>
  );
}
