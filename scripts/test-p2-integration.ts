/**
 * P2 Entegrasyon Testi — leftFoot/rightFoot, reflexes/handling, kicking, command, throwing
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

function run100(label: string, homeSquad: Player[], awaySquad: Player[]) {
  const N = 100;
  let hWin = 0, draw = 0, aWin = 0;
  let hGoals = 0, aGoals = 0;
  let hPasses = 0, aPasses = 0;
  let hPassAcc = 0, aPassAcc = 0;
  const tactic: ActiveTactic = { ...DEFAULT_TACTIC };
  for (let i = 0; i < N; i++) {
    const r = simulateEnhancedMatch(homeSquad as any, awaySquad as any, tactic as any, tactic as any, {
      homeTeamName: "Home", awayTeamName: "Away",
      refereePersonality: ["strict", "balanced", "lenient", "home_bias", "volatile"][i % 5] as any,
    } as any);
    hGoals += r.homeScore; aGoals += r.awayScore;
    hPasses += r.homeStats.passes; aPasses += r.awayStats.passes;
    hPassAcc += r.homeStats.passAccuracy; aPassAcc += r.awayStats.passAccuracy;
    if (r.homeScore > r.awayScore) hWin++;
    else if (r.homeScore < r.awayScore) aWin++;
    else draw++;
  }
  console.log(`\n${label}`);
  console.log(`  ${N} maç: ${hWin}G/${draw}B/${aWin}G | Gol: H ${(hGoals/N).toFixed(2)} - A ${(aGoals/N).toFixed(2)}`);
  console.log(`  Pas: H ${(hPasses/N).toFixed(0)} (${(hPassAcc/N).toFixed(1)}%) - A ${(aPasses/N).toFixed(0)} (${(aPassAcc/N).toFixed(1)}%)`);
  return { avgH: hGoals/N, avgA: aGoals/N, hPassAcc: hPassAcc/N, aPassAcc: aPassAcc/N };
}

async function main() {
  console.log("╔" + "═".repeat(68) + "╗");
  console.log("║" + " P2 ENTEGRASYON TESTI".padEnd(68) + "║");
  console.log("╚" + "═".repeat(68) + "╝");

  const clubs = generateAllClubs();
  const baseHome = pickStartingXI(clubs[0].players);
  const baseAway = pickStartingXI(clubs[1].players);

  // 1) Baseline
  const base = run100("1) BASELINE", baseHome, baseAway);

  // 2) AWAY kaleciye yüksek reflexes (90) + handling (85)
  const awayGkStrong = baseAway.map(p => {
    if (p.specificPosition === "GK") return { ...p, reflexes: 90, handling: 85 };
    return p;
  });
  const gkStrong = run100("2) AWAY kaleci reflexes=90, handling=85", baseHome, awayGkStrong);

  // 3) AWAY kaleciye düşük reflexes (40) + handling (40)
  const awayGkWeak = baseAway.map(p => {
    if (p.specificPosition === "GK") return { ...p, reflexes: 40, handling: 40 };
    return p;
  });
  const gkWeak = run100("3) AWAY kaleci reflexes=40, handling=40", baseHome, awayGkWeak);

  // 4) HOME forvetlere zayıf ayak (leftFoot=20, rightFoot=20)
  const homeFwdWeakFoot = baseHome.map(p => {
    if (["ST", "LW", "RW"].includes(p.specificPosition)) {
      return { ...p, leftFoot: 20, rightFoot: 20 };
    }
    return p;
  });
  const fwdWeakFoot = run100("4) HOME forvetlere zayıf ayak (leftFoot=20, rightFoot=20)", homeFwdWeakFoot, baseAway);

  // 5) HOME forvetlere güçlü ayak (leftFoot=90, rightFoot=90) — çift ayaklı
  const homeFwdStrongFoot = baseHome.map(p => {
    if (["ST", "LW", "RW"].includes(p.specificPosition)) {
      return { ...p, leftFoot: 90, rightFoot: 90 };
    }
    return p;
  });
  const fwdStrongFoot = run100("5) HOME forvetlere güçlü ayak (leftFoot=90, rightFoot=90)", homeFwdStrongFoot, baseAway);

  // 6) HOME kaleciye yüksek kicking (90) + throwing (85)
  const homeGkPasser = baseHome.map(p => {
    if (p.specificPosition === "GK") return { ...p, kicking: 90, throwing: 85 };
    return p;
  });
  const gkPasser = run100("6) HOME kaleci kicking=90, throwing=85", homeGkPasser, baseAway);

  // 7) HOME kaleciye yüksek command (90)
  const homeGkCommand = baseHome.map(p => {
    if (p.specificPosition === "GK") return { ...p, command: 90 };
    return p;
  });
  const gkCommand = run100("7) HOME kaleci command=90", homeGkCommand, baseAway);

  // 8) HOME forvetlere yüksek firstTouch (90)
  const homeFirstTouch = baseHome.map(p => {
    if (["ST", "LW", "RW", "CAM"].includes(p.specificPosition)) {
      return { ...p, firstTouch: 90 };
    }
    return p;
  });
  const ft = run100("8) HOME forvetlere yüksek firstTouch=90", homeFirstTouch, baseAway);

  // Özet
  console.log("\n" + "═".repeat(70));
  console.log("ÖZET");
  console.log("═".repeat(70));
  console.log("Senaryo                                              | H-Gol | A-Gol | H-Pas% | A-Pas%");
  console.log("-".repeat(70));
  console.log(`1) Baseline                                          | ${base.avgH.toFixed(2)}  | ${base.avgA.toFixed(2)}  | ${base.hPassAcc.toFixed(1)}  | ${base.aPassAcc.toFixed(1)}`);
  console.log(`2) AWAY kaleci reflexes+hHandling yüksek            | ${gkStrong.avgH.toFixed(2)}  | ${gkStrong.avgA.toFixed(2)}  | ${gkStrong.hPassAcc.toFixed(1)}  | ${gkStrong.aPassAcc.toFixed(1)}`);
  console.log(`3) AWAY kaleci reflexes+handling düşük              | ${gkWeak.avgH.toFixed(2)}  | ${gkWeak.avgA.toFixed(2)}  | ${gkWeak.hPassAcc.toFixed(1)}  | ${gkWeak.aPassAcc.toFixed(1)}`);
  console.log(`4) HOME forvet zayıf ayak                            | ${fwdWeakFoot.avgH.toFixed(2)}  | ${fwdWeakFoot.avgA.toFixed(2)}  | ${fwdWeakFoot.hPassAcc.toFixed(1)}  | ${fwdWeakFoot.aPassAcc.toFixed(1)}`);
  console.log(`5) HOME forvet güçlü ayak                            | ${fwdStrongFoot.avgH.toFixed(2)}  | ${fwdStrongFoot.avgA.toFixed(2)}  | ${fwdStrongFoot.hPassAcc.toFixed(1)}  | ${fwdStrongFoot.aPassAcc.toFixed(1)}`);
  console.log(`6) HOME kaleci kicking+throwing yüksek              | ${gkPasser.avgH.toFixed(2)}  | ${gkPasser.avgA.toFixed(2)}  | ${gkPasser.hPassAcc.toFixed(1)}  | ${gkPasser.aPassAcc.toFixed(1)}`);
  console.log(`7) HOME kaleci command yüksek                       | ${gkCommand.avgH.toFixed(2)}  | ${gkCommand.avgA.toFixed(2)}  | ${gkCommand.hPassAcc.toFixed(1)}  | ${gkCommand.aPassAcc.toFixed(1)}`);
  console.log(`8) HOME forvet firstTouch yüksek                    | ${ft.avgH.toFixed(2)}  | ${ft.avgA.toFixed(2)}  | ${ft.hPassAcc.toFixed(1)}  | ${ft.aPassAcc.toFixed(1)}`);

  console.log("\n" + "═".repeat(70));
  console.log("DEĞERLENDİRME");
  console.log("═".repeat(70));
  const checks = [
    { name: "AWAY güçlü kaleci → Home gol düştü", pass: gkStrong.avgH < base.avgH },
    { name: "AWAY zayıf kaleci → Home gol arttı", pass: gkWeak.avgH > base.avgH },
    { name: "AWAY güçlü kaleci → Home gol < AWAY zayıf kaleci", pass: gkStrong.avgH < gkWeak.avgH },
    { name: "HOME zayıf ayak forvet → Home gol düştü", pass: fwdWeakFoot.avgH < base.avgH },
    { name: "HOME güçlü ayak forvet → Home gol arttı", pass: fwdStrongFoot.avgH > base.avgH },
    { name: "HOME kaleci kicking+throwing yüksek → Home pas isabeti arttı", pass: gkPasser.hPassAcc > base.hPassAcc },
    { name: "HOME kaleci command yüksek → Home gol yeme düştü", pass: gkCommand.avgA < base.avgA },
    { name: "HOME firstTouch yüksek → Home pas isabeti arttı", pass: ft.hPassAcc > base.hPassAcc },
  ];
  for (const c of checks) {
    console.log(`  ${c.pass ? "✓" : "✗"} ${c.name}`);
  }
  console.log(`\n${checks.filter(c => c.pass).length}/${checks.length} kontrol başarılı`);
}

main().catch(console.error);
