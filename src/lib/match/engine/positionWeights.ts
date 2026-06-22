// =============================================================================
// Position Weights — Spesifik mevki bazlı yetenek ağırlıkları
// =============================================================================
// Her spesifik pozisyon (CB, CDM, CAM, ST vb.) için hangi yeteneklerin
// daha önemli olduğunu tanımlar. Maç motoru bu ağırlıkları kullanarak
// oyuncuların mevkilerindeki etkinlik puanını hesaplar.
//
// Ağırlık değerleri 0.0–1.0 arasındadır:
//   1.0 = en kritik yetenek (pozisyonun tanımlayıcı özelliği)
//   0.7–0.9 = çok önemli
//   0.4–0.6 = orta önem
//   0.1–0.3 = az önemli
//   0.0 = irrelevant
// =============================================================================

import type { SpecificPosition } from './types';

export interface PositionWeightProfile {
  /** Pozisyonun Türkçe adı (gösterim için) */
  label: string;
  /** Yetenek → ağırlık haritası (0.0–1.0) */
  weights: Record<string, number>;
  /** Bu pozisyonun savunma katkı oranı (0–1) */
  defensiveContribution: number;
  /** Bu pozisyonun hücum katkı oranı (0–1) */
  attackingContribution: number;
  /** Bu pozisyonun orta saha kontrol katkı oranı (0–1) */
  midfieldContribution: number;
}

// ─── Kaleci ──────────────────────────────────────────────────────────────────
const GK_WEIGHTS: PositionWeightProfile = {
  label: 'Kaleci',
  weights: {
    goalkeeping: 1.0,
    positioning: 0.8,
    composure: 0.7,
    concentration: 0.7,
    jumping: 0.6,
    bravery: 0.6,
    agility: 0.6,
    reflexes: 0.9,
    strength: 0.4,
    anticipation: 0.5,
    decisions: 0.5,
    balance: 0.4,
    speed: 0.2,
    passing: 0.2,
  },
  defensiveContribution: 1.0,
  attackingContribution: 0.0,
  midfieldContribution: 0.0,
};

// ─── Defans ──────────────────────────────────────────────────────────────────
const CB_WEIGHTS: PositionWeightProfile = {
  label: 'Merkez Defans',
  weights: {
    tackling: 1.0,
    marking: 0.9,
    heading: 0.8,
    positioning: 0.8,
    anticipation: 0.7,
    strength: 0.7,
    concentration: 0.7,
    composure: 0.6,
    jumping: 0.6,
    aggression: 0.5,
    bravery: 0.5,
    decisions: 0.5,
    passing: 0.4,
    speed: 0.4,
    workRate: 0.3,
  },
  defensiveContribution: 0.95,
  attackingContribution: 0.05,
  midfieldContribution: 0.1,
};

const LB_WEIGHTS: PositionWeightProfile = {
  label: 'Sol Bek',
  weights: {
    speed: 0.9,
    stamina: 0.8,
    crossing: 0.8,
    tackling: 0.7,
    positioning: 0.7,
    workRate: 0.7,
    acceleration: 0.7,
    marking: 0.6,
    agility: 0.6,
    dribbling: 0.5,
    passing: 0.5,
    anticipation: 0.5,
    teamwork: 0.5,
    strength: 0.3,
    heading: 0.3,
  },
  defensiveContribution: 0.65,
  attackingContribution: 0.25,
  midfieldContribution: 0.2,
};

const RB_WEIGHTS: PositionWeightProfile = {
  label: 'Sağ Bek',
  weights: {
    speed: 0.9,
    stamina: 0.8,
    crossing: 0.8,
    tackling: 0.7,
    positioning: 0.7,
    workRate: 0.7,
    acceleration: 0.7,
    marking: 0.6,
    agility: 0.6,
    dribbling: 0.5,
    passing: 0.5,
    anticipation: 0.5,
    teamwork: 0.5,
    strength: 0.3,
    heading: 0.3,
  },
  defensiveContribution: 0.65,
  attackingContribution: 0.25,
  midfieldContribution: 0.2,
};

const LWB_WEIGHTS: PositionWeightProfile = {
  label: 'Sol Kanat Bek',
  weights: {
    speed: 0.9,
    crossing: 0.9,
    stamina: 0.85,
    dribbling: 0.7,
    acceleration: 0.8,
    workRate: 0.8,
    tackling: 0.5,
    passing: 0.6,
    agility: 0.6,
    firstTouch: 0.5,
    positioning: 0.5,
    marking: 0.4,
    teamwork: 0.5,
    strength: 0.2,
    heading: 0.2,
  },
  defensiveContribution: 0.45,
  attackingContribution: 0.4,
  midfieldContribution: 0.3,
};

const RWB_WEIGHTS: PositionWeightProfile = {
  label: 'Sağ Kanat Bek',
  weights: {
    speed: 0.9,
    crossing: 0.9,
    stamina: 0.85,
    dribbling: 0.7,
    acceleration: 0.8,
    workRate: 0.8,
    tackling: 0.5,
    passing: 0.6,
    agility: 0.6,
    firstTouch: 0.5,
    positioning: 0.5,
    marking: 0.4,
    teamwork: 0.5,
    strength: 0.2,
    heading: 0.2,
  },
  defensiveContribution: 0.45,
  attackingContribution: 0.4,
  midfieldContribution: 0.3,
};

// ─── Orta Saha ───────────────────────────────────────────────────────────────
const CDM_WEIGHTS: PositionWeightProfile = {
  label: 'Defansif Orta Saha',
  weights: {
    tackling: 0.9,
    positioning: 0.85,
    anticipation: 0.8,
    stamina: 0.8,
    passing: 0.7,
    workRate: 0.8,
    marking: 0.7,
    concentration: 0.7,
    decisions: 0.7,
    composure: 0.6,
    strength: 0.6,
    aggression: 0.5,
    vision: 0.5,
    teamwork: 0.6,
    heading: 0.4,
  },
  defensiveContribution: 0.7,
  attackingContribution: 0.1,
  midfieldContribution: 0.6,
};

const CM_WEIGHTS: PositionWeightProfile = {
  label: 'Merkez Orta Saha',
  weights: {
    passing: 0.9,
    vision: 0.8,
    stamina: 0.8,
    technique: 0.7,
    workRate: 0.7,
    decisions: 0.7,
    firstTouch: 0.7,
    tackling: 0.6,
    composure: 0.6,
    teamwork: 0.6,
    longShots: 0.5,
    positioning: 0.5,
    strength: 0.4,
    dribbling: 0.4,
    anticipation: 0.5,
  },
  defensiveContribution: 0.3,
  attackingContribution: 0.3,
  midfieldContribution: 0.8,
};

const CAM_WEIGHTS: PositionWeightProfile = {
  label: 'Ofansif Orta Saha',
  weights: {
    passing: 1.0,
    vision: 0.9,
    dribbling: 0.7,
    technique: 0.7,
    firstTouch: 0.7,
    shooting: 0.7,
    flair: 0.7,
    longShots: 0.6,
    composure: 0.6,
    offTheBall: 0.6,
    decisions: 0.5,
    creativity: 0.7,
    finishing: 0.5,
    agility: 0.5,
    strength: 0.2,
  },
  defensiveContribution: 0.05,
  attackingContribution: 0.65,
  midfieldContribution: 0.5,
};

const LM_WEIGHTS: PositionWeightProfile = {
  label: 'Sol Açık',
  weights: {
    crossing: 0.9,
    dribbling: 0.8,
    speed: 0.8,
    stamina: 0.7,
    acceleration: 0.7,
    firstTouch: 0.6,
    passing: 0.6,
    technique: 0.6,
    agility: 0.6,
    workRate: 0.5,
    vision: 0.5,
    finishing: 0.4,
    longShots: 0.4,
    strength: 0.2,
    tackling: 0.2,
  },
  defensiveContribution: 0.1,
  attackingContribution: 0.55,
  midfieldContribution: 0.5,
};

const RM_WEIGHTS: PositionWeightProfile = {
  label: 'Sağ Açık',
  weights: {
    crossing: 0.9,
    dribbling: 0.8,
    speed: 0.8,
    stamina: 0.7,
    acceleration: 0.7,
    firstTouch: 0.6,
    passing: 0.6,
    technique: 0.6,
    agility: 0.6,
    workRate: 0.5,
    vision: 0.5,
    finishing: 0.4,
    longShots: 0.4,
    strength: 0.2,
    tackling: 0.2,
  },
  defensiveContribution: 0.1,
  attackingContribution: 0.55,
  midfieldContribution: 0.5,
};

const LW_WEIGHTS: PositionWeightProfile = {
  label: 'Sol Kanat',
  weights: {
    dribbling: 0.9,
    speed: 0.9,
    crossing: 0.8,
    acceleration: 0.85,
    agility: 0.7,
    finishing: 0.6,
    firstTouch: 0.7,
    technique: 0.6,
    flair: 0.6,
    shooting: 0.6,
    offTheBall: 0.5,
    longShots: 0.5,
    vision: 0.4,
    strength: 0.2,
    tackling: 0.1,
  },
  defensiveContribution: 0.05,
  attackingContribution: 0.7,
  midfieldContribution: 0.35,
};

const RW_WEIGHTS: PositionWeightProfile = {
  label: 'Sağ Kanat',
  weights: {
    dribbling: 0.9,
    speed: 0.9,
    crossing: 0.8,
    acceleration: 0.85,
    agility: 0.7,
    finishing: 0.6,
    firstTouch: 0.7,
    technique: 0.6,
    flair: 0.6,
    shooting: 0.6,
    offTheBall: 0.5,
    longShots: 0.5,
    vision: 0.4,
    strength: 0.2,
    tackling: 0.1,
  },
  defensiveContribution: 0.05,
  attackingContribution: 0.7,
  midfieldContribution: 0.35,
};

// ─── Forvet ──────────────────────────────────────────────────────────────────
const ST_WEIGHTS: PositionWeightProfile = {
  label: 'Santrfor',
  weights: {
    finishing: 1.0,
    shooting: 0.9,
    heading: 0.7,
    offTheBall: 0.7,
    speed: 0.7,
    composure: 0.7,
    strength: 0.6,
    acceleration: 0.6,
    jumping: 0.5,
    aggression: 0.5,
    determination: 0.5,
    technique: 0.4,
    positioning: 0.5,
    firstTouch: 0.5,
    passing: 0.3,
  },
  defensiveContribution: 0.0,
  attackingContribution: 0.95,
  midfieldContribution: 0.05,
};

const CF_WEIGHTS: PositionWeightProfile = {
  label: 'Göbek Forvet',
  weights: {
    finishing: 0.8,
    passing: 0.7,
    vision: 0.7,
    dribbling: 0.7,
    technique: 0.7,
    shooting: 0.7,
    firstTouch: 0.7,
    composure: 0.6,
    offTheBall: 0.6,
    flair: 0.5,
    longShots: 0.5,
    decisions: 0.5,
    heading: 0.4,
    strength: 0.4,
    speed: 0.4,
  },
  defensiveContribution: 0.0,
  attackingContribution: 0.8,
  midfieldContribution: 0.15,
};

// ─── Master Map ──────────────────────────────────────────────────────────────
export const POSITION_WEIGHTS: Record<string, PositionWeightProfile> = {
  GK: GK_WEIGHTS,
  CB: CB_WEIGHTS,
  LB: LB_WEIGHTS,
  RB: RB_WEIGHTS,
  LWB: LWB_WEIGHTS,
  RWB: RWB_WEIGHTS,
  CDM: CDM_WEIGHTS,
  CM: CM_WEIGHTS,
  CAM: CAM_WEIGHTS,
  LM: LM_WEIGHTS,
  RM: RM_WEIGHTS,
  LW: LW_WEIGHTS,
  RW: RW_WEIGHTS,
  ST: ST_WEIGHTS,
  CF: CF_WEIGHTS,
};

/**
 * Sadece ağırlık değerlerini döndürür (hızlı erişim için)
 * Format: { attributeName: weight, ... }
 */
export function getPositionWeights(position: string): Record<string, number> {
  const profile = POSITION_WEIGHTS[position];
  return profile?.weights ?? {};
}

/**
 * Bir pozisyonun savunma/hücum/orta saha katkı oranlarını döndürür
 */
export function getPositionContributions(position: string): {
  defensive: number;
  attacking: number;
  midfield: number;
} {
  const profile = POSITION_WEIGHTS[position];
  return {
    defensive: profile?.defensiveContribution ?? 0.33,
    attacking: profile?.attackingContribution ?? 0.33,
    midfield: profile?.midfieldContribution ?? 0.33,
  };
}

/**
 * Tüm ağırlık profillerinin listesini döndürür (UI gösterim için)
 */
export function getAllPositionProfiles(): Array<{
  position: string;
  label: string;
  weights: Record<string, number>;
  defensiveContribution: number;
  attackingContribution: number;
  midfieldContribution: number;
}> {
  return Object.entries(POSITION_WEIGHTS).map(([pos, profile]) => ({
    position: pos,
    label: profile.label,
    weights: profile.weights,
    defensiveContribution: profile.defensiveContribution,
    attackingContribution: profile.attackingContribution,
    midfieldContribution: profile.midfieldContribution,
  }));
}
