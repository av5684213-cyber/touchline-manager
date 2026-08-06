/**
 * v2.9.86: Sponsor Sistemi — 5 kategori, max 25M, sezon başı
 *
 * Kategoriler:
 *   1. chest       — Göğüs Sponsorluğu (Ana Sponsor) — en pahalı, en prestijli
 *   2. sleeve      — Kol Sponsorluğu (Sleeve) — yüksek gelir
 *   3. back_shorts — Sırt ve Şort Sponsorluğu — orta
 *   4. socks       — Çorap ve Konç Sponsorluğu — düşük bütçe
 *   5. kit_supplier — Forma/Ekipman Tedarikçisi — marka anlaşması
 *
 * Max gelir: 25M Euro/sezon (Süper Lig, OVR 85+)
 * Sadece sezon başında teklif gelir. Kullanıcı kabul/reddeder.
 * Takım kalitesine göre (lig tier + OVR) miktar değişir.
 */

// v2.9.86: Sponsor kategorileri
export type SponsorCategory = "chest" | "sleeve" | "back_shorts" | "socks" | "kit_supplier";

// v2.9.86: Eski SponsorTier backward compat için korundu
export type SponsorTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export type Sponsor = {
  id: string;
  name: string;
  amount: number; // haftalık gelir (€)
  tier: SponsorTier; // backward compat
  category: SponsorCategory; // v2.9.86: yeni alan
  durationWeeks: number;
  startDate: number;
  endDate: number;
  isActive: boolean;
};

// Kategori metadata — UI için
export const SPONSOR_CATEGORIES: Record<SponsorCategory, {
  trName: string;
  enName: string;
  trDesc: string;
  icon: string;
  maxShare: number; // max 25M'nin yüzdesi
}> = {
  chest: {
    trName: "Göğüs Sponsorluğu",
    enName: "Chest Sponsor",
    trDesc: "Formanın ön yüzünde yer alır. Kulübün en pahalı ve prestijli sponsorluğudur.",
    icon: "👕",
    maxShare: 0.40, // 40% = ~10M
  },
  sleeve: {
    trName: "Kol Sponsorluğu",
    enName: "Sleeve Sponsor",
    trDesc: "Sol veya sağ kolda yer alır. Yüksek gelir getiren popüler bir alandır.",
    icon: "💪",
    maxShare: 0.20, // 20% = ~5M
  },
  back_shorts: {
    trName: "Sırt ve Şort Sponsorluğu",
    enName: "Back & Shorts Sponsor",
    trDesc: "Forma numarasının altı/üstü veya şortun ön/arka kısımlarına verilir.",
    icon: "🎽",
    maxShare: 0.16, // 16% = ~4M
  },
  socks: {
    trName: "Çorap ve Konç Sponsorluğu",
    enName: "Socks Sponsor",
    trDesc: "Daha uygun bütçeli, tamamlayıcı sponsorluk alanı.",
    icon: "🧦",
    maxShare: 0.08, // 8% = ~2M
  },
  kit_supplier: {
    trName: "Forma/Ekipman Tedarikçisi",
    enName: "Kit Supplier",
    trDesc: "Kulübün formalarını ve antrenman ürünlerini üreten marka. Ödeme + satıştan pay.",
    icon: "🏷️",
    maxShare: 0.16, // 16% = ~4M
  },
};

// Sponsor isim havuzu — her kategori için ayrı
const SPONSOR_NAMES_BY_CATEGORY: Record<SponsorCategory, string[]> = {
  chest: ["İstanbul Havayolları", "Anadolu Bank", "Türk Telekom Grup", "Boğaz Enerji", "Mega Holding"],
  sleeve: ["Yıldız Otomotiv", "Vodafone Anadolu", "Marmara Sigorta", "Ege Lojistik", "Pro Teknoloji"],
  back_shorts: ["Karadeniz Gıda", "Anadolu Teknoloji", "Çelik İnşaat", "Mavi Deniz Turizm", "Star Medya"],
  socks: ["Yerel Market", "Spor Shop", "Anadolu Textile", "Hızlı Kargo", "Yöresel Üretim"],
  kit_supplier: ["Nike Türkiye", "Adidas Anadolu", "Puma Türk", "Umbro Sport", "Macron Türkiye"],
};

// v2.9.86: Lig tier multiplier (max 25M → T1)
const TIER_MULT: Record<number, number> = {
  1: 1.0,    // Süper Lig: max 25M
  2: 0.50,   // 1. Lig: max 12.5M
  3: 0.25,   // 2. Lig: max 6.25M
  4: 0.125,  // 3. Lig: max ~3.1M
  5: 0.05,   // Amatör: max ~1.25M
};

// v2.9.86: OVR multiplier
function getOvrMult(avgOvr: number): number {
  if (avgOvr >= 85) return 1.0;
  if (avgOvr >= 75) return 0.85;
  if (avgOvr >= 65) return 0.70;
  return 0.55;
}

// v2.9.86: Kategori + tier'a göre haftalık gelir hesapla
const MAX_SEASON_INCOME = 25_000_000; // 25M Euro
const SEASON_WEEKS = 34;

function getCategoryAmount(category: SponsorCategory, leagueTier: number, avgOvr: number): number {
  const catMeta = SPONSOR_CATEGORIES[category];
  const tierMult = TIER_MULT[leagueTier] ?? 0.05;
  const ovrMult = getOvrMult(avgOvr);
  const maxSeasonForCat = MAX_SEASON_INCOME * catMeta.maxShare;
  const weeklyAmount = (maxSeasonForCat / SEASON_WEEKS) * tierMult * ovrMult;
  return Math.round(weeklyAmount / 1000) * 1000; // binlik yuvarla
}

// v2.9.86: backward compat — tier belirleme
export function determineSponsorTier(leagueTier: number, avgOvr: number): SponsorTier {
  const mult = (TIER_MULT[leagueTier] ?? 0.05) * getOvrMult(avgOvr);
  if (mult >= 0.8) return "PLATINUM";
  if (mult >= 0.4) return "GOLD";
  if (mult >= 0.15) return "SILVER";
  return "BRONZE";
}

// v2.9.86: backward compat — tek sponsor için amount
export function getSponsorAmount(tier: SponsorTier, avgOvr?: number, teamValue?: number): number {
  const mult = avgOvr ? getOvrMult(avgOvr) : 0.85;
  const baseAmounts: Record<SponsorTier, number> = {
    BRONZE: 90_000,
    SILVER: 180_000,
    GOLD: 350_000,
    PLATINUM: 700_000,
  };
  return Math.round((baseAmounts[tier] ?? 90_000) * mult);
}

/**
 * v2.9.86: Sezon başı sponsor teklifleri üret — 5 kategori, her birinden 1 teklif.
 * Takım kalitesine göre (lig tier + OVR) miktar belirlenir.
 * Max 25M/sezon (Süper Lig, OVR 85+).
 */
export function generateSponsorOffers(leagueTier: number, avgOvr: number, teamValue?: number): Sponsor[] {
  const offers: Sponsor[] = [];
  const now = Date.now();
  const categories: SponsorCategory[] = ["chest", "sleeve", "back_shorts", "socks", "kit_supplier"];
  const usedNames = new Set<string>();

  for (const category of categories) {
    const namePool = SPONSOR_NAMES_BY_CATEGORY[category];
    const availableNames = namePool.filter(n => !usedNames.has(n));
    const pickedName = availableNames.length > 0
      ? availableNames[Math.floor(Math.random() * availableNames.length)]
      : namePool[Math.floor(Math.random() * namePool.length)];
    usedNames.add(pickedName);

    const amount = getCategoryAmount(category, leagueTier, avgOvr);
    const tier = determineSponsorTier(leagueTier, avgOvr);

    offers.push({
      id: `sponsor_${now}_${category}`,
      name: pickedName,
      amount,
      tier,
      category,
      durationWeeks: SEASON_WEEKS,
      startDate: now,
      endDate: now + SEASON_WEEKS * 7 * 86400000,
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
