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
}

/**
 * 14 yeni + 4 eski = 18 kategori metadata'sı.
 * TR/EN isimler + açıklamalar.
 */
export const AWARD_CATEGORIES: Record<AwardKey, AwardCategory> = {
  // ═══ A) SEZON SONU SIRALAMA ÖDÜLLERİ (11) ═══
  golden_boot: {
    key: "golden_boot", trName: "Altın Krampon", enName: "Golden Boot",
    trDesc: "Lig maçlarında en çok gol atan oyuncu", enDesc: "Top scorer in league matches",
    isMilestone: false, scope: "league",
  },
  playmaker: {
    key: "playmaker", trName: "Asist Kralı", enName: "Playmaker",
    trDesc: "Lig maçlarında en çok asist yapan oyuncu", enDesc: "Top assist provider in league matches",
    isMilestone: false, scope: "league",
  },
  player_of_season: {
    key: "player_of_season", trName: "Sezonun Oyuncusu", enName: "Player of the Season",
    trDesc: "Maç başı ortalama rating'de en yüksek (min %60 forma)", enDesc: "Highest avg match rating (min 60% appearances)",
    isMilestone: false, scope: "league",
  },
  motm: {
    key: "motm", trName: "Maçın Adamı", enName: "Man of the Match",
    trDesc: "En çok Maçın Adamı seçilen oyuncu", enDesc: "Most Man of the Match awards",
    isMilestone: false, scope: "league",
  },
  golden_glove: {
    key: "golden_glove", trName: "Altın Eldiven", enName: "Golden Glove",
    trDesc: "En çok clean sheet + kurtarış (sadece kaleci)", enDesc: "Most clean sheets + saves (GK only)",
    isMilestone: false, positionRestriction: "GK", scope: "league",
  },
  defender_of_season: {
    key: "defender_of_season", trName: "Sezonun Savunmacısı", enName: "Defender of the Season",
    trDesc: "Ort. rating + müdahale/top çalma (sadece defans)", enDesc: "Avg rating + tackles/interceptions (DEF only)",
    isMilestone: false, positionRestriction: "DEF", scope: "league",
  },
  midfielder_of_season: {
    key: "midfielder_of_season", trName: "Sezonun Orta Sahası", enName: "Midfielder of the Season",
    trDesc: "Pas isabeti + asist + oyun kurma (sadece orta saha)", enDesc: "Pass accuracy + assists + playmaking (MID only)",
    isMilestone: false, positionRestriction: "MID", scope: "league",
  },
  wonderkid: {
    key: "wonderkid", trName: "Yılın Yeteneği", enName: "Wonderkid",
    trDesc: "En yüksek ort. rating (21 yaş ve altı)", enDesc: "Highest avg rating (21 and under)",
    isMilestone: false, ageRestriction: { max: 21 }, scope: "league",
  },
  veteran_of_season: {
    key: "veteran_of_season", trName: "Sezonun Veteramı", enName: "Veteran of the Season",
    trDesc: "En yüksek ort. rating (30 yaş ve üzeri)", enDesc: "Highest avg rating (30 and over)",
    isMilestone: false, ageRestriction: { min: 30 }, scope: "league",
  },
  cup_top_scorer: {
    key: "cup_top_scorer", trName: "Kupa Gol Kralı", enName: "Cup Top Scorer",
    trDesc: "Ulusal Kupa + Şampiyonlar Ligi toplam en çok gol", enDesc: "Most goals in Cup + Champions League combined",
    isMilestone: false, scope: "cup",
  },
  intl_player_of_tournament: {
    key: "intl_player_of_tournament", trName: "Turnuvanın Yıldızı", enName: "Int'l Player of the Tournament",
    trDesc: "Şampiyonlar Ligi'nde en yüksek rating/MVP", enDesc: "Highest rating/MVP in Champions League",
    isMilestone: false, scope: "cup",
  },

  // ═══ B) MILESTONE ÖDÜLLERİ (3) ═══
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
  most_appearances: {
    key: "most_appearances", trName: "En Çok Maç Oynayan", enName: "Most Appearances",
    trDesc: "Sezonda en çok maç oynayan oyuncu", enDesc: "Most appearances in the season",
    isMilestone: false, scope: "league",
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
  top_scorer: { key: "top_scorer", trName: "Gol Kralı", enName: "Top Scorer", trDesc: "Eski ad: golden_boot", enDesc: "Legacy: golden_boot", isMilestone: false, scope: "league" },
  top_assist: { key: "top_assist", trName: "Asist Kralı", enName: "Top Assist", trDesc: "Eski ad: playmaker", enDesc: "Legacy: playmaker", isMilestone: false, scope: "league" },
  mvp: { key: "mvp", trName: "En Değerli Oyuncu", enName: "MVP", trDesc: "Eski ad: player_of_season", enDesc: "Legacy: player_of_season", isMilestone: false, scope: "league" },
  best_goalkeeper: { key: "best_goalkeeper", trName: "En İyi Kaleci", enName: "Best Goalkeeper", trDesc: "Eski ad: golden_glove", enDesc: "Legacy: golden_glove", isMilestone: false, scope: "league" },
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
