/**
 * v2.9.76: Ödül Sistemi — 14 kategori + 4 eski takım ödülü
 *
 * A) Sezon Sonu Sıralama Ödülleri (top-3, endSeason'da hesaplanır):
 *    golden_boot, playmaker, player_of_season, motm, golden_glove,
 *    defender_of_season, midfielder_of_season, wonderkid, veteran_of_season,
 *    cup_top_scorer, intl_player_of_tournament
 *
 * B) Milestone (Kariyer Eşiği) Ödülleri:
 *    hattrick_hero, century_club, iron_man
 *
 * C) Eski Takım Ödülleri (geri uyumluluk):
 *    most_appearances, league_champion, cup_champion, champions_league_winner
 */

export type AwardTier = "gold" | "silver" | "bronze";

export type AwardKey =
  // A) Sezon sonu (11)
  | "golden_boot"
  | "playmaker"
  | "player_of_season"
  | "motm"
  | "golden_glove"
  | "defender_of_season"
  | "midfielder_of_season"
  | "wonderkid"
  | "veteran_of_season"
  | "cup_top_scorer"
  | "intl_player_of_tournament"
  // B) Milestone (3)
  | "hattrick_hero"
  | "century_club"
  | "iron_man"
  // C) Eski takım ödülleri (4 — geri uyumluluk)
  | "most_appearances"
  | "league_champion"
  | "cup_champion"
  | "champions_league_winner"
  // Eski sezon sonu bireysel (geri uyumluluk — yeni adlarla de yazılır)
  | "top_scorer"
  | "top_assist"
  | "mvp"
  | "best_goalkeeper";

export interface AwardCategory {
  key: AwardKey;
  trName: string;
  enName: string;
  trDesc: string;
  enDesc: string;
  isMilestone: boolean;       // true = eşik bazlı (B), false = sıralama bazlı (A)
  positionRestriction?: "GK" | "DEF" | "MID" | "FWD"; // sadece bu pozisyon grubu
  ageRestriction?: { min?: number; max?: number };     // wonderkid ≤21, veteran ≥30
  scope: "league" | "cup" | "career";  // hesaplama kapsamı
  // v2.9.90: Tier bazlı ad varyantları — gold/silver/bronze için ayrı isimler.
  // Tanımlıysa getAwardDisplayName bu değerleri kullanır (oto-türetme yerine).
  // Sadece sıralama bazlı ödüller (isMilestone: false) için anlamlı.
  // Milestone ödüller tek isim + tier rozeti yeterli (eşik bazlı).
  tierVariants?: {
    gold?: { tr: string; en: string };
    silver?: { tr: string; en: string };
    bronze?: { tr: string; en: string };
  };
}

/**
 * 14 yeni + 4 eski = 18 kategori metadata'sı.
 * TR/EN isimler + açıklamalar.
 */
export const AWARD_CATEGORIES: Record<AwardKey, AwardCategory> = {
  // ═══ A) SEZON SONU SIRALAMA ÖDÜLLERİ (11) ═══
  // v2.9.90: Her ödüle tierVariants eklendi — gold/silver/bronze için ayrı isimler.
  // Eski sistemde tüm tier'lar aynı trName'i kullanıyordu → mantıksız (Altın Krampon GÜMÜŞ gibi).
  golden_boot: {
    key: "golden_boot", trName: "Altın Krampon", enName: "Golden Boot",
    trDesc: "Lig maçlarında en çok gol atan oyuncu", enDesc: "Top scorer in league matches",
    isMilestone: false, scope: "league",
    tierVariants: {
      gold: { tr: "Altın Krampon", en: "Golden Boot" },
      silver: { tr: "Gümüş Krampon", en: "Silver Boot" },
      bronze: { tr: "Bronz Krampon", en: "Bronze Boot" },
    },
  },
  playmaker: {
    key: "playmaker", trName: "Asist Kralı", enName: "Playmaker",
    trDesc: "Lig maçlarında en çok asist yapan oyuncu", enDesc: "Top assist provider in league matches",
    isMilestone: false, scope: "league",
    tierVariants: {
      gold: { tr: "Altın Asist Kralı", en: "Golden Playmaker" },
      silver: { tr: "Gümüş Asist Kralı", en: "Silver Playmaker" },
      bronze: { tr: "Bronz Asist Kralı", en: "Bronze Playmaker" },
    },
  },
  player_of_season: {
    key: "player_of_season", trName: "Sezonun Oyuncusu", enName: "Player of the Season",
    trDesc: "Maç başı ortalama rating'de en yüksek (min %60 forma)", enDesc: "Highest avg match rating (min 60% appearances)",
    isMilestone: false, scope: "league",
    tierVariants: {
      gold: { tr: "Sezonun Oyuncusu", en: "Player of the Season" },
      silver: { tr: "Sezonun İkincisi", en: "Runner-Up Player of the Season" },
      bronze: { tr: "Sezonun Üçüncüsü", en: "Third Player of the Season" },
    },
  },
  motm: {
    key: "motm", trName: "Maçın Adamı Kralı", enName: "Man of the Match King",
    trDesc: "En çok Maçın Adamı seçilen oyuncu", enDesc: "Most Man of the Match awards",
    isMilestone: false, scope: "league",
    tierVariants: {
      gold: { tr: "Altın Maçın Adamı", en: "Golden Man of the Match" },
      silver: { tr: "Gümüş Maçın Adamı", en: "Silver Man of the Match" },
      bronze: { tr: "Bronz Maçın Adamı", en: "Bronze Man of the Match" },
    },
  },
  golden_glove: {
    key: "golden_glove", trName: "Altın Eldiven", enName: "Golden Glove",
    trDesc: "En çok clean sheet + kurtarış (sadece kaleci)", enDesc: "Most clean sheets + saves (GK only)",
    isMilestone: false, positionRestriction: "GK", scope: "league",
    tierVariants: {
      gold: { tr: "Altın Eldiven", en: "Golden Glove" },
      silver: { tr: "Gümüş Eldiven", en: "Silver Glove" },
      bronze: { tr: "Bronz Eldiven", en: "Bronze Glove" },
    },
  },
  defender_of_season: {
    key: "defender_of_season", trName: "Sezonun Savunmacısı", enName: "Defender of the Season",
    trDesc: "Ort. rating + müdahale/top çalma (sadece defans)", enDesc: "Avg rating + tackles/interceptions (DEF only)",
    isMilestone: false, positionRestriction: "DEF", scope: "league",
    tierVariants: {
      gold: { tr: "Sezonun Savunmacısı", en: "Defender of the Season" },
      silver: { tr: "Sezonun İkinci Savunmacısı", en: "Runner-Up Defender of the Season" },
      bronze: { tr: "Sezonun Üçüncü Savunmacısı", en: "Third Defender of the Season" },
    },
  },
  midfielder_of_season: {
    key: "midfielder_of_season", trName: "Sezonun Orta Sahası", enName: "Midfielder of the Season",
    trDesc: "Pas isabeti + asist + oyun kurma (sadece orta saha)", enDesc: "Pass accuracy + assists + playmaking (MID only)",
    isMilestone: false, positionRestriction: "MID", scope: "league",
    tierVariants: {
      gold: { tr: "Sezonun Orta Sahası", en: "Midfielder of the Season" },
      silver: { tr: "Sezonun İkinci Orta Sahası", en: "Runner-Up Midfielder of the Season" },
      bronze: { tr: "Sezonun Üçüncü Orta Sahası", en: "Third Midfielder of the Season" },
    },
  },
  wonderkid: {
    key: "wonderkid", trName: "Yılın Yeteneği", enName: "Wonderkid",
    trDesc: "En yüksek ort. rating (21 yaş ve altı)", enDesc: "Highest avg rating (21 and under)",
    isMilestone: false, ageRestriction: { max: 21 }, scope: "league",
    tierVariants: {
      gold: { tr: "Yılın Altın Yeteneği", en: "Golden Wonderkid" },
      silver: { tr: "Yılın Gümüş Yeteneği", en: "Silver Wonderkid" },
      bronze: { tr: "Yılın Bronz Yeteneği", en: "Bronze Wonderkid" },
    },
  },
  veteran_of_season: {
    // v2.9.90 FIX: typo düzeltildi — "Veteramı" → "Veteranı"
    key: "veteran_of_season", trName: "Sezonun Veteranı", enName: "Veteran of the Season",
    trDesc: "En yüksek ort. rating (30 yaş ve üzeri)", enDesc: "Highest avg rating (30 and over)",
    isMilestone: false, ageRestriction: { min: 30 }, scope: "league",
    tierVariants: {
      gold: { tr: "Sezonun Veteranı", en: "Veteran of the Season" },
      silver: { tr: "Sezonun İkinci Veteranı", en: "Runner-Up Veteran of the Season" },
      bronze: { tr: "Sezonun Üçüncü Veteranı", en: "Third Veteran of the Season" },
    },
  },
  cup_top_scorer: {
    key: "cup_top_scorer", trName: "Kupa Gol Kralı", enName: "Cup Top Scorer",
    trDesc: "Ulusal Kupa + Şampiyonlar Ligi toplam en çok gol", enDesc: "Most goals in Cup + Champions League combined",
    isMilestone: false, scope: "cup",
    tierVariants: {
      gold: { tr: "Altın Kupa Gol Kralı", en: "Golden Cup Top Scorer" },
      silver: { tr: "Gümüş Kupa Gol Kralı", en: "Silver Cup Top Scorer" },
      bronze: { tr: "Bronz Kupa Gol Kralı", en: "Bronze Cup Top Scorer" },
    },
  },
  intl_player_of_tournament: {
    key: "intl_player_of_tournament", trName: "Turnuvanın Yıldızı", enName: "Int'l Player of the Tournament",
    trDesc: "Şampiyonlar Ligi'nde en yüksek rating/MVP", enDesc: "Highest rating/MVP in Champions League",
    isMilestone: false, scope: "cup",
    tierVariants: {
      gold: { tr: "Turnuvanın Altın Yıldızı", en: "Golden Tournament Star" },
      silver: { tr: "Turnuvanın Gümüş Yıldızı", en: "Silver Tournament Star" },
      bronze: { tr: "Turnuvanın Bronz Yıldızı", en: "Bronze Tournament Star" },
    },
  },

  // ═══ B) MILESTONE ÖDÜLLERİ (3) ═══
  // Milestone ödüller tek isim + tier rozeti yeterli (eşik bazlı: 1/3/5 kez gibi).
  // tierVariants yok — getAwardDisplayName orijinal adı döner.
  hattrick_hero: {
    key: "hattrick_hero", trName: "Hat-Trick Kahramanı", enName: "Hat-Trick Hero",
    trDesc: "Bir maçta 3+ gol — Bronz: 1 kez, Gümüş: 3 kez, Altın: 5+ kez (kariyer)", enDesc: "3+ goals in a match — Bronze: 1, Silver: 3, Gold: 5+ (career)",
    isMilestone: true, scope: "career",
  },
  century_club: {
    key: "century_club", trName: "Yüzyıl Kulübü", enName: "Century Club",
    trDesc: "Kariyer 100 maç/gol — Bronz: 50, Gümüş: 100, Altın: 200", enDesc: "Career 100 matches/goals — Bronze: 50, Silver: 100, Gold: 200",
    isMilestone: true, scope: "career",
  },
  iron_man: {
    key: "iron_man", trName: "Demir Adam", enName: "Iron Man",
    trDesc: "Sakatlanmadan her maçta oyna — Bronz: 1 sezon, Gümüş: 3 üst üste, Altın: 5 üst üste", enDesc: "Play every match without injury — Bronze: 1 season, Silver: 3 consecutive, Gold: 5 consecutive",
    isMilestone: true, scope: "career",
  },

  // ═══ C) ESKİ TAKIM ÖDÜLLERİ (geri uyumluluk, görsel yok) ═══
  // v2.9.90: most_appearances sıralama bazlı → tierVariants eklendi.
  // league_champion/cup_champion/champions_league_winner takım ödülü, tek tier (gold).
  most_appearances: {
    key: "most_appearances", trName: "En Çok Maç Oynayan", enName: "Most Appearances",
    trDesc: "Sezonda en çok maç oynayan oyuncu", enDesc: "Most appearances in the season",
    isMilestone: false, scope: "league",
    tierVariants: {
      gold: { tr: "En Çok Maç Oynayan", en: "Most Appearances" },
      silver: { tr: "İkinci En Çok Maç Oynayan", en: "Runner-Up Most Appearances" },
      bronze: { tr: "Üçüncü En Çok Maç Oynayan", en: "Third Most Appearances" },
    },
  },
  league_champion: {
    key: "league_champion", trName: "Lig Şampiyonu", enName: "League Champion",
    trDesc: "Lig şampiyonu takımın oyuncuları", enDesc: "Players of the league champion team",
    isMilestone: false, scope: "league",
  },
  cup_champion: {
    key: "cup_champion", trName: "Kupa Şampiyonu", enName: "Cup Champion",
    trDesc: "Kupa şampiyonu takımın oyuncuları", enDesc: "Players of the cup champion team",
    isMilestone: false, scope: "cup",
  },
  champions_league_winner: {
    key: "champions_league_winner", trName: "Şampiyonlar Ligi Kazananı", enName: "Champions League Winner",
    trDesc: "Şampiyonlar Ligi şampiyonu takımın oyuncuları", enDesc: "Players of the Champions League winner team",
    isMilestone: false, scope: "cup",
  },

  // ═══ ESKİ BİREYSEL (geri uyumluluk — yeni adlarla eşleştirilir) ═══
  // v2.9.90: top_scorer/top_assist/mvp/best_goalkeeper için tierVariants eklendi.
  // Bu ödüller AWARD_MIGRATION_MAP ile yeni adlara map edilir, ama eski kayıtlar için de düzgün görünsün.
  top_scorer: {
    key: "top_scorer", trName: "Gol Kralı", enName: "Top Scorer",
    trDesc: "Eski ad: golden_boot", enDesc: "Legacy: golden_boot",
    isMilestone: false, scope: "league",
    tierVariants: {
      gold: { tr: "Altın Gol Kralı", en: "Golden Top Scorer" },
      silver: { tr: "Gümüş Gol Kralı", en: "Silver Top Scorer" },
      bronze: { tr: "Bronz Gol Kralı", en: "Bronze Top Scorer" },
    },
  },
  top_assist: {
    key: "top_assist", trName: "Asist Kralı", enName: "Top Assist",
    trDesc: "Eski ad: playmaker", enDesc: "Legacy: playmaker",
    isMilestone: false, scope: "league",
    tierVariants: {
      gold: { tr: "Altın Asist Kralı", en: "Golden Top Assist" },
      silver: { tr: "Gümüş Asist Kralı", en: "Silver Top Assist" },
      bronze: { tr: "Bronz Asist Kralı", en: "Bronze Top Assist" },
    },
  },
  mvp: {
    key: "mvp", trName: "En Değerli Oyuncu", enName: "MVP",
    trDesc: "Eski ad: player_of_season", enDesc: "Legacy: player_of_season",
    isMilestone: false, scope: "league",
    tierVariants: {
      gold: { tr: "En Değerli Oyuncu", en: "MVP" },
      silver: { tr: "İkinci En Değerli Oyuncu", en: "Runner-Up MVP" },
      bronze: { tr: "Üçüncü En Değerli Oyuncu", en: "Third MVP" },
    },
  },
  best_goalkeeper: {
    key: "best_goalkeeper", trName: "En İyi Kaleci", enName: "Best Goalkeeper",
    trDesc: "Eski ad: golden_glove", enDesc: "Legacy: golden_glove",
    isMilestone: false, scope: "league",
    tierVariants: {
      gold: { tr: "Altın Eldiven", en: "Golden Glove" },
      silver: { tr: "Gümüş Eldiven", en: "Silver Glove" },
      bronze: { tr: "Bronz Eldiven", en: "Bronze Glove" },
    },
  },
};

/**
 * Eski awardType → yeni awardKey mapping (migration için)
 */
export const AWARD_MIGRATION_MAP: Record<string, AwardKey> = {
  top_scorer: "golden_boot",
  top_assist: "playmaker",
  mvp: "player_of_season",
  best_goalkeeper: "golden_glove",
  most_motm: "motm",
};

/**
 * Ödül görsel yolu — public/awards/award_{key}_{tier}.webp
 * Eski ödüller (league_champion vb.) için görsel yok → undefined döner.
 */
export function getAwardImagePath(key: string, tier: AwardTier): string | null {
  // Sadece 14 yeni kategorinin görseli var
  const HAS_IMAGE: AwardKey[] = [
    "golden_boot", "playmaker", "player_of_season", "motm", "golden_glove",
    "defender_of_season", "midfielder_of_season", "wonderkid", "veteran_of_season",
    "cup_top_scorer", "intl_player_of_tournament",
    "hattrick_hero", "century_club", "iron_man",
  ];
  // Migrated key
  const migratedKey = AWARD_MIGRATION_MAP[key] ?? key;
  if (!HAS_IMAGE.includes(migratedKey as AwardKey)) return null;
  return `./awards/award_${migratedKey}_${tier}.webp`;
}

/**
 * rank → tier dönüşümü (geri uyumluluk)
 */
export function rankToTier(rank: number): AwardTier {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  return "bronze";
}

/**
 * tier → rank dönüşümü
 */
export function tierToRank(tier: AwardTier): number {
  if (tier === "gold") return 1;
  if (tier === "silver") return 2;
  return 3;
}

/**
 * v2.9.89 (Madde B): Ödül adını tier'a göre döndür.
 * v2.9.90: tierVariants opsiyonel alanı eklendi — tanımlıysa onu kullanır.
 *
 * Öncelik sırası:
 *   1. category.tierVariants[tier] varsa → onu kullan (en güvenilir)
 *   2. "Altın X" formatı → "Gümüş X" / "Bronz X" oto-türet
 *   3. Diğer → orijinal ad + parantez içinde tier etiketi
 *
 * Gold tier her zaman orijinal adı döner (tierVariants gold yoksa).
 */
export function getAwardDisplayName(key: string, tier: AwardTier, locale: "tr" | "en" = "tr"): string {
  const migratedKey = AWARD_MIGRATION_MAP[key] ?? key;
  const category = AWARD_CATEGORIES[migratedKey as AwardKey];
  if (!category) return key;

  // v2.9.90: tierVariants tanımlıysa ve bu tier için değeri varsa → onu kullan
  if (category.tierVariants) {
    const variant = category.tierVariants[tier];
    if (variant) {
      return locale === "tr" ? variant.tr : variant.en;
    }
  }

  const name = locale === "tr" ? category.trName : category.enName;

  // Gold tier → orijinal ad (değişiklik yok)
  if (tier === "gold") return name;

  // "Altın X" / "Golden X" formatı → tier'a göre değiştir (fallback oto-türetme)
  if (locale === "tr") {
    if (name.startsWith("Altın ")) {
      const rest = name.slice(6); // "Altın " sonrası
      if (tier === "silver") return `Gümüş ${rest}`;
      if (tier === "bronze") return `Bronz ${rest}`;
    }
  } else {
    if (name.startsWith("Golden ")) {
      const rest = name.slice(7); // "Golden " sonrası
      if (tier === "silver") return `Silver ${rest}`;
      if (tier === "bronze") return `Bronze ${rest}`;
    }
  }

  // Diğer ödüller → orijinal ad + parantez içinde tier etiketi
  const tierLabel = locale === "tr"
    ? (tier === "silver" ? "Gümüş" : "Bronz")
    : (tier === "silver" ? "Silver" : "Bronze");
  return `${name} (${tierLabel})`;
}

/**
 * Market value çarpanı — sadece en yüksek tier uygulanır (kümülatif değil)
 */
export const AWARD_MARKET_VALUE_MULT: Record<AwardTier, number> = {
  gold: 1.12,   // +%12
  silver: 1.06, // +%6
  bronze: 1.03, // +%3
};

/**
 * Milestone ödülleri için market value çarpanı (daha düşük)
 */
export const MILESTONE_MARKET_VALUE_MULT: Record<AwardTier, number> = {
  gold: 1.06,   // +%6
  silver: 1.03, // +%3
  bronze: 1.01, // +%1
};

/**
 * Milestone eşikleri
 */
export const MILESTONE_THRESHOLDS = {
  hattrick_hero: { bronze: 1, silver: 3, gold: 5 },
  century_club: { bronze: 50, silver: 100, gold: 200 },
  iron_man: { bronze: 1, silver: 3, gold: 5 }, // üst üste sezon sayısı
};
