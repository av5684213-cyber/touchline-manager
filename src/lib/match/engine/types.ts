// Pozisyon gruplari ve spesifik mevkiler
export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD';
export type SpecificPosition = 
  | 'GK'
  | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB'
  | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW'
  | 'CF' | 'ST';

export interface Player {
  id: string;
  name: string;
  position: PositionGroup;              // Geniş grup (GK, DEF, MID, FWD) - backward compat
  specificPosition: SpecificPosition;     // Spesifik mevki (CB, LB, CDM, ST vs.)
  secondaryPositions?: SpecificPosition[]; // Yan mevkiler (max 2)
  rating: number;
  age: number;
  potential: number;
  height?: number;
  weight?: number;
  market_value: number;
  salary: number;
  nation: string;
  club?: string;
  team_name?: string;
  preferred_foot?: 'Left' | 'Right' | 'Both';
  defending: number;
  passing: number;
  shooting: number;
  speed: number;
  power: number;
  vision?: number;
  control?: number;
  stamina?: number;
  heading?: number;
  goalkeeping?: number;
  
  // TECHNICAL (TR: Teknik)
  finishing?: number;     // Bitiricilik
  dribbling?: number;     // Dribling
  firstTouch?: number;    // İlk Kontrol
  crossing?: number;      // Orta Yapma
  marking?: number;       // Markaj
  tackling?: number;      // Top Kapma
  technique?: number;     // Teknik
  longShots?: number;     // Uzaktan Şut
  offTheBall?: number;    // Saha Yerleşimi

  // MENTAL (TR: Zihinsel)
  aggression?: number;    // Agresiflik
  bravery?: number;       // Cesaret
  workRate?: number;      // Çalışkanlık
  decisions?: number;     // Karar Alma
  determination?: number; // Kararlılık
  concentration?: number; // Konsantrasyon
  leadership?: number;    // Liderlik
  anticipation?: number;  // Önsez
  flair?: number;         // Özel Yetenek
  positioning?: number;   // Pozisyon Alma
  composure?: number;     // Soğukkanlılık
  teamwork?: number;      // Takım Oyunu
  // vision already defined above

  // PHYSICAL (TR: Fiziksel)
  agility?: number;       // Çeviklik
  balance?: number;       // Denge
  strength?: number;      // Güç
  acceleration?: number;  // Hızlanma
  jumping?: number;       // Zıplama
  leftFoot?: number;      // Sol Ayak (0-100)
  rightFoot?: number;     // Sağ Ayak (0-100)
  
  cond: number; // 0-100
  form: number; // 0-100 (impacts match performance)
  morale: number; // 0-100 (impacts consistency)
  confidence: number; // 0-100 (impacts big decisions)
  chemistry?: number; // 0-100
  hidden_potential: number;
  scouted?: boolean;
  injury?: {
    type: 'light' | 'chronic' | 'risky';
    remaining_days: number;
    severity: number;
  };

  // SAKATLIK GEÇMİŞİ (ADIM 1A)
  // Format: [{date: "2026-05-01", duration_days: 7, type: "hamstring"}]
  injury_history?: InjuryRecord[];

  // FORM PUANI (ADIM 1B) - Son 5 maç performans ortalaması (0-100)
  // match_ratings dizisinden hesaplanır, günlük cron ile güncellenir
  form_rating?: number;
  traits: string[];
  negTraits?: string[];
  personalityTraits?: string[];
  playStyle?: string;
  archetype?: string;
  special_role?: string | null;
  is_legend?: boolean;
  traitLevels?: Record<string, 'MOR' | 'ALTIN' | 'LACIVERT' | 'BEYAZ'>;
  styleLevels?: Record<string, number>; // 1, 2, 3 (White, Blue, Purple)
  personality?: { ambition: number; professionalism: number; temperament: number; loyalty: number; pressure_handling: number };
  is_for_sale?: boolean;
  sale_price?: number;
  is_retiring?: boolean;
  isResting?: boolean;

  // ADIM 2: KART CEZALARI VE SAKATLIK
  suspended_until?: string;     // ISO date - oyuncu cezalı olduğu son tarih
  is_injured?: boolean;         // Aktif sakatlık durumu
  injury_end_date?: string;     // ISO date - sakatlık bitiş tarihi
  injury_severity?: 'light' | 'medium' | 'heavy' | null; // Sakatlık şiddeti
  match_sharpness?: number;                                 // 0-100, drops after injury recovery
  returnFromInjuryDate?: string | null;                     // ISO date when player returned from injury
  isInjuryReturnPeriod?: boolean;                           // true while player is regaining form after injury
  transferOffer?: {
    bidder: string;
    amount: number;
    deadline?: string;
  };
  match_ratings?: number[];
  last_match_rating?: number;
  photo_url?: string;
  scouting_stars?: number;
  scouting_count?: number;
  
  // SÖZLEŞME SİSTEMİ
  contract_end_week?: number;   // Sözleşme bitiş haftası (mevcut sezonun haftası)
  is_free_agent?: boolean;      // Serbest oyuncu flag'i
  
  // DETAILED PERFORMANCE STATS (TR: Detaylı Performans Verileri)
  goalStats?: {
    plase?: number;
    header?: number;
    head_right?: number;
    head_left?: number;
    one_touch?: number;
    postup_turn?: number;
    sprint_finish?: number;
    long_shot?: number;
    penalty?: number;
    freekick?: number;
  };
  saveStats?: {
    long_shot?: number;
    freekick?: number;
    one_on_one?: number;
    shot_stopping?: number;
    penalty?: number;
  };
}

/** Sakatlık geçmişi kaydı (ADIM 1A) */
export interface InjuryRecord {
  date: string;           // Sakatlık tarihi (ISO format)
  duration_days: number;  // Sakatlık süresi (gün)
  type: string;           // Sakatlık tipi (hamstring, ankle, knee, vb.)
}

export interface Sponsor {
  id: string;
  name: string;
  type: 'Main' | 'Sleeve' | 'Stadium' | 'Global';
  weeklyPayment: number;
  duration: number; // in days
  remainingDays: number;
  bonus?: { type: 'win' | 'top3' | 'champion', amount: number };
}

export interface Profile {
  id: string;
  manager_name: string;
  team_name: string;
  league_name?: string;
  league_tier?: number;
  league_position?: number;
  level: number;
  xp: number;
  money: number;
  fans: number;
  reputation: number;
  credits: number;
  current_day: number;
  team_id?: string;
  defense_powers?: Record<string, number>; 
  ticket_price?: number;
  academy_level?: number;
  academy_extra_slots?: boolean;
  stadium_capacity?: number;
  region?: string;
  active_upgrade_type?: string | null;
  active_upgrade_id?: string | null;
  active_upgrade_finish_day?: number | null;
  active_upgrade_speedup?: boolean | null;
  active_upgrade_started_at?: string | null;  // ISO timestamp when upgrade started
  active_upgrade_end_at?: string | null;      // ISO timestamp when upgrade finishes (real-time)
  stadium_upgrades?: Record<string, number>;
  sponsors?: Sponsor[];
  philosophy?: string;
  primary_color?: string;
  secondary_color?: string;
  stadium_name?: string;
  is_bot?: boolean;
  bot_difficulty?: number;
  academy_weekly_budget?: number;
  last_youth_intake_season?: string;
  total_trophies?: number;
  total_awards?: number;
  season_badges?: SeasonBadge[];
  hof_count?: number;
  created_at?: string;

  // ── Personnel / Staff System ──
  scout_slots?: number;          // Number of active scout slots (0-3)
  staff_coaches?: number;        // Number of assistant coaches
  staff_physios?: number;        // Number of physiotherapists
  staff_monthly_fees?: number;   // Total monthly staff fees (computed)

  // ── Friendly Match Limits ──
  last_friendly_date?: string;       // ISO date string (YYYY-MM-DD)
  daily_friendly_count?: number;     // Count of friendlies played today

  // ── Newspaper Impact Tracking ──
  last_newspaper_applied?: string;   // ISO date string (YYYY-MM-DD) — gazete etkisinin son uygulandığı gün
  financial_health?: 'healthy' | 'warning' | 'critical' | 'bankrupt';  // weekly-income cron tarafından güncellenir

  // ── Consecutive Losses Tracking ──
  consecutive_losses?: number;       // Üst üste kayıp maçı sayısı — 5+ moral cezası tetikler
}

// ═══════════════════════════════════════════════════════════════════════
// ADIM 4: Sezon Sonu İstatistikleri ve Ödüller
// ═══════════════════════════════════════════════════════════════════════

/** Sezon ödül tipleri */
export type AwardType =
  | 'golden_boot'      // En golcü oyuncu
  | 'mvp'              // En değerli oyuncu (en yüksek rating)
  | 'best_gk'          // En iyi kaleci (clean sheets + rating)
  | 'top_assists'      // En çok asist yapan
  | 'best_young'       // En iyi genç oyuncu (U21)
  | 'fair_play'        // En az kart gören
  | 'champion'         // Şampiyon takım
  | 'fastest_goal'     // En hızlı gol
  | 'most_saves'       // En çok kurtarış
  | 'best_defender'    // En iyi savunmacı
  | 'most_motm'        // En çok maçın adamı
  | 'clean_sheet_win'  // Gol yemeden kazanma
  | 'longest_streak'   // En uzun galibiyet serisi
  | 'best_11'          // Yılın En İyi 11'i (liste)
  | 'fan_favorite'     // Taraftarın Sevgilisi
  | 'most_improved'    // En Çok Gelişen
  | 'unsung_hero';     // Görünmez Kahraman

/** Ödül görüntü etiketleri (Türkçe) */
export const AWARD_LABELS: Record<AwardType, { title: string; icon: string; color: string }> = {
  golden_boot:     { title: 'Altın Krampon',          icon: '👢', color: 'text-yellow-400' },
  mvp:             { title: 'Yılın Futbolcusu (MVP)',  icon: '⭐', color: 'text-amber-300' },
  best_gk:         { title: 'En İyi Kaleci',           icon: '🧤', color: 'text-emerald-400' },
  top_assists:     { title: 'Asist Kralı',             icon: '🎯', color: 'text-blue-400' },
  best_young:      { title: 'En İyi Genç',             icon: '🌟', color: 'text-purple-400' },
  fair_play:       { title: 'Fair Play',                icon: '🤝', color: 'text-green-400' },
  champion:        { title: 'Şampiyon',                 icon: '🏆', color: 'text-yellow-300' },
  fastest_goal:    { title: 'En Hızlı Gol',             icon: '⚡', color: 'text-cyan-400' },
  most_saves:      { title: 'En Çok Kurtarış',          icon: '🛡️', color: 'text-teal-400' },
  best_defender:   { title: 'En İyi Savunmacı',         icon: '🧱', color: 'text-lime-400' },
  most_motm:       { title: 'En Çok Maçın Adamı',       icon: '🎖️', color: 'text-rose-400' },
  clean_sheet_win: { title: 'Gol Yemeden Kazanma',      icon: '🔒', color: 'text-indigo-400' },
  longest_streak:  { title: 'En Uzun Galibiyet Serisi', icon: '🔥', color: 'text-orange-400' },
  best_11:         { title: 'Yılın En İyi 11\'i',        icon: '🌐', color: 'text-sky-300' },
  fan_favorite:    { title: 'Taraftarın Sevgilisi',      icon: '❤️', color: 'text-pink-400' },
  most_improved:   { title: 'En Çok Gelişen Oyuncu',     icon: '📈', color: 'text-emerald-300' },
  unsung_hero:     { title: 'Görünmez Kahraman',         icon: '🦸', color: 'text-slate-300' },
};

/** Sezon ödülü (DB: season_awards tablosu) */
export interface SeasonAward {
  id: string;
  season_id: string;
  profile_id: string;
  league_name?: string;
  award_type: AwardType;
  player_id?: string;
  player_name?: string;
  team_name?: string;
  stat_value: number;
  stat_detail?: Record<string, number | string>;
  created_at?: string;
}

/** Sezon badge'i (profile.season_badges dizisinde saklanır) */
export interface SeasonBadge {
  season_id: string;
  type: 'champion_gold' | 'champion_silver' | 'champion_bronze' |
        'top4' | 'mid_table' | 'relegated' |
        'golden_boot' | 'mvp' | 'best_gk' | 'top_assists' | 'best_young' | 'fair_play';
  label: string;
  icon: string;
}

/** Sezon özeti (DB: season_summaries tablosu) */
export interface SeasonSummary {
  id: string;
  season_id: string;
  profile_id: string;
  team_name?: string;
  league_name?: string;
  final_position?: number;
  points: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  total_goals: number;
  total_assists: number;
  total_yellow: number;
  total_red: number;
  total_clean_sheets: number;
  avg_team_rating: number;
  top_scorer_name?: string;
  top_scorer_goals: number;
  top_assister_name?: string;
  top_assister_assists: number;
  best_player_name?: string;
  best_player_rating: number;
  is_champion: boolean;
  is_promoted: boolean;
  is_relegated: boolean;
  awards_count: number;
  badge_earned?: string;
  created_at?: string;
}

/** Ödül töreni verisi (UI için sezon sonu modal içeriği) */
export interface SeasonAwardCeremony {
  season_id: string;
  summary: SeasonSummary;
  awards: SeasonAward[];
  badge: SeasonBadge | null;
}

export type MatchEventType = 'GOAL' | 'YELLOW' | 'RED' | 'SUB' | 'INJURY' | 'COMMENTARY' | 'HALFTIME' | 'FULLTIME' | 'OFFSIDE' | 'CORNER' | 'PENALTY_GOAL' | 'OWN_GOAL' | 'SECOND_YELLOW' | 'TACTICAL_CHANGE';

export type MatchType = 'normal' | 'derby' | 'cup' | 'friendly' | 'cup_final';

export type GoalType = 'plase' | 'header' | 'one_touch' | 'long_shot' | 'sprint_finish' | 'postup_turn' | 'penalty' | 'freekick' | 'own_goal' | 'unknown';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  text: string;
  player?: string;
  team?: 'HOME' | 'AWAY';
  /** Maç türü (derbi, kupa, hazırlık vs.) - yorum üretimi için */
  matchType?: MatchType;
  /** Oyuncunun pozitif trait'leri - yorum üretimi için */
  playerTraits?: string[];
  /** Oyuncunun negatif trait'leri - yorum üretimi için */
  playerNegTraits?: string[];
  /** Oyuncunun kişilik trait'leri - yorum üretimi için */
  playerPersonality?: string[];
  /** Ev sahibi skor (olay sonrası) */
  homeScore?: number;
  /** Deplasman skor (olay sonrası) */
  awayScore?: number;
  /** Gol tipi (GOAL olaylarında) */
  goalType?: GoalType;
  /** Eski takımına karşı mı oynuyor? */
  isFormerPlayer?: boolean;
  /** Ev sahibi takım adı */
  homeTeamName?: string;
  /** Deplasman takım adı */
  awayTeamName?: string;
  /** Oyuncunun maçtaki gol sayısı (hat-trick vs. için) */
  playerGoalCount?: number;
  /** Asist yapan oyuncu adı */
  assistPlayer?: string;
  /** Detay metni (kart nedeni, sakatlık tipi vs.) */
  detail?: string;
}

export interface MatchResult {
  score: { home: number; away: number };
  events: MatchEvent[];
  playerRatings: Record<string, number>;
  staminaLoss: Record<string, number>;
  playerStats: Record<string, {
    goals: number,
    assists: number,
    yellowCards: number;       // kart sayacı
    redCards: number;          // kırmızı kart sayacı
    fouls: number;             // faul sayısı
    goalDetails?: Record<string, number>;
    saveDetails?: Record<string, number>
  }>;
  stats: {
    home: { possession: number; shots: number; shotsOnTarget: number; passing: number };
    away: { possession: number; shots: number; shotsOnTarget: number; passing: number };
  };
  motm?: string;
  /** Oyuncu bazlı farming çarpanı — 1.0 = normal, <1.0 = farming şüphesi */
  farmingMultipliers?: Record<string, number>;
  /** Simülasyon sırasında oluşan hatalar (debug için) */
  errors?: string[];
}

export const FITNESS_THRESHOLDS = {
  CRITICAL: 70, // Injury risk
  LOW: 89,      // Performance penalty
  HIGH: 90,     // Optimal performance
};

export interface MatchState {
  minute: number;
  score: { home: number; away: number };
  result: any;
  visibleEvents: any[];
  matchSummaryEvents: { home: any[]; away: any[] };
  isActive: boolean;
  isFinished: boolean;
  isPaused: boolean;
  playerConditions: Record<string, number>;
  isReplay?: boolean;
  isFriendly?: boolean;
}

export interface LeagueTeam {
  id: string;
  name: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  rating: number;
}

export interface ActiveTactic {
  formation: string;
  mentality: number;
  pressing: boolean;
  passingStyle: string;
  intensity?: 'low' | 'normal' | 'high';
  tactic_type?: string;
  lineHeight: number;      // 0-100
  width: number;           // 0-100
  aggression: number;       // 0-100
  passingIntensity: number; // 0-100
  screenKeeper: boolean;
  wasteTime: boolean;
  parkTheBus: boolean;
  crossGame: boolean;
  loneStrikerCounter: boolean;
  offsideTrap: boolean;
  playStyle?: string;
  tempo?: string;
  defensiveLine?: string;
  /** Player ID → assigned specific position from formation slot (e.g. 'RB', 'CDM') */
  assignedPositions?: Record<string, string>;
}

export type GameTactics = ActiveTactic;

export type TrainingProgramId =
  | 'fiziksel_yukleme'
  | 'teknik_driller'
  | 'savunma_okulu'
  | 'bitiricilik_kampi'
  | 'kaleci_antrenmani'
  | 'set_parcasi'
  | 'zihinsel_hazirlik'
  | 'kondisyon_toparlanma'
  | 'takim_kimyasi'
  | 'pozisyon_adaptasyonu';

export interface TrainingAssignment {
  playerId: string;
  programId: TrainingProgramId;
  focusedStat?: keyof Player;
}

export interface TrainingSessionResult {
  statsGained: Record<string, number>;
  traitsGained: string[];
  injuryRisk: boolean;
  staminaLost: number;
}

export interface Operation {
  id: string;
  name: string;
  tier: number;
  description: string;
  cost: number;
  successRate: number;
  scandalRisk: number;
  impactType: 'stamina' | 'luck' | 'referee' | 'error_rate' | 'money' | 'points' | 'defense' | 'cleanup';
  impactValue: number;
  type?: 'ATTACK' | 'DEFENSE' | 'CLEANUP';
  category?: string;
  infoKey?: string;
}

export interface ActiveOperation {
  id: string;
  operationId: string;
  status: 'pending' | 'success' | 'scandal' | 'completed';
  timestamp: string;
  resultText?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string | null; // null for global chat
  content: string;
  timestamp: string;
  is_read: boolean;
  type: 'dm' | 'chat' | 'offer';
}

export interface MatchSchedule {
  nextMatchTime: string;
  isMatchActive: boolean;
  isTestMode: boolean;
}

export interface Scout {
  id: string;
  name: string;
  stars: number;
  status: 'IDLE' | 'SCOUTING';
  location?: string;
  remainingDays: number;
}

export interface ScoutingState {
  scouts: Scout[];
  foundPlayersPool: Player[];
  history?: Player[];
  watchlist?: Player[];
  stars?: number; // average stars of the network
  count?: number; // total scouts
}

export interface LabSettings {
  weather: 'Sunny' | 'Rainy' | 'Snowy';
  ground: 'Normal' | 'Muddy' | 'Icy';
  refereeStrictness: 'Low' | 'Medium' | 'High' | 'Extreme';
  moraleMode: 'Standard' | 'Collapsed' | 'Hyper';
  pressureMode: 'None' | 'High' | 'Panic';
  is9v9: boolean;
  scenario?: 'RedCard' | 'Last5Min' | 'SetPiece' | 'Chaos';
  ghostOpponent?: {
    playStyle: string;
    strength: number; // 0-100
    focusArea: 'Defensive' | 'Offensive' | 'Counter';
    weakPoint?: string;
  };
}

export interface TrainingState {
  assignments: TrainingAssignment[];
  coachQuality: number;
  lastSessionResults: Record<string, TrainingSessionResult>;
  activeOperations?: ActiveOperation[];
  operationReports?: string[];
  inbox?: Message[];
  scouting?: ScoutingState;
  labSettings?: LabSettings;
  lastTrainingDate?: string;    // 'YYYY-MM-DD' formatında
  dailyTrainingCount?: number;  // Bugünkü antrenman sayısı (max 2)
}

export const getDefaultActiveTactic = (): ActiveTactic => ({
  formation: '4-4-2',
  mentality: 3,
  pressing: false,
  passingStyle: 'Karışık',
  intensity: 'normal',
  lineHeight: 50,
  width: 50,
  aggression: 50,
  passingIntensity: 50,
  screenKeeper: false,
  wasteTime: false,
  parkTheBus: false,
  crossGame: false,
  loneStrikerCounter: false,
  offsideTrap: false,
  playStyle: 'dengeli',
  tempo: 'normal',
  defensiveLine: 'normal',
});

export const getDefaultGameTactics = (): GameTactics => ({
  ...getDefaultActiveTactic(),
});

/**
 * Maps a formation string to an ordered array of specific positions.
 * Index 0 = first slot (GK), index 1 = second slot, etc.
 * Used to assign specificPosition to each starter based on their pitch slot.
 */
export function getFormationSlotPositions(formation: string): SpecificPosition[] {
  const map: Record<string, SpecificPosition[]> = {
    '4-4-2':   ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    '4-3-3':   ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'],
    '3-5-2':   ['GK', 'CB', 'CB', 'CB', 'LWB', 'CDM', 'CM', 'CM', 'RWB', 'ST', 'ST'],
    '5-4-1':   ['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'LM', 'CM', 'CM', 'RM', 'ST'],
    '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'LW', 'CAM', 'RW', 'ST'],
    '3-4-3':   ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'RM', 'LW', 'ST', 'RW'],
    '4-1-4-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'LM', 'CM', 'CM', 'RM', 'ST'],
    '4-3-2-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'RW', 'ST'],
    '5-3-2':   ['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'CM', 'ST', 'ST'],
    '4-3-1-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'CAM', 'ST', 'ST'],
    '3-1-4-2': ['GK', 'CB', 'CB', 'CB', 'CDM', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    '4-4-1-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'CAM', 'ST'],
    '4-5-1':   ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CDM', 'CM', 'CM', 'RM', 'ST'],
    '3-3-3-1': ['GK', 'CB', 'CB', 'CB', 'CDM', 'CM', 'CM', 'LW', 'CAM', 'RW', 'ST'],
  };
  return map[formation] || map['4-4-2'];
}

export const getDefaultTrainingState = (): TrainingState => ({
  assignments: [],
  coachQuality: 1.0,
  lastSessionResults: {},
  scouting: {
    scouts: [],
    foundPlayersPool: [],
    history: [],
    watchlist: []
  }
});
