/**
 * 20 maç simüle et — gol ortalaması, beraberlik oranı, sakatlık oranı
 */

// Maç motorunu çağırmak için Next.js dev server üzerinden API kullanamayız,
// bu yüzden direkt motoru import edip çalıştıracağız.
//tsx kullanarak çalıştır.

import { simulateEnhancedMatch } from "../src/lib/match/engine/enhancedMatchEngine";
import { generatePlayer, generateTeam, type Player, type Team } from "../src/lib/mock/data";
import { DEFAULT_TACTIC } from "../src/lib/tactics/types";

function pickXI(players: Player[]): Player[] {
  return [...players]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 11);
}

function randomReferee() {
  const refs = ["strict", "balanced", "balanced", "lenient", "home_bias", "volatile", "var_lover"];
  return refs[Math.floor(Math.random() * refs.length)];
}

function simulate() {
  // Rastgele lig seviyeleri
  const tiers: (1|2|3|4)[] = [1, 2, 3, 4];
  const teamMetas = [
    { name: "Anadolu Gücü", short: "ANG", c1: "#134e4a", c2: "#fff" },
    { name: "Ege Fırtınası", short: "EGE", c1: "#1e3a5f", c2: "#fff" },
    { name: "Boğazspor", short: "BGZ", c1: "#4c1d95", c2: "#fff" },
    { name: "Yeditepespor", short: "YTP", c1: "#14532d", c2: "#fff" },
    { name: "Hisarspor", short: "HIS", c1: "#7f1d1d", c2: "#fff" },
    { name: "Efespor", short: "EFS", c1: "#854d0e", c2: "#fff" },
    { name: "Çınarspor", short: "CNR", c1: "#1a3a5f", c2: "#fff" },
    { name: "Karadeniz Yıldızı", short: "KYD", c1: "#0d2d4a", c2: "#fff" },
  ];

  let totalGoals = 0;
  let homeGoals = 0;
  let awayGoals = 0;
  let draws = 0;
  let homeWins = 0;
  let awayWins = 0;
  let totalInjuries = 0;
  let totalCards = 0;
  let totalEvents = 0;
  let maxGoals = 0;
  let minGoals = 999;
  const scores: string[] = [];

  for (let i = 0; i < 20; i++) {
    // Her maçta rastgele iki takım üret
    const metaA = teamMetas[i % teamMetas.length];
    const metaB = teamMetas[(i + 3) % teamMetas.length];
    const tierA = tiers[Math.floor(Math.random() * 4)];
    const tierB = tiers[Math.floor(Math.random() * 4)];

    const teamA: Team = generateTeam(metaA, tierA, 1);
    const teamB: Team = generateTeam(metaB, tierB, 1);
    const squadA = pickXI(teamA.players);
    const squadB = pickXI(teamB.players);

    const tactic = {
      ...DEFAULT_TACTIC,
      tactic_type: DEFAULT_TACTIC.formation,
      playerRoles: {} as Record<string, string>,
    };

    const result = simulateEnhancedMatch(
      squadA as any,
      squadB as any,
      tactic as any,
      tactic as any,
      {
        homeTeamName: teamA.name,
        awayTeamName: teamB.name,
        refereePersonality: randomReferee() as any,
        refereeName: "Hakem " + (i + 1),
        atmosphereScore: 40 + Math.floor(Math.random() * 40), // 40-80 rastgele
        pitchPassBonus: 0.02,
      } as any
    );

    const goals = result.homeScore + result.awayScore;
    totalGoals += goals;
    homeGoals += result.homeScore;
    awayGoals += result.awayScore;
    totalEvents += result.events.length;

    if (goals > maxGoals) maxGoals = goals;
    if (goals < minGoals) minGoals = goals;

    if (result.homeScore > result.awayScore) homeWins++;
    else if (result.homeScore < result.awayScore) awayWins++;
    else draws++;

    totalInjuries += result.events.filter((e: any) => e.type === "injury").length;
    totalCards += result.events.filter((e: any) => e.type === "yellow_card" || e.type === "red_card").length;
    scores.push(`${result.homeScore}-${result.awayScore}`);
  }

  console.log("═══════════════════════════════════════");
  console.log("  20 MAÇ SİMÜLASYON SONUÇLARI");
  console.log("═══════════════════════════════════════");
  console.log();
  console.log(`Skorlar: ${scores.join(", ")}`);
  console.log();
  console.log("── İSTATİSTİKLER ──────────────────────");
  console.log(`Toplam gol:          ${totalGoals}`);
  console.log(`Gol ortalaması:     ${(totalGoals / 20).toFixed(2)} gol/maç`);
  console.log(`Ev sahibi gol ort:  ${(homeGoals / 20).toFixed(2)}`);
  console.log(`Deplasman gol ort:  ${(awayGoals / 20).toFixed(2)}`);
  console.log(`En çok gollü maç:    ${maxGoals} gol`);
  console.log(`En az gollü maç:     ${minGoals} gol`);
  console.log();
  console.log("── SONUÇLAR ──────────────────────────");
  console.log(`Ev sahibi galibiyet: ${homeWins} (%${(homeWins / 20 * 100).toFixed(0)})`);
  console.log(`Deplasman galibiyet: ${awayWins} (%${(awayWins / 20 * 100).toFixed(0)})`);
  console.log(`Beraberlik:          ${draws} (%${(draws / 20 * 100).toFixed(0)})`);
  console.log();
  console.log("── OLAYLAR ───────────────────────────");
  console.log(`Toplam olay:         ${totalEvents} (ort ${(totalEvents / 20).toFixed(1)}/maç)`);
  console.log(`Toplam sakatlık:     ${totalInjuries} (ort ${(totalInjuries / 20).toFixed(2)}/maç)`);
  console.log(`Toplam kart:         ${totalCards} (ort ${(totalCards / 20).toFixed(2)}/maç)`);
  console.log();
  console.log("── TAKIM BİLGİSİ ─────────────────────");
  console.log("Her maçta rastgele takım (1-4 lig karışık)");
  console.log("═══════════════════════════════════════");
}

simulate();
