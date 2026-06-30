/**
 * Oyuncu Piyasa Değeri Hesaplama
 * ═══════════════════════════════════════════════════════
 *
 * Baz değer: yaş, overall, form, trait bonuslarından hesaplanır.
 * Enflasyon: sezon numarasına göre çarpan uygulanır.
 *
 * Kullanım:
 *   const value = calculateMarketValue(player, seasonNumber);
 */

import type { Player } from "../mock/data";
import { getInflationMultiplier, applyInflation } from "./inflation";

/**
 * Sezon 1 baz piyasa değeri — enflasyonsuz.
 *
 * Formül:
 *   base = overall * 100_000
 *   yaş çarpanı: 17-23 arası potansiyel prim (1.2x), 30+ yaşta düşüş
 *   form çarpanı: form 80+ → 1.15x, form 60- → 0.85x
 *   trait bonusu: her pozitif trait +5%, her negatif trait -3%
 */
export function calculateBaseMarketValue(player: Player): number {
  const ovr = player.rating;
  let value = ovr * 100_000;

  // Yaş çarpanı
  const age = player.age;
  if (age <= 23) {
    value = Math.round(value * 1.20); // potansiyel prim
  } else if (age >= 31) {
    value = Math.round(value * 0.75); // yaş düşüşü
  } else if (age >= 28) {
    value = Math.round(value * 0.90);
  }

  // Form çarpanı
  const form = player.form ?? 70;
  if (form >= 80) value = Math.round(value * 1.15);
  else if (form < 60) value = Math.round(value * 0.85);

  // Trait bonusu
  const posTraits = player.traits?.length ?? 0;
  const negTraits = player.negTraits?.length ?? 0;
  value = Math.round(value * (1 + posTraits * 0.05 - negTraits * 0.03));

  // Sakatlık cezası
  if (player.is_injured) {
    value = Math.round(value * 0.80);
  }

  return Math.max(10_000, value); // min 10K
}

/**
 * Enflasyonlu piyasa değeri.
 * Bu fonksiyon transfer pazarında ve UI'de kullanılır.
 */
export function calculateMarketValue(player: Player, seasonNumber: number = 1): number {
  const baseValue = calculateBaseMarketValue(player);
  return applyInflation(baseValue, seasonNumber);
}

/**
 * Enflasyonsuz baz değer — karşılaştırma veya tooltip için.
 */
export function calculateBaseMarketValueOnly(player: Player): number {
  return calculateBaseMarketValue(player);
}

/**
 * Belirli bir sezon için enflasyon çarpanını döndür (alias).
 */
export function getMarketInflationMultiplier(seasonNumber: number): number {
  return getInflationMultiplier(seasonNumber);
}
