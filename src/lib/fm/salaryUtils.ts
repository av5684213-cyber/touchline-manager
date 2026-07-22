/**
 * Maaş Hesaplama Yardımcıları
 * ═══════════════════════════════════════════════════════
 *
 * Baz maaş: overall × 950 × tier çarpanı
 * Enflasyon: sezon numarasına göre çarpan uygulanır.
 *
 * Kullanım:
 *   const range = calculateSalaryRange(player.overall, tierMult, seasonNumber);
 */

import { applyInflation, removeInflation } from "./inflation";

/**
 * Lig tier'ına göre maaş çarpanı.
 * Süper Lig'de maaşlar daha yüksek, alt liglerde daha düşük.
 */
export const TIER_SALARY_MULTIPLIER: Record<number, number> = {
  1: 1.50,   // Süper Lig
  2: 1.00,   // 1. Lig
  3: 0.65,   // 2. Lig
  4: 0.40,   // 3. Lig
};

/**
 * Oyuncu için haftalık maaş aralığı hesapla.
 *
 * @param overall 0-100 oyuncu genel puanı
 * @param tierMultiplier lig tier çarpanı (TIER_SALARY_MULTIPLIER'dan)
 * @param seasonNumber mevcut sezon numarası (enflasyon için)
 * @returns { min, max, suggested } haftalık € cinsinden
 */
export function calculateSalaryRange(
  overall: number,
  tierMultiplier: number,
  seasonNumber: number = 1
): { min: number; max: number; suggested: number } {
  const baseSalary = overall * 950 * tierMultiplier;
  const inflated = applyInflation(baseSalary, seasonNumber);
  return {
    min: Math.round(inflated * 0.7),
    max: Math.round(inflated * 1.4),
    suggested: inflated,
  };
}

/**
 * Oyuncunun mevcut maaşını enflasyona göre güncelle.
 * Yeni sözleşme / sezon başı yenileme için kullanılır.
 */
export function inflateCurrentWage(
  currentWage: number,
  oldSeasonNumber: number,
  newSeasonNumber: number
): number {
  // Eski maaşı Sezon 1'e normalize et, sonra yeni sezona uygula
  const baseWage = removeInflation(currentWage, oldSeasonNumber);
  return applyInflation(baseWage, newSeasonNumber);
}
