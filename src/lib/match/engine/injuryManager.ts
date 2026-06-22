/**
 * Injury Manager — Sakatlık Sistemi
 *
 * Sakatlık riski, sakatlık üretimi ve fizyoterapist iyileştirme hesaplamaları.
 * Maç motoru veya cron tarafından çağrılır; bu modül sadece hesaplama yapar.
 */

import type { Player } from './types';

// ═══════════════════════════════════════════════════════════════
// Sakatlık Riski Hesaplama
// ═══════════════════════════════════════════════════════════════

/**
 * Dayanıklılık (stamina) değerine göre sakatlık riski olasılığını hesaplar.
 *
 * @param stamina - Oyuncunun dayanıklılık değeri (0-100)
 * @returns Sakatlık olasılığı (0-1 arası)
 *
 * Yumuşak geçişli risk hesaplama (eski step fonksiyon yerine):
 * - stamina 70+ → %0 risk (tam sağlıklı)
 * - stamina 50-70 → doğrusal artış (%0-%15)
 * - stamina 30-50 → hızlı artış (%15-%40)
 * - stamina <30 → yüksek risk (%40-%60)
 */
export function calculateInjuryRisk(stamina: number): number {
  try {
    const s = Math.max(0, Math.min(100, stamina));

    // Yumuşak geçişli risk hesaplama (eski step fonksiyon yerine)
    if (s >= 70) return 0;
    if (s >= 50) return ((70 - s) / 20) * 0.15;  // 0-15%
    if (s >= 30) return 0.15 + ((50 - s) / 20) * 0.25;  // 15-40%
    return 0.40 + ((30 - s) / 30) * 0.20;  // 40-60%
  } catch {
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// Sakatlık Üretimi
// ═══════════════════════════════════════════════════════════════

export type InjurySeverity = 'light' | 'medium' | 'heavy';

export interface InjuryResult {
  severity: InjurySeverity;
  days: number;
}

/** Ağırlıklar: %50 hafif, %35 orta, %15 ağır */
const SEVERITY_WEIGHTS: { severity: InjurySeverity; weight: number; minDays: number; maxDays: number }[] = [
  { severity: 'light',  weight: 0.50, minDays: 1,  maxDays: 3 },
  { severity: 'medium', weight: 0.35, minDays: 4,  maxDays: 10 },
  { severity: 'heavy',  weight: 0.15, minDays: 15, maxDays: 28 },  // Ağır: 15-28 gün (eski 11-30 daraltıldı)
];

/**
 * Rastgele bir sakatlık üretir.
 *
 * @returns { severity, days } — Sakatlık şiddeti ve süre (gün)
 *
 * Dağılım:
 * - Hafif (%50): 1-3 gün
 * - Orta (%35): 4-10 gün
 * - Ağır (%15): 15-28 gün (eski 11-30 daraltıldı)
 */
export function generateInjury(): InjuryResult {
  try {
    const roll = Math.random();

    let cumulative = 0;
    for (const entry of SEVERITY_WEIGHTS) {
      cumulative += entry.weight;
      if (roll < cumulative) {
        const days = Math.floor(Math.random() * (entry.maxDays - entry.minDays + 1)) + entry.minDays;
        return { severity: entry.severity, days };
      }
    }

    // Fallback — hafif sakatlık
    return { severity: 'light', days: Math.floor(Math.random() * 3) + 1 };
  } catch {
    return { severity: 'light', days: 2 };
  }
}

// ═══════════════════════════════════════════════════════════════
// Fizyoterapist İyileştirme Hesaplama
// ═══════════════════════════════════════════════════════════════

/**
 * Yıldız seviyesine göre gün kısaltma tablosu
 */
const STAR_HEALING_MAP: Record<number, number> = {
  1: 2,
  2: 4,
  3: 8,
  4: 12,
  5: 16,
};

/**
 * Fizyoterapist kadrosunun toplam iyileştirme gücünü hesaplar.
 *
 * Her fizyoterapistin yıldız seviyesi sakatlık süresinden düşülecek gün sayısını belirler:
 * - 1 yıldız = 2 gün kısaltma
 * - 2 yıldız = 4 gün kısaltma
 * - 3 yıldız = 8 gün kısaltma
 * - 4 yıldız = 12 gün kısaltma
 * - 5 yıldız = 16 gün kısaltma
 *
 * @param physioStars - Fizyoterapistlerin yıldız seviyeleri dizisi (ör: [2, 3, 5])
 * @returns Toplam iyileştirme gücü (düşülecek gün sayısı)
 */
export function calculatePhysioHealing(physioStars: number[]): number {
  try {
    if (!physioStars || physioStars.length === 0) return 0;

    let totalHealing = 0;
    for (const stars of physioStars) {
      const clampedStars = Math.max(1, Math.min(5, Math.round(stars)));
      totalHealing += STAR_HEALING_MAP[clampedStars] || 0;
    }

    return totalHealing;
  } catch {
    return 0;
  }
}

/**
 * Sakatlık bitiş tarihinden iyileştirme gün sayısını düşer ve yeni tarihi hesaplar.
 *
 * @param injuryEndDate - Sakatlık bitiş tarihi (ISO string)
 * @param healingDays - Düşülecek gün sayısı
 * @returns Yeni sakatlık bitiş tarihi (ISO string) veya null (sakatlık bittiyse)
 */
export function applyHealingToDate(injuryEndDate: string, healingDays: number): string | null {
  try {
    const endDate = new Date(injuryEndDate);
    const newEndMs = endDate.getTime() - healingDays * 24 * 60 * 60 * 1000;
    const now = new Date();

    // Yeni bitiş tarihi geçmişse sakatlık sona erdi
    if (newEndMs <= now.getTime()) {
      return null;
    }

    return new Date(newEndMs).toISOString();
  } catch {
    return injuryEndDate;
  }
}

// ═══════════════════════════════════════════════════════════════
// Sakatlık Dönüşü — Form Düşüşü ve Toparlanma
// ═══════════════════════════════════════════════════════════════

/**
 * Sakatlıktan dönüşte form/sharpness düşüşünü uygular.
 *
 * Sakatlık süresine göre:
 * - 1-7 gün (kısa):  sharpness -10, confidence -5
 * - 8-28 gün (orta): sharpness -25, confidence -10
 * - 29+ gün (uzun):  sharpness -40, confidence -15
 *
 * Ayrıca returnFromInjuryDate ve isInjuryReturnPeriod flag'lerini set eder,
 * sakatlık verisini temizler.
 *
 * @param player - Sakatlıktan dönen oyuncu
 * @returns Güncellenmiş oyuncu objesi
 */
export function recoverFromInjury(player: Player): Player {
  const injuryDays = player.injury?.remaining_days ?? 0;

  // Sharpness düşüşü
  let sharpnessDrop: number;
  let confidenceDrop: number;

  if (injuryDays <= 7) {
    sharpnessDrop = 10;
    confidenceDrop = 5;
  } else if (injuryDays <= 28) {
    sharpnessDrop = 25;
    confidenceDrop = 10;
  } else {
    sharpnessDrop = 40;
    confidenceDrop = 15;
  }

  const currentSharpness = player.match_sharpness ?? 100;
  const currentConfidence = player.confidence ?? 50;

  return {
    ...player,
    match_sharpness: Math.max(0, currentSharpness - sharpnessDrop),
    confidence: Math.max(0, currentConfidence - confidenceDrop),
    returnFromInjuryDate: new Date().toISOString(),
    isInjuryReturnPeriod: true,
    // Sakatlık verisini temizle
    is_injured: false,
    injury: undefined,
    injury_end_date: undefined,
    injury_severity: null,
  };
}

/**
 * Maç başına form toparlanma güncellemesi.
 *
 * isInjuryReturnPeriod true ise:
 * - match_sharpness +5 artar (maç başına)
 * - confidence +3 artar (maç başına)
 * - match_sharpness, oyuncunun normal seviyesine (>= form veya >= 70) ulaştığında
 *   return period flag'leri temizlenir
 *
 * @param player - Maç oynayan oyuncu
 * @returns Güncellenmiş oyuncu objesi
 */
export function updateReturnToForm(player: Player): Player {
  if (!player.isInjuryReturnPeriod) {
    return player;
  }

  const currentSharpness = player.match_sharpness ?? 0;
  const currentConfidence = player.confidence ?? 50;
  const targetSharpness = Math.max(player.form ?? 70, 70);

  const newSharpness = Math.min(100, currentSharpness + 5);
  const newConfidence = Math.min(100, currentConfidence + 3);

  // Hedef sharpness'e ulaştıysa return period'u sonlandır
  if (newSharpness >= targetSharpness) {
    return {
      ...player,
      match_sharpness: newSharpness,
      confidence: newConfidence,
      isInjuryReturnPeriod: false,
      returnFromInjuryDate: null,
    };
  }

  return {
    ...player,
    match_sharpness: newSharpness,
    confidence: newConfidence,
  };
}
