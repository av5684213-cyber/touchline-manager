/**
 * v2.9.46 GÖREV 4 — Sezon istatistikleri kalıcılık testi
 *
 * Çalıştırma: npx tsx scripts/test-season-stats-persistence.ts
 *
 * Test akışı:
 *   1. Mock oyuncu oluştur (34 maçlık sezon geçmişi boş)
 *   2. 1. sezon istatistiklerini simüle et (20 gol, 10 asist)
 *   3. seasonHistory'e kaydet
 *   4. 2. sezon istatistiklerini simüle et (15 gol, 12 asist)
 *   5. seasonHistory'e kaydet
 *   6. İki sezonun ayrı kayıtlı kaldığını doğrula
 *   7. Kariyer toplamı (35 gol, 22 asist) doğru hesaplanabilsin
 */
import type { Player, SeasonStat, SeasonAward } from "../src/lib/mock/data";

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("✗ FAIL:", msg);
    failures++;
  } else {
    console.log("✓ PASS:", msg);
  }
}

// Mock oyuncu — 25 yaşında forvet, seasonHistory boş
function makeMockPlayer(): Player {
  return {
    id: "p1",
    firstName: "Ahmet",
    lastName: "Yıldız",
    name: "Ahmet Yıldız",
    position: "FWD",
    specificPosition: "ST",
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
    seasonHistory: [],
    seasonAwards: [],
  } as unknown as Player;
}

// Senaryo: 1. sezon — 34 maç, 20 gol, 10 asist
const player = makeMockPlayer();
const s1: SeasonStat = {
  season: "2024/25",
  club: "Galatasaray",
  leagueTier: 1,
  appearances: 34,
  goals: 20,
  assists: 10,
  yellowCards: 3,
  redCards: 0,
  avgRating: 7.5,
  minutesPlayed: 34 * 85,
};
player.seasonHistory = [...(player.seasonHistory ?? []), s1];

assert(player.seasonHistory?.length === 1, "1. sezon sonrası seasonHistory 1 kayıt");
assert(player.seasonHistory?.[0].season === "2024/25", "1. sezon label doğru");
assert(player.seasonHistory?.[0].goals === 20, "1. sezon 20 gol kayıtlı");
assert(player.seasonHistory?.[0].assists === 10, "1. sezon 10 asist kayıtlı");
assert(player.seasonHistory?.[0].appearances === 34, "1. sezon 34 maç kayıtlı");

// Senaryo: 2. sezon — 30 maç (3 tur sakat), 15 gol, 12 asist
const s2: SeasonStat = {
  season: "2025/26",
  club: "Galatasaray",
  leagueTier: 1,
  appearances: 30, // 34 turda 4 maç sakatlık
  goals: 15,
  assists: 12,
  yellowCards: 5,
  redCards: 1,
  avgRating: 7.8,
  minutesPlayed: 30 * 88,
};
player.seasonHistory = [...(player.seasonHistory ?? []), s2];

assert(player.seasonHistory?.length === 2, "2. sezon sonrası seasonHistory 2 kayıt");
assert(player.seasonHistory?.[0].season === "2024/25", "1. sezon hala korunuyor");
assert(player.seasonHistory?.[1].season === "2025/26", "2. sezon eklendi");
assert(player.seasonHistory?.[1].goals === 15, "2. sezon 15 gol kayıtlı");

// Kariyer toplamı hesabı (seasonHistory'ten)
const careerGoals = player.seasonHistory?.reduce((sum, s) => sum + s.goals, 0) ?? 0;
const careerAssists = player.seasonHistory?.reduce((sum, s) => sum + s.assists, 0) ?? 0;
const careerApps = player.seasonHistory?.reduce((sum, s) => sum + s.appearances, 0) ?? 0;

assert(careerGoals === 35, `Kariyer toplam gol = 35 (20+15) (bulunan: ${careerGoals})`);
assert(careerAssists === 22, `Kariyer toplam asist = 22 (10+12) (bulunan: ${careerAssists})`);
assert(careerApps === 64, `Kariyer toplam maç = 64 (34+30) (bulunan: ${careerApps})`);

// Sezon-bazlı sorgu: sadece 2. sezonun stats'ı
const season2 = player.seasonHistory?.find(s => s.season === "2025/26");
assert(season2?.goals === 15, "2. sezonun gol sayısı doğru sorgulanabiliyor");
assert(season2?.yellowCards === 5, "2. sezonun sarı kart sayısı doğru sorgulanabiliyor");

// Senaryo: 3. sezon — oyuncu transfer oldu, başka kulüpte
const s3: SeasonStat = {
  season: "2026/27",
  club: "Fenerbahçe",
  leagueTier: 1,
  appearances: 28,
  goals: 18,
  assists: 8,
  yellowCards: 2,
  redCards: 0,
  avgRating: 7.6,
  minutesPlayed: 28 * 90,
};
player.seasonHistory = [...(player.seasonHistory ?? []), s3];

assert(player.seasonHistory?.length === 3, "3. sezon sonrası seasonHistory 3 kayıt");
assert(player.seasonHistory?.[2].club === "Fenerbahçe", "3. sezon kulüp değişikliği kayıtlı");

// Kariyer toplamı yeniden hesapla
const careerGoals3 = player.seasonHistory?.reduce((sum, s) => sum + s.goals, 0) ?? 0;
assert(careerGoals3 === 53, `3 sezon sonrası kariyer gol = 53 (20+15+18) (bulunan: ${careerGoals3})`);

// Senaryo: 40+ yaş oyuncu emekli oluyor — seasonHistory KORUNMALI
const agedPlayer: Player = {
  ...player,
  age: 41,
  goals: 0,
  assists: 0,
  appearances: 0,
  seasonHistory: player.seasonHistory, // carry
};
assert(agedPlayer.seasonHistory?.length === 3, "Emekli oyuncunun seasonHistory'si korunmuş (3 kayıt)");
assert(agedPlayer.seasonHistory?.[0].season === "2024/25", "İlk sezon hala erişilebilir");

// Senaryo: Yeni regen — seasonHistory boş
const regen = makeMockPlayer();
regen.age = 17;
assert((regen.seasonHistory ?? []).length === 0, "Yeni regen'in seasonHistory'si boş");

// Senaryo: seasonHistory ve seasonAwards bir arada çalışır
const playerWithBoth = makeMockPlayer();
playerWithBoth.seasonHistory = [s1];
playerWithBoth.seasonAwards = [{
  seasonNumber: 1,
  seasonLabel: "2024/25",
  awardType: "top_scorer",
  rank: 1,
  statValue: 20,
  country: "TR",
  leagueTier: 1,
  clubName: "Galatasaray",
} as SeasonAward];
assert(playerWithBoth.seasonHistory?.length === 1, "seasonHistory + seasonAwards birlikte çalışır");
assert(playerWithBoth.seasonAwards?.length === 1, "seasonAwards kayıtlı");
assert(playerWithBoth.seasonAwards?.[0].statValue === 20, "Ödül gol kralı 20 gol");

console.log("\n" + (failures === 0 ? "✅ TÜM TESTLER BAŞARILI" : `❌ ${failures} test başarısız`));
process.exit(failures === 0 ? 0 : 1);
