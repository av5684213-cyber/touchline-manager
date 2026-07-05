// =============================================================================
// Managerium — Enhanced Match Engine
// =============================================================================
// Comprehensive football match simulation with realistic event generation,
// Turkish commentary, detailed statistics, and player rating calculation.
// =============================================================================

import type { Player, ActiveTactic, MatchResult, GameTactics } from './types';
import { generateInjury as generateInjuryFromManager } from './injuryManager';
import { kaptanMi } from './sharedUtils';
import {
  getPositionEffectiveness,
  getEffectiveRating,
  clearEffectivenessCache,
  calculatePositionalTeamStrength,
} from './positionEffectiveness';
// getPositionContributions positionWeights.ts'te tanımlı, onu direkt import et
import { getPositionContributions } from './positionWeights';
import {
  type RefereeMatchContext,
  type RefereePersonality,
  REFEREE_PERSONALITIES,
  createRefereeMatchContext,
  shouldCallFoul,
  shouldGiveYellowCard,
  shouldGiveRedCard,
  shouldGivePenalty,
  getOffsideMultiplier,
  checkVARForGoal,
} from './referee';
import {
  generateCommentary,
  type CommentaryContext,
  type CommentaryEventType,
} from './matchCommentaryGenerator';
import { getRoleAttributeBonuses } from './tacticsRoles';
import { TRAITS_DATA } from './traitsData';
import { computeStadiumEffects, applyStadiumEffects, getPitchPassAccuracyBonus, getHeatingWinterProtection, getLightingNightBonus, type StadiumEffects } from './stadiumMatrix';
import { calculateTeamPlayStyleModifiers, type PlayStyleModifiers } from './playStyles';
import {
  FORMATION_MODS,
  STAT_MOD_BASE, STAT_MOD_VAR,
  OVERALL_WEIGHT_ATTACK, OVERALL_WEIGHT_MIDFIELD, OVERALL_WEIGHT_DEFENSE, OVERALL_WEIGHT_GK,
  TACTIC_MENTALITY_BONUS, TACTIC_MENTALITY_PENALTY, TACTIC_PRESSING_BONUS,
  TACTIC_HIGH_INTENSITY_BONUS, TACTIC_LOW_INTENSITY_PENALTY,
  TACTIC_AGGRESSION_SCALE, TACTIC_AGGRESSION_BASELINE,
  WEATHER_MODIFIERS,
  WEATHER_DISTRIBUTION,
  HOME_ADVANTAGE,
  ATMOSPHERE_HOME_ADVANTAGE_TIERS,
  AWAY_PRESSURE_EFFECT,
  FATIGUE_COND_THRESHOLDS, FATIGUE_COND_MODS,
  FATIGUE_MINUTE_THRESHOLDS, FATIGUE_MINUTE_MODS,
  ATTACK_PROBS, DEFEND_PROBS,
  STRENGTH_RATIO,
  PROB_CAPS,
  GOAL_CHANCE,
  ASSIST_CHANCE,
  GOAL_TYPE,
  RATING_IMPACT,
  CARD_RATES,
  SET_PIECE_RATES,
  EVENT_VISIBILITY,
  INJURY_RISK,
  CONDITION_DRAIN,
  POSITION_ATTRIBUTE_WEIGHTS,
  MATCH_STRUCTURE,
  MOMENTUM_BIASES,
  PASS_SIMULATION,
  PLAYSTYLE_WEIGHTS,
  PLAYER_RATING_WEIGHTS,
} from './constants';

// ─── Weather ────────────────────────────────────────────────────────────────
export type Weather = 'sunny' | 'rainy' | 'snowy' | 'windy';

// ─── Match Event ────────────────────────────────────────────────────────────
export type MatchEventType =
  | 'goal'
  | 'shot_saved'
  | 'shot_wide'
  | 'shot_post'
  | 'foul'
  | 'yellow_card'
  | 'red_card'
  | 'corner'
  | 'free_kick'
  | 'penalty'
  | 'offside'
  | 'substitution'
  | 'injury'
  | 'save'
  | 'tackle'
  | 'interception'
  | 'chance'
  | 'var_review'
  | 'goal_overturned';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  team: 'home' | 'away';
  playerName: string;
  playerId: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  description: string;
  x: number; // 0-100 pitch coordinate
  y: number; // 0-100 pitch coordinate
  ratingImpact: number; // +/- impact on player rating
}

// ─── Match Statistics ───────────────────────────────────────────────────────
export interface MatchStats {
  possession: number; // %
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passAccuracy: number; // %
  tackles: number;
  interceptions: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  corners: number;
  freeKicks: number;
  offsides: number;
  injuries: number;
  saves: number;
}

// ─── Player Match Rating ────────────────────────────────────────────────────
export interface PlayerMatchRating {
  playerId: string;
  playerName: string;
  position: string;
  rating: number; // 1-10
  goals: number;
  assists: number;
  shots: number;
  tackles: number;
  passes: number;
  keyPasses: number;
  saves: number;
}

// ─── Enhanced Match Result ──────────────────────────────────────────────────
export interface EnhancedMatchResult {
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  homeStats: MatchStats;
  awayStats: MatchStats;
  homePlayerRatings: PlayerMatchRating[];
  awayPlayerRatings: PlayerMatchRating[];
  manOfTheMatch: string; // playerId
  homePossession: number;
  awayPossession: number;
  weather: Weather;
  refereeName?: string;
  refereePersonality?: RefereePersonality;
  refereeStrictness?: number;
  varReviews?: number;
  goalsOverturned?: number;
}

// ─── Simulation Options ─────────────────────────────────────────────────────
export interface TacticModifiers {
  goalMod: number;       // Gol olasılığı çarpanı (ör: 0.12 = +12% gol şansı)
  conceedMod: number;    // Gol yeme riski çarpanı (ör: 0.05 = +5% gol yeme riski)
  counterMod?: number;   // Kontra atak çarpanı (ör: 0.10 = +10% kontra şansı)
}

export interface SimulationOptions {
  weather?: Weather;
  seed?: number;
  extraTime?: boolean;
  homeTeamName?: string;
  awayTeamName?: string;
  substitutes?: {
    home: Player[];
    away: Player[];
  };
  // Referee system
  refereeStrictness?: number;  // 1-99, modifies foul/card/penalty rates
  refereePersonality?: RefereePersonality;
  refereeName?: string;
  // Live strategy tactic modifiers (from LiveStrategyPanel)
  homeTacticModifiers?: TacticModifiers;
  awayTacticModifiers?: TacticModifiers;
  // Play style modifiers (from playStyles.ts)
  homePlayStyleModifiers?: import('./playStyles').PlayStyleModifiers;
  awayPlayStyleModifiers?: import('./playStyles').PlayStyleModifiers;
  // Incremental simulation: simulate only a specific minute range
  startMinute?: number;  // Simülasyonun başladığı dakika (0 = varsayılan, baştan başla)
  endMinute?: number;    // Simülasyonun bittiği dakika (90 = varsayılan, sonuna kadar)
  // Initial scores for incremental simulation (carry over from previous ticks)
  initialHomeScore?: number;
  initialAwayScore?: number;
  // B2: Physiotherapist injury modifier (0.0–1.0, lower = fewer injuries)
  homeInjuryModifier?: number;
  awayInjuryModifier?: number;
  // ÖNERİ-15: Atmosphere score (0-100, 50 = neutral, higher = more home advantage)
  atmosphereScore?: number;
  // B5: Captain player IDs — used to detect captain and apply leadership effects
  homeCaptainId?: string;
  awayCaptainId?: string;
}

// ─── Internal Mutable Player State ──────────────────────────────────────────
interface MutablePlayerState {
  player: Player;
  team: 'home' | 'away';
  isSubbedOut: boolean;
  isSubbedIn: boolean;
  isInjured: boolean;
  currentCond: number;
  events: MatchEvent[];
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  tackles: number;
  interceptions: number;
  passes: number;
  keyPasses: number;
  saves: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  ratingDelta: number;
  minuteEntered: number;
  minuteLeft: number;
}

interface TeamState {
  players: MutablePlayerState[];
  tactic: ActiveTactic;
  overallStrength: number;
  attackStrength: number;
  midfieldStrength: number;
  defenseStrength: number;
  gkStrength: number;
  substitutionSlots: number;
  usedSubs: number;
  substitutes: MutablePlayerState[];
  // B5: Captain fields
  captain: MutablePlayerState | null;       // Reference to the captain player
  captainMoraleBoost: number;               // 0.0–0.08: global morale modifier from captain
  captainPositionGroupBoost: number;        // 0.0–0.03: nearby position group boost from captain
}

interface LiveStats {
  possessionTicks: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passSuccesses: number;
  tackles: number;
  interceptions: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  corners: number;
  freeKicks: number;
  offsides: number;
  injuries: number;
  saves: number;
}

// =============================================================================
// Unified Commentary Bridge
// Bridges enhancedMatchEngine's internal event types to the trait-based
// matchCommentaryGenerator system. All matches now use rich, contextual,
// trait-aware commentary regardless of which component renders the events.
// =============================================================================

function generateRichCommentary(
  type: MatchEventType,
  player: MutablePlayerState,
  secondaryPlayer: MutablePlayerState | undefined,
  minute: number
): string {
  try {
    // Map enhancedMatchEngine event types to matchCommentaryGenerator event types
    const eventTypeMap: Record<string, CommentaryEventType> = {
      'goal': 'GOAL',
      'shot_saved': 'COMMENTARY',
      'shot_wide': 'COMMENTARY',
      'shot_post': 'COMMENTARY',
      'foul': 'COMMENTARY',
      'yellow_card': 'YELLOW',
      'red_card': 'RED',
      'corner': 'CORNER',
      'free_kick': 'COMMENTARY',
      'penalty': 'COMMENTARY',
      'offside': 'OFFSIDE',
      'substitution': 'SUB',
      'injury': 'INJURY',
      'save': 'COMMENTARY',
      'tackle': 'COMMENTARY',
      'interception': 'COMMENTARY',
      'chance': 'COMMENTARY',
      'var_review': 'COMMENTARY',
      'goal_overturned': 'COMMENTARY',
    };

    const commentaryEventType = eventTypeMap[type] || 'COMMENTARY';

    const p = player.player;
    const traits = p.traits || [];
    const negTraits = p.negTraits || [];
    const personality = p.personalityTraits || [];

    const ctx: CommentaryContext = {
      eventType: commentaryEventType,
      playerName: p.name,
      team: player.team === 'home' ? 'HOME' : 'AWAY',
      minute,
      homeScore: type === 'goal' ? (player.team === 'home' ? 1 : 0) : undefined,
      awayScore: type === 'goal' ? (player.team === 'away' ? 1 : 0) : undefined,
      playerTraits: traits,
      playerNegTraits: negTraits,
      playerPersonality: personality,
      assistPlayerName: secondaryPlayer?.player.name,
      detail: type === 'substitution' && secondaryPlayer
        ? `${secondaryPlayer.player.name} çıkıyor, ${p.name} giriyor`
        : undefined,
    };

    const result = generateCommentary(ctx);
    return result.text;
  } catch (err) {
    // Fallback: simple commentary if the generator fails
    const p = player.player.name;
    switch (type) {
      case 'goal':
        return `${minute}. dakikada ${p} golü buldu!`;
      case 'yellow_card':
        return `${minute}. dakikada ${p} sarı kart gördü.`;
      case 'red_card':
        return `${minute}. dakikada kırmızı kart! ${p} oyundan atıldı!`;
      case 'injury':
        return `${minute}. dakikada ${p} sakatlık geçirdi.`;
      case 'substitution':
        return `${minute}. dakikada değişiklik. ${secondaryPlayer?.player.name || 'Oyuncu'} çıkıyor, ${p} giriyor.`;
      case 'offside':
        return `${minute}. dakikada ofsayt.`;
      case 'corner':
        return `${minute}. dakikada korner.`;
      default:
        return `${minute}. dakikada ${p} bir olaya dahil oldu.`;
    }
  }
}

// =============================================================================
// Utility helpers
// =============================================================================

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * totalWeight;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function getAttr(p: Player, attr: string, fallback = 50): number {
  const val = (p as unknown as Record<string, unknown>)[attr];
  return typeof val === 'number' ? val : fallback;
}

/**
 * Pozisyon bazlı ağırlıklı nitelik skoru hesaplar.
 * Her pozisyon için tanımlı ağırlıklara göre oyuncunun ilgili niteliklerinin
 * ağırlıklı ortalamasını döndürür. Eğer pozisyon için tanımlı ağırlık yoksa
 * rating fallback olarak kullanılır.
 */
function getPositionalAttributeScore(player: Player, position?: string): number {
  const pos = position || player.specificPosition || player.position;
  const weights = POSITION_ATTRIBUTE_WEIGHTS[pos];

  if (!weights) {
    // Fallback: rating kullan
    return player.rating || 50;
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [attr, weight] of Object.entries(weights)) {
    const val = getAttr(player, attr, 50);
    weightedSum += val * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : (player.rating || 50);
}

function positionGroup(p: Player): string {
  // Prefer specificPosition-derived group when available (e.g. RB→DEF, CDM→MID)
  const spec = p.specificPosition;
  if (spec) {
    if (spec === 'GK') return 'GK';
    if (['CB','LB','RB','LWB','RWB'].includes(spec)) return 'DEF';
    if (['CDM','CM','CAM','LM','RM','LW','RW'].includes(spec)) return 'MID';
    if (['CF','ST'].includes(spec)) return 'FWD';
  }
  return p.position;
}

function isPosition(p: Player, group: string): boolean {
  return positionGroup(p) === group;
}

// =============================================================================
// Team Strength Calculation
// =============================================================================

function calculateTeamStrength(players: Player[], tactic: ActiveTactic, options?: { pressureEffect?: boolean }): {
  overall: number;
  attack: number;
  midfield: number;
  defense: number;
  gk: number;
} {
  // ── Pozisyon bazlı etkinlik hesaplama ──
  // Her oyuncunun specificPosition'ına göre etkinlik puanını hesapla
  // ve geniş grup (GK/DEF/MID/FWD) bazlı kadro oluşturma
  const forwards = players.filter(p => isPosition(p, 'FWD'));
  const midfielders = players.filter(p => isPosition(p, 'MID'));
  const defenders = players.filter(p => isPosition(p, 'DEF'));
  const goalkeepers = players.filter(p => isPosition(p, 'GK'));

  // ── Pozisyon-etkinlik duyarlı rating hesaplama ──
  // Her oyuncunun effectiveRating'ini kullan: rating × (0.7 + 0.3 × effectiveness)
  // Bu sayede CDM ve CAM aynı MID grubunda olsa bile farklı katkı yapar
  const weightedRating = (group: Player[], ...attrs: string[]) => {
    if (group.length === 0) return 0;
    return group.reduce((sum, p) => {
      // Pozisyon etkinlik puanını hesapla
      const effectiveness = getPositionEffectiveness(p, p.specificPosition || p.position);
      const effectiveRating = (p.rating || 50) * (0.7 + 0.3 * effectiveness);

      let attrSum = 0;
      for (const a of attrs) attrSum += getAttr(p, a, 50);
      const avg = attrs.length > 0 ? attrSum / attrs.length : effectiveRating;

      const moraleMod = STAT_MOD_BASE + (p.morale / 100) * STAT_MOD_VAR;
      const formMod = STAT_MOD_BASE + (p.form / 100) * STAT_MOD_VAR;
      const condMod = STAT_MOD_BASE + (p.cond / 100) * STAT_MOD_VAR;

      // B3: Kişilik trait'leri
      const personalityTraits: string[] = p.personalityTraits || [];
      let personalityMod = 1.0;

      if (personalityTraits.includes('Lider'))        personalityMod *= 1.06;
      if (personalityTraits.includes('Profesyonel'))  personalityMod *= 1.04;
      if (personalityTraits.includes('Çalışkan'))     personalityMod *= 1.03;
      if (personalityTraits.includes('Sinirli'))      personalityMod *= 0.96;
      if (personalityTraits.includes('Tembel'))       personalityMod *= 0.94;
      if (personalityTraits.includes('Bencil'))       personalityMod *= 0.97;
      if (personalityTraits.includes('Disiplinsiz'))  personalityMod *= 0.95;

      // B5: Kaptan etkisi — captain armband + Lider kombinasyonu ekstra güç verir
      const isCaptain = kaptanMi(p.special_role);
      if (isCaptain) {
        // Captain base boost: +3% personal performance (organizing, responsibility)
        personalityMod *= 1.03;
        // Captain with "Lider" personality trait: extra +5% (leadership multiplier)
        if (personalityTraits.includes('Lider')) {
          personalityMod *= 1.05;
        }
        // Captain with "Soyunma odası lideri" regular trait: extra +2%
        if ((p.traits || []).includes('Soyunma odası lideri')) {
          personalityMod *= 1.02;
        }
        // Captain with "Sessiz lider" regular trait: extra +1%
        if ((p.traits || []).includes('Sessiz lider')) {
          personalityMod *= 1.01;
        }
        // Captain with high leadership attribute: scaling bonus up to +3%
        const leadershipVal = getAttr(p, 'leadership', 0);
        if (leadershipVal >= 70) {
          personalityMod *= 1 + ((leadershipVal - 70) / 100) * 0.03;
        }
      }

      // B4: Takım kimyası — oyuncu bazlı chemistry ortalaması
      const chemistryMod = 0.95 + ((p.chemistry || 70) / 100) * 0.10;
      // chemistry=0 → ×0.95, chemistry=70 → ×1.02, chemistry=100 → ×1.05

      // BUG-10: Deplasman baskı etkisi — yüksek atmosferde deneyimsiz oyuncular
      // Yaş < 24 VE maç sayısı < 30 → effective rating -5%
      let pressureMod = 1.0;
      if (options?.pressureEffect) {
        const matchesPlayed = (p as any).matches_played ?? (p.match_ratings?.length ?? 0);
        if (p.age < AWAY_PRESSURE_EFFECT.maxAge && matchesPlayed < AWAY_PRESSURE_EFFECT.maxMatchesPlayed) {
          pressureMod = 1.0 - AWAY_PRESSURE_EFFECT.ratingPenalty; // 0.95
        }
      }

      // Nitelik ortalaması ile effectiveRating'i harmanla
      // %60 nitelikler + %40 pozisyon etkinliği
      const blended = attrs.length > 0
        ? avg * 0.6 + effectiveRating * 0.4
        : effectiveRating;

      return sum + blended * moraleMod * formMod * condMod * personalityMod * chemistryMod * pressureMod;
    }, 0) / group.length;
  };

  const attack = weightedRating(forwards, 'finishing', 'shooting', 'speed', 'dribbling', 'offTheBall');
  const midfield = weightedRating(midfielders, 'passing', 'vision', 'control', 'stamina', 'technique');
  const defense = weightedRating(defenders, 'tackling', 'marking', 'positioning', 'strength', 'anticipation');
  const gk = goalkeepers.length > 0
    ? weightedRating(goalkeepers, 'goalkeeping', 'reflexes', 'positioning', 'composure', 'concentration')
    : weightedRating(goalkeepers, 'goalkeeping');

  // Blend with position-weighted attribute scores (30% positional, 70% existing)
  const attackPositional = forwards.length > 0
    ? forwards.reduce((sum, p) => sum + getPositionalAttributeScore(p), 0) / forwards.length
    : 0;
  const blendedAttack = attack * 0.7 + attackPositional * 0.3;

  const midfieldPositional = midfielders.length > 0
    ? midfielders.reduce((sum, p) => sum + getPositionalAttributeScore(p), 0) / midfielders.length
    : 0;
  const blendedMidfield = midfield * 0.7 + midfieldPositional * 0.3;

  const defensePositional = defenders.length > 0
    ? defenders.reduce((sum, p) => sum + getPositionalAttributeScore(p), 0) / defenders.length
    : 0;
  const blendedDefense = defense * 0.7 + defensePositional * 0.3;

  const gkPositional = goalkeepers.length > 0
    ? goalkeepers.reduce((sum, p) => sum + getPositionalAttributeScore(p, 'GK'), 0) / goalkeepers.length
    : 0;
  const blendedGk = gk * 0.7 + gkPositional * 0.3;

  // Tactic modifiers
  let tacticMod = 1.0;
  // Mentality 1-5 scale
  if (tactic.mentality >= 4) tacticMod += (tactic.mentality - 3) * TACTIC_MENTALITY_BONUS;
  else if (tactic.mentality <= 2) tacticMod -= (3 - tactic.mentality) * TACTIC_MENTALITY_PENALTY;

  // Pressing bonus
  if (tactic.pressing) tacticMod += TACTIC_PRESSING_BONUS;

  // Intensity
  if (tactic.intensity === 'high') tacticMod += TACTIC_HIGH_INTENSITY_BONUS;
  else if (tactic.intensity === 'low') tacticMod -= TACTIC_LOW_INTENSITY_PENALTY;

  // Aggression
  tacticMod += (tactic.aggression - TACTIC_AGGRESSION_BASELINE) * TACTIC_AGGRESSION_SCALE;

  // ── Formasyon bazlı ağırlık modifikatörleri ──────────────────────────
  const formationKey = tactic.formation || (tactic as any).tactic_type || '4-4-2';

  const fmod = FORMATION_MODS[formationKey] ?? FORMATION_MODS['4-4-2'];

  return {
    overall: (blendedAttack * fmod.attack * OVERALL_WEIGHT_ATTACK + blendedMidfield * fmod.midfield * OVERALL_WEIGHT_MIDFIELD + blendedDefense * fmod.defense * OVERALL_WEIGHT_DEFENSE + blendedGk * OVERALL_WEIGHT_GK) * tacticMod,
    attack: blendedAttack * fmod.attack * tacticMod,
    midfield: blendedMidfield * fmod.midfield * tacticMod,
    defense: blendedDefense * fmod.defense * tacticMod,
    gk: blendedGk,
  };
}

// =============================================================================
// Commentary Generation (Turkish)
// =============================================================================

const COMMENTARY = {
  goal: {
    normal: [
      (p: string, a: string, m: number) =>
        `${m}. dakikada ${a}'ın mükemmel pasıyla ${p} golü buldu! Tribünler yerinden oynadı!`,
      (p: string, a: string, m: number) =>
        `${m}. dakikada harika bir organizasyon! ${a} topu ${p}'e aktardı ve fileler heyecanla sallandı!`,
      (p: string, a: string, m: number) =>
        `${m}. dakikada ${a}'ın kilit pasıyla ${p} şık bir vuruşla takımını öne geçirdi!`,
      (p: string, a: string, m: number) =>
        `${m}. dakikada muazzam bir hücum! ${a} serbest kalıp ${p}'e topu bıraktı, neticesi gol!`,
      (p: string, a: string, m: number) =>
        `${m}. dakikada ${a}'ın görkemli pası ve ${p}'in harika bitirişi! Seyirciler coştu!`,
    ],
    solo: [
      (p: string, m: number) =>
        `${m}. dakikada ${p} tek başına sahneye çıktı! Müthiş bir çalımla defansı geçip golü buldu!`,
      (p: string, m: number) =>
        `${m}. dakikada ${p} kendi çabasıyla topu kaptı, orta sahaya dek koştu ve ağları buldu!`,
      (p: string, m: number) =>
        `${m}. dakikada ${p}'in bireysel şaheseri! Birkaç oyuncuyu ezip geçti ve kalecinin solundan topu ağlara gönderdi!`,
    ],
    header: [
      (p: string, a: string, m: number) =>
        `${m}. dakikada kornere çıkan ${a} ortasını yaptı, ${p} havada asılı kaldı ve kafa golüyle takımını mutlu etti!`,
      (p: string, a: string, m: number) =>
        `${m}. dakikada ${a}'in muhteşem ortasına ${p} yükseldi ve kafayla topu ağlara gönderdi!`,
    ],
    longShot: [
      (p: string, m: number) =>
        `${m}. dakikada ${p} ceza sahası dışından harika bir şut attı! Top köşeden ağlarla buluştu! Uzaktan şut specialization!`,
      (p: string, m: number) =>
        `${m}. dakikada müthiş bir şut geldi! ${p} yaklaşık 25 metreden fileleri buldu! Kaleci şaşkınlık içinde kaldı!`,
    ],
    penalty: [
      (p: string, m: number) =>
        `${m}. dakikada penaltı vuruşunu kullanan ${p} topu ağlara gönderdi! Soğukkanlı bir vuruş!`,
    ],
    freeKick: [
      (p: string, m: number) =>
        `${m}. dakikada ${p} serbest vuruşu mükemmel kullandı! Top barajın üzerinden kavis yapıp ağlarla buluştu!`,
    ],
    counter: [
      (p: string, a: string, m: number) =>
        `${m}. dakikada nefes kesen bir kontra atak! ${a} topu hemen ileri attı, ${p} kaleciyle karşı karşıya golü buldu!`,
    ],
    lateGoal: [
      (p: string, a: string, m: number) =>
        `${m}. dakikada son anlarda dramatik bir gol! ${a}'ın pasıyla ${p} maçın kaderini değiştirdi! İnanılmaz bir son!`,
    ],
  },
  shot_saved: [
    (p: string, gk: string, m: number) =>
      `${m}. dakikada ${p} sert vurdu ama kaleci ${gk} harika bir refleksle topu kornere çeldi!`,
    (p: string, gk: string, m: number) =>
      `${m}. dakikada ${p}'in güçlü şutunu ${gk} çift yumrukla uzaklaştırdı! Müthiş bir kurtarış!`,
    (p: string, gk: string, m: number) =>
      `${m}. dakikada ${p} kaleyi test etti ama ${gk} yatarak topu kurtardı!`,
    (p: string, gk: string, m: number) =>
      `${m}. dakikada ${p} şık bir vuruş yaptı, ${gk} köşeyi iyi okuyup topu tuttu!`,
    (p: string, gk: string, m: number) =>
      `${m}. dakikada ${p}'in plase şutunu ${gk} parmak ucuyla kornere attı! Çok yakın!`,
  ],
  shot_wide: [
    (p: string, m: number) =>
      `${m}. dakikada ${p} şut attı ama top auta gitti. Fırsat kaçtı.`,
    (p: string, m: number) =>
      `${m}. dakikada ${p}'in şutu az farkla kaleyi bulmadı! İzleyiciler derin bir nefes aldı.`,
    (p: string, m: number) =>
      `${m}. dakikada ${p} vurdu ama direk dibinden dışarı çıktı!`,
    (p: string, m: number) =>
      `${m}. dakikada ${p} iyi bir pozisyon yakaladı ama vuruşu kalibrasyon eksikliğiyle auta gitti.`,
  ],
  shot_post: [
    (p: string, m: number) =>
      `${m}. dakikada ${p} harika vurdu ama top direkten döndü! Kaçan gol!`,
    (p: string, m: number) =>
      `${m}. dakikada ${p} inanılmaz bir şut çekti, kaleci çaresiz kalırken top direkten geri geldi!`,
    (p: string, m: number) =>
      `${m}. dakikada ${p}'in şutu kalecinin üzerinden auta çarptı! Canhıraç bir an!`,
  ],
  foul: [
    (p: string, m: number) =>
      `${m}. dakikada ${p} sert bir müdahale yaptı ve hakem faul düdüğü çaldı.`,
    (p: string, m: number) =>
      `${m}. dakikada ${p} top mücadelesinde rakibine faul yaptı.`,
    (p: string, m: number) =>
      `${m}. dakikada sert bir girişim! ${p} rakibini yere düşürdü, hakem durumu değerlendiriyor.`,
    (p: string, m: number) =>
      `${m}. dakikada ${p} pozisyon mücadelesinde hücuma engel oldu ama faul gerekçesiyle oyun durdu.`,
  ],
  yellow_card: [
    (p: string, m: number) =>
      `${m}. dakikada ${p} sarı kart gördü! Ciddi bir ihlal, hakem cebine el attı.`,
    (p: string, m: number) =>
      `${m}. dakikada ${p}'in tehlikeli müdahalesi sarı kartla sonuçlandı. Bu oyuncu dikkatli olmalı!`,
    (p: string, m: number) =>
      `${m}. dakikada taktiksel bir faul! ${p} sarı kart gördü, takımını organize olmaya çağırıyor.`,
    (p: string, m: number) =>
      `${m}. dakikada ${p} aşırı agresif bir müdahale yaptı ve sarı kart cezasını gördü.`,
  ],
  red_card: [
    (p: string, m: number) =>
      `${m}. dakikada kırmızı kart! ${p} sahadan ihraç edildi! Takımı 10 kişi kaldı!`,
    (p: string, m: number) =>
      `${m}. dakikada ${p} son çare bir faul yaptı ve hakem doğrudan kırmızı kartı gösterdi!`,
  ],
  corner: [
    (p: string, m: number) =>
      `${m}. dakikada ${p}'in şutunu savunma kornere çeldi. Korner kullanılacak.`,
    (p: string, m: number) =>
      `${m}. dakikada ${p} kanattan getirdi ama savunma topu uzaklaştırdı. Korner.`,
  ],
  free_kick: [
    (p: string, m: number) =>
      `${m}. dakikada ${p} tehlikeli bir bölgede faul yaptı. Serbest vuruş kullanılacak.`,
    (p: string, m: number) =>
      `${m}. dakikada ${p} serbest vuruş kazandı. Top tehlikeli bölgede duruyor.`,
  ],
  penalty: [
    (p: string, m: number) =>
      `${m}. dakikada ceza sahası içinde faul! Penaltı! ${p} penaltı kazandırdı!`,
  ],
  offside: [
    (p: string, m: number) =>
      `${m}. dakikada ${p} ofsayt pozisyonunda kaldı. Bayrak yukarıda.`,
    (p: string, m: number) =>
      `${m}. dakikada güzel bir koşu ama ${p} ofsayt çizgisini geçmiş. Oyun durdu.`,
  ],
  injury: [
    (p: string, m: number) =>
      `${m}. dakikada ${p} sakatlık durumuyla yerde kaldı. Sağlık ekibi sahaya giriyor.`,
    (p: string, m: number) =>
      `${m}. dakikada kötü bir düşme! ${p} ağrı içinde yerde. Maç duraksadı.`,
  ],
  save: [
    (p: string, m: number) =>
      `${m}. dakikada kaleci ${p} inanılmaz bir kurtarış yaptı! Topu çeliştirip kornere attı!`,
    (p: string, m: number) =>
      `${m}. dakikada ${p} altı pasta devleşti! Müthiş bir refleks!`,
    (p: string, m: number) =>
      `${m}. dakikada yakın mesafe şutunu ${p} muhteşem bir şekilde kurtardı!`,
  ],
  tackle: [
    (p: string, m: number) =>
      `${m}. dakikada ${p} mükemmel bir top kapma ile hücumu önledi!`,
    (p: string, m: number) =>
      `${m}. dakikada ${p} zamanlamasını harika ayarladı ve topu rakibin ayağından aldı!`,
    (p: string, m: number) =>
      `${m}. dakikada kritik bir müdahale! ${p} kanarya bir kalkan gibi savunmaya yardımcı oldu.`,
  ],
  interception: [
    (p: string, m: number) =>
      `${m}. dakikada ${p} pas yolunu kesti! Harika bir önsezi.`,
    (p: string, m: number) =>
      `${m}. dakikada ${p} rakibin pasını okudu ve topu kaptı. Akıllıca bir pozisyon alma.`,
  ],
  chance: [
    (p: string, m: number) =>
      `${m}. dakikada ${p} büyük bir fırsat yakaladı! Kaleciyle karşı karşıya kaldı!`,
    (p: string, m: number) =>
      `${m}. dakikada ${p} ceza sahasına girdi, tehlikeli bir pozisyon!`,
    (p: string, m: number) =>
      `${m}. dakikada muazzam bir pas! ${p} vuruş hazırlığı yapıyor!`,
  ],
  var_review: [
    (p: string, m: number) =>
      `${m}. dakikada VAR incelemesi! Hakem monitöre gidiyor. ${p} ile ilgili pozisyon inceleniyor...`,
    (p: string, m: number) =>
      `${m}. dakikada şüpheli pozisyon! VAR hakemi uyarıyor, ${p} olayı değerlendiriliyor.`,
  ],
  goal_overturned: [
    (p: string, m: number) =>
      `${m}. dakikada VAR incelemesi sonucu gol İPTAL EDİLDİ! ${p} ofsayttaydı!`,
    (p: string, m: number) =>
      `${m}. dakikada gol iptal! VAR incelemesinde ${p}'in pozisyonu düdüğü bozdu.`,
  ],
  substitution: [
    (outP: string, inP: string, m: number) =>
      `${m}. dakikada değişiklik! ${outP} oyundan çıkıyor, ${inP} sahaya giriyor.`,
  ],
  momentumStart: [
    (m: number) =>
      `${m}. dakikada tempolar yükseldi, atak yoğunluğu artıyor.`,
    (m: number) =>
      `${m}. dakikada oyunun kontrolü bir elden diğerine geçiyor.`,
    (m: number) =>
      `${m}. dakikada baskı artıyor, savunma altında kalan takım zor anlar yaşıyor.`,
  ],
  weatherComment: {
    rain: [
      'Yağmur yağmaya devam ediyor. Zemin kaygan, pas hataları artabilir.',
      'Sağanak yağış altında zorlu bir oyun. Oyuncuların ayakkabı tutuşu azaldı.',
    ],
    snow: [
      'Kar yağışı sahayı kaplamaya başladı. Oyun yavaşladı.',
      'Zemin buz gibi! Oyuncular top kontrolunde zorlanıyor.',
    ],
    windy: [
      'Rüzgar maçın görünmez oyuncusu bugün. Top beklenmeyen yönlerde savruluyor.',
      'Kuvvetli rüzgar topun uçuşunu etkiliyor, uzak şutlar riske giriyor.',
    ],
    sunny: [
      'Güneşli bir gün, harika futbol havası! Oyuncular keyifli oynuyor.',
      'Mükemmel hava koşulları, zemin futbol için ideal.',
    ],
  },
  halftime: [
    'İlk yarı sona erdi. Hakem düdüğü çaldı.',
    'İlk 45 dakika geride kaldı. Takımlar soyunma odasına gidiyor.',
  ],
  fulltime: [
    'Maç sona erdi! Hakem son düdüğü çaldı.',
    '90 dakika tamamlandı! Taraftarlar ellerini alkışla ovuşturuyor.',
  ],
};

function generateGoalCommentary(
  scorer: MutablePlayerState,
  assister: MutablePlayerState | undefined,
  minute: number,
  eventDetail: 'normal' | 'solo' | 'header' | 'longShot' | 'penalty' | 'freeKick' | 'counter' | 'lateGoal'
): string {
  const p = scorer.player.name;
  const a = assister ? assister.player.name : 'takım arkadaşı';

  const detail = minute >= 85 ? 'lateGoal' : eventDetail;

  // Solo / penalty / freeKick / longShot don't need an assister name
  if (!assister || detail === 'solo' || detail === 'penalty' || detail === 'freeKick' || detail === 'longShot') {
    const soloTemplates: Record<string, ((p: string, m: number) => string)[]> = {
      solo: COMMENTARY.goal.solo as unknown as ((p: string, m: number) => string)[],
      penalty: COMMENTARY.goal.penalty as unknown as ((p: string, m: number) => string)[],
      freeKick: COMMENTARY.goal.freeKick as unknown as ((p: string, m: number) => string)[],
      longShot: COMMENTARY.goal.longShot as unknown as ((p: string, m: number) => string)[],
    };
    const tpls = soloTemplates[detail];
    if (tpls) return pick(tpls)(p, minute);
  }

  // All other goal types use (p, a, m) signature
  const duoTemplates: Record<string, ((p: string, a: string, m: number) => string)[]> = {
    normal: COMMENTARY.goal.normal as unknown as ((p: string, a: string, m: number) => string)[],
    header: COMMENTARY.goal.header as unknown as ((p: string, a: string, m: number) => string)[],
    counter: COMMENTARY.goal.counter as unknown as ((p: string, a: string, m: number) => string)[],
    lateGoal: COMMENTARY.goal.lateGoal as unknown as ((p: string, a: string, m: number) => string)[],
  };
  const tpls = duoTemplates[detail] ?? duoTemplates.normal;
  return pick(tpls)(p, a, minute);
}

function generateEventCommentary(
  type: MatchEventType,
  player: MutablePlayerState,
  minute: number,
  secondaryPlayer?: MutablePlayerState
): string {
  const p = player.player.name;
  switch (type) {
    case 'shot_saved':
      return pick(COMMENTARY.shot_saved)(p, secondaryPlayer?.player.name || 'kaleci', minute);
    case 'shot_wide':
      return pick(COMMENTARY.shot_wide)(p, minute);
    case 'shot_post':
      return pick(COMMENTARY.shot_post)(p, minute);
    case 'foul':
      return pick(COMMENTARY.foul)(p, minute);
    case 'yellow_card':
      return pick(COMMENTARY.yellow_card)(p, minute);
    case 'red_card':
      return pick(COMMENTARY.red_card)(p, minute);
    case 'corner':
      return pick(COMMENTARY.corner)(p, minute);
    case 'free_kick':
      return pick(COMMENTARY.free_kick)(p, minute);
    case 'penalty':
      return pick(COMMENTARY.penalty)(p, minute);
    case 'offside':
      return pick(COMMENTARY.offside)(p, minute);
    case 'injury':
      return pick(COMMENTARY.injury)(p, minute);
    case 'save':
      return pick(COMMENTARY.save)(p, minute);
    case 'tackle':
      return pick(COMMENTARY.tackle)(p, minute);
    case 'interception':
      return pick(COMMENTARY.interception)(p, minute);
    case 'chance':
      return pick(COMMENTARY.chance)(p, minute);
    case 'substitution':
      return pick(COMMENTARY.substitution)(p, secondaryPlayer?.player.name || 'yedek oyuncu', minute);
    default:
      return `${minute}. dakikada ${p} bir olaya dahil oldu.`;
  }
}

// =============================================================================
// Pitch Coordinate Generation
// =============================================================================

function getPitchCoords(
  team: 'home' | 'away',
  position: string,
  type: MatchEventType
): { x: number; y: number } {
  // x: 0 = home goal, 100 = away goal; y: 0 = left touchline, 100 = right touchline
  const attacking = team === 'home';

  const baseX = () => {
    switch (type) {
      case 'goal':
      case 'shot_saved':
      case 'shot_wide':
      case 'shot_post':
      case 'chance':
        return attacking ? rand(78, 92) : rand(8, 22);
      case 'save':
        return attacking ? rand(3, 12) : rand(88, 97);
      case 'foul':
      case 'yellow_card':
      case 'red_card':
      case 'free_kick':
        return rand(30, 70);
      case 'corner':
        return attacking ? rand(95, 99) : rand(1, 5);
      case 'tackle':
      case 'interception':
        return attacking ? rand(30, 60) : rand(40, 70);
      default:
        return rand(25, 75);
    }
  };

  const baseY = () => {
    const side = Math.random() > 0.5 ? 1 : 0;
    if (type === 'corner') return side === 0 ? rand(1, 5) : rand(95, 99);
    switch (position) {
      case 'GK':
        return rand(38, 62);
      case 'DEF':
        return side === 0 ? rand(15, 40) : rand(60, 85);
      case 'MID':
        return rand(25, 75);
      case 'FWD':
        return side === 0 ? rand(25, 55) : rand(45, 75);
      default:
        return rand(20, 80);
    }
  };

  return {
    x: clamp(Math.round(baseX()), 0, 100),
    y: clamp(Math.round(baseY()), 0, 100),
  };
}

// =============================================================================
// Weather Effects
// =============================================================================

interface WeatherModifiers {
  passingMod: number;
  speedMod: number;
  shootingMod: number;
  tacklingMod: number;
  description: string;
}

function getWeatherModifiers(weather: Weather): WeatherModifiers {
  const mods = WEATHER_MODIFIERS[weather] ?? WEATHER_MODIFIERS['sunny'];
  return {
    ...mods,
    description: weather === 'rainy' ? pick(COMMENTARY.weatherComment.rain) :
                 weather === 'snowy' ? pick(COMMENTARY.weatherComment.snow) :
                 weather === 'windy' ? pick(COMMENTARY.weatherComment.windy) :
                 pick(COMMENTARY.weatherComment.sunny),
  };
}

// =============================================================================
// Event Probability Engine
// =============================================================================

interface ProbabilityWeights {
  shot: number;
  tackle: number;
  interception: number;
  foul: number;
  chance: number;
  save: number;
}

function getEventProbabilities(
  state: MutablePlayerState,
  teamStrength: number,
  oppositionStrength: number,
  weatherMods: WeatherModifiers,
  minute: number,
  isAttacking: boolean
): ProbabilityWeights {
  const p = state.player;
  const pos = positionGroup(p);
  const specPos = p.specificPosition || pos; // Spesifik pozisyon (CDM, CAM, CB vb.)

  let shot = 0;
  let tackle = 0;
  let interception = 0;
  let foul = 0;
  let chance = 0;
  let save = 0;

  const fatigueMod = state.currentCond < FATIGUE_COND_THRESHOLDS.low ? FATIGUE_COND_MODS.low : state.currentCond < FATIGUE_COND_THRESHOLDS.mid ? FATIGUE_COND_MODS.mid : FATIGUE_COND_MODS.full;
  const moraleMod = STAT_MOD_BASE + (p.morale / 100) * STAT_MOD_VAR;

  // Late game fatigue accumulation
  const fatigueMinute = minute > FATIGUE_MINUTE_THRESHOLDS.late ? FATIGUE_MINUTE_MODS.late : minute > FATIGUE_MINUTE_THRESHOLDS.mid ? FATIGUE_MINUTE_MODS.mid : FATIGUE_MINUTE_MODS.fresh;
  const effectiveMod = fatigueMod * moraleMod * fatigueMinute;

  // Pozisyon etkinlik puanı — spesifik mevkideki gerçek etkinlik
  const effectiveness = getPositionEffectiveness(p, specPos);

  if (isAttacking) {
    if (pos === 'FWD') {
      // ST, CF, LW, RW için farklı ağırlıklar
      const isWinger = specPos === 'LW' || specPos === 'RW';
      const isCF = specPos === 'CF';
      const shotAttr = isWinger ? 'dribbling' : isCF ? 'passing' : 'finishing';
      shot = clamp((getAttr(p, shotAttr) / 100) * ATTACK_PROBS.FWD.shotMultiplier * effectiveMod * effectiveness, ATTACK_PROBS.FWD.shotMin, ATTACK_PROBS.FWD.shotMax);
      chance = clamp((getAttr(p, 'offTheBall') / 100) * ATTACK_PROBS.FWD.chanceMultiplier * effectiveMod * effectiveness, ATTACK_PROBS.FWD.chanceMin, ATTACK_PROBS.FWD.chanceMax);
      foul = ATTACK_PROBS.FWD.foul;
    } else if (pos === 'MID') {
      // CDM, CM, CAM, LM, RM, LW, RW için farklı ağırlıklar
      const isCDM = specPos === 'CDM';
      const isCAM = specPos === 'CAM';
      const isWinger = specPos === 'LM' || specPos === 'RM' || specPos === 'LW' || specPos === 'RW';

      // CDM: daha çok savunma odaklı, az şut; CAM: daha çok şut ve chance
      if (isCDM) {
        shot = clamp((getAttr(p, 'longShots') / 100) * ATTACK_PROBS.MID.shotMultiplier * effectiveMod * effectiveness * 0.5, ATTACK_PROBS.MID.shotMin, ATTACK_PROBS.MID.shotMax * 0.6);
        tackle = clamp((getAttr(p, 'tackling') / 100) * ATTACK_PROBS.MID.interceptionMultiplier * effectiveMod * effectiveness * 1.3, ATTACK_PROBS.MID.interceptionMin, ATTACK_PROBS.MID.interceptionMax * 1.3);
        interception = clamp((getAttr(p, 'anticipation') / 100) * ATTACK_PROBS.MID.interceptionMultiplier * effectiveMod * effectiveness * 1.2, ATTACK_PROBS.MID.interceptionMin, ATTACK_PROBS.MID.interceptionMax * 1.2);
        chance = clamp((getAttr(p, 'vision') / 100) * ATTACK_PROBS.MID.chanceMultiplier * effectiveMod * effectiveness * 0.6, ATTACK_PROBS.MID.chanceMin, ATTACK_PROBS.MID.chanceMax * 0.7);
      } else if (isCAM) {
        shot = clamp((getAttr(p, 'longShots') / 100) * ATTACK_PROBS.MID.shotMultiplier * effectiveMod * effectiveness * 1.3, ATTACK_PROBS.MID.shotMin, ATTACK_PROBS.MID.shotMax * 1.3);
        chance = clamp((getAttr(p, 'vision') / 100) * ATTACK_PROBS.MID.chanceMultiplier * effectiveMod * effectiveness * 1.4, ATTACK_PROBS.MID.chanceMin, ATTACK_PROBS.MID.chanceMax * 1.4);
        interception = clamp((getAttr(p, 'anticipation') / 100) * ATTACK_PROBS.MID.interceptionMultiplier * effectiveMod * effectiveness * 0.5, ATTACK_PROBS.MID.interceptionMin, ATTACK_PROBS.MID.interceptionMax * 0.6);
      } else if (isWinger) {
        shot = clamp((getAttr(p, 'crossing') / 100) * ATTACK_PROBS.MID.shotMultiplier * effectiveMod * effectiveness * 1.1, ATTACK_PROBS.MID.shotMin, ATTACK_PROBS.MID.shotMax * 1.1);
        chance = clamp((getAttr(p, 'dribbling') / 100) * ATTACK_PROBS.MID.chanceMultiplier * effectiveMod * effectiveness * 1.2, ATTACK_PROBS.MID.chanceMin, ATTACK_PROBS.MID.chanceMax * 1.2);
        interception = clamp((getAttr(p, 'anticipation') / 100) * ATTACK_PROBS.MID.interceptionMultiplier * effectiveMod * effectiveness * 0.7, ATTACK_PROBS.MID.interceptionMin, ATTACK_PROBS.MID.interceptionMax * 0.7);
      } else {
        // CM (standart)
        shot = clamp((getAttr(p, 'longShots') / 100) * ATTACK_PROBS.MID.shotMultiplier * effectiveMod * effectiveness, ATTACK_PROBS.MID.shotMin, ATTACK_PROBS.MID.shotMax);
        chance = clamp((getAttr(p, 'vision') / 100) * ATTACK_PROBS.MID.chanceMultiplier * effectiveMod * effectiveness, ATTACK_PROBS.MID.chanceMin, ATTACK_PROBS.MID.chanceMax);
        interception = clamp((getAttr(p, 'anticipation') / 100) * ATTACK_PROBS.MID.interceptionMultiplier * effectiveMod * effectiveness, ATTACK_PROBS.MID.interceptionMin, ATTACK_PROBS.MID.interceptionMax);
      }
      foul = ATTACK_PROBS.MID.foul;
    } else if (pos === 'DEF') {
      // CB, LB, RB, LWB, RWB için farklı ağırlıklar
      const isFullback = specPos === 'LB' || specPos === 'RB';
      const isWingback = specPos === 'LWB' || specPos === 'RWB';

      if (isFullback || isWingback) {
        // Bekler: daha çok top taşıma ve cross
        tackle = clamp((getAttr(p, 'tackling') / 100) * ATTACK_PROBS.DEF.tackleMultiplier * effectiveMod * effectiveness * 0.8, ATTACK_PROBS.DEF.tackleMin, ATTACK_PROBS.DEF.tackleMax * 0.9);
        chance = clamp((getAttr(p, 'crossing') / 100) * ATTACK_PROBS.DEF.interceptionMultiplier * effectiveMod * effectiveness * 0.4, 0, ATTACK_PROBS.MID.chanceMax * 0.4);
        interception = clamp((getAttr(p, 'anticipation') / 100) * ATTACK_PROBS.DEF.interceptionMultiplier * effectiveMod * effectiveness * 0.9, ATTACK_PROBS.DEF.interceptionMin, ATTACK_PROBS.DEF.interceptionMax * 0.9);
      } else {
        // CB (standart)
        tackle = clamp((getAttr(p, 'tackling') / 100) * ATTACK_PROBS.DEF.tackleMultiplier * effectiveMod * effectiveness, ATTACK_PROBS.DEF.tackleMin, ATTACK_PROBS.DEF.tackleMax);
        interception = clamp((getAttr(p, 'anticipation') / 100) * ATTACK_PROBS.DEF.interceptionMultiplier * effectiveMod * effectiveness, ATTACK_PROBS.DEF.interceptionMin, ATTACK_PROBS.DEF.interceptionMax);
      }
      foul = ATTACK_PROBS.DEF.foul;
    } else if (pos === 'GK') {
      save = clamp((getAttr(p, 'goalkeeping') / 100) * ATTACK_PROBS.GK.saveMultiplier * effectiveMod * effectiveness, ATTACK_PROBS.GK.saveMin, ATTACK_PROBS.GK.saveMax);
    }
  } else {
    // Defending phase
    if (pos === 'DEF') {
      const isFullback = specPos === 'LB' || specPos === 'RB';
      const isWingback = specPos === 'LWB' || specPos === 'RWB';

      if (isFullback || isWingback) {
        // Bekler: daha çok top kazanma, az interception
        tackle = clamp((getAttr(p, 'tackling') / 100) * DEFEND_PROBS.DEF.tackleMultiplier * effectiveMod * effectiveness * 0.9, DEFEND_PROBS.DEF.tackleMin, DEFEND_PROBS.DEF.tackleMax * 0.95);
        interception = clamp((getAttr(p, 'anticipation') / 100) * DEFEND_PROBS.DEF.interceptionMultiplier * effectiveMod * effectiveness * 0.8, DEFEND_PROBS.DEF.interceptionMin, DEFEND_PROBS.DEF.interceptionMax * 0.85);
      } else {
        // CB (standart)
        tackle = clamp((getAttr(p, 'tackling') / 100) * DEFEND_PROBS.DEF.tackleMultiplier * effectiveMod * effectiveness, DEFEND_PROBS.DEF.tackleMin, DEFEND_PROBS.DEF.tackleMax);
        interception = clamp((getAttr(p, 'anticipation') / 100) * DEFEND_PROBS.DEF.interceptionMultiplier * effectiveMod * effectiveness, DEFEND_PROBS.DEF.interceptionMin, DEFEND_PROBS.DEF.interceptionMax);
      }
      foul = DEFEND_PROBS.DEF.foul;
    } else if (pos === 'MID') {
      const isCDM = specPos === 'CDM';
      const isCAM = specPos === 'CAM';

      if (isCDM) {
        // CDM: savunma fazında çok etkili
        tackle = clamp((getAttr(p, 'tackling') / 100) * DEFEND_PROBS.MID.tackleMultiplier * effectiveMod * effectiveness * 1.3, DEFEND_PROBS.MID.tackleMin, DEFEND_PROBS.MID.tackleMax * 1.3);
        interception = clamp((getAttr(p, 'anticipation') / 100) * DEFEND_PROBS.MID.interceptionMultiplier * effectiveMod * effectiveness * 1.3, DEFEND_PROBS.MID.interceptionMin, DEFEND_PROBS.MID.interceptionMax * 1.3);
      } else if (isCAM) {
        // CAM: savunma fazında az etkili
        tackle = clamp((getAttr(p, 'tackling') / 100) * DEFEND_PROBS.MID.tackleMultiplier * effectiveMod * effectiveness * 0.5, DEFEND_PROBS.MID.tackleMin, DEFEND_PROBS.MID.tackleMax * 0.6);
        interception = clamp((getAttr(p, 'anticipation') / 100) * DEFEND_PROBS.MID.interceptionMultiplier * effectiveMod * effectiveness * 0.5, DEFEND_PROBS.MID.interceptionMin, DEFEND_PROBS.MID.interceptionMax * 0.6);
      } else {
        // CM (standart)
        tackle = clamp((getAttr(p, 'tackling') / 100) * DEFEND_PROBS.MID.tackleMultiplier * effectiveMod * effectiveness, DEFEND_PROBS.MID.tackleMin, DEFEND_PROBS.MID.tackleMax);
        interception = clamp((getAttr(p, 'anticipation') / 100) * DEFEND_PROBS.MID.interceptionMultiplier * effectiveMod * effectiveness, DEFEND_PROBS.MID.interceptionMin, DEFEND_PROBS.MID.interceptionMax);
      }
      foul = DEFEND_PROBS.MID.foul;
    } else if (pos === 'GK') {
      save = clamp((getAttr(p, 'goalkeeping') / 100) * DEFEND_PROBS.GK.saveMultiplier * effectiveMod * effectiveness, DEFEND_PROBS.GK.saveMin, DEFEND_PROBS.GK.saveMax);
    } else if (pos === 'FWD') {
      interception = clamp((getAttr(p, 'aggression') / 100) * DEFEND_PROBS.FWD.interceptionMultiplier * effectiveMod * effectiveness, DEFEND_PROBS.FWD.interceptionMin, DEFEND_PROBS.FWD.interceptionMax);
      foul = DEFEND_PROBS.FWD.foul;
    }
  }

  // Strength ratio modifier
  const strengthRatio = teamStrength / (teamStrength + oppositionStrength);

  if (isAttacking) {
    shot *= strengthRatio * STRENGTH_RATIO.attackShot;
    chance *= strengthRatio * STRENGTH_RATIO.attackChance;
  } else {
    tackle *= (1 - strengthRatio) * STRENGTH_RATIO.defendTackle;
    save *= (1 - strengthRatio) * STRENGTH_RATIO.defendSave;
  }

  // Weather modifiers
  shot *= weatherMods.shootingMod;
  tackle *= weatherMods.tacklingMod;

  // Tactic aggression modifier
  foul *= 1.0; // Will be modified by team tactic externally

  return {
    shot: clamp(shot, 0, PROB_CAPS.shot),
    tackle: clamp(tackle, 0, PROB_CAPS.tackle),
    interception: clamp(interception, 0, PROB_CAPS.interception),
    foul: clamp(foul, 0, PROB_CAPS.foul),
    chance: clamp(chance, 0, PROB_CAPS.chance),
    save: clamp(save, 0, PROB_CAPS.save),
  };
}

// =============================================================================
// Trait Engine Effect System
// =============================================================================
// Trait'lerin maç motoru olasılıklarına (goalChance, probs) etkisini hesaplar.
// Sadece engineEffect alanına sahip veya level'e sahip pozitif traitler ve
// penalty alanına sahip negatif traitler motoru etkiler.
// Her trait'in goalChance üzerindeki etkisi maksimum ±0.03 ile sınırlıdır.

const TRAIT_EFFECT_CAP = 0.03; // Maksimum ±0.03 goalChance değişimi per trait

// Level bazlı varsayılan engineWeight (trait'in kendi engineEffect'i yoksa)
const DEFAULT_ENGINE_WEIGHT: Record<string, number> = {
  MOR: 0.04,
  ALTIN: 0.035,
  LACIVERT: 0.03,
  BEYAZ: 0.025,
};

const OFFENSIVE_CATEGORIES = new Set(['forvet', 'orta_saha']);

interface TraitEngineInfo {
  engineWeight: number;
  category: string;
  isOffensive: boolean;
  counterFor?: string;
}

// Build lookup maps once (lazy, first match call triggers build)
const traitLookupMap = new Map<string, TraitEngineInfo[]>();
const negTraitPenaltyMap = new Map<string, Record<string, number>>();
let traitLookupBuilt = false;

function ensureTraitLookup() {
  if (traitLookupBuilt) return;
  traitLookupBuilt = true;

  for (const [category, data] of Object.entries(TRAITS_DATA)) {
    const catData = data as { pozitif?: any[]; negatif?: any[] };
    const isOffensive = OFFENSIVE_CATEGORIES.has(category);

    if (catData.pozitif && Array.isArray(catData.pozitif)) {
      for (const trait of catData.pozitif) {
        let engineWeight: number | undefined;

        // Öncelikle trait'in kendi engineEffect'i kullanılır
        if (trait.engineEffect) {
          engineWeight = trait.engineEffect.engineWeight;
        } else if (trait.level && DEFAULT_ENGINE_WEIGHT[trait.level]) {
          // engineEffect yoksa level bazlı varsayılan kullanılır
          engineWeight = DEFAULT_ENGINE_WEIGHT[trait.level];
        }

        if (engineWeight !== undefined) {
          const info: TraitEngineInfo = {
            engineWeight,
            category,
            isOffensive,
            counterFor: trait.counterFor,
          };
          const existing = traitLookupMap.get(trait.name) || [];
          existing.push(info);
          traitLookupMap.set(trait.name, existing);
        }
      }
    }

    if (catData.negatif && Array.isArray(catData.negatif)) {
      for (const trait of catData.negatif) {
        if (trait.penalty) {
          negTraitPenaltyMap.set(trait.name, trait.penalty);
        }
      }
    }
  }
}

/**
 * Trait ismini pozisyon grubuna göre çözümler.
 * Aynı isimli trait farklı kategorilerde farklı anlama gelebilir
 * (örn: "Ofsayt ustası" hem defans hem forvette var).
 */
function resolveTraitInfo(traitName: string, playerPosGroup: string): TraitEngineInfo | undefined {
  const infos = traitLookupMap.get(traitName);
  if (!infos || infos.length === 0) return undefined;

  // Tek eşleşme varsa direkt döndür
  if (infos.length === 1) return infos[0];

  // Çoklu eşleşme: oyuncunun pozisyon grubuna göre en uygun olanı seç
  if (playerPosGroup === 'FWD' || playerPosGroup === 'MID') {
    return infos.find(i => i.isOffensive) || infos[0];
  } else {
    return infos.find(i => !i.isOffensive) || infos[0];
  }
}

/**
 * Saldıran oyuncunun trait'lerinin goalChance'e etkisini uygular.
 * Ofansif traitler (forvet/orta_saha) goalChance'i artırır:
 *   goalChance *= (1 + engineWeight)
 * Defansif traitler hücumda yarı etkiyle goalChance'i düşürür:
 *   goalChance *= (1 - engineWeight * 0.5)
 * Negatif traitler penalty alanına göre küçük ceza uygular:
 *   goalChance *= (1 - 0.01 * penaltyMagnitude / 10)
 * Her trait'in etkisi ±0.03 absolute change ile sınırlıdır.
 */
function applyAttackerTraitEffects(
  goalChance: number,
  attacker: MutablePlayerState,
): number {
  ensureTraitLookup();

  const traits = attacker.player.traits || [];
  const negTraits = attacker.player.negTraits || [];
  const posGroup = positionGroup(attacker.player);

  // Pozitif trait etkileri
  for (const traitName of traits) {
    const info = resolveTraitInfo(traitName, posGroup);
    if (!info) continue;

    const prevGoalChance = goalChance;

    if (info.isOffensive) {
      // Ofansif trait (forvet/orta_saha) → goalChance artır
      goalChance *= (1 + info.engineWeight);
    } else {
      // Defansif trait hücumda → goalChance hafif düşür (yarım etki)
      goalChance *= (1 - info.engineWeight * 0.5);
    }

    // Her trait'in goalChance değişimi ±0.03 ile sınırlı
    const delta = goalChance - prevGoalChance;
    if (Math.abs(delta) > TRAIT_EFFECT_CAP) {
      goalChance = prevGoalChance + Math.sign(delta) * TRAIT_EFFECT_CAP;
    }
  }

  // Negatif trait etkileri — penalty alanından küçük ceza
  for (const traitName of negTraits) {
    const penalty = negTraitPenaltyMap.get(traitName);
    if (!penalty) continue;

    const penaltyValues = Object.values(penalty);
    const avgMagnitude = penaltyValues.reduce((sum, v) => sum + Math.abs(v), 0) / penaltyValues.length;

    // penaltyMagnitude / 10 oranında küçük ceza (örn: penalty -10 → 0.01 azalma)
    const prevGoalChance = goalChance;
    goalChance *= (1 - 0.01 * avgMagnitude / 10);

    // ±0.03 sınırı
    const delta = goalChance - prevGoalChance;
    if (Math.abs(delta) > TRAIT_EFFECT_CAP) {
      goalChance = prevGoalChance - Math.min(TRAIT_EFFECT_CAP, Math.abs(delta));
    }
  }

  return goalChance;
}

/**
 * Savunan takımın kaleci/defans oyuncularının trait'lerinin
 * probs.save ve probs.tackle değerlerine etkisini uygular.
 * Kaleci traitleri probs.save'i artırır.
 * Defans traitleri probs.tackle'ı artırır.
 * engineWeight olmayan traitler atlanır.
 */
function applyDefenderTraitEffects(
  probs: ProbabilityWeights,
  defendingGK: MutablePlayerState | undefined,
  defendingDefender: MutablePlayerState | undefined,
): void {
  ensureTraitLookup();

  // Kaleci trait'leri → probs.save
  if (defendingGK) {
    const traits = defendingGK.player.traits || [];
    for (const traitName of traits) {
      const info = resolveTraitInfo(traitName, 'GK');
      if (!info) continue;

      // Kaleci veya defansif trait → save olasılığını artır
      if (info.category === 'kaleci' || !info.isOffensive) {
        probs.save *= (1 + info.engineWeight);
        probs.save = clamp(probs.save, 0, PROB_CAPS.save);
      }
    }
  }

  // Defans oyuncusu trait'leri → probs.tackle
  if (defendingDefender) {
    const traits = defendingDefender.player.traits || [];
    for (const traitName of traits) {
      const info = resolveTraitInfo(traitName, 'DEF');
      if (!info) continue;

      // Defansif trait → tackle olasılığını artır
      if (!info.isOffensive) {
        probs.tackle *= (1 + info.engineWeight);
        probs.tackle = clamp(probs.tackle, 0, PROB_CAPS.tackle);
      }
    }
  }
}

// =============================================================================
// Main Simulation
// =============================================================================

export function simulateEnhancedMatch(
  homePlayers: Player[],
  awayPlayers: Player[],
  homeTactic: ActiveTactic,
  awayTactic: ActiveTactic,
  options?: SimulationOptions
): EnhancedMatchResult {
  // ── Pozisyon etkinlik cache'ini temizle (yeni maç) ──
  clearEffectivenessCache();

  // ── Pre-match Setup ─────────────────────────────────────────────────────
  const weather = options?.weather ?? (pick(WEATHER_DISTRIBUTION) as Weather);
  const weatherMods = getWeatherModifiers(weather);

  // Initialize mutable player states
  const createMutableState = (players: Player[], team: 'home' | 'away'): MutablePlayerState[] => {
    return players.map(p => ({
      player: p,
      team,
      isSubbedOut: false,
      isSubbedIn: false,
      isInjured: false,
      currentCond: p.cond,
      events: [],
      goals: 0,
      assists: 0,
      shots: 0,
      shotsOnTarget: 0,
      tackles: 0,
      interceptions: 0,
      passes: 0,
      keyPasses: 0,
      saves: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
      ratingDelta: 0,
      minuteEntered: 0,
      minuteLeft: MATCH_STRUCTURE.duration,
    }));
  };

  // ── B5: Captain Detection & Leadership System ──────────────────────────
  // Detect captain by options.captainId or player.special_role, then calculate
  // morale and position group boosts based on personality traits.
  // - "Lider" personality trait AND captain → +5% morale boost to all teammates
  // - Captain with "Kaptan" special role → +3% boost to nearby position group
  // - "Soyunma odası lideri" trait on captain → +2% extra global morale
  // - "Sessiz lider" trait on captain → +1% extra global morale
  function detectCaptain(
    team: MutablePlayerState[],
    captainId?: string
  ): { captain: MutablePlayerState | null; moraleBoost: number; positionGroupBoost: number } {
    // 1) Try to find by captainId from options
    let captain = captainId
      ? team.find(p => p.player.id === captainId) ?? null
      : null;

    // 2) Fallback: find by special_role
    if (!captain) {
      captain = team.find(p =>
        kaptanMi(p.player.special_role)
      ) ?? null;
    }

    // 3) Further fallback: highest leadership attribute among starters
    if (!captain) {
      const sorted = [...team]
        .filter(p => !p.isSubbedOut && !p.isInjured)
        .sort((a, b) => (getAttr(b.player, 'leadership', 0)) - (getAttr(a.player, 'leadership', 0)));
      if (sorted.length > 0 && getAttr(sorted[0].player, 'leadership', 0) >= 70) {
        captain = sorted[0];
      }
    }

    if (!captain) {
      return { captain: null, moraleBoost: 0, positionGroupBoost: 0 };
    }

    const personalityTraits: string[] = captain.player.personalityTraits || [];
    const regularTraits: string[] = captain.player.traits || [];
    let moraleBoost = 0;
    let positionGroupBoost = 0;

    // Base captain effect: +2% morale (being captain itself gives a small boost)
    moraleBoost += 0.02;

    // "Lider" personality trait AND is captain → +5% morale boost to all teammates
    if (personalityTraits.includes('Lider')) {
      moraleBoost += 0.05;
    }

    // "Kaptan" special_role → +3% boost to nearby position group
    // (This represents the captain armband authority — organized leadership)
    if (kaptanMi(captain.player.special_role) || captainId) {
      positionGroupBoost += 0.03;
    }

    // "Soyunma odası lideri" trait on captain → +2% extra global morale
    if (regularTraits.includes('Soyunma odası lideri')) {
      moraleBoost += 0.02;
    }

    // "Sessiz lider" trait on captain → +1% extra global morale
    if (regularTraits.includes('Sessiz lider')) {
      moraleBoost += 0.01;
    }

    // Leadership attribute scaling: 70+ leadership gives scaling bonus (up to +2%)
    const leadershipAttr = getAttr(captain.player, 'leadership', 0);
    if (leadershipAttr >= 70) {
      moraleBoost += (leadershipAttr - 70) / 100 * 0.02; // 70→0, 100→+0.006, realistically small
    }

    // Cap the morale boost at 0.08 (8%)
    moraleBoost = Math.min(moraleBoost, 0.08);
    positionGroupBoost = Math.min(positionGroupBoost, 0.03);

    // Apply morale boost to all teammates
    if (!captain.isSubbedOut) {
      for (const p of team) {
        if (p.player.id !== captain.player.id) {
          p.player = {
            ...p.player,
            morale: Math.min(100, (p.player.morale || 60) + Math.round(moraleBoost * 100)),
          };
        }
      }
    }

    return { captain, moraleBoost, positionGroupBoost };
  }

  const homeMutablePlayers = createMutableState(homePlayers, 'home');
  const awayMutablePlayers = createMutableState(awayPlayers, 'away');

  // B5: Detect captains and calculate leadership boosts
  const homeCaptainInfo = detectCaptain(homeMutablePlayers, options?.homeCaptainId);
  const awayCaptainInfo = detectCaptain(awayMutablePlayers, options?.awayCaptainId);

  // Initialize substitutes
  const homeSubstitutes = createMutableState(options?.substitutes?.home || [], 'home');
  const awaySubstitutes = createMutableState(options?.substitutes?.away || [], 'away');

  // Initialize referee match context (uses referee.ts system)
  const defaultReferee = {
    id: 'ref-default',
    name: options?.refereeName ?? 'Varsayılan Hakem',
    personality: (options?.refereePersonality ?? 'balanced') as RefereePersonality,
    experience: 5,
    league_id: 'default',
    strictness: options?.refereeStrictness ?? 50,
    totalMatches: 0,
    totalYellows: 0,
    totalReds: 0,
    totalPenalties: 0,
  };
  const refCtx: RefereeMatchContext = createRefereeMatchContext(defaultReferee);

  // Calculate strengths — BUG-10: pass pressure effect for away team in high-atmosphere matches
  const atmosScore = options?.atmosphereScore ?? 50;
  const applyAwayPressure = atmosScore > AWAY_PRESSURE_EFFECT.atmosphereThreshold;

  const homeStrength = calculateTeamStrength(homePlayers, homeTactic);
  const awayStrength = calculateTeamStrength(awayPlayers, awayTactic, { pressureEffect: applyAwayPressure });

  // ── Play Style Modifiers ──────────────────────────────────────────────
  // Apply play style effects to team strengths. Play style modifiers affect
  // possession, pressing, defense, counter-attack, etc.
  const homePS = options?.homePlayStyleModifiers;
  const awayPS = options?.awayPlayStyleModifiers;

  // Apply play style to team strength calculations
  if (homePS) {
    homeStrength.attack *= (1 + (homePS.shotFrequencyBonus + homePS.shotAccuracyBonus) * PLAYSTYLE_WEIGHTS.combinationWeight);
    homeStrength.midfield *= (1 + (homePS.passAccuracyBonus + homePS.possessionBonus) * PLAYSTYLE_WEIGHTS.combinationWeight);
    homeStrength.defense *= (1 + (homePS.defenseBonus + homePS.tackleBonus) * PLAYSTYLE_WEIGHTS.combinationWeight);
    homeStrength.overall = (homeStrength.attack * OVERALL_WEIGHT_ATTACK + homeStrength.midfield * OVERALL_WEIGHT_MIDFIELD + homeStrength.defense * OVERALL_WEIGHT_DEFENSE + homeStrength.gk * OVERALL_WEIGHT_GK);
  }
  if (awayPS) {
    awayStrength.attack *= (1 + (awayPS.shotFrequencyBonus + awayPS.shotAccuracyBonus) * PLAYSTYLE_WEIGHTS.combinationWeight);
    awayStrength.midfield *= (1 + (awayPS.passAccuracyBonus + awayPS.possessionBonus) * PLAYSTYLE_WEIGHTS.combinationWeight);
    awayStrength.defense *= (1 + (awayPS.defenseBonus + awayPS.tackleBonus) * PLAYSTYLE_WEIGHTS.combinationWeight);
    awayStrength.overall = (awayStrength.attack * OVERALL_WEIGHT_ATTACK + awayStrength.midfield * OVERALL_WEIGHT_MIDFIELD + awayStrength.defense * OVERALL_WEIGHT_DEFENSE + awayStrength.gk * OVERALL_WEIGHT_GK);
  }

  // ── BUG-10: Dynamic Home Advantage based on atmosphere ────────────────
  // Atmosfer skoruna göre ev sahibi avantajı dinamik olarak ayarlanır:
  //   atmosphere 0-30  → home advantage 10%
  //   atmosphere 31-60 → home advantage 18% (varsayılan)
  //   atmosphere 61-80 → home advantage 22%
  //   atmosphere 81-100 → home advantage 25%
  const baseAdvantage = 0.18; // HOME_ADVANTAGE base = 18%
  let atmosAdvantage = baseAdvantage;
  for (const tier of ATMOSPHERE_HOME_ADVANTAGE_TIERS) {
    if (atmosScore <= tier.maxAtmos) {
      atmosAdvantage = tier.advantage;
      break;
    }
  }
  // Scale HOME_ADVANTAGE multipliers relative to the atmosphere tier
  // e.g. 18% base → 10% atmos = scale factor 10/18 ≈ 0.556
  const atmosScale = atmosAdvantage / baseAdvantage;
  const effectiveHomeAdvantage = {
    overall: 1 + (HOME_ADVANTAGE.overall - 1) * atmosScale,
    attack: 1 + (HOME_ADVANTAGE.attack - 1) * atmosScale,
    midfield: 1 + (HOME_ADVANTAGE.midfield - 1) * atmosScale,
    defense: 1 + (HOME_ADVANTAGE.defense - 1) * atmosScale,
  };

  homeStrength.overall *= effectiveHomeAdvantage.overall;
  homeStrength.attack *= effectiveHomeAdvantage.attack;
  homeStrength.midfield *= effectiveHomeAdvantage.midfield;
  homeStrength.defense *= effectiveHomeAdvantage.defense;

  const homeTeam: TeamState = {
    players: homeMutablePlayers,
    tactic: homeTactic,
    overallStrength: homeStrength.overall,
    attackStrength: homeStrength.attack,
    midfieldStrength: homeStrength.midfield,
    defenseStrength: homeStrength.defense,
    gkStrength: homeStrength.gk,
    substitutionSlots: MATCH_STRUCTURE.substitutionSlots,
    usedSubs: 0,
    substitutes: homeSubstitutes,
    // B5: Captain fields
    captain: homeCaptainInfo.captain,
    captainMoraleBoost: homeCaptainInfo.moraleBoost,
    captainPositionGroupBoost: homeCaptainInfo.positionGroupBoost,
  };

  const awayTeam: TeamState = {
    players: awayMutablePlayers,
    tactic: awayTactic,
    overallStrength: awayStrength.overall,
    attackStrength: awayStrength.attack,
    midfieldStrength: awayStrength.midfield,
    defenseStrength: awayStrength.defense,
    gkStrength: awayStrength.gk,
    substitutionSlots: MATCH_STRUCTURE.substitutionSlots,
    usedSubs: 0,
    substitutes: awaySubstitutes,
    // B5: Captain fields
    captain: awayCaptainInfo.captain,
    captainMoraleBoost: awayCaptainInfo.moraleBoost,
    captainPositionGroupBoost: awayCaptainInfo.positionGroupBoost,
  };

  // ── B5: Apply captain morale boost to team strengths ───────────────────
  // Captain's leadership increases overall team effectiveness.
  // The boost is applied multiplicatively to all strength dimensions.
  if (homeTeam.captainMoraleBoost > 0) {
    const captainMod = 1 + homeTeam.captainMoraleBoost;
    homeTeam.overallStrength *= captainMod;
    homeTeam.attackStrength *= captainMod;
    homeTeam.midfieldStrength *= captainMod;
    homeTeam.defenseStrength *= captainMod;
    // Also apply position group boost to captain's position group
    if (homeTeam.captainPositionGroupBoost > 0 && homeTeam.captain) {
      const captainPos = positionGroup(homeTeam.captain.player);
      const posMod = 1 + homeTeam.captainPositionGroupBoost;
      if (captainPos === 'FWD') homeTeam.attackStrength *= posMod;
      else if (captainPos === 'MID') homeTeam.midfieldStrength *= posMod;
      else if (captainPos === 'DEF') homeTeam.defenseStrength *= posMod;
      else if (captainPos === 'GK') homeTeam.gkStrength *= posMod;
    }
  }
  if (awayTeam.captainMoraleBoost > 0) {
    const captainMod = 1 + awayTeam.captainMoraleBoost;
    awayTeam.overallStrength *= captainMod;
    awayTeam.attackStrength *= captainMod;
    awayTeam.midfieldStrength *= captainMod;
    awayTeam.defenseStrength *= captainMod;
    // Also apply position group boost to captain's position group
    if (awayTeam.captainPositionGroupBoost > 0 && awayTeam.captain) {
      const captainPos = positionGroup(awayTeam.captain.player);
      const posMod = 1 + awayTeam.captainPositionGroupBoost;
      if (captainPos === 'FWD') awayTeam.attackStrength *= posMod;
      else if (captainPos === 'MID') awayTeam.midfieldStrength *= posMod;
      else if (captainPos === 'DEF') awayTeam.defenseStrength *= posMod;
      else if (captainPos === 'GK') awayTeam.gkStrength *= posMod;
    }
  }

  // ── Per-player position effectiveness maps ─────────────────────────
  // Her oyuncunun pozisyon etkinliğini önceden hesapla, goalChance'te kullanılacak
  const homeEffectiveness = new Map<string, number>();
  const awayEffectiveness = new Map<string, number>();

  for (const player of homePlayers) {
    const targetPos = player.specificPosition || player.position || 'CM';
    homeEffectiveness.set(player.id, getPositionEffectiveness(player, targetPos));
  }
  for (const player of awayPlayers) {
    const targetPos = player.specificPosition || player.position || 'CM';
    awayEffectiveness.set(player.id, getPositionEffectiveness(player, targetPos));
  }

  // Score — for incremental simulation, carry over initial scores
  const effectiveStart = options?.startMinute ?? 1;
  const effectiveEnd = options?.endMinute ?? MATCH_STRUCTURE.duration;
  let homeScore = options?.initialHomeScore ?? 0;
  let awayScore = options?.initialAwayScore ?? 0;

  // All events
  const allEvents: MatchEvent[] = [];

  // Live statistics
  const homeLiveStats: LiveStats = {
    possessionTicks: 0,
    shots: 0,
    shotsOnTarget: 0,
    passes: 0,
    passSuccesses: 0,
    tackles: 0,
    interceptions: 0,
    fouls: 0,
    yellowCards: 0,
    redCards: 0,
    corners: 0,
    freeKicks: 0,
    offsides: 0,
    injuries: 0,
    saves: 0,
  };
  const awayLiveStats: LiveStats = {
    possessionTicks: 0,
    shots: 0,
    shotsOnTarget: 0,
    passes: 0,
    passSuccesses: 0,
    tackles: 0,
    interceptions: 0,
    fouls: 0,
    yellowCards: 0,
    redCards: 0,
    corners: 0,
    freeKicks: 0,
    offsides: 0,
    injuries: 0,
    saves: 0,
  };

  // ── Helper: Get active (on-pitch) players ──────────────────────────────
  const getActivePlayers = (team: TeamState): MutablePlayerState[] =>
    team.players.filter(p => !p.isSubbedOut && !p.isInjured);

  // ── Helper: Get players by position ─────────────────────────────────────
  // Geniş pozisyon grubuna (GK/DEF/MID/FWD) göre filtreler ve
  // pozisyon etkinlik puanına göre sıralar (en uygun oyuncu önce)
  const getByPosition = (team: TeamState, pos: string): MutablePlayerState[] => {
    const candidates = getActivePlayers(team).filter(p => positionGroup(p.player) === pos);
    // Pozisyon etkinlik puanına göre sırala — kendi mevkisinde en etkili oyuncu öne
    candidates.sort((a, b) => {
      const effA = getPositionEffectiveness(a.player, a.player.specificPosition || a.player.position);
      const effB = getPositionEffectiveness(b.player, b.player.specificPosition || b.player.position);
      return effB - effA;
    });
    return candidates;
  };

  // ── Helper: Create an event ─────────────────────────────────────────────
  const createEvent = (
    minute: number,
    type: MatchEventType,
    team: TeamState,
    player: MutablePlayerState,
    secondary?: MutablePlayerState,
    ratingImpact = 0
  ): MatchEvent => {
    const coords = getPitchCoords(player.team, positionGroup(player.player), type);
    const event: MatchEvent = {
      minute,
      type,
      team: player.team,
      playerName: player.player.name,
      playerId: player.player.id,
      assistPlayerId: secondary?.player.id,
      assistPlayerName: secondary?.player.name,
      description: '',
      x: coords.x,
      y: coords.y,
      ratingImpact,
    };

    // Generate commentary using the unified trait-based commentary generator
    event.description = generateRichCommentary(
      type,
      player,
      secondary,
      minute
    );

    return event;
  };

  // ── Helper: Determine momentum (which team has the ball) ────────────────
  const determineMomentum = (minute: number): 'home' | 'away' => {
    let homeWeight = homeTeam.overallStrength;
    let awayWeight = awayTeam.overallStrength;

    // Period-based adjustments
    let homeBias = 1.0;
    let awayBias = 1.0;

    // Home team tends to start stronger
    if (minute <= MOMENTUM_BIASES.earlyHomeCutoff) homeBias = MOMENTUM_BIASES.earlyHomeBias;
    // Second half away team sometimes rallies
    if (minute > MOMENTUM_BIASES.awayRallyStart && minute <= MOMENTUM_BIASES.awayRallyEnd) awayBias = MOMENTUM_BIASES.awayRallyBias;
    // Late game: leading team may sit back
    if (minute > MOMENTUM_BIASES.leadSitBackCutoff) {
      if (homeScore > awayScore) homeBias = MOMENTUM_BIASES.leadSitBack;
      if (awayScore > homeScore) awayBias = MOMENTUM_BIASES.leadSitBack;
    }

    // If a team is down, they push forward
    if (homeScore < awayScore && minute > MOMENTUM_BIASES.losingPushCutoff) homeBias = MOMENTUM_BIASES.losingTeamPush;
    if (awayScore < homeScore && minute > MOMENTUM_BIASES.losingPushCutoff) awayBias = MOMENTUM_BIASES.losingTeamPush;

    // Red card penalty
    const homeReds = homeLiveStats.redCards;
    const awayReds = awayLiveStats.redCards;
    if (homeReds > 0) homeBias *= MOMENTUM_BIASES.redCardPenalty;
    if (awayReds > 0) awayBias *= MOMENTUM_BIASES.redCardPenalty;

    // Play style: possession bonus affects momentum
    if (homePS?.possessionBonus) homeBias *= (1 + homePS.possessionBonus);
    if (awayPS?.possessionBonus) awayBias *= (1 + awayPS.possessionBonus);

    const totalWeight = homeWeight * homeBias + awayWeight * awayBias;
    return Math.random() * totalWeight < homeWeight * homeBias ? 'home' : 'away';
  };

  // ── Event throttling: dakikada maksimum 2 olay (UI flood önleme) ────────
  // Kritik olaylar (gol, kırmızı kart, sakatlık, penaltı, değişiklik) her zaman gösterilir
  // Maç başlangıcı/yarı devre/maç sonu gibi yorumlar da muaftır
  let eventsThisMinute = 0;
  let lastThrottleMinute = -1;
  const MAX_EVENTS_PER_MINUTE = 4;
  const CRITICAL_EVENT_TYPES: Set<MatchEventType> = new Set([
    'goal', 'red_card', 'yellow_card', 'penalty', 'injury',
    'substitution', 'var_review', 'goal_overturned',
  ]);

  const pushThrottledEvent = (event: MatchEvent): boolean => {
    // Dakika değiştiğinde sayacı sıfırla
    if (event.minute !== lastThrottleMinute) {
      eventsThisMinute = 0;
      lastThrottleMinute = event.minute;
    }
    // Maç yorumları (boş playerId) ve kritik olaylar throttle'dan muaftır
    const isCommentary = !event.playerId;
    if (isCommentary || CRITICAL_EVENT_TYPES.has(event.type)) {
      allEvents.push(event);
      return true;
    }
    // Dakika sınırını kontrol et
    if (eventsThisMinute >= MAX_EVENTS_PER_MINUTE) {
      return false; // Olay throttled — atlandı
    }
    eventsThisMinute++;
    allEvents.push(event);
    return true;
  };

  // ── Substitution logic ──────────────────────────────────────────────────
  const performSubstitution = (team: TeamState, minute: number, _events: MatchEvent[], liveStats: LiveStats) => {
    if (team.usedSubs >= team.substitutionSlots) return;
    if (team.substitutes.length === 0) return;

    const active = getActivePlayers(team);
    const tiredPlayers = active
      .filter(p => p.currentCond < MATCH_STRUCTURE.tiredPlayerCondThreshold && !p.isSubbedOut && p.minuteEntered < minute)
      .sort((a, b) => a.currentCond - b.currentCond);

    if (tiredPlayers.length === 0) return;

    // Find appropriate substitute by position
    const outPlayer = tiredPlayers[0];
    const outPos = positionGroup(outPlayer.player);

    const sub = team.substitutes.find(
      s => !s.isSubbedIn && positionGroup(s.player) === outPos
    ) ?? team.substitutes.find(s => !s.isSubbedIn);

    if (!sub) return;

    // Execute substitution
    outPlayer.isSubbedOut = true;
    outPlayer.minuteLeft = minute;
    sub.isSubbedIn = true;
    sub.minuteEntered = minute;
    sub.currentCond = sub.player.cond;

    // Move substitute into active roster
    team.players.push(sub);
    team.usedSubs++;

    const event = createEvent(minute, 'substitution', team, outPlayer, sub, 0);
    // Değişiklik olayı: throttle kullan (substitution kritik olay → her zaman gösterilir)
    event.description = generateEventCommentary('substitution', outPlayer, minute, sub);
    pushThrottledEvent(event);
  };

  // ── Main match loop ─────────────────────────────────────────────────────
  let currentMinute = effectiveStart;
  let momentumShiftCounter = 0;

  while (currentMinute <= effectiveEnd) {
    const minute = currentMinute;

    // Weather & referee commentary at start (only for full simulation from minute 1)
    if (minute === 1 && effectiveStart === 1) {
      const refConfig = refCtx.personalityConfig;
      const refInfo = refCtx.referee.name ? ` Hakem: ${refCtx.referee.name} (${refConfig.emoji} ${refConfig.label_tr}, Sertlik: ${refCtx.referee.strictness}).` : '';
      pushThrottledEvent({
        minute: 0,
        type: 'chance',
        team: 'home',
        playerName: '',
        playerId: '',
        description: `Maç başlıyor! Hava durumu: ${weather === 'sunny' ? 'Güneşli' : weather === 'rainy' ? 'Yağmurlu' : weather === 'snowy' ? 'Karlı' : 'Rüzgarlı'}. ${weatherMods.description}${refInfo}`,
        x: 50,
        y: 50,
        ratingImpact: 0,
      });
    }

    // Determine momentum
    const hasMomentum = determineMomentum(minute);
    const attackingTeam = hasMomentum === 'home' ? homeTeam : awayTeam;
    const defendingTeam = hasMomentum === 'home' ? awayTeam : homeTeam;

    // Possession tracking
    if (hasMomentum === 'home') homeLiveStats.possessionTicks++;
    else awayLiveStats.possessionTicks++;

    // Pass simulation (background activity)
    const activeAttackers = getActivePlayers(attackingTeam);
    const passCount = randInt(PASS_SIMULATION.minPasses, PASS_SIMULATION.maxPasses);
    const attackingPS = hasMomentum === 'home' ? homePS : awayPS;
    for (let i = 0; i < passCount; i++) {
      const passer = pick(activeAttackers);
      let passSkill = getAttr(passer.player, 'passing', 50) * weatherMods.passingMod / 100;
      // Play style: pass accuracy bonus
      if (attackingPS?.passAccuracyBonus) {
        passSkill *= (1 + attackingPS.passAccuracyBonus);
      }
      // Play style: long ball bonus reduces short pass accuracy slightly
      if (attackingPS?.longBallBonus && attackingPS.longBallBonus > 0) {
        passSkill *= (1 - attackingPS.longBallBonus * PASS_SIMULATION.longBallShortPassPenalty); // slight penalty for short passes
      }
      passer.passes++;
      if (hasMomentum === 'home') homeLiveStats.passes++;
      else awayLiveStats.passes++;

      if (Math.random() < passSkill) {
        if (hasMomentum === 'home') homeLiveStats.passSuccesses++;
        else awayLiveStats.passSuccesses++;

        // Chance for key pass
        if (Math.random() < passSkill * PASS_SIMULATION.keyPassChance) {
          passer.keyPasses++;
        }
      }
    }

    // Determine if an event happens this minute
    // Events every 1-3 minutes
    momentumShiftCounter++;
    if (momentumShiftCounter >= randInt(1, 3)) {
      momentumShiftCounter = 0;

      // Select a random player from the attacking team to generate an event for
      const posWeights = [
        { pos: 'FWD', weight: attackingTeam.attackStrength },
        { pos: 'MID', weight: attackingTeam.midfieldStrength },
        { pos: 'DEF', weight: attackingTeam.defenseStrength * PLAYSTYLE_WEIGHTS.defenseWeight },
      ];

      const selectedPos = weightedPick(posWeights).pos;
      const candidates = getByPosition(attackingTeam, selectedPos);
      if (candidates.length === 0) {
        // Fallback: pick any active player
        const allActive = getActivePlayers(attackingTeam);
        if (allActive.length === 0) { currentMinute++; continue; }
      }

      const pool = candidates.length > 0 ? candidates : getActivePlayers(attackingTeam);
      const selectedPlayer = pick(pool);
      const opponentGKs = getByPosition(defendingTeam, 'GK');
      const opponentGK = opponentGKs.length > 0 ? opponentGKs[0] : undefined;
      const opponentDefenders = getByPosition(defendingTeam, 'DEF');
      const opponentDefender = opponentDefenders.length > 0 ? pick(opponentDefenders) : undefined;

      const probs = getEventProbabilities(
        selectedPlayer,
        attackingTeam.overallStrength,
        defendingTeam.overallStrength,
        weatherMods,
        minute,
        true
      );

      // ── Trait Engine: Savunan takım trait'leri probs'a etki eder ─────────────
      // Kaleci trait'leri probs.save'i, defans trait'leri probs.tackle'ı artırır
      applyDefenderTraitEffects(probs, opponentGK, opponentDefender);

      // ── Attempt a shot / chance ──────────────────────────────────────
      const shotRoll = Math.random();
      const baseGoalChance = GOAL_CHANCE.base; // 3% base goal per attacking minute
      const strengthRatio = attackingTeam.attackStrength / (attackingTeam.attackStrength + defendingTeam.defenseStrength);

      // Modified goal probability
      // Use position-weighted attributes for attacking contribution
      const finishing = selectedPlayer.player.specificPosition === 'GK' 
        ? 0.1 // GK almost never shoots
        : getPositionalAttributeScore(selectedPlayer.player) / 100;
      const gkRating = opponentGK 
        ? getPositionalAttributeScore(opponentGK.player, 'GK') / 100 
        : 0.5;

      let goalChance = baseGoalChance * strengthRatio * (finishing / (finishing + gkRating * GOAL_CHANCE.gkWeight));

      // ── Pozisyon etkinlik carpani ──────────────────────────────────────
      // Oyuncunun pozisyonuna uygunlugu goalChance'i etkiler
      // effectiveRating = rating * (0.7 + 0.3 * effectiveness)
      // Min %70 rating, max %100 rating — yanlis pozisyonda -%30, dogru pozisyonda +%30
      const playerEff = (hasMomentum === 'home' ? homeEffectiveness : awayEffectiveness)
        .get(selectedPlayer.player.id) ?? 0.7;
      const posEffectivenessMod = 0.7 + 0.3 * playerEff; // 0.7 — 1.0 arası
      goalChance *= posEffectivenessMod;

      // Quality gap modifier — much stronger team creates more
      const qualityGap = Math.abs(attackingTeam.overallStrength - defendingTeam.overallStrength) / 100;
      if (attackingTeam.overallStrength > defendingTeam.overallStrength) {
        goalChance *= (1 + qualityGap * GOAL_CHANCE.qualityGapBonus);
      } else {
        goalChance *= (1 - qualityGap * GOAL_CHANCE.qualityGapPenalty);
      }

      // Tactic mentality modifier
      const tacticMentalityMod = attackingTeam.tactic.mentality >= 4
        ? 1 + (attackingTeam.tactic.mentality - 3) * GOAL_CHANCE.mentalityBonus
        : attackingTeam.tactic.mentality <= 2
          ? 1 - (3 - attackingTeam.tactic.mentality) * GOAL_CHANCE.mentalityPenalty
          : 1.0;
      goalChance *= tacticMentalityMod;

      // ── Play Style: shot frequency & accuracy modifiers ───────────────
      if (attackingPS?.shotFrequencyBonus) {
        goalChance *= (1 + attackingPS.shotFrequencyBonus);
      }
      if (attackingPS?.shotAccuracyBonus) {
        goalChance *= (1 + attackingPS.shotAccuracyBonus);
      }
      // Play Style: counter bonus — increases goal chance when counter-attacking
      // Counter detected when opponent has momentum but defense is outnumbered
      if (attackingPS?.counterBonus && attackingPS.counterBonus > 0) {
        // Counter bonus applies when the team has fewer players in attack or when
        // the defending team has higher aggression (committed players forward)
        const counterChance = Math.random() < GOAL_CHANCE.counterTriggerProb ? attackingPS.counterBonus : 0;
        goalChance *= (1 + counterChance);
      }
      // Play Style: pressing bonus — increases chance of winning ball in dangerous area
      if (attackingPS?.pressingBonus && attackingPS.pressingBonus > 0) {
        // Pressing teams get a small boost to goal probability from high turnovers
        goalChance *= (1 + attackingPS.pressingBonus * GOAL_CHANCE.pressingGoalBoost);
      }

      // ── Live Strategy Tactic Modifiers (goalMod / conceedMod) ──────────────
      // Home team attacking → apply home goalMod + away conceedMod
      // Away team attacking → apply away goalMod + home conceedMod
      const isHomeAttacking = hasMomentum === 'home';
      const attackerMods = isHomeAttacking ? options?.homeTacticModifiers : options?.awayTacticModifiers;
      const defenderMods = isHomeAttacking ? options?.awayTacticModifiers : options?.homeTacticModifiers;
      if (attackerMods?.goalMod) {
        goalChance *= (1 + attackerMods.goalMod);
      }
      if (defenderMods?.conceedMod) {
        goalChance *= (1 + defenderMods.conceedMod);
      }

      // Late game desperation
      if (minute > 80) {
        if (hasMomentum === 'home' && homeScore < awayScore) goalChance *= GOAL_CHANCE.lateGameDesperation;
        if (hasMomentum === 'away' && awayScore < homeScore) goalChance *= GOAL_CHANCE.lateGameDesperation;
      }

      // ── Trait Engine: Saldıran oyuncu trait'leri goalChance'e etki eder ──────
      // Ofansif traitler goalChance'i artırır, negatif traitler azaltır
      // Her trait'in etkisi ±0.03 ile sınırlıdır (oyun dengesi)
      goalChance = applyAttackerTraitEffects(goalChance, selectedPlayer);

      // ── Panikçi mekanizması: 70+ dakika, geride olan takımın Panikçi oyuncuları ──
      if (minute > 70) {
        const teamIsLosing = (hasMomentum === 'home' && homeScore < awayScore) ||
                             (hasMomentum === 'away' && awayScore < homeScore);
        if (teamIsLosing) {
          const isPanicky = selectedPlayer.player.personalityTraits?.some(
            t => t === 'Panikçi' || t === 'Panik yapar'
          );
          if (isPanicky) {
            goalChance *= 0.60; // %40 daha az gol ihtimali
            // Faul ihtimalini artır — %8 ekstra faul
            const foulRoll = Math.random();
            if (foulRoll < 0.08 && opponentDefender) {
              const foulEvent = createEvent(minute, 'foul', defendingTeam, opponentDefender, selectedPlayer, RATING_IMPACT.foulCommitted);
              pushThrottledEvent(foulEvent);
              opponentDefender.events.push(foulEvent);
              if (hasMomentum === 'home') awayLiveStats.fouls++;
              else homeLiveStats.fouls++;
            }
          }
        }
      }

      goalChance = clamp(goalChance, GOAL_CHANCE.clampMin, GOAL_CHANCE.clampMax);

      // Find potential assister (midfielder or other forward)
      const midfielders = getByPosition(attackingTeam, 'MID');
      const otherForwards = getByPosition(attackingTeam, 'FWD').filter(p => p.player.id !== selectedPlayer.player.id);
      const assistCandidates = [...midfielders, ...otherForwards].filter(p => p.player.id !== selectedPlayer.player.id);
      const assister = assistCandidates.length > 0 && Math.random() < ASSIST_CHANCE
        ? pick(assistCandidates)
        : undefined;

      if (shotRoll < goalChance) {
        // ── GOAL ──────────────────────────────────────────────────────
        selectedPlayer.goals++;
        selectedPlayer.shots++;
        selectedPlayer.shotsOnTarget++;
        selectedPlayer.ratingDelta += RATING_IMPACT.goal;

        if (hasMomentum === 'home') {
          homeScore++;
          homeLiveStats.shots++;
          homeLiveStats.shotsOnTarget++;
        } else {
          awayScore++;
          awayLiveStats.shots++;
          awayLiveStats.shotsOnTarget++;
        }

        if (assister) {
          assister.assists++;
          assister.ratingDelta += RATING_IMPACT.assist;
          assister.keyPasses++;
        }

        // Determine goal type
        let goalDetail: 'normal' | 'solo' | 'header' | 'longShot' | 'penalty' | 'freeKick' | 'counter' | 'lateGoal' = 'normal';
        if (!assister) goalDetail = 'solo';
        if (Math.random() < GOAL_TYPE.headerChance && selectedPlayer.player.specificPosition === 'ST') goalDetail = 'header';
        if (Math.random() < GOAL_TYPE.longShotChance && getAttr(selectedPlayer.player, 'longShots', 50) > GOAL_TYPE.longShotThreshold) goalDetail = 'longShot';
        if (minute >= GOAL_TYPE.lateGoalMinute) goalDetail = 'lateGoal';

        const goalEvent = createEvent(
          minute,
          'goal',
          attackingTeam,
          selectedPlayer,
          assister,
          RATING_IMPACT.goal
        );
        goalEvent.description = generateGoalCommentary(
          selectedPlayer,
          assister,
          minute,
          goalDetail
        );

        // VAR check for goal — referee.ts checkVARForGoal
        const isScorerHome = selectedPlayer.team === 'home';
        const varResult = checkVARForGoal(refCtx, isScorerHome);

        if (varResult.varReview && varResult.overturned) {
          // Goal overturned by VAR!
          selectedPlayer.goals--;
          selectedPlayer.ratingDelta -= RATING_IMPACT.goal;
          if (assister) {
            assister.assists--;
            assister.ratingDelta -= RATING_IMPACT.assist;
          }
          if (hasMomentum === 'home') {
            homeScore--;
            homeLiveStats.shotsOnTarget--;
          } else {
            awayScore--;
            awayLiveStats.shotsOnTarget--;
          }

          // Add VAR review event then overturned event
          const varEvent: MatchEvent = {
            minute,
            type: 'var_review',
            team: selectedPlayer.team,
            playerName: selectedPlayer.player.name,
            playerId: selectedPlayer.player.id,
            assistPlayerId: assister?.player.id,
            assistPlayerName: assister?.player.name,
            description: `${minute}. dakikada VAR incelemesi! ${selectedPlayer.player.name}'in golü inceleniyor...`,
            x: 50,
            y: 50,
            ratingImpact: 0,
          };
          pushThrottledEvent(varEvent);

          const overturnedEvent: MatchEvent = {
            minute,
            type: 'goal_overturned',
            team: selectedPlayer.team,
            playerName: selectedPlayer.player.name,
            playerId: selectedPlayer.player.id,
            description: pick(COMMENTARY.goal_overturned)(selectedPlayer.player.name, minute),
            x: 50,
            y: 50,
            ratingImpact: RATING_IMPACT.redCard,
          };
          pushThrottledEvent(overturnedEvent);
          selectedPlayer.events.push(overturnedEvent);
        } else {
          // Goal confirmed (or no VAR review)
          pushThrottledEvent(goalEvent);
          selectedPlayer.events.push(goalEvent);

          if (varResult.varReview) {
            // VAR reviewed but goal stands
            const varEvent: MatchEvent = {
              minute,
              type: 'var_review',
              team: selectedPlayer.team,
              playerName: selectedPlayer.player.name,
              playerId: selectedPlayer.player.id,
              description: `${minute}. dakikada VAR incelemesi — gol geçerli!`,
              x: 50,
              y: 50,
              ratingImpact: 0,
            };
            pushThrottledEvent(varEvent);
          }
        }
        if (assister) assister.events.push(goalEvent);

        // ── B5: Captain effects after goal ────────────────────────────
        // Scoring team: Captain increases morale recovery (+3 to all teammates)
        // Conceding team: Captain reduces morale drop (halves morale penalty)
        const scoringTeam = hasMomentum === 'home' ? homeTeam : awayTeam;
        const concedingTeam = hasMomentum === 'home' ? awayTeam : homeTeam;

        // Captain morale recovery boost for scoring team
        if (scoringTeam.captain && !scoringTeam.captain.isSubbedOut) {
          const captainRecoveryBonus = 3 + Math.round(scoringTeam.captainMoraleBoost * 20);
          for (const p of getActivePlayers(scoringTeam)) {
            if (p.player.id !== scoringTeam.captain.player.id) {
              p.player = {
                ...p.player,
                morale: Math.min(100, (p.player.morale || 60) + captainRecoveryBonus),
              };
            }
          }
          // Captain gets a small morale boost too
          scoringTeam.captain.player = {
            ...scoringTeam.captain.player,
            morale: Math.min(100, (scoringTeam.captain.player.morale || 60) + 2),
          };
        }

        // Captain reduces morale drop for conceding team
        if (concedingTeam.captain && !concedingTeam.captain.isSubbedOut) {
          // Without captain, conceding team would lose ~5 morale
          // With captain, the drop is reduced by the captain's morale boost factor
          const moraleSavePercent = concedingTeam.captainMoraleBoost * 5; // e.g. 0.05 boost → 25% reduction
          const baseDrop = 5;
          const reducedDrop = Math.max(1, Math.round(baseDrop * (1 - moraleSavePercent)));
          for (const p of getActivePlayers(concedingTeam)) {
            if (p.player.id !== concedingTeam.captain.player.id) {
              p.player = {
                ...p.player,
                morale: Math.max(0, (p.player.morale || 60) - reducedDrop),
              };
            }
          }
          // Captain stays composed — no morale drop
        } else {
          // No captain: full morale drop for conceding team
          for (const p of getActivePlayers(concedingTeam)) {
            p.player = {
              ...p.player,
              morale: Math.max(0, (p.player.morale || 60) - 5),
            };
          }
        }

      } else if (shotRoll < goalChance + probs.shot) {
        // ── Shot on target but saved ──────────────────────────────────
        selectedPlayer.shots++;
        selectedPlayer.shotsOnTarget++;
        selectedPlayer.ratingDelta += RATING_IMPACT.shotSaved;
        if (hasMomentum === 'home') {
          homeLiveStats.shots++;
          homeLiveStats.shotsOnTarget++;
        } else {
          awayLiveStats.shots++;
          awayLiveStats.shotsOnTarget++;
        }

        if (opponentGK) {
          opponentGK.saves++;
          opponentGK.ratingDelta += RATING_IMPACT.gkSave;
          if (hasMomentum === 'home') awayLiveStats.saves++;
          else homeLiveStats.saves++;

          const saveEvent = createEvent(minute, 'shot_saved', attackingTeam, selectedPlayer, opponentGK, RATING_IMPACT.shotSaved);
          pushThrottledEvent(saveEvent);
          selectedPlayer.events.push(saveEvent);
          opponentGK.events.push(saveEvent);
        }

      } else if (shotRoll < goalChance + probs.shot * 2.5) {
        // ── Shot wide ────────────────────────────────────────────────
        selectedPlayer.shots++;
        selectedPlayer.ratingDelta += RATING_IMPACT.shotWide;
        if (hasMomentum === 'home') homeLiveStats.shots++;
        else awayLiveStats.shots++;

        const wideEvent = createEvent(minute, 'shot_wide', attackingTeam, selectedPlayer, undefined, RATING_IMPACT.shotWide);
        pushThrottledEvent(wideEvent);
        selectedPlayer.events.push(wideEvent);

      } else if (shotRoll < goalChance + probs.shot * 3.5) {
        // ── Shot hits post ───────────────────────────────────────────
        selectedPlayer.shots++;
        selectedPlayer.shotsOnTarget++;
        selectedPlayer.ratingDelta += RATING_IMPACT.shotPost;
        if (hasMomentum === 'home') {
          homeLiveStats.shots++;
          homeLiveStats.shotsOnTarget++;
        } else {
          awayLiveStats.shots++;
          awayLiveStats.shotsOnTarget++;
        }

        const postEvent = createEvent(minute, 'shot_post', attackingTeam, selectedPlayer, undefined, RATING_IMPACT.shotPost);
        pushThrottledEvent(postEvent);
        selectedPlayer.events.push(postEvent);

      } else if (shotRoll < goalChance + probs.shot * 3.5 + probs.chance) {
        // ── Chance created ───────────────────────────────────────────
        selectedPlayer.ratingDelta += RATING_IMPACT.chanceCreated;
        if (assister) {
          assister.keyPasses++;
          assister.ratingDelta += RATING_IMPACT.assistOnChance;
        }

        const chanceEvent = createEvent(minute, 'chance', attackingTeam, selectedPlayer, assister, RATING_IMPACT.chanceCreated);
        pushThrottledEvent(chanceEvent);
        selectedPlayer.events.push(chanceEvent);

      } else {
        // ── Defensive / general events ───────────────────────────────
        const activeDefenders = getActivePlayers(defendingTeam);
        const defendingPS = hasMomentum === 'home' ? awayPS : homePS;
        if (activeDefenders.length > 0) {
          const defender = pick(activeDefenders);

          // Tackle
          let tackleProb = probs.tackle;
          // Play style: tackle bonus for defending team
          if (defendingPS?.tackleBonus) {
            tackleProb *= (1 + defendingPS.tackleBonus);
          }
          // Play style: pressing bonus increases tackle probability
          if (defendingPS?.pressingBonus) {
            tackleProb *= (1 + defendingPS.pressingBonus * PLAYSTYLE_WEIGHTS.pressingTackleBoost);
          }
          if (Math.random() < tackleProb) {
            defender.tackles++;
            defender.ratingDelta += RATING_IMPACT.tackle;
            if (hasMomentum === 'home') awayLiveStats.tackles++;
            else homeLiveStats.tackles++;

            // Occasionally generate a notable tackle event
            if (Math.random() < EVENT_VISIBILITY.tackle) {
              const tackleEvent = createEvent(minute, 'tackle', defendingTeam, defender, undefined, RATING_IMPACT.tackle);
              pushThrottledEvent(tackleEvent);
              defender.events.push(tackleEvent);
            }
          }

          // Interception
          let interceptionProb = probs.interception;
          // Play style: pressing bonus increases interception probability
          if (defendingPS?.pressingBonus) {
            interceptionProb *= (1 + defendingPS.pressingBonus);
          }
          if (Math.random() < interceptionProb) {
            defender.interceptions++;
            defender.ratingDelta += RATING_IMPACT.interception;
            if (hasMomentum === 'home') awayLiveStats.interceptions++;
            else homeLiveStats.interceptions++;

            if (Math.random() < EVENT_VISIBILITY.interception) {
              const intEvent = createEvent(minute, 'interception', defendingTeam, defender, undefined, RATING_IMPACT.interception);
              pushThrottledEvent(intEvent);
              defender.events.push(intEvent);
            }
          }

          // Fouls — Referee-modified system (uses referee.ts decision functions)
          const isDefenderHome = defender.team === 'home';
          const baseFoulProb = probs.foul * (attackingTeam.tactic.aggression / 50);

          if (shouldCallFoul(refCtx, baseFoulProb, isDefenderHome)) {
            defender.fouls++;
            defender.ratingDelta += RATING_IMPACT.foulCommitted;
            if (hasMomentum === 'home') awayLiveStats.fouls++;
            else homeLiveStats.fouls++;

            // Yellow card — referee decision function
            const baseYellowProb = CARD_RATES.yellow;
            if (shouldGiveYellowCard(refCtx, baseYellowProb, isDefenderHome, minute)) {
              defender.yellowCards++;
              refCtx.yellowsGiven++;
              defender.ratingDelta += RATING_IMPACT.yellowCard;
              if (hasMomentum === 'home') awayLiveStats.yellowCards++;
              else homeLiveStats.yellowCards++;

              const yellowEvent = createEvent(minute, 'yellow_card', defendingTeam, defender, undefined, RATING_IMPACT.yellowCard);
              pushThrottledEvent(yellowEvent);
              defender.events.push(yellowEvent);
            } else if (shouldGiveRedCard(refCtx, CARD_RATES.red, isDefenderHome)) {
              // Red card — referee decision function
              defender.redCards++;
              refCtx.redsGiven++;
              defender.ratingDelta += RATING_IMPACT.redCard;
              defender.isSubbedOut = true;
              defender.minuteLeft = minute;
              if (hasMomentum === 'home') awayLiveStats.redCards++;
              else homeLiveStats.redCards++;

              // Kırmızı kart sonrası takım gücünü anında güncelle
              // Oyuncu sayısı azaldığı için savunma/orta saha gücü düşer
              // defendingTeam zaten TeamState objesidir, string karşılaştırması bug'dı
              const affectedTeam = defendingTeam;
              const affectedActive = affectedTeam.players.filter(p => !p.isSubbedOut);
              if (affectedActive.length > 0) {
                // calculateTeamStrength Player[] bekler, MutablePlayerState[] değil
                const newStrengths = calculateTeamStrength(affectedActive.map(p => p.player), affectedTeam.tactic);
                // TeamState'in gerçek alanlarını güncelle (eski kod .strength kullanıyordu — yoktu)
                affectedTeam.overallStrength = newStrengths.overall;
                affectedTeam.attackStrength = newStrengths.attack;
                affectedTeam.midfieldStrength = newStrengths.midfield;
                affectedTeam.defenseStrength = newStrengths.defense;
                affectedTeam.gkStrength = newStrengths.gk;
                // B5: Re-apply captain boost after strength recalculation
                if (affectedTeam.captainMoraleBoost > 0) {
                  const captainMod = 1 + affectedTeam.captainMoraleBoost;
                  affectedTeam.overallStrength *= captainMod;
                  affectedTeam.attackStrength *= captainMod;
                  affectedTeam.midfieldStrength *= captainMod;
                  affectedTeam.defenseStrength *= captainMod;
                  if (affectedTeam.captainPositionGroupBoost > 0 && affectedTeam.captain) {
                    const captainPos = positionGroup(affectedTeam.captain.player);
                    const posMod = 1 + affectedTeam.captainPositionGroupBoost;
                    if (captainPos === 'FWD') affectedTeam.attackStrength *= posMod;
                    else if (captainPos === 'MID') affectedTeam.midfieldStrength *= posMod;
                    else if (captainPos === 'DEF') affectedTeam.defenseStrength *= posMod;
                    else if (captainPos === 'GK') affectedTeam.gkStrength *= posMod;
                  }
                }
              }

              const redEvent = createEvent(minute, 'red_card', defendingTeam, defender, undefined, RATING_IMPACT.redCard);
              pushThrottledEvent(redEvent);
              defender.events.push(redEvent);
            } else {
              // Regular foul event (sometimes visible)
              if (Math.random() < CARD_RATES.foulVisibility * refCtx.personalityConfig.foulMultiplier * refCtx.runtimeFoulMod) {
                const foulEvent = createEvent(minute, 'foul', defendingTeam, defender, undefined, RATING_IMPACT.foulCommitted);
                pushThrottledEvent(foulEvent);
                defender.events.push(foulEvent);

                // Award free kick or penalty — referee decision function with VAR
                const isAttackerHome = selectedPlayer.team === 'home';
                const penaltyResult = shouldGivePenalty(refCtx, CARD_RATES.penalty, isAttackerHome, minute);

                if (penaltyResult.penalty && !penaltyResult.overturned) {
                  const penaltyEvent = createEvent(minute, 'penalty', attackingTeam, selectedPlayer, undefined, RATING_IMPACT.penalty);
                  pushThrottledEvent(penaltyEvent);
                  selectedPlayer.events.push(penaltyEvent);
                  if (hasMomentum === 'home') homeLiveStats.freeKicks++;
                  else awayLiveStats.freeKicks++;
                } else if (penaltyResult.varReview) {
                  // VAR review event (penalty overturned or confirmed)
                  const varEvent = createEvent(minute, 'var_review', attackingTeam, selectedPlayer, undefined, 0);
                  varEvent.description = pick(COMMENTARY.var_review)(selectedPlayer.player.name, minute);
                  if (penaltyResult.overturned) {
                    varEvent.description += ' Penaltı iptal edildi!';
                  }
                  pushThrottledEvent(varEvent);
                } else {
                  const fkEvent = createEvent(minute, 'free_kick', attackingTeam, selectedPlayer, defender, RATING_IMPACT.freeKick);
                  pushThrottledEvent(fkEvent);
                  selectedPlayer.events.push(fkEvent);
                  if (hasMomentum === 'home') homeLiveStats.freeKicks++;
                  else awayLiveStats.freeKicks++;
                }
              }
            }
          }
        }

        // Offside — referee-modified (uses referee.ts getOffsideMultiplier)
        const isAttHome = hasMomentum === 'home';
        const offsideMod = getOffsideMultiplier(refCtx, isAttHome);
        if (Math.random() < SET_PIECE_RATES.offside * offsideMod) {
          const forwards = getByPosition(attackingTeam, 'FWD');
          if (forwards.length > 0) {
            const offsidePlayer = pick(forwards);
            const offsideEvent = createEvent(minute, 'offside', attackingTeam, offsidePlayer, undefined, RATING_IMPACT.offside);
            pushThrottledEvent(offsideEvent);
            offsidePlayer.events.push(offsideEvent);
            if (hasMomentum === 'home') homeLiveStats.offsides++;
            else awayLiveStats.offsides++;
          }
        }

        // Corner
        let cornerProb = SET_PIECE_RATES.corner;
        // Play style: crossing bonus increases corner probability
        const attackingPSForCorner = hasMomentum === 'home' ? homePS : awayPS;
        if (attackingPSForCorner?.crossingBonus) {
          cornerProb *= (1 + attackingPSForCorner.crossingBonus);
        }
        if (Math.random() < cornerProb) {
          const cornerPlayer = pick(getActivePlayers(attackingTeam));
          const cornerEvent = createEvent(minute, 'corner', attackingTeam, cornerPlayer, undefined, RATING_IMPACT.corner);
          pushThrottledEvent(cornerEvent);
          cornerPlayer.events.push(cornerEvent);
          if (hasMomentum === 'home') homeLiveStats.corners++;
          else awayLiveStats.corners++;
        }

        // GK save (reactionary)
        if (opponentGK && Math.random() < probs.save * EVENT_VISIBILITY.gkSaveScaling) {
          opponentGK.saves++;
          opponentGK.ratingDelta += RATING_IMPACT.gkReactionarySave;
          if (hasMomentum === 'home') awayLiveStats.saves++;
          else homeLiveStats.saves++;

          if (Math.random() < EVENT_VISIBILITY.gkSave) {
            const saveEvent = createEvent(minute, 'save', defendingTeam, opponentGK, undefined, RATING_IMPACT.gkReactionarySave);
            pushThrottledEvent(saveEvent);
            opponentGK.events.push(saveEvent);
          }
        }
      }

      // ── Injury check — Dakika + Kondisyon Bazlı Dinamik Risk ────────
      const activeForInjury = getActivePlayers(attackingTeam).concat(getActivePlayers(defendingTeam));
      for (const p of activeForInjury) {
        // 1) Baz risk (kondisyon bazlı)
        let injuryRisk = INJURY_RISK.base; // 0.001
        if (p.currentCond < INJURY_RISK.condThresholdLow) {
          // cond < 50: ağır yorgunluk → 2x risk
          injuryRisk = INJURY_RISK.base * INJURY_RISK.condLowMultiplier;
        } else if (p.currentCond < INJURY_RISK.condThresholdMid) {
          // cond 50-60: orta yorgunluk → 1.5x risk
          injuryRisk = INJURY_RISK.base * INJURY_RISK.condMidMultiplier;
        }

        // 2) Dakika bazlı çarpan (maç ilerledikçe risk artar)
        if (minute >= 60) {
          injuryRisk *= INJURY_RISK.minuteMultiplier_60_90; // 1.5x
        } else if (minute >= 30) {
          injuryRisk *= INJURY_RISK.minuteMultiplier_30_60; // 1.2x
        }
        // minute < 30: 1.0x (baz risk)

        // 3) Takım modifikatörü (fizyoterapist)
        const teamInjuryMod = p.team === 'home'
          ? (options?.homeInjuryModifier ?? 1.0)
          : (options?.awayInjuryModifier ?? 1.0);
        const finalInjuryRisk = injuryRisk * teamInjuryMod;
        if (Math.random() < finalInjuryRisk) {
          const { severity, days } = generateInjuryFromManager();
          p.isInjured = true;
          p.minuteLeft = minute;
          p.ratingDelta += severity === 'heavy' ? INJURY_RISK.ratingImpactHeavy : severity === 'medium' ? INJURY_RISK.ratingImpactMedium : INJURY_RISK.ratingImpactLight;
          if (hasMomentum === 'home') homeLiveStats.injuries++;
          else awayLiveStats.injuries++;

          const injuryEvent = createEvent(minute, 'injury', p.team === 'home' ? homeTeam : awayTeam, p, undefined, severity === 'heavy' ? INJURY_RISK.ratingImpactHeavy : severity === 'medium' ? INJURY_RISK.ratingImpactMedium : INJURY_RISK.ratingImpactLight);
          (injuryEvent as any).injurySeverity = severity;
          (injuryEvent as any).injuryDays = days;
          pushThrottledEvent(injuryEvent);
          p.events.push(injuryEvent);
        }
      }
    }

    // ── Condition drain per minute — Eksponansiyel Drain ────────────
    for (const p of getActivePlayers(homeTeam)) {
      let drain = CONDITION_DRAIN.base + (p.player.stamina ? (100 - getAttr(p.player, 'stamina', 50)) / CONDITION_DRAIN.staminaDivisor : CONDITION_DRAIN.fallbackDrain);
      // Play style: stamina drain modifier for home team
      if (homePS?.staminaDrain) {
        drain *= (1 + homePS.staminaDrain);
      }
      // Late game fatigue acceleration: minute > 75 → drain × 1.5
      if (minute > CONDITION_DRAIN.lateGameThreshold) {
        drain *= CONDITION_DRAIN.lateGameMultiplier;
      }
      // Eksponansiyel drain: kondisyon düştükçe drain hızı artar
      if (p.currentCond < CONDITION_DRAIN.condMidThreshold) {
        drain *= CONDITION_DRAIN.condLowDrainMult;  // cond < 50: %60 fazla drain
      } else if (p.currentCond > CONDITION_DRAIN.condHighThreshold) {
        drain *= CONDITION_DRAIN.condHighDrainMult;  // cond > 70: %20 az drain
      }
      // cond 50-70: standart drain (1.0x)
      p.currentCond = clamp(p.currentCond - drain, 0, 100);
    }
    for (const p of getActivePlayers(awayTeam)) {
      let drain = CONDITION_DRAIN.base + (p.player.stamina ? (100 - getAttr(p.player, 'stamina', 50)) / CONDITION_DRAIN.staminaDivisor : CONDITION_DRAIN.fallbackDrain);
      // Play style: stamina drain modifier for away team
      if (awayPS?.staminaDrain) {
        drain *= (1 + awayPS.staminaDrain);
      }
      // Late game fatigue acceleration: minute > 75 → drain × 1.5
      if (minute > CONDITION_DRAIN.lateGameThreshold) {
        drain *= CONDITION_DRAIN.lateGameMultiplier;
      }
      // Eksponansiyel drain: kondisyon düştükçe drain hızı artar
      if (p.currentCond < CONDITION_DRAIN.condMidThreshold) {
        drain *= CONDITION_DRAIN.condLowDrainMult;  // cond < 50: %60 fazla drain
      } else if (p.currentCond > CONDITION_DRAIN.condHighThreshold) {
        drain *= CONDITION_DRAIN.condHighDrainMult;  // cond > 70: %20 az drain
      }
      // cond 50-70: standart drain (1.0x)
      p.currentCond = clamp(p.currentCond - drain, 0, 100);
    }

    // ── Auto substitution at 60' and 75' ────────────────────────────────
    if ((MATCH_STRUCTURE.autoSubMinutes as readonly number[]).includes(minute)) {
      performSubstitution(homeTeam, minute, allEvents, homeLiveStats);
      performSubstitution(awayTeam, minute, allEvents, awayLiveStats);
    }

    // ── Halftime + Cond Recovery ─────────────────────────────────────────
    if (minute === MATCH_STRUCTURE.halftime) {
      // Yarı devre kondisyon toparlanması: +8 base, stamina yüksekse +10
      for (const p of homeTeam.players) {
        const recovery = 6 + Math.round((getAttr(p.player, 'stamina', 50)) / 25);
        p.currentCond = clamp(p.currentCond + recovery, 0, 100);
      }
      for (const p of awayTeam.players) {
        const recovery = 6 + Math.round((getAttr(p.player, 'stamina', 50)) / 25);
        p.currentCond = clamp(p.currentCond + recovery, 0, 100);
      }
      pushThrottledEvent({
        minute: MATCH_STRUCTURE.halftime,
        type: 'chance',
        team: 'home',
        playerName: '',
        playerId: '',
        description: pick(COMMENTARY.halftime),
        x: 50,
        y: 50,
        ratingImpact: 0,
      });
    }

    currentMinute++;
  }

  // ── Fulltime ────────────────────────────────────────────────────────────
  allEvents.push({
    minute: MATCH_STRUCTURE.duration,
    type: 'chance',
    team: 'home',
    playerName: '',
    playerId: '',
    description: pick(COMMENTARY.fulltime),
    x: 50,
    y: 50,
    ratingImpact: 0,
  });

  // Sort events by minute
  allEvents.sort((a, b) => a.minute - b.minute);

  // ── Calculate final statistics ──────────────────────────────────────────
  const totalPossessionTicks = homeLiveStats.possessionTicks + awayLiveStats.possessionTicks;
  const homePossession = totalPossessionTicks > 0
    ? Math.round((homeLiveStats.possessionTicks / totalPossessionTicks) * 100)
    : 50;
  const awayPossession = 100 - homePossession;

  const buildStats = (s: LiveStats): MatchStats => ({
    possession: homePossession,
    shots: s.shots,
    shotsOnTarget: s.shotsOnTarget,
    passes: s.passes,
    passAccuracy: s.passes > 0 ? Math.round((s.passSuccesses / s.passes) * 100) : 0,
    tackles: s.tackles,
    interceptions: s.interceptions,
    fouls: s.fouls,
    yellowCards: s.yellowCards,
    redCards: s.redCards,
    corners: s.corners,
    freeKicks: s.freeKicks,
    offsides: s.offsides,
    injuries: s.injuries,
    saves: s.saves,
  });

  const homeStats: MatchStats = { ...buildStats(homeLiveStats), possession: homePossession };
  const awayStats: MatchStats = { ...buildStats(awayLiveStats), possession: awayPossession };

  // ── Calculate player ratings ───────────────────────────────────────────
  const calculatePlayerRating = (state: MutablePlayerState): PlayerMatchRating => {
    // Base rating
    let rating: number = PLAYER_RATING_WEIGHTS.baseRating;

    // Position-adjusted base
    const pos = positionGroup(state.player);
    switch (pos) {
      case 'GK':
        rating = PLAYER_RATING_WEIGHTS.baseRating;
        rating += state.saves * PLAYER_RATING_WEIGHTS.GK.perSave;
        rating -= (state.goals > 0 ? state.goals * -PLAYER_RATING_WEIGHTS.GK.perGoalConceded : 0);
        break;
      case 'DEF':
        rating = PLAYER_RATING_WEIGHTS.baseRating;
        rating += state.tackles * PLAYER_RATING_WEIGHTS.DEF.perTackle;
        rating += state.interceptions * PLAYER_RATING_WEIGHTS.DEF.perInterception;
        rating += state.assists * PLAYER_RATING_WEIGHTS.DEF.perAssist;
        rating += state.goals * PLAYER_RATING_WEIGHTS.DEF.perGoal;
        break;
      case 'MID':
        rating = PLAYER_RATING_WEIGHTS.baseRating;
        rating += state.keyPasses * PLAYER_RATING_WEIGHTS.MID.perKeyPass;
        rating += state.passes * PLAYER_RATING_WEIGHTS.MID.perPass;
        rating += state.tackles * PLAYER_RATING_WEIGHTS.MID.perTackle;
        rating += state.goals * PLAYER_RATING_WEIGHTS.MID.perGoal;
        rating += state.assists * PLAYER_RATING_WEIGHTS.MID.perAssist;
        break;
      case 'FWD':
        rating = PLAYER_RATING_WEIGHTS.baseRating;
        rating += state.goals * PLAYER_RATING_WEIGHTS.FWD.perGoal;
        rating += state.assists * PLAYER_RATING_WEIGHTS.FWD.perAssist;
        rating += state.shotsOnTarget * PLAYER_RATING_WEIGHTS.FWD.perShotOnTarget;
        rating += (state.shots - state.shotsOnTarget) * PLAYER_RATING_WEIGHTS.FWD.perMissedShot;
        break;
    }

    // Card penalties
    rating += state.yellowCards * PLAYER_RATING_WEIGHTS.yellowCardPenalty;
    rating += state.redCards * PLAYER_RATING_WEIGHTS.redCardPenalty;

    // Fouls penalty
    rating += state.fouls * PLAYER_RATING_WEIGHTS.foulPenalty;

    // Apply accumulated ratingDelta
    rating += state.ratingDelta;

    // Minutes played factor (less time = less impact on rating)
    const minutesPlayed = state.minuteLeft - state.minuteEntered;
    const ptf = PLAYER_RATING_WEIGHTS.playingTimeFactors;
    const playingTimeFactor = minutesPlayed >= 85 ? ptf.full85 : minutesPlayed >= 60 ? ptf.mid60 : minutesPlayed >= 30 ? ptf.low30 : ptf.sub30;
    rating = PLAYER_RATING_WEIGHTS.ratingShiftBase + (rating - PLAYER_RATING_WEIGHTS.ratingShiftBase) * playingTimeFactor;

    // Morale, form, condition modifiers (subtle)
    const avgMental = (state.player.morale + state.player.form + state.player.confidence) / 300;
    rating += (avgMental - 0.5) * PLAYER_RATING_WEIGHTS.mentalModifierStrength;

    rating = clamp(Math.round(rating * 10) / 10, PLAYER_RATING_WEIGHTS.ratingClamp.min as number, PLAYER_RATING_WEIGHTS.ratingClamp.max as number);

    return {
      playerId: state.player.id,
      playerName: state.player.name,
      position: state.player.specificPosition || pos,
      rating,
      goals: state.goals,
      assists: state.assists,
      shots: state.shots,
      tackles: state.tackles,
      passes: state.passes,
      keyPasses: state.keyPasses,
      saves: state.saves,
    };
  };

  const homePlayerRatings = homeTeam.players.map(calculatePlayerRating);
  const awayPlayerRatings = awayTeam.players.map(calculatePlayerRating);

  // ── Man of the Match ───────────────────────────────────────────────────
  const allRatings = [...homePlayerRatings, ...awayPlayerRatings];
  const motm = allRatings.reduce((best, r) => r.rating > best.rating ? r : best, allRatings[0]);

  return {
    homeScore,
    awayScore,
    events: allEvents,
    homeStats,
    awayStats,
    homePlayerRatings,
    awayPlayerRatings,
    manOfTheMatch: motm?.playerId || '',
    homePossession,
    awayPossession,
    weather,
    refereeName: refCtx.referee.name,
    refereePersonality: refCtx.referee.personality,
    refereeStrictness: refCtx.referee.strictness,
    varReviews: refCtx.varReviews,
    goalsOverturned: refCtx.goalsOverturned,
  };
}

// =============================================================================
// Match Report Generation (Turkish)
// =============================================================================

export function generateMatchReport(result: EnhancedMatchResult): string {
  const lines: string[] = [];

  const homeGoals = result.events.filter(e => e.type === 'goal' && e.team === 'home');
  const awayGoals = result.events.filter(e => e.type === 'goal' && e.team === 'away');
  const yellows = result.events.filter(e => e.type === 'yellow_card');
  const reds = result.events.filter(e => e.type === 'red_card');
  const injuries = result.events.filter(e => e.type === 'injury');
  const subs = result.events.filter(e => e.type === 'substitution');

  // Find MOTM details
  const allRatings = [...result.homePlayerRatings, ...result.awayPlayerRatings];
  const motm = allRatings.find(r => r.playerId === result.manOfTheMatch);

  // ── ÖZET ───────────────────────────────────────────────────────────────
  lines.push('═'.repeat(60));
  lines.push('                    MAÇ RAPORU');
  lines.push('═'.repeat(60));
  lines.push('');
  lines.push(`                    EV SAHİBİ ${result.homeScore} - ${result.awayScore} DEPLASMAN`);
  lines.push('');
  lines.push(`  Hava: ${result.weather === 'sunny' ? 'Güneşli ☀️' : result.weather === 'rainy' ? 'Yağmurlu 🌧️' : result.weather === 'snowy' ? 'Karlı ❄️' : 'Rüzgarlı 💨'}`);
  lines.push('');
  lines.push('─'.repeat(60));
  lines.push('  📋 ÖZET');
  lines.push('─'.repeat(60));
  lines.push('');

  // Goal descriptions
  if (homeGoals.length > 0 || awayGoals.length > 0) {
    lines.push('  ⚽ Goller:');
    for (const g of [...homeGoals, ...awayGoals]) {
      const teamLabel = g.team === 'home' ? '[EV]' : '[DP]';
      lines.push(`     ${teamLabel} ${g.minute}. dk — ${g.description}`);
    }
    lines.push('');
  }

  // Key events
  const keyEvents = [...yellows, ...reds, ...injuries, ...subs];
  if (keyEvents.length > 0) {
    lines.push('  📌 Önemli Olaylar:');
    for (const e of keyEvents) {
      lines.push(`     ${e.minute}. dk — ${e.description}`);
    }
    lines.push('');
  }

  // Match narrative
  lines.push('  📖 Maçın Hikayesi:');
  if (result.homeScore === 0 && result.awayScore === 0) {
    lines.push('     Her iki takım da net pozisyon bulmakta zorlandı.');
    lines.push('     Savunma ağırlıklı bir oyun izledik. Kaleciler az iş yaptı.');
  } else if (result.homeScore > result.awayScore) {
    const diff = result.homeScore - result.awayScore;
    if (diff >= 3) {
      lines.push('     Ev sahibi takım sahadan ezici bir galibiyetle ayrıldı.');
    } else if (diff === 1) {
      lines.push('     Çekişmeli bir maçtı. Ev sahibi, skoru lehine çevirmeyi başardı.');
    } else {
      lines.push('     Ev sahibi, deplasman ekibine üstünlük kurarak fark yaratmayı bildi.');
    }
  } else if (result.awayScore > result.homeScore) {
    const diff = result.awayScore - result.homeScore;
    if (diff >= 3) {
      lines.push('     Deplasman takımı adeta sahaya hükmetti! Net bir galibiyet.');
    } else if (diff === 1) {
      lines.push('     Deplasman takımı zorlu deplasmanda 3 puanı kaptı.');
    } else {
      lines.push('     Deplasman ekibi, ev sahibine karşın rahat bir galibiyet aldı.');
    }
  } else {
    lines.push('     Karşılıklı gollerle sonuçlanan dengeli bir mücadele oldu.');
    lines.push('     İki takım da puandan memnun görünüyor.');
  }
  lines.push('');

  // ── İSTATİSTİKLER ──────────────────────────────────────────────────────
  lines.push('─'.repeat(60));
  lines.push('  📊 İSTATİSTİKLER');
  lines.push('─'.repeat(60));
  lines.push('');

  const padStat = (home: string, label: string, away: string) => {
    return `  ${home.padStart(6)}  │  ${label.padEnd(20)}  │  ${away.padEnd(6)}`;
  };

  lines.push(padStat(
    String(result.homeStats.possession) + '%',
    'Topla Oynama',
    String(result.awayStats.possession) + '%'
  ));
  lines.push(padStat(
    String(result.homeStats.shots),
    'Toplam Şut',
    String(result.awayStats.shots)
  ));
  lines.push(padStat(
    String(result.homeStats.shotsOnTarget),
    'İsabetli Şut',
    String(result.awayStats.shotsOnTarget)
  ));
  lines.push(padStat(
    String(result.homeStats.passes),
    'Pas',
    String(result.awayStats.passes)
  ));
  lines.push(padStat(
    String(result.homeStats.passAccuracy) + '%',
    'Pas Başarısı',
    String(result.awayStats.passAccuracy) + '%'
  ));
  lines.push(padStat(
    String(result.homeStats.tackles),
    'Top Kapma',
    String(result.awayStats.tackles)
  ));
  lines.push(padStat(
    String(result.homeStats.interceptions),
    'Pas Yolu Kesme',
    String(result.awayStats.interceptions)
  ));
  lines.push(padStat(
    String(result.homeStats.fouls),
    'Faul',
    String(result.awayStats.fouls)
  ));
  lines.push(padStat(
    String(result.homeStats.yellowCards),
    'Sarı Kart',
    String(result.awayStats.yellowCards)
  ));
  lines.push(padStat(
    String(result.homeStats.redCards),
    'Kırmızı Kart',
    String(result.awayStats.redCards)
  ));
  lines.push(padStat(
    String(result.homeStats.corners),
    'Korner',
    String(result.awayStats.corners)
  ));
  lines.push(padStat(
    String(result.homeStats.freeKicks),
    'Serbest Vuruş',
    String(result.awayStats.freeKicks)
  ));
  lines.push(padStat(
    String(result.homeStats.offsides),
    'Ofsayt',
    String(result.awayStats.offsides)
  ));
  lines.push(padStat(
    String(result.homeStats.saves),
    'Kurtarış',
    String(result.awayStats.saves)
  ));
  lines.push('');

  // ── OYUNCU DEĞERLENDİRMELERİ ────────────────────────────────────────────
  lines.push('─'.repeat(60));
  lines.push('  👤 OYUNCU DEĞERLENDİRMELERİ');
  lines.push('─'.repeat(60));
  lines.push('');

  const formatRatings = (ratings: PlayerMatchRating[], teamLabel: string) => {
    lines.push(`  ── ${teamLabel} ──`);
    const sorted = [...ratings].sort((a, b) => b.rating - a.rating);
    for (const r of sorted) {
      const emoji = r.rating >= 8.0 ? '🌟' : r.rating >= 7.0 ? '✅' : r.rating >= 6.0 ? '➖' : '📉';
      const posLabel = r.position.padEnd(4);
      const name = r.playerName.padEnd(20);
      const ratingStr = r.rating.toFixed(1).padStart(4);
      let statStr = '';
      if (r.goals > 0) statStr += `⚽${r.goals} `;
      if (r.assists > 0) statStr += `🅰️${r.assists} `;
      if (r.saves > 0) statStr += `🧤${r.saves} `;
      if (r.tackles > 2) statStr += `🦵${r.tackles} `;
      if (r.keyPasses > 1) statStr += `🔑${r.keyPasses} `;
      lines.push(`  ${emoji} [${posLabel}] ${name} ${ratingStr}  ${statStr}`);
    }
    lines.push('');
  };

  formatRatings(result.homePlayerRatings, 'EV SAHİBİ');
  formatRatings(result.awayPlayerRatings, 'DEPLASMAN');

  // ── MAÇIN ADAMI ────────────────────────────────────────────────────────
  lines.push('─'.repeat(60));
  lines.push('  🏆 MAÇIN ADAMI');
  lines.push('─'.repeat(60));
  lines.push('');

  if (motm) {
    const motmEvents = result.events.filter(
      e => e.playerId === motm.playerId && e.type !== 'chance'
    );
    lines.push(`     ${motm.playerName} (${motm.position})`);
    lines.push(`     Puan: ${motm.rating.toFixed(1)}`);
    lines.push('');
    if (motm.goals > 0) lines.push(`     ⚽ Gol: ${motm.goals}`);
    if (motm.assists > 0) lines.push(`     🅰️ Asist: ${motm.assists}`);
    if (motm.saves > 0) lines.push(`     🧤 Kurtarış: ${motm.saves}`);
    if (motm.keyPasses > 0) lines.push(`     🔑 Ana Pas: ${motm.keyPasses}`);
    if (motm.tackles > 0) lines.push(`     🦵 Top Kapma: ${motm.tackles}`);
    lines.push('');
    lines.push('     Maçta Öne Çıkan Anlar:');
    for (const ev of motmEvents.slice(0, 5)) {
      lines.push(`     • ${ev.minute}. dk — ${ev.description}`);
    }
  } else {
    lines.push('     Maçın adamı belirlenemedi.');
  }
  lines.push('');
  lines.push('═'.repeat(60));
  lines.push('');

  return lines.join('\n');
}

// =============================================================================
// Unified Match Bridge (consolidated from unifiedMatchEngine.ts)
// =============================================================================
// Bridges the enhanced match engine to the format MatchDay.tsx expects.
// Keeps ALL existing behavior intact while adding rich features.

// ─── Role Bonus Application ─────────────────────────────────────────────────
// Rol bonuslarını pozisyon etkinlik sistemiyle entegre eder.
// Bir rol, oyuncunun mevkisiyle uyumluysa tam bonus; uyumsuzsa %50 penalty uygulanır.
export function applyRoleBonuses(
  players: Player[],
  playerRoles: Record<string, string>
): Player[] {
  if (!playerRoles || Object.keys(playerRoles).length === 0) return players;
  return players.map(p => {
    const roleId = playerRoles[p.id];
    if (!roleId) return p;
    const bonuses = getRoleAttributeBonuses(roleId);
    if (!bonuses || Object.keys(bonuses).length === 0) return p;

    // Rol-pozisyon uyumluluk kontrolü
    // Eğer rol oyuncunun specificPosition ile uyumluysa tam bonus,
    // uyumsuzsa %50 bonus penalty uygulanır
    const roleCompat = getRolePositionCompatibility(roleId, p.specificPosition || p.position);
    const bonusScale = 0.05 * roleCompat; // Temel ölçek × uyum oranı

    const updated = { ...p } as any;
    for (const [attr, bonus] of Object.entries(bonuses)) {
      const current = updated[attr] ?? updated.rating ?? 60;
      updated[attr] = Math.min(99, Math.round(current + bonus * bonusScale));
    }
    return updated as Player;
  });
}

/**
 * Bir rolün belirli bir pozisyonla uyumluluk oranını hesaplar.
 * Uyumlu → 1.0, Kısmen uyumlu → 0.7, Uyumsuz → 0.4
 */
function getRolePositionCompatibility(roleId: string, position: string): number {
  // tacticsRoles.ts'den ROLES dizisini import etmeden basit harita kullan
  // (Çünkü ROLES zaten getRoleAttributeBonuses ile kullanılıyor)
  const rolePositionMap: Record<string, string[]> = {
    // Kaleci rolleri
    sweeper_keeper: ['GK'],
    shot_stopper: ['GK'],
    // Defans rolleri
    ball_playing_defender: ['CB'],
    no_nonsense_cb: ['CB'],
    offside_trap_cb: ['CB'],
    wing_back: ['LB', 'RB', 'LWB', 'RWB'],
    inverted_fullback: ['LB', 'RB'],
    libero: ['CB'],
    // Orta saha rolleri
    deep_lying_playmaker: ['CDM', 'CM'],
    box_to_box: ['CM', 'CDM'],
    mezzala: ['CM', 'CAM'],
    defensive_midfielder: ['CDM'],
    advanced_playmaker: ['CAM', 'CM'],
    half_winger: ['LM', 'RM', 'LW', 'RW'],
    carrilero: ['CM', 'CDM'],
    // Forvet rolleri
    target_man: ['ST', 'CF'],
    poacher: ['ST'],
    complete_forward: ['ST', 'CF'],
    false_nine: ['CF', 'CAM'],
    inside_forward: ['LW', 'RW', 'LM', 'RM'],
    winger: ['LW', 'RW', 'LM', 'RM'],
    advanced_playmaker_fwd: ['CF', 'CAM'],
  };

  const compatiblePositions = rolePositionMap[roleId];
  if (!compatiblePositions) return 0.7; // Bilinmeyen rol → kısmen uyumlu

  if (compatiblePositions.includes(position)) return 1.0; // Tam uyum

  // Aynı geniş grupta mı? (örn: MID rol → MID pozisyon)
  const roleGroup = getPositionGroupFromPositions(compatiblePositions);
  const playerGroup = position === 'GK' ? 'GK' :
                     ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(position) ? 'DEF' :
                     ['CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW'].includes(position) ? 'MID' : 'FWD';

  if (roleGroup === playerGroup) return 0.7; // Aynı grup, farklı pozisyon → kısmen uyumlu
  return 0.4; // Farklı grup → zayıf uyum
}

function getPositionGroupFromPositions(positions: string[]): string {
  const groups = positions.map(pos =>
    pos === 'GK' ? 'GK' :
    ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos) ? 'DEF' :
    ['CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW'].includes(pos) ? 'MID' : 'FWD'
  );
  // En yaygın grubu döndür
  const counts: Record<string, number> = {};
  for (const g of groups) counts[g] = (counts[g] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'MID';
}

// ─── Legacy-compatible MatchStats (what MatchDay expects) ──────────────────
interface LegacyMatchStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  passing: number;
  tackles?: number;
  corners?: number;
  fouls?: number;
  saves?: number;
  yellowCards?: number;
  redCards?: number;
  offsides?: number;
  interceptions?: number;
}

// ─── Legacy-compatible Event (what MatchDay expects) ─────────────────────────
interface LegacyMatchEvent {
  minute: number;
  type: string;
  team: 'HOME' | 'AWAY' | 'NEUTRAL';
  player?: string;
  text: string;
  displayMinute?: number | string;
  assistant?: string;
}

// ─── Unified Options ───────────────────────────────────────────────────────────
export interface UnifiedMatchOptions {
  homeTactics?: GameTactics;
  activeTactic: ActiveTactic;
  homeOperations?: string[];
  startMinute?: number;
  currentScore?: { home: number; away: number };
  homeTeamName?: string;
  awayTeamName?: string;
  gameDay?: number;
  isDerby?: boolean;
  isBigMatch?: boolean;
  labSettings?: any;
  stadiumUpgrades?: Record<string, number>;
  isLabSimulation?: boolean;
  refereeName?: string;
  refereePersonality?: RefereePersonality;
  refereeStrictness?: number;
  refereeFavor?: number;
  playerRoles?: Record<string, string>;
  homeTacticModifiers?: TacticModifiers;
  awayTacticModifiers?: TacticModifiers;
  stadiumEffects?: StadiumEffects;
  isNightMatch?: boolean;
  isWinterMatch?: boolean;
  pitchPassBonus?: number;
  heatingProtection?: number;
  lightingNightBonus?: number;
  homePlayStyleModifiers?: PlayStyleModifiers;
  awayPlayStyleModifiers?: PlayStyleModifiers;
  /** Away takımın profil ID'si — verilirse Supabase'den gerçek taktikleri çeker */
  awayProfileId?: string;
  /** Taktik skoru — TacticsCommandCenter'dan hesaplanan skor (0-100 arası) */
  tacticalScore?: {
    overall: number;          // 0-100
    roleCompatibility: number;
    instructionSynergy: number;
  };
  /** Maç tarihi (YYYY-MM-DD) — verilirse getWeatherForDate ile tutarlı hava durumu hesaplanır */
  matchDate?: string;
}

// ─── Event Type Mapping ─────────────────────────────────────────────────────
function mapEnhancedTypeToLegacy(type: string): string {
  switch (type) {
    case 'goal': return 'GOAL';
    case 'shot_saved': return 'SAVE';
    case 'shot_wide': return 'COMMENTARY';
    case 'shot_post': return 'POST';
    case 'foul': return 'BATTLE';
    case 'yellow_card': return 'YELLOW';
    case 'red_card': return 'RED';
    case 'corner': return 'COMMENTARY';
    case 'free_kick': return 'COMMENTARY';
    case 'penalty': return 'PENALTY';
    case 'offside': return 'OFFSIDE';
    case 'substitution': return 'SUB';
    case 'injury': return 'INJURY';
    case 'save': return 'SAVE';
    case 'tackle': return 'BATTLE';
    case 'interception': return 'COMMENTARY';
    case 'chance': return 'CHANCE';
    case 'var_review': return 'COMMENTARY';
    case 'goal_overturned': return 'COMMENTARY';
    default: return 'COMMENTARY';
  }
}

// ─── Convert EnhancedMatchStats to LegacyMatchStats ──────────────────────────
function convertStats(enhanced: MatchStats): LegacyMatchStats {
  return {
    possession: enhanced.possession,
    shots: enhanced.shots,
    shotsOnTarget: enhanced.shotsOnTarget,
    passing: enhanced.passAccuracy,
    tackles: enhanced.tackles,
    corners: enhanced.corners,
    fouls: enhanced.fouls,
    saves: enhanced.saves,
    yellowCards: enhanced.yellowCards,
    redCards: enhanced.redCards,
    offsides: enhanced.offsides,
    interceptions: enhanced.interceptions,
  };
}

// ─── Convert EnhancedMatchResult to MatchResult (MatchDay format) ──────────
function convertEnhancedToLegacy(
  enhanced: EnhancedMatchResult,
  homePlayers: Player[],
  options: UnifiedMatchOptions
): MatchResult {
  const legacyEvents: LegacyMatchEvent[] = enhanced.events.map(e => {
    const mappedType = mapEnhancedTypeToLegacy(e.type);
    const team = e.team.toUpperCase() as 'HOME' | 'AWAY';
    return {
      minute: e.minute,
      type: mappedType,
      team,
      player: e.playerName,
      text: e.description,
      assistant: e.assistPlayerName,
    };
  });

  const hasHalftime = legacyEvents.some(e => e.type === 'HALFTIME');
  const hasFulltime = legacyEvents.some(e => e.type === 'FULLTIME');

  if (!hasHalftime) {
    legacyEvents.push({ minute: 45, type: 'HALFTIME', team: 'NEUTRAL', text: 'İlk yarı sona erdi.' });
  }
  if (!hasFulltime) {
    legacyEvents.push({ minute: 90, type: 'FULLTIME', team: 'NEUTRAL', text: 'Maç sona erdi.' });
  }

  legacyEvents.sort((a, b) => a.minute - b.minute);

  const playerRatings: Record<string, number> = {};
  enhanced.homePlayerRatings.forEach(pr => { playerRatings[pr.playerId] = pr.rating; });

  const staminaLoss: Record<string, number> = {};
  homePlayers.forEach(p => { staminaLoss[p.id] = 5 + Math.random() * 12; });

  const playerStats: Record<string, any> = {};
  enhanced.homePlayerRatings.forEach(pr => {
    playerStats[pr.playerId] = {
      goals: pr.goals, assists: pr.assists, yellowCards: 0, redCards: 0, fouls: 0, goalDetails: {}, saveDetails: {},
    };
  });

  enhanced.events.forEach(e => {
    if (e.team === 'home' && playerStats[e.playerId]) {
      if (e.type === 'yellow_card') playerStats[e.playerId].yellowCards++;
      if (e.type === 'red_card') playerStats[e.playerId].redCards++;
      if (e.type === 'foul') playerStats[e.playerId].fouls++;
    }
  });

  const motmPlayer = enhanced.homePlayerRatings.find(pr => pr.playerId === enhanced.manOfTheMatch);
  const motm = motmPlayer?.playerName || 'Belirlenemedi';

  const homeLegacyStats = convertStats(enhanced.homeStats);
  const awayLegacyStats = convertStats(enhanced.awayStats);

  // ── Farming Multipliers ────────────────────────────────────────────────
  // Aşırı gol/performans → farming şüphesi → büyüme çarpanı düşürülür
  const farmingMultipliers: Record<string, number> = {};
  for (const pr of enhanced.homePlayerRatings) {
    let mult = 1.0;

    // Gol sayısına göre farming çarpanı
    if (pr.goals >= 3) {
      mult = 0.4; // Hat-trick: çok düşük büyüme
    } else if (pr.goals === 2) {
      mult = 0.7; // 2 gol: düşük büyüme
    }
    // 1 gol veya 0 gol: mult = 1.0 (normal)

    // Rating 9.5+ → çok yüksek performans da farming işareti olabilir
    if (pr.rating >= 9.5) {
      mult = Math.min(mult, 0.6);
    }

    farmingMultipliers[pr.playerId] = mult;
  }
  // Away oyuncuları da ekle (simetrik koruma)
  for (const pr of enhanced.awayPlayerRatings) {
    let mult = 1.0;

    if (pr.goals >= 3) {
      mult = 0.4;
    } else if (pr.goals === 2) {
      mult = 0.7;
    }

    if (pr.rating >= 9.5) {
      mult = Math.min(mult, 0.6);
    }

    farmingMultipliers[pr.playerId] = mult;
  }

  return {
    score: { home: enhanced.homeScore, away: enhanced.awayScore },
    events: legacyEvents,
    playerRatings,
    staminaLoss,
    playerStats,
    stats: { home: homeLegacyStats, away: awayLegacyStats },
    motm,
    extendedStats: { home: enhanced.homeStats, away: enhanced.awayStats },
    weather: enhanced.weather,
    refereeName: enhanced.refereeName,
    refereePersonality: enhanced.refereePersonality,
    refereeStrictness: enhanced.refereeStrictness,
    varReviews: enhanced.varReviews,
    goalsOverturned: enhanced.goalsOverturned,
    farmingMultipliers,
  } as any;
}

// DÜZELTME 10: Artık yerel buildActiveTacticFromDB yerine paylaşımlı tacticBuilder kullanılıyor
import { buildActiveTactic } from './tacticBuilder';

// ─── Default ActiveTactic (fallback) ──────────────────────────────────────────
function getDefaultTactic(): ActiveTactic {
  return {
    formation: '4-4-2',
    tactic_type: '4-4-2',
    mentality: 3,
    pressing: false,
    passingStyle: 'Karışık',
    intensity: 'normal',
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
  };
}

// =============================================================================
// Main Unified Match Function
// =============================================================================

export async function runUnifiedMatch(
  homeSquad: Player[],
  awaySquad: Player[],
  options: UnifiedMatchOptions
): Promise<MatchResult> {
  if (!homeSquad || homeSquad.length === 0 || !awaySquad || awaySquad.length === 0) {
    throw new Error("Match Engine Error: Home or Away squad is empty.");
  }

  const homeTactic = options.activeTactic;

  // Away takım taktiği: Supabase entegrasyonu yok, varsayılan kullan
  const awayTactic = getDefaultTactic();

  const refereeOptions: any = {
    homeTeamName: options.homeTeamName,
    awayTeamName: options.awayTeamName,
  };
  if (options.refereeName) refereeOptions.refereeName = options.refereeName;
  if (options.refereePersonality) refereeOptions.refereePersonality = options.refereePersonality;
  if (options.refereeStrictness) refereeOptions.refereeStrictness = options.refereeStrictness;

  const effectiveHomeSquad = options.playerRoles
    ? applyRoleBonuses(homeSquad, options.playerRoles)
    : homeSquad;

  const simulationOptions: any = { ...refereeOptions };
  if (options.homeTacticModifiers) simulationOptions.homeTacticModifiers = options.homeTacticModifiers;
  if (options.awayTacticModifiers) simulationOptions.awayTacticModifiers = options.awayTacticModifiers;

  // ── Taktik skoru modifier: 50 = nötr, 100 = +%5 bonus, 0 = -%5 ceza ──
  if (options.tacticalScore) {
    const score = options.tacticalScore.overall;
    const mod = (score - 50) / 1000; // max ±0.05
    simulationOptions.homeTacticModifiers = {
      ...(simulationOptions.homeTacticModifiers || {}),
      goalMod: (simulationOptions.homeTacticModifiers?.goalMod || 0) + mod,
      conceedMod: (simulationOptions.homeTacticModifiers?.conceedMod || 0) - mod,
    };
  }

  const homePSMods = options.homePlayStyleModifiers
    ?? calculateTeamPlayStyleModifiers(effectiveHomeSquad, homeTactic.playStyle);
  const awayPSMods = options.awayPlayStyleModifiers
    ?? calculateTeamPlayStyleModifiers(awaySquad, awayTactic.playStyle);
  simulationOptions.homePlayStyleModifiers = homePSMods;
  simulationOptions.awayPlayStyleModifiers = awayPSMods;

  // ── PROMPT 9: Maç tarihine göre tutarlı hava durumu ──
  // simulationOptions.weather zaten set edilmediyse ve matchDate verildiyse,
  // getWeatherForDate ile fikstür sayfasıyla aynı deterministik havayı kullan
  if (!simulationOptions.weather && options.matchDate) {
    try {
      const { getWeatherForDate } = await import('./stadiumMatrix');
      simulationOptions.weather = getWeatherForDate(options.matchDate);
    } catch { /* getirilemezse varsayılan rastgele hava kullanılır */ }
  }

  const upgrades = options.stadiumUpgrades || {};

  // ── PROMPT 7: Auto-detect isNightMatch / isWinterMatch when not provided ──
  // matchDate verilirse onu kullan, yoksa şu anki zamana göre tespit et
  if (Object.keys(upgrades).length > 0) {
    if (options.isNightMatch === undefined || options.isWinterMatch === undefined) {
      try {
        const { detectMatchConditions } = await import('./stadiumMatrix');
        const dateStr = options.matchDate || new Date().toISOString().split('T')[0];
        const timeStr = options.matchDate ? '12:00' : `${String(new Date().getHours()).padStart(2, '0')}:00`;
        const conditions = detectMatchConditions(dateStr, timeStr);
        if (options.isNightMatch === undefined) options.isNightMatch = conditions.isNightMatch;
        if (options.isWinterMatch === undefined) options.isWinterMatch = conditions.isWinterMatch;
      } catch { /* algılanamazsa undefined kalır, etkisiz olur */ }
    }
  }

  const pitchLevel = upgrades['pitch'] || 0;
  if (pitchLevel > 0) simulationOptions.pitchPassBonus = getPitchPassAccuracyBonus(pitchLevel);
  const heatingLevel = upgrades['heating'] || 0;
  if (heatingLevel > 0 && options.isWinterMatch) simulationOptions.heatingProtection = getHeatingWinterProtection(heatingLevel);
  const lightingLevel = upgrades['lighting'] || 0;
  if (lightingLevel > 0 && options.isNightMatch) simulationOptions.lightingNightBonus = getLightingNightBonus(lightingLevel);
  if (options.pitchPassBonus !== undefined) simulationOptions.pitchPassBonus = options.pitchPassBonus;
  if (options.heatingProtection !== undefined) simulationOptions.heatingProtection = options.heatingProtection;
  if (options.lightingNightBonus !== undefined) simulationOptions.lightingNightBonus = options.lightingNightBonus;

  if (options.stadiumEffects) {
    const { modifiedHomeSquad, modifiedAwaySquad } = applyStadiumEffects(
      effectiveHomeSquad, awaySquad, options.stadiumEffects
    );
    const enhancedResult = simulateEnhancedMatch(
      modifiedHomeSquad, modifiedAwaySquad, homeTactic, awayTactic, simulationOptions
    );
    return convertEnhancedToLegacy(enhancedResult, homeSquad, options);
  }

  if (options.stadiumUpgrades && Object.keys(options.stadiumUpgrades).length > 0) {
    const effects = computeStadiumEffects(
      options.stadiumUpgrades, options.isNightMatch, options.isWinterMatch,
    );
    const { modifiedHomeSquad, modifiedAwaySquad } = applyStadiumEffects(
      effectiveHomeSquad, awaySquad, effects
    );
    const enhancedResult = simulateEnhancedMatch(
      modifiedHomeSquad, modifiedAwaySquad, homeTactic, awayTactic, simulationOptions
    );
    return convertEnhancedToLegacy(enhancedResult, homeSquad, options);
  }

  const enhancedResult = simulateEnhancedMatch(
    effectiveHomeSquad, awaySquad, homeTactic, awayTactic, simulationOptions
  );
  return convertEnhancedToLegacy(enhancedResult, homeSquad, options);
}

// ─── Export singleton for compatibility ─────────────────────────────────────────
export const matchEngine = {
  async runScheduledMatch(
    homeSquad: Player[],
    awaySquad: Player[],
    options: UnifiedMatchOptions
  ): Promise<MatchResult> {
    return runUnifiedMatch(homeSquad, awaySquad, options);
  },
};
