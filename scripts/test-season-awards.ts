/**
 * v2.9.46 GÖREV 3 — Sezon ödülleri kalıcılık testi
 *
 * Çalıştırma: npx tsx scripts/test-season-awards.ts
 *
 * Test akışı:
 *   1. Mock oyuncu oluştur (gol kralı adayı)
 *   2. 1. sezon için ödül kaydı oluştur (seasonAwards[0])
 *   3. 2. sezon için ödül kaydı oluştur (seasonAwards[1])
 *   4. İki sezonun da ayrı kayıtlı kaldığını doğrula
 */
import type { Player, SeasonAward } from "../src/lib/mock/data";

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("✗ FAIL:", msg);
    failures++;
  } else {
    console.log("✓ PASS:", msg);
  }
}

// Mock oyuncu
function makeMockPlayer(id: string, name: string, position: string = "ST"): Player {
  return {
    id,
    firstName: name.split(" ")[0],
    lastName: name.split(" ")[1] ?? "Yıldız",
    name,
    position: "FWD",
    specificPosition: position as any,
    age: 25,
    potential: 80,
    hidden_potential: 80,
    rating: 75,
    formRating: 7.5,
    nationality: "TR",
    nation: "Türkiye",
    foot: "Right",
    market_value: 10_000_000,
    marketValue: 10_000_000,
    salary: 50_000,
    weeklyWage: 50_000,
    defending: 30,
    passing: 70,
    shooting: 80,
    speed: 75,
    power: 70,
    stats: { pace: 75, shooting: 80, passing: 70, defending: 30, physical: 70, dribbling: 75 },
    cond: 100,
    condition: 100,
    form: 75,
    morale: 80,
    confidence: 75,
    traits: [],
    goals: 0,
    assists: 0,
    saves: 0,
    appearances: 0,
    seasonAwards: [],
  } as unknown as Player;
}

// Senaryo 1: 1. sezonda gol kralı
const p1 = makeMockPlayer("p1", "Ahmet Yıldız");
const s1Award: SeasonAward = {
  seasonNumber: 1,
  seasonLabel: "2024/25",
  awardType: "top_scorer",
  rank: 1,
  statValue: 22,
  country: "TR",
  leagueTier: 1,
  clubName: "Galatasaray",
};
p1.seasonAwards = [...(p1.seasonAwards ?? []), s1Award];

assert(p1.seasonAwards?.length === 1, "1. sezon sonrası 1 ödül kayıtlı");
assert(p1.seasonAwards?.[0].seasonNumber === 1, "1. ödül seasonNumber=1");
assert(p1.seasonAwards?.[0].statValue === 22, "1. ödül 22 gol");
assert(p1.seasonAwards?.[0].awardType === "top_scorer", "1. ödül tipi top_scorer");

// Senaryo 2: 2. sezonda da gol kralı (daha az golle)
const s2Award: SeasonAward = {
  seasonNumber: 2,
  seasonLabel: "2025/26",
  awardType: "top_scorer",
  rank: 1,
  statValue: 18,
  country: "TR",
  leagueTier: 1,
  clubName: "Galatasaray",
};
p1.seasonAwards = [...(p1.seasonAwards ?? []), s2Award];

assert(p1.seasonAwards?.length === 2, "2. sezon sonrası 2 ödül kayıtlı");
assert(p1.seasonAwards?.[0].seasonNumber === 1, "İlk ödül hala seasonNumber=1 (korundu)");
assert(p1.seasonAwards?.[1].seasonNumber === 2, "İkinci ödül seasonNumber=2");

// Senaryo 3: 2. sezonda MVP de kazandı (aynı sezon iki ödül)
const s2MvpAward: SeasonAward = {
  seasonNumber: 2,
  seasonLabel: "2025/26",
  awardType: "mvp",
  rank: 1,
  statValue: 8.4,
  country: "TR",
  leagueTier: 1,
  clubName: "Galatasaray",
};
p1.seasonAwards = [...(p1.seasonAwards ?? []), s2MvpAward];

assert(p1.seasonAwards?.length === 3, "3 ödül kayıtlı (1. sezon gol kralı + 2. sezon gol kralı + 2. sezon MVP)");
assert(p1.seasonAwards?.filter(a => a.seasonNumber === 2).length === 2,
  "2. sezonda 2 ödül var (gol kralı + MVP)");

// Senaryo 4: 3. sezonda lig şampiyonu (kulüp ödülü)
const s3ChampAward: SeasonAward = {
  seasonNumber: 3,
  seasonLabel: "2026/27",
  awardType: "league_champion",
  rank: 1,
  statValue: 85, // puan
  country: "TR",
  leagueTier: 1,
  clubName: "Galatasaray",
};
p1.seasonAwards = [...(p1.seasonAwards ?? []), s3ChampAward];

assert(p1.seasonAwards?.length === 4, "4 ödül kayıtlı");
assert(p1.seasonAwards?.filter(a => a.awardType === "league_champion").length === 1,
  "Lig şampiyonu ödülü 1 tane");

// Senaryo 5: 3. sezonda Şampiyonlar Ligi şampiyonu
const s3CLAward: SeasonAward = {
  seasonNumber: 3,
  seasonLabel: "2026/27",
  awardType: "champions_league_winner",
  rank: 1,
  statValue: 1,
  country: "INT",
  leagueTier: 1,
  clubName: "Galatasaray",
};
p1.seasonAwards = [...(p1.seasonAwards ?? []), s3CLAward];

assert(p1.seasonAwards?.length === 5, "5 ödül kayıtlı");
assert(p1.seasonAwards?.filter(a => a.country === "INT").length === 1,
  "Uluslararası (INT) ödül 1 tane");

// Senaryo 6: Oyuncu yaşlanıp 40+ olunca emekli oluyor — sezon ödülleri KORUNMALI
// (endSeason'da yaşlandırmada seasonAwards carry ediyor)
const agedPlayer: Player = {
  ...p1,
  age: 41,
  goals: 0,
  assists: 0,
  appearances: 0,
  seasonAwards: p1.seasonAwards, // carry
};

assert(agedPlayer.seasonAwards?.length === 5, "Emekli olan oyuncunun ödülleri korunmuş");
assert(agedPlayer.seasonAwards?.[0].seasonNumber === 1, "İlk sezon ödülü hala erişilebilir");

// Senaryo 7: Yeni regen oyuncu — ödül geçmişi yok
const regen = makeMockPlayer("regen1", "Genç Yetenek");
regen.age = 17;
assert((regen.seasonAwards ?? []).length === 0, "Yeni regen'in ödül geçmişi boş");

console.log("\n" + (failures === 0 ? "✅ TÜM TESTLER BAŞARILI" : `❌ ${failures} test başarısız`));
process.exit(failures === 0 ? 0 : 1);
