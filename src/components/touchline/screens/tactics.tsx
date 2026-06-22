"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  GitCompare,
  Repeat,
  SlidersHorizontal,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import {
  FORMATION_KEYS,
  FORMATIONS,
  POSITION_GROUP,
  type Player,
  type PositionGroup,
} from "@/lib/mock/data";
import { useAppStore, useMyTeam, getFormation } from "@/lib/store";
import { computeTacticScore } from "@/lib/mock/season";
import { PlayerAvatar, PositionPill, RatingBadge } from "../ui-bits";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TacticsScreen() {
  const { t } = useI18n();
  const team = useMyTeam();
  const { tactics, setFormation, setSlider, setRole, swapLineupSlot } = useAppStore();
  const [filter, setFilter] = useState<PositionGroup | "ALL">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [swapSlot, setSwapSlot] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const formation = getFormation(tactics.formationKey);
  const score = useMemo(
    () => (team ? computeTacticScore(team, formation, tactics.lineup, tactics.sliders) : 0),
    [team, formation, tactics.lineup, tactics.sliders]
  );

  if (!team) return null;

  const filteredPlayers =
    filter === "ALL"
      ? team.players
      : team.players.filter((p) => POSITION_GROUP[p.position] === filter);

  const onPlayerTap = (player: Player) => {
    // Eğer swap modundaysa slotu doldur
    if (swapSlot !== null) {
      swapLineupSlot(swapSlot, player.id);
      setSwapSlot(null);
      return;
    }
    // Karşılaştır modu
    if (compareMode) {
      if (compareIds.includes(player.id)) {
        setCompareIds((ids) => ids.filter((id) => id !== player.id));
      } else if (compareIds.length < 2) {
        setCompareIds((ids) => [...ids, player.id]);
      }
      return;
    }
    setExpandedId((id) => (id === player.id ? null : player.id));
  };

  const comparePair = compareIds.length === 2
    ? compareIds.map((id) => team.players.find((p) => p.id === id)).filter(Boolean) as Player[]
    : [];

  return (
    <div className="px-4 py-4 space-y-4 pb-6">
      {/* Formation picker + score */}
      <div className="tm-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-muted-foreground" />
            <span className="text-sm font-bold">{t("tactics.formation")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{t("tactics.score")}</span>
            <span
              className={cn(
                "inline-flex items-center justify-center min-w-10 px-2 py-0.5 rounded-md text-sm font-bold tabular-nums",
                score >= 75 ? "bg-emerald-100 text-emerald-800"
                : score >= 60 ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-700"
              )}
            >
              {score}
            </span>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto tm-no-scrollbar pb-1">
          {FORMATION_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setFormation(key)}
              className={cn(
                "tm-tap px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors border",
                tactics.formationKey === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:bg-accent"
              )}
              style={{ minHeight: 32 }}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground mt-2">
          {t("tactics.score_hint")}
        </div>
      </div>

      {/* Pitch with lineup */}
      <div className="tm-card overflow-hidden">
        <div className="px-3 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-muted-foreground" />
            <span className="text-sm font-bold">{t("tactics.lineup")} · {tactics.formationKey}</span>
          </div>
          {swapSlot !== null && (
            <button
              onClick={() => setSwapSlot(null)}
              className="tm-tap text-[11px] font-semibold text-red-600"
            >
              {t("common.cancel")}
            </button>
          )}
        </div>
        <PitchView
          formation={formation}
          lineup={tactics.lineup}
          team={team}
          swapSlot={swapSlot}
          onSlotTap={(i) => {
            // Boş slota tıklarsa oyuncu seçim modal'ı aç; dolu slota tıklarsa swap moda geç
            if (tactics.lineup[i]) {
              setSwapSlot(swapSlot === i ? null : i);
            } else {
              setSwapSlot(i);
            }
          }}
        />
      </div>

      {/* Tactic sliders */}
      <div className="tm-card p-3 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <SlidersHorizontal size={14} className="text-muted-foreground" />
          <span className="text-sm font-bold">{t("tactics.instructions")}</span>
        </div>
        <SliderRow
          label={t("tactics.sliders.attacking_pressure")}
          value={tactics.sliders.attackingPressure}
          onChange={(v) => setSlider("attackingPressure", v)}
        />
        <SliderRow
          label={t("tactics.sliders.defensive_line")}
          value={tactics.sliders.defensiveLine}
          onChange={(v) => setSlider("defensiveLine", v)}
        />
        <SliderRow
          label={t("tactics.sliders.tempo")}
          value={tactics.sliders.tempo}
          onChange={(v) => setSlider("tempo", v)}
        />
        <SliderRow
          label={t("tactics.sliders.wing_play")}
          value={tactics.sliders.wingPlay}
          onChange={(v) => setSlider("wingPlay", v)}
        />
      </div>

      {/* Squad list + filter */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-muted-foreground" />
            <h2 className="text-sm font-bold">{team.name}</h2>
          </div>
          <button
            onClick={() => {
              if (compareMode) {
                setCompareMode(false);
                setCompareIds([]);
              } else {
                setCompareMode(true);
                setCompareIds([]);
                setExpandedId(null);
              }
            }}
            className={cn(
              "tm-tap inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border",
              compareMode
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border"
            )}
          >
            <GitCompare size={12} />
            {t("tactics.compare")} {compareMode && compareIds.length > 0 && `(${compareIds.length}/2)`}
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto tm-no-scrollbar">
          {(["ALL", "GK", "DEF", "MID", "FWD"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setFilter(g)}
              className={cn(
                "tm-tap px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors border",
                filter === g
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:bg-accent"
              )}
              style={{ minHeight: 32 }}
            >
              {g === "ALL" ? t("common.all") : t(`pos.${g.toLowerCase()}`)}
            </button>
          ))}
        </div>

        {/* Player list */}
        <div className="tm-card divide-y divide-border">
          {filteredPlayers
            .slice()
            .sort((a, b) => b.ovr - a.ovr)
            .map((p) => {
              const expanded = expandedId === p.id;
              const isSelected = compareIds.includes(p.id);
              return (
                <div key={p.id}>
                  <button
                    onClick={() => onPlayerTap(p)}
                    className={cn(
                      "tm-tap w-full flex items-center gap-3 p-3 text-left transition-colors",
                      isSelected && "bg-primary/5",
                      swapSlot !== null && "hover:bg-accent/60"
                    )}
                  >
                    <PlayerAvatar initials={`${p.firstName[0]}${p.lastName[0]}`} size={36} color={team.primaryColor} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">
                          {p.firstName} {p.lastName}
                        </span>
                        <PositionPill label={p.position} group={POSITION_GROUP[p.position]} />
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.age} {t("common.year")} · {p.nationality === "TR" ? "🇹🇷" : "🌍"}
                      </div>
                    </div>
                    <div className="text-right">
                      <RatingBadge value={p.rating} />
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {p.position === "GK"
                          ? `${p.saves} ${t("pos.gk").toLowerCase()}`
                          : `${p.goals}G · ${p.assists}A`}
                      </div>
                    </div>
                    <ChevronDown
                      size={14}
                      className={cn(
                        "text-muted-foreground transition-transform shrink-0",
                        expanded && "rotate-180"
                      )}
                    />
                  </button>
                  {expanded && (
                    <PlayerExpandedCard
                      player={p}
                      teamColor={team.primaryColor}
                      onSetRole={(role) => {
                        const idx = tactics.lineup.findIndex((lp) => lp?.id === p.id);
                        if (idx >= 0) setRole(idx, role);
                      }}
                      currentRole={
                        tactics.lineup.findIndex((lp) => lp?.id === p.id) >= 0
                          ? tactics.roles[
                              tactics.lineup.findIndex((lp) => lp?.id === p.id)
                            ] ?? "balanced"
                          : "balanced"
                      }
                      inLineup={tactics.lineup.some((lp) => lp?.id === p.id)}
                    />
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Compare overlay */}
      {comparePair.length === 2 && (
        <CompareCard
          players={comparePair}
          onClose={() => setCompareIds([])}
          teamColor={team.primaryColor}
        />
      )}
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

function PitchView({
  formation,
  lineup,
  team,
  swapSlot,
  onSlotTap,
}: {
  formation: ReturnType<typeof getFormation>;
  lineup: (Player | null)[];
  team: ReturnType<typeof useMyTeam>;
  swapSlot: number | null;
  onSlotTap: (i: number) => void;
}) {
  return (
    <div className="tm-pitch relative mx-3 my-3 rounded-xl" style={{ aspectRatio: "3 / 4" }}>
      {formation.slots.map((slot, i) => {
        const p = lineup[i];
        const isSwap = swapSlot === i;
        return (
          <button
            key={i}
            onClick={() => onSlotTap(i)}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 transition-transform",
              isSwap && "scale-110"
            )}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          >
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white border-2",
                isSwap
                  ? "border-yellow-400 ring-2 ring-yellow-400/50"
                  : "border-white/70"
              )}
              style={{
                width: 36,
                height: 36,
                background: team?.primaryColor ?? "#1a3a2a",
              }}
            >
              {p ? p.ovr : slot.pos}
            </span>
            <span className="text-[9px] text-white font-semibold drop-shadow max-w-[60px] truncate text-center">
              {p ? `${p.firstName[0]}. ${p.lastName}` : t_slot()}
            </span>
          </button>
        );
      })}
    </div>
  );

  function t_slot() {
    return "";
  }
}

function PlayerExpandedCard({
  player,
  teamColor,
  onSetRole,
  currentRole,
  inLineup,
}: {
  player: Player;
  teamColor: string;
  onSetRole: (role: "balanced" | "attacking" | "defensive" | "support") => void;
  currentRole: "balanced" | "attacking" | "defensive" | "support";
  inLineup: boolean;
}) {
  const { t, locale } = useI18n();
  const stats: { label: string; value: number }[] = [
    { label: t("stat.pace"), value: player.stats.pace },
    { label: t("stat.shooting"), value: player.stats.shooting },
    { label: t("stat.passing"), value: player.stats.passing },
    { label: t("stat.defending"), value: player.stats.defending },
    { label: t("stat.physical"), value: player.stats.physical },
    { label: t("stat.dribbling"), value: player.stats.dribbling },
  ];
  const roles: ("balanced" | "attacking" | "defensive" | "support")[] = [
    "balanced", "attacking", "defensive", "support",
  ];

  return (
    <div className="px-3 pb-3 bg-muted/30">
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3 pt-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-md p-2 border border-border">
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
            <div className="text-sm font-bold tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Condition + Morale bars */}
      <div className="space-y-2 mb-3">
        <Bar label={t("dash.morale")} value={player.morale} color="#10b981" />
        <Bar label={t("stat.condition")} value={player.condition} color="#3b82f6" suffix="%" />
      </div>

      {/* Role picker (only if in lineup) */}
      {inLineup && (
        <div className="mb-3">
          <div className="text-[11px] font-semibold mb-1.5 text-muted-foreground">
            {t("tactics.player.roles")}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => onSetRole(r)}
                className={cn(
                  "tm-tap px-1 py-1 rounded-md text-[10px] font-semibold border",
                  currentRole === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border"
                )}
                style={{ minHeight: 30 }}
              >
                {t(`tactics.role.${r}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sell button */}
      <button
        className="tm-tap w-full py-2 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-200"
        onClick={() => alert("Satış listesine eklendi (mock)")}
      >
        {t("tactics.sell")} · {formatEuro(player.marketValue, locale)}
      </button>
    </div>
  );
}

function Bar({
  label,
  value,
  color,
  suffix = "",
}: {
  label: string;
  value: number;
  color: string;
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
        />
      </div>
    </div>
  );
}

function CompareCard({
  players,
  teamColor,
  onClose,
}: {
  players: Player[];
  teamColor: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const rows: { label: string; get: (p: Player) => number | string }[] = [
    { label: "OVR", get: (p) => p.ovr },
    { label: t("dash.morale"), get: (p) => p.morale },
    { label: t("stat.pace"), get: (p) => p.stats.pace },
    { label: t("stat.shooting"), get: (p) => p.stats.shooting },
    { label: t("stat.passing"), get: (p) => p.stats.passing },
    { label: t("stat.defending"), get: (p) => p.stats.defending },
    { label: t("stat.physical"), get: (p) => p.stats.physical },
    { label: t("stat.dribbling"), get: (p) => p.stats.dribbling },
    { label: t("stat.goals_short"), get: (p) => p.goals },
    { label: t("stat.assists_short"), get: (p) => p.assists },
  ];

  return (
    <div className="tm-card p-3 border-primary/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Repeat size={14} />
          <span className="text-sm font-bold">{t("tactics.compare")}</span>
        </div>
        <button onClick={onClose} className="tm-tap p-1">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mb-2">
        <PlayerHeader p={players[0]} teamColor={teamColor} />
        <div className="self-center text-[10px] text-muted-foreground">vs</div>
        <PlayerHeader p={players[1]} teamColor={teamColor} alignRight />
      </div>
      <div className="divide-y divide-border">
        {rows.map((r) => {
          const a = r.get(players[0]);
          const b = r.get(players[1]);
          const aWin = typeof a === "number" && typeof b === "number" && a > b;
          const bWin = typeof a === "number" && typeof b === "number" && b > a;
          return (
            <div key={r.label} className="grid grid-cols-[1fr_auto_1fr] items-center py-1.5">
              <div className={cn("text-sm font-semibold tabular-nums text-left", aWin && "text-emerald-600")}>
                {a}
              </div>
              <div className="text-[10px] text-muted-foreground px-2">{r.label}</div>
              <div className={cn("text-sm font-semibold tabular-nums text-right", bWin && "text-emerald-600")}>
                {b}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlayerHeader({
  p,
  teamColor,
  alignRight,
}: {
  p: Player;
  teamColor: string;
  alignRight?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", alignRight && "flex-row-reverse")}>
      <PlayerAvatar
        initials={`${p.firstName[0]}${p.lastName[0]}`}
        size={32}
        color={teamColor}
      />
      <div className={cn("min-w-0", alignRight && "text-right")}>
        <div className="text-xs font-semibold truncate">{p.firstName} {p.lastName}</div>
        <div className="text-[10px] text-muted-foreground">{p.position} · {p.age}</div>
      </div>
    </div>
  );
}
