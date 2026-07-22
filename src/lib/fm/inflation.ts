/**
 * Enflasyon Sistemi
 * ═══════════════════════════════════════════════════════
 *
 * Sezonlar geçtikçe oyundaki tüm fiyatları artırır.
 * Amaç: Sezon 1'de 1M'a alınan oyuncu Sezon 5'te 1.5-2M'a çıkmış olsun.
 * Bütçe de buna göre sezon başında artmalı.
 *
 * ETKİLER:
 *   ✓ Oyuncu piyasa değeri (valuation.ts)
 *   ✓ Oyuncu maaş talebi (salaryUtils.ts)
 *   ✓ Sezon başı kulüp bütçesi (season-end cron)
 *   ✓ Tesis yükseltme maliyeti
 *
 * ETKİLEMEZ:
 *   ✗ Bilet fiyatları (oyuncu manuel belirler)
 *   ✗ Sponsor gelirleri (sabit anlaşma)
 *   ✗ Günlük görev ödülleri (yeni oyuncu avantajı)
 *   ✗ Kredi fiyatları (premium para birimi)
 */

import {
  BASE_INFLATION_RATE,
  MAX_INFLATION_MULTIPLIER,
  MIN_INFLATION_MULTIPLIER,
  TIER_BASE_BUDGETS,
} from "../match/engine/constants";

/**
 * Sezon numarasına göre enflasyon çarpanı.
 *
 * Formül: min(1.0 + (seasonNumber - 1) * BASE_INFLATION_RATE, MAX_INFLATION_MULTIPLIER)
 *
 * Sezon 1  → 1.00x
 * Sezon 2  → 1.08x
 * Sezon 5  → 1.32x
 * Sezon 10 → 1.72x
 * Sezon 25 → 2.92x (≈ tavan)
 * Sezon 26+ → 3.00x (tavan)
 */
export function getInflationMultiplier(seasonNumber: number): number {
  if (seasonNumber <= 1) return MIN_INFLATION_MULTIPLIER;
  const multiplier = 1.0 + (seasonNumber - 1) * BASE_INFLATION_RATE;
  return Math.min(multiplier, MAX_INFLATION_MULTIPLIER);
}

/**
 * Baz miktara enflasyon uygula.
 * Kullanım: piyasa değeri, maaş, tesis maliyeti hesaplamasında.
 */
export function applyInflation(baseAmount: number, seasonNumber: number): number {
  return Math.round(baseAmount * getInflationMultiplier(seasonNumber));
}

/**
 * Enflasyonlu miktarı Sezon 1 değerine normalize et.
 * Kullanım: karşılaştırma veya "baz değer" gösterimi için.
 */
export function removeInflation(inflatedAmount: number, seasonNumber: number): number {
  const mult = getInflationMultiplier(seasonNumber);
  if (mult === 0) return inflatedAmount;
  return Math.round(inflatedAmount / mult);
}

/**
 * Enflasyon etiketi — UI'de gösterim için.
 * Örn: "Baz fiyat (Sezon 1)" veya "+%32 enflasyon (Sezon 5)"
 */
export function formatInflationLabel(seasonNumber: number): string {
  const mult = getInflationMultiplier(seasonNumber);
  if (mult === 1.0) return "Baz fiyat (Sezon 1)";
  return `+%${Math.round((mult - 1) * 100)} enflasyon (Sezon ${seasonNumber})`;
}

/**
 * Sezon başı kulüp bütçesi — lig tier'ına göre baz × enflasyon.
 */
export function getSeasonBudget(tier: number, seasonNumber: number): number {
  const baseBudget = TIER_BASE_BUDGETS[tier] ?? TIER_BASE_BUDGETS[2];
  return applyInflation(baseBudget, seasonNumber);
}
