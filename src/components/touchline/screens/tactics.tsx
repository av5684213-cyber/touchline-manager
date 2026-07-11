"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  GitCompare,
  Info,
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
import { PositionPill, RatingBadge, GrowthBadge } from "../ui-bits";
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
  // Yedek kulübesinden oyuncu seçip slota yerleştirme modu
  const [benchModeSlot, setBenchModeSlot] = useState<string | null>(null);
  // Üst sekme — Diziliş / Oyuncularım / Karşılaştır / Antrenman
  const [topTab, setTopTab] = useState<"lineup" | "squad" | "compare" | "training">("lineup");
  // Formation seçici modal
  const [formationModalOpen, setFormationModalOpen] = useState(false);

  // Eski localStorage verilerinde tactics.active olmayabilir — fallback
  const active = tactics.active ?? DEFAULT_TACTIC;
  const formation = active.formation;
  const slots = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-4-2"];
  const pitchCoords = FORMATION_PITCH[formation] ?? FORMATION_PITCH["4-4-2"];

  // Yedek kulübesi — lineup'ta olmayan tüm oyuncular (rating'e göre sıralı)
  // FIX: is_injured filtresi kaldırıldı — sakat oyuncular da yedekte görünsün (2D saha ile uyumlu)
  const benchPlayers = useMemo(() => {
    if (!team) return [];
    const lineupIds = new Set(tactics.lineup.filter((p): p is PlayerT => p !== null).map((p) => p.id));
    return team.players
      .filter((p) => !lineupIds.has(p.id))
      .sort((a, b) => b.rating - a.rating);
  }, [team, tactics.lineup]);

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
          {/* SVG saha çizgileri */}
          <div className="tm-pitch-lines">
            <svg viewBox="0 0 100 150" preserveAspectRatio="none">
              <g fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5">
                {/* Saha kenar çizgisi */}
                <rect x="2" y="2" width="96" height="146" rx="1" />
                {/* Orta çizgi */}
                <line x1="2" y1="75" x2="98" y2="75" />
                {/* Orta daire */}
                <circle cx="50" cy="75" r="12" />
                {/* Orta nokta */}
                <circle cx="50" cy="75" r="0.6" fill="rgba(255,255,255,0.5)" />
                {/* Alt ceza alanı (kaleci tarafı) */}
                <rect x="20" y="2" width="60" height="20" />
                {/* Alt kale alanı */}
                <rect x="35" y="2" width="30" height="8" />
                {/* Alt penaltı noktası */}
                <circle cx="50" cy="17" r="0.6" fill="rgba(255,255,255,0.5)" />
                {/* Alt kale yayı */}
                <path d="M 38 22 A 12 12 0 0 0 62 22" />
                {/* Üst ceza alanı (forvet tarafı) */}
                <rect x="20" y="128" width="60" height="20" />
                {/* Üst kale alanı */}
                <rect x="35" y="140" width="30" height="8" />
                {/* Üst penaltı noktası */}
                <circle cx="50" cy="133" r="0.6" fill="rgba(255,255,255,0.5)" />
                {/* Üst kale yayı */}
                <path d="M 38 128 A 12 12 0 0 1 62 128" />
                {/* Alt kale */}
                <line x1="42" y1="2" x2="58" y2="2" strokeWidth="1" />
                {/* Üst kale */}
                <line x1="42" y1="148" x2="58" y2="148" strokeWidth="1" />
                {/* Köşe yayları */}
                <path d="M 2 5 A 3 3 0 0 1 5 2" />
                <path d="M 95 2 A 3 3 0 0 1 98 5" />
                <path d="M 2 145 A 3 3 0 0 0 5 148" />
                <path d="M 95 148 A 3 3 0 0 0 98 145" />
              </g>
            </svg>
          </div>
          {/* Oyuncular */}
          {pitchCoords.map((coord, i) => {
            // FIX: lineup'tan ID al, team.players'dan gerçek oyuncuyu bul — referans tutarsızlığını önle
            const lineupPlayer = tactics.lineup[i];
            const p = lineupPlayer ? team?.players.find(tp => tp.id === lineupPlayer.id) ?? lineupPlayer : null;
            const slotPos = slots[i];
            const roleId = tactics.slotRoles[i];
            const role = ROLES.find((r) => r.id === roleId);
            const isSwap = swapSlot === i;
            const isInjured = p?.is_injured === true;
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
                    "inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white border-2 relative",
                    slotPicker === i
                      ? "border-amber-400 ring-2 ring-amber-400/50"
                      : p
                      ? isInjured
                        ? "border-red-500 ring-2 ring-red-500/40"
                        : "border-white/70"
                      : "border-yellow-400/70 border-dashed"
                  )}
                  style={{
                    width: 32, height: 32,
                    background: team.primaryColor ?? "#1a3a2a",
                  }}
                >
                  {p ? p.rating : slotPos}
                  {/* P2: Sakat ikonu — sağ üstte küçük 🤕 */}
                  {isInjured && (
                    <span className="absolute -top-1 -right-1 text-[9px] bg-red-500 rounded-full w-3.5 h-3.5 flex items-center justify-center" title="Sakat">
                      🤕
                    </span>
                  )}
                </span>
                <span className="text-[8px] text-white font-semibold drop-shadow max-w-[60px] truncate text-center">
                  {p ? `${p.firstName} ${p.lastName}` : "Boş"}
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

        {/* Slot role picker (seçili slot için) — liste biçiminde, faydalarıyla */}
        {roleSlot !== null && (
          <div className="p-2 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] text-muted-foreground">
                {t("tactics.slot_role")} — {slots[roleSlot]}
              </div>
              <button
                onClick={() => setRoleSlot(null)}
                className="tm-tap text-[10px] text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[260px] overflow-y-auto tm-thin-scrollbar space-y-1">
              <button
                onClick={() => { haptic("light"); setSlotRole(roleSlot, ""); }}
                className={cn(
                  "tm-tap w-full px-2.5 py-2 rounded text-[11px] font-semibold border text-left flex items-center gap-2",
                  !tactics.slotRoles[roleSlot]
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-accent/50"
                )}
              >
                <span className="text-base">🚫</span>
                <span>{t("tactics.no_role")}</span>
              </button>
              {getCompatibleRoles(slots[roleSlot]).map((r) => {
                const isSel = tactics.slotRoles[roleSlot] === r.id;
                // Rol faydaları (id bazlı)
                const benefit = ROLE_BENEFITS[r.id] ?? { att: 50, def: 50, style: [], desc: "" };
                const att = benefit.att;
                const def = benefit.def;
                const attLabel = att >= 70 ? "Yüksek" : att >= 40 ? "Orta" : "Düşük";
                const defLabel = def >= 70 ? "Yüksek" : def >= 40 ? "Orta" : "Düşük";
                const attColor = att >= 70 ? "text-emerald-400" : att >= 40 ? "text-amber-400" : "text-red-400";
                const defColor = def >= 70 ? "text-emerald-400" : def >= 40 ? "text-amber-400" : "text-red-400";
                return (
                  <button
                    key={r.id}
                    onClick={() => { haptic("light"); setSlotRole(roleSlot, r.id); }}
                    className={cn(
                      "tm-tap w-full px-2.5 py-2 rounded text-[11px] font-semibold border text-left",
                      isSel
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{r.icon}</span>
                      <span className="flex-1">{r.name}</span>
                      {isSel && <span className="text-[9px]">✓</span>}
                    </div>
                    {/* Maç motoru faydaları */}
                    <div className={cn("mt-1.5 flex flex-wrap gap-1.5", isSel ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      <span className="text-[8px] flex items-center gap-0.5">
                        <span>⚔️</span>
                        <span className={cn("font-bold", !isSel && attColor)}>{attLabel}</span>
                        <span className="opacity-60">hücum</span>
                      </span>
                      <span className="text-[8px] flex items-center gap-0.5">
                        <span>🛡️</span>
                        <span className={cn("font-bold", !isSel && defColor)}>{defLabel}</span>
                        <span className="opacity-60">savunma</span>
                      </span>
                      {benefit.style.map((s) => (
                        <span key={s.name} className={cn("text-[8px] flex items-center gap-0.5", s.val > 0 ? "" : "opacity-50")}>
                          <span>{s.val > 0 ? "+" : ""}{s.val}%</span>
                          <span className="opacity-60">{s.name}</span>
                        </span>
                      ))}
                    </div>
                    {/* Kısa açıklama */}
                    {benefit.desc && (
                      <div className={cn("mt-1 text-[9px] leading-tight", isSel ? "text-primary-foreground/70" : "text-muted-foreground/80")}>
                        {benefit.desc}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Yedek Kulübesi — 2D sahanın altında, tıklayınca ilk 11 slot seçimi */}
      <div className="tm-card overflow-hidden">
        <div className="px-3 pt-2 pb-1.5 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-muted-foreground" />
            <span className="text-xs font-bold">Yedek Kulübesi</span>
          </div>
          <span className="text-[9px] text-muted-foreground">
            {benchPlayers.length} oyuncu · tıkla → slota yerleştir
          </span>
        </div>
        {benchModeSlot !== null ? (
          // Bench'ten bir oyuncu seçildi → hangi slota yerleştireceğini sor
          <div className="p-2.5 bg-amber-500/5 border-b border-amber-500/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-amber-300">
                {benchPlayers.find(p => p.id === benchModeSlot)?.firstName} {benchPlayers.find(p => p.id === benchModeSlot)?.lastName} → hangi slota?
              </span>
              <button
                onClick={() => { haptic("light"); setBenchModeSlot(null); }}
                className="tm-tap text-[10px] text-muted-foreground hover:text-foreground"
              >
                ✕ İptal
              </button>
            </div>
            <div className="text-[9px] text-muted-foreground mb-2">
              İlk 11'den bir slota tıkla, oyuncu oraya yerleşsin (mevcut oyuncu yedeğe düşer).
            </div>
            {/* Hızlı slot seçimi — 11 slot buton olarak */}
            <div className="grid grid-cols-6 gap-1">
              {slots.map((slotPos, i) => {
                // FIX: team.players'dan ID bazlı bul
                const lineupP = tactics.lineup[i];
                const current = lineupP ? team?.players.find(tp => tp.id === lineupP.id) ?? lineupP : null;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      haptic("success");
                      swapLineupSlot(i, benchModeSlot);
                      setBenchModeSlot(null);
                    }}
                    className="tm-tap py-1 px-1 rounded text-[9px] font-bold border bg-card border-border hover:bg-accent/50 transition-colors flex flex-col items-center gap-0.5"
                  >
                    <span className="text-[8px] text-muted-foreground">{slotPos}</span>
                    <span className="text-[9px] truncate max-w-[50px]">
                      {current ? `${current.firstName} ${current.lastName}` : "Boş"}
                    </span>
                    {current && (
                      <span className="text-[8px] tabular-nums text-amber-300">{current.rating}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          // Yedek oyuncu listesi — yatay kaydırılabilir
          <div className="px-2 py-2 overflow-x-auto tm-no-scrollbar">
            <div className="flex gap-1.5 min-w-min">
              {benchPlayers.length === 0 && (
                <div className="text-[10px] text-muted-foreground text-center py-3 w-full">
                  Tüm oyuncular ilk 11'de — yedek yok.
                </div>
              )}
              {benchPlayers.map((p) => {
                const posGroup = POSITION_GROUP[p.specificPosition] ?? "MID";
                const roleId = tactics.slotRoles[Object.keys(tactics.slotRoles).find(k => tactics.lineup[Number(k)]?.id === p.id) ?? "-1"];
                return (
                  <button
                    key={p.id}
                    onClick={() => { haptic("light"); setBenchModeSlot(p.id); }}
                    className={cn(
                      "tm-tap shrink-0 w-[68px] flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-md border-2 transition-colors",
                      "hover:border-primary/50 hover:bg-accent/30",
                      POSITION_ROW_BG[posGroup],
                    )}
                  >
                    <span
                      className="inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white border border-white/30"
                      style={{
                        width: 28, height: 28,
                        background: team.primaryColor ?? "#1a3a2a",
                      }}
                    >
                      {p.rating}
                    </span>
                    <span className="text-[8px] font-semibold truncate w-full text-center">
                      {p.firstName} {p.lastName}
                    </span>
                    <span className="text-[7px] text-muted-foreground">{p.specificPosition}</span>
                    {(p.cond ?? 100) < 50 && (
                      <span className="text-[7px] text-red-400 font-bold">{p.cond}❤</span>
                    )}
                    {p.is_injured && (
                      <span className="text-[7px] text-red-400 font-bold">🤕</span>
                    )}
                  </button>
                );
              })}
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
            // KAPANMAYACAK — rol seçimi picker içinde inline yapılır
            // setSlotPicker(null) YAPMA
            haptic("light");
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
                    <div className="flex items-center gap-1 justify-end">
                      <RatingBadge value={p.formRating} />
                      <GrowthBadge currentRating={p.rating} playerId={p.id} />
                    </div>
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
                  <div className="flex items-center gap-1 justify-end">
                    <RatingBadge value={p.formRating} />
                    <GrowthBadge currentRating={p.rating} playerId={p.id} />
                  </div>
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
  onShowProfile,
}: {
  slotIndex: number;
  slotPos: string;
  team: { id: string; name: string; shortName: string; primaryColor: string; players: PlayerT[] };
  lineup: (PlayerT | null)[];
  onPick: (playerId: string) => void;
  onClear: () => void;
  onRoleClick: () => void;
  onClose: () => void;
  onShowProfile?: (player: PlayerT) => void;
}) {
  const { t, locale } = useI18n();
  const [showAll, setShowAll] = useState(false);
  // INLINE mod: "players" (oyuncu listesi) | "roles" (rol listesi) — picker KAPANMAZ
  const [mode, setMode] = useState<"players" | "roles">("players");

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

  // Mevcut rol
  const currentRole = useAppStore.getState().tactics.slotRoles[slotIndex] ?? "";

  // Pozisyona göre gösterilecek stat'lar
  const getPosStats = (p: PlayerT): string => {
    const pos = p.specificPosition;
    const s = p.stats;
    if (["ST", "CF"].includes(pos)) return `Şut:${s.shooting} Bit:${(p as any).finishing ?? s.shooting}`;
    if (["LW", "RW", "LM", "RM"].includes(pos)) return `Drib:${s.dribbling} Hız:${s.pace}`;
    if (["CAM", "CM"].includes(pos)) return `Pas:${s.passing} Tek:${s.dribbling}`;
    if (pos === "CDM") return `Def:${s.defending} Pas:${s.passing}`;
    if (["CB"].includes(pos)) return `Def:${s.defending} Fiz:${s.physical}`;
    if (["LB", "RB"].includes(pos)) return `Def:${s.defending} Hız:${s.pace}`;
    if (pos === "GK") return `Kale:${(p as any).goalkeeping ?? 50}`;
    return `Pas:${s.passing} Def:${s.defending}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold">Slot {slotIndex + 1} — {slotPos}</h3>
            <p className="text-[10px] text-muted-foreground truncate">
              {current ? `Şu an: ${current.firstName} ${current.lastName}` : "Boş slot"}
            </p>
          </div>
          {current && onShowProfile && (
            <button
              onClick={() => { haptic("light"); onShowProfile(current); }}
              className="tm-tap p-1.5 mr-1 rounded-full border border-sky-500/40 bg-sky-500/10 text-sky-400"
              title="Oyuncu kartını aç"
            >
              <Info size={14} />
            </button>
          )}
          <button onClick={onClose} className="tm-tap p-1">
            <X size={16} />
          </button>
        </div>

        {/* INLINE TAB: Oyuncular / Roller — picker KAPANMAZ */}
        <div className="flex gap-1 p-2 border-b border-border">
          <button
            onClick={() => { haptic("light"); setMode("players"); }}
            className={cn(
              "tm-tap flex-1 py-1.5 rounded text-[10px] font-bold border",
              mode === "players" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground"
            )}
          >
            👥 Oyuncular
          </button>
          <button
            onClick={() => { haptic("light"); setMode("roles"); }}
            className={cn(
              "tm-tap flex-1 py-1.5 rounded text-[10px] font-bold border",
              mode === "roles" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground"
            )}
          >
            🎭 Rol {currentRole ? "✓" : ""}
          </button>
        </div>

        {/* Player list — ince satırlar, OVR + pozisyon stats */}
        {mode === "players" && (
          <>
            {/* Filter buttons */}
            <div className="flex gap-1.5 px-2 py-1.5 border-b border-border">
              {current && (
                <button
                  onClick={onClear}
                  className="tm-tap flex-1 py-1 rounded text-[9px] font-bold border border-red-500/30 bg-red-500/10 text-red-400"
                >
                  ✕ Boşalt
                </button>
              )}
              <button
                onClick={() => setShowAll(!showAll)}
                className={cn(
                  "tm-tap flex-1 py-1 rounded text-[9px] font-bold border",
                  showAll ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"
                )}
              >
                {showAll ? "Sadece Önerilen" : "Tümünü Göster"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto tm-thin-scrollbar px-1.5 py-1 space-y-0.5">
              {candidates.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-6">
                  Uygun oyuncu yok
                </div>
              )}
              {candidates.map((p) => {
                const isCurrent = current?.id === p.id;
                const isUsed = usedIds.has(p.id) && !isCurrent;
                const isInjured = p.is_injured === true;
                const isDisabled = isUsed || isInjured;
                return (
                  <button
                    key={p.id}
                    onClick={() => !isDisabled && onPick(p.id)}
                    disabled={isDisabled}
                    className={cn(
                      "tm-tap w-full flex items-center gap-2 py-1.5 px-2 rounded border text-left",
                      isCurrent ? "bg-primary/10 border-primary" : "bg-card border-border",
                      isDisabled && "opacity-50",
                      isInjured && "border-red-500/40"
                    )}
                  >
                    {/* OVR — büyük göster */}
                    <div className="shrink-0 w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white relative"
                      style={{ background: p.rating >= 80 ? "#16a34a" : p.rating >= 70 ? "#0891b2" : p.rating >= 60 ? "#d97706" : "#dc2626" }}>
                      {p.rating}
                      {/* P2: Sakat rozeti — sağ üstte */}
                      {isInjured && (
                        <span className="absolute -top-1 -right-1 text-[8px] bg-red-500 rounded-full w-3.5 h-3.5 flex items-center justify-center" title={`Sakat${p.injury?.remaining_days ? ` · ${p.injury.remaining_days}g` : ""}`}>
                          🤕
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold truncate">
                          {p.firstName} {p.lastName}
                        </span>
                        {isCurrent && <span className="text-[7px] px-0.5 py-0 rounded bg-primary text-primary-foreground font-bold">SEÇİLİ</span>}
                        {isUsed && <span className="text-[7px] text-muted-foreground">dolu</span>}
                        {isInjured && <span className="text-[7px] px-0.5 py-0 rounded bg-red-500/20 text-red-400 font-bold">SAKAT{p.injury?.remaining_days ? ` ${p.injury.remaining_days}g` : ""}</span>}
                      </div>
                      {/* Pozisyon stats — ince satır */}
                      <div className="text-[8px] text-muted-foreground truncate">
                        {p.specificPosition} · {getPosStats(p)} · {p.cond}%
                      </div>
                    </div>
                    {/* Form rating */}
                    <div className="shrink-0 text-right">
                      <div className="text-[9px] font-bold tabular-nums text-muted-foreground">{(p.formRating ?? 0).toFixed(1)}</div>
                      <div className="text-[7px] text-muted-foreground">form</div>
                    </div>
                    {/* "i" butonu — profil kartı aç */}
                    {onShowProfile && (
                      <button
                        onClick={(e) => { e.stopPropagation(); haptic("light"); onShowProfile(p); }}
                        className="shrink-0 w-5 h-5 rounded-full border border-border text-[9px] font-bold text-muted-foreground hover:text-primary hover:border-primary/50 flex items-center justify-center"
                        aria-label="Profil"
                      >
                        i
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Role list — INLINE, picker KAPANMAZ */}
        {mode === "roles" && (
          <div className="flex-1 overflow-y-auto tm-thin-scrollbar p-2 space-y-1">
            <button
              onClick={() => { haptic("light"); useAppStore.getState().setSlotRole(slotIndex, ""); }}
              className={cn(
                "tm-tap w-full px-2 py-1.5 rounded text-[11px] font-semibold border text-left flex items-center gap-2",
                !currentRole ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
              )}
            >
              <span className="text-base">🚫</span>
              <span>Rol Yok</span>
              {!currentRole && <span className="ml-auto text-[9px]">✓</span>}
            </button>
            {getCompatibleRoles(slotPos).map((r) => {
              const isSel = currentRole === r.id;
              const benefit = ROLE_BENEFITS[r.id] ?? { att: 50, def: 50, style: [], desc: "" };
              const att = benefit.att;
              const def = benefit.def;
              const attLabel = att >= 70 ? "Yüksek" : att >= 40 ? "Orta" : "Düşük";
              const defLabel = def >= 70 ? "Yüksek" : def >= 40 ? "Orta" : "Düşük";
              const attColor = att >= 70 ? "text-emerald-400" : att >= 40 ? "text-amber-400" : "text-red-400";
              const defColor = def >= 70 ? "text-emerald-400" : def >= 40 ? "text-amber-400" : "text-red-400";
              return (
                <button
                  key={r.id}
                  onClick={() => { haptic("light"); useAppStore.getState().setSlotRole(slotIndex, r.id); }}
                  className={cn(
                    "tm-tap w-full px-2 py-1.5 rounded text-[11px] font-semibold border text-left",
                    isSel ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{r.icon}</span>
                    <span className="flex-1">{r.name}</span>
                    {isSel && <span className="text-[9px]">✓</span>}
                  </div>
                  <div className={cn("mt-0.5 flex flex-wrap gap-1.5", isSel ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    <span className="text-[8px] flex items-center gap-0.5">
                      <span>⚔️</span>
                      <span className={cn("font-bold", !isSel && attColor)}>{attLabel}</span>
                    </span>
                    <span className="text-[8px] flex items-center gap-0.5">
                      <span>🛡️</span>
                      <span className={cn("font-bold", !isSel && defColor)}>{defLabel}</span>
                    </span>
                    {benefit.style.map((s) => (
                      <span key={s.name} className={cn("text-[8px]", s.val > 0 ? "" : "opacity-50")}>
                        {s.val > 0 ? "+" : ""}{s.val}% {s.name}
                      </span>
                    ))}
                  </div>
                  {benefit.desc && (
                    <div className={cn("mt-0.5 text-[9px] leading-tight", isSel ? "text-primary-foreground/70" : "text-muted-foreground/80")}>
                      {benefit.desc}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
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
      <div className={cn("min-w-0", alignRight && "text-right")}>
        <div className="text-xs font-semibold truncate">{p.firstName} {p.lastName}</div>
        <div className="text-[10px] text-muted-foreground">{p.specificPosition} · {p.age}</div>
      </div>
    </div>
  );
}

// ===== Rol maç motoru faydaları =====
type RoleBenefit = {
  att: number;      // 0-100 hücum katkısı
  def: number;      // 0-100 savunma katkısı
  style: { name: string; val: number }[];  // oyun stili uyumları
  desc: string;     // kısa açıklama
};

const ROLE_BENEFITS: Record<string, RoleBenefit> = {
  sweeper_keeper: {
    att: 15, def: 70,
    style: [{ name: "Tiki-Taka", val: 70 }, { name: "Gegenpressing", val: 50 }],
    desc: "Ceza sahası dışına çıkarak savunma arkasını kapatır. Pas oyununa katkı sağlar.",
  },
  shot_stopper: {
    att: 5, def: 85,
    style: [{ name: "Catenaccio", val: 60 }],
    desc: "Müthiş refleksleri ile şutları kurtarır. Klasik kaleci.",
  },
  ball_playing_defender: {
    att: 35, def: 70,
    style: [{ name: "Tiki-Taka", val: 70 }, { name: "Gegenpressing", val: 50 }],
    desc: "Savunmadan topu taşıyarak hücuma katkı sağlar.",
  },
  no_nonsense_cb: {
    att: 10, def: 85,
    style: [{ name: "Catenaccio", val: 70 }],
    desc: "Topu uzaklaştıran, risksiz savunma yapan stoper.",
  },
  offside_trap_cb: {
    att: 20, def: 75,
    style: [{ name: "Gegenpressing", val: 60 }],
    desc: "Ofsayt tuzağı kurarak rakip forveti yakalar.",
  },
  wing_back: {
    att: 60, def: 50,
    style: [{ name: "Wing Play", val: 70 }],
    desc: "Hem savunma hem hücum yapan çabalı bek.",
  },
  inverted_fullback: {
    att: 45, def: 60,
    style: [{ name: "Tiki-Taka", val: 60 }],
    desc: "İçeri kesen, pas oyununa katılan modern bek.",
  },
  libero: {
    att: 40, def: 65,
    style: [{ name: "Counter-Attack", val: 50 }],
    desc: "Savunmadan çıkıp hücuma katılan serbest stoper.",
  },
  deep_lying_playmaker: {
    att: 55, def: 45,
    style: [{ name: "Tiki-Taka", val: 80 }, { name: "Possession", val: 70 }],
    desc: "Derinlerden oyunu yöneten, pas dağıtan playmaker.",
  },
  box_to_box: {
    att: 60, def: 55,
    style: [{ name: "Gegenpressing", val: 70 }],
    desc: "Sahanın başından sonuna koşan, iki yönlü orta saha.",
  },
  mezzala: {
    att: 65, def: 35,
    style: [{ name: "Tiki-Taka", val: 60 }],
    desc: "Yarı kanat — kanata açılan yaratıcı orta saha.",
  },
  defensive_midfielder: {
    att: 20, def: 80,
    style: [{ name: "Catenaccio", val: 70 }],
    desc: "Savunma önünde ekran görevi gören defansif orta saha.",
  },
  advanced_playmaker: {
    att: 75, def: 25,
    style: [{ name: "Tiki-Taka", val: 70 }, { name: "Possession", val: 60 }],
    desc: "Hücumu yönlendiren, asist üreten yaratıcı oyuncu.",
  },
  half_winger: {
    att: 60, def: 35,
    style: [{ name: "Wing Play", val: 60 }],
    desc: "Orta sahadan kanata açılan, hücumu genişleten oyuncu.",
  },
  carrilero: {
    att: 45, def: 50,
    style: [{ name: "Possession", val: 50 }],
    desc: "Sığ orta saha — kanat ve merkez arasında köprü.",
  },
  target_man: {
    att: 70, def: 15,
    style: [{ name: "Wing Play", val: 70 }],
    desc: "Fiziksel gücü ve hava topu ile topu tutan forvet.",
  },
  poacher: {
    att: 80, def: 5,
    style: [{ name: "Counter-Attack", val: 60 }],
    desc: "Ceza sahasında gol atan, fırsatçı forvet.",
  },
};
