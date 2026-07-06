/**
 * 80+ OVR takım vs 60- OVR takım — 10 maç simülasyonu
 */
import { simulateEnhancedMatch } from "../src/lib/match/engine/enhancedMatchEngine";
import { generatePlayer, type Player, type Team } from "../src/lib/mock/data";
import { DEFAULT_TACTIC } from "../src/lib/tactics/types";

function makeTeam(name: string, shortName: string, color: string, minOvr: number, maxOvr: number): Team {
  const positions: string[] = [
    "GK",
    "CB", "CB", "LB", "RB",
    "CDM", "CM", "CM", "CAM",
    "ST", "LW",
    // Yedekler
    "GK", "CB", "LB", "CM", "RW", "ST",
  ];
  const players: Player[] = [];
  for (let i = 0; i < positions.length; i++) {
    const p = generatePlayer(positions[i], { min: minOvr, max: maxOvr });
    players.push(p);
  }
  return {
    id: `team_${name.replace(/\s/g, "")}`,
    name,
    shortName,
    primaryColor: color,
    secondaryColor: "#ffffff",
    leagueTier: 1,
    department: 1,
    players,
    budget: 50_000_000,
    stadiumCapacity: 10000,
    stadiumName: `${name} Stadyumu`,
  };
}

function pickXI(players: Player[]): Player[] {
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const gk = sorted.filter((p) => p.specificPosition === "GK").slice(0, 1);
  const def = sorted.filter((p) => ["CB", "LB", "RB"].includes(p.specificPosition)).slice(0, 4);
  const mid = sorted.filter((p) => ["CDM", "CM", "CAM"].includes(p.specificPosition)).slice(0, 4);
  const fwd = sorted.filter((p) => ["LW", "RW", "ST"].includes(p.specificPosition)).slice(0, 2);
  return [...gk, ...def, ...mid, ...fwd].slice(0, 11);
}

async function main() {
  console.log("╔" + "═".repeat(68) + "╗");
  console.log("║" + " 80+ OVR vs 60- OVR — 10 Maç Simülasyonu".padEnd(68) + "║");
  console.log("╚" + "═".repeat(68) + "╝\n");

  const strongTeam = makeTeam("Yıldızspor", "YLD", "#1a3a2a", 78, 90);
  const weakTeam = makeTeam("Çayırspor", "CYR", "#7c2d12", 50, 62);

  const strongXI = pickXI(strongTeam.players);
  const weakXI = pickXI(weakTeam.players);

  console.log(`Güçlü takım: ${strongTeam.name} (${strongTeam.shortName})`);
  console.log(`  Kadro ortalaması: ${(strongTeam.players.reduce((s, p) => s + p.rating, 0) / strongTeam.players.length).toFixed(1)}`);
  console.log(`  İlk 11 ortalaması: ${(strongXI.reduce((s, p) => s + p.rating, 0) / strongXI.length).toFixed(1)}`);
  console.log(`  En iyi oyuncu: ${strongXI[0].firstName} ${strongXI[0].lastName} (${strongXI[0].rating} OVR)\n`);

  console.log(`Zayıf takım: ${weakTeam.name} (${weakTeam.shortName})`);
  console.log(`  Kadro ortalaması: ${(weakTeam.players.reduce((s, p) => s + p.rating, 0) / weakTeam.players.length).toFixed(1)}`);
  console.log(`  İlk 11 ortalaması: ${(weakXI.reduce((s, p) => s + p.rating, 0) / weakXI.length).toFixed(1)}`);
  console.log(`  En iyi oyuncu: ${weakXI[0].firstName} ${weakXI[0].lastName} (${weakXI[0].rating} OVR)\n`);

  let strongWins = 0, draws = 0, weakWins = 0;
  let strongGoals = 0, weakGoals = 0;
  let strongCleanSheets = 0;
  const tactic = { ...DEFAULT_TACTIC };

  console.log("Maç sonuçları:");
  console.log("-".repeat(50));

  for (let i = 0; i < 10; i++) {
    // Ev/deplasman dönüşümlü
    const isStrongHome = i % 2 === 0;
    const homeSquad = isStrongHome ? strongXI : weakXI;
    const awaySquad = isStrongHome ? weakXI : strongXI;

    const result = simulateEnhancedMatch(
      homeSquad as any,
      awaySquad as any,
      tactic as any,
      tactic as any,
      {
        homeTeamName: isStrongHome ? strongTeam.name : weakTeam.name,
        awayTeamName: isStrongHome ? weakTeam.name : strongTeam.name,
        refereePersonality: ["strict", "balanced", "lenient"][i % 3] as any,
      } as any
    );

    const strongScore = isStrongHome ? result.homeScore : result.awayScore;
    const weakScore = isStrongHome ? result.awayScore : result.homeScore;
    strongGoals += strongScore;
    weakGoals += weakScore;

    if (strongScore > weakScore) strongWins++;
    else if (strongScore < weakScore) weakWins++;
    else draws++;

    if (weakScore === 0) strongCleanSheets++;

    console.log(
      `Maç ${i + 1}: ${isStrongHome ? "YLD (ev)" : "CYR (ev)"} ${result.homeScore}-${result.awayScore} ${isStrongHome ? "CYR (dep)" : "YLD (dep)"} → ` +
      `${strongScore > weakScore ? "YLD kazandı" : strongScore < weakScore ? "CYR kazandı" : "Beraberlik"} ` +
      `| ${strongTeam.shortName} ${strongScore} - ${weakScore} ${weakTeam.shortName}`
    );
  }

  console.log("-".repeat(50));
  console.log("\n📊 ÖZET:");
  console.log(`  Yıldızspor (80+): ${strongWins}G / ${draws}B / ${weakWins}M`);
  console.log(`  Çayırspor (60-): ${weakWins}G / ${draws}B / ${strongWins}M`);
  console.log(`  Toplam gol: YLD ${strongGoals} - CYR ${weakGoals}`);
  console.log(`  Gol başına: YLD ${(strongGoals / 10).toFixed(1)} - CYR ${(weakGoals / 10).toFixed(1)}`);
  console.log(`  YLD gol yemedi: ${strongCleanSheets}/10`);
  console.log(`  YLD galibiyet oranı: %${(strongWins / 10 * 100).toFixed(0)}`);
  console.log(`  CYR galibiyet oranı: %${(weakWins / 10 * 100).toFixed(0)}`);

  // Değerlendirme
  console.log("\n📋 DEĞERLENDİRME:");
  if (strongWins >= 8) {
    console.log("  ✓ Güçlü takım beklenen gibi dominant — 80+ OVR farkı belirgin");
  } else if (strongWins >= 5) {
    console.log("  ⚠️ Güçlü takım kazanıyor ama fark beklenenden az — denge tartışmalı");
  } else {
    console.log("  ❌ Güçlü takım yeterince kazanamıyor — OVR farkı motora yansımıyor");
  }
}

main().catch(console.error);
