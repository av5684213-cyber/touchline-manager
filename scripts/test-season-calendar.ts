/**
 * v2.9.46 GÖREV 1 — Sezon takvimi test
 *
 * Çalıştırma: npx tsx scripts/test-season-calendar.ts
 *
 * Beklenen çıktı:
 *   - Matchday 1-10 → 1. hafta (Pzt-Cum, günde 2 tur)
 *   - Matchday 11-20 → 2. hafta
 *   - Matchday 21-30 → 3. hafta
 *   - Matchday 31-34 → 4. hafta (sadece Pzt-Sal, günde 2 tur)
 *   - Matchday 35 → boşluk Çarşambası (CL günü)
 */
import {
  TOTAL_MATCHDAYS,
  FULL_WEEKS,
  MATCHDAYS_PER_FULL_WEEK,
  SHORT_WEEK_MATCHDAYS,
  getMatchdayCalendar,
  isSeasonEndMatchday,
  isGapWednesdayMatchday,
} from "../src/lib/league-rules";

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("✗ FAIL:", msg);
    failures++;
  } else {
    console.log("✓ PASS:", msg);
  }
}

// Toplam tur sayısı
assert(TOTAL_MATCHDAYS === 34, "Toplam tur sayısı 34 olmalı");
assert(FULL_WEEKS === 3, "Tam hafta sayısı 3 olmalı");
assert(MATCHDAYS_PER_FULL_WEEK === 10, "Tam haftada 10 tur olmalı");
assert(SHORT_WEEK_MATCHDAYS === 4, "Kısa haftada 4 tur olmalı");
assert(FULL_WEEKS * MATCHDAYS_PER_FULL_WEEK + SHORT_WEEK_MATCHDAYS === 34,
  "3×10 + 4 = 34 tur");

// 1. hafta matchday'leri (1-10)
const w1d1 = getMatchdayCalendar(1);
assert(w1d1.week === 1 && w1d1.day === 1 && w1d1.slot === 1 && !w1d1.isShortWeek,
  "Matchday 1 = 1. hafta, Pzt, slot 1");

const w1d1s2 = getMatchdayCalendar(2);
assert(w1d1s2.week === 1 && w1d1s2.day === 1 && w1d1s2.slot === 2,
  "Matchday 2 = 1. hafta, Pzt, slot 2");

const w1d2 = getMatchdayCalendar(3);
assert(w1d2.week === 1 && w1d2.day === 2 && w1d2.slot === 1,
  "Matchday 3 = 1. hafta, Sal, slot 1");

const w1d5s2 = getMatchdayCalendar(10);
assert(w1d5s2.week === 1 && w1d5s2.day === 5 && w1d5s2.slot === 2,
  "Matchday 10 = 1. hafta, Cum, slot 2");

// 2. hafta matchday'leri (11-20)
const w2d1 = getMatchdayCalendar(11);
assert(w2d1.week === 2 && w2d1.day === 1 && w2d1.slot === 1,
  "Matchday 11 = 2. hafta, Pzt, slot 1");

const w2end = getMatchdayCalendar(20);
assert(w2end.week === 2 && w2end.day === 5 && w2end.slot === 2,
  "Matchday 20 = 2. hafta, Cum, slot 2");

// 3. hafta matchday'leri (21-30)
const w3d1 = getMatchdayCalendar(21);
assert(w3d1.week === 3 && w3d1.day === 1 && w3d1.slot === 1,
  "Matchday 21 = 3. hafta, Pzt, slot 1");

const w3end = getMatchdayCalendar(30);
assert(w3end.week === 3 && w3end.day === 5 && w3end.slot === 2,
  "Matchday 30 = 3. hafta, Cum, slot 2");

// 4. hafta matchday'leri (31-34) — sadece Pzt-Sal
const w4d1 = getMatchdayCalendar(31);
assert(w4d1.week === 4 && w4d1.day === 1 && w4d1.slot === 1 && w4d1.isShortWeek,
  "Matchday 31 = 4. hafta (kısa), Pzt, slot 1");

const w4d2s1 = getMatchdayCalendar(33);
assert(w4d2s1.week === 4 && w4d2s1.day === 2 && w4d2s1.slot === 1,
  "Matchday 33 = 4. hafta (kısa), Sal, slot 1");

const w4end = getMatchdayCalendar(34);
assert(w4end.week === 4 && w4end.day === 2 && w4end.slot === 2,
  "Matchday 34 = 4. hafta (kısa), Sal, slot 2 — sezon sonu");

// Sezon sonu
assert(isSeasonEndMatchday(34), "Matchday 34 = sezon sonu");
assert(!isSeasonEndMatchday(33), "Matchday 33 ≠ sezon sonu");

// Boşluk Çarşambası
assert(isGapWednesdayMatchday(35), "Matchday 35 = boşluk Çarşambası (CL günü)");
assert(!isGapWednesdayMatchday(34), "Matchday 34 ≠ boşluk Çarşambası");

// Out-of-range
const oob = getMatchdayCalendar(0);
assert(oob.week === 0, "Matchday 0 → week 0 (out of range)");
const oob2 = getMatchdayCalendar(40);
assert(oob2.week === 0, "Matchday 40 → week 0 (out of range)");

console.log("\n" + (failures === 0 ? "✅ TÜM TESTLER BAŞARILI" : `❌ ${failures} test başarısız`));
process.exit(failures === 0 ? 0 : 1);
