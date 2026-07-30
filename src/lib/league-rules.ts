/**
 * v2.9.21 GÖREV 1 — Küme düşme/terfi kuralları (TEK KANONİK KAYNAK).
 *
 * 18 takımlık ligde:
 *   - Üst 3 takım (idx 0,1,2) → bir üst lige terfi
 *   - Alt 3 takım (idx 15,16,17) → bir alt lige düşme
 *   - Tier 1 (Süper Lig): terfi yok (zaten en üst)
 *   - Tier 4 (en alt): düşme yok (zaten en alt)
 *
 * Bu sabit sayı tüm UI + backend'de kullanılır — tek yerden değiştirilebilir.
 *
 * Backend'de: store.ts'te myIdx < PROMOTION_COUNT → promoted, myIdx >= (TEAMS_PER_LEAGUE - RELEGATION_COUNT) → relegated
 * UI'da: LeagueStandings getZone() ile aynı sayılar kullanılır
 */

export const TEAMS_PER_LEAGUE = 18;
export const PROMOTION_COUNT = 3;
export const RELEGATION_COUNT = 3;

/**
 * Bir takımın idx'ine göre zone belirle.
 *
 * @param idx 0-based sıra (standings'de)
 * @param tier 1-4 (tier 1 terfi yok, tier 4 düşme yok)
 */
export function getLeagueZone(
  idx: number,
  tier: number = 2
): "promotion" | "relegation" | "middle" {
  // Tier 1 (Süper Lig) — terfi yok, sadece düşme
  if (tier === 1) {
    if (idx >= TEAMS_PER_LEAGUE - RELEGATION_COUNT) return "relegation";
    return "middle";
  }
  // Tier 4 (en alt) — düşme yok, sadece terfi
  if (tier === 4) {
    if (idx < PROMOTION_COUNT) return "promotion";
    return "middle";
  }
  // Tier 2-3 — hem terfi hem düşme
  if (idx < PROMOTION_COUNT) return "promotion";
  if (idx >= TEAMS_PER_LEAGUE - RELEGATION_COUNT) return "relegation";
  return "middle";
}

/**
 * Bir takım terfi eder mi?
 */
export function isPromotionZone(idx: number, tier: number): boolean {
  if (tier === 1) return false;
  return idx < PROMOTION_COUNT;
}

/**
 * Bir takım düşer mi?
 */
export function isRelegationZone(idx: number, tier: number): boolean {
  if (tier === 4) return false;
  return idx >= TEAMS_PER_LEAGUE - RELEGATION_COUNT;
}

// ============================================================================
// v2.9.46 GÖREV 1 — Sezon/tur takvimi (34 tur)
// ============================================================================
//
// Sezon yapısı:
//   - 3 tam hafta (Pzt–Cum, günde 2 tur = 10 tur/hafta) → 30 tur
//   - 4. hafta sadece Pzt–Sal (günde 2 tur × 2 gün = 4 tur) → 4 tur
//   - Toplam: 34 tur
//   - Sezon 4. hafta Salı akşamı biter
//   - 4. hafta Çarşamba = "boşluk günü":
//       * Ödüller dağıtılır (sezon sonu batch)
//       * Şampiyonlar Ligi 12:00'de başlar (GÖREV 2)
//   - Yeni sezon bir sonraki Pazartesi başlar
//
// Bu sabitler TEK KAYNAK olarak tüm uygulama tarafından kullanılır.
// ============================================================================

/** Toplam tur sayısı (sezon uzunluğu). */
export const TOTAL_MATCHDAYS = 34;

/** Hafta içi (Pzt–Cum) günde oynanan tur sayısı. */
export const MATCHDAYS_PER_WEEKDAY = 2;

/** Bir tam haftadaki tur sayısı (5 gün × 2 tur). */
export const MATCHDAYS_PER_FULL_WEEK = 10;

/** Tam hafta sayısı (3 hafta × 10 tur = 30 tur). */
export const FULL_WEEKS = 3;

/** 4. haftada oynanan gün sayısı (sadece Pzt–Sal). */
export const SHORT_WEEK_DAYS = 2;

/** 4. haftadaki tur sayısı (2 gün × 2 tur = 4 tur). */
export const SHORT_WEEK_MATCHDAYS = SHORT_WEEK_DAYS * MATCHDAYS_PER_WEEKDAY; // = 4

/** Hafta içi maç saatleri (24h UTC+3 formatında). */
export const MATCH_HOURS_WEEKDAY = [12, 18] as const;

/** Cumartesi kupa maçı saati. */
export const CUP_HOUR_SATURDAY = 18;

/** Pazar özel kupa saat dilimleri. */
export const SPECIAL_CUP_HOURS_SUNDAY = [12, 14, 16, 18] as const;

/** Şampiyonlar Ligi başlangıç saati (boşluk Çarşambası). */
export const CHAMPIONS_LEAGUE_HOUR = 12;

/**
 * Verilen matchday'in (1-34) hangi hafta/gün içinde olduğunu hesapla.
 *
 * @param matchday 1-34
 * @returns { week: 1-4, day: 1-2, slot: 1-2, isShortWeek: boolean }
 *   - week: 1-3 = tam hafta, 4 = kısa hafta
 *   - day: 1=Pzt ... 5=Cum (tam hafta), 1=Pzt 2=Sal (kısa hafta)
 *   - slot: 1 veya 2 (günün ilk/ikinci maçı)
 */
export function getMatchdayCalendar(matchday: number): {
  week: number;
  day: number;
  slot: number;
  isShortWeek: boolean;
} {
  if (matchday < 1 || matchday > TOTAL_MATCHDAYS) {
    return { week: 0, day: 0, slot: 0, isShortWeek: false };
  }

  // İlk 30 tur = 3 tam hafta
  if (matchday <= FULL_WEEKS * MATCHDAYS_PER_FULL_WEEK) {
    const zero = matchday - 1;
    const week = Math.floor(zero / MATCHDAYS_PER_FULL_WEEK) + 1; // 1-3
    const dayInWeek = zero % MATCHDAYS_PER_FULL_WEEK; // 0-9
    const day = Math.floor(dayInWeek / MATCHDAYS_PER_WEEKDAY) + 1; // 1-5
    const slot = (dayInWeek % MATCHDAYS_PER_WEEKDAY) + 1; // 1-2
    return { week, day, slot, isShortWeek: false };
  }

  // Son 4 tur = kısa hafta (sadece Pzt-Sal)
  const shortIdx = matchday - FULL_WEEKS * MATCHDAYS_PER_FULL_WEEK - 1; // 0-3
  const day = Math.floor(shortIdx / MATCHDAYS_PER_WEEKDAY) + 1; // 1-2
  const slot = (shortIdx % MATCHDAYS_PER_WEEKDAY) + 1; // 1-2
  return { week: 4, day, slot, isShortWeek: true };
}

/**
 * Matchday'in sezon sonu mu olduğunu kontrol et (34. tur = sezon sonu).
 */
export function isSeasonEndMatchday(matchday: number): boolean {
  return matchday === TOTAL_MATCHDAYS;
}

/**
 * "Boşluk Çarşambası" — sezonun 34. turundan sonraki Çarşamba günü.
 * Bu günde normal lig maçı yoktur; ödüller dağıtılır ve Şampiyonlar Ligi başlar.
 *
 * @param seasonEndMatchday 34 (genellikle TOTAL_MATCHDAYS)
 * @returns boolean — verilen matchday boşluk Çarşambası mı
 */
export function isGapWednesdayMatchday(matchday: number): boolean {
  // Boşluk Çarşambası 34. turdan hemen sonradır (mevcut sistemde 35. matchday gibi davranır)
  return matchday === TOTAL_MATCHDAYS + 1;
}
