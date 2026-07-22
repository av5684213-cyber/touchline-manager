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
  // v2.9.11: Counter-Attack eklendi (mock/data.ts'te vardı, motorde yoktu)
  {
    id: 'counter_attack',
    name: 'Counter-Attack',
    short: 'Kontra atak',
    icon: '🎯',
    description: 'Savunmadan hızlı çıkış. Topu kazanıp hızla forvete ulaştırır. Defansif ama öldürücü.',
    modifiers: {
      pressingBonus: 0.04,
      passAccuracyBonus: -0.03,
      staminaDrain: -0.05,
      tackleBonus: 0.06,
      possessionBonus: -0.08,
      counterBonus: 0.18,
      crossingBonus: 0.02,
      longBallBonus: 0.10,
      defenseBonus: 0.10,
      shotFrequencyBonus: -0.05,
      shotAccuracyBonus: 0.05,
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

// ════════════════════════════════════════════════════════════════════════════
// v2.9.11: OYUN STİLİ UYUM SİSTEMİ
// ════════════════════════════════════════════════════════════════════════════
// İlk 11'de benzer oyun stillerine sahip 4+ oyuncu varsa bonus.
// Aynı zamanda seçili taktik ile uyumluysa ekstra bonus.
//
// Senaryo:
// - 4 oyuncu Gegenpressing stilde → +%4 takım gücü
// - 5 oyuncu Gegenpressing + taktikte Gegenpressing seçili → +%4 + +%3 = +%7
// - 6+ oyuncu Gegenpressing + taktik uyumu → +%6 + +%5 = +%11
//
// Maksimum bonus: +%12 (8+ oyuncu + taktik uyumu)

/**
 * Lineup'daki oyun stili dağılımını sayar.
 */
export function getLineStyleCounts(lineup: Player[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of lineup) {
    if (!p?.playStyle) continue;
    counts[p.playStyle] = (counts[p.playStyle] ?? 0) + 1;
  }
  return counts;
}

/**
 * En yaygın oyun stilini ve oyuncu sayısını döndürür.
 */
export function getDominantLineStyle(lineup: Player[]): { style: string; count: number } | null {
  const counts = getLineStyleCounts(lineup);
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return { style: entries[0][0], count: entries[0][1] };
}

/**
 * Lineup oyun stili uyum bonusu.
 * 4+ oyuncu aynı stilde → bonus başlar.
 * 5 oyuncu → +%3
 * 6 oyuncu → +%4.5
 * 7 oyuncu → +%6
 * 8+ oyuncu → +%8
 *
 * @param lineup 11 oyuncu (null olabilir)
 * @returns Bonus çarpanı (0 - 0.08 arası)
 */
export function calculateLineStyleBonus(lineup: Player[]): number {
  const dominant = getDominantLineStyle(lineup);
  if (!dominant || dominant.count < 4) return 0;

  // 4 oyuncu: +%2 (taban)
  // Her ek oyuncu: +%1.5
  // 8+ oyuncu: +%8 (cap)
  const excessCount = dominant.count - 4;
  const bonus = 0.02 + excessCount * 0.015;
  return Math.min(bonus, 0.08);
}

/**
 * Lineup stili ile seçili taktik stili uyumu.
 * Eğer dominant lineup stili ile taktikteki playStyle aynıysa ekstra bonus.
 *
 * @param lineup 11 oyuncu
 * @param tacticPlayStyle Taktikten gelen playStyle (örn "Gegenpressing")
 * @returns Bonus çarpanı (0 veya 0.03 - 0.05 arası)
 */
export function calculateTacticStyleSynergy(
  lineup: Player[],
  tacticPlayStyle?: string
): number {
  if (!tacticPlayStyle) return 0;
  const dominant = getDominantLineStyle(lineup);
  if (!dominant || dominant.count < 4) return 0;

  // Taktik playStyle'ı normalize et
  // (UI'da "dengeli/hucum/savunma/kontra" olabilir, bunları gerçek stillere eşle)
  const tacticNormalized = normalizePlayStyle(tacticPlayStyle);
  const lineupNormalized = normalizePlayStyle(dominant.style);

  if (tacticNormalized === lineupNormalized) {
    // 4-5 oyuncu: +%3, 6-7 oyuncu: +%4, 8+ oyuncu: +%5
    if (dominant.count >= 8) return 0.05;
    if (dominant.count >= 6) return 0.04;
    return 0.03;
  }
  return 0;
}

/**
 * Toplam stil uyum bonusu (lineup + taktik).
 * Maç motoruna tek çağrı ile hesaplanır.
 */
export function calculateTotalStyleSynergy(
  lineup: Player[],
  tacticPlayStyle?: string
): {
  totalBonus: number;          // 0 - 0.13 arası
  lineBonus: number;           // lineup bonusu
  tacticSynergy: number;       // taktik uyumu
  dominantStyle: string | null;
  dominantCount: number;
  hasTacticSynergy: boolean;
  description: string;
} {
  const lineBonus = calculateLineStyleBonus(lineup);
  const tacticSynergy = calculateTacticStyleSynergy(lineup, tacticPlayStyle);
  const dominant = getDominantLineStyle(lineup);

  const totalBonus = lineBonus + tacticSynergy;
  const hasTacticSynergy = tacticSynergy > 0;

  let description = "";
  if (dominant && dominant.count >= 4) {
    description = `${dominant.count} oyuncu ${dominant.style} stilde`;
    if (hasTacticSynergy) {
      description += ` + taktik uyumu`;
    }
    description += ` → +%${Math.round(totalBonus * 100)} takım gücü`;
  } else {
    description = "Stil uyumu yok (4+ oyuncu aynı stilde değil)";
  }

  return {
    totalBonus,
    lineBonus,
    tacticSynergy,
    dominantStyle: dominant?.style ?? null,
    dominantCount: dominant?.count ?? 0,
    hasTacticSynergy,
    description,
  };
}

/**
 * Play style ismini normalize et — farklı kaynaklardan gelen değerleri eşle.
 * "Gegenpressing", "gegenpressing", "Gegen Pressing" → "Gegenpressing"
 */
function normalizePlayStyle(style: string): string {
  const lower = style.toLowerCase().replace(/[\s-]/g, "");
  // Motor değerleri
  if (lower === "gegenpressing") return "Gegenpressing";
  if (lower === "tikitaka") return "Tiki-Taka";
  if (lower === "catenaccio") return "Catenaccio";
  if (lower === "directplay") return "Direct Play";
  if (lower === "wingplay") return "Wing Play";
  if (lower === "totalfootball") return "Total Football";
  if (lower === "routeone") return "Route One";
  if (lower === "possessionfootball") return "Possession Football";
  if (lower === "highpress") return "High Press";
  if (lower === "parkingthebus") return "Parking the Bus";
  if (lower === "counterattack" || lower === "counter_attack" || lower === "kontra") return "Counter-Attack";
  // UI değerleri — eşleştir
  if (lower === "dengeli" || lower === "balanced") return "Possession Football";
  if (lower === "hucum" || lower === "attack") return "Direct Play";
  if (lower === "savunma" || lower === "defense") return "Catenaccio";
  return style; // bilinmeyen — olduğu gibi bırak
}
