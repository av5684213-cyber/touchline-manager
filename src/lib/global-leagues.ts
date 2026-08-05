/**
 * v2.9.61: Global Persistent Leagues System
 *
 * Tüm ligler (4 ülke × 4 tier × 1 departman = 16 lig, 288 takım) persistent olarak
 * store'da tutulur. advanceMatchday'de TÜM liglerin maçları simüle edilir.
 *
 * Yapı:
 * - Kullanıcının kendi ligi: store.clubs + store.fixtures (mevcut sistem, değişmedi)
 * - Diğer tüm ligler: store.allLeagues (yeni)
 *   - Her lig: { country, tier, clubs, fixtures, seasonMatchday }
 *
 * Kullanıcı terfi/küme düşerse:
 * - clubs array'i yeni ligle değiştirilir
 * - allLeagues'teki eski lig "boş" olur (kullanıcı artık orada değil)
 * - allLeagues'teki yeni ligden kullanıcı çıkar, yerine bot konur
 *
 * CL katılımcıları:
 * - TR 1. Lig ilk 3'ü (kullanıcın ligi veya allLeagues TR/T1)
 * - Diğer ülkelerin 1. Lig ilk 3'ü (allLeagues ES/T1, DE/T1, BR/T1)
 *
 * Global Gol Kralı:
 * - Tüm liglerdeki (clubs + allLeagues) gerçek maç oynamış oyuncular
 */

import { generateClubsForLeague, type Team, type LeagueTier, type Department } from "@/lib/mock/data";
import { generateFixtures, type FixtureRow, playFixturesUpTo } from "@/lib/mock/season";
import { COUNTRIES } from "@/lib/countries/countries";

export type LeagueKey = string; // format: "{country}_{tier}" örnek: "TR_1", "ES_2"

export type PersistentLeague = {
  country: string;     // "TR", "ES", "DE", "BR"
  tier: LeagueTier;    // 1-5 (5 = Amatör)
  clubs: Team[];       // 18 takım (kullanıcı yoksa hepsi bot)
  fixtures: FixtureRow[];
  seasonMatchday: number;
  hasUser: boolean;    // kullanıcının takımı bu ligde mi?
  department?: Department; // v2.9.82: Sadece tier 5 (Amatör) için — D1, D2, D3, D4
};

export type AllLeaguesState = Record<LeagueKey, PersistentLeague>;

/**
 * Lig key'i üret: "TR_1", "ES_2" gibi.
 * v2.9.82: Departman bilgisi opsiyonel — tier 5 (Amatör) için "TR_5_D1" formatı.
 *           Diğer tier'lar için departman yok, "TR_1" formatı korunur.
 */
export function makeLeagueKey(country: string, tier: LeagueTier, department?: Department): LeagueKey {
  // v2.9.82: Sadece tier 5 (Amatör) departman bilgisini key'e dahil eder
  if (tier === 5 && department) {
    return `${country}_${tier}_D${department}`;
  }
  return `${country}_${tier}`;
}

/**
 * Tüm ligleri üret: 10 ülke × (4 tier + tier 5'in 4 departmanı) = 10 × 8 = 80 lig.
 * v2.9.82: Tier 5 (Amatör Lig) 4 departmanlı — her departman bağımsız lig.
 *
 * @param userCountry Kullanıcın ülkesi (bu ligin kullanıcı kontrolünde olduğu işaretlenir)
 * @param userTier Kullanıcın tier'ı
 * @param userDept Kullanıcın departmanı (tier 5 için)
 */
export function generateAllLeagues(
  userCountry: string = "TR",
  userTier: LeagueTier = 2,
  userDept: Department = 1 as Department
): AllLeaguesState {
  const all: AllLeaguesState = {};

  for (const country of COUNTRIES) {
    // Tier 1-4: tek departman
    for (const tier of [1, 2, 3, 4] as LeagueTier[]) {
      const key = makeLeagueKey(country.code, tier);
      const clubs = generateClubsForLeague(tier, 1 as Department, country.code);
      const fixtures = playFixturesUpTo(
        generateFixtures(clubs),
        1 // sezon başı — hiç maç oynanmadı
      );
      const hasUser = country.code === userCountry && tier === userTier;

      all[key] = {
        country: country.code,
        tier,
        clubs,
        fixtures,
        seasonMatchday: 1,
        hasUser,
      };
    }
    // v2.9.82: Tier 5 (Amatör Lig) — 4 departman, her biri bağımsız lig
    for (const dept of [1, 2, 3, 4] as Department[]) {
      const key = makeLeagueKey(country.code, 5 as LeagueTier, dept);
      const clubs = generateClubsForLeague(5 as LeagueTier, dept, country.code);
      const fixtures = playFixturesUpTo(
        generateFixtures(clubs),
        1
      );
      const hasUser = country.code === userCountry && userTier === 5 && userDept === dept;

      all[key] = {
        country: country.code,
        tier: 5 as LeagueTier,
        clubs,
        fixtures,
        seasonMatchday: 1,
        hasUser,
        department: dept, // v2.9.82: departman bilgisi
      };
    }
  }

  return all;
}

/**
 * Bir ligin sıralamasını hesapla (kullanıcın liginin standby'ları için).
 */
export function getLeagueStandings(league: PersistentLeague) {
  // computeStandings import edilir — circular dependency önlemek için lazy
  const { computeStandings } = require("@/lib/mock/season");
  return computeStandings(league.clubs, league.fixtures);
}

/**
 * Bir ligden ilk N takımı al (CL için).
 */
export function getTopNFromLeague(league: PersistentLeague, n: number): Team[] {
  const standings = getLeagueStandings(league);
  const top: Team[] = [];
  for (let i = 0; i < Math.min(n, standings.length); i++) {
    const team = league.clubs.find((c) => c.id === standings[i].teamId);
    if (team) top.push(team);
  }
  return top;
}

/**
 * Global gol kralı adaylarını topla — tüm liglerden.
 */
export function getGlobalScorers(
  userClubs: Team[],
  allLeagues: AllLeaguesState,
  minAppearances: number = 1
): Array<{ player: any; team: any; isMyPlayer: boolean }> {
  const list: Array<{ player: any; team: any; isMyPlayer: boolean }> = [];

  // Kullanıcının ligindeki oyuncular (store.clubs)
  for (const club of userClubs) {
    for (const p of club.players) {
      if ((p.appearances ?? 0) >= minAppearances) {
        list.push({ player: p, team: club, isMyPlayer: false });
      }
    }
  }

  // Diğer tüm liglerdeki oyuncular
  for (const key of Object.keys(allLeagues)) {
    const league = allLeagues[key];
    if (league.hasUser) continue; // Kullanıcının ligi zaten yukarıda eklendi
    for (const club of league.clubs) {
      for (const p of club.players) {
        if ((p.appearances ?? 0) >= minAppearances) {
          list.push({ player: p, team: club, isMyPlayer: false });
        }
      }
    }
  }

  return list;
}
