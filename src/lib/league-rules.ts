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
