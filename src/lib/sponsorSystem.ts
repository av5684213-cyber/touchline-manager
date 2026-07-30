// ADDED: sponsorSystem.ts — Dinamik sponsor sistemi
// v2.9.48: Lig tier + takım OVR + takım değeri bazlı, otomatik sponsor teklifleri
// Kalitesi düşük takımdan yüksek takıma doğru sponsorluk ücretleri yükselir

export type SponsorTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export type Sponsor = {
  id: string;
  name: string;
  amount: number; // haftalık gelir
  tier: SponsorTier;
  durationWeeks: number; // sözleşme süresi (hafta)
  startDate: number; // timestamp
  endDate: number; // timestamp
  isActive: boolean;
};

// Sponsor isim havuzu (kurgusal)
const SPONSOR_NAMES = [
  { name: "Anadolu Teknoloji", tier: "BRONZE" as SponsorTier },
  { name: "Marmara Sigorta", tier: "BRONZE" as SponsorTier },
  { name: "Ege Lojistik", tier: "BRONZE" as SponsorTier },
  { name: "Boğaz Enerji", tier: "SILVER" as SponsorTier },
  { name: "Yıldız Otomotiv", tier: "SILVER" as SponsorTier },
  { name: "Karadeniz Gıda", tier: "SILVER" as SponsorTier },
  { name: "İstanbul Havayolları", tier: "GOLD" as SponsorTier },
  { name: "Anadolu Bank", tier: "GOLD" as SponsorTier },
  { name: "Türk Telekom Grup", tier: "GOLD" as SponsorTier },
  { name: "Vodafone Anadolu", tier: "PLATINUM" as SponsorTier },
  { name: "Nike Türkiye", tier: "PLATINUM" as SponsorTier },
];

/**
 * Lig tier + takım OVR'ına göre sponsor tier belirle
 * Tier 1 (Süper Lig) + OVR 75+ → PLATINUM
 * Tier 1 + OVR 65-74 → GOLD
 * Tier 2 + OVR 70+ → GOLD
 * Tier 2 + OVR 60-69 → SILVER
 * Tier 3-4 → BRONZE/SILVER
 */
export function determineSponsorTier(leagueTier: number, avgOvr: number): SponsorTier {
  if (leagueTier === 1) {
    if (avgOvr >= 75) return "PLATINUM";
    if (avgOvr >= 65) return "GOLD";
    return "SILVER";
  }
  if (leagueTier === 2) {
    if (avgOvr >= 70) return "GOLD";
    if (avgOvr >= 60) return "SILVER";
    return "BRONZE";
  }
  // Tier 3-4
  if (avgOvr >= 65) return "SILVER";
  return "BRONZE";
}

/**
 * v2.9.48: Sponsor tier'ına göre haftalık gelir — takım kalitesi ve değerine göre ölçeklenir
 *
 * Formül:
 *   baseAmount (tier'a göre) × qualityMultiplier × valueMultiplier
 *
 *   qualityMultiplier: avgOvr 50 → 0.7, 60 → 0.85, 70 → 1.0, 80 → 1.15, 90+ → 1.3
 *   valueMultiplier: takım değeri 10M → 0.8, 50M → 1.0, 100M → 1.2, 200M+ → 1.4
 *
 * Düşük kaliteli takım: BRONZE × 0.7 × 0.8 = 22.4K/hafta
 * Yüksek kaliteli takım: PLATINUM × 1.3 × 1.4 = 910K/hafta
 */
export function getSponsorAmount(tier: SponsorTier, avgOvr?: number, teamValue?: number): number {
  // Base amounts per tier
  const baseAmounts: Record<SponsorTier, number> = {
    PLATINUM: 500_000,
    GOLD: 250_000,
    SILVER: 100_000,
    BRONZE: 40_000,
  };
  const base = baseAmounts[tier] ?? 40_000;

  // v2.9.48: Quality multiplier — avgOvr bazlı
  let qualityMult = 1.0;
  if (avgOvr !== undefined) {
    if (avgOvr >= 90) qualityMult = 1.30;
    else if (avgOvr >= 80) qualityMult = 1.15;
    else if (avgOvr >= 70) qualityMult = 1.00;
    else if (avgOvr >= 60) qualityMult = 0.85;
    else qualityMult = 0.70;
  }

  // v2.9.48: Value multiplier — takım piyasa değeri bazlı
  let valueMult = 1.0;
  if (teamValue !== undefined) {
    const valueM = teamValue / 1_000_000; // milyon Euro
    if (valueM >= 200) valueMult = 1.40;
    else if (valueM >= 100) valueMult = 1.20;
    else if (valueM >= 50) valueMult = 1.00;
    else if (valueM >= 20) valueMult = 0.90;
    else valueMult = 0.80;
  }

  return Math.round(base * qualityMult * valueMult);
}

/**
 * v2.9.48: Takım için sponsor teklifleri üret — lig tier + OVR + takım değeri bazlı
 * 3 teklif: 1 ana tier + 2 alt tier
 * Otomatik: advanceMatchday her 5 turda bir çağrılır (Teklif Getir butonu kaldırıldı)
 */
export function generateSponsorOffers(leagueTier: number, avgOvr: number, teamValue?: number): Sponsor[] {
  const mainTier = determineSponsorTier(leagueTier, avgOvr);
  const tierOrder: SponsorTier[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
  const mainIdx = tierOrder.indexOf(mainTier);
  const lowerTier = tierOrder[Math.max(0, mainIdx - 1)];

  // Ana tier'dan 1 sponsor, alt tier'dan 2 sponsor seç
  const mainPool = SPONSOR_NAMES.filter((s) => s.tier === mainTier);
  const lowerPool = SPONSOR_NAMES.filter((s) => s.tier === lowerTier);

  const offers: Sponsor[] = [];
  const now = Date.now();
  const seasonWeeks = 34;

  // Ana sponsor
  if (mainPool.length > 0) {
    const picked = mainPool[Math.floor(Math.random() * mainPool.length)];
    offers.push({
      id: `sponsor_${now}_1`,
      name: picked.name,
      amount: getSponsorAmount(mainTier, avgOvr, teamValue),
      tier: mainTier,
      durationWeeks: seasonWeeks,
      startDate: now,
      endDate: now + seasonWeeks * 7 * 86400000,
      isActive: false,
    });
  }

  // Alt tier'dan 2 sponsor
  for (let i = 0; i < 2 && lowerPool.length > 0; i++) {
    const picked = lowerPool[Math.floor(Math.random() * lowerPool.length)];
    offers.push({
      id: `sponsor_${now}_${i + 2}`,
      name: picked.name,
      amount: getSponsorAmount(lowerTier, avgOvr, teamValue),
      tier: lowerTier,
      durationWeeks: seasonWeeks,
      startDate: now,
      endDate: now + seasonWeeks * 7 * 86400000,
      isActive: false,
    });
  }

  return offers;
}

/**
 * Aktif sponsorların haftalık toplam geliri
 */
export function getTotalSponsorIncome(activeSponsors: Sponsor[]): number {
  return activeSponsors
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + s.amount, 0);
}
