import type { Player } from "@/lib/mock/data";

/**
 * Tek kaynak piyasa değeri hesaplama — tüm uygulama bunu kullanır.
 *
 * Eski tutarsız formüller:
 *  - data.ts: ovr × rand(80K, 180K) → rating 70 için 5.6M-12.6M
 *  - transfer.ts serbest: ovr × 100K × ageMult → rating 70 için 7M
 *  - transfer.ts takımsız: ovr × 80K → rating 70 için 5.6M
 *
 * Yeni tek formül:
 *  - Base = rating² × 8000 (rating 80 → 51M, 70 → 39M, 60 → 29M)
 *  - Yaş çarpanı: ≤23 → 1.30, ≤27 → 1.15, ≤30 → 1.00, ≤33 → 0.75, 34+ → 0.50
 *  - Potansiyel bonusu: (potential - rating) × 200K
 *  - Arketip çarpanı: 0.95 - 1.30 (Gol Makinesi ×1.30, Defansif Bek ×0.95)
 *  - Pozisyon çarpanı: ST ×1.25, GK ×1.10, CB ×0.90
 *  - Kondisyon cezası: <50 → -%15
 *  - Moral bonusu: >80 → +%5
 *
 * Min 50K, max 200M
 */

// Arketip çarpanları
const ARCHETYPE_MULTIPLIERS: Record<string, number> = {
  "Refleks Canavarı": 1.20, "Güvenli Eller": 1.00, "Süpürücü Kaleci": 1.10,
  "Penaltı Uzmanı": 0.95, "Büyük Maç Kalecisi": 1.15,
  "Duvar": 1.15, "Lider Stoper": 1.20, "Top Çıkan Stoper": 1.10,
  "Hava Hakimi": 1.05, "Baskı Ustası": 1.00, "Kale Gibi": 1.05,
  "Kanat Beki": 1.10, "Hücumcu Bek": 1.15, "Defansif Bek": 0.95,
  "Ters Bek": 1.20, "Ofansif Bek": 1.15,
  "Yıkıcı": 1.05, "Regista": 1.20, "Ekran Oyuncusu": 1.00, "Duvar Orta Saha": 0.95,
  "Motor": 1.10, "Truva Atı": 1.05, "Pas Ustası": 1.15, "Box-to-Box": 1.20,
  "Tempo Kontrolcüsü": 1.10,
  "Playmaker": 1.25, "Numara 10": 1.20, "Yaratıcı": 1.20, "Oyun Kurucu": 1.20,
  "Kanat": 1.05, "İçeri Dönen": 1.15, "Hızlı Kanat": 1.20, "Dripling Ustası": 1.20,
  "Gol Makinesi": 1.30, "Bitirici": 1.25, "Hedef Adam": 1.10,
  "Fırsatçı": 1.10, "Hızlı Forvet": 1.20,
  "İkinci Forvet": 1.10, "Yaratıcı Forvet": 1.15,
};

const POSITION_VALUE_WEIGHT: Record<string, number> = {
  GK: 1.10,
  CB: 0.90, LB: 0.95, RB: 0.95, LWB: 0.90, RWB: 0.90,
  CDM: 1.00, CM: 1.00, CAM: 1.15,
  LM: 0.95, RM: 0.95, LW: 1.10, RW: 1.10,
  ST: 1.25, CF: 1.15,
};

export function calculatePlayerValue(player: Player): number {
  const rating = player.rating ?? 50;
  const potential = player.potential ?? rating;
  const age = player.age ?? 25;
  const archetype = player.archetype ?? "";
  const pos = player.specificPosition ?? "CM";
  const cond = player.cond ?? 100;
  const morale = player.morale ?? 70;

  const base = Math.pow(rating, 2) * 8000;

  let ageMult: number;
  if (age <= 23) ageMult = 1.30;
  else if (age <= 27) ageMult = 1.15;
  else if (age <= 30) ageMult = 1.00;
  else if (age <= 33) ageMult = 0.75;
  else ageMult = 0.50;

  const potentialBonus = Math.max(0, potential - rating) * 200_000;
  const archMult = ARCHETYPE_MULTIPLIERS[archetype] ?? 1.00;
  const posMult = POSITION_VALUE_WEIGHT[pos] ?? 1.00;
  const condMult = cond < 50 ? 0.85 : 1.00;
  const moraleMult = morale > 80 ? 1.05 : 1.00;

  const value = Math.round(
    (base + potentialBonus) * ageMult * archMult * posMult * condMult * moraleMult
  );

  return Math.max(50_000, Math.min(200_000_000, value));
}

/**
 * Maaş hesaplama — tek kaynak.
 * rating × 950 × tier_multiplier (1. Lig: 1.5, 2. Lig: 1.2, 3. Lig: 1.0, 4. Lig: 0.8)
 * Min 5K, max 500K/hafta
 */
export function calculateWeeklyWage(player: Player, leagueTier: number = 2): number {
  const rating = player.rating ?? 50;
  const age = player.age ?? 25;

  const tierMult: Record<number, number> = {
    1: 1.5, 2: 1.2, 3: 1.0, 4: 0.8,
  };
  const mult = tierMult[leagueTier] ?? 1.0;

  // Yaş bonusu — prime yaş (24-29) daha yüksek maaş
  let ageBonus = 1.0;
  if (age >= 24 && age <= 29) ageBonus = 1.15;
  else if (age < 22) ageBonus = 0.80; // genç oyuncular daha az
  else if (age > 32) ageBonus = 0.85;

  const wage = Math.round(rating * 950 * mult * ageBonus);
  return Math.max(5000, Math.min(500_000, wage));
}

/**
 * Transfer vergisi — tek kaynak.
 * Satıcıdan %2.5, alıcıya %5 agent + %3 imza bonusu
 */
export const TRANSFER_TAX_RATE = 0.025;
export const AGENT_FEE_RATE = 0.05;
export const SIGNING_BONUS_RATE = 0.03;

export function calculateBuyerCost(askingPrice: number) {
  const agentFee = Math.round(askingPrice * AGENT_FEE_RATE);
  const signingBonus = Math.round(askingPrice * SIGNING_BONUS_RATE);
  const total = askingPrice + agentFee + signingBonus;
  return { transferFee: askingPrice, agentFee, signingBonus, total };
}

export function calculateSellerNet(salePrice: number) {
  const tax = Math.round(salePrice * TRANSFER_TAX_RATE);
  return { salePrice, tax, net: salePrice - tax };
}
