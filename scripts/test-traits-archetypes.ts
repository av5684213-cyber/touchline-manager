/**
 * Trait + Arketip Etki Testi
 * Oyuncuları ekstrem trait'lerle donatıp gol şansına etkisini ölçer.
 */
import { simulateEnhancedMatch } from "../src/lib/match/engine/enhancedMatchEngine";
import { generateAllClubs, type Player } from "../src/lib/mock/data";
import { DEFAULT_TACTIC, type ActiveTactic } from "../src/lib/tactics/types";

function pickStartingXI(players: Player[]): Player[] {
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const gk = sorted.filter((p) => p.specificPosition === "GK").slice(0, 1);
  const def = sorted.filter((p) => ["CB", "LB", "RB"].includes(p.specificPosition)).slice(0, 4);
  const mid = sorted.filter((p) => ["CDM", "CM", "CAM"].includes(p.specificPosition)).slice(0, 4);
  const fwd = sorted.filter((p) => ["LW", "RW", "ST"].includes(p.specificPosition)).slice(0, 2);
  return [...gk, ...def, ...mid, ...fwd];
}

function withTraits(players: Player[], traits: string[]): Player[] {
  return players.map(p => ({ ...p, traits: [...(p.traits || []), ...traits] }));
}

function withArchetypes(players: Player[], forvetArk: string, defansArk: string): Player[] {
  return players.map(p => {
    if (p.specificPosition === "ST" || p.specificPosition === "LW" || p.specificPosition === "RW") {
      return { ...p, archetype: forvetArk };
    }
    if (["CB", "LB", "RB"].includes(p.specificPosition)) {
      return { ...p, archetype: defansArk };
    }
    return p;
  });
}

function run100(label: string, homeSquad: Player[], awaySquad: Player[]): { avgH: number; avgA: number; hWin: number; draw: number; aWin: number } {
  const N = 100;
  let hWin = 0, draw = 0, aWin = 0;
  let hGoals = 0, aGoals = 0;
  const tactic: ActiveTactic = { ...DEFAULT_TACTIC };
  for (let i = 0; i < N; i++) {
    const r = simulateEnhancedMatch(homeSquad as any, awaySquad as any, tactic as any, tactic as any, {
      homeTeamName: "Home", awayTeamName: "Away",
      refereePersonality: ["strict", "balanced", "lenient", "home_bias", "volatile"][i % 5] as any,
    } as any);
    hGoals += r.homeScore; aGoals += r.awayScore;
    if (r.homeScore > r.awayScore) hWin++;
    else if (r.homeScore < r.awayScore) aWin++;
    else draw++;
  }
  const avgH = hGoals / N, avgA = aGoals / N;
  console.log(`\n${label}`);
  console.log(`  ${N} maç: ${hWin}G/${draw}B/${aWin}G | Gol ort: H ${avgH.toFixed(2)} - A ${avgA.toFixed(2)} (toplam ${(avgH + avgA).toFixed(2)})`);
  return { avgH, avgA, hWin, draw, aWin };
}

async function main() {
  console.log("╔" + "═".repeat(68) + "╗");
  console.log("║" + " TRAIT + ARKETIP ETKI TESTI (100 maç / senaryo)".padEnd(68) + "║");
  console.log("╚" + "═".repeat(68) + "╝");

  const clubs = generateAllClubs();
  const baseHome = pickStartingXI(clubs[0].players);
  const baseAway = pickStartingXI(clubs[1].players);

  // 1) Baseline (trait'siz)
  const homeNoTraits = baseHome.map(p => ({ ...p, traits: [], negTraits: [], personalityTraits: [] }));
  const awayNoTraits = baseAway.map(p => ({ ...p, traits: [], negTraits: [], personalityTraits: [] }));
  const base = run100("1) BASELINE — Tüm trait'ler/arketipler sıfırlandı", homeNoTraits, awayNoTraits);

  // 2) Forvetlere "Gol Makinesi" arketipi
  const homeGolMak = withArchetypes(baseHome, "Gol Makinesi", "Duvar");
  const awayNoArk = baseAway.map(p => ({ ...p, archetype: undefined }));
  const gm = run100("2) HOME forvetlere 'Gol Makinesi' arketipi, defansa 'Duvar'", homeGolMak, awayNoArk);

  // 3) Forvetlere ofansif trait'ler
  const homeOffensiveTraits = withTraits(baseHome, ["Klasik Forvet", "Bitirici", "Penaltı Uzmanı"]);
  const offT = run100("3) HOME forvetlere 3 ofansif trait ('Klasik Forvet','Bitirici','Penaltı Uzmanı')", homeOffensiveTraits, awayNoTraits);

  // 4) Kaleciye "Refleks Canavarı" arketipi
  const homeGkArch = baseHome.map(p => p.specificPosition === "GK" ? { ...p, archetype: "Refleks Canavarı" } : p);
  const gk = run100("4) HOME kaleci 'Refleks Canavarı' arketipi", homeGkArch, baseAway);

  // 5) Defansa "Duvar" arketipi + kaleci "Refleks Canavarı"
  const homeDefWall = baseHome.map(p => {
    if (p.specificPosition === "GK") return { ...p, archetype: "Refleks Canavarı" };
    if (["CB", "LB", "RB"].includes(p.specificPosition)) return { ...p, archetype: "Duvar" };
    return p;
  });
  const dw = run100("5) HOME defans 'Duvar' + kaleci 'Refleks Canavarı'", homeDefWall, baseAway);

  // 6) Forvet + defans + kaleci (full trait paketi)
  const homeFull = withTraits(
    withArchetypes(baseHome, "Gol Makinesi", "Duvar")
      .map(p => p.specificPosition === "GK" ? { ...p, archetype: "Refleks Canavarı" } : p),
    ["Klasik Forvet", "Bitirici", "Penaltı Uzmanı"]
  );
  const ff = run100("6) HOME full trait+arketip paketi (Gol Makinesi + Duvar + Refleks + 3 trait)", homeFull, baseAway);

  // 7) Negatif traitler — Panikçi + Tembel
  const homeNeg = withTraits(baseHome, ["Panik yapar"]).map(p => ({ ...p, negTraits: ["Top Kaybı"] }));
  const ng = run100("7) HOME forvetlere negatif trait'ler ('Panik yapar' + 'Top Kaybı')", homeNeg, baseAway);

  // Özet
  console.log("\n" + "═".repeat(70));
  console.log("ÖZET");
  console.log("═".repeat(70));
  console.log("Senaryo                                     | H-Gol | A-Gol | Toplam");
  console.log("-".repeat(70));
  console.log(`1) Baseline (trait'siz)                      | ${base.avgH.toFixed(2)}  | ${base.avgA.toFixed(2)}  | ${(base.avgH + base.avgA).toFixed(2)}`);
  console.log(`2) Forvet 'Gol Makinesi' arketipi            | ${gm.avgH.toFixed(2)}  | ${gm.avgA.toFixed(2)}  | ${(gm.avgH + gm.avgA).toFixed(2)}`);
  console.log(`3) Forvet 3 ofansif trait                     | ${offT.avgH.toFixed(2)}  | ${offT.avgA.toFixed(2)}  | ${(offT.avgH + offT.avgA).toFixed(2)}`);
  console.log(`4) Kaleci 'Refleks Canavarı'                  | ${gk.avgH.toFixed(2)}  | ${gk.avgA.toFixed(2)}  | ${(gk.avgH + gk.avgA).toFixed(2)}`);
  console.log(`5) Defans 'Duvar' + Kaleci 'Refleks'         | ${dw.avgH.toFixed(2)}  | ${dw.avgA.toFixed(2)}  | ${(dw.avgH + dw.avgA).toFixed(2)}`);
  console.log(`6) Full trait + arketip paketi                | ${ff.avgH.toFixed(2)}  | ${ff.avgA.toFixed(2)}  | ${(ff.avgH + ff.avgA).toFixed(2)}`);
  console.log(`7) Negatif trait'ler (Panik + Top Kaybı)     | ${ng.avgH.toFixed(2)}  | ${ng.avgA.toFixed(2)}  | ${(ng.avgH + ng.avgA).toFixed(2)}`);

  console.log("\n" + "═".repeat(70));
  console.log("DEĞERLENDİRME");
  console.log("═".repeat(70));
  const checks = [
    { name: "Gol Makinesi arketipi → Home gol arttı", pass: gm.avgH > base.avgH },
    { name: "3 ofansif trait → Home gol arttı", pass: offT.avgH > base.avgH },
    { name: "Kaleci Refleks → Away gol düştü", pass: gk.avgA < base.avgA },
    { name: "Duvar + Refleks → Away gol düştü (güçlü)", pass: dw.avgA < base.avgA },
    { name: "Full paket → Home gol çok arttı", pass: ff.avgH > base.avgH * 1.1 },
    { name: "Full paket → Away gol düştü", pass: ff.avgA < base.avgA },
    { name: "Negatif trait → Home gol düştü", pass: ng.avgH < base.avgH },
  ];
  for (const c of checks) {
    console.log(`  ${c.pass ? "✓" : "✗"} ${c.name}`);
  }
  console.log(`\n${checks.filter(c => c.pass).length}/${checks.length} kontrol başarılı`);
}

main().catch(console.error);
