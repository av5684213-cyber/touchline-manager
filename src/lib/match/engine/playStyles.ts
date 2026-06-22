// =============================================================================
// Managerium — Play Style System
// =============================================================================
// Defines team tactical play styles, their match engine modifiers, and
// assignment logic. Each style has concrete effects on match simulation:
// pressing, passing, stamina drain, tackling, counter-attacks, etc.
// =============================================================================

import { Player } from './types';

// ─── Play Style Modifier Interface ─────────────────────────────────────────
// These modifiers are applied during match simulation. Values are percentage
// offsets (e.g., 0.10 = +10%, -0.05 = -5%). The engine multiplies the base
// probability/stat by (1 + modifier).
export interface PlayStyleModifiers {
  /** Pressing effectiveness — interception & tackle probability for all players */
  pressingBonus: number;
  /** Pass accuracy multiplier — affects pass success probability */
  passAccuracyBonus: number;
  /** Extra condition drain per minute (additive, e.g., 0.15 = +15% more drain) */
  staminaDrain: number;
  /** Tackle success multiplier — affects tackle event probability */
  tackleBonus: number;
  /** Possession tendency — affects momentum determination weight */
  possessionBonus: number;
  /** Counter-attack probability — affects goal chance when counter-attacking */
  counterBonus: number;
  /** Crossing / wing action probability — affects corner & crossing events */
  crossingBonus: number;
  /** Long ball effectiveness — affects direct play & long pass success */
  longBallBonus: number;
  /** Defense solidity — affects marking, positioning, defensive strength */
  defenseBonus: number;
  /** Shot frequency multiplier — affects how often shots are attempted */
  shotFrequencyBonus: number;
  /** Shot accuracy multiplier — affects shot-on-target probability */
  shotAccuracyBonus: number;
}

// ─── Play Style Definition ──────────────────────────────────────────────────
export interface PlayStyleDef {
  id: string;
  name: string;
  short: string;
  icon: string;
  description: string;
  modifiers: PlayStyleModifiers;
}

// ─── All Play Styles ────────────────────────────────────────────────────────
export const PLAY_STYLE_DEFS: PlayStyleDef[] = [
  {
    id: 'gegenpressing',
    name: 'Gegenpressing',
    short: 'Yüksek baskı ve hızlı geri kazanım',
    icon: '⚡',
    description: 'Top kaybından sonra anında baskı ile topu hızla geri kazanır. Yüksek enerji gerektirir, kondisyon kaybı artar.',
    modifiers: {
      pressingBonus: 0.10,
      passAccuracyBonus: 0.02,
      staminaDrain: 0.15,
      tackleBonus: 0.05,
      possessionBonus: 0.05,
      counterBonus: 0.03,
      crossingBonus: 0.00,
      longBallBonus: -0.05,
      defenseBonus: 0.00,
      shotFrequencyBonus: 0.05,
      shotAccuracyBonus: 0.02,
    },
  },
  {
    id: 'tiki_taka',
    name: 'Tiki-Taka',
    short: 'Kısa pas ve oyun kontrolü',
    icon: '⚽',
    description: 'Kısa paslarla topun rakibe verilmemesi ve yavaş yavaş rakip yarı sahaya ilerlenmesi. Pas isabeti artar ama şut sayısı düşer.',
    modifiers: {
      pressingBonus: 0.02,
      passAccuracyBonus: 0.08,
      staminaDrain: 0.03,
      tackleBonus: 0.00,
      possessionBonus: 0.08,
      counterBonus: -0.05,
      crossingBonus: 0.00,
      longBallBonus: -0.12,
      defenseBonus: -0.02,
      shotFrequencyBonus: -0.05,
      shotAccuracyBonus: 0.04,
    },
  },
  {
    id: 'catenaccio',
    name: 'Catenaccio',
    short: 'Katı savunma ve kontratak',
    icon: '🛡️',
    description: 'Defansı kalın tutar, rakibin atağını göğüsler ve hızlı kontra atakla gol arar. Az şut, az top kaybı.',
    modifiers: {
      pressingBonus: 0.00,
      passAccuracyBonus: 0.02,
      staminaDrain: -0.05,
      tackleBonus: 0.08,
      possessionBonus: -0.08,
      counterBonus: 0.10,
      crossingBonus: -0.03,
      longBallBonus: 0.05,
      defenseBonus: 0.10,
      shotFrequencyBonus: -0.08,
      shotAccuracyBonus: 0.02,
    },
  },
  {
    id: 'direct_play',
    name: 'Direct Play',
    short: 'Uzun top ve hızlı hücum',
    icon: '🚀',
    description: 'Topu hızlı ileri taşır, uzun toplar ve doğrudan hücum ile gol arar. Pas isabeti düşer ama gol şansı artar.',
    modifiers: {
      pressingBonus: 0.03,
      passAccuracyBonus: -0.05,
      staminaDrain: 0.05,
      tackleBonus: 0.00,
      possessionBonus: -0.05,
      counterBonus: 0.08,
      crossingBonus: 0.02,
      longBallBonus: 0.12,
      defenseBonus: -0.03,
      shotFrequencyBonus: 0.08,
      shotAccuracyBonus: 0.03,
    },
  },
  {
    id: 'wing_play',
    name: 'Wing Play',
    short: 'Kanat aksiyonu ve orta',
    icon: '🦅',
    description: 'Hücumu kanatlardan başlatır, çokça orta yapar ve kafa golü arar. Kanat aksiyonları artar.',
    modifiers: {
      pressingBonus: 0.00,
      passAccuracyBonus: 0.02,
      staminaDrain: 0.03,
      tackleBonus: 0.00,
      possessionBonus: 0.03,
      counterBonus: 0.02,
      crossingBonus: 0.14,
      longBallBonus: 0.00,
      defenseBonus: -0.02,
      shotFrequencyBonus: 0.05,
      shotAccuracyBonus: 0.00,
    },
  },
  {
    id: 'total_football',
    name: 'Total Football',
    short: 'Herkes her yerde oynar',
    icon: '🌀',
    description: 'Pozisyonlar arası esneklik, herkes hücum ve savunmaya katılır. Tüm istatistikler hafif artar ama kondisyon kaybı yüksek.',
    modifiers: {
      pressingBonus: 0.05,
      passAccuracyBonus: 0.04,
      staminaDrain: 0.10,
      tackleBonus: 0.04,
      possessionBonus: 0.04,
      counterBonus: 0.04,
      crossingBonus: 0.03,
      longBallBonus: 0.00,
      defenseBonus: 0.03,
      shotFrequencyBonus: 0.03,
      shotAccuracyBonus: 0.03,
    },
  },
  {
    id: 'route_one',
    name: 'Route One',
    short: 'Direkt kaleci → forvet',
    icon: '🏹',
    description: 'En kısa yoldan gol arar. Kaleci doğrudan forvete uzun top atar. Basit ama etkili. Pas isabeti düşer.',
    modifiers: {
      pressingBonus: -0.03,
      passAccuracyBonus: -0.08,
      staminaDrain: -0.03,
      tackleBonus: 0.00,
      possessionBonus: -0.10,
      counterBonus: 0.05,
      crossingBonus: 0.00,
      longBallBonus: 0.18,
      defenseBonus: 0.00,
      shotFrequencyBonus: 0.06,
      shotAccuracyBonus: 0.05,
    },
  },
  {
    id: 'possession_football',
    name: 'Possession Football',
    short: 'Topa sahip olma odaklı',
    icon: '🔄',
    description: 'Topu ayağında tutarak rakibi yorar. Yüksek pas isabeti ve topa sahip olma, ama kontra atak zayıf.',
    modifiers: {
      pressingBonus: 0.00,
      passAccuracyBonus: 0.10,
      staminaDrain: -0.02,
      tackleBonus: 0.00,
      possessionBonus: 0.10,
      counterBonus: -0.05,
      crossingBonus: 0.00,
      longBallBonus: -0.08,
      defenseBonus: 0.00,
      shotFrequencyBonus: -0.03,
      shotAccuracyBonus: 0.05,
    },
  },
  {
    id: 'high_press',
    name: 'High Press',
    short: 'Rakip yarı sahada baskı',
    icon: '🔥',
    description: 'Rakip yarı sahada agresif baskı yapar, topu kazanır ve hemen gol arar. Çok enerji harcar.',
    modifiers: {
      pressingBonus: 0.15,
      passAccuracyBonus: 0.00,
      staminaDrain: 0.20,
      tackleBonus: 0.08,
      possessionBonus: 0.03,
      counterBonus: 0.05,
      crossingBonus: 0.00,
      longBallBonus: -0.05,
      defenseBonus: 0.05,
      shotFrequencyBonus: 0.08,
      shotAccuracyBonus: 0.02,
    },
  },
  {
    id: 'parking_the_bus',
    name: 'Parking the Bus',
    short: 'Tüm takım savunmada',
    icon: '🚌',
    description: 'Tüm takım kendi yarı sahasında çifter çifter durur. Az şut, az gol yeme, yüksek savunma.',
    modifiers: {
      pressingBonus: -0.05,
      passAccuracyBonus: 0.00,
      staminaDrain: -0.08,
      tackleBonus: 0.05,
      possessionBonus: -0.12,
      counterBonus: 0.12,
      crossingBonus: -0.05,
      longBallBonus: 0.05,
      defenseBonus: 0.15,
      shotFrequencyBonus: -0.12,
      shotAccuracyBonus: 0.00,
    },
  },
];

// ─── Lookup maps ────────────────────────────────────────────────────────────
const PLAY_STYLE_BY_ID: Record<string, PlayStyleDef> = {};
const PLAY_STYLE_BY_NAME: Record<string, PlayStyleDef> = {};
for (const def of PLAY_STYLE_DEFS) {
  PLAY_STYLE_BY_ID[def.id] = def;
  PLAY_STYLE_BY_NAME[def.name] = def;
}

// ─── Get play style effect (for UI display) ────────────────────────────────
export function getPlayStyleEffect(style: string): {
  name: string;
  short: string;
  icon: string;
  description: string;
} | null {
  // Try by name first, then by id
  const def = PLAY_STYLE_BY_NAME[style] || PLAY_STYLE_BY_ID[style];
  if (def) {
    return {
      name: def.name,
      short: def.short,
      icon: def.icon,
      description: def.description,
    };
  }
  return null;
}

// ─── Get match modifiers for a play style ──────────────────────────────────
export function getPlayStyleMatchModifiers(style: string): PlayStyleModifiers {
  const def = PLAY_STYLE_BY_NAME[style] || PLAY_STYLE_BY_ID[style];
  if (def) {
    return { ...def.modifiers };
  }
  // Return neutral modifiers if style not found
  return {
    pressingBonus: 0,
    passAccuracyBonus: 0,
    staminaDrain: 0,
    tackleBonus: 0,
    possessionBonus: 0,
    counterBonus: 0,
    crossingBonus: 0,
    longBallBonus: 0,
    defenseBonus: 0,
    shotFrequencyBonus: 0,
    shotAccuracyBonus: 0,
  };
}

// ─── Position-weighted style assignment ─────────────────────────────────────
// Some styles are more natural for certain positions. This map gives weights
// so that e.g., a defender is more likely to get Catenaccio than Wing Play.
const POSITION_STYLE_WEIGHTS: Record<string, Record<string, number>> = {
  GK: {
    gegenpressing: 0.3,
    tiki_taka: 0.2,
    catenaccio: 1.0,
    direct_play: 0.5,
    wing_play: 0.1,
    total_football: 0.3,
    route_one: 0.8,
    possession_football: 0.3,
    high_press: 0.2,
    parking_the_bus: 0.8,
  },
  DEF: {
    gegenpressing: 0.5,
    tiki_taka: 0.3,
    catenaccio: 1.0,
    direct_play: 0.4,
    wing_play: 0.3,
    total_football: 0.4,
    route_one: 0.6,
    possession_football: 0.4,
    high_press: 0.5,
    parking_the_bus: 1.0,
  },
  MID: {
    gegenpressing: 0.8,
    tiki_taka: 1.0,
    catenaccio: 0.3,
    direct_play: 0.5,
    wing_play: 0.5,
    total_football: 0.8,
    route_one: 0.3,
    possession_football: 1.0,
    high_press: 0.7,
    parking_the_bus: 0.2,
  },
  FWD: {
    gegenpressing: 0.6,
    tiki_taka: 0.4,
    catenaccio: 0.1,
    direct_play: 0.8,
    wing_play: 0.7,
    total_football: 0.7,
    route_one: 0.5,
    possession_football: 0.3,
    high_press: 0.5,
    parking_the_bus: 0.05,
  },
};

// ─── Assign a random play style to a player ─────────────────────────────────
// Uses position-weighted random selection so players get styles that fit
// their position. The result is stored in `player.playStyle`.
export function assignRandomPlayStyle(player: Player): Player {
  // If player already has a style, keep it
  if (player.playStyle) return player;

  const pos = player.position || 'MID';
  const weights = POSITION_STYLE_WEIGHTS[pos] || POSITION_STYLE_WEIGHTS['MID'];

  // Build weighted selection pool
  const pool: { style: PlayStyleDef; weight: number }[] = [];
  for (const def of PLAY_STYLE_DEFS) {
    pool.push({ style: def, weight: weights[def.id] ?? 0.5 });
  }

  // Weighted random pick
  const totalWeight = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * totalWeight;
  let selected = pool[0].style;
  for (const entry of pool) {
    r -= entry.weight;
    if (r <= 0) {
      selected = entry.style;
      break;
    }
  }

  return { ...player, playStyle: selected.name };
}

// ─── Calculate team-level play style ────────────────────────────────────────
// Aggregates individual player playStyles into a single team modifier set.
// Uses weighted average where each player contributes proportionally.
// If a team has a tactical playStyle (from ActiveTactic), that overrides.
export function calculateTeamPlayStyleModifiers(
  players: Player[],
  teamPlayStyle?: string
): PlayStyleModifiers {
  // If the team has an explicit tactical play style, use it
  if (teamPlayStyle) {
    return getPlayStyleMatchModifiers(teamPlayStyle);
  }

  // Otherwise, aggregate from individual player styles
  if (players.length === 0) {
    return getPlayStyleMatchModifiers(''); // neutral
  }

  const modifierKeys: (keyof PlayStyleModifiers)[] = [
    'pressingBonus', 'passAccuracyBonus', 'staminaDrain', 'tackleBonus',
    'possessionBonus', 'counterBonus', 'crossingBonus', 'longBallBonus',
    'defenseBonus', 'shotFrequencyBonus', 'shotAccuracyBonus',
  ];

  const result: PlayStyleModifiers = {
    pressingBonus: 0,
    passAccuracyBonus: 0,
    staminaDrain: 0,
    tackleBonus: 0,
    possessionBonus: 0,
    counterBonus: 0,
    crossingBonus: 0,
    longBallBonus: 0,
    defenseBonus: 0,
    shotFrequencyBonus: 0,
    shotAccuracyBonus: 0,
  };

  let totalWeight = 0;

  for (const player of players) {
    if (!player.playStyle) continue;

    const mods = getPlayStyleMatchModifiers(player.playStyle);
    // Weight by player rating — better players contribute more to team style
    const weight = (player.rating || 60) / 100;
    totalWeight += weight;

    for (const key of modifierKeys) {
      result[key] += mods[key] * weight;
    }
  }

  // Normalize by total weight
  if (totalWeight > 0) {
    for (const key of modifierKeys) {
      result[key] = result[key] / totalWeight;
    }
  }

  return result;
}

// ─── Get all play style names (for dropdowns etc.) ──────────────────────────
export function getAllPlayStyleNames(): { id: string; name: string; icon: string }[] {
  return PLAY_STYLE_DEFS.map(def => ({ id: def.id, name: def.name, icon: def.icon }));
}
