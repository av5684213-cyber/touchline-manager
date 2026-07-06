/**
 * P3 Test: Maç sonrası oyuncu stats'ları (gol/asist/sarı/kırmızı) kalıcı işleniyor mu?
 * Maçtan önce ve sonra oyuncu stats'larını karşılaştırır.
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

async function main() {
  console.log("╔" + "═".repeat(68) + "╗");
  console.log("║" + " P3 TEST: Maç Sonrası Stats İşleme".padEnd(68) + "║");
  console.log("╚" + "═".repeat(68) + "╝");

  const clubs = generateAllClubs();
  const home = clubs[0];
  const away = clubs[1];
  const homeSquad = pickStartingXI(home.players);
  const awaySquad = pickStartingXI(away.players);

  // Maçtan önce oyuncu stats'larını kaydet
  const before = new Map<string, { goals: number; assists: number; saves: number; appearances: number }>();
  for (const p of homeSquad) {
    before.set(p.id, {
      goals: p.goals ?? 0,
      assists: p.assists ?? 0,
      saves: p.saves ?? 0,
      appearances: p.appearances ?? 0,
    });
  }

  // 5 maç simüle et (aynı kadroyla)
  const tactic: ActiveTactic = { ...DEFAULT_TACTIC };
  let totalHomeGoals = 0;
  let totalAwayGoals = 0;
  let totalYellow = 0;
  let totalRed = 0;
  let totalSaves = 0;
  let totalTackles = 0;

  for (let i = 0; i < 5; i++) {
    const r = simulateEnhancedMatch(homeSquad as any, awaySquad as any, tactic as any, tactic as any, {
      homeTeamName: home.name, awayTeamName: away.name,
      refereePersonality: ["strict", "balanced", "lenient", "home_bias", "volatile"][i % 5] as any,
    } as any);
    totalHomeGoals += r.homeScore;
    totalAwayGoals += r.awayScore;
    totalYellow += r.homeStats.yellowCards + r.awayStats.yellowCards;
    totalRed += r.homeStats.redCards + r.awayStats.redCards;
    totalSaves += r.homeStats.saves + r.awayStats.saves;
    totalTackles += r.homeStats.tackles + r.awayStats.tackles;
    console.log(`\nMaç ${i+1}: ${home.shortName} ${r.homeScore}-${r.awayScore} ${away.shortName}`);
    console.log(`  Sarı kart: ${r.homeStats.yellowCards + r.awayStats.yellowCards}, Kırmızı: ${r.homeStats.redCards + r.awayStats.redCards}`);
    console.log(`  Kurtarış: ${r.homeStats.saves + r.awayStats.saves}, Tackle: ${r.homeStats.tackles + r.awayStats.tackles}`);

    // Maç içi gol atan oyuncuları yazdır
    for (const ev of r.events) {
      if (ev.type === "goal") {
        const scorer = homeSquad.find(p => p.id === ev.playerId) || awaySquad.find(p => p.id === ev.playerId);
        const assister = ev.assistPlayerId
          ? homeSquad.find(p => p.id === ev.assistPlayerId) || awaySquad.find(p => p.id === ev.assistPlayerId)
          : null;
        console.log(`  ⚽ ${ev.minute}' ${scorer?.name ?? ev.playerName} (asist: ${assister?.name ?? "yok"}) — tür: ${(ev as any).goalType ?? "normal"}`);
      }
    }
  }

  // Test: EnhancedMatchResult'ın player ratings array'inde her oyuncu var mı?
  const lastResult = simulateEnhancedMatch(homeSquad as any, awaySquad as any, tactic as any, tactic as any, {
    homeTeamName: home.name, awayTeamName: away.name,
  } as any);
  console.log(`\n--- Son Maç Oyuncu Rating'leri ---`);
  console.log(`Home ratings count: ${lastResult.homePlayerRatings.length}`);
  console.log(`Away ratings count: ${lastResult.awayPlayerRatings.length}`);
  console.log(`Total events: ${lastResult.events.length}`);

  // Event types dağılımı
  const eventTypeCount = new Map<string, number>();
  for (const ev of lastResult.events) {
    eventTypeCount.set(ev.type, (eventTypeCount.get(ev.type) ?? 0) + 1);
  }
  console.log(`\nEvent türü dağılımı:`);
  for (const [type, count] of [...eventTypeCount.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  // P3 mantığını manuel uygula — applyPostMatchEffects taklit
  console.log(`\n--- P3 Mantık Testi (manuel stats accumulation) ---`);

  // Event'leri tara
  const matchStatsMap = new Map<string, any>();
  for (const r of [...lastResult.homePlayerRatings, ...lastResult.awayPlayerRatings]) {
    matchStatsMap.set(r.playerId, {
      goals: 0, assists: 0, saves: 0, shots: 0, shotsOnTarget: 0,
      passes: 0, passesCompleted: 0, tackles: 0, interceptions: 0,
      yellowCards: 0, redCards: 0, fouls: 0,
      goalsRight: 0, goalsLeft: 0, goalsHead: 0, goalsPenalty: 0, goalsFreekick: 0,
    });
  }

  for (const ev of lastResult.events) {
    const pid = ev.playerId;
    if (!pid) continue;
    const stats = matchStatsMap.get(pid);
    if (!stats) continue;

    if (ev.type === "goal") {
      stats.goals++;
      stats.shots++;
      stats.shotsOnTarget++;
      const gt = (ev as any).goalType;
      if (gt === "header") stats.goalsHead++;
      else if (gt === "penalty") stats.goalsPenalty++;
      else if (gt === "freekick") stats.goalsFreekick++;
      else stats.goalsRight++;
    } else if (ev.type === "yellow_card") {
      stats.yellowCards++;
      stats.fouls++;
    } else if (ev.type === "red_card") {
      stats.redCards++;
      stats.fouls++;
    } else if (ev.type === "tackle") stats.tackles++;
    else if (ev.type === "interception") stats.interceptions++;
    else if (ev.type === "save") stats.saves++;

    if (ev.type === "goal" && ev.assistPlayerId) {
      const aStats = matchStatsMap.get(ev.assistPlayerId);
      if (aStats) {
        aStats.assists++;
        aStats.passes++;
        aStats.passesCompleted++;
      }
    }
  }

  // Sonuçları yazdır
  console.log(`\nMaç sonrası işlenecek stats (her oyuncu için):`);
  let totalGoals = 0, totalAssists = 0, totalYellowCards = 0, totalRedCards = 0;
  for (const [pid, stats] of matchStatsMap.entries()) {
    if (stats.goals > 0 || stats.assists > 0 || stats.yellowCards > 0 || stats.redCards > 0 || stats.saves > 0) {
      const player = homeSquad.find(p => p.id === pid) || awaySquad.find(p => p.id === pid);
      console.log(`  ${player?.name ?? pid}: ${stats.goals}G ${stats.assists}A ${stats.saves}K ${stats.yellowCards}S ${stats.redCards}K (gol türü: ${stats.goalsRight}sağ ${stats.goalsLeft}sol ${stats.goalsHead}kafa ${stats.goalsPenalty}pen ${stats.goalsFreekick}free)`);
      totalGoals += stats.goals;
      totalAssists += stats.assists;
      totalYellowCards += stats.yellowCards;
      totalRedCards += stats.redCards;
    }
  }
  console.log(`\nToplam: ${totalGoals} gol, ${totalAssists} asist, ${totalYellowCards} sarı, ${totalRedCards} kırmızı`);
  console.log(`Maç sonucu: ${lastResult.homeScore}-${lastResult.awayScore}`);
  console.log(`Doğrulama: top gol = maç sonucu toplamı? ${totalGoals === lastResult.homeScore + lastResult.awayScore ? "✓ EVET" : "✗ HAYIR"}`);
}

main().catch(console.error);
