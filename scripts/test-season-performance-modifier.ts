/**
 * v2.9.46 GÖREV 5 — Sezon performans modifier + piyasa değeri testi
 *
 * Çalıştırma: npx tsx scripts/test-season-performance-modifier.ts
 *
 * Test senaryoları:
 *   1. Çok iyi performans gösteren forvet (gol kralı adayı) → değer artmalı
 *   2. Sık sakatlanan oyuncu → değer düşmeli
 *   3. Maç oynamamış oyuncu → modifier 1.0 (etkisiz)
 *   4. Sezon ortasında (modifier yok) → mevcut davranış korunur
 *   5. Yeni regen → modifier 1.0
 */
import { calculatePlayerValue, calculateSeasonPerformanceModifier } from "../src/lib/valuation";
import type { Player } from "../src/lib/mock/data";

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("✗ FAIL:", msg);
    failures++;
  } else {
    console.log("✓ PASS:", msg);
  }
}

function makeMockPlayer(overrides: Partial<Player> = {}): Player {
  const base: Player = {
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
  } as unknown as Player;
  // Override'ları doğru şekilde merge et
  return { ...base, ...overrides };
}

// Senaryo 1: Çok iyi performanslı forvet — 34 maç, 25 gol (0.74 gol/maç)
// Beklenen: 0.5 gol/maç'in %50 üstünde → +15% modifier
const starStriker = makeMockPlayer({
  specificPosition: "ST",
  appearances: 34,
  goals: 25,
  assists: 5,
  last_match_rating: 8.0,
});
const starModifier = calculateSeasonPerformanceModifier(starStriker);
assert(starModifier > 1.10, `Yıldız forvet modifier > 1.10 (bulunan: ${starModifier.toFixed(3)})`);
assert(starModifier <= 1.25, `Yıldız forvet modifier ≤ 1.25 (bulunan: ${starModifier.toFixed(3)})`);

// Piyasa değeri artmalı
const starValueNoMod = calculatePlayerValue(starStriker);
const starValueWithMod = calculatePlayerValue(starStriker, starModifier);
assert(starValueWithMod > starValueNoMod,
  `Yıldız forvet piyasa değeri arttı: ${starValueWithMod} > ${starValueNoMod}`);
const valueIncreasePct = ((starValueWithMod - starValueNoMod) / starValueNoMod) * 100;
assert(valueIncreasePct > 10, `Değer artışı > 10% (bulunan: %${valueIncreasePct.toFixed(1)})`);

// Senaryo 2: Sık sakatlanan oyuncu — 10 maç, 3 gol, 5 sakatlık
const injuryProne = makeMockPlayer({
  specificPosition: "ST",
  appearances: 10,
  goals: 3,
  assists: 0,
  last_match_rating: 6.5,
  injury_history: [{}, {}, {}, {}, {}] as any, // 5 sakatlık
});
const injuryModifier = calculateSeasonPerformanceModifier(injuryProne);
assert(injuryModifier < 1.0, `Sık sakat oyuncu modifier < 1.0 (bulunan: ${injuryModifier.toFixed(3)})`);
assert(injuryModifier >= 0.80, `Sık sakat oyuncu modifier ≥ 0.80 (bulunan: ${injuryModifier.toFixed(3)})`);

// Piyasa değeri düşmeli
const injuryValueNoMod = calculatePlayerValue(injuryProne);
const injuryValueWithMod = calculatePlayerValue(injuryProne, injuryModifier);
assert(injuryValueWithMod < injuryValueNoMod,
  `Sık sakat oyuncu piyasa değeri düştü: ${injuryValueWithMod} < ${injuryValueNoMod}`);

// Senaryo 3: Maç oynamamış oyuncu — modifier 1.0 (etkisiz)
const noPlay = makeMockPlayer({ appearances: 0, goals: 0, assists: 0 });
const noPlayModifier = calculateSeasonPerformanceModifier(noPlay);
assert(noPlayModifier === 1.0, `Maç oynamamış oyuncu modifier = 1.0 (bulunan: ${noPlayModifier})`);

// Senaryo 4: Sezon ortasında (modifier verilmez) — mevcut davranış korunur
const midSeason = makeMockPlayer({ appearances: 5, goals: 0 });
const midSeasonValueNoMod = calculatePlayerValue(midSeason); // tek parametre
const midSeasonValueWith1 = calculatePlayerValue(midSeason, 1.0);
assert(midSeasonValueNoMod === midSeasonValueWith1,
  "Sezon ortasında modifier verilmezse değer aynı (geriye dönük uyumlu)");

// Senaryo 5: Yeni regen — 17 yaş, 0 maç → modifier 1.0
const regen = makeMockPlayer({
  age: 17,
  appearances: 0,
  goals: 0,
  assists: 0,
});
const regenModifier = calculateSeasonPerformanceModifier(regen);
assert(regenModifier === 1.0, `Yeni regen modifier = 1.0 (bulunan: ${regenModifier})`);

// Senaryo 6: Orta seviye performans — 34 maç, 12 gol (forvet için beklenen altında)
// Forvet beklenen: 0.5 gol/maç × 34 = 17 gol. 12 gol → 0.35 gol/maç = %70 altında → -5%
const avgPerformer = makeMockPlayer({
  specificPosition: "ST",
  appearances: 34,
  goals: 12,
  assists: 4,
  last_match_rating: 7.0,
});
const avgModifier = calculateSeasonPerformanceModifier(avgPerformer);
// 12 gol / 34 maç = 0.35 gol/maç
// Beklenen 0.5, 0.35 = beklenenin %70'i → %30 altında → -5% modifier
// 0.35/0.5 = 0.7 → 1 - 0.7 = 0.3, expected*0.3 = 0.15 → 0.35 > 0.15 → -5% uygulanmaz
// Düzeltme: hesabı doğru yapalım
// goalsPerGame = 12/34 = 0.353
// expected = 0.5
// expected * 0.3 = 0.15
// 0.353 > 0.15 → -5% uygulanmaz
// Yani modifier değişmez (1.0)
// Asist: 4/34 = 0.118, expected 0.25, *1.2 = 0.3, *1.5 = 0.375
// 0.118 < 0.3 → asist bonusu yok
// Rating 7.0 → modifier değişmez
assert(avgModifier >= 0.95 && avgModifier <= 1.10,
  `Orta seviye forvet modifier ~1.0 (bulunan: ${avgModifier.toFixed(3)})`);

// Senaryo 7: Kaleci — yüksek kurtarış → değer artmalı
const topGK = makeMockPlayer({
  specificPosition: "GK",
  appearances: 34,
  goals: 0,
  assists: 0,
  saves: 200, // ~5.9 saves/maç
  last_match_rating: 7.5,
});
const gkModifier = calculateSeasonPerformanceModifier(topGK);
assert(gkModifier > 1.0, `Yüksek kurtarışlı kaleci modifier > 1.0 (bulunan: ${gkModifier.toFixed(3)})`);

// Senaryo 8: Modifier clamp — 0.80 altına inmemeli
const worstPlayer = makeMockPlayer({
  specificPosition: "ST",
  appearances: 5,
  goals: 0,
  assists: 0,
  last_match_rating: 5.0, // çok düşük rating
  injury_history: [{}, {}, {}, {}, {}, {}, {}, {}] as any, // 8 sakatlık
});
const worstModifier = calculateSeasonPerformanceModifier(worstPlayer);
assert(worstModifier >= 0.80, `En kötü oyuncu modifier ≥ 0.80 (bulunan: ${worstModifier.toFixed(3)})`);

// Senaryo 9: Modifier clamp — 1.25 üstüne çıkmamalı
const bestPlayer = makeMockPlayer({
  specificPosition: "ST",
  appearances: 34,
  goals: 40, // imkansız ama test için
  assists: 20,
  saves: 0,
  last_match_rating: 9.5,
});
const bestModifier = calculateSeasonPerformanceModifier(bestPlayer);
assert(bestModifier <= 1.25, `En iyi oyuncu modifier ≤ 1.25 (bulunan: ${bestModifier.toFixed(3)})`);

console.log("\n" + (failures === 0 ? "✅ TÜM TESTLER BAŞARILI" : `❌ ${failures} test başarısız`));
process.exit(failures === 0 ? 0 : 1);
