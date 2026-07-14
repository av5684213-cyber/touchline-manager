"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  Clock,
  Flame,
  Heart,
  ListChecks,
  MessageSquare,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { getInflationMultiplier, formatInflationLabel } from "@/lib/fm/inflation";
import { AchievementsCard, checkAchievements, AchievementToast, type Achievement } from "@/components/touchline/achievements";
import { MatchReplayModal } from "../match-replay-modal";
import type { SeasonSummary } from "@/lib/store";
import type { Player as PlayerT } from "@/lib/mock/data";
import { SeasonEndModal } from "../season-end-modal";
import { TeamDetailModal } from "../team-detail-modal";
import { TeamMessageModal } from "../team-message-modal";
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

export function DashboardScreen() {
  const { t, locale } = useI18n();
  const { clubs, fixtures } = useAppStore();
  const team = useMyTeam();

  const [notifs] = useState<Notification[]>(() => seedNotifications(clubs, team?.id ?? ""));
  const [target] = useState(() => nextMatchTarget());
  const [, force] = useState(0);
  const [seasonSummary, setSeasonSummary] = useState<SeasonSummary | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [profilePlayer, setProfilePlayer] = useState<PlayerT | null>(null);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [dashboardReplay, setDashboardReplay] = useState<any>(null);
  const [messageTeam, setMessageTeam] = useState<any>(null);

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

  // P0#5 FIX: Başarımları tetikle — fixtures/clubs değişince kontrol et
  useEffect(() => {
    if (!team || !myStat) return;
    // Son maç sonucunu bul
    const myRecentMatches = fixtures
      .filter((f) => f.played && (f.homeId === team.id || f.awayId === team.id))
      .sort((a, b) => b.matchday - a.matchday);
    if (myRecentMatches.length === 0) return;

    const lastMatch = myRecentMatches[0];
    const isHome = lastMatch.homeId === team.id;
    const myScore = isHome ? lastMatch.homeScore : lastMatch.awayScore;
    const oppScore = isHome ? lastMatch.awayScore : lastMatch.homeScore;
    const matchWon = (myScore ?? 0) > (oppScore ?? 0);
    const goalScored = (myScore ?? 0) > 0;

    // Galibiyet serisi
    let winStreak = 0;
    for (const f of myRecentMatches) {
      const isH = f.homeId === team.id;
      const us = isH ? f.homeScore : f.awayScore;
      const them = isH ? f.awayScore : f.homeScore;
      if ((us ?? 0) > (them ?? 0)) winStreak++;
      else break;
    }

    // En çok gol atan oyuncu
    const topScorer = [...team.players].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
    const topAssist = [...team.players].sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0))[0];

    // Temiz sayfa serisi (0 gol yeme)
    let cleanSheetStreak = 0;
    for (const f of myRecentMatches) {
      const isH = f.homeId === team.id;
      const conceded = isH ? f.awayScore : f.homeScore;
      if (conceded === 0) cleanSheetStreak++;
      else break;
    }

    // Transfer sayısı (haberlerden say)
    const transferNews = useAppStore.getState().news.filter(n => n.category === "transfer").length;

    const newlyUnlocked = checkAchievements({
      matchWon,
      goalScored,
      transferDone: transferNews > 0,
      topScorerGoals: topScorer?.goals ?? 0,
      topAssists: topAssist?.assists ?? 0,
      cleanSheetStreak,
      winStreak,
      leaguePosition: myStat.position,
      budget: team.budget,
      seasonsPlayed: useAppStore.getState().seasonNumber ?? 1,
    });

    if (newlyUnlocked.length > 0) {
      setNewAchievements(newlyUnlocked);
    }
  }, [fixtures, clubs, team, myStat]);

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
    [...team.players].sort((a, b) => b.rating - a.rating).slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11
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
            {/* Oynanmış son maç haftası — kullanıcının fikstüründen hesapla */}
            {(() => {
              const myPlayed = fixtures
                .filter((f: any) => f.played && (f.homeId === team?.id || f.awayId === team?.id))
                .sort((a: any, b: any) => b.matchday - a.matchday);
              const lastPlayed = myPlayed[0]?.matchday ?? 0;
              const nextToPlay = SEASON_INFO.matchday;
              // Eğer nextToPlay haftasının maçı oynanmadıysa, lastPlayed'i göster
              return lastPlayed > 0 && lastPlayed < nextToPlay
                ? `${lastPlayed}/${SEASON_INFO.totalMatchdays}`
                : `${nextToPlay}/${SEASON_INFO.totalMatchdays}`;
            })()}
          </div>
        </div>
      </div>

      {/* Enflasyon göstergesi */}
      <InflationIndicator />

      {/* Bildirimler — TALİMAT: en üstte */}
      <section>
        <SectionTitle icon={Bell} title={t("dash.notifications")} />
        <div className="tm-card divide-y divide-border">
          {notifs.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              {t("dash.notifications.empty")}
            </div>
          )}
          {notifs.slice(0, 5).map((n) => {
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

      {/* Mesajlar kutusu — TALİMAT: yeni kutu olarak eklendi */}
      <MessagesBox />

      {/* Hoşgeldin kartı */}
      <WelcomeBanner teamName={team.name} />

      {/* Galibiyet serisi göstergesi */}
      <StreakIndicator fixtures={fixtures} teamId={team?.id ?? ""} />

      {/* Sezon Hedefleri */}
      <SeasonGoals team={team} myStat={myStat} standings={standings} />

      {/* Günlük Görevler */}
      <DailyTasks />

      {/* Achievement Toast */}
      <AchievementToast achievements={newAchievements} onClose={() => setNewAchievements([])} />

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
              <div key={f.id} className="flex items-center gap-2 p-2.5">
                <div className="text-[9px] w-5 text-center font-bold text-muted-foreground shrink-0">
                  {f.matchday}
                </div>
                <span
                  className={cn(
                    "text-[8px] px-1 py-0.5 rounded font-bold shrink-0",
                    isHome ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                  )}
                >
                  {isHome ? "Ev" : "Dep"}
                </span>
                <span className="text-[10px] font-semibold truncate shrink-0 max-w-[70px]">{team.name}</span>
                <span className="text-[9px] text-muted-foreground shrink-0">vs</span>
                {opp && (
                  <button
                    onClick={() => { haptic("light"); setSelectedTeamId(opp.id); }}
                    className="text-[10px] font-semibold truncate hover:text-primary shrink-0 max-w-[70px]"
                  >
                    {opp.name}
                  </button>
                )}
                <button
                  onClick={() => { haptic("light"); setDashboardReplay(f); }}
                  className="tm-tap shrink-0 ml-auto"
                  title="Maçı izle"
                >
                  <ResultBadge outcome={outcome} score={`${us}-${them}`} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Next match — FM/CM mantığı: gerçek saat yok, hafta bilgisi + Maçı Oyna */}
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
                  Hafta
                </div>
                <div className="text-lg font-bold tabular-nums">
                  {next.matchday}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  / {SEASON_INFO.totalMatchdays}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 flex-1">
                <button
                  onClick={() => { haptic("light"); setSelectedTeamId(opponent.id); }}
                  className="tm-tap"
                >
                  <ClubBadge short={opponent.shortName} primaryColor={opponent.primaryColor} size={44} />
                </button>
                <button
                  onClick={() => { haptic("light"); setSelectedTeamId(opponent.id); }}
                  className="text-[11px] font-semibold truncate max-w-[100px] hover:text-primary"
                >
                  {opponent.name}
                </button>
                <span className="text-[9px] text-muted-foreground">
                  {next.awayId === opponent.id ? t("dash.away") : t("dash.home")}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Rozetler — TALİMAT: en alta taşındı */}
      <AchievementsCard />

      {/* Advance matchday button — kullanıcının maçını + bot maçlarını oynar + haftayı ilerletir */}
      {!allPlayed && (
        <button
          onClick={() => {
            haptic("medium");
            useAppStore.getState().advanceMatchday();
          }}
          className="tm-tap w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2"
        >
          <ChevronRight size={16} /> Turu İlerlet
        </button>
      )}

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
            onMessage={(t) => { setSelectedTeamId(null); setMessageTeam(t); }}
          />
        );
      })()}

      {/* P0 FIX: Team message modal — dashboard'tan takım mesajı gönder */}
      {messageTeam && team && (
        <TeamMessageModal team={messageTeam} myTeam={team} onClose={() => setMessageTeam(null)} />
      )}

      {/* Player profile modal */}
      {profilePlayer && team && (
        <PlayerProfileModal
          player={profilePlayer}
          teamColor={team.primaryColor}
          onClose={() => setProfilePlayer(null)}
        />
      )}

      {/* Dashboard maç izleme modal'ı */}
      {dashboardReplay && (() => {
        const home = clubs.find((c) => c.id === dashboardReplay.homeId);
        const away = clubs.find((c) => c.id === dashboardReplay.awayId);
        if (!home || !away) return null;
        return (
          <MatchReplayModal
            homeTeam={home}
            awayTeam={away}
            homeScore={dashboardReplay.homeScore ?? 0}
            awayScore={dashboardReplay.awayScore ?? 0}
            matchday={dashboardReplay.matchday}
            onClose={() => setDashboardReplay(null)}
          />
        );
      })()}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  action,
  onAction,
}: {
  icon: typeof Trophy;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-muted-foreground" />
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      {action && onAction && (
        <button
          onClick={() => { haptic("light"); onAction(); }}
          className="tm-tap text-[11px] text-primary font-semibold flex items-center gap-0.5"
        >
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

function InflationIndicator() {
  const seasonNumber = useAppStore((s) => s.seasonNumber) ?? 1;
  const mult = getInflationMultiplier(seasonNumber);
  const pct = Math.round((mult - 1) * 100);

  // Sezon 1'de göstermeye gerek yok
  if (seasonNumber <= 1) return null;

  return (
    <div className="tm-card p-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-base">📈</span>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
            Sezon {seasonNumber} Enflasyonu
          </div>
          <div className="text-[9px] text-muted-foreground">
            Piyasa değerleri, maaşlar ve maliyetler buna göre
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-yellow-400 tabular-nums">
          +%{pct}
        </div>
        <div className="text-[8px] text-muted-foreground uppercase">
          ×{mult.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

// ===== Sezon Hedefleri =====
function SeasonGoals({ team, myStat, standings }: { team: any; myStat: any; standings: any[] }) {
  const pos = standings.findIndex((s) => s.teamId === team?.id);
  const tier = team?.leagueTier ?? 2;
  const matchday = SEASON_INFO.matchday;
  const totalMatchdays = SEASON_INFO.totalMatchdays;

  // Hedefler lig tier'ına göre belirlenir
  const goals = [
    {
      icon: "🏆",
      label: "Lig Sıralaması",
      target: tier === 1 ? "İlk 4" : tier === 2 ? "İlk 2 (Yükselme)" : "İlk 2 (Yükselme)",
      current: pos >= 0 ? `${pos + 1}. sırada` : "—",
      status: pos >= 0 && pos < 2 ? "done" : pos >= 0 && pos < 4 ? "close" : "far",
    },
    {
      icon: "⚽",
      label: "Gol Krallığı",
      target: "Ligde en çok gol",
      current: `${myStat?.goalsFor ?? 0} gol`,
      status: "progress",
    },
    {
      icon: "💰",
      label: "Bütçe Yönetimi",
      target: `${formatEuro(team?.budget ?? 0, "tr")} bütçe`,
      current: formatEuro(team?.budget ?? 0, "tr"),
      status: (team?.budget ?? 0) > 0 ? "done" : "far",
    },
    {
      icon: "📊",
      label: "Sezon İlerlemesi",
      target: `${totalMatchdays} hafta`,
      current: `${matchday}/${totalMatchdays} hafta`,
      status: matchday >= totalMatchdays ? "done" : "progress",
    },
  ];

  const statusColor: Record<string, string> = {
    done: "text-emerald-400",
    close: "text-amber-400",
    far: "text-red-400",
    progress: "text-sky-400",
  };
  const statusIcon: Record<string, string> = {
    done: "✓",
    close: "↗",
    far: "✗",
    progress: "→",
  };

  return (
    <div className="tm-card p-3">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold mb-2">Sezon Hedefleri</div>
      <div className="space-y-1.5">
        {goals.map((g, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="text-base shrink-0">{g.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{g.label}</div>
              <div className="text-[9px] text-muted-foreground">{g.target}</div>
            </div>
            <div className="text-right shrink-0">
              <div className={cn("font-bold text-[10px]", statusColor[g.status])}>
                {statusIcon[g.status]} {g.current}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Günlük Görevler =====
function DailyTasks() {
  const today = new Date().toISOString().slice(0, 10);
  const store = useAppStore();
  const team = useMyTeam();

  // Görev durumunu localStorage'dan basit takip
  const [tasks, setTasks] = useState(() => {
    if (typeof window === "undefined") return [];
    const key = `tm_tasks_${today}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    // Yeni gün — görevleri sıfırla
    const fresh = [
      { id: "train", icon: "🏋️", label: "1 antrenman yap", reward: "+5 moral", done: false },
      { id: "tactics", icon: "📋", label: "Taktik düzenle", reward: "+3 kondisyon", done: false },
      { id: "transfer", icon: "💰", label: "Transfer/teklif yap", reward: "+10K €", done: false },
      { id: "match", icon: "⚽", label: "Maçını izle", reward: "+5 form", done: false },
    ];
    localStorage.setItem(key, JSON.stringify(fresh));
    return fresh;
  });

  const toggleTask = (id: string) => {
    const task = tasks.find((t: any) => t.id === id);
    // P0 FIX: Done görev geri alınamaz — exploit önle (tekrar yapıp ödül tekrar alma)
    if (!task || task.done) return;

    // Ödül uygula (sadece ilk geçişte)
    haptic("success");
    if (team && store) {
      const state = useAppStore.getState();
      const clubs = [...state.clubs];
      const myClub = clubs.find((c) => c.id === team.id);
      if (myClub) {
        if (id === "train") {
          // +5 moral tüm oyunculara
          myClub.players = myClub.players.map((p) => ({ ...p, morale: Math.min(100, p.morale + 5) }));
        } else if (id === "tactics") {
          // +3 kondisyon tüm oyunculara
          myClub.players = myClub.players.map((p) => ({ ...p, cond: Math.min(100, p.cond + 3), condition: Math.min(100, (p.condition ?? p.cond) + 3) }));
        } else if (id === "transfer") {
          // +10K € bütçeye
          myClub.budget += 10_000;
        } else if (id === "match") {
          // +5 form tüm oyunculara
          myClub.players = myClub.players.map((p) => ({ ...p, form: Math.min(100, p.form + 5) }));
        }
        useAppStore.setState({ clubs });
      }
    }

    const updated = tasks.map((t: any) => t.id === id ? { ...t, done: true } : t);
    setTasks(updated);
    localStorage.setItem(`tm_tasks_${today}`, JSON.stringify(updated));
  };

  const completedCount = tasks.filter((t: any) => t.done).length;
  const allDone = completedCount === tasks.length;

  return (
    <div className="tm-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">Günlük Görevler</div>
        <div className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded",
          allDone ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"
        )}>
          {completedCount}/{tasks.length}
        </div>
      </div>
      <div className="space-y-1">
        {tasks.map((task: any) => (
          <button
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={cn(
              "tm-tap w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors",
              task.done ? "bg-emerald-500/10" : "hover:bg-accent/50"
            )}
          >
            <span className={cn(
              "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
              task.done ? "bg-emerald-500 border-emerald-500" : "border-border"
            )}>
              {task.done && <span className="text-[8px] text-white">✓</span>}
            </span>
            <span className="text-base shrink-0">{task.icon}</span>
            <span className={cn("flex-1 text-[11px] font-medium", task.done && "line-through text-muted-foreground")}>
              {task.label}
            </span>
            <span className="text-[9px] text-amber-400 font-bold shrink-0">{task.reward}</span>
          </button>
        ))}
      </div>
      {allDone && (
        <div className="mt-2 pt-2 border-t border-border text-center text-[10px] font-bold text-emerald-400">
          🎉 Tüm görevler tamam! Yarın yenilenecek.
        </div>
      )}
    </div>
  );
}

// ===== Galibiyet Serisi Göstergesi =====
function StreakIndicator({ fixtures, teamId }: { fixtures: any[]; teamId: string }) {
  const recent = fixtures
    .filter((f) => f.played && (f.homeId === teamId || f.awayId === teamId))
    .sort((a, b) => b.matchday - a.matchday)
    .slice(0, 5);

  if (recent.length === 0) return null;

  const results = recent.map((f) => {
    const isHome = f.homeId === teamId;
    const us = isHome ? f.homeScore : f.awayScore;
    const them = isHome ? f.awayScore : f.homeScore;
    return (us ?? 0) > (them ?? 0) ? "W" : (us ?? 0) < (them ?? 0) ? "L" : "D";
  }).reverse();

  // Mevcut seri
  let streak = 0;
  let streakType = results[results.length - 1] ?? "D";
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i] === streakType) streak++;
    else break;
  }

  const isWinStreak = streakType === "W";
  const isLoseStreak = streakType === "L";

  if (streak < 2) return null;

  return (
    <div className={cn(
      "tm-card p-2.5 flex items-center gap-3",
      isWinStreak && "bg-emerald-500/10 border-emerald-500/30",
      isLoseStreak && "bg-red-500/10 border-red-500/30",
    )}>
      <span className="text-2xl">{isWinStreak ? "🔥" : isLoseStreak ? "❄️" : "➖"}</span>
      <div className="flex-1">
        <div className={cn(
          "text-sm font-bold",
          isWinStreak ? "text-emerald-400" : isLoseStreak ? "text-red-400" : "text-amber-400"
        )}>
          {isWinStreak ? `${streak} maçlık galibiyet serisi!` : isLoseStreak ? `${streak} maçlık mağlubiyet serisi` : `${streak} beraberlik`}
        </div>
        <div className="text-[9px] text-muted-foreground">
          {isWinStreak && streak >= 3 ? "Takım morali yüksek! 📈" : isLoseStreak && streak >= 3 ? "Takım morali düşük ⚠️" : "Son 5 maç"}
        </div>
      </div>
      <div className="flex gap-0.5">
        {results.map((r, i) => (
          <span key={i} className={cn(
            "inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold",
            r === "W" ? "bg-emerald-500 text-white" : r === "L" ? "bg-red-500 text-white" : "bg-amber-400 text-amber-900"
          )}>
            {r === "W" ? "G" : r === "L" ? "M" : "B"}
          </span>
        ))}
      </div>
    </div>
  );
}

// ===== Bilgi rozeti (i ikonu) =====
function InfoBadge({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        className="tm-tap w-3.5 h-3.5 rounded-full bg-muted text-muted-foreground text-[8px] font-bold flex items-center justify-center"
      >
        i
      </button>
      {show && (
        <span
          className="absolute top-5 left-1/2 -translate-x-1/2 z-50 w-40 p-2 rounded-lg bg-popover border border-border text-[9px] text-foreground shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {text}
          <button onClick={() => setShow(false)} className="block mt-1 text-[8px] text-muted-foreground">kapat</button>
        </span>
      )}
    </span>
  );
}

// ===== Tanıtıcı hoşgeldin kartı =====
function WelcomeBanner({ teamName }: { teamName: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="tm-card p-3 bg-gradient-to-r from-emerald-500/10 to-sky-500/10 border-emerald-500/20">
      <div className="flex items-start gap-2">
        <span className="text-2xl">⚽</span>
        <div className="flex-1">
          <div className="text-xs font-bold mb-1">Hoş geldin, {teamName} menajeri!</div>
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            Hafta içi 12:00 ve 18:00'de maçlar oynanır. Taktik kur, antrenman yap, transfer gerçekleştir ve lige hükmet!
            Skorlara tıklayarak maçları tekrar izleyebilirsin.
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="tm-tap text-muted-foreground text-xs">✕</button>
      </div>
    </div>
  );
}

// Mesajlar kutusu — TALİMAT: Dashboard'a yeni kutu olarak eklendi
function MessagesBox() {
  const { t } = useI18n();
  const transfer = useAppStore((s) => s.transfer);
  const messages = transfer.messages ?? [];
  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <section>
      <SectionTitle icon={MessageSquare} title={`Mesajlar${unreadCount > 0 ? ` (${unreadCount} yeni)` : ""}`} />
      <div className="tm-card divide-y divide-border">
        {messages.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            Yeni mesaj yok.
          </div>
        ) : (
          messages.slice(0, 3).map((m) => (
            <div key={m.id} className={cn("p-3 flex items-start gap-2", !m.read && "bg-primary/5")}>
              <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", m.read ? "bg-transparent" : "bg-primary")} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{m.fromTeamName ?? "Mesaj"}</div>
                <div className="text-[10px] text-muted-foreground truncate">{m.message ?? ""}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
