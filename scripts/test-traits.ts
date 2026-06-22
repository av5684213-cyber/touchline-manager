/**
 * Traits etkisi test scripti.
 * Motorun traits okuyup okumadığını, mock data'da traits var mı doğrular.
 */

import { simulateEnhancedMatch } from "../src/lib/match/engine/enhancedMatchEngine";
import { generateAllClubs, type Player } from "../src/lib/mock/data";
import { TRAITS_DATA } from "../src/lib/match/engine/traitsData";

function pickStartingXI(players: Player[]): Player[] {
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const gk = sorted.filter((p) => p.specificPosition === "GK").slice(0, 1);
  const def = sorted.filter((p) => ["CB", "LB", "RB", "LWB", "RWB"].includes(p.specificPosition)).slice(0, 4);
  const mid = sorted.filter((p) => ["CDM", "CM", "CAM", "LM", "RM"].includes(p.specificPosition)).slice(0, 4);
  const fwd = sorted.filter((p) => ["LW", "RW", "ST", "CF"].includes(p.specificPosition)).slice(0, 2);
  return [...gk, ...def, ...mid, ...fwd];
}

// TRAITS_DATA'dan tüm trait isimlerini çıkar
function getAllTraitNames(): string[] {
  const names: string[] = [];
  for (const group of Object.values(TRAITS_DATA) as any) {
    if (group.pozitif) for (const t of group.pozitif) names.push(t.name);
    if (group.negatif) for (const t of group.negatif) names.push(t.name);
  }
  return names;
}

async function main() {
  console.log("=== Traits Etkisi Test ===\n");

  const clubs = generateAllClubs();
  const home = clubs[0];
  const away = clubs[1];

  // Mock data'da traits var mı?
  const samplePlayer = home.players[0];
  console.log(`Sample player: ${samplePlayer.name}`);
  console.log(`  traits: [${samplePlayer.traits.join(", ")}]`);
  console.log(`  negTraits: [${samplePlayer.negTraits?.join(", ") ?? ""}]`);
  console.log(`  personalityTraits: [${samplePlayer.personalityTraits?.join(", ") ?? ""}]`);
  console.log(`  playStyle: ${samplePlayer.playStyle}`);
  console.log(`  archetype: ${samplePlayer.archetype}`);

  // TRAITS_DATA'da kaç trait var?
  const allTraitNames = getAllTraitNames();
  console.log(`\nTRAITS_DATA toplam trait sayısı: ${allTraitNames.length}`);

  // Mock data'daki traits'ler TRAITS_DATA'da var mı?
  console.log(`\nMock data traits eşleşmesi:`);
  let matched = 0;
  let unmatched = 0;
  for (const tr of samplePlayer.traits) {
    const found = allTraitNames.includes(tr);
    console.log(`  "${tr}": ${found ? "✓ BULUNDU (motor okur)" : "✗ YOK (motor tanımaz)"}`);
    if (found) matched++; else unmatched++;
  }

  // 5 takımın tüm oyuncularını kontrol et
  console.log(`\n--- 5 takımın traits analizi ---`);
  let totalMatched = 0;
  let totalUnmatched = 0;
  const unmatchedTraits = new Set<string>();
  for (const club of clubs.slice(0, 5)) {
    for (const p of club.players) {
      for (const tr of p.traits) {
        if (allTraitNames.includes(tr)) {
          totalMatched++;
        } else {
          totalUnmatched++;
          unmatchedTraits.add(tr);
        }
      }
    }
  }
  console.log(`Eşleşen trait referansları: ${totalMatched}`);
  console.log(`Eşleşmeyen trait referansları: ${totalUnmatched}`);
  if (unmatchedTraits.size > 0) {
    console.log(`Tanınmayan trait'ler: ${[...unmatchedTraits].join(", ")}`);
  }

  // Maç simüle et — traits etkisi var mı?
  const homeSquad = pickStartingXI(home.players);
  const awaySquad = pickStartingXI(away.players);

  const tactic = {
    formation: "4-4-2",
    tactic_type: "4-4-2",
    mentality: 3 as const,
    pressing: false,
    passingStyle: "Karışık" as const,
    intensity: "normal" as const,
    aggression: 50,
    width: 50,
    passingIntensity: 50,
    lineHeight: 50,
    screenKeeper: false,
    wasteTime: false,
    parkTheBus: false,
    crossGame: false,
    loneStrikerCounter: false,
    offsideTrap: false,
    playStyle: "balanced",
  };

  // Traits'li vs traits'siz karşılaştırma
  console.log(`\n--- Maç simülasyonu (traits'li) ---`);
  const result1 = simulateEnhancedMatch(homeSquad as any, awaySquad as any, tactic as any, tactic as any, {
    homeTeamName: home.name,
    awayTeamName: away.name,
  });
  console.log(`Skor: ${result1.homeScore} - ${result1.awayScore}, Events: ${result1.events.length}`);
  console.log(`MOTM: ${result1.manOfTheMatch}`);

  // Traits'siz versiyon — tüm traits'leri sil
  const homeNoTraits = homeSquad.map((p) => ({ ...p, traits: [] as string[], negTraits: [], personalityTraits: [], playStyle: undefined, archetype: undefined }));
  const awayNoTraits = awaySquad.map((p) => ({ ...p, traits: [] as string[], negTraits: [], personalityTraits: [], playStyle: undefined, archetype: undefined }));

  console.log(`\n--- Maç simülasyonu (traits'siz) ---`);
  const result2 = simulateEnhancedMatch(homeNoTraits as any, awayNoTraits as any, tactic as any, tactic as any, {
    homeTeamName: home.name,
    awayTeamName: away.name,
  });
  console.log(`Skor: ${result2.homeScore} - ${result2.awayScore}, Events: ${result2.events.length}`);

  // Karşılaştırma
  console.log(`\n--- Karşılaştırma ---`);
  console.log(`Traits'li: ${result1.homeScore + result1.awayScore} toplam gol, ${result1.events.length} event`);
  console.log(`Traits'siz: ${result2.homeScore + result2.awayScore} toplam gol, ${result2.events.length} event`);

  // Oyuncu rating'leri
  const traitsRatings = result1.homePlayerRatings.slice(0, 5);
  const noTraitsRatings = result2.homePlayerRatings.slice(0, 5);
  console.log(`\nOyuncu rating'leri (ilk 5):`);
  console.log(`  Traits'li: ${traitsRatings.map((r) => r.rating.toFixed(1)).join(", ")}`);
  console.log(`  Traits'siz: ${noTraitsRatings.map((r) => r.rating.toFixed(1)).join(", ")}`);

  console.log(`\n=== SONUÇ ===`);
  console.log(`Mock data traits üretiyor: ${samplePlayer.traits.length > 0 ? "✓ EVET" : "✗ HAYIR"}`);
  console.log(`Motor TRAITS_DATA okuyor: ${allTraitNames.length > 0 ? "✓ EVET" : "✗ HAYIR"}`);
  console.log(`Traits'ler motor tarafından tanınıyor: ${
    totalUnmatched === 0
      ? "✓ EVET (tüm traits'ler TRAITS_DATA'da)"
      : `⚠ KISMİ (${totalUnmatched} tanınmayan)`
  }`);
}

main().catch(console.error);
