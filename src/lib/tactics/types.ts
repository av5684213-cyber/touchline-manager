/**
 * Tactic types — eski oyunun (siyah-beyaz-fc) ActiveTactic şemasıyla birebir.
 * Maç motoru (enhancedMatchEngine) bu şemayı bekler.
 */

export type Mentality = 1 | 2 | 3 | 4 | 5; // 1=Çok Defansif, 3=Dengeli, 5=Tam Hücum
export type Intensity = "low" | "normal" | "high";
export type PassingStyle = "Karışık" | "Kısa" | "Uzun" | "Direkt";

export type ActiveTactic = {
  formation: string;
  tactic_type?: string;
  mentality: Mentality;
  pressing: boolean;
  passingStyle: PassingStyle;
  intensity?: Intensity;
  aggression: number; // 0-100
  width: number; // 0-100
  passingIntensity: number; // 0-100
  lineHeight: number; // 0-100 (defansif hattın yüksekliği)
  screenKeeper: boolean;
  wasteTime: boolean;
  parkTheBus: boolean;
  crossGame: boolean;
  loneStrikerCounter: boolean;
  offsideTrap: boolean;
  playStyle?: string;
};

export const DEFAULT_TACTIC: ActiveTactic = {
  formation: "4-4-2",
  tactic_type: "4-4-2",
  mentality: 3,
  pressing: false,
  passingStyle: "Karışık",
  intensity: "normal",
  aggression: 50,
  width: 50,
  passingIntensity: 50,
  lineHeight: 50,
  screenKeeper: false,
  wasteTime: false,
  parkTheBus: false,
  crossGame: false,
  loneStrikerCounter: false,
  offsideTrap: false,
  playStyle: "dengeli",
};

// 14 formasyon (eski oyunla birebir)
export const FORMATIONS_14 = [
  "4-4-2", "4-3-3", "4-2-3-1", "4-1-4-1", "4-5-1", "4-3-2-1",
  "4-4-1-1", "4-3-1-2", "3-5-2", "3-4-3", "3-1-4-2", "3-3-3-1",
  "5-4-1", "5-3-2",
] as const;

export const PLAY_STYLES = [
  { id: "dengeli", name: "Dengeli", icon: "⚖️" },
  { id: "hucum", name: "Hücum", icon: "⚔️" },
  { id: "savunma", name: "Savunma", icon: "🛡️" },
  { id: "kontra", name: "Kontra", icon: "⚡" },
  { id: "Gegenpressing", name: "Gegenpressing", icon: "🔥" },
  { id: "Tiki-Taka", name: "Tiki-Taka", icon: "⚽" },
  { id: "Catenaccio", name: "Catenaccio", icon: "🧱" },
  { id: "Wing Play", name: "Wing Play", icon: "🦅" },
  { id: "Route One", name: "Route One", icon: "🏹" },
  { id: "High Press", name: "High Press", icon: "_PRESS" },
] as const;

export const MENTALITY_LABELS: Record<Mentality, { tr: string; en: string }> = {
  1: { tr: "Çok Defansif", en: "Very Defensive" },
  2: { tr: "Defansif", en: "Defensive" },
  3: { tr: "Dengeli", en: "Balanced" },
  4: { tr: "Ofansif", en: "Attacking" },
  5: { tr: "Tam Hücum", en: "All Out Attack" },
};

// Formasyon → slot pozisyonları (11 oyuncu)
export const FORMATION_SLOTS: Record<string, string[]> = {
  "4-4-2": ["GK", "RB", "CB", "CB", "LB", "RM", "CM", "CM", "LM", "ST", "ST"],
  "4-3-3": ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "CM", "RW", "ST", "LW"],
  "4-2-3-1": ["GK", "RB", "CB", "CB", "LB", "CDM", "CDM", "CAM", "RW", "ST", "LW"],
  "4-1-4-1": ["GK", "RB", "CB", "CB", "LB", "CDM", "RM", "CM", "CM", "LM", "ST"],
  "4-5-1": ["GK", "RB", "CB", "CB", "LB", "RM", "CM", "CDM", "CM", "LM", "ST"],
  "4-3-2-1": ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "CM", "CAM", "CAM", "ST"],
  "4-4-1-1": ["GK", "RB", "CB", "CB", "LB", "RM", "CM", "CM", "LM", "CF", "ST"],
  "4-3-1-2": ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "CM", "CAM", "ST", "ST"],
  "3-5-2": ["GK", "CB", "CB", "CB", "RM", "CM", "CDM", "CM", "LM", "ST", "ST"],
  "3-4-3": ["GK", "CB", "CB", "CB", "RM", "CM", "CM", "LM", "RW", "ST", "LW"],
  "3-1-4-2": ["GK", "CB", "CB", "CB", "CDM", "RM", "CM", "CM", "LM", "ST", "ST"],
  "3-3-3-1": ["GK", "CB", "CB", "CB", "CM", "CM", "CM", "RW", "CAM", "LW", "ST"],
  "5-4-1": ["GK", "RB", "CB", "CB", "CB", "LB", "RM", "CM", "CM", "LM", "ST"],
  "5-3-2": ["GK", "RB", "CB", "CB", "CB", "LB", "CM", "CM", "CM", "ST", "ST"],
};

export type PitchCoord = { x: number; y: number };

export const FORMATION_PITCH: Record<string, PitchCoord[]> = {
  "4-4-2": [
    { x: 50, y: 92 }, { x: 12, y: 75 }, { x: 36, y: 78 }, { x: 64, y: 78 }, { x: 88, y: 75 },
    { x: 14, y: 50 }, { x: 38, y: 52 }, { x: 62, y: 52 }, { x: 86, y: 50 },
    { x: 38, y: 20 }, { x: 62, y: 20 },
  ],
  "4-3-3": [
    { x: 50, y: 92 }, { x: 12, y: 75 }, { x: 36, y: 78 }, { x: 64, y: 78 }, { x: 88, y: 75 },
    { x: 28, y: 48 }, { x: 50, y: 52 }, { x: 72, y: 48 },
    { x: 86, y: 22 }, { x: 50, y: 16 }, { x: 14, y: 22 },
  ],
  "4-2-3-1": [
    { x: 50, y: 92 }, { x: 12, y: 75 }, { x: 36, y: 78 }, { x: 64, y: 78 }, { x: 88, y: 75 },
    { x: 38, y: 58 }, { x: 62, y: 58 },
    { x: 50, y: 38 }, { x: 82, y: 38 }, { x: 18, y: 38 }, { x: 50, y: 18 },
  ],
  "4-1-4-1": [
    { x: 50, y: 92 }, { x: 12, y: 75 }, { x: 36, y: 78 }, { x: 64, y: 78 }, { x: 88, y: 75 },
    { x: 50, y: 62 }, { x: 16, y: 42 }, { x: 38, y: 44 }, { x: 62, y: 44 }, { x: 84, y: 42 },
    { x: 50, y: 18 },
  ],
  "4-5-1": [
    { x: 50, y: 92 }, { x: 12, y: 75 }, { x: 36, y: 78 }, { x: 64, y: 78 }, { x: 88, y: 75 },
    { x: 14, y: 48 }, { x: 34, y: 50 }, { x: 50, y: 60 }, { x: 66, y: 50 }, { x: 86, y: 48 },
    { x: 50, y: 18 },
  ],
  "4-3-2-1": [
    { x: 50, y: 92 }, { x: 12, y: 75 }, { x: 36, y: 78 }, { x: 64, y: 78 }, { x: 88, y: 75 },
    { x: 28, y: 46 }, { x: 50, y: 50 }, { x: 72, y: 46 },
    { x: 38, y: 28 }, { x: 62, y: 28 }, { x: 50, y: 12 },
  ],
  "4-4-1-1": [
    { x: 50, y: 92 }, { x: 12, y: 75 }, { x: 36, y: 78 }, { x: 64, y: 78 }, { x: 88, y: 75 },
    { x: 14, y: 50 }, { x: 38, y: 52 }, { x: 62, y: 52 }, { x: 86, y: 50 },
    { x: 50, y: 30 }, { x: 50, y: 14 },
  ],
  "4-3-1-2": [
    { x: 50, y: 92 }, { x: 12, y: 75 }, { x: 36, y: 78 }, { x: 64, y: 78 }, { x: 88, y: 75 },
    { x: 28, y: 48 }, { x: 50, y: 52 }, { x: 72, y: 48 },
    { x: 50, y: 32 }, { x: 38, y: 16 }, { x: 62, y: 16 },
  ],
  "3-5-2": [
    { x: 50, y: 92 }, { x: 28, y: 78 }, { x: 50, y: 80 }, { x: 72, y: 78 },
    { x: 10, y: 50 }, { x: 32, y: 52 }, { x: 50, y: 60 }, { x: 68, y: 52 }, { x: 90, y: 50 },
    { x: 38, y: 20 }, { x: 62, y: 20 },
  ],
  "3-4-3": [
    { x: 50, y: 92 }, { x: 28, y: 78 }, { x: 50, y: 80 }, { x: 72, y: 78 },
    { x: 12, y: 50 }, { x: 38, y: 52 }, { x: 62, y: 52 }, { x: 88, y: 50 },
    { x: 84, y: 22 }, { x: 50, y: 16 }, { x: 16, y: 22 },
  ],
  "3-1-4-2": [
    { x: 50, y: 92 }, { x: 28, y: 78 }, { x: 50, y: 80 }, { x: 72, y: 78 },
    { x: 50, y: 62 },
    { x: 16, y: 42 }, { x: 38, y: 44 }, { x: 62, y: 44 }, { x: 84, y: 42 },
    { x: 38, y: 20 }, { x: 62, y: 20 },
  ],
  "3-3-3-1": [
    { x: 50, y: 92 }, { x: 28, y: 78 }, { x: 50, y: 80 }, { x: 72, y: 78 },
    { x: 30, y: 50 }, { x: 50, y: 54 }, { x: 70, y: 50 },
    { x: 84, y: 28 }, { x: 50, y: 30 }, { x: 16, y: 28 },
    { x: 50, y: 14 },
  ],
  "5-4-1": [
    { x: 50, y: 92 }, { x: 8, y: 65 }, { x: 28, y: 78 }, { x: 50, y: 80 }, { x: 72, y: 78 }, { x: 92, y: 65 },
    { x: 16, y: 46 }, { x: 38, y: 48 }, { x: 62, y: 48 }, { x: 84, y: 46 },
    { x: 50, y: 18 },
  ],
  "5-3-2": [
    { x: 50, y: 92 }, { x: 8, y: 65 }, { x: 28, y: 78 }, { x: 50, y: 80 }, { x: 72, y: 78 }, { x: 92, y: 65 },
    { x: 30, y: 50 }, { x: 50, y: 52 }, { x: 70, y: 50 },
    { x: 38, y: 20 }, { x: 62, y: 20 },
  ],
};

// Roller (eski oyunun ROLES'undan)
export type PlayerRole = {
  id: string;
  name: string;
  icon: string;
  positions: string[];
};

export const ROLES: PlayerRole[] = [
  { id: "sweeper_keeper", name: "Terzi Kaleci", icon: "🧤", positions: ["GK"] },
  { id: "shot_stopper", name: "Refleks Kaleci", icon: "🛡️", positions: ["GK"] },
  { id: "ball_playing_defender", name: "Top Çıkan Stoper", icon: "🎯", positions: ["CB"] },
  { id: "no_nonsense_cb", name: "Kale Gibi Stoper", icon: "🧱", positions: ["CB"] },
  { id: "offside_trap_cb", name: "Ofsayt Tuzağı Stoperi", icon: "🪤", positions: ["CB"] },
  { id: "wing_back", name: "Kanat Bek", icon: "🏃", positions: ["LB", "RB", "LWB", "RWB"] },
  { id: "inverted_fullback", name: "Ters Bek", icon: "🔄", positions: ["LB", "RB"] },
  { id: "libero", name: "Süpürücü", icon: "🧹", positions: ["CB"] },
  { id: "deep_lying_playmaker", name: "Regista", icon: "🧠", positions: ["CDM"] },
  { id: "box_to_box", name: "Koşan Orta Saha", icon: "🔋", positions: ["CM"] },
  { id: "mezzala", name: "Mezzala", icon: "🌀", positions: ["CM"] },
  { id: "defensive_midfielder", name: "Defansif Orta Saha", icon: "⚓", positions: ["CDM"] },
  { id: "advanced_playmaker", name: "Ofansif Oyun Kurucu", icon: "🎭", positions: ["CAM", "CM"] },
  { id: "half_winger", name: "Yarı Kanat", icon: "↗️", positions: ["CM", "LM", "RM"] },
  { id: "carrilero", name: "Sığ Orta Saha", icon: "↔️", positions: ["CM"] },
  { id: "target_man", name: "Hedef Forvet", icon: "💪", positions: ["ST", "CF"] },
  { id: "poacher", name: "Fırsatçı", icon: "🦅", positions: ["ST"] },
  { id: "complete_forward", name: "Tam Forvet", icon: "⭐", positions: ["ST", "CF"] },
  { id: "false_nine", name: "Sahte 9", icon: "👻", positions: ["ST", "CF"] },
  { id: "inside_forward", name: "İç Kanat Forvet", icon: "🔪", positions: ["LW", "RW"] },
  { id: "winger", name: "Kanat", icon: "🦅", positions: ["LW", "RW", "LM", "RM"] },
  { id: "advanced_playmaker_fwd", name: "Forvet Oyun Kurucu", icon: "🎯", positions: ["CF", "CAM"] },
];

export function getCompatibleRoles(position: string): PlayerRole[] {
  return ROLES.filter((r) => r.positions.includes(position));
}
