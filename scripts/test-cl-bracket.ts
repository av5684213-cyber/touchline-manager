/**
 * v2.9.46 GÖREV 2 — CL bracket üretici test
 *
 * Çalıştırma: npx tsx scripts/test-cl-bracket.ts
 */
import {
  nextPowerOfTwo,
  log2int,
  getTotalRounds,
  getRoundName,
  generateFirstRoundMatches,
  generateNextRoundMatches,
  type CLParticipant,
} from "../src/lib/cl-bracket";

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("✗ FAIL:", msg);
    failures++;
  } else {
    console.log("✓ PASS:", msg);
  }
}

function makeParticipants(n: number, country: string = "TR"): CLParticipant[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `${country}_T1_${i}`,
    teamName: `Team ${i + 1}`,
    teamShort: `T${i + 1}`,
    teamColor: "#1a3a2a",
    country,
    tier: 1,
    finalPosition: i + 1,
    isUser: false,
  }));
}

// nextPowerOfTwo
assert(nextPowerOfTwo(1) === 1, "nextPowerOfTwo(1) = 1");
assert(nextPowerOfTwo(2) === 2, "nextPowerOfTwo(2) = 2");
assert(nextPowerOfTwo(3) === 4, "nextPowerOfTwo(3) = 4");
assert(nextPowerOfTwo(7) === 8, "nextPowerOfTwo(7) = 8");
assert(nextPowerOfTwo(8) === 8, "nextPowerOfTwo(8) = 8");
assert(nextPowerOfTwo(9) === 16, "nextPowerOfTwo(9) = 16");
assert(nextPowerOfTwo(24) === 32, "nextPowerOfTwo(24) = 32");
assert(nextPowerOfTwo(45) === 64, "nextPowerOfTwo(45) = 64");

// log2int
assert(log2int(1) === 0, "log2int(1) = 0");
assert(log2int(2) === 1, "log2int(2) = 1");
assert(log2int(4) === 2, "log2int(4) = 2");
assert(log2int(8) === 3, "log2int(8) = 3");
assert(log2int(16) === 4, "log2int(16) = 4");
assert(log2int(32) === 5, "log2int(32) = 5");
assert(log2int(64) === 6, "log2int(64) = 6");

// getTotalRounds
assert(getTotalRounds(8) === 3, "8 takım → 3 tur");
assert(getTotalRounds(16) === 4, "16 takım → 4 tur");
assert(getTotalRounds(32) === 5, "32 takım → 5 tur");
assert(getTotalRounds(64) === 6, "64 takım → 6 tur");

// getRoundName — v2.9.46 düzeltme: 8 takım 1. tur = Çeyrek Final
assert(getRoundName(1, 3) === "Çeyrek Final", "8 takımda tur 1 = Çeyrek Final");
assert(getRoundName(2, 3) === "Yarı Final", "8 takımda tur 2 = Yarı Final");
assert(getRoundName(3, 3) === "Final", "8 takımda tur 3 = Final");

assert(getRoundName(1, 4) === "Son 16", "16 takımda tur 1 = Son 16");
assert(getRoundName(2, 4) === "Çeyrek Final", "16 takımda tur 2 = Çeyrek Final");
assert(getRoundName(3, 4) === "Yarı Final", "16 takımda tur 3 = Yarı Final");
assert(getRoundName(4, 4) === "Final", "16 takımda tur 4 = Final");

assert(getRoundName(1, 6) === "Son 64", "64 takımda tur 1 = Son 64");
assert(getRoundName(2, 6) === "Son 32", "64 takımda tur 2 = Son 32");
assert(getRoundName(3, 6) === "Son 16", "64 takımda tur 3 = Son 16");

// 8 takım — bracket boyutu 8, toplam 3 tur, 4 maç (bye yok)
const p8 = makeParticipants(8);
const r8 = generateFirstRoundMatches(p8);
assert(r8.bracketSize === 8, "8 katılımcı → bracket 8");
assert(r8.totalRounds === 3, "8 katılımcı → 3 tur");
assert(r8.matches.length === 4, "8 katılımcı → 4 maç (bye yok)");
assert(r8.matches.filter(m => m.isBye).length === 0, "8 katılımcı → bye yok");

// 24 takım — bracket 32, 16 maç, 8 bye maçı (16+8=24 kazanan sonraki tura)
const p24 = makeParticipants(24);
const r24 = generateFirstRoundMatches(p24);
assert(r24.bracketSize === 32, "24 katılımcı → bracket 32");
assert(r24.totalRounds === 5, "24 katılımcı → 5 tur");
assert(r24.matches.length === 16, "24 katılımcı → 16 maç (8 bye + 8 normal)");
const byeCount24 = r24.matches.filter(m => m.isBye).length;
assert(byeCount24 === 8, `24 katılımcı → 8 bye maçı (bulunan: ${byeCount24})`);
const realCount24 = r24.matches.filter(m => !m.isBye).length;
assert(realCount24 === 8, `24 katılımcı → 8 normal maç (bulunan: ${realCount24})`);

// 45 takım — bracket 64, 32 maç, 19 bye (45+19=64 kazanan sonraki tura)
const p45 = makeParticipants(45);
const r45 = generateFirstRoundMatches(p45);
assert(r45.bracketSize === 64, "45 katılımcı → bracket 64");
assert(r45.totalRounds === 6, "45 katılımcı → 6 tur");
assert(r45.matches.length === 32, `45 katılımcı → 32 maç (bulunan: ${r45.matches.length})`);
const byeCount45 = r45.matches.filter(m => m.isBye).length;
assert(byeCount45 === 19, `45 katılımcı → 19 bye (bulunan: ${byeCount45})`);

// 24 takım: bracket 32, 8 bye maçı + 8 normal maç
// Bye maçları: 8 kazanan (otomatik)
// Normal maçlar: 8 kazanan (oynanınca)
// Toplam sonraki tur kazananı = 16
// Yani 24 katılımcı → bracket 32 → ilk tur sonrası 16 takım kalır
const r24winners = r24.matches.map(m => {
  if (m.isBye) return m.winnerId; // bye → otomatik kazanan
  if (!m.played) return m.homeId; // simülasyon: home kazanır
  return m.winnerId;
}).filter(Boolean) as string[];
assert(r24winners.length === 16, `24 katılımcı sonrası kazanan sayısı = 16 (bulunan: ${r24winners.length})`);

const nextRound24 = generateNextRoundMatches(r24winners, p24, 2);
assert(nextRound24.length === 8, `16→8 maç (bulunan: ${nextRound24.length})`);

// 8 takım sonraki tur: 4 kazanan → 2 maç
const simulatedWinners8 = r8.matches.map(m => m.homeId);
const nextRound8 = generateNextRoundMatches(simulatedWinners8, p8, 2);
assert(nextRound8.length === 2, "8 katılımcı → sonraki tur 2 maç");

// Bracket pozisyon test — 8 takımda seed 1 ile seed 8 ilk turda eşleşmeli
const r8seeded = generateFirstRoundMatches(p8);
const firstMatch = r8seeded.matches[0];
assert(firstMatch.homeId === "TR_T1_0" && firstMatch.awayId === "TR_T1_7",
  "İlk maç: seed 1 vs seed 8 olmalı");
// İkinci maç: seed 4 vs seed 5 (standart seeding)
const secondMatch = r8seeded.matches[1];
assert(secondMatch.homeId === "TR_T1_3" && secondMatch.awayId === "TR_T1_4",
  "İkinci maç: seed 4 vs seed 5 olmalı");

// 1 takım → bracket 0 (geçersiz)
const p1 = makeParticipants(1);
const r1 = generateFirstRoundMatches(p1);
assert(r1.bracketSize === 0, "1 katılımcı → bracket 0 (geçersiz)");
assert(r1.matches.length === 0, "1 katılımcı → 0 maç");

// 2 takım → bracket 2, 1 tur, 1 maç (final)
const p2 = makeParticipants(2);
const r2 = generateFirstRoundMatches(p2);
assert(r2.bracketSize === 2, "2 katılımcı → bracket 2");
assert(r2.totalRounds === 1, "2 katılımcı → 1 tur (final)");
assert(r2.matches.length === 1, "2 katılımcı → 1 maç");

console.log("\n" + (failures === 0 ? "✅ TÜM TESTLER BAŞARILI" : `❌ ${failures} test başarısız`));
process.exit(failures === 0 ? 0 : 1);
