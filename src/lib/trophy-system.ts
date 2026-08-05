/**
 * v2.9.78: Takım/Kulüp Kupa Sistemi
 *
 * Bu sistem, oyuncu bazlı seasonAwards sisteminden AYRIDIR.
 * Kulüplerin kazandığı LİG/ŞAMPİYONLAR LİGİ/KUPA kupalarını yönetir.
 *
 * Kupa türleri:
 *   - league_champion  : Lig şampiyonu (1.) → trophy_league_champion.webp
 *   - league_runnerup  : Lig 2.si          → trophy_league_runnerup.webp
 *   - league_third     : Lig 3.sü          → trophy_league_third.webp
 *   - champions_league : MLCL şampiyonu    → trophy_champions_league.webp
 *   - special_cup      : Ulusal Kupa şamp. → trophy_special_cup.webp
 *
 * Veri akışı:
 *   endSeason / recordCLResult / recordCupResult
 *     → awardTrophyToClub(clubs, clubId, trophyKey, season, division)
 *     → updatedClubs iade eder (immutable — mevcut state'e dokunmaz)
 *
 * Persist: club.trophies[] Supabase'e club objesiyle birlikte kaydedilir
 * (mevcut cloud-save akışı, ek bir RPC gerektirmez).
 */

import type { Team, Trophy, TrophyKey } from "@/lib/mock/data";
import type { AllLeaguesState, PersistentLeague } from "@/lib/global-leagues";
import type { StandingRow } from "@/lib/mock/season";
import { computeStandings } from "@/lib/mock/season";

// ═══════════════════════════════════════════════════════════════════
// METADATA — kupa isimleri + açıklamaları + görsel yolları
// ═══════════════════════════════════════════════════════════════════

export interface TrophyMeta {
  key: TrophyKey;
  trName: string;
  enName: string;
  trDesc: string;
  enDesc: string;
  imagePath: string;          // public/trophies/{filename}.webp — mevcutsa
  emojiFallback: string;      // görsel yüklenmezse
  tierColor: "gold" | "silver" | "bronze"; // UI vurgu rengi
}

const TROPHY_IMAGE_BASE = "./trophies/";

export const TROPHY_METADATA: Record<TrophyKey, TrophyMeta> = {
  // tier 1 — Süper Lig (ana lig, sayısız dosya adı)
  league_champion: {
    key: "league_champion",
    trName: "Süper Lig Şampiyonu",
    enName: "Super Lig Champion",
    trDesc: "Süper Lig (1. tier) sezonunu 1. sırada tamamlayan takıma verilen şampiyonluk kupası",
    enDesc: "Championship trophy for the team finishing 1st in Super Lig (tier 1)",
    imagePath: `${TROPHY_IMAGE_BASE}trophy_league_champion.webp`,
    emojiFallback: "🏆",
    tierColor: "gold",
  },
  // tier 3 — 2. Lig (dosya üzerinde "2 LEAGUE CHAMPIONSHIP")
  league2_champion: {
    key: "league2_champion",
    trName: "2. Lig Şampiyonu",
    enName: "2. Lig Champion",
    trDesc: "2. Lig (3. tier) sezonunu 1. sırada tamamlayan takıma verilen şampiyonluk kupası",
    enDesc: "Championship trophy for the team finishing 1st in 2. Lig (tier 3)",
    imagePath: `${TROPHY_IMAGE_BASE}trophy_league2_champion.png`,
    emojiFallback: "🏆",
    tierColor: "gold",
  },
  // tier 4 — 3. Lig (dosya üzerinde "3RD LEAGUE CHAMPIONSHIP")
  league3_champion: {
    key: "league3_champion",
    trName: "3. Lig Şampiyonu",
    enName: "3. Lig Champion",
    trDesc: "3. Lig (4. tier) sezonunu 1. sırada tamamlayan takıma verilen şampiyonluk kupası",
    enDesc: "Championship trophy for the team finishing 1st in 3. Lig (tier 4)",
    imagePath: `${TROPHY_IMAGE_BASE}trophy_league3_champion.png`,
    emojiFallback: "🏆",
    tierColor: "gold",
  },
  // tier 2 — 1. Lig (dosya üzerinde "4th LEAGUE CHAMPIONSHIP" — kullanıcının gönderdiği dosya)
  league4_champion: {
    key: "league4_champion",
    trName: "1. Lig Şampiyonu",
    enName: "1. Lig Champion",
    trDesc: "1. Lig (2. tier) sezonunu 1. sırada tamamlayan takıma verilen şampiyonluk kupası",
    enDesc: "Championship trophy for the team finishing 1st in 1. Lig (tier 2)",
    imagePath: `${TROPHY_IMAGE_BASE}trophy_league4_champion.png`,
    emojiFallback: "🏆",
    tierColor: "gold",
  },
  league_runnerup: {
    key: "league_runnerup",
    trName: "Lig İkincisi",
    enName: "League Runner-up",
    trDesc: "Lig sezonunu 2. sırada tamamlayan takıma verilen kupa",
    enDesc: "Trophy awarded to the team finishing 2nd in the league",
    imagePath: `${TROPHY_IMAGE_BASE}trophy_league_runnerup.webp`,
    emojiFallback: "🥈",
    tierColor: "silver",
  },
  league_third: {
    key: "league_third",
    trName: "Lig Üçüncüsü",
    enName: "League Third Place",
    trDesc: "Lig sezonunu 3. sırada tamamlayan takıma verilen kupa",
    enDesc: "Trophy awarded to the team finishing 3rd in the league",
    imagePath: `${TROPHY_IMAGE_BASE}trophy_league_third.webp`,
    emojiFallback: "🥉",
    tierColor: "bronze",
  },
  champions_league: {
    key: "champions_league",
    trName: "Şampiyonlar Ligi Kupası",
    enName: "Champions League Trophy",
    trDesc: "Şampiyonlar Ligi (MLCL) finalini kazanan takıma verilen kupa",
    enDesc: "Trophy awarded to the Champions League (MLCL) winner",
    imagePath: `${TROPHY_IMAGE_BASE}trophy_champions_league.webp`,
    emojiFallback: "🌍",
    tierColor: "gold",
  },
  special_cup: {
    key: "special_cup",
    trName: "Ulusal Kupa",
    enName: "National Cup",
    trDesc: "Ulusal Kupa turnuvasının finalini kazanan takıma verilen kupa",
    enDesc: "Trophy awarded to the National Cup winner",
    imagePath: `${TROPHY_IMAGE_BASE}trophy_special_cup.webp`,
    emojiFallback: "🏆",
    tierColor: "gold",
  },
};

// ═══════════════════════════════════════════════════════════════════
// DIVISION KIMLIKLERI — her lig seviyesi için unique string
// ═══════════════════════════════════════════════════════════════════

/**
 * Lig seviyesine göre division string döndürür.
 *   tier 1 → "super_lig"
 *   tier 2 → "1_lig"
 *   tier 3 → "2_lig"
 *   tier 4 → "3_lig"
 */
export function getLeagueDivision(tier: number, department?: number): string {
  switch (tier) {
    case 1: return "super_lig";
    case 2: return "1_lig";
    case 3: return "2_lig";
    case 4: return "3_lig";
    case 5: return department ? `amateur_d${department}` : "amateur";
    default: return `tier_${tier}`;
  }
}

/**
 * Division string'den okunabilir lig adı üretir (UI için).
 */
export function getDivisionDisplayName(division: string, locale: "tr" | "en" = "tr"): string {
  const map: Record<string, { tr: string; en: string }> = {
    super_lig: { tr: "Süper Lig", en: "Super Lig" },
    "1_lig": { tr: "1. Lig", en: "1. Lig" },
    "2_lig": { tr: "2. Lig", en: "2. Lig" },
    "3_lig": { tr: "3. Lig", en: "3. Lig" },
    amateur: { tr: "Amatör Lig", en: "Amateur League" },
    amateur_d1: { tr: "Amatör Lig D1", en: "Amateur D1" },
    amateur_d2: { tr: "Amatör Lig D2", en: "Amateur D2" },
    amateur_d3: { tr: "Amatör Lig D3", en: "Amateur D3" },
    amateur_d4: { tr: "Amatör Lig D4", en: "Amateur D4" },
    champions_league: { tr: "Şampiyonlar Ligi", en: "Champions League" },
    national_cup: { tr: "Ulusal Kupa", en: "National Cup" },
  };
  return map[division]?.[locale] ?? division;
}

// ═══════════════════════════════════════════════════════════════════
// KUPA VERME (AWARD) — immutable helper
// ═══════════════════════════════════════════════════════════════════

/**
 * Belirli bir kulübe kupa ekler — mevcut club.trophies[]'ye yeni Trophy ekler.
 * Immutable: yeni array döndürür, mevcut club objesine dokunmaz.
 *
 * Tekrar önleme: aynı (trophyKey, season, division) kombinasyonu zaten
 * varsa tekrar eklemez (idempotent) — sezon sonu iki kez çağrılırsa
 * çift kupa kaydını önler.
 *
 * @param clubs Mevcut kulüp listesi
 * @param clubId Kupa verilecek kulübe ID
 * @param trophyKey Kupa türü
 * @param season Sezon numarası (seasonNumber)
 * @param division Lig/turnuva kimliği
 * @returns Yeni kulüp listesi (güncellenmiş ile)
 */
export function awardTrophyToClub(
  clubs: Team[],
  clubId: string,
  trophyKey: TrophyKey,
  season: number,
  division: string
): Team[] {
  const now = Date.now();
  return clubs.map((club) => {
    if (club.id !== clubId) return club;

    // Tekrar kontrolü: aynı sezon + aynı division + aynı trophyKey varsa atla
    const existing = club.trophies ?? [];
    const alreadyHas = existing.some(
      (t) =>
        t.trophyKey === trophyKey &&
        t.season === season &&
        t.division === division
    );
    if (alreadyHas) return club;

    const newTrophy: Trophy = {
      trophyKey,
      season,
      division,
      awardedAt: now,
    };

    // Ters kronolojik sırala — en sol kazanılan en üstte (UI'da)
    // v2.9.80 FIX: Sınırsız büyümeyi önle — son 100 kupayı tut.
    // Bir kulüp 50 sezon oynarsa 150+ trophy birikebilirdi (her sezon 3 lig + kupa + CL).
    // 100 yeterli — eski kupalar "kariyer özeti" olarak zaten gösterilir.
    const MAX_TROPHIES = 100;
    const updated = [...existing, newTrophy]
      .sort((a, b) => b.awardedAt - a.awardedAt)
      .slice(0, MAX_TROPHIES);

    return { ...club, trophies: updated };
  });
}

/**
 * Birden fazla kulübe aynı anda kupa verir — tek bir map pass'te.
 * Tipik kullanım: lig sezon sonu, ilk 3 takıma sırayla
 * league_champion / league_runnerup / league_third vermek.
 */
export function awardTrophiesToClubs(
  clubs: Team[],
  awards: Array<{ clubId: string; trophyKey: TrophyKey; division: string }>,
  season: number
): Team[] {
  let result = clubs;
  for (const a of awards) {
    result = awardTrophyToClub(result, a.clubId, a.trophyKey, season, a.division);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// OKUMA — UI selector'lar için yardımcılar
// ═══════════════════════════════════════════════════════════════════

/**
 * Kulübün kupalarını okur — boşsa [] döner.
 * State'ten reaktif okuma için kullanılır (UI selector).
 */
export function getClubTrophies(club: Team | undefined | null): Trophy[] {
  if (!club || !club.trophies) return [];
  return club.trophies;
}

/**
 * Belirli bir trophyKey'den kaç tane olduğunu sayar.
 * Örn: "3x Lig Şampiyonu" göstergesi için.
 */
export function countTrophiesByType(trophies: Trophy[], key: TrophyKey): number {
  return trophies.filter((t) => t.trophyKey === key).length;
}

// ═══════════════════════════════════════════════════════════════════
// LİG KUPALARI — sezon sonu toplu ödülleme
// ═══════════════════════════════════════════════════════════════════

/**
 * Tier'a göre lig şampiyonu trophyKey döndürür.
 *   tier 1 → "league_champion"  (Süper Lig — trophy_league_champion.webp) ⚠️ EKSİK
 *   tier 2 → "league4_champion"  (1. Lig — trophy_league4_champion.png)
 *   tier 3 → "league2_champion"  (2. Lig — trophy_league2_champion.png)
 *   tier 4 → "league3_champion"  (3. Lig — trophy_league3_champion.png)
 *
 * v2.9.80: Kullanıcının dosya adlandırma mantığı: dosya adındaki sayı =
 * Türkiye'deki lig seviyesi (2. Lig, 3. Lig). Sayısız dosya = Süper Lig.
 * 1. Lig için kullanıcı "trophy_league4_champion.png" gönderdi (üzerinde "4th LEAGUE"
 * yazıyor ama kullanıcının 1. Lig için gönderdiği dosya).
 */
export function getChampionTrophyKey(tier: number): TrophyKey {
  switch (tier) {
    case 1: return "league_champion";   // Süper Lig
    case 2: return "league4_champion";  // 1. Lig
    case 3: return "league2_champion";  // 2. Lig
    case 4: return "league3_champion";  // 3. Lig
    case 5: return "league3_champion";  // Amatör Lig — 3. Lig kupası (fallback, ayrı görsel yok)
    default: return "league_champion";
  }
}

/**
 * Tek bir ligin (PersistentLeague) ilk 3 takımına sırasıyla
 * champion / runnerup / third kupalarını verir.
 * v2.9.80: champion trophyKey tier'a göre değişir (her ligin kendi kupası).
 * Immutable: yeni clubs array'i döndürür.
 *
 * @param leagueClubs Lig içindeki kulüp listesi
 * @param standings Lig'in sıralaması (computeStandings çıktısı)
 * @param season Sezon numarası
 * @param tier Lig seviyesi (1-4) — champion kupa görseli seçimi için
 * @returns Yeni kulüp listesi (kupalar eklenmiş)
 */
export function awardLeagueTrophiesToClubs(
  leagueClubs: Team[],
  standings: StandingRow[],
  season: number,
  tier: number,
  department?: number
): Team[] {
  const division = getLeagueDivision(tier, department);
  const championKey = getChampionTrophyKey(tier);
  let result = leagueClubs;

  // v2.9.82: Tier 5 (Amatör) — sadece şampiyon (idx 0) kupa alır
  if (tier === 5) {
    if (standings[0]) {
      result = awardTrophyToClub(result, standings[0].teamId, championKey, season, division);
    }
    return result;
  }

  // Tier 1-4: İlk 3 takıma champion/runnerup/third kupaları
  const TIERS: TrophyKey[] = [championKey, "league_runnerup", "league_third"];
  const top3 = standings.slice(0, 3);
  for (let i = 0; i < top3.length; i++) {
    result = awardTrophyToClub(result, top3[i].teamId, TIERS[i], season, division);
  }
  return result;
}

/**
 * Tüm allLeagues (PersistentLeague haritası) içindeki her lig için
 * ilk 3 takıma kupa verir. Yeni bir AllLeaguesState döndürür (immutable).
 *
 * computeStandings çağrısı lazy require ile yapılır (circular dep önlemek için).
 *
 * @param allLeagues Tüm global ligler
 * @param season Sezon numarası
 * @returns Yeni AllLeaguesState (kupalar eklenmiş)
 */
export function awardLeagueTrophiesToAllLeagues(
  allLeagues: AllLeaguesState,
  season: number
): AllLeaguesState {
  if (!allLeagues || Object.keys(allLeagues).length === 0) {
    return allLeagues;
  }

  const updated: AllLeaguesState = {};
  for (const key of Object.keys(allLeagues)) {
    const league: PersistentLeague = allLeagues[key];
    // Skip boş ligler
    if (!league.clubs || league.clubs.length === 0) {
      updated[key] = league;
      continue;
    }
    try {
      const standings = computeStandings(league.clubs, league.fixtures);
      // v2.9.82: Tier 5 (Amatör) — department bilgisini geçir
      const updatedClubs = awardLeagueTrophiesToClubs(league.clubs, standings, season, league.tier, league.department);
      updated[key] = { ...league, clubs: updatedClubs };
    } catch (e) {
      // Hata olursa bu lig'e dokunma — diğerlerine devam et
      console.warn(`[trophy-system] awardLeagueTrophiesToAllLeagues: ${key} ligi için hata:`, e);
      updated[key] = league;
    }
  }
  return updated;
}

/**
 * Mevcut clubs[] (kullanıcın ligi) içindeki ilk 3 takıma kupa verir.
 * Yeni kulüp listesi döndürür (immutable).
 *
 * @param clubs Kullanıcın ligi kulüpleri
 * @param standings Kullanıcın lig sıralaması
 * @param season Sezon numarası
 * @param tier Lig seviyesi
 */
export function awardLeagueTrophiesToUserClubs(
  clubs: Team[],
  standings: StandingRow[],
  season: number,
  tier: number
): Team[] {
  return awardLeagueTrophiesToClubs(clubs, standings, season, tier);
}
