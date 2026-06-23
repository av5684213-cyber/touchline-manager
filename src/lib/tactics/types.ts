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

// =============================================================================
// TACTICAL INSTRUCTIONS — 20 talimat (eski oyundan birebir)
// =============================================================================

export type InstructionCategory = "team" | "attacking" | "defensive" | "set_piece";

export type TacticalInstruction = {
  name: string; // TR
  nameEn: string;
  category: InstructionCategory;
  options: string[]; // seçilebilir seçenekler (TR)
  effects: Record<string, number>;
  description: string;
};

export const TACTICAL_INSTRUCTIONS: TacticalInstruction[] = [
  // ── TEAM (6) ──────────────────────────────────────────────────────────────
  {
    name: "Tempo",
    nameEn: "Tempo",
    category: "team",
    options: ["Yüksek", "Normal", "Düşük"],
    effects: { tempo_modifier: 15, stamina_drain: 10, pass_completion: -5 },
    description: "Oyun hızını belirler. Yüksek tempo daha hızlı hücumlar ama daha fazla yorgunluk.",
  },
  {
    name: "Pas Doğruluğu",
    nameEn: "Passing Directness",
    category: "team",
    options: ["Direkt", "Karışık", "Kısa"],
    effects: { passing_risk: 10, pass_completion: 8, counter_attack: -5 },
    description: "Pas uzunluğunu belirler. Direkt paslar riskli ama hızlı hücum sağlar.",
  },
  {
    name: "Genişlik",
    nameEn: "Width",
    category: "team",
    options: ["Geniş", "Normal", "Dar"],
    effects: { width_spread: 20, central_density: -10, crossing_chance: 8 },
    description: "Takımın sahayı ne kadar geniş kullandığını belirler.",
  },
  {
    name: "Baskı Yoğunluğu",
    nameEn: "Pressing Intensity",
    category: "team",
    options: ["Yüksek", "Normal", "Düşük"],
    effects: { pressing_success: 15, stamina_drain: 15, defensive_shape: -10 },
    description: "Rakibe top kazandırdığınızda ne kadar yoğun baskı yapılacağını belirler.",
  },
  {
    name: "Savunma Hattı",
    nameEn: "Defensive Line",
    category: "team",
    options: ["Yüksek", "Normal", "Düşük"],
    effects: { offside_trap: 10, through_ball_vuln: 12, pressing_efficiency: 8 },
    description: "Savunma hattının ne kadar yukarıda kalacağını belirler.",
  },
  {
    name: "Ofsayt Tuzağı",
    nameEn: "Offside Trap",
    category: "team",
    options: ["Açık", "Normal", "Kapalı"],
    effects: { offside_success: 15, defensive_risk: 12, concentration_demand: 10 },
    description: "Savunma hattının birlikte hareket ederek ofsayt tuzağı kurmasını sağlar.",
  },
  // ── ATTACKING (8) ─────────────────────────────────────────────────────────
  {
    name: "Overlap Koşuları",
    nameEn: "Overlap Runs",
    category: "attacking",
    options: ["Evet", "Hayır"],
    effects: { crossing_chance: 12, wide_attack: 10, wing_back_stamina: 8 },
    description: "Kanat oyuncularının arkasından beklerin koşmasına izin verir.",
  },
  {
    name: "Underlap Koşuları",
    nameEn: "Underlap Runs",
    category: "attacking",
    options: ["Evet", "Hayır"],
    effects: { central_attack: 10, cutback_chance: 8, fullback_shooting: 6 },
    description: "Kanat oyuncularının içinden beklerin koşmasına izin verir.",
  },
  {
    name: "Yüzen Orta Açma",
    nameEn: "Float Crosses",
    category: "attacking",
    options: ["Evet", "Hayır"],
    effects: { crossing_accuracy: 8, heading_opportunity: 12, ariel_duel: 6 },
    description: "Ortaları yüksek ve yüzer şekilde açarak havada güçlü forvetleri hedefler.",
  },
  {
    name: "Sert Orta Açma",
    nameEn: "Drilled Crosses",
    category: "attacking",
    options: ["Evet", "Hayır"],
    effects: { crossing_speed: 12, first_time_shot: 8, interception_risk: 6 },
    description: "Ortaları yere sert ve hızlı açarak ceza sahası içinde vuruş fırsatı yaratır.",
  },
  {
    name: "Savunmaya Rağmen",
    nameEn: "Run at Defense",
    category: "attacking",
    options: ["Evet", "Hayır"],
    effects: { dribbling_success: 10, foul_won: 8, turnover_risk: 6 },
    description: "Oyuncuların topla karşılaşmaya girerek savunmayı zorlamasını sağlar.",
  },
  {
    name: "Görünen Şut",
    nameEn: "Shoot on Sight",
    category: "attacking",
    options: ["Evet", "Hayır"],
    effects: { long_shot_chance: 15, shot_volume: 12, shot_accuracy: -5 },
    description: "Oyuncuların şut açısı bulduğunda tereddüt etmeden vurmasını sağlar.",
  },
  {
    name: "Kutu İçine Sok",
    nameEn: "Work Ball into Box",
    category: "attacking",
    options: ["Evet", "Hayır"],
    effects: { pass_completion: 10, clear_cut_chance: 8, patient_buildup: 6 },
    description: "Uzaktan şut yerine topu ceza sahasına taşıyan pas hücumu tercih eder.",
  },
  {
    name: "Erken Orta",
    nameEn: "Early Crosses",
    category: "attacking",
    options: ["Evet", "Hayır"],
    effects: { early_cross_chance: 15, fast_break: 8, crossing_accuracy: -5 },
    description: "Kanat oyuncularının kale çizgisine kadar gelmeden erken orta açmasını sağlar.",
  },
  // ── DEFENSIVE (5) ─────────────────────────────────────────────────────────
  {
    name: "Geriye Çekil",
    nameEn: "Sit Back",
    category: "defensive",
    options: ["Evet", "Hayır"],
    effects: { defensive_depth: 15, counter_vuln: -8, possession_regain: 8 },
    description: "Takımın kendi yarı alanına çekilerek derin savunma yapmasını sağlar.",
  },
  {
    name: "Mücadeleye Gir",
    nameEn: "Get Stuck In",
    category: "defensive",
    options: ["Evet", "Hayır"],
    effects: { tackle_intensity: 15, foul_risk: 12, ball_recovery: 10 },
    description: "Oyuncuların sert mücadele ederek topu geri kazanmasını sağlar.",
  },
  {
    name: "Zaman Kaybet",
    nameEn: "Time Wasting",
    category: "defensive",
    options: ["Evet", "Hayır"],
    effects: { time_control: 20, possession_retention: 10, crowd_frustration: 8 },
    description: "Önde olduğunuzda topu tutarak zaman kaybetmeyi ve skoru korumayı sağlar.",
  },
  {
    name: "Daha Derin İn",
    nameEn: "Drop Deeper",
    category: "defensive",
    options: ["Evet", "Hayır"],
    effects: { space_behind_defense: -15, compact_defense: 12, pressing_range: -10 },
    description: "Savunma hattının daha geriye inerek aradaki boşlukları kapatmasını sağlar.",
  },
  {
    name: "Pozisyonu Koru",
    nameEn: "Hold Position",
    category: "defensive",
    options: ["Evet", "Hayır"],
    effects: { defensive_shape: 15, creative_freedom: -10, formation_integrity: 12 },
    description: "Oyuncuların kendi pozisyonlarını koruyarak dizilişin bozulmasını engeller.",
  },
  // ── SET PIECES (5) ────────────────────────────────────────────────────────
  {
    name: "Kısa Serbest Vuruş",
    nameEn: "Short Free Kicks",
    category: "set_piece",
    options: ["Evet", "Hayır"],
    effects: { short_freekick: 15, possession_retention: 8, goal_from_freekick: -8 },
    description: "Serbest vuruşları kısa paslarla oynayarak topun elinde kalmasını sağlar.",
  },
  {
    name: "Uzun Oyuncular Öne",
    nameEn: "Tall Players Up",
    category: "set_piece",
    options: ["Evet", "Hayır"],
    effects: { ariel_duel: 15, goal_from_corner: 10, defensive_vuln: 8 },
    description: "Korner ve serbest vuruşlarda uzun oyuncuları öne çıkarır.",
  },
  {
    name: "Ön Direk Koşusu",
    nameEn: "Near Post Runs",
    category: "set_piece",
    options: ["Evet", "Hayır"],
    effects: { near_post_goal: 12, quick_goal_chance: 8, defender_confusion: 5 },
    description: "Kornerlerde ön direğe koşarak kalecinin görüşünü engeller.",
  },
  {
    name: "Bölge Markajı",
    nameEn: "Zonal Marking",
    category: "set_piece",
    options: ["Evet", "Hayır"],
    effects: { zonal_coverage: 15, set_piece_defense: 10, man_marking: -8 },
    description: "Duran toplarda bölge savunması yaparak alanı korur.",
  },
  {
    name: "Adam Markajı",
    nameEn: "Man Marking",
    category: "set_piece",
    options: ["Evet", "Hayır"],
    effects: { man_marking_tightness: 15, set_piece_defense: 8, zonal_coverage: -10 },
    description: "Duran toplarda her oyuncunun bir rakibi birebir takip etmesini sağlar.",
  },
];

export const INSTRUCTION_CATEGORIES: { key: InstructionCategory; label: { tr: string; en: string }; icon: string }[] = [
  { key: "team", label: { tr: "Takım", en: "Team" }, icon: "👥" },
  { key: "attacking", label: { tr: "Hücum", en: "Attacking" }, icon: "⚔️" },
  { key: "defensive", label: { tr: "Savunma", en: "Defensive" }, icon: "🛡️" },
  { key: "set_piece", label: { tr: "Duran Top", en: "Set Piece" }, icon: "🚩" },
];
