/**
 * Debug: tempoMod & widthMod gerçekten uygulanıyor mu?
 * Tek maç simülasyonu yapıp passCount'u yazdırır.
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

function debugMatch(label: string, homeTactic: ActiveTactic, awayTactic: ActiveTactic, homeSquad: Player[], awaySquad: Player[]) {
  // 10 maç ortalaması
  let homePassesTotal = 0;
  let awayPassesTotal = 0;
  let homeGoalsTotal = 0;
  let awayGoalsTotal = 0;
  const N = 20;
  for (let i = 0; i < N; i++) {
    const r = simulateEnhancedMatch(homeSquad as any, awaySquad as any, homeTactic as any, awayTactic as any, {
      homeTeamName: "Home", awayTeamName: "Away",
    } as any);
    homePassesTotal += r.homeStats.passes;
    awayPassesTotal += r.awayStats.passes;
    homeGoalsTotal += r.homeScore;
    awayGoalsTotal += r.awayScore;
  }
  console.log(`\n--- ${label} ---`);
  console.log(`Home avg passes: ${(homePassesTotal / N).toFixed(0)}`);
  console.log(`Away avg passes: ${(awayPassesTotal / N).toFixed(0)}`);
  console.log(`Home avg goals: ${(homeGoalsTotal / N).toFixed(2)}`);
  console.log(`Away avg goals: ${(awayGoalsTotal / N).toFixed(2)}`);
}

async function main() {
  console.log("=== DEBUG: tempoMod & widthMod Uygulaması ===");

  const clubs = generateAllClubs();
  const homeSquad = pickStartingXI(clubs[0].players);
  const awaySquad = pickStartingXI(clubs[1].players);

  // 1) Default
  debugMatch("1) Default (her iki takım varsayılan)",
    { ...DEFAULT_TACTIC }, { ...DEFAULT_TACTIC }, homeSquad, awaySquad);

  // 2) Home passingIntensity=0, Away passingIntensity=100
  //    Beklenti: Home pas azalır, Away pas artar
  debugMatch("2) Home passingIntensity=0, Away=100",
    { ...DEFAULT_TACTIC, passingIntensity: 0 },
    { ...DEFAULT_TACTIC, passingIntensity: 100 },
    homeSquad, awaySquad);

  // 3) Home width=0, Away width=100
  //    Beklenti: Away daha çok gol (geniş oyun)
  debugMatch("3) Home width=0, Away width=100",
    { ...DEFAULT_TACTIC, width: 0 },
    { ...DEFAULT_TACTIC, width: 100 },
    homeSquad, awaySquad);

  // 4) Home parkTheBus=true, Away normal
  //    Beklenti: Home gol yemesi azalır, attığı gol azalır
  debugMatch("4) Home parkTheBus=true, Away normal",
    { ...DEFAULT_TACTIC, parkTheBus: true },
    { ...DEFAULT_TACTIC },
    homeSquad, awaySquad);

  // 5) Home crossGame + loneStrikerCounter + width=100
  //    Beklenti: Home çok gol atar
  debugMatch("5) Home crossGame+loneStrikerCounter+width=100",
    { ...DEFAULT_TACTIC, crossGame: true, loneStrikerCounter: true, width: 100 },
    { ...DEFAULT_TACTIC },
    homeSquad, awaySquad);

  // 6) Home all defensive toggles + mentality=1
  //    Beklenti: Home gol yeme azalır
  debugMatch("6) Home full defensive (parkTheBus+wasteTime+screenKeeper+mentality=1)",
    { ...DEFAULT_TACTIC, parkTheBus: true, wasteTime: true, screenKeeper: true, mentality: 1 as any },
    { ...DEFAULT_TACTIC },
    homeSquad, awaySquad);

  // 7) Home all offensive toggles + mentality=5
  debugMatch("7) Home full offensive (crossGame+loneStrikerCounter+offsideTrap+mentality=5)",
    { ...DEFAULT_TACTIC, crossGame: true, loneStrikerCounter: true, offsideTrap: true, mentality: 5 as any, width: 80, passingIntensity: 80 },
    { ...DEFAULT_TACTIC },
    homeSquad, awaySquad);

  console.log("\n=== DEBUG TAMAMLANDI ===");
}

main().catch(console.error);
