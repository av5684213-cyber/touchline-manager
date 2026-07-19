/**
 * Stadium Matrix — siyah-beyaz-fc'den birebir uyarlandı.
 *
 * 10 tesis × 10 seviye. Her tesisin her seviyesinde somut fayda metni.
 * Exponential maliyet: baseCost × 2.2^(level-1)
 * İnşaat süresi: 2 günden başlar, 1.5× katlanarak büyür.
 *
 * Maç motoruna etkileri:
 *  - capacity: bilet geliri çarpanı (1 + level × 0.1)
 *  - pitch: pas isabeti bonusu (level × 0.02)
 *  - medical: sakatlık iyileşme hızı çarpanı (1 + level × 0.1)
 *  - academy: genç oyuncu kalitesi (1 + level × 0.15)
 *  - lighting: gece maçı performans çarpanı (1 + level × 0.03)
 *  - heating: kış performans kaybı azaltma (level × 0.05, max 0.5)
 *  - media: sponsorluk çarpanı (1 + level × 0.03)
 *  - vip: VIP gelir (level × 50.000 €/maç)
 *  - store: pasif gelir (level × 20.000 €/gün)
 *  - scoreboards: taraftar etkileşimi (1 + level × 0.02)
 */

export type FacilityId =
  | "capacity"
  | "lighting"
  | "scoreboards"
  | "heating"
  | "vip"
  | "store"
  | "pitch"
  | "media"
  | "academy"
  | "medical";

export type FacilityDef = {
  id: FacilityId;
  name: string;
  description: string;
  effect: string;
  icon: string;
  baseCost: number;
  maxLevel: number;
  category: "stadium" | "training" | "youth" | "medical" | "commercial";
};

export const FACILITIES: FacilityDef[] = [
  {
    id: "capacity",
    name: "Seyirci Hacmi",
    description: "Mahalle tribünlerinden dikey mimarili arenalara.",
    effect: "Bilet geliri ve atmosfer baskısı artar. Lvl 10: Rakip Karar Verme -5.",
    icon: "🏟️",
    baseCost: 250_000,
    maxLevel: 10,
    category: "stadium",
  },
  {
    id: "lighting",
    name: "Optik Aydınlatma",
    description: "Eski projektörlerden gölge bırakmayan akıllı lazer sistemlere.",
    effect: "Gece maçları performansı ve yayın geliri. Lvl 10: GK Refleks +%10.",
    icon: "💡",
    baseCost: 180_000,
    maxLevel: 10,
    category: "stadium",
  },
  {
    id: "scoreboards",
    name: "Veri Panoları",
    description: "Tribünü saran panoramik dijital paneller.",
    effect: "Taraftar etkileşimi ve sponsorluk. Lvl 10: xG verileriyle rakip moral bozma.",
    icon: "📊",
    baseCost: 150_000,
    maxLevel: 10,
    category: "stadium",
  },
  {
    id: "heating",
    name: "İklim Kalkanı",
    description: "Alttan ısıtma borularından akıllı sensörlü yüzey yönetimine.",
    effect: "Kış şartlarında performans koruma. Lvl 10: Kar/Don etkileri sıfırlanır.",
    icon: "🌡️",
    baseCost: 200_000,
    maxLevel: 10,
    category: "stadium",
  },
  {
    id: "pitch",
    name: "Hibrit Çim",
    description: "Doğal çimden aşınmayan nano-teknolojik yüzeye.",
    effect: "Pas isabeti ve hız bonusu. Lvl 10: Takım Pas statı +%15 isabet.",
    icon: "🌱",
    baseCost: 220_000,
    maxLevel: 10,
    category: "training",
  },
  {
    id: "academy",
    name: "Akademi Konutları",
    description: "Beton sahalardan biyometrik tarama merkezlerine.",
    effect: "Genç yetenek ihtimali. Lvl 10: Her sezon 1 Elit Wonderkid garantisi.",
    icon: "🎓",
    baseCost: 300_000,
    maxLevel: 10,
    category: "youth",
  },
  {
    id: "medical",
    name: "Sağlık ve Rejenerasyon",
    description: "Basit revirlerden DNA bazlı rejenerasyon merkezine.",
    effect: "Sakatlık iyileşme hızı. Lvl 10: Sakatlık ihtimali -%50 azalır.",
    icon: "🏥",
    baseCost: 280_000,
    maxLevel: 10,
    category: "medical",
  },
  {
    id: "vip",
    name: "VIP Localar",
    description: "Standart locadan gökyüzü erişimli ultra-lüks alanlara.",
    effect: "Devasa VIP geliri ve lobi gücü. Lvl 10: Her maç +500.000 € VIP fonu.",
    icon: "🛋️",
    baseCost: 350_000,
    maxLevel: 10,
    category: "commercial",
  },
  {
    id: "store",
    name: "Merchandising",
    description: "Konteyner satış noktalarından devasa deneyim mağazalarına.",
    effect: "Maç günü dışı pasif gelir. Lvl 10: Global forma satış çarpanı.",
    icon: "🛍️",
    baseCost: 120_000,
    maxLevel: 10,
    category: "commercial",
  },
  {
    id: "media",
    name: "Basın ve Multimedya",
    description: "Küçük basın odalarından global yayın üslerine.",
    effect: "Kulüp itibarı ve sponsorluk. Lvl 10: Yayın geliri +%100 artış.",
    icon: "📡",
    baseCost: 260_000,
    maxLevel: 10,
    category: "commercial",
  },
];

// ===== Her seviye için fayda metni =====
export const FACILITY_LEVEL_BENEFITS: Record<FacilityId, Record<number, string>> = {
  capacity: {
    1: "Kapasite 15.000 — Bilet geliri +%5",
    2: "Kapasite 25.000 — Bilet +%10, Atmosfer +1",
    3: "Kapasite 35.000 — Bilet +%15, Atmosfer +2",
    4: "Kapasite 45.000 — Bilet +%20, Atmosfer +3",
    5: "Kapasite 55.000 — Bilet +%25, Atmosfer +4",
    6: "Kapasite 65.000 — Bilet +%30, Atmosfer +5",
    7: "Kapasite 75.000 — Bilet +%35, Atmosfer +6",
    8: "Kapasite 85.000 — Bilet +%40, Atmosfer +7",
    9: "Kapasite 95.000 — Bilet +%45, Atmosfer +8",
    10: "Kapasite 105.000 — Rakip Karar -5, Atmosfer +10",
  },
  lighting: {
    1: "Gece maçı performans +%3",
    2: "Gece +%5, Yayın +%5",
    3: "Gece +%8, Yayın +%10",
    4: "Gece +%10, Yayın +%15",
    5: "Gece +%12, Yayın +%20",
    6: "Gece +%14, Yayın +%25",
    7: "Gece +%16, Yayın +%30",
    8: "Gece +%18, Yayın +%35",
    9: "Gece +%20, Yayın +%40",
    10: "GK Refleks +%10, Yayın +%50",
  },
  scoreboards: {
    1: "Taraftar etkileşim +%3",
    2: "Etkileşim +%5, Sponsor +%3",
    3: "Etkileşim +%8, Sponsor +%5",
    4: "Etkileşim +%10, Sponsor +%8",
    5: "Etkileşim +%12, Sponsor +%10",
    6: "Etkileşim +%14, Sponsor +%13",
    7: "Etkileşim +%16, Sponsor +%16",
    8: "Etkileşim +%18, Sponsor +%19",
    9: "Etkileşim +%20, Sponsor +%22",
    10: "xG ile rakip moral bozma, Sponsor +%25",
  },
  heating: {
    1: "Kış performans kaybı -%5",
    2: "Kış kaybı -%10",
    3: "Kış kaybı -%15",
    4: "Kış kaybı -%20",
    5: "Kış kaybı -%25",
    6: "Kış kaybı -%30",
    7: "Kış kaybı -%35",
    8: "Kış kaybı -%40",
    9: "Kış kaybı -%45",
    10: "Kar/Don etkileri tamamen sıfırlanır",
  },
  pitch: {
    1: "Pas isabeti +%2",
    2: "Pas +%3, Hız +1",
    3: "Pas +%5, Hız +2",
    4: "Pas +%6, Hız +3",
    5: "Pas +%8, Hız +4",
    6: "Pas +%9, Hız +5",
    7: "Pas +%10, Hız +6",
    8: "Pas +%11, Hız +7",
    9: "Pas +%13, Hız +8",
    10: "Takım Pas statı +%15 isabet",
  },
  academy: {
    1: "Genç yetenek ihtimali +%5",
    2: "Genç ihtimal +%8",
    3: "Genç +%12, Akademi kapasitesi +1",
    4: "Genç +%15, Kapasite +2",
    5: "Genç +%18, Kapasite +2",
    6: "Genç +%20, Kapasite +3",
    7: "Genç +%22, Kapasite +3",
    8: "Genç +%25, Kapasite +4",
    9: "Genç +%28, Kapasite +4",
    10: "Her sezon 1 Elit Wonderkid garantisi",
  },
  medical: {
    1: "Sakatlık iyileşme hızı +%5",
    2: "İyileşme +%10",
    3: "İyileşme +%15",
    4: "İyileşme +%20",
    5: "İyildeşme +%25",
    6: "İyileşme +%30",
    7: "İyileşme +%35",
    8: "İyileşme +%40",
    9: "İyileşme +%45",
    10: "Sakatlık ihtimali -%50 azalır",
  },
  vip: {
    1: "VIP gelir: +50.000 €/maç",
    2: "VIP: +100.000 €/maç",
    3: "VIP: +150.000 €/maç",
    4: "VIP: +200.000 €/maç",
    5: "VIP: +250.000 €/maç",
    6: "VIP: +300.000 €/maç",
    7: "VIP: +350.000 €/maç",
    8: "VIP: +400.000 €/maç",
    9: "VIP: +450.000 €/maç",
    10: "Her maç +500.000 € VIP fonu",
  },
  store: {
    1: "Pasif gelir: +20.000 €/gün",
    2: "Pasif: +40.000 €/gün",
    3: "Pasif: +60.000 €/gün",
    4: "Pasif: +80.000 €/gün",
    5: "Pasif: +100.000 €/gün",
    6: "Pasif: +130.000 €/gün",
    7: "Pasif: +160.000 €/gün",
    8: "Pasif: +200.000 €/gün",
    9: "Pasif: +250.000 €/gün",
    10: "Global forma satış çarpanı aktif",
  },
  media: {
    1: "Kulüp itibarı +2",
    2: "İtibar +4, Sponsor +%3",
    3: "İtibar +6, Sponsor +%5",
    4: "İtibar +8, Sponsor +%8",
    5: "İtibar +10, Sponsor +%12",
    6: "İtibar +12, Sponsor +%16",
    7: "İtibar +14, Sponsor +%20",
    8: "İtibar +16, Sponsor +%25",
    9: "İtibar +18, Sponsor +%30",
    10: "Yayın geliri +%100 artış",
  },
};

export function getFacilityBenefit(id: FacilityId, level: number): string {
  return (
    FACILITY_LEVEL_BENEFITS[id]?.[level] ??
    `Seviye ${level} — Geliştirme aktif`
  );
}

// ===== Maliyet ve süre hesapları =====
export function calculateUpgradeCost(baseCost: number, level: number): number {
  // level: hedef seviye (1 = ilk geliştirme)
  return Math.floor(baseCost * Math.pow(2.2, level - 1));
}

export function getUpgradeDuration(level: number): number {
  // Oyun günü cinsinden inşaat süresi
  if (level <= 2) return 2;
  return Math.floor(2 * Math.pow(1.5, level - 2));
}

export function getManagerLevelRequirement(level: number): number {
  if (level <= 3) return 0;
  if (level <= 6) return level * 2;
  return level * 3;
}

// ===== Sayısal etki fonksiyonları (maç motoruna) =====
export function getStadiumTicketRevenueMultiplier(level: number): number {
  // P0 FIX: store.ts ile aynı — 1 + level * 0.05 (önceden 0.1 idi)
  return 1.0 + level * 0.05;
}
export function getStadiumCapacity(level: number): number {
  // P0 FIX: store.ts ile aynı formül — 5000 + level * 5000 (önceden 10000 idi, çift formül)
  return 5000 + level * 5000;
}
export function getStadiumFillRate(level: number, leagueTier: number = 2): number {
  // Stadyum doluluk oranı — seviye ve lig tier'ına göre
  const baseFill = 0.5 + level * 0.03;
  const tierBonus = (5 - leagueTier) * 0.05;
  return Math.min(0.95, baseFill + tierBonus);
}
export function getTrainingXPMultiplier(level: number): number {
  // pitch seviyesi
  return 1.0 + level * 0.1;
}
export function getAcademyQualityMultiplier(level: number): number {
  return 1.0 + level * 0.15;
}
export function getInjuryRecoverySpeed(level: number): number {
  // medical seviyesi
  return 1.0 + level * 0.1;
}
export function getScoutSlotCount(level: number): number {
  return 1 + level;
}
export function getVIPRevenuePerMatch(level: number): number {
  return level * 50000;
}
export function getStoreDailyRevenue(level: number): number {
  return level * 20000;
}
export function getPitchPassAccuracyBonus(level: number): number {
  return level * 0.02;
}
export function getMediaSponsorMultiplier(level: number): number {
  return 1.0 + level * 0.03;
}
export function getLightingNightBonus(level: number): number {
  return 1.0 + level * 0.03;
}
export function getHeatingWinterProtection(level: number): number {
  return Math.min(0.5, level * 0.05);
}
export function getScoreboardFanBonus(level: number): number {
  return 1.0 + level * 0.02;
}

// ===== Personel tipleri (6 tip) =====
export type StaffType =
  | "scout"
  | "coach"
  | "physio"
  | "youth_coordinator"
  | "sporting_director"
  | "analyst";

export type StaffTypeDef = {
  type: StaffType;
  name: string;
  maxCount: number;
  icon: string;
  color: string;
  hireFeeEuro: Record<number, number>; // 1-5 stars
  baseSalary: number; // haftalık €
  effect: string;
};

export const STAFF_TYPES: StaffTypeDef[] = [
  {
    type: "scout",
    name: "Gözlemci",
    maxCount: 3,
    icon: "🔍",
    color: "blue",
    hireFeeEuro: { 1: 400_000, 2: 600_000, 3: 800_000, 4: 1_000_000, 5: 1_200_000 },
    baseSalary: 25_000,
    effect: "Daha fazla scout slotu, daha doğru oyuncu raporları.",
  },
  {
    type: "coach",
    name: "Yardımcı Antrenör",
    maxCount: 3,
    icon: "🏋️",
    color: "amber",
    hireFeeEuro: { 1: 650_000, 2: 800_000, 3: 950_000, 4: 1_100_000, 5: 1_250_000 },
    baseSalary: 35_000,
    effect: "Antrenman çarpanı +%12/yıldız (5★ → ×1.60).",
  },
  {
    type: "physio",
    name: "Fizyoterapist",
    maxCount: 3,
    icon: "❤️",
    color: "emerald",
    hireFeeEuro: { 1: 200_000, 2: 280_000, 3: 360_000, 4: 440_000, 5: 520_000 },
    baseSalary: 20_000,
    effect: "Sakatlık iyileşme hızı +%10/yıldız.",
  },
  {
    type: "youth_coordinator",
    name: "Gençlik Koordinatörü",
    maxCount: 2,
    icon: "🧑‍🎓",
    color: "purple",
    hireFeeEuro: { 1: 450_000, 2: 600_000, 3: 750_000, 4: 900_000, 5: 1_050_000 },
    baseSalary: 28_000,
    effect: "Altyapıdan gelen oyuncuların kalitesi +%8/yıldız.",
  },
  {
    type: "sporting_director",
    name: "Sportif Direktör",
    maxCount: 1,
    icon: "💼",
    color: "rose",
    hireFeeEuro: { 1: 350_000, 2: 500_000, 3: 650_000, 4: 800_000, 5: 950_000 },
    baseSalary: 40_000,
    effect: "Transfer görüşmelerinde +%5/yıldız indirim.",
  },
  {
    type: "analyst",
    name: "Maç Analisti",
    maxCount: 2,
    icon: "📈",
    color: "cyan",
    hireFeeEuro: { 1: 150_000, 2: 250_000, 3: 350_000, 4: 450_000, 5: 550_000 },
    baseSalary: 18_000,
    effect: "Rakip takım zayıf yönlerini gösterir, maç hazırlığı +%3/yıldız.",
  },
];

export function getStaffType(type: StaffType): StaffTypeDef | undefined {
  return STAFF_TYPES.find((s) => s.type === type);
}
