// ADDED: sponsorSystem.ts — Dinamik sponsor sistemi
// Lig tier + takım OVR ortalamasına göre sponsor teklifleri üretir

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
 * Sponsor tier'ına göre haftalık gelir (Euro)
 */
export function getSponsorAmount(tier: SponsorTier): number {
  switch (tier) {
    case "PLATINUM": return 500_000; // 500K/hafta
    case "GOLD": return 250_000;
    case "SILVER": return 100_000;
    case "BRONZE": return 40_000;
    default: return 40_000;
  }
}

/**
 * Takım için sponsor teklifleri üret
 * 3 teklif: 1 ana tier + 2 alt tier
 */
export function generateSponsorOffers(leagueTier: number, avgOvr: number): Sponsor[] {
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
      amount: getSponsorAmount(mainTier),
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
      amount: getSponsorAmount(lowerTier),
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
