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
 * @param age oyuncu yaşı (yaş bonusu için, opsiyonel)
 * @returns { min, max, suggested } haftalık € cinsinden
 *
 * v2.9.30 T-06: ageBonus eklendi — prime yaş (24-29) %15 daha yüksek,
 * genç (<22) %20 daha düşük, yaş (>32) %15 daha düşük.
 */
export function calculateSalaryRange(
  overall: number,
  tierMultiplier: number,
  seasonNumber: number = 1,
  age?: number
): { min: number; max: number; suggested: number } {
  // v2.9.30 T-06: Yaş bonusu
  let ageBonus = 1.0;
  if (age !== undefined) {
    if (age >= 24 && age <= 29) ageBonus = 1.15;
    else if (age < 22) ageBonus = 0.80;
    else if (age > 32) ageBonus = 0.85;
  }

  const baseSalary = overall * 950 * tierMultiplier * ageBonus;
  const inflated = applyInflation(baseSalary, seasonNumber);
  const clamped = Math.max(5000, Math.min(500_000, inflated));
  return {
    min: Math.round(clamped * 0.7),
    max: Math.round(clamped * 1.4),
    suggested: Math.round(clamped),
  };
}

// v2.9.73: inflateCurrentWage silindi — ölü kod (hiçbir yerden import edilmemişti).
// Sezon başı maaş yenileme özelliği eklenirse, calculateSalaryRange kullanılmalı.
