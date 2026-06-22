// Stub lucide-react — gerçek UI'da kullanılmıyor, sadece metadata
type LucideIcon = string;
const Landmark = "Landmark" as LucideIcon;
const Zap = "Zap" as LucideIcon;
const Monitor = "Monitor" as LucideIcon;
const Thermometer = "Thermometer" as LucideIcon;
const Store = "Store" as LucideIcon;
const Utensils = "Utensils" as LucideIcon;
const School = "School" as LucideIcon;
const Dumbbell = "Dumbbell" as LucideIcon;
const Plane = "Plane" as LucideIcon;
const Activity = "Activity" as LucideIcon;
const Wifi = "Wifi" as LucideIcon;

export interface StadiumMatrixItem {
  id: string;
  name: string;
  originalName: string;
  description: string;
  effect: string;
  maxLevel: number;
  icon: LucideIcon;
  requiredManagerLevel?: number;
  requiredDivision?: number;
}

export const STADIUM_MATRIX: StadiumMatrixItem[] = [
  {
    id: 'capacity',
    name: 'Seyirci Hacmi (Kapasite)',
    originalName: 'Kolezyum Ölçeği',
    description: 'Mahalle tribünlerinden dikey mimarili arenalara uzanan yolculuk.',
    effect: 'Bilet geliri ve Atmosfer Baskısı artar. Lvl 10: Rakip Karar Verme -5.',
    maxLevel: 10,
    icon: Landmark
  },
  {
    id: 'lighting',
    name: 'Optik Aydınlatma (Işıklandırma)',
    originalName: 'Lümen Operasyonu',
    description: 'Eski projektörlerden gölge bırakmayan akıllı lazer sitemlere.',
    effect: 'Gece maçları performansı ve yayın geliri. Lvl 10: GK Refleks +%10.',
    maxLevel: 10,
    icon: Zap
  },
  {
    id: 'scoreboards',
    name: 'Veri Panoları (Skor Tabelası)',
    originalName: 'Analitik Ekranlar',
    description: 'Tribünü saran panoramik dijital paneller.',
    effect: 'Taraftar etkileşimi ve sponsorluk. Lvl 10: xG Verileriyle rakip moral bozma.',
    maxLevel: 10,
    icon: Monitor
  },
  {
    id: 'heating',
    name: 'İklim Kalkanı (Isıtma)',
    originalName: 'Termal Kubbe',
    description: 'Alttan ısıtma borularından akıllı sensörlü yüzey yönetimine.',
    effect: 'Kış şartlarında performans koruma. Lvl 10: Kar/Don etkileri sıfırlanır.',
    maxLevel: 10,
    icon: Thermometer
  },
  {
    id: 'vip',
    name: 'VIP Localar',
    originalName: 'Heli-Port',
    description: 'Standart locadan gökyüzü erişimli ultra-lüks alanlara.',
    effect: 'Devasa VIP geliri ve lobi gücü. Lvl 10: Her maç başı +500.000 € VIP fonu.',
    maxLevel: 10,
    icon: Plane
  },
  {
    id: 'store',
    name: 'Merchandising',
    originalName: 'Arma Pazarı',
    description: 'Konteyner satış noktalarından devasa deneyim mağazalarına.',
    effect: 'Maç günü dışı pasif gelir. Lvl 10: Global forma satış çarpanı.',
    maxLevel: 10,
    icon: Store
  },
  {
    id: 'pitch',
    name: 'Hibrit Çim',
    originalName: 'Nano-Çim',
    description: 'Doğal çimden aşınmayan nano-teknolojik yüzeye.',
    effect: 'Pas isabeti ve hız bonusu. Lvl 10: Takım Pas statı +%15 isabet.',
    maxLevel: 10,
    icon: Activity
  },
  {
    id: 'media',
    name: 'Basın ve Multimedya',
    originalName: 'Prestige Hub',
    description: 'Küçük basın odalarından global yayın üslerine.',
    effect: 'Kulüp itibarı ve sponsorluk. Lvl 10: Yayın geliri +%100 artış.',
    maxLevel: 10,
    icon: Wifi
  },
  {
    id: 'academy',
    name: 'Akademi Konutları',
    originalName: 'Gelecek Vizyonu',
    description: 'Beton sahalardan biyometrik tarama merkezlerine.',
    effect: 'Genç yetenek ihtimali. Lvl 10: Her sezon 1 Elit Wonderkid garantisi.',
    maxLevel: 10,
    icon: School
  },
  {
    id: 'medical',
    name: 'Sağlık ve Rejenerasyon',
    originalName: 'Gladyatör Kampı',
    description: 'Basit revirlerden DNA bazlı rejenerasyon merkezine.',
    effect: 'Sakatlık iyileşme hızı. Lvl 10: Sakatlık ihtimali -%50 azalır.',
    maxLevel: 10,
    icon: Dumbbell
  }
];

// ═══════════════════════════════════════════════════
//  TESIS SEVIYE FAYDALARI
//  Her tesisin her seviyesinde ne fayda sağladığını tanımlar.
//  Slider önizlemesinde gösterilir.
// ═══════════════════════════════════════════════════

export const FACILITY_LEVEL_BENEFITS: Record<string, Record<number, string>> = {
  capacity: {
    1: 'Kapasite 15.000 — Bilet geliri +%5',
    2: 'Kapasite 25.000 — Bilet geliri +%10, Atmosfer +1',
    3: 'Kapasite 35.000 — Bilet geliri +%15, Atmosfer +2',
    4: 'Kapasite 45.000 — Bilet geliri +%20, Atmosfer +3',
    5: 'Kapasite 55.000 — Bilet geliri +%25, Atmosfer +4',
    6: 'Kapasite 65.000 — Bilet geliri +%30, Atmosfer +5',
    7: 'Kapasite 75.000 — Bilet geliri +%35, Atmosfer +6',
    8: 'Kapasite 85.000 — Bilet geliri +%40, Atmosfer +7',
    9: 'Kapasite 95.000 — Bilet geliri +%45, Atmosfer +8',
    10: 'Kapasite 105.000 — Rakip Karar Verme -5, Atmosfer +10',
  },
  lighting: {
    1: 'Gece maçı performansı +%3',
    2: 'Gece maçı performansı +%5, Yayın geliri +%5',
    3: 'Gece maçı performansı +%8, Yayın geliri +%10',
    4: 'Gece maçı performansı +%10, Yayın geliri +%15',
    5: 'Gece maçı performansı +%12, Yayın geliri +%20',
    6: 'Gece maçı performansı +%14, Yayın geliri +%25',
    7: 'Gece maçı performansı +%16, Yayın geliri +%30',
    8: 'Gece maçı performansı +%18, Yayın geliri +%35',
    9: 'Gece maçı performansı +%20, Yayın geliri +%40',
    10: 'GK Refleks +%10, Yayın geliri +%50',
  },
  scoreboards: {
    1: 'Taraftar etkileşimi +%3',
    2: 'Taraftar etkileşimi +%5, Sponsorluk +%3',
    3: 'Taraftar etkileşimi +%8, Sponsorluk +%5',
    4: 'Taraftar etkileşimi +%10, Sponsorluk +%8',
    5: 'Taraftar etkileşimi +%12, Sponsorluk +%10',
    6: 'Taraftar etkileşimi +%14, Sponsorluk +%13',
    7: 'Taraftar etkileşimi +%16, Sponsorluk +%16',
    8: 'Taraftar etkileşimi +%18, Sponsorluk +%19',
    9: 'Taraftar etkileşimi +%20, Sponsorluk +%22',
    10: 'xG Verileriyle rakip moral bozma, Sponsorluk +%25',
  },
  heating: {
    1: 'Kış performans kaybı -%5',
    2: 'Kış performans kaybı -%10',
    3: 'Kış performans kaybı -%15',
    4: 'Kış performans kaybı -%20',
    5: 'Kış performans kaybı -%25',
    6: 'Kış performans kaybı -%30',
    7: 'Kış performans kaybı -%35',
    8: 'Kış performans kaybı -%40',
    9: 'Kış performans kaybı -%45',
    10: 'Kar/Don etkileri tamamen sıfırlanır',
  },
  vip: {
    1: 'VIP gelir: +50.000 €/maç',
    2: 'VIP gelir: +100.000 €/maç',
    3: 'VIP gelir: +150.000 €/maç',
    4: 'VIP gelir: +200.000 €/maç',
    5: 'VIP gelir: +250.000 €/maç',
    6: 'VIP gelir: +300.000 €/maç',
    7: 'VIP gelir: +350.000 €/maç',
    8: 'VIP gelir: +400.000 €/maç',
    9: 'VIP gelir: +450.000 €/maç',
    10: 'Her maç başı +500.000 € VIP fonu',
  },
  store: {
    1: 'Pasif gelir: +20.000 €/gün',
    2: 'Pasif gelir: +40.000 €/gün',
    3: 'Pasif gelir: +60.000 €/gün',
    4: 'Pasif gelir: +80.000 €/gün',
    5: 'Pasif gelir: +100.000 €/gün',
    6: 'Pasif gelir: +130.000 €/gün',
    7: 'Pasif gelir: +160.000 €/gün',
    8: 'Pasif gelir: +200.000 €/gün',
    9: 'Pasif gelir: +250.000 €/gün',
    10: 'Global forma satış çarpanı aktif',
  },
  pitch: {
    1: 'Pas isabeti +%2',
    2: 'Pas isabeti +%3, Hız +1',
    3: 'Pas isabeti +%5, Hız +2',
    4: 'Pas isabeti +%6, Hız +3',
    5: 'Pas isabeti +%8, Hız +4',
    6: 'Pas isabeti +%9, Hız +5',
    7: 'Pas isabeti +%10, Hız +6',
    8: 'Pas isabeti +%11, Hız +7',
    9: 'Pas isabeti +%13, Hız +8',
    10: 'Takım Pas statı +%15 isabet',
  },
  media: {
    1: 'Kulüp itibarı +2',
    2: 'Kulüp itibarı +4, Sponsorluk +%3',
    3: 'Kulüp itibarı +6, Sponsorluk +%5',
    4: 'Kulüp itibarı +8, Sponsorluk +%8',
    5: 'Kulüp itibarı +10, Sponsorluk +%12',
    6: 'Kulüp itibarı +12, Sponsorluk +%16',
    7: 'Kulüp itibarı +14, Sponsorluk +%20',
    8: 'Kulüb itibarı +16, Sponsorluk +%25',
    9: 'Kulüp itibarı +18, Sponsorluk +%30',
    10: 'Yayın geliri +%100 artış',
  },
  academy: {
    1: 'Genç yetenek ihtimali +%5',
    2: 'Genç yetenek ihtimali +%8',
    3: 'Genç yetenek ihtimali +%12, Akademi kapasitesi +1',
    4: 'Genç yetenek ihtimali +%15, Akademi kapasitesi +2',
    5: 'Genç yetenek ihtimali +%18, Akademi kapasitesi +2',
    6: 'Genç yetenek ihtimali +%20, Akademi kapasitesi +3',
    7: 'Genç yetenek ihtimali +%22, Akademi kapasitesi +3',
    8: 'Genç yetenek ihtimali +%25, Akademi kapasitesi +4',
    9: 'Genç yetenek ihtimali +%28, Akademi kapasitesi +4',
    10: 'Her sezon 1 Elit Wonderkid garantisi',
  },
  medical: {
    1: 'Sakatlık iyileşme hızı +%5',
    2: 'Sakatlık iyileşme hızı +%10',
    3: 'Sakatlık iyileşme hızı +%15',
    4: 'Sakatlık iyileşme hızı +%20',
    5: 'Sakatlık iyileşme hızı +%25',
    6: 'Sakatlık iyileşme hızı +%30',
    7: 'Sakatlık iyileşme hızı +%35',
    8: 'Sakatlık iyileşme hızı +%40',
    9: 'Sakatlık iyileşme hızı +%45',
    10: 'Sakatlık ihtimali -%50 azalır',
  },
};

/**
 * Belirli bir tesisin belirli seviyesinin faydasını döndürür.
 * Bulunamazsa varsayılan mesaj döner.
 */
export function getFacilityBenefit(facilityId: string, level: number): string {
  return FACILITY_LEVEL_BENEFITS[facilityId]?.[level] || `Seviye ${level} — Geliştirme aktif`;
}

export const getStadiumCapacity = (level: number) => {
  return 5000 + (level * 10000);
};

export const calculateUpgradeCost = (baseCost: number, level: number) => {
  // Exponential scaling as requested
  return Math.floor(baseCost * Math.pow(2.2, level - 1));
};

export const getManagerLevelRequirement = (level: number) => {
  if (level <= 3) return 0;
  if (level <= 6) return level * 2;
  return level * 3;
};

// ═══════════════════════════════════════════════════
//  TESIS SEVIYE ETKİLERİ (LEVEL EFFECTS)
//  Her tesisin her seviyesinde sağladığı sayısal etki.
//  Diğer motorlarla entegrasyon için kullanılır.
// ═══════════════════════════════════════════════════

export interface LevelEffectResult {
  /** Etki anahtarı (ör: ticketRevenueMultiplier, trainingXPMultiplier) */
  key: string;
  /** Etiket (Türkçe, UI'da gösterim için) */
  label: string;
  /** Sayısal değer */
  value: number;
}

/**
 * Stadyum (capacity) → Bilet geliri çarpanı
 * Seviye başına +0.1 çarpan (1.0 başlangıç, level 10 → 2.0)
 * GÖREV 10 ile entegre: calculateMatchRevenue bu çarpanı kullanır
 */
export function getStadiumTicketRevenueMultiplier(stadiumLevel: number): number {
  return 1.0 + stadiumLevel * 0.1;
}

/**
 * Antrenman Sahası → Oyuncu gelişim hızı çarpanı
 * Seviye başına +0.1 (1.0 başlangıç, level 10 → 2.0)
 * trainingEngine.ts'teki TRAINING_GROUND_XP_MULTIPLIER ile entegre
 */
export function getTrainingXPMultiplier(trainingLevel: number): number {
  return 1.0 + trainingLevel * 0.1;
}

/**
 * Altyapı (academy) → Genç oyuncu sayısı/kalitesi çarpanı
 * Seviye başına +0.15 (1.0 başlangıç, level 10 → 2.5)
 * youthAcademy.ts'teki ACADEMY_QUALITY_MULTIPLIER ile entegre
 */
export function getAcademyQualityMultiplier(academyLevel: number): number {
  return 1.0 + academyLevel * 0.15;
}

/**
 * Sağlık Merkezi (medical) → Sakatlık iyileşme hızı çarpanı
 * Seviye başına +0.1 (1.0 başlangıç, level 10 → 2.0)
 * matchEngine.ts / types.ts'teki INJURY_RECOVERY_SPEED ile entegre (artık enhancedMatchEngine.ts)
 */
export function getInjuryRecoverySpeed(medicalLevel: number): number {
  return 1.0 + medicalLevel * 0.1;
}

/**
 * Gözlemci Ofisi → Gözlemci slot sayısı
 * Temel 1 slot + seviye başına 1 ek slot (level 10 → 11 slot)
 * GÖREV 7 ile entegre: Scout Office slot sayısı
 */
export function getScoutSlotCount(scoutLevel: number): number {
  return 1 + scoutLevel;
}

/**
 * VIP Localar → VIP gelir çarpanı
 * Seviye başına +50.000 €/maç temel gelir
 */
export function getVIPRevenuePerMatch(vipLevel: number): number {
  return vipLevel * 50000;
}

/**
 * Merchandising → Günlük pasif gelir
 * Seviye başına +20.000 €/gün
 */
export function getStoreDailyRevenue(storeLevel: number): number {
  return storeLevel * 20000;
}

/**
 * Hibrit Çim → Pas isabeti bonusu
 * Seviye başına +%2 (level 10 → +%20)
 */
export function getPitchPassAccuracyBonus(pitchLevel: number): number {
  return pitchLevel * 0.02;
}

/**
 * Basın ve Multimedya → Sponsorluk çarpanı
 * Seviye başına +%3 (level 10 → +%30)
 */
export function getMediaSponsorMultiplier(mediaLevel: number): number {
  return 1.0 + mediaLevel * 0.03;
}

/**
 * Aydınlatma → Gece maçı performans çarpanı
 * Seviye başına +%3 (level 10 → +%30)
 */
export function getLightingNightBonus(lightingLevel: number): number {
  return 1.0 + lightingLevel * 0.03;
}

/**
 * Isıtma → Kış performans kaybı azaltma
 * Seviye başına -%5 kayıp azaltma (level 10 → -%50)
 */
export function getHeatingWinterProtection(heatingLevel: number): number {
  return Math.min(0.5, heatingLevel * 0.05);
}

/**
 * Skor Tabelası → Taraftar etkileşimi çarpanı
 * Seviye başına +%2 (level 10 → +%20)
 */
export function getScoreboardFanBonus(scoreboardLevel: number): number {
  return 1.0 + scoreboardLevel * 0.02;
}

/**
 * Genel seviye etkisi fonksiyonu — herhangi bir tesis ID'si ve seviyesi için
 * etki açıklaması ve sayısal değer döndürür.
 * StadiumTab.tsx önizlemesinde kullanılır.
 */
// ═══════════════════════════════════════════════════
//  STADIUM EFFECTS — Maç motoruna entegrasyon tipi
// ═══════════════════════════════════════════════════

export interface StadiumEffects {
  /** Aydınlatma seviyesi (0-10) */
  lightingLevel: number;
  /** Isıtma sistemi seviyesi (0-10) */
  heatingLevel: number;
  /** Seyirci kapasitesi seviyesi (0-10) */
  capacityLevel: number;
  /** Skor tabelası seviyesi (0-10) */
  scoreboardLevel: number;
  /** Çim kalitesi seviyesi (0-10) */
  pitchLevel: number;
  /** Sağlık tesisi seviyesi (0-10) */
  medicalLevel: number;
  /** Medya tesisi seviyesi (0-10) */
  mediaLevel: number;
  /** Gece maçı mı? */
  isNightMatch: boolean;
  /** Kış maçı mı? */
  isWinterMatch: boolean;
  /** Maç etkileri (hesaplanmış) */
  effects: {
    /** Ev sahibine şut isabeti bonusu (gece + lighting=10 → +0.08) */
    homeShootingBonus: number;
    /** Deplasmana pas isabeti cezası (gece + lighting=10 → -0.05) */
    awayPassingPenalty: number;
    /** Ev sahibi kondisyon koruma (kış + heating≥8 → 0.0-0.15) */
    homeConditionPreservation: number;
    /** Ev sahibi moral bonusu (capacity + scoreboard + pitch) */
    homeMoraleBonus: number;
    /** Deplasman moral cezası (kapasite baskısı) */
    awayMoralePenalty: number;
    /** Pas isabeti bonusu (pitch seviyesi) */
    passingAccuracyBonus: number;
    /** GK refleks bonusu (lighting=10 → +0.10) */
    gkReflexBonus: number;
    /** Sakatlık riski azaltma (medical seviyesi) */
    injuryRiskReduction: number;
  };
}

/**
 * Stadyum seviyelerinden maç etkilerini hesaplar.
 * user_facilities tablosundan gelen seviyeleri kullanır.
 */
export function computeStadiumEffects(
  facilityLevels: Record<string, number>,
  isNightMatch: boolean = false,
  isWinterMatch: boolean = false,
): StadiumEffects {
  const lightingLevel = facilityLevels['lighting'] ?? 0;
  const heatingLevel = facilityLevels['heating'] ?? 0;
  const capacityLevel = facilityLevels['capacity'] ?? 0;
  const scoreboardLevel = facilityLevels['scoreboards'] ?? 0;
  const pitchLevel = facilityLevels['pitch'] ?? 0;
  const medicalLevel = facilityLevels['medical'] ?? 0;
  const mediaLevel = facilityLevels['media'] ?? 0;

  // Gece maçı + aydınlatma seviyesi 10 → ev sahibine +%8 şut isabeti
  const homeShootingBonus = (isNightMatch && lightingLevel >= 10) ? 0.08 
    : isNightMatch ? lightingLevel * 0.005 : 0;
  
  // Gece maçı + aydınlatma seviyesi 10 → deplasmana -%5 pas isabeti
  const awayPassingPenalty = (isNightMatch && lightingLevel >= 10) ? -0.05
    : isNightMatch ? -(lightingLevel * 0.003) : 0;

  // Kış maçı + ısıtma sistemi 8+ → ev sahibi kondisyon koruma
  const homeConditionPreservation = (isWinterMatch && heatingLevel >= 8)
    ? 0.10 + (heatingLevel - 8) * 0.025
    : isWinterMatch ? heatingLevel * 0.005 : 0;

  // Seyirci baskısı → ev sahibi moral bonusu
  const homeMoraleBonus = 
    capacityLevel * 0.3 +    // Kapasite → moral
    scoreboardLevel * 0.2 +  // Skor tabelası → baskı
    pitchLevel * 0.1 +       // Çim → özgüven
    mediaLevel * 0.15;       // Medya → prestij

  // Deplasman moral cezası (kapasite + skor tabelası)
  const awayMoralePenalty = -(capacityLevel * 0.2 + scoreboardLevel * 0.15);

  // Pas isabeti bonusu (pitch seviyesi)
  const passingAccuracyBonus = getPitchPassAccuracyBonus(pitchLevel);

  // GK refleks bonusu (lighting=10)
  const gkReflexBonus = lightingLevel >= 10 ? 0.10 : lightingLevel * 0.008;

  // Sakatlık riski azaltma (medical seviyesi)
  const injuryRiskReduction = medicalLevel * 0.005;

  return {
    lightingLevel,
    heatingLevel,
    capacityLevel,
    scoreboardLevel,
    pitchLevel,
    medicalLevel,
    mediaLevel,
    isNightMatch,
    isWinterMatch,
    effects: {
      homeShootingBonus,
      awayPassingPenalty,
      homeConditionPreservation,
      homeMoraleBonus,
      awayMoralePenalty,
      passingAccuracyBonus,
      gkReflexBonus,
      injuryRiskReduction,
    },
  };
}

/**
 * Stadyum efektlerini maç motoruna uygular.
 * Ev sahibi ve deplasman takımlarının oyuncularına efektleri dağıtır.
 */
export function applyStadiumEffects(
  homeSquad: any[],
  awaySquad: any[],
  stadiumEffects: StadiumEffects,
): { modifiedHomeSquad: any[]; modifiedAwaySquad: any[] } {
  const eff = stadiumEffects.effects;
  
  const modifiedHomeSquad = homeSquad.map(p => {
    const updated = { ...p };
    // Ev sahibi şut isabeti bonusu
    if (updated.shooting !== undefined) {
      updated.shooting = Math.min(99, updated.shooting + Math.round(updated.shooting * eff.homeShootingBonus));
    }
    if (updated.finishing !== undefined) {
      updated.finishing = Math.min(99, updated.finishing + Math.round(updated.finishing * eff.homeShootingBonus));
    }
    // Pas isabeti bonusu (çim kalitesi)
    if (updated.passing !== undefined) {
      updated.passing = Math.min(99, updated.passing + Math.round(updated.passing * eff.passingAccuracyBonus));
    }
    // Moral bonusu
    if (updated.morale !== undefined) {
      updated.morale = Math.min(100, updated.morale + eff.homeMoraleBonus);
    }
    // GK refleks bonusu
    if (updated.position === 'GK' && updated.goalkeeping !== undefined) {
      updated.goalkeeping = Math.min(99, updated.goalkeeping + Math.round(updated.goalkeeping * eff.gkReflexBonus));
    }
    return updated;
  });

  const modifiedAwaySquad = awaySquad.map(p => {
    const updated = { ...p };
    // Deplasman pas isabeti cezası
    if (updated.passing !== undefined) {
      updated.passing = Math.max(1, updated.passing + Math.round(updated.passing * eff.awayPassingPenalty));
    }
    // Deplasman moral cezası
    if (updated.morale !== undefined) {
      updated.morale = Math.max(1, updated.morale + eff.awayMoralePenalty);
    }
    return updated;
  });

  return { modifiedHomeSquad, modifiedAwaySquad };
}

/**
 * Stub — Supabase entegrasyonu henüz aktif değil.
 * Mock modda boş obje döner.
 */
export async function fetchStadiumLevels(_profileId: string): Promise<Record<string, number>> {
  return {};
}

/**
 * Maç tarihine göre deterministik hava durumu hesaplar.
 * LCG algoritması ile seed → roll; ay bazlı olasılık dağılımı uygulanır.
 * Fikstür sayfası ve maç motoru aynı sonucu almak için bu fonksiyonu kullanır.
 */
export function getWeatherForDate(dateStr: string): 'sunny' | 'rainy' | 'snowy' | 'windy' {
  const d = new Date(dateStr);
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const roll = ((seed * 9301 + 49297) % 233280) / 233280;
  const month = d.getMonth() + 1;

  // Yaz (Haz-Tem-Ağu): çoğunlukla güneşli
  if (month >= 6 && month <= 8) {
    return roll < 0.85 ? 'sunny' : 'rainy';
  }

  // Kış (Ara-Oca-Şub): kar, yağmur, rüzgar olasılıkları yüksek
  if (month === 12 || month <= 2) {
    if (roll < 0.3) return 'snowy';
    if (roll < 0.6) return 'rainy';
    return 'windy';
  }

  // Geçiş mevsimleri (İlkbahar/Sonbahar)
  if (roll < 0.50) return 'sunny';
  if (roll < 0.70) return 'rainy';
  if (roll < 0.85) return 'windy';
  return 'snowy';
}

/**
 * Maç tarihinden gece/kış maçı tespiti yapar.
 */
export function detectMatchConditions(matchDate?: string, matchTime?: string): {
  isNightMatch: boolean;
  isWinterMatch: boolean;
} {
  const date = matchDate ? new Date(matchDate) : new Date();
  const hour = matchTime ? parseInt(matchTime.split(':')[0]) : date.getHours();
  const month = date.getMonth(); // 0-indexed: Dec=11, Jan=0, Feb=1

  // Gece maçı: 18:00 ve sonrası
  const isNightMatch = hour >= 18;

  // Kış maçı: Aralık, Ocak, Şubat
  const isWinterMatch = month === 11 || month === 0 || month === 1;

  return { isNightMatch, isWinterMatch };
}

export function getLevelEffect(facilityId: string, level: number): LevelEffectResult | null {
  try {
    switch (facilityId) {
      case 'capacity':
        return {
          key: 'ticketRevenueMultiplier',
          label: 'Bilet Geliri Çarpanı',
          value: getStadiumTicketRevenueMultiplier(level),
        };
      case 'lighting':
        return {
          key: 'nightPerformanceMultiplier',
          label: 'Gece Maçı Performans Çarpanı',
          value: getLightingNightBonus(level),
        };
      case 'scoreboards':
        return {
          key: 'fanEngagementMultiplier',
          label: 'Taraftar Etkileşimi Çarpanı',
          value: getScoreboardFanBonus(level),
        };
      case 'heating':
        return {
          key: 'winterProtection',
          label: 'Kış Performans Koruması',
          value: getHeatingWinterProtection(level),
        };
      case 'vip':
        return {
          key: 'vipRevenuePerMatch',
          label: 'VIP Gelir / Maç (€)',
          value: getVIPRevenuePerMatch(level),
        };
      case 'store':
        return {
          key: 'dailyPassiveIncome',
          label: 'Günlük Pasif Gelir (€)',
          value: getStoreDailyRevenue(level),
        };
      case 'pitch':
        return {
          key: 'passAccuracyBonus',
          label: 'Pas İsabeti Bonusu',
          value: getPitchPassAccuracyBonus(level),
        };
      case 'media':
        return {
          key: 'sponsorMultiplier',
          label: 'Sponsorluk Çarpanı',
          value: getMediaSponsorMultiplier(level),
        };
      case 'academy':
        return {
          key: 'academyQualityMultiplier',
          label: 'Akademi Kalite Çarpanı',
          value: getAcademyQualityMultiplier(level),
        };
      case 'medical':
        return {
          key: 'injuryRecoverySpeed',
          label: 'Sakatlık İyileşme Hızı',
          value: getInjuryRecoverySpeed(level),
        };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
