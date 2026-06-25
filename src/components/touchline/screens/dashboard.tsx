"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Calendar,
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
import { useAppStore, useMyTeam, useSeasonMatchday, getTodaySchedule, getCompetitionIcon, getCompetitionLabel, getMinutesToNextMatch, formatCountdown } from "@/lib/store";
import type { SeasonSummary } from "@/lib/store";
import type { Player as PlayerT } from "@/lib/mock/data";
import { SeasonEndModal } from "../season-end-modal";
import { TeamDetailModal } from "../team-detail-modal";
import { PlayerProfileModal } from "../player-profile-modal";
import { haptic } from "@/hooks/touchline";
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

export function DashboardScreen({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { t, locale } = useI18n();
  const { clubs, fixtures } = useAppStore();
  const team = useMyTeam();
  const seasonMatchday = useSeasonMatchday();

  const [notifs] = useState<Notification[]>(() => seedNotifications(clubs, team?.id ?? ""));
  const [target] = useState(() => nextMatchTarget());
  const [, force] = useState(0);
  const [seasonSummary, setSeasonSummary] = useState<SeasonSummary | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [profilePlayer, setProfilePlayer] = useState<PlayerT | null>(null);

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

  // Tüm fikstür oynandı mı?
  const allPlayed = useMemo(() => {
    if (!team) return false;
    const myFixtures = fixtures.filter((f) => f.homeId === team.id || f.awayId === team.id);
    return myFixtures.length > 0 && myFixtures.every((f) => f.played);
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
      {/* Team summary — tıklanabilir kadro */}
      <button
        onClick={() => { haptic("light"); onNavigate?.("tactics"); }}
        className="tm-tap tm-card p-3 w-full text-left"
      >
        <div className="flex items-center gap-3 mb-2">
          <ClubBadge short={team.shortName} primaryColor={team.primaryColor} size={40} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{team.name}</div>
            <div className="text-[10px] text-muted-foreground">{team.players.length} oyuncu · OVR {teamQuality}</div>
          </div>
          <Users size={16} className="text-muted-foreground" />
        </div>
      </button>

      {/* G-B-M stat cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="tm-card p-2.5 text-center">
          <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">G</div>
          <div className="text-xl font-bold tabular-nums text-emerald-400">{myStat.won}</div>
          <div className="text-[8px] text-muted-foreground">Galibiyet</div>
        </div>
        <div className="tm-card p-2.5 text-center">
          <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">B</div>
          <div className="text-xl font-bold tabular-nums text-amber-400">{myStat.drawn}</div>
          <div className="text-[8px] text-muted-foreground">Beraberlik</div>
        </div>
        <div className="tm-card p-2.5 text-center">
          <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">M</div>
          <div className="text-xl font-bold tabular-nums text-red-400">{myStat.lost}</div>
          <div className="text-[8px] text-muted-foreground">Mağlubiyet</div>
        </div>
      </div>

      {/* Ek istatistikler */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t("dash.points")}
          value={String(myStat.points)}
          sub={`${myStat.position}. ${t("dash.position")}`}
          icon={Trophy}
          trend="up"
        />
        <StatCard
          label={t("dash.goals_scored")}
          value={String(myStat.goalsFor)}
          sub={`${(myStat.goalsFor / Math.max(1, myStat.played)).toFixed(2)} ${t("common.per_match")}`}
          icon={Flame}
          trend="up"
        />
      </div>

      {/* Maç Programı — fikstüre yönlendir */}
      <button
        onClick={() => { haptic("light"); onNavigate?.("fixture"); }}
        className="tm-tap tm-card p-3 w-full text-left flex items-center gap-3"
      >
        <Calendar size={18} className="text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold">Maç Programı</div>
          <div className="text-[10px] text-muted-foreground">
            {seasonMatchday}/{SEASON_INFO.totalMatchdays} hafta · {myStat.played} oynandı
          </div>
        </div>
        <ChevronRight size={14} className="text-muted-foreground shrink-0" />
      </button>

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
                  <button
                    onClick={() => { haptic("light"); setSelectedTeamId(opp.id); }}
                    className="tm-tap shrink-0"
                  >
                    <ClubBadge short={opp.shortName} primaryColor={opp.primaryColor} size={24} />
                  </button>
                )}
                <button
                  onClick={() => { if (opp) { haptic("light"); setSelectedTeamId(opp.id); } }}
                  className="flex-1 truncate text-xs font-medium text-left hover:text-primary"
                >
                  {opp?.name ?? "—"}
                </button>
                <ResultBadge outcome={outcome} score={`${us}-${them}`} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Next match countdown — tam takım isimleri */}
      {next && opponent && (
        <section>
          <SectionTitle icon={Clock} title={t("dash.next_match")} />
          <div className="tm-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <ClubBadge short={team.shortName} primaryColor={team.primaryColor} size={44} />
                <span className="text-[10px] font-semibold truncate max-w-[90px] text-center">
                  {team.name}
                </span>
                <span className="text-[8px] text-muted-foreground">
                  {next.homeId === team.id ? t("dash.home") : t("dash.away")}
                </span>
              </div>
              <div className="px-2 text-center shrink-0">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {t("dash.kickoff_in")}
                </div>
                <div className="text-base font-bold tabular-nums text-primary">
                  {(() => {
                    const slot = getMinutesToNextMatch();
                    return slot ? formatCountdown(slot.minutes) : "—";
                  })()}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">
                  {next.matchday}. hafta
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <button
                  onClick={() => { haptic("light"); setSelectedTeamId(opponent.id); }}
                  className="tm-tap"
                >
                  <ClubBadge short={opponent.shortName} primaryColor={opponent.primaryColor} size={44} />
                </button>
                <button
                  onClick={() => { haptic("light"); setSelectedTeamId(opponent.id); }}
                  className="text-[10px] font-semibold truncate max-w-[90px] text-center hover:text-primary"
                >
                  {opponent.name}
                </button>
                <span className="text-[8px] text-muted-foreground">
                  {next.awayId === opponent.id ? t("dash.away") : t("dash.home")}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Bildirimler + Performans özeti */}
      <section>
        <SectionTitle icon={Bell} title={t("dash.notifications")} />

        {/* Son maçın en iyi oyuncusu */}
        {(() => {
          const lastMatch = fixtures
            .filter((f) => f.played && (f.homeId === team.id || f.awayId === team.id))
            .sort((a, b) => b.matchday - a.matchday)[0];
          if (!lastMatch) return null;

          const isHome = lastMatch.homeId === team.id;
          const myScore = isHome ? lastMatch.homeScore : lastMatch.awayScore;
          const oppScore = isHome ? lastMatch.awayScore : lastMatch.homeScore;
          const result = (myScore ?? 0) > (oppScore ?? 0) ? "GALİBİYET" : (myScore ?? 0) < (oppScore ?? 0) ? "MAĞLUBİYET" : "BERABERLİK";
          const opp = clubs.find((c) => c.id === (isHome ? lastMatch.awayId : lastMatch.homeId));
          const topScorer = [...team.players].sort((a, b) => b.goals - a.goals)[0];
          const topRated = [...team.players].filter(p => p.last_match_rating)
            .sort((a, b) => (b.last_match_rating ?? 0) - (a.last_match_rating ?? 0))[0];

          return (
            <div className="tm-card p-3 mb-2 border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "tm-chip",
                  result === "GALİBİYET" ? "bg-emerald-500/20 text-emerald-300" :
                  result === "MAĞLUBİYET" ? "bg-red-500/20 text-red-300" :
                  "bg-amber-500/20 text-amber-300"
                )}>
                  {result} {myScore}-{oppScore}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  vs {opp?.name ?? "—"}
                </span>
              </div>
              {/* En iyi performans */}
              {topRated && (
                <div className="flex items-center gap-2 p-1.5 rounded-md bg-muted/30">
                  <span className="text-sm">⭐</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold truncate">Maçın Yıldızı: {topRated.firstName} {topRated.lastName}</div>
                    <div className="text-[9px] text-muted-foreground">
                      {topRated.specificPosition} · Puan {(topRated.last_match_rating ?? 6.5).toFixed(1)}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold tabular-nums text-amber-300">
                    {(topRated.last_match_rating ?? 6.5).toFixed(1)}
                  </span>
                </div>
              )}
              {/* Gol krallığı */}
              {topScorer && topScorer.goals > 0 && (
                <div className="flex items-center gap-2 p-1.5 rounded-md bg-muted/30 mt-1">
                  <span className="text-sm">⚽</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold truncate">Gol Kralı: {topScorer.firstName} {topScorer.lastName}</div>
                    <div className="text-[9px] text-muted-foreground">{topScorer.goals} gol · {topScorer.assists} asist</div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Dinamik bildirimler */}
        <div className="tm-card divide-y divide-border">
          {notifs.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              {t("dash.notifications.empty")}
            </div>
          )}
          {notifs.map((n) => {
            const notifTeam = n.teamId ? clubs.find((c) => c.id === n.teamId) : null;
            const notifPlayer = n.playerId ? team?.players.find((p) => p.id === n.playerId) : null;
            return (
              <button
                key={n.id}
                onClick={() => {
                  haptic("light");
                  if (notifPlayer) setProfilePlayer(notifPlayer);
                  else if (notifTeam) setSelectedTeamId(notifTeam.id);
                }}
                className="tm-tap w-full flex items-start gap-3 p-3 text-left hover:bg-accent/50 transition-colors"
              >
                <NotifIcon kind={n.kind} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{n.title[locale]}</div>
                  <div className="text-xs text-muted-foreground">{n.body[locale]}</div>
                </div>
                <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {relativeTime(n.at, locale)}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Season end button — tüm maçlar oynandığında */}
      {allPlayed && (
        <button
          onClick={() => {
            const result = useAppStore.getState().endSeason();
            if (result.success && result.summary) {
              setSeasonSummary(result.summary);
            }
          }}
          className="tm-tap w-full py-3 rounded-lg bg-amber-600 text-white text-sm font-bold flex items-center justify-center gap-2"
        >
          <Trophy size={16} /> Sezonu Bitir
        </button>
      )}

      {/* Season end modal */}
      {seasonSummary && (
        <SeasonEndModal
          summary={seasonSummary}
          onClose={() => setSeasonSummary(null)}
        />
      )}

      {/* Team detail modal */}
      {selectedTeamId && team && (() => {
        const selected = clubs.find((c) => c.id === selectedTeamId);
        if (!selected) return null;
        return (
          <TeamDetailModal
            team={selected}
            isMyTeam={selected.id === team.id}
            onClose={() => setSelectedTeamId(null)}
            onMessage={() => {}}
          />
        );
      })()}

      {/* Player profile modal */}
      {profilePlayer && team && (
        <PlayerProfileModal
          player={profilePlayer}
          teamColor={team.primaryColor}
          onClose={() => setProfilePlayer(null)}
        />
      )}
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
