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
  POSITION_GROUP,
  type Player as PlayerT,
  type PositionGroup,
} from "@/lib/mock/data";
import { useAppStore, useMyTeam, getFormation } from "@/lib/store";
import {
  FORMATIONS_14,
  FORMATION_PITCH,
  FORMATION_SLOTS,
  getCompatibleRoles,
  MENTALITY_LABELS,
  PLAY_STYLES,
  ROLES,
  type ActiveTactic,
  type Mentality,
  type PassingStyle,
} from "@/lib/tactics/types";
import { PlayerAvatar, PositionPill, RatingBadge } from "../ui-bits";
import { PlayerProfileModal } from "../player-profile-modal";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TacticsScreen() {
  const { t, locale } = useI18n();
  const team = useMyTeam();
  const { tactics, updateActiveTactic, setSlotRole, swapLineupSlot } = useAppStore();
  const [filter, setFilter] = useState<PositionGroup | "ALL">("ALL");
  const [swapSlot, setSwapSlot] = useState<number | null>(null);
  const [roleSlot, setRoleSlot] = useState<number | null>(null);
  const [profilePlayer, setProfilePlayer] = useState<PlayerT | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const formation = tactics.active.formation;
  const slots = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-4-2"];
  const pitchCoords = FORMATION_PITCH[formation] ?? FORMATION_PITCH["4-4-2"];

  // Taktik skoru (basit hesaplama)
  const score = useMemo(() => {
    if (!team) return 0;
    const filled = tactics.lineup.filter((p): p is PlayerT => p !== null);
    if (filled.length === 0) return 0;
    const avgOvr = filled.reduce((s, p) => s + p.rating, 0) / filled.length;
    const slotMatch = slots.filter((sp, i) => {
      const p = tactics.lineup[i];
      return p && p.specificPosition === sp;
    }).length / slots.length;
    const sliderBalance =
      100 -
      Math.abs(50 - tactics.active.aggression) * 0.1 -
      Math.abs(50 - tactics.active.width) * 0.1 -
      Math.abs(50 - tactics.active.passingIntensity) * 0.1 -
      Math.abs(50 - tactics.active.lineHeight) * 0.1;
    const avgMorale = filled.reduce((s, p) => s + p.morale, 0) / filled.length;
    return Math.round(
      Math.max(0, Math.min(100, avgOvr * 0.55 + slotMatch * 100 * 0.25 + sliderBalance * 0.1 + avgMorale * 0.1))
    );
  }, [team, tactics.lineup, tactics.active, slots]);

  if (!team) return null;

  const onPlayerTap = (player: PlayerT) => {
    if (swapSlot !== null) {
      swapLineupSlot(swapSlot, player.id);
      setSwapSlot(null);
      return;
    }
    setProfilePlayer(player);
  };

  const compareMode = compareIds.length > 0;
  const comparePair = compareIds.length === 2
    ? compareIds.map((id) => team.players.find((p) => p.id === id)).filter(Boolean) as PlayerT[]
    : [];

  return (
    <div className="px-3 py-3 space-y-3 pb-6">
      {/* Üst kart: formation + score + mentality */}
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
                score >= 75 ? "bg-emerald-500/20 text-emerald-300"
                : score >= 60 ? "bg-amber-500/20 text-amber-300"
                : "bg-red-500/20 text-red-300"
              )}
            >
              {score}
            </span>
          </div>
        </div>

        {/* Formation yatay seçici */}
        <div className="flex gap-1 overflow-x-auto tm-no-scrollbar pb-1.5 mb-2">
          {FORMATIONS_14.map((f) => (
            <button
              key={f}
              onClick={() => updateActiveTactic({ formation: f })}
              className={cn(
                "tm-tap px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-colors border",
                formation === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border"
              )}
              style={{ minHeight: 28 }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Mentality 5 buton */}
        <div className="flex gap-1">
          {([1, 2, 3, 4, 5] as Mentality[]).map((m) => (
            <button
              key={m}
              onClick={() => updateActiveTactic({ mentality: m })}
              className={cn(
                "tm-tap flex-1 py-1 rounded text-[9px] font-bold transition-colors",
                tactics.active.mentality === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
              style={{ minHeight: 28 }}
            >
              {MENTALITY_LABELS[m][locale].split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Pitch + lineup */}
      <div className="tm-card overflow-hidden">
        <div className="px-3 pt-2 flex items-center justify-between">
          <span className="text-xs font-bold">{formation} · {t("tactics.lineup")}</span>
          {swapSlot !== null && (
            <button
              onClick={() => setSwapSlot(null)}
              className="tm-tap text-[11px] font-semibold text-red-400"
            >
              {t("common.cancel")}
            </button>
          )}
        </div>
        <div className="tm-pitch relative mx-2 my-2 rounded-xl" style={{ aspectRatio: "3 / 4" }}>
          {pitchCoords.map((coord, i) => {
            const p = tactics.lineup[i];
            const slotPos = slots[i];
            const roleId = tactics.slotRoles[i];
            const role = ROLES.find((r) => r.id === roleId);
            const isSwap = swapSlot === i;
            return (
              <button
                key={i}
                onClick={() => {
                  if (p) setRoleSlot(roleSlot === i ? null : i);
                  else setSwapSlot(swapSlot === i ? null : i);
                }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5",
                  isSwap && "scale-110"
                )}
                style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white border-2",
                    isSwap ? "border-yellow-400 ring-2 ring-yellow-400/50" : "border-white/70",
                    roleSlot === i && "border-amber-400 ring-2 ring-amber-400/50"
                  )}
                  style={{
                    width: 32, height: 32,
                    background: team.primaryColor ?? "#1a3a2a",
                  }}
                >
                  {p ? p.rating : slotPos}
                </span>
                <span className="text-[8px] text-white font-semibold drop-shadow max-w-[60px] truncate text-center">
                  {p ? `${p.firstName[0]}. ${p.lastName}` : ""}
                </span>
                {role && (
                  <span className="text-[7px] text-amber-300 font-semibold">
                    {role.icon}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Slot role picker (seçili slot için) */}
        {roleSlot !== null && (
          <div className="p-2 border-t border-border">
            <div className="text-[10px] text-muted-foreground mb-1.5">
              {t("tactics.slot_role")} — {slots[roleSlot]}
            </div>
            <div className="flex gap-1 overflow-x-auto tm-no-scrollbar">
              <button
                onClick={() => setSlotRole(roleSlot, "")}
                className={cn(
                  "tm-tap px-2 py-1 rounded text-[10px] font-semibold border whitespace-nowrap",
                  !tactics.slotRoles[roleSlot]
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border"
                )}
              >
                {t("tactics.no_role")}
              </button>
              {getCompatibleRoles(slots[roleSlot]).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSlotRole(roleSlot, r.id)}
                  className={cn(
                    "tm-tap px-2 py-1 rounded text-[10px] font-semibold border whitespace-nowrap",
                    tactics.slotRoles[roleSlot] === r.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border"
                  )}
                >
                  {r.icon} {r.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tactical Lab — tüm slider + toggle'lar */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <SlidersHorizontal size={14} className="text-muted-foreground" />
          <span className="text-xs font-bold">{t("tactics.tactical_lab")}</span>
        </div>

        {/* Sliders — 2x2 grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <SliderMini label={t("tactics.aggression")} value={tactics.active.aggression} onChange={(v) => updateActiveTactic({ aggression: v })} />
          <SliderMini label={t("tactics.width")} value={tactics.active.width} onChange={(v) => updateActiveTactic({ width: v })} />
          <SliderMini label={t("tactics.passingIntensity")} value={tactics.active.passingIntensity} onChange={(v) => updateActiveTactic({ passingIntensity: v })} />
          <SliderMini label={t("tactics.lineHeight")} value={tactics.active.lineHeight} onChange={(v) => updateActiveTactic({ lineHeight: v })} />
        </div>

        {/* Toggles — 7 toggle */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <ToggleChip label={t("tactics.pressing")} icon="🔥" active={tactics.active.pressing} onClick={() => updateActiveTactic({ pressing: !tactics.active.pressing })} />
          <ToggleChip label={t("tactics.parkTheBus")} icon="🚌" active={tactics.active.parkTheBus} onClick={() => updateActiveTactic({ parkTheBus: !tactics.active.parkTheBus })} />
          <ToggleChip label={t("tactics.wasteTime")} icon="⏰" active={tactics.active.wasteTime} onClick={() => updateActiveTactic({ wasteTime: !tactics.active.wasteTime })} />
          <ToggleChip label={t("tactics.offsideTrap")} icon="🪤" active={tactics.active.offsideTrap} onClick={() => updateActiveTactic({ offsideTrap: !tactics.active.offsideTrap })} />
          <ToggleChip label={t("tactics.screenKeeper")} icon="🎯" active={tactics.active.screenKeeper} onClick={() => updateActiveTactic({ screenKeeper: !tactics.active.screenKeeper })} />
          <ToggleChip label={t("tactics.crossGame")} icon="⚔️" active={tactics.active.crossGame} onClick={() => updateActiveTactic({ crossGame: !tactics.active.crossGame })} />
          <ToggleChip label={t("tactics.loneStrikerCounter")} icon="⚡" active={tactics.active.loneStrikerCounter} onClick={() => updateActiveTactic({ loneStrikerCounter: !tactics.active.loneStrikerCounter })} />
        </div>

        {/* Passing style + Play style */}
        <div className="space-y-2">
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">{t("tactics.passingStyle")}</div>
            <div className="flex gap-1">
              {(["Karışık", "Kısa", "Uzun", "Direkt"] as PassingStyle[]).map((ps) => (
                <button
                  key={ps}
                  onClick={() => updateActiveTactic({ passingStyle: ps })}
                  className={cn(
                    "tm-tap flex-1 py-1 rounded text-[10px] font-semibold border",
                    tactics.active.passingStyle === ps
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border"
                  )}
                >
                  {ps}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">{t("tactics.playStyle")}</div>
            <div className="flex gap-1 overflow-x-auto tm-no-scrollbar">
              {PLAY_STYLES.map((ps) => (
                <button
                  key={ps.id}
                  onClick={() => updateActiveTactic({ playStyle: ps.id })}
                  className={cn(
                    "tm-tap px-2 py-1 rounded text-[10px] font-semibold border whitespace-nowrap",
                    tactics.active.playStyle === ps.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border"
                  )}
                >
                  {ps.icon !== "_PRESS" ? ps.icon : "🔥"} {ps.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Squad list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-muted-foreground" />
            <h2 className="text-sm font-bold">{team.name}</h2>
          </div>
          <button
            onClick={() => {
              if (compareMode) { setCompareIds([]); }
              else { setCompareMode_on(); }
            }}
            className={cn(
              "tm-tap inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border",
              compareMode ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
            )}
          >
            <GitCompare size={12} />
            {t("tactics.compare")} {compareMode && `(${compareIds.length}/2)`}
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto tm-no-scrollbar">
          {(["ALL", "GK", "DEF", "MID", "FWD"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setFilter(g)}
              className={cn(
                "tm-tap px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border",
                filter === g ? "bg-foreground text-background border-foreground" : "bg-card border-border"
              )}
              style={{ minHeight: 28 }}
            >
              {g === "ALL" ? t("common.all") : t(`pos.${g.toLowerCase()}`)}
            </button>
          ))}
        </div>

        {/* Player list */}
        <div className="tm-card divide-y divide-border">
          {(filter === "ALL" ? team.players : team.players.filter((p) => POSITION_GROUP[p.specificPosition] === filter))
            .slice()
            .sort((a, b) => b.rating - a.rating)
            .map((p) => {
              const isSelected = compareIds.includes(p.id);
              const inLineup = tactics.lineup.some((lp) => lp?.id === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (compareMode && compareIds.length < 2) {
                      setCompareIds((ids) => ids.includes(p.id) ? ids.filter((id) => id !== p.id) : [...ids, p.id]);
                    } else if (compareMode && isSelected) {
                      setCompareIds((ids) => ids.filter((id) => id !== p.id));
                    } else {
                      onPlayerTap(p);
                    }
                  }}
                  className={cn(
                    "tm-tap w-full flex items-center gap-3 p-2.5 text-left transition-colors",
                    isSelected && "bg-primary/5",
                    inLineup && "border-l-2 border-l-emerald-500"
                  )}
                >
                  <PlayerAvatar initials={`${p.firstName[0]}${p.lastName[0]}`} size={32} color={team.primaryColor} />
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

      {/* Compare modal */}
      {comparePair.length === 2 && (
        <CompareCard players={comparePair} teamColor={team.primaryColor} onClose={() => setCompareIds([])} />
      )}

      {/* Player profile modal */}
      {profilePlayer && (
        <PlayerProfileModal
          player={profilePlayer}
          teamColor={team.primaryColor}
          onClose={() => setProfilePlayer(null)}
        />
      )}
    </div>
  );

  function setCompareMode_on() {
    setCompareIds([]);
  }
}

function SliderMini({
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
        <span className="text-[10px] font-medium">{label}</span>
        <span className="text-[10px] font-bold tabular-nums text-primary">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted accent-primary tm-tap"
        style={{ minHeight: 24 }}
      />
    </div>
  );
}

function ToggleChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "tm-tap flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-semibold border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border text-muted-foreground"
      )}
    >
      <span className="text-xs">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function CompareCard({
  players,
  teamColor,
  onClose,
}: {
  players: PlayerT[];
  teamColor: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const rows: { label: string; get: (p: PlayerT) => number | string }[] = [
    { label: "OVR", get: (p) => p.rating },
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
        <button onClick={onClose} className="tm-tap p-1"><X size={14} /></button>
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
              <div className={cn("text-sm font-semibold tabular-nums text-left", aWin && "text-emerald-400")}>{a}</div>
              <div className="text-[10px] text-muted-foreground px-2">{r.label}</div>
              <div className={cn("text-sm font-semibold tabular-nums text-right", bWin && "text-emerald-400")}>{b}</div>
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
  p: PlayerT;
  teamColor: string;
  alignRight?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", alignRight && "flex-row-reverse")}>
      <PlayerAvatar initials={`${p.firstName[0]}${p.lastName[0]}`} size={32} color={teamColor} />
      <div className={cn("min-w-0", alignRight && "text-right")}>
        <div className="text-xs font-semibold truncate">{p.firstName} {p.lastName}</div>
        <div className="text-[10px] text-muted-foreground">{p.specificPosition} · {p.age}</div>
      </div>
    </div>
  );
}
