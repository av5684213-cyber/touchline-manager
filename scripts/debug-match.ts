/**
 * Maç motoru debug scripti.
 * Çalıştırma: npx tsx scripts/debug-match.ts
 */

import { simulateEnhancedMatch } from "../src/lib/match/engine/enhancedMatchEngine";
import { generateAllClubs, type Player } from "../src/lib/mock/data";

function pickStartingXI(players: Player[]): Player[] {
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const gk = sorted.filter((p) => p.specificPosition === "GK").slice(0, 1);
  const def = sorted
    .filter((p) => ["CB", "LB", "RB", "LWB", "RWB"].includes(p.specificPosition))
    .slice(0, 4);
  const mid = sorted
    .filter((p) => ["CDM", "CM", "CAM", "LM", "RM"].includes(p.specificPosition))
    .slice(0, 4);
  const fwd = sorted
    .filter((p) => ["LW", "RW", "ST", "CF"].includes(p.specificPosition))
    .slice(0, 2);
  return [...gk, ...def, ...mid, ...fwd];
}

async function main() {
  console.log("=== Match Engine Debug ===\n");

  const clubs = generateAllClubs();
  const home = clubs[0];
  const away = clubs[1];

  console.log(`Home: ${home.name} (${home.players.length} players)`);
  console.log(`Away: ${away.name} (${away.players.length} players)`);

  const homeSquad = pickStartingXI(home.players);
  const awaySquad = pickStartingXI(away.players);

  console.log(`\nHome starting XI:`);
  for (const p of homeSquad) {
    console.log(`  ${p.name} - ${p.specificPosition} - OVR ${p.rating} - cond ${p.cond} - form ${p.form} - morale ${p.morale}`);
  }

  const homeTactic = {
    formation: "4-4-2",
    tactic_type: "4-4-2",
    mentality: 3,
    pressing: false,
    passingStyle: "Karışık",
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
  const awayTactic = { ...homeTactic };

  console.log(`\nSimulating match...`);
  try {
    const result = simulateEnhancedMatch(
      homeSquad as any,
      awaySquad as any,
      homeTactic as any,
      awayTactic as any,
      {
        homeTeamName: home.name,
        awayTeamName: away.name,
      }
    );

    console.log(`\n=== Result ===`);
    console.log(`Score: ${result.homeScore} - ${result.awayScore}`);
    console.log(`Events: ${result.events.length}`);
    console.log(`Weather: ${result.weather}`);
    console.log(`Referee: ${result.refereeName} (${result.refereePersonality})`);
    console.log(`MOTM: ${result.manOfTheMatch}`);
    console.log(`Possession: ${result.homePossession}% - ${result.awayPossession}%`);

    console.log(`\n=== All events ===`);
    for (const ev of result.events) {
      console.log(`  ${ev.minute}' [${ev.type}] ${ev.team}: ${ev.description ?? ev.playerName ?? "(no desc)"}`);
    }

    console.log(`\n=== Player ratings (home) ===`);
    for (const r of result.homePlayerRatings) {
      console.log(`  ${r.playerName} (${r.position}): ${r.rating}`);
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

main().catch(console.error);
