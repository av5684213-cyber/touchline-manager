// =============================================================================
// Position Effectiveness — Pozisyon etkinlik puanı hesaplama motoru
// =============================================================================
// Bir oyuncunun belirli bir spesifik pozisyonda ne kadar etkili olduğunu
// positionWeights.ts'deki ağırlık haritasını kullanarak hesaplar.
//
// Kullanım:
//   const eff = getPositionEffectiveness(player, 'CDM');
//   const effectiveRating = player.rating * (0.7 + 0.3 * eff);
//
// Cache: Her maç öncesi hesaplanan etkinlik puanları cache'lenir,
// maç sırasında tekrar hesaplama yapmaz.
// =============================================================================

import type { Player } from './types';
import { POSITION_WEIGHTS, getPositionContributions } from './positionWeights';

// ─── Etkinlik puanı cache'i ──────────────────────────────────────────────────
const effectivenessCache = new Map<string, number>();

function cacheKey(playerId: string, position: string): string {
  return `${playerId}:${position}`;
}

/**
 * Tüm cache'i temizler (yeni maç başlangıcında çağrılır)
 */
export function clearEffectivenessCache(): void {
  effectivenessCache.clear();
}

// ─── Ana hesaplama fonksiyonu ────────────────────────────────────────────────

/**
 * Bir oyuncunun belirli bir spesifik pozisyondaki etkinlik puanını hesaplar.
 *
 * @param player - Oyuncu objesi (Player tipinde)
 * @param targetPosition - Hedef spesifik pozisyon (CB, CDM, CAM, ST vb.)
 * @returns 0.0–1.0 arası normalize etkinlik puanı
 *
 * Hesaplama mantığı:
 * 1. Pozisyonun yetenek ağırlıklarını al
 * 2. Her yetenek için: oyuncuDeğeri × ağırlık → ağırlıklı toplam
 * 3. Ağırlıklı toplam / ağırlık toplamı → ham puan
 * 4. 0–100 arası ham puanı 0.0–1.0 arası normalize et
 *
 * Fallback: Pozisyon ağırlığı bulunamazsa rating/100 kullanılır
 */
export function getPositionEffectiveness(player: Player, targetPosition: string): number {
  // Cache kontrolü
  const key = cacheKey(player.id, targetPosition);
  const cached = effectivenessCache.get(key);
  if (cached !== undefined) return cached;

  const weightProfile = POSITION_WEIGHTS[targetPosition];

  // Fallback: Ağırlık profili yoksa rating bazlı etkinlik
  if (!weightProfile) {
    const fallback = (player.rating || 50) / 100;
    effectivenessCache.set(key, fallback);
    return fallback;
  }

  const weights = weightProfile.weights;
  let weightedSum = 0;
  let weightSum = 0;

  for (const [attr, weight] of Object.entries(weights)) {
    if (weight <= 0) continue;

    // Oyuncunun o yeteneğini al (dynamic property access)
    const playerValue = getPlayerAttribute(player, attr);

    weightedSum += playerValue * weight;
    weightSum += weight;
  }

  // Normalize: 0–100 → 0.0–1.0
  const effectiveness = weightSum > 0
    ? (weightedSum / weightSum) / 100
    : (player.rating || 50) / 100;

  // 0.0–1.0 arasına sıkıştır
  const clampedEffectiveness = Math.max(0, Math.min(1, effectiveness));

  effectivenessCache.set(key, clampedEffectiveness);
  return clampedEffectiveness;
}

/**
 * Bir oyuncunun kendi spesifik pozisyonundaki etkinlik puanını hesaplar.
 * Eğer specificPosition tanımlı değilse, geniş grup bazlı fallback yapar.
 */
export function getNativePositionEffectiveness(player: Player): number {
  const targetPos = player.specificPosition || positionToSpecificFallback(player.position);
  return getPositionEffectiveness(player, targetPos);
}

/**
 * Bir oyuncunun alternatif (yan) pozisyonundaki etkinlik puanını hesaplar.
 * Yan mevki oyuncusu, doğal mevkisinde oynamıyorsa %15 penalty alır.
 */
export function getSecondaryPositionEffectiveness(
  player: Player,
  targetPosition: string
): number {
  const isNative = player.specificPosition === targetPosition;
  const isSecondary = player.secondaryPositions?.includes(targetPosition as any) ?? false;

  if (isNative) {
    return getPositionEffectiveness(player, targetPosition);
  }

  if (isSecondary) {
    // Yan mevki penalty'si: doğal mevkinin %85'i
    return getPositionEffectiveness(player, targetPosition) * 0.85;
  }

  // Uyumsuz pozisyon: ciddi penalty (%50)
  return getPositionEffectiveness(player, targetPosition) * 0.5;
}

// ─── Etkinlik bazlı rating hesaplama ─────────────────────────────────────────

/**
 * Oyuncunun mevkisindeki etkinlik puanını rating ile birleştirir.
 * Sonuç: effectiveRating = rating × (0.7 + 0.3 × effectiveness)
 *
 * - effectiveness = 1.0 (mükemmel uyum) → rating × 1.0 (değişiklik yok)
 * - effectiveness = 0.75 (iyi uyum)     → rating × 0.925 (%7.5 düşüş)
 * - effectiveness = 0.5 (zayıf uyum)    → rating × 0.85 (%15 düşüş)
 * - effectiveness = 0.0 (hiç uyum yok)  → rating × 0.7 (%30 düşüş)
 */
export function getEffectiveRating(player: Player, targetPosition?: string): number {
  const pos = targetPosition || player.specificPosition || positionToSpecificFallback(player.position);
  const effectiveness = getPositionEffectiveness(player, pos);
  const baseRating = player.rating || 50;
  return baseRating * (0.7 + 0.3 * effectiveness);
}

// ─── Takım güç hesaplama yardımcıları ────────────────────────────────────────

/**
 * Bir grup oyuncunun pozisyon bazlı etkinlik puanlarına göre ağırlıklı
 * ortalama gücünü hesaplar. calculateTeamStrength'de kullanılır.
 *
 * Her oyuncu için:
 * 1. effectiveRating hesapla
 * 2. Morale/form/cond modları uygula
 * 3. Ağırlıklı ortalama al
 */
export function calculatePositionWeightedStrength(
  players: Player[],
  ...attrs: string[]
): number {
  if (players.length === 0) return 0;

  return players.reduce((sum, p) => {
    const effectiveRating = getEffectiveRating(p);

    // İstenen niteliklerin ortalaması
    let attrSum = 0;
    for (const a of attrs) {
      attrSum += getPlayerAttribute(p, a);
    }
    const avgAttr = attrs.length > 0 ? attrSum / attrs.length : effectiveRating;

    // Moral/form/kondisyon modları
    const moraleMod = 0.85 + (p.morale / 100) * 0.3;
    const formMod = 0.85 + (p.form / 100) * 0.3;
    const condMod = 0.85 + (p.cond / 100) * 0.3;

    // effectiveRating ile nitelik ortalamasını harmanla
    // Eğer özel nitelikler verilmişse %60 nitelik + %40 effectiveRating
    // Verilmemişse tamamen effectiveRating
    const blended = attrs.length > 0
      ? avgAttr * 0.6 + effectiveRating * 0.4
      : effectiveRating;

    return sum + blended * moraleMod * formMod * condMod;
  }, 0) / players.length;
}

/**
 * Bir takımın pozisyon bazlı katkı oranlarına göre toplam gücünü hesaplar.
 *
 * Her spesifik pozisyon savunma/hücum/orta saha katkı oranına sahiptir.
 * Bu fonksiyon tüm oyuncuların etkinlik puanlarını ve katkı oranlarını
 * kullanarak toplam savunma/hücum/orta saha gücünü hesaplar.
 */
export function calculatePositionalTeamStrength(players: Player[]): {
  defense: number;
  attack: number;
  midfield: number;
  gk: number;
} {
  let defense = 0;
  let attack = 0;
  let midfield = 0;
  let gk = 0;
  let defCount = 0;
  let atkCount = 0;
  let midCount = 0;
  let gkCount = 0;

  for (const p of players) {
    const effectiveRating = getEffectiveRating(p);
    const pos = p.specificPosition || positionToSpecificFallback(p.position);
    const contributions = getPositionContributions(pos);

    // Moral/form/kondisyon modları
    const moraleMod = 0.85 + (p.morale / 100) * 0.3;
    const formMod = 0.85 + (p.form / 100) * 0.3;
    const condMod = 0.85 + (p.cond / 100) * 0.3;
    const mod = moraleMod * formMod * condMod;

    const modRating = effectiveRating * mod;

    if (contributions.defensive > 0.5) {
      defense += modRating * contributions.defensive;
      defCount++;
    }
    if (contributions.attacking > 0.5) {
      attack += modRating * contributions.attacking;
      atkCount++;
    }
    if (contributions.midfield > 0.3) {
      midfield += modRating * contributions.midfield;
      midCount++;
    }
    if (p.position === 'GK') {
      gk += modRating;
      gkCount++;
    }
  }

  return {
    defense: defCount > 0 ? defense / defCount : 0,
    attack: atkCount > 0 ? attack / atkCount : 0,
    midfield: midCount > 0 ? midfield / midCount : 0,
    gk: gkCount > 0 ? gk / gkCount : 0,
  };
}

// ─── Yardımcı fonksiyonlar ───────────────────────────────────────────────────

/**
 * Player objesinden dinamik olarak nitelik değerini alır.
 * Eğer nitelik tanımlı değilse veya sayı değilse fallback döner.
 */
function getPlayerAttribute(player: Player, attr: string, fallback = 50): number {
  const val = (player as unknown as Record<string, unknown>)[attr];
  return typeof val === 'number' ? val : fallback;
}

/**
 * Geniş pozisyon grubunu spesifik pozisyona dönüştürür (fallback).
 * specificPosition tanımlı olmadığında kullanılır.
 */
function positionToSpecificFallback(position: string): string {
  const fallbackMap: Record<string, string> = {
    GK: 'GK',
    DEF: 'CB',
    MID: 'CM',
    FWD: 'ST',
  };
  return fallbackMap[position] || 'CM';
}
