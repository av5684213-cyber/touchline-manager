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
 * v2.9.75: Sponsor tier'ına göre haftalık gelir — LIG TIER bazlı minimum garanti.
 *
 * Kullanıcı talebi: "En az 4. Lig için 3M Euro, lig yükseldikçe x2"
 *   T4 (3. Lig):   3M / 34 hafta = ~88K/hafta  → base 90K
 *   T3 (2. Lig):   6M / 34 hafta = ~176K/hafta → base 180K
 *   T2 (1. Lig):  12M / 34 hafta = ~353K/hafta → base 350K
 *   T1 (Süper Lig): 24M / 34 hafta = ~706K/hafta → base 700K
 *
 * Sponsor tier (BRONZE/SILVER/GOLD/PLATINUM) → lig tier ile eşleştirilir.
 * Kalite bonusu (OVR bazlı) +%0-20, değer bonusu kaldırıldı (basitlik için).
 */
export function getSponsorAmount(tier: SponsorTier, avgOvr?: number, teamValue?: number): number {
  // v2.9.75: Lig tier bazlı base amounts (x2 kuralı)
  const baseAmounts: Record<SponsorTier, number> = {
    BRONZE: 90_000,    // T4 → ~3.06M/season
    SILVER: 180_000,   // T3 → ~6.12M/season
    GOLD: 350_000,     // T2 → ~11.9M/season
    PLATINUM: 700_000, // T1 → ~23.8M/season
  };
  const base = baseAmounts[tier] ?? 90_000;

  // v2.9.75: Quality bonus (max +20%, eskiden +30% ama base zaten yüksek)
  let qualityMult = 1.0;
  if (avgOvr !== undefined) {
    if (avgOvr >= 85) qualityMult = 1.20;
    else if (avgOvr >= 75) qualityMult = 1.10;
    else if (avgOvr >= 65) qualityMult = 1.00;
    else qualityMult = 0.95; // düşük OVR'da bile min %95 (garanti)
  }

  return Math.round(base * qualityMult);
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
