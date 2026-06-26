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
  DEFAULT_TACTIC,
  TACTICAL_INSTRUCTIONS,
  INSTRUCTION_CATEGORIES,
  type ActiveTactic,
  type Mentality,
  type PassingStyle,
  type InstructionCategory,
} from "@/lib/tactics/types";
import { PlayerAvatar, PositionPill, RatingBadge } from "../ui-bits";
import { PlayerProfileModal } from "../player-profile-modal";
import { TrainingScreen } from "./training";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

// Mevki pozisyon grubuna göre satır arka planı — orta ton (belirgin ama göz yormaz)
const POSITION_ROW_BG: Record<PositionGroup, string> = {
  GK: "bg-amber-100/70 dark:bg-amber-950/30",
  DEF: "bg-sky-100/70 dark:bg-sky-950/30",
  MID: "bg-emerald-100/70 dark:bg-emerald-950/30",
  FWD: "bg-rose-100/70 dark:bg-rose-950/30",
};

// Mevki sıralaması — listelemede önce kaleci, sonra defans, orta saha, forvet
const POSITION_GROUP_ORDER: PositionGroup[] = ["GK", "DEF", "MID", "FWD"];

// Oyuncuları mevkiiye göre sırala — önce GK, DEF, MID, FWD; aynı grupta rating'e göre
function sortByPositionThenRating(players: PlayerT[]): PlayerT[] {
  return players.slice().sort((a, b) => {
    const ga = POSITION_GROUP_ORDER.indexOf(POSITION_GROUP[a.specificPosition]);
    const gb = POSITION_GROUP_ORDER.indexOf(POSITION_GROUP[b.specificPosition]);
    if (ga !== gb) return ga - gb;
    return b.rating - a.rating;
  });
}

export function TacticsScreen() {
  const { t, locale } = useI18n();
  const team = useMyTeam();
  const { tactics, updateActiveTactic, setSlotRole, swapLineupSlot, setInstruction, resetInstruction } = useAppStore();
  const [filter, setFilter] = useState<PositionGroup | "ALL">("ALL");
  const [swapSlot, setSwapSlot] = useState<number | null>(null);
  const [roleSlot, setRoleSlot] = useState<number | null>(null);
  const [profilePlayer, setProfilePlayer] = useState<PlayerT | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Açılır/kapanır toolbox state
  const [labOpen, setLabOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    team: true,
    attacking: false,
    defensive: false,
    set_piece: false,
  });
  // Slot oyuncu seçim modal'ı
  const [slotPicker, setSlotPicker] = useState<number | null>(null);
  // Üst sekme — Diziliş / Oyuncularım / Karşılaştır / Antrenman
  const [topTab, setTopTab] = useState<"lineup" | "squad" | "compare" | "training">("lineup");
  // Formation seçici modal
  const [formationModalOpen, setFormationModalOpen] = useState(false);

  // Eski localStorage verilerinde tactics.active olmayabilir — fallback
  const active = tactics.active ?? DEFAULT_TACTIC;
  const formation = active.formation;
  const slots = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-4-2"];
  const pitchCoords = FORMATION_PITCH[formation] ?? FORMATION_PITCH["4-4-2"];

  // Taktik skoru — 3 alt skor + toplam
  const { score, roleScore, instructionScore, attributeScore, strengths, weaknesses } = useMemo(() => {
    if (!team) return { score: 0, roleScore: 0, instructionScore: 0, attributeScore: 0, strengths: [] as string[], weaknesses: [] as string[] };
    const filled = tactics.lineup.filter((p): p is PlayerT => p !== null);
    if (filled.length === 0) return { score: 0, roleScore: 0, instructionScore: 0, attributeScore: 0, strengths: [], weaknesses: [] };

    const avgOvr = filled.reduce((s, p) => s + p.rating, 0) / filled.length;
    const slotMatch = slots.filter((sp, i) => {
      const p = tactics.lineup[i];
      return p && p.specificPosition === sp;
    }).length / slots.length;
    const sliderBalance =
      100 -
      Math.abs(50 - active.aggression) * 0.1 -
      Math.abs(50 - active.width) * 0.1 -
      Math.abs(50 - active.passingIntensity) * 0.1 -
      Math.abs(50 - active.lineHeight) * 0.1;
    const avgMorale = filled.reduce((s, p) => s + p.morale, 0) / filled.length;

    // Rol uyumu — atanmış rollerin pozisyonla uyumu
    const assignedRoles = Object.entries(tactics.slotRoles).filter(([, id]) => id);
    const roleCompat = assignedRoles.length === 0 ? 50 :
      assignedRoles.filter(([slotIdx, roleId]) => {
        const role = ROLES.find((r) => r.id === roleId);
        const slotPos = slots[Number(slotIdx)];
        return role && role.positions.includes(slotPos);
      }).length / assignedRoles.length * 100;

    // Talimat sinerjisi — çelişen talimatlar var mı
    const instCount = Object.keys(tactics.activeInstructions ?? {}).length;
    const instScore = instCount === 0 ? 50 : Math.min(100, 50 + instCount * 10);

    // Özellik uyumu — oyuncu OVR ile taktik mentalite uyumu
    const attrScore = Math.min(100, avgOvr * 0.7 + (active.mentality >= 3 ? 10 : 0) + avgMorale * 0.2);

    const total = Math.round(
      Math.max(0, Math.min(100, avgOvr * 0.55 + slotMatch * 100 * 0.25 + sliderBalance * 0.1 + avgMorale * 0.1))
    );

    // Güçlü/zayıf yönler
    const st: string[] = [];
    const wk: string[] = [];
    if (slotMatch > 0.8) st.push("Pozisyon uyumu yüksek");
    else if (slotMatch < 0.5) wk.push("Pozisyon uyumu düşük");
    if (avgMorale > 75) st.push("Yüksek takım morali");
    else if (avgMorale < 50) wk.push("Düşük takım morali");
    if (active.pressing) st.push("Pres aktif");
    if (active.offsideTrap) st.push("Ofsayt tuzağı aktif");
    if (roleCompat > 70) st.push("Rol uyumu iyi");
    else if (roleCompat < 40 && assignedRoles.length > 0) wk.push("Rol-pozisyon uyumsuzluğu");
    if (avgOvr > 72) st.push("Kadro kalitesi iyi");
    else if (avgOvr < 65) wk.push("Kadro kalitesi düşük");

    return {
      score: total,
      roleScore: Math.round(roleCompat),
      instructionScore: Math.round(instScore),
      attributeScore: Math.round(attrScore),
      strengths: st,
      weaknesses: wk,
    };
  }, [team, tactics.lineup, tactics.active, tactics.slotRoles, tactics.activeInstructions, slots]);

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
      {/* ===== Üst sekme nav — Diziliş / Oyuncularım / Karşılaştır / Antrenman ===== */}
      <div className="flex border-b border-border bg-card rounded-t-lg">
        {([
          { key: "lineup", label: "Diziliş" },
          { key: "squad", label: `Oyuncularım (${team.players.length})` },
          { key: "compare", label: `Karşılaştır${compareIds.length > 0 ? ` (${compareIds.length}/2)` : ""}` },
          { key: "training", label: "Antrenman" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => { haptic("light"); setTopTab(tab.key); }}
            className={cn(
              "tm-tap flex-1 py-2.5 text-xs font-bold transition-colors relative",
              topTab === tab.key
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {topTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {topTab === "lineup" && (
        <>
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

        {/* Formation seçici — tıklayınca modal açılır */}
        <button
          onClick={() => { haptic("light"); setFormationModalOpen(true); }}
          className="tm-tap w-full flex items-center justify-between px-3 py-2 rounded-md border border-border bg-card hover:bg-accent transition-colors mb-2"
        >
          <div className="flex items-center gap-2">
            <ChevronDown size={14} className="text-muted-foreground" />
            <span className="text-sm font-bold tabular-nums">{formation}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Değiştir</span>
        </button>

        {/* Mentality 5 buton */}
        <div className="flex gap-1">
          {([1, 2, 3, 4, 5] as Mentality[]).map((m) => (
            <button
              key={m}
              onClick={() => updateActiveTactic({ mentality: m })}
              className={cn(
                "tm-tap flex-1 py-1 rounded text-[9px] font-bold transition-colors",
                active.mentality === m
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

      {/* Taktik skoru detayları — 3 alt skor + güçlü/zayıf yönler */}
      <div className="tm-card p-3">
        <div className="grid grid-cols-3 gap-2 mb-2">
          <SubScore label="Rol Uyumu" value={roleScore} />
          <SubScore label="Talimat" value={instructionScore} />
          <SubScore label="Özellik" value={attributeScore} />
        </div>
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div className="space-y-1">
            {strengths.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {strengths.map((s, i) => (
                  <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold">
                    ✓ {s}
                  </span>
                ))}
              </div>
            )}
            {weaknesses.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {weaknesses.map((w, i) => (
                  <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 font-semibold">
                    ⚠ {w}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
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
        <div className="tm-pitch relative mx-2 my-2 rounded-xl" style={{ aspectRatio: "2 / 3" }}>
          {pitchCoords.map((coord, i) => {
            const p = tactics.lineup[i];
            const slotPos = slots[i];
            const roleId = tactics.slotRoles[i];
            const role = ROLES.find((r) => r.id === roleId);
            const isSwap = swapSlot === i;
            return (
              <button
                key={i}
                onClick={() => { haptic("light"); setSlotPicker(i); }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5",
                  slotPicker === i && "scale-110"
                )}
                style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white border-2",
                    slotPicker === i
                      ? "border-amber-400 ring-2 ring-amber-400/50"
                      : p
                      ? "border-white/70"
                      : "border-yellow-400/70 border-dashed"
                  )}
                  style={{
                    width: 32, height: 32,
                    background: team.primaryColor ?? "#1a3a2a",
                  }}
                >
                  {p ? p.rating : slotPos}
                </span>
                <span className="text-[8px] text-white font-semibold drop-shadow max-w-[60px] truncate text-center">
                  {p ? `${p.firstName[0]}. ${p.lastName}` : "Boş"}
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

      {/* Slot oyuncu seçim modal'ı */}
      {slotPicker !== null && (
        <SlotPlayerPicker
          slotIndex={slotPicker}
          slotPos={slots[slotPicker]}
          team={team}
          lineup={tactics.lineup}
          onPick={(playerId) => {
            haptic("success");
            swapLineupSlot(slotPicker, playerId);
            setSlotPicker(null);
          }}
          onClear={() => {
            haptic("light");
            // Slot'u boşalt
            const newLineup = [...tactics.lineup];
            newLineup[slotPicker] = null;
            useAppStore.setState({
              tactics: { ...tactics, lineup: newLineup },
            });
            setSlotPicker(null);
          }}
          onRoleClick={() => {
            setRoleSlot(slotPicker);
            setSlotPicker(null);
          }}
          onClose={() => setSlotPicker(null)}
        />
      )}

      {/* Tactical Lab — tüm slider + toggle'lar (açılır/kapanır) */}
      <div className="tm-card overflow-hidden">
        <button
          onClick={() => { haptic("light"); setLabOpen(!labOpen); }}
          className="tm-tap w-full flex items-center justify-between px-3 py-2.5"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-muted-foreground" />
            <span className="text-xs font-bold">{t("tactics.tactical_lab")}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Aktif ayar sayısı özeti */}
            <span className="text-[9px] text-muted-foreground">
              {(active.pressing ? 1 : 0) + (active.parkTheBus ? 1 : 0) + (active.offsideTrap ? 1 : 0) +
               (active.crossGame ? 1 : 0) + (active.screenKeeper ? 1 : 0) + (active.wasteTime ? 1 : 0) +
               (active.loneStrikerCounter ? 1 : 0)} aktif
            </span>
            <ChevronDown
              size={14}
              className={cn("text-muted-foreground transition-transform", labOpen && "rotate-180")}
            />
          </div>
        </button>

        {labOpen && (
          <div className="px-3 pb-3 border-t border-border">
            {/* Sliders — 2x2 grid */}
            <div className="grid grid-cols-2 gap-3 mt-3 mb-3">
              <SliderMini label={t("tactics.aggression")} value={active.aggression} onChange={(v) => updateActiveTactic({ aggression: v })} />
              <SliderMini label={t("tactics.width")} value={active.width} onChange={(v) => updateActiveTactic({ width: v })} />
              <SliderMini label={t("tactics.passingIntensity")} value={active.passingIntensity} onChange={(v) => updateActiveTactic({ passingIntensity: v })} />
              <SliderMini label={t("tactics.lineHeight")} value={active.lineHeight} onChange={(v) => updateActiveTactic({ lineHeight: v })} />
            </div>

            {/* Toggles — 7 toggle */}
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              <ToggleChip label={t("tactics.pressing")} icon="🔥" active={active.pressing} onClick={() => updateActiveTactic({ pressing: !active.pressing })} />
              <ToggleChip label={t("tactics.parkTheBus")} icon="🚌" active={active.parkTheBus} onClick={() => updateActiveTactic({ parkTheBus: !active.parkTheBus })} />
              <ToggleChip label={t("tactics.wasteTime")} icon="⏰" active={active.wasteTime} onClick={() => updateActiveTactic({ wasteTime: !active.wasteTime })} />
              <ToggleChip label={t("tactics.offsideTrap")} icon="🪤" active={active.offsideTrap} onClick={() => updateActiveTactic({ offsideTrap: !active.offsideTrap })} />
              <ToggleChip label={t("tactics.screenKeeper")} icon="🎯" active={active.screenKeeper} onClick={() => updateActiveTactic({ screenKeeper: !active.screenKeeper })} />
              <ToggleChip label={t("tactics.crossGame")} icon="⚔️" active={active.crossGame} onClick={() => updateActiveTactic({ crossGame: !active.crossGame })} />
              <ToggleChip label={t("tactics.loneStrikerCounter")} icon="⚡" active={active.loneStrikerCounter} onClick={() => updateActiveTactic({ loneStrikerCounter: !active.loneStrikerCounter })} />
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
                        active.passingStyle === ps
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
                        active.playStyle === ps.id
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
        )}
      </div>

      {/* Tactical Instructions — 20 talimat, 4 kategori (açılır/kapanır) */}
      <div className="tm-card overflow-hidden">
        <button
          onClick={() => { haptic("light"); setInstructionsOpen(!instructionsOpen); }}
          className="tm-tap w-full flex items-center justify-between px-3 py-2.5"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-muted-foreground" />
            <span className="text-xs font-bold">{t("tactics.instructions")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground">
              {Object.keys(tactics.activeInstructions ?? {}).length} aktif
            </span>
            <ChevronDown
              size={14}
              className={cn("text-muted-foreground transition-transform", instructionsOpen && "rotate-180")}
            />
          </div>
        </button>

        {instructionsOpen && (
          <div className="px-3 pb-3 border-t border-border space-y-1">
            {INSTRUCTION_CATEGORIES.map((cat) => {
              const catInstructions = TACTICAL_INSTRUCTIONS.filter((i) => i.category === cat.key);
              const isCatOpen = openCategories[cat.key];
              const activeCount = catInstructions.filter(
                (i) => tactics.activeInstructions?.[i.name]
              ).length;
              return (
                <div key={cat.key} className="border-b border-border/50 last:border-b-0">
                  <button
                    onClick={() => {
                      haptic("light");
                      setOpenCategories((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }));
                    }}
                    className="tm-tap w-full flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wide">{cat.label[locale]}</span>
                      {activeCount > 0 && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-primary/20 text-primary font-bold">
                          {activeCount}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      size={12}
                      className={cn("text-muted-foreground transition-transform", isCatOpen && "rotate-180")}
                    />
                  </button>
                  {isCatOpen && (
                    <div className="grid grid-cols-2 gap-1.5 pb-2">
                      {catInstructions.map((inst) => {
                        const selected = tactics.activeInstructions?.[inst.name];
                        return (
                          <div key={inst.name} className="flex flex-col">
                            <div className="text-[9px] text-foreground/80 mb-0.5 truncate">{inst.name}</div>
                            <div className="flex gap-0.5">
                              {inst.options.map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => {
                                    haptic("light");
                                    if (selected === opt) {
                                      resetInstruction(inst.name);
                                    } else {
                                      setInstruction(inst.name, opt);
                                    }
                                  }}
                                  className={cn(
                                    "tm-tap flex-1 px-1 py-1 rounded text-[8px] font-bold border transition-colors",
                                    selected === opt
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-card border-border text-muted-foreground"
                                  )}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
        </>
      )}

      {topTab === "squad" && (
      <>
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
          {sortByPositionThenRating(
            filter === "ALL" ? team.players : team.players.filter((p) => POSITION_GROUP[p.specificPosition] === filter)
          ).map((p) => {
              const isSelected = compareIds.includes(p.id);
              const inLineup = tactics.lineup.some((lp) => lp?.id === p.id);
              const posGroup = POSITION_GROUP[p.specificPosition];
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
                    POSITION_ROW_BG[posGroup],
                    isSelected && "bg-primary/10",
                    inLineup && "border-l-2 border-l-emerald-500"
                  )}
                >
                  <PlayerAvatar initials={p.specificPosition} size={32} color={team.primaryColor} />
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

      {topTab === "compare" && (
        <CompareTab
          team={team}
          compareIds={compareIds}
          setCompareIds={setCompareIds}
          onPlayerTap={onPlayerTap}
          t={t}
          locale={locale}
        />
      )}

      {topTab === "training" && (
        <div className="-mx-3 -my-3">
          <TrainingScreen />
        </div>
      )}

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

      {/* Formation seçici modal */}
      {formationModalOpen && (
        <FormationPickerModal
          current={formation}
          onPick={(f) => {
            haptic("success");
            updateActiveTactic({ formation: f });
            setFormationModalOpen(false);
          }}
          onClose={() => setFormationModalOpen(false)}
        />
      )}
    </div>
  );

  function setCompareMode_on() {
    setCompareIds([]);
  }
}

// ===== Formation seçici modal =====
function FormationPickerModal({
  current,
  onPick,
  onClose,
}: {
  current: string;
  onPick: (formation: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="close" />
      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold">Formasyon Seç</h3>
          <button onClick={onClose} className="tm-tap p-1">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto tm-thin-scrollbar p-3">
          <div className="grid grid-cols-3 gap-2">
            {FORMATIONS_14.map((f) => {
              const isSelected = f === current;
              return (
                <button
                  key={f}
                  onClick={() => onPick(f)}
                  className={cn(
                    "tm-tap py-3 rounded-md text-sm font-bold tabular-nums border-2 transition-colors flex flex-col items-center gap-1",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-base">{f}</span>
                  {isSelected && (
                    <span className="text-[8px] font-semibold opacity-80">SEÇİLİ</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Compare tab — 2 oyuncu seç + karşılaştır =====
function CompareTab({
  team,
  compareIds,
  setCompareIds,
  onPlayerTap,
  t,
  locale,
}: {
  team: import("@/lib/mock/data").Team;
  compareIds: string[];
  setCompareIds: React.Dispatch<React.SetStateAction<string[]>>;
  onPlayerTap: (p: PlayerT) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: "tr" | "en";
}) {
  const [filter, setFilter] = useState<PositionGroup | "ALL">("ALL");

  const filteredPlayers = sortByPositionThenRating(
    filter === "ALL"
      ? team.players
      : team.players.filter((p) => POSITION_GROUP[p.specificPosition] === filter)
  );

  const comparePair = compareIds.length === 2
    ? compareIds.map((id) => team.players.find((p) => p.id === id)).filter(Boolean) as PlayerT[]
    : [];

  return (
    <div className="space-y-3">
      {/* Bilgi kartı */}
      <div className="tm-card p-3 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2">
          <GitCompare size={14} className="text-primary" />
          <span className="text-xs font-bold">Karşılaştırma Modu</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          2 oyuncu seç, yan yana tüm stat'ları karşılaştır. {compareIds.length}/2 seçili.
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 overflow-x-auto tm-no-scrollbar">
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

      {/* Seçili oyuncular kartları */}
      {compareIds.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {compareIds.map((id, slot) => {
            const p = team.players.find((pl) => pl.id === id);
            return (
              <div key={id} className="tm-card p-2 border-primary/30 relative">
                <button
                  onClick={() => setCompareIds((ids) => ids.filter((x) => x !== id))}
                  className="tm-tap absolute top-1 right-1 p-0.5 text-muted-foreground"
                  aria-label="Kaldır"
                >
                  <X size={11} />
                </button>
                {p ? (
                  <div className="flex flex-col items-center text-center">
                    <PlayerAvatar
                      initials={p.specificPosition}
                      color={team.primaryColor}
                      size={36}
                    />
                    <div className="text-[10px] font-bold mt-1 truncate w-full">
                      {p.firstName} {p.lastName}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <PositionPill label={p.specificPosition} group={POSITION_GROUP[p.specificPosition]} />
                      <span className="text-[9px] text-muted-foreground">{p.age}{t("common.year")}</span>
                    </div>
                    <div className="text-xs font-bold text-amber-300 mt-0.5">{p.rating}</div>
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground text-center py-4">
                    Slot {slot + 1} — boş
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Player list — seçim için */}
      <div className="tm-card divide-y divide-border">
        {filteredPlayers.map((p) => {
          const isSelected = compareIds.includes(p.id);
          const selectedSlot = compareIds.indexOf(p.id);
          const posGroup = POSITION_GROUP[p.specificPosition];
          return (
            <button
              key={p.id}
              onClick={() => {
                haptic("light");
                setCompareIds((ids) => {
                  if (ids.includes(p.id)) return ids.filter((x) => x !== p.id);
                  if (ids.length >= 2) return [...ids.slice(1), p.id];
                  return [...ids, p.id];
                });
              }}
              className={cn(
                "tm-tap w-full flex items-center gap-3 p-2.5 text-left transition-colors",
                POSITION_ROW_BG[posGroup],
                isSelected && "bg-primary/10"
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
                {isSelected ? (
                  <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold">
                    {selectedSlot + 1}
                  </span>
                ) : (
                  <RatingBadge value={p.formRating} />
                )}
                {!isSelected && (
                  <div className="text-[9px] text-muted-foreground mt-0.5">
                    {p.specificPosition === "GK" ? `${p.saves}K` : `${p.goals}G·${p.assists}A`}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* CompareCard modal — 2 oyuncu seçilince gösterilir */}
      {comparePair.length === 2 && (
        <CompareCard players={comparePair} teamColor={team.primaryColor} onClose={() => setCompareIds([])} />
      )}
    </div>
  );
}

// ===== Slot oyuncu seçim modal'ı =====
function SlotPlayerPicker({
  slotIndex,
  slotPos,
  team,
  lineup,
  onPick,
  onClear,
  onRoleClick,
  onClose,
}: {
  slotIndex: number;
  slotPos: string;
  team: { id: string; name: string; shortName: string; primaryColor: string; players: PlayerT[] };
  lineup: (PlayerT | null)[];
  onPick: (playerId: string) => void;
  onClear: () => void;
  onRoleClick: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const [showAll, setShowAll] = useState(false);

  // Slot pozisyonuna göre grup belirle
  const slotGroup = POSITION_GROUP[slotPos as keyof typeof POSITION_GROUP] ?? "MID";

  // Mevcut oyuncu
  const current = lineup[slotIndex];
  const usedIds = new Set(lineup.filter((p): p is PlayerT => p !== null).map((p) => p.id));

  // Ait olduğu gruptaki oyuncular (önerilenler) + diğerleri
  const sameGroup = team.players
    .filter((p) => !usedIds.has(p.id) || p.id === current?.id)
    .filter((p) => POSITION_GROUP[p.specificPosition] === slotGroup)
    .sort((a, b) => b.rating - a.rating);

  const otherGroup = team.players
    .filter((p) => !usedIds.has(p.id) || p.id === current?.id)
    .filter((p) => POSITION_GROUP[p.specificPosition] !== slotGroup)
    .sort((a, b) => b.rating - a.rating);

  const candidates = showAll ? [...sameGroup, ...otherGroup] : sameGroup;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h3 className="text-sm font-bold">Slot {slotIndex + 1} — {slotPos}</h3>
            <p className="text-[10px] text-muted-foreground">
              {current ? `Şu an: ${current.firstName} ${current.lastName}` : "Boş slot"}
            </p>
          </div>
          <button onClick={onClose} className="tm-tap p-1">
            <X size={16} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5 p-2 border-b border-border">
          <button
            onClick={onRoleClick}
            className="tm-tap flex-1 py-1.5 rounded text-[10px] font-bold border border-border bg-card"
          >
            🎭 Rol Seç
          </button>
          {current && (
            <button
              onClick={onClear}
              className="tm-tap flex-1 py-1.5 rounded text-[10px] font-bold border border-red-500/30 bg-red-500/10 text-red-400"
            >
              ✕ Boşalt
            </button>
          )}
          <button
            onClick={() => setShowAll(!showAll)}
            className={cn(
              "tm-tap flex-1 py-1.5 rounded text-[10px] font-bold border",
              showAll ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"
            )}
          >
            {showAll ? "Sadece Önerilen" : "Tümünü Göster"}
          </button>
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto tm-thin-scrollbar p-2 space-y-1">
          {candidates.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-6">
              Uygun oyuncu yok
            </div>
          )}
          {candidates.map((p) => {
            const isCurrent = current?.id === p.id;
            const isUsed = usedIds.has(p.id) && !isCurrent;
            return (
              <button
                key={p.id}
                onClick={() => !isUsed && onPick(p.id)}
                disabled={isUsed}
                className={cn(
                  "tm-tap w-full flex items-center gap-2.5 p-2.5 rounded-md border text-left",
                  isCurrent ? "bg-primary/10 border-primary" : "bg-card border-border",
                  isUsed && "opacity-40"
                )}
              >
                <PlayerAvatar
                  initials={p.specificPosition}
                  color={team.primaryColor}
                  size={32}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold truncate">
                      {p.firstName} {p.lastName}
                    </span>
                    <PositionPill label={p.specificPosition} group={POSITION_GROUP[p.specificPosition]} />
                    {isCurrent && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-primary text-primary-foreground font-bold">
                        SEÇİLİ
                      </span>
                    )}
                    {isUsed && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                        Başka slotta
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {p.age}{t("common.year")} · {p.archetype ?? "—"} · Kondisyon {p.cond}%
                  </div>
                </div>
                <div className="text-right">
                  <RatingBadge value={p.formRating} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SubScore({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "text-emerald-400" : value >= 50 ? "text-amber-400" : "text-red-400";
  const barColor = value >= 70 ? "bg-emerald-500" : value >= 50 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="text-center">
      <div className="text-[8px] text-muted-foreground uppercase mb-0.5">{label}</div>
      <div className={cn("text-lg font-bold tabular-nums", color)}>{value}</div>
      <div className="h-1 rounded-full bg-muted overflow-hidden mt-0.5">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
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
      <PlayerAvatar initials={p.specificPosition} size={32} color={teamColor} />
      <div className={cn("min-w-0", alignRight && "text-right")}>
        <div className="text-xs font-semibold truncate">{p.firstName} {p.lastName}</div>
        <div className="text-[10px] text-muted-foreground">{p.specificPosition} · {p.age}</div>
      </div>
    </div>
  );
}
