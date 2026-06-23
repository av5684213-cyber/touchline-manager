"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  ChevronDown,
  CloudRain,
  CloudSun,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Sun,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { useMatchEngine } from "@/hooks/use-match-engine";
import {
  FORMATION_KEYS,
  POSITION_GROUP,
  type Player as PlayerT,
} from "@/lib/mock/data";
import type {
  EnhancedMatchEvent as MatchEvent,
} from "@/lib/match/engine";
import type { LiveMatchState } from "@/hooks/use-match-engine";

type MatchState = LiveMatchState;
type MatchTactics = {
  formation: string;
  pressing: number;
  defensiveLine: number;
  tempo: number;
  width: number;
};
type Side = "home" | "away" | "neutral";
type HomeAway = "home" | "away";
import { ClubBadge, PositionPill, RatingBadge } from "../ui-bits";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import { PreMatchScreen } from "../pre-match-screen";

export function MatchScreen() {
  const { t, locale } = useI18n();
  const team = useMyTeam();
  const { clubs, fixtures } = useAppStore();

  // Rakip seçimi — bir sonraki oynanmamış maç
  const opponent = useMemo(() => {
    if (!team) return null;
    const next = clubs.find(
      (c) =>
        c.id !== team.id &&
        fixtures.some(
          (f) =>
            !f.played &&
            ((f.homeId === team.id && f.awayId === c.id) ||
              (f.awayId === team.id && f.homeId === c.id))
        )
    );
    return next ?? clubs.find((c) => c.id !== team.id) ?? null;
  }, [team, clubs, fixtures]);

  // Ev/deplasman yerleşimi: kullanıcının sonraki maçındaki yerine göre
  const { homeTeam, awayTeam, mySide } = useMemo(() => {
    if (!team || !opponent) {
      return { homeTeam: team, awayTeam: opponent, mySide: "home" as Side };
    }
    const nextFx = fixtures.find(
      (f) =>
        !f.played &&
        ((f.homeId === team.id && f.awayId === opponent.id) ||
          (f.awayId === team.id && f.homeId === opponent.id))
    );
    const mySide: Side = nextFx?.homeId === team.id ? "home" : "away";
    return {
      homeTeam: mySide === "home" ? team : opponent,
      awayTeam: mySide === "home" ? opponent : team,
      mySide,
    };
  }, [team, opponent, fixtures]);

  const engine = useMatchEngine(
    homeTeam ?? team!,
    awayTeam ?? opponent!,
    locale
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPreMatch, setShowPreMatch] = useState(false);

  if (!team || !opponent || !homeTeam || !awayTeam) {
    return (
      <div className="px-4 py-16 text-center text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  // Maç öncesi ekran
  if (showPreMatch) {
    const homeRecent = fixtures
      .filter((f) => f.played && (f.homeId === homeTeam.id || f.awayId === homeTeam.id))
      .sort((a, b) => b.matchday - a.matchday)
      .slice(0, 5)
      .map((f) => {
        const isHome = f.homeId === homeTeam.id;
        const us = isHome ? f.homeScore : f.awayScore;
        const them = isHome ? f.awayScore : f.homeScore;
        return (us ?? 0) > (them ?? 0) ? "W" as const : (us ?? 0) < (them ?? 0) ? "L" as const : "D" as const;
      });
    const awayRecent = fixtures
      .filter((f) => f.played && (f.homeId === awayTeam.id || f.awayId === awayTeam.id))
      .sort((a, b) => b.matchday - a.matchday)
      .slice(0, 5)
      .map((f) => {
        const isHome = f.homeId === awayTeam.id;
        const us = isHome ? f.homeScore : f.awayScore;
        const them = isHome ? f.awayScore : f.homeScore;
        return (us ?? 0) > (them ?? 0) ? "W" as const : (us ?? 0) < (them ?? 0) ? "L" as const : "D" as const;
      });

    return (
      <PreMatchScreen
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        weather={engine.state.weather || "sunny"}
        refereeName={engine.state.referee.name || "—"}
        refereePersonality={engine.state.referee.personality || "balanced"}
        homeForm={homeRecent}
        awayForm={awayRecent}
        onStart={() => {
          setShowPreMatch(false);
          engine.start();
        }}
        onBack={() => setShowPreMatch(false)}
      />
    );
  }

  return (
    <div className="dark text-foreground bg-background min-h-[calc(100dvh-50px)]">
      <div className="px-3 py-3 space-y-3 pb-6">
        <MatchTopBar
          state={engine.state}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />

        {/* Referee & weather info banner */}
        <InfoBanner state={engine.state} />

        {/* Action buttons: kick off / pause / tactics */}
        {engine.state.status !== "finished" && (
          <div className="flex gap-2">
            {engine.state.status === "idle" && (
              <button
                onClick={() => { haptic("medium"); setShowPreMatch(true); }}
                className="tm-tap flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold active:scale-[0.98] transition-transform"
              >
                <Play size={16} /> {t("match.kick_off")}
              </button>
            )}
            {engine.state.status === "live" && (
              <button
                onClick={() => { haptic("light"); engine.pause(); }}
                className="tm-tap flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-bold active:scale-[0.98] transition-transform"
              >
                <Pause size={16} /> {t("match.pause")}
              </button>
            )}
            {engine.state.status === "paused" && (
              <button
                onClick={() => { haptic("medium"); setShowPreMatch(true); }}
                className="tm-tap flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold active:scale-[0.98] transition-transform"
              >
                <Play size={16} /> {t("match.resume")}
              </button>
            )}
            <button
              onClick={() => { haptic("light"); setDrawerOpen(true); }}
              className="tm-tap px-4 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
            >
              <Settings size={16} /> {t("match.tactics")}
            </button>
          </div>
        )}

        {/* Replay progress (when replaying) */}
        {engine.replay.active && (
          <div className="tm-card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin" />
                {t("match.post.replay_3x")}
              </span>
              <button
                onClick={() => engine.replay.stop()}
                className="tm-tap text-[11px] text-muted-foreground"
              >
                {t("common.close")}
              </button>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${engine.replay.progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Live event feed */}
        {engine.state.status !== "finished" || engine.replay.active ? (
          <EventFeed
            events={
              engine.replay.active
                ? engine.replay.events
                : engine.state.events
            }
            emptyText={t("match.events.empty")}
            locale={locale}
          />
        ) : (
          <PostMatch
            state={engine.state}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            onReplay={() => engine.replay.start()}
            onNewMatch={() => { engine.reset(); setShowPreMatch(false); }}
          />
        )}

        {/* Match stats bar */}
        {engine.state.status !== "idle" && !engine.replay.active && (
          <StatsBar state={engine.state} />
        )}

        {engine.state.status === "finished" && !engine.replay.active && (
          <StatsBar state={engine.state} />
        )}
      </div>

      {/* Tactics drawer */}
      <TacticsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        engine={engine}
        mySide={mySide}
        myTeam={team}
      />
    </div>
  );
}

// ---- Top bar ----
function MatchTopBar({
  state,
  homeTeam,
  awayTeam,
}: {
  state: MatchState;
  homeTeam: { name: string; shortName: string; primaryColor: string };
  awayTeam: { name: string; shortName: string; primaryColor: string };
}) {
  const { t } = useI18n();
  const isLive = state.status === "live";
  const isFinished = state.status === "finished";

  const minuteLabel = state.minute > 90
    ? `90+${state.minute - 90}'`
    : `${state.minute}'`;

  return (
    <div className="tm-card p-3">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
        <span>{t("match.referee")}: {state.referee.name}</span>
        <RefereeBadge personality={state.referee.personality} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Home */}
        <div className="flex flex-col items-center gap-1">
          <ClubBadge
            short={homeTeam.shortName}
            primaryColor={homeTeam.primaryColor}
            size={48}
          />
          <span className="text-[11px] font-semibold text-center truncate max-w-[100px]">
            {homeTeam.name}
          </span>
        </div>
        {/* Score + minute */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-3xl font-bold tabular-nums">
            <span>{state.homeScore}</span>
            <span className="text-muted-foreground text-xl">-</span>
            <span>{state.awayScore}</span>
          </div>
          <div className="mt-1">
            {isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {t("match.live")} · {minuteLabel}
              </span>
            )}
            {isFinished && (
              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-foreground">
                {t("match.ft")} · {minuteLabel}
              </span>
            )}
            {state.status === "idle" && (
              <span className="text-[10px] text-muted-foreground">00:00</span>
            )}
            {state.status === "paused" && (
              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white">
                {t("match.pause")} · {minuteLabel}
              </span>
            )}
          </div>
        </div>
        {/* Away */}
        <div className="flex flex-col items-center gap-1">
          <ClubBadge
            short={awayTeam.shortName}
            primaryColor={awayTeam.primaryColor}
            size={48}
          />
          <span className="text-[11px] font-semibold text-center truncate max-w-[100px]">
            {awayTeam.name}
          </span>
        </div>
      </div>
      {/* Weather row */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <WeatherIcon weather={state.weather} />
        <span>{t(`match.weather.${state.weather}`)}</span>
      </div>
    </div>
  );
}

function RefereeBadge({ personality }: { personality: MatchState["referee"]["personality"] }) {
  const { t } = useI18n();
  const colors: Record<string, string> = {
    strict: "bg-red-100 text-red-700",
    balanced: "bg-emerald-100 text-emerald-700",
    soft: "bg-sky-100 text-sky-700",
  };
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", colors[personality])}>
      {t(`match.ref.${personality}`)}
    </span>
  );
}

function WeatherIcon({ weather, size = 14 }: { weather: string; size?: number }) {
  if (weather === "sunny") return <Sun size={size} className="text-amber-500" />;
  if (weather === "rainy") return <CloudRain size={size} className="text-sky-500" />;
  if (weather === "windy") return <Wind size={size} className="text-slate-400" />;
  return <CloudSun size={size} />;
}

// ---- Info banner ----
function InfoBanner({ state }: { state: MatchState }) {
  const { t } = useI18n();
  // Hakem veya hava etkisi varsa göster
  const messages: string[] = [];
  if (state.referee.personality === "strict") messages.push(t("match.banner.strict"));
  if (state.weather === "rainy") messages.push(t("match.banner.rainy"));
  if (state.weather === "windy") messages.push(t("match.banner.windy"));
  if (state.weather === "sunny" && state.referee.personality !== "strict") {
    messages.push(t("match.banner.sunny"));
  }
  if (messages.length === 0) return null;
  return (
    <div className="tm-card p-2.5 space-y-1 bg-muted/50">
      {messages.map((m, i) => (
        <div key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <Zap size={11} className="mt-0.5 shrink-0 text-amber-500" />
          <span>{m}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Event feed ----
function EventFeed({
  events,
  emptyText,
  locale,
}: {
  events: MatchEvent[];
  emptyText: string;
  locale: "tr" | "en";
}) {
  const { t } = useI18n();
  return (
    <div className="tm-card">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-bold">{t("match.events.title")}</span>
        <span className="text-[10px] text-muted-foreground">{events.length}</span>
      </div>
      <div className="max-h-72 overflow-y-auto tm-thin-scrollbar">
        {events.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            {emptyText}
          </div>
        )}
        {events.map((ev, i) => (
          <EventRow key={`${ev.minute}-${i}-${ev.type}`} ev={ev} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function EventRow({ ev, locale }: { ev: MatchEvent; locale: "tr" | "en" }) {
  const side = (ev.team as string) ?? "neutral";
  const sideColor = side === "home" ? "border-l-emerald-500" :
    side === "away" ? "border-l-sky-500" : "border-l-amber-500";
  return (
    <div className={cn("flex items-start gap-2.5 px-3 py-2 border-l-2 border-b border-border/50 last:border-b-0", sideColor)}>
      <span className="text-[11px] font-bold tabular-nums text-muted-foreground w-8 shrink-0 mt-0.5">
        {ev.minute > 90 ? `90+${ev.minute - 90}'` : `${ev.minute}'`}
      </span>
      <EventIcon type={ev.type} />
      <span className="text-xs flex-1">{ev.description}</span>
    </div>
  );
}

function EventIcon({ type }: { type: MatchEvent["type"] }) {
  const map: Record<string, { emoji: string; cls: string }> = {
    goal: { emoji: "⚽", cls: "" },
    yellow_card: { emoji: "🟨", cls: "" },
    red_card: { emoji: "🟥", cls: "" },
    injury: { emoji: "🤕", cls: "" },
    substitution: { emoji: "🔄", cls: "" },
    foul: { emoji: "⚙️", cls: "" },
    corner: { emoji: "🚩", cls: "" },
    shot_saved: { emoji: "🧤", cls: "" },
    shot_wide: { emoji: "❌", cls: "" },
    shot_post: { emoji: "🎯", cls: "" },
    penalty: { emoji: "⚡", cls: "" },
    offside: { emoji: "🚩", cls: "" },
    free_kick: { emoji: "🎯", cls: "" },
    save: { emoji: "🧤", cls: "" },
    tackle: { emoji: "🛡️", cls: "" },
    interception: { emoji: "✋", cls: "" },
    chance: { emoji: "🔥", cls: "" },
    var_review: { emoji: "📺", cls: "" },
    goal_overturned: { emoji: "❌", cls: "" },
  };
  const { emoji } = map[type] ?? { emoji: "•", cls: "" };
  return <span className="text-sm shrink-0">{emoji}</span>;
}

// ---- Stats bar ----
function StatsBar({ state }: { state: MatchState }) {
  const { t } = useI18n();
  const rows: { label: string; home: number; away: number; suffix?: string }[] = [
    { label: t("match.stats.possession"), home: state.stats.possession[0], away: state.stats.possession[1], suffix: "%" },
    { label: t("match.stats.shots"), home: state.stats.shotsOnTarget[0], away: state.stats.shotsOnTarget[1] },
    { label: t("match.stats.corners"), home: state.stats.corners[0], away: state.stats.corners[1] },
    { label: t("match.stats.fouls"), home: state.stats.fouls[0], away: state.stats.fouls[1] },
  ];
  return (
    <div className="tm-card p-3 space-y-2.5">
      {rows.map((r) => (
        <StatBar key={r.label} {...r} />
      ))}
    </div>
  );
}

function StatBar({
  label,
  home,
  away,
  suffix = "",
}: {
  label: string;
  home: number;
  away: number;
  suffix?: string;
}) {
  const total = home + away || 1;
  const homePct = (home / total) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="font-bold tabular-nums">{home}{suffix}</span>
        <span className="text-muted-foreground text-[10px]">{label}</span>
        <span className="font-bold tabular-nums">{away}{suffix}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
        <div className="bg-emerald-500" style={{ width: `${homePct}%` }} />
        <div className="bg-sky-500" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}

// ---- Tactics drawer ----
function TacticsDrawer({
  open,
  onClose,
  engine,
  mySide,
  myTeam,
}: {
  open: boolean;
  onClose: () => void;
  engine: ReturnType<typeof useMatchEngine>;
  mySide: Side;
  myTeam: { players: PlayerT[] };
}) {
  const { t } = useI18n();
  const initial = engine.tactics[mySide];
  const [formation, setFormation] = useState(initial.formation);
  const [sliders, setSliders] = useState({
    pressing: initial.pressing,
    defensiveLine: initial.defensiveLine,
    tempo: initial.tempo,
    width: initial.width,
  });
  const [subOutId, setSubOutId] = useState<string | null>(null);
  const [subInId, setSubInId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!open) return null;

  const lineup = myTeam.players.slice(0, 11);
  const subs = myTeam.players.slice(11);

  const onApply = () => {
    haptic("success");
    const newTactics: MatchTactics = {
      formation,
      pressing: sliders.pressing,
      defensiveLine: sliders.defensiveLine,
      tempo: sliders.tempo,
      width: sliders.width,
    };
    engine.applyTactics(mySide as HomeAway, newTactics);
    setFeedback(`✓ ${t("match.tactics.apply")} · ${engine.state.minute}'`);
    setTimeout(() => setFeedback(null), 2000);
  };

  const onConfirmSub = () => {
    if (!subOutId || !subInId) return;
    const out = myTeam.players.find((p) => p.id === subOutId);
    const inn = myTeam.players.find((p) => p.id === subInId);
    if (!out || !inn) return;
    const ok = engine.makeSub(mySide as HomeAway, out, inn);
    if (ok) {
      haptic("success");
      setSubOutId(null);
      setSubInId(null);
      setFeedback(`✓ ${t("match.event.sub")} · ${engine.state.minute}'`);
      setTimeout(() => setFeedback(null), 2000);
    } else {
      haptic("error");
      setFeedback(t("match.tactics.no_subs_left"));
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const subsLeft = 5 - engine.state.subsUsed[mySide];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="close"
      />
      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold">{t("match.tactics")}</h3>
          <button onClick={onClose} className="tm-tap p-1">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto tm-thin-scrollbar p-4 space-y-4">
          {/* Formation selector */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {t("match.tactics.formation")}
            </label>
            <div className="mt-1.5 relative">
              <select
                value={formation}
                onChange={(e) => setFormation(e.target.value)}
                className="tm-tap w-full bg-card border border-border rounded-md px-3 py-2 text-sm appearance-none pr-8"
              >
                {FORMATION_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3">
            <SliderRow label={t("match.tactics.pressing")} value={sliders.pressing} onChange={(v) => setSliders((s) => ({ ...s, pressing: v }))} />
            <SliderRow label={t("match.tactics.defensive_line")} value={sliders.defensiveLine} onChange={(v) => setSliders((s) => ({ ...s, defensiveLine: v }))} />
            <SliderRow label={t("match.tactics.tempo")} value={sliders.tempo} onChange={(v) => setSliders((s) => ({ ...s, tempo: v }))} />
            <SliderRow label={t("match.tactics.width")} value={sliders.width} onChange={(v) => setSliders((s) => ({ ...s, width: v }))} />
          </div>

          {/* Apply button */}
          <button
            onClick={onApply}
            className="tm-tap w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold"
          >
            {t("match.tactics.apply")}
          </button>

          {/* Substitution section */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold">{t("match.tactics.subs")}</span>
              <span className="text-[10px] text-muted-foreground">
                {subsLeft} {t("match.tactics.subs_left")}
              </span>
            </div>
            {subsLeft <= 0 ? (
              <div className="text-[11px] text-muted-foreground text-center py-3">
                {t("match.tactics.no_subs_left")}
              </div>
            ) : (
              <>
                {/* Step 1: pick out */}
                <div className="text-[10px] text-muted-foreground mb-1.5">
                  {t("match.tactics.subs.pick_out")}
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {lineup.map((p) => (
                    <SubPicker
                      key={p.id}
                      player={p}
                      selected={subOutId === p.id}
                      onClick={() => setSubOutId(subOutId === p.id ? null : p.id)}
                    />
                  ))}
                </div>

                {subOutId && (
                  <>
                    <div className="text-[10px] text-muted-foreground mb-1.5">
                      {t("match.tactics.subs.pick_in")}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      {subs.map((p) => (
                        <SubPicker
                          key={p.id}
                          player={p}
                          selected={subInId === p.id}
                          onClick={() => setSubInId(subInId === p.id ? null : p.id)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {subOutId && subInId && (
                  <button
                    onClick={onConfirmSub}
                    className="tm-tap w-full py-2 rounded-md bg-emerald-600 text-white text-sm font-bold"
                  >
                    {t("match.tactics.subs.confirm")}
                  </button>
                )}
              </>
            )}
          </div>

          {feedback && (
            <div className="tm-card p-2.5 text-center text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
              {feedback}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs font-bold tabular-nums text-primary">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-primary tm-tap"
        style={{ minHeight: 28 }}
      />
    </div>
  );
}

function SubPicker({
  player,
  selected,
  onClick,
}: {
  player: PlayerT;
  selected: boolean;
  onClick: () => void;
}) {
  const team = useMyTeam();
  return (
    <button
      onClick={onClick}
      className={cn(
        "tm-tap flex items-center gap-2 p-2 rounded-md border text-left",
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      )}
    >
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white shrink-0"
        style={{ background: team?.primaryColor ?? "#1a3a2a" }}
      >
        {player.firstName[0]}{player.lastName[0]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold truncate">
          {player.firstName} {player.lastName}
        </div>
        <div className="text-[9px] text-muted-foreground">
          {player.specificPosition} · {player.rating}
        </div>
      </div>
    </button>
  );
}

// ---- Post match ----
function PostMatch({
  state,
  homeTeam,
  awayTeam,
  onReplay,
  onNewMatch,
}: {
  state: MatchState;
  homeTeam: { name: string; shortName: string; primaryColor: string; players: PlayerT[] };
  awayTeam: { name: string; shortName: string; primaryColor: string; players: PlayerT[] };
  onReplay: () => void;
  onNewMatch: () => void;
}) {
  const { t, locale } = useI18n();

  const motm = state.motmPlayerId
    ? [...homeTeam.players, ...awayTeam.players].find((p) => p.id === state.motmPlayerId)
    : null;
  const motmSide: Side = motm && homeTeam.players.some((p) => p.id === motm.id) ? "home" : "away";

  // Tüm oyuncuları puana göre sırala, ilk 11'i göster
  const allRated = [...homeTeam.players, ...awayTeam.players]
    .map((p) => ({
      player: p,
      rating: state.playerRatings[p.id] ?? 6.5,
      stats: state.playerMatchStats[p.id] ?? { goals: 0, assists: 0, yellow: 0, red: 0 },
      side: homeTeam.players.some((hp) => hp.id === p.id) ? "home" : "away" as Side,
    }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 22);

  return (
    <div className="space-y-3">
      {/* Final score card */}
      <div className="tm-card p-4 text-center">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          {t("match.post.final_score")}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <ClubBadge short={homeTeam.shortName} primaryColor={homeTeam.primaryColor} size={44} />
            <span className="text-[11px] font-semibold truncate max-w-[100px]">{homeTeam.name}</span>
          </div>
          <div className="text-4xl font-bold tabular-nums">
            {state.homeScore}<span className="text-muted-foreground text-2xl mx-1">-</span>{state.awayScore}
          </div>
          <div className="flex flex-col items-center gap-1">
            <ClubBadge short={awayTeam.shortName} primaryColor={awayTeam.primaryColor} size={44} />
            <span className="text-[11px] font-semibold truncate max-w-[100px]">{awayTeam.name}</span>
          </div>
        </div>
      </div>

      {/* MOTM card */}
      {motm && (
        <div className="tm-card p-3 border-amber-300 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">⭐</span>
            <span className="text-xs font-bold">{t("match.post.motm")}</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold text-white"
              style={{ background: motmSide === "home" ? homeTeam.primaryColor : awayTeam.primaryColor }}
            >
              {motm.firstName[0]}{motm.lastName[0]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{motm.firstName} {motm.lastName}</div>
              <div className="text-[11px] text-muted-foreground">
                {motm.specificPosition} · {motmSide === "home" ? homeTeam.name : awayTeam.name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums text-amber-700">
                {(state.playerRatings[motm.id] ?? 6.5).toFixed(1)}
              </div>
              <div className="text-[9px] text-muted-foreground uppercase">{t("match.post.col.rating")}</div>
            </div>
          </div>
        </div>
      )}

      {/* Gol kartları */}
      {state.events.filter((e) => e.type === "goal").length > 0 && (
        <div className="tm-card p-3">
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2">⚽ Goller</div>
          <div className="space-y-1">
            {state.events
              .filter((e) => e.type === "goal")
              .sort((a, b) => a.minute - b.minute)
              .map((ev, i) => {
                const side = (ev.team as string) ?? "neutral";
                const teamName = side === "home" ? homeTeam.shortName : side === "away" ? awayTeam.shortName : "";
                return (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="font-bold tabular-nums w-6">{ev.minute}'</span>
                    <span className="text-[9px] px-1 py-0.5 rounded font-bold"
                      style={{ background: side === "home" ? homeTeam.primaryColor : side === "away" ? awayTeam.primaryColor : "#666", color: "#fff" }}>
                      {teamName}
                    </span>
                    <span className="flex-1 truncate">{ev.description}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Kartlar */}
      {state.events.filter((e) => e.type === "yellow_card" || e.type === "red_card").length > 0 && (
        <div className="tm-card p-3">
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2">🟨🟥 Kartlar</div>
          <div className="space-y-1">
            {state.events
              .filter((e) => e.type === "yellow_card" || e.type === "red_card")
              .sort((a, b) => a.minute - b.minute)
              .map((ev, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span className="font-bold tabular-nums w-6">{ev.minute}'</span>
                  <span>{ev.type === "yellow_card" ? "🟨" : "🟥"}</span>
                  <span className="flex-1 truncate">{ev.description}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Basın açıklaması */}
      <div className="tm-card p-3 bg-muted/30">
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">📰 Basın</div>
        <div className="text-[11px] leading-relaxed">
          {(() => {
            const diff = state.homeScore - state.awayScore;
            if (diff > 2) return "Etkileyici bir performans! Takım sahadaki üstünlüğünü gole yansıttı ve rakibine nefes aldırmadı.";
            if (diff === 1 || diff === -1) return "Taraftarlar için çekişmeli bir maçtı. İki takım da mücadele etti, fark tek golde kaldı.";
            if (diff === 0) return "Beraberlik her iki takım için de adil bir sonuçtu. Maç boyunca kırılma anı yaşanmadı.";
            if (diff < -2) return "Zor bir gün. Savunma organize olamadı ve rakip bunu acımasızca cezalandırdı. Düşünme zamanı.";
            return "Maç sona erdi, şimdi bir sonraki maça odaklanma zamanı.";
          })()}
        </div>
      </div>

      {/* Player ratings table */}
      <div className="tm-card">
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs font-bold">{t("match.post.ratings")}</span>
        </div>
        <div className="max-h-80 overflow-y-auto tm-thin-scrollbar">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-[10px] text-muted-foreground uppercase">
                <th className="text-left px-2 py-1.5 w-8">{t("match.post.col.pos")}</th>
                <th className="text-left px-2 py-1.5">{t("match.post.col.player")}</th>
                <th className="text-center px-2 py-1.5 w-12">{t("match.post.col.rating")}</th>
                <th className="text-center px-2 py-1.5 w-6">{t("match.post.col.goals")}</th>
                <th className="text-center px-2 py-1.5 w-6">{t("match.post.col.assists")}</th>
                <th className="text-center px-2 py-1.5 w-10">{t("match.post.col.cards")}</th>
              </tr>
            </thead>
            <tbody>
              {allRated.map((row) => {
                const cards = row.stats.yellow > 0 || row.stats.red > 0;
                return (
                  <tr key={row.player.id} className="border-b border-border/50 last:border-b-0">
                    <td className="px-2 py-1.5">
                      <PositionPill label={row.player.specificPosition} group={POSITION_GROUP[row.player.specificPosition]} />
                    </td>
                    <td className="px-2 py-1.5 truncate max-w-[120px]">
                      {row.player.firstName} {row.player.lastName}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <RatingBadge value={row.rating} />
                    </td>
                    <td className="px-2 py-1.5 text-center tabular-nums">{row.stats.goals || "-"}</td>
                    <td className="px-2 py-1.5 text-center tabular-nums">{row.stats.assists || "-"}</td>
                    <td className="px-2 py-1.5 text-center">
                      {cards ? (
                        <span className="inline-flex gap-0.5">
                          {row.stats.yellow > 0 && <span className="text-[10px]">🟨{row.stats.yellow}</span>}
                          {row.stats.red > 0 && <span className="text-[10px]">🟥</span>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onReplay}
          className="tm-tap flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
        >
          <RefreshCw size={14} /> {t("match.post.watch_replay")}
        </button>
        <button
          onClick={onNewMatch}
          className="tm-tap flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-md border border-border text-sm font-semibold"
        >
          <Ban size={14} /> {t("match.post.new_match")}
        </button>
      </div>
    </div>
  );
}
