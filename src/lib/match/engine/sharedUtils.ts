/**
 * sharedUtils.ts — Tekrarlanan kod pattern'lerini merkezileştiren utility modülü
 *
 * Çözülen teknik borçlar:
 * - JSON parse pattern tekrarı (typeof x === 'string' ? JSON.parse(x) : x)
 * - Stat keys listesinin 3+ yerde tekrarı
 * - Youth player mapping'inin persistence.ts ve cron route'unda kopyası
 * - buildStatsObject'inin birden fazla yerde tanımı
 */

// ═══════════════════════════════════════════════════════════════
// JSON PARSE UTILITY
// ═══════════════════════════════════════════════════════════════

/**
 * Supabase'den gelen JSONB alanını güvenli şekilde parse eder.
 * Supabase bazen JSONB'yi string olarak döner, bazen direkt obje olarak.
 *
 * @param value - Parse edilecek değer (string, obje, veya null/undefined)
 * @param fallback - Parse başarısız olursa veya değer null ise dönecek varsayılan
 * @returns Parse edilmiş değer veya fallback
 *
 * @example
 * const stats = safeJsonParse(row.stats, {});
 * const traits = safeJsonParse(row.traits, []);
 */
export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    if (value === '' || value === 'null' || value === 'undefined') return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  if (typeof value === 'object') return value as T;
  return fallback;
}

// ═══════════════════════════════════════════════════════════════
// STAT KEY LİSTELERİ (Tekrarlanan tanımlamaları merkezileştirir)
// ═══════════════════════════════════════════════════════════════

/**
 * Temel 6 istatistik (DB'deki ayrı kolonlara karşılık gelen)
 */
export const CORE_STAT_KEYS = [
  'speed', 'passing', 'shooting', 'defending', 'power', 'goalkeeping',
] as const;

/**
 * Teknik istatistikler
 */
export const TECHNICAL_STAT_KEYS = [
  'finishing', 'dribbling', 'firstTouch', 'crossing', 'marking', 'tackling',
  'technique', 'longShots', 'offTheBall', 'heading',
] as const;

/**
 * Zihinsel istatistikler
 */
export const MENTAL_STAT_KEYS = [
  'aggression', 'bravery', 'workRate', 'decisions', 'determination',
  'concentration', 'leadership', 'anticipation', 'flair', 'positioning',
  'composure', 'teamwork', 'vision',
] as const;

/**
 * Fiziksel istatistikler
 */
export const PHYSICAL_STAT_KEYS = [
  'agility', 'balance', 'strength', 'acceleration', 'jumping',
  'stamina', 'control',
] as const;

/**
 * Youth Academy'de stats JSONB'sinde saklanan tüm istatistik anahtarları.
 * persistence.ts, youth-training/route.ts ve valuation.ts'te tekrarlanan
 * listeleri bu sabit değiştirir.
 */
export const YOUTH_STAT_KEYS = [
  ...CORE_STAT_KEYS,
  ...TECHNICAL_STAT_KEYS,
  ...MENTAL_STAT_KEYS,
  ...PHYSICAL_STAT_KEYS,
] as const;

/**
 * Valuation'da exceptional stats hesaplaması için kullanılan anahtarlar.
 */
export const VALUATION_STAT_KEYS = [
  'speed', 'passing', 'shooting', 'finishing', 'dribbling',
  'defending', 'tackling', 'heading', 'crossing', 'longShots',
  'technique', 'firstTouch', 'vision', 'anticipation', 'composure',
  'workRate', 'strength', 'stamina', 'agility',
] as const;

// ═══════════════════════════════════════════════════════════════
// YOUTH PLAYER MAPPING (Merkezi implementasyon)
// ═══════════════════════════════════════════════════════════════

/** Youth player stats için varsayılan değerler (pozisyona göre) */
export const DEFAULT_STAT_VALUES: Record<string, number> = {
  speed: 50, passing: 50, shooting: 50, defending: 50, power: 50,
  goalkeeping: 15, finishing: 50, dribbling: 50, firstTouch: 50,
  crossing: 50, marking: 50, tackling: 50, technique: 50, longShots: 50,
  offTheBall: 50, heading: 50, aggression: 50, bravery: 50, workRate: 50,
  decisions: 50, determination: 50, concentration: 50, leadership: 30,
  anticipation: 50, flair: 20, positioning: 50, composure: 50, teamwork: 50,
  vision: 50, agility: 50, balance: 50, strength: 50, acceleration: 50,
  jumping: 50, stamina: 60, control: 50,
};

/**
 * Supabase youth_players satırını YouthPlayer objesine dönüştürür.
 * Bu fonksiyon persistence.ts ve youth-training cron route'undaki
 * kopya implementasyonları birleştirir.
 */
export function mapYouthPlayerFromRow(row: Record<string, unknown>): Record<string, unknown> {
  const stats = safeJsonParse<Record<string, number>>(row.stats, {});
  const personalityTraits = safeJsonParse<string[]>(row.personality_traits, []);
  const traits = safeJsonParse<string[]>(row.traits, []);
  const traitLevels = safeJsonParse<Record<string, string>>(row.trait_levels, {});
  const scoutReport = safeJsonParse<Record<string, unknown> | null>(row.scout_report, null);
  const statsGained = safeJsonParse<Record<string, number>>(row.stats_gained_this_season, {});

  return {
    id: row.id,
    name: row.name,
    age: row.age,
    position: row.position,
    specificPosition: row.specific_position,
    rating: row.rating,
    potential: row.potential,
    hidden_potential: row.hidden_potential,
    academyLevel: row.academy_level,
    joinDate: row.join_date,
    weeklyTrainingHours: row.weekly_training_hours,
    totalTrainingWeeks: row.total_training_weeks,
    developmentCurve: row.development_curve,
    isWonderkid: row.is_wonderkid,
    category: row.category,
    scoutReport,
    personalityTraits,
    traits,
    traitLevels: Object.keys(traitLevels).length > 0 ? traitLevels : undefined,
    // Primary stats from stats JSONB
    speed: stats.speed ?? DEFAULT_STAT_VALUES.speed,
    passing: stats.passing ?? DEFAULT_STAT_VALUES.passing,
    shooting: stats.shooting ?? DEFAULT_STAT_VALUES.shooting,
    defending: stats.defending ?? DEFAULT_STAT_VALUES.defending,
    power: stats.power ?? DEFAULT_STAT_VALUES.power,
    goalkeeping: stats.goalkeeping ?? DEFAULT_STAT_VALUES.goalkeeping,
    // Technical
    finishing: stats.finishing ?? DEFAULT_STAT_VALUES.finishing,
    dribbling: stats.dribbling ?? DEFAULT_STAT_VALUES.dribbling,
    firstTouch: stats.firstTouch ?? DEFAULT_STAT_VALUES.firstTouch,
    crossing: stats.crossing ?? DEFAULT_STAT_VALUES.crossing,
    marking: stats.marking ?? DEFAULT_STAT_VALUES.marking,
    tackling: stats.tackling ?? DEFAULT_STAT_VALUES.tackling,
    technique: stats.technique ?? DEFAULT_STAT_VALUES.technique,
    longShots: stats.longShots ?? DEFAULT_STAT_VALUES.longShots,
    offTheBall: stats.offTheBall ?? DEFAULT_STAT_VALUES.offTheBall,
    heading: stats.heading ?? DEFAULT_STAT_VALUES.heading,
    // Mental
    aggression: stats.aggression ?? DEFAULT_STAT_VALUES.aggression,
    bravery: stats.bravery ?? DEFAULT_STAT_VALUES.bravery,
    workRate: stats.workRate ?? DEFAULT_STAT_VALUES.workRate,
    decisions: stats.decisions ?? DEFAULT_STAT_VALUES.decisions,
    determination: stats.determination ?? DEFAULT_STAT_VALUES.determination,
    concentration: stats.concentration ?? DEFAULT_STAT_VALUES.concentration,
    leadership: stats.leadership ?? DEFAULT_STAT_VALUES.leadership,
    anticipation: stats.anticipation ?? DEFAULT_STAT_VALUES.anticipation,
    flair: stats.flair ?? DEFAULT_STAT_VALUES.flair,
    positioning: stats.positioning ?? DEFAULT_STAT_VALUES.positioning,
    composure: stats.composure ?? DEFAULT_STAT_VALUES.composure,
    teamwork: stats.teamwork ?? DEFAULT_STAT_VALUES.teamwork,
    vision: stats.vision ?? DEFAULT_STAT_VALUES.vision,
    // Physical
    agility: stats.agility ?? DEFAULT_STAT_VALUES.agility,
    balance: stats.balance ?? DEFAULT_STAT_VALUES.balance,
    strength: stats.strength ?? DEFAULT_STAT_VALUES.strength,
    acceleration: stats.acceleration ?? stats.speed ?? DEFAULT_STAT_VALUES.acceleration,
    jumping: stats.jumping ?? DEFAULT_STAT_VALUES.jumping,
    stamina: stats.stamina ?? DEFAULT_STAT_VALUES.stamina,
    control: stats.control ?? DEFAULT_STAT_VALUES.control,
    // Condition
    cond: row.cond ?? 85,
    form: row.form ?? 60,
    morale: row.morale ?? 70,
    confidence: row.confidence ?? 60,
    // Injury
    injured: row.injured ?? false,
    injuryWeeksRemaining: row.injury_weeks_remaining ?? 0,
    // Stats gained
    statsGainedThisSeason: statsGained,
  };
}

// ═══════════════════════════════════════════════════════════════
// BUILD STATS OBJECT (Merkezi implementasyon)
// ═══════════════════════════════════════════════════════════════

/**
 * Bir player objesinden stats JSONB'si oluşturur.
 * persistence.ts ve youth-training cron route'undaki
 * kopya implementasyonları birleştirir.
 */
export function buildStatsObject(player: Record<string, unknown>): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const key of YOUTH_STAT_KEYS) {
    const val = player[key];
    if (typeof val === 'number') {
      stats[key] = val;
    }
  }
  return stats;
}

// ═══════════════════════════════════════════════════════════════
// SUPABASE NULL CHECK UTILITY
// ═══════════════════════════════════════════════════════════════

/**
 * getSupabase() null check pattern'ini standartlaştırır.
 * Supabase yapılandırılmamışsa veya client null ise hata fırlatır.
 *
 * @returns SupabaseClient (null olamaz)
 * @throws Error - Supabase yapılandırılmamışsa
 *
 * @example
 * const supabase = requireSupabase();
 * // artık supabase null değil, direkt kullanılabilir
 */
export function requireSupabase() {
  // Stub — Supabase entegrasyonu henüz aktif değil
  throw new Error('Supabase yapılandırılmamış — mock modda çalışıyor');
}

/**
 * Oyuncunun kaptan olup olmadığını kontrol eder.
 * DB'de hem 'kaptan' (eski) hem 'captain' (yeni) değeri olabileceği için
 * her iki durumu da kapsar.
 */
export function kaptanMi(specialRole: string | null | undefined): boolean {
  return specialRole === 'kaptan' || specialRole === 'captain';
}
