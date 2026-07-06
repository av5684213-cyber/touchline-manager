/**
 * Trait + Arketip — doğru trait isimleriyle yeniden test
 */
import { simulateEnhancedMatch } from "../src/lib/match/engine/enhancedMatchEngine";
import { generateAllClubs, type Player } from "../src/lib/mock/data";
import { TRAITS_DATA } from "../src/lib/match/engine/traitsData";
import { DEFAULT_TACTIC, type ActiveTactic } from "../src/lib/tactics/types";

function pickStartingXI(players: Player[]): Player[] {
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const gk = sorted.filter((p) => p.specificPosition === "GK").slice(0, 1);
  const def = sorted.filter((p) => ["CB", "LB", "RB"].includes(p.specificPosition)).slice(0, 4);
  const mid = sorted.filter((p) => ["CDM", "CM", "CAM"].includes(p.specificPosition)).slice(0, 4);
  const fwd = sorted.filter((p) => ["LW", "RW", "ST"].includes(p.specificPosition)).slice(0, 2);
  return [...gk, ...def, ...mid, ...fwd];
}

function listTraits() {
  console.log("Mevcut trait'ler (TRAITS_DATA):");
  for (const [cat, data] of Object.entries(TRAITS_DATA)) {
    const d = data as any;
    console.log(`  [${cat}]`);
    if (d.pozitif) {
      for (const t of d.pozitif) {
        console.log(`    + ${t.name} (level: ${t.level ?? "?"}, engineEffect: ${t.engineEffect ? "var" : "yok"})`);
      }
    }
    if (d.negatif) {
      for (const t of d.negatif) {
        console.log(`    - ${t.name} (penalty: ${JSON.stringify(t.penalty)})`);
      }
    }
  }
}

async function main() {
  console.log("=== Trait Listesi ===\n");
  listTraits();

  const clubs = generateAllClubs();
  const baseHome = pickStartingXI(clubs[0].players);
  const baseAway = pickStartingXI(clubs[1].players);

  const homeNoTraits = baseHome.map(p => ({ ...p, traits: [], negTraits: [], personalityTraits: [] }));
  const awayNoTraits = baseAway.map(p => ({ ...p, traits: [], negTraits: [], personalityTraits: [] }));

  function run100(label: string, homeSquad: Player[]): { avgH: number; avgA: number } {
    const N = 100;
    let hGoals = 0, aGoals = 0;
    const tactic: ActiveTactic = { ...DEFAULT_TACTIC };
    for (let i = 0; i < N; i++) {
      const r = simulateEnhancedMatch(homeSquad as any, awayNoTraits as any, tactic as any, tactic as any, {
        homeTeamName: "Home", awayTeamName: "Away",
        refereePersonality: ["strict", "balanced", "lenient", "home_bias", "volatile"][i % 5] as any,
      } as any);
      hGoals += r.homeScore; aGoals += r.awayScore;
    }
    const avgH = hGoals / N, avgA = aGoals / N;
    console.log(`\n${label}`);
    console.log(`  100 maç ort gol: H ${avgH.toFixed(2)} - A ${avgA.toFixed(2)}`);
    return { avgH, avgA };
  }

  console.log("\n=== Test Senaryoları ===\n");

  const base = run100("1) BASELINE (trait'siz)", homeNoTraits);

  // Forvetlere gerçek pozitif trait'ler (forvet kategorisinden)
  const homeFwdPos = baseHome.map(p => {
    if (["ST", "LW", "RW"].includes(p.specificPosition)) {
      return { ...p, traits: ["Bitirici", "Penaltı Uzmanı", "Klasik Forvet"], negTraits: [], personalityTraits: [] };
    }
    return { ...p, traits: [], negTraits: [], personalityTraits: [] };
  });
  const fwdPos = run100("2) HOME forvetlere 3 pozitif trait", homeFwdPos);

  // Forvetlere negatif trait'ler (forvet kategorisinden)
  const homeFwdNeg = baseHome.map(p => {
    if (["ST", "LW", "RW"].includes(p.specificPosition)) {
      return { ...p, traits: [], negTraits: ["Beceriksiz bitirici", "Ofsayta düşer", "Bencil"], personalityTraits: [] };
    }
    return { ...p, traits: [], negTraits: [], personalityTraits: [] };
  });
  const fwdNeg = run100("3) HOME forvetlere 3 negatif trait", homeFwdNeg);

  // Kaleci "Refleks Canavarı" arketipi — away kaleci zayıflatılmış
  // (rating'i düşürelim ki arketip etkisi görünsün)
  const weakAway = baseAway.map(p => p.specificPosition === "GK" ? { ...p, rating: 60 } : p);
  const homeGkStrong = baseHome.map(p => ({ ...p, traits: [], negTraits: [], personalityTraits: [] }));
  const gk = run100("4) AWAY kaleci rating=60 (zayıf kaleci)", homeGkStrong);
  // şimdi bu zayıf kaleciye "Refleks Canavarı" ver
  const weakAwayWithArk = weakAway.map(p => p.specificPosition === "GK" ? { ...p, archetype: "Refleks Canavarı" } : p);
  const tactic: ActiveTactic = { ...DEFAULT_TACTIC };
  let hG = 0;
  for (let i = 0; i < 100; i++) {
    const r = simulateEnhancedMatch(homeGkStrong as any, weakAwayWithArk as any, tactic as any, tactic as any, {
      homeTeamName: "Home", awayTeamName: "Away",
      refereePersonality: ["strict", "balanced", "lenient"][i % 3] as any,
    } as any);
    hG += r.homeScore;
  }
  console.log(`\n4b) AWAY zayıf kaleci (60) + 'Refleks Canavarı' arketipi`);
  console.log(`  Home avg gol: ${(hG / 100).toFixed(2)} (önceki: ${(gk.avgH).toFixed(2)})`);
  console.log(`  → Arketip etkisi: ${((hG / 100) - gk.avgH).toFixed(2)} gol fark`);
}

main().catch(console.error);
