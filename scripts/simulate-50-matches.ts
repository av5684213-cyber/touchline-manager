/**
 * 50 maç simülasyonu — v2.9.18
 * Oyuncu gücü + maç motoru + trait dağılımı testi
 */
import { generateAllClubs, generatePlayer } from "../src/lib/mock/data";
import { simulateBotMatch, pickBotXI, getBotFormation, getBotTacticProfile } from "../src/lib/botAI";

// Test: 50 maç simüle et
function runSimulation() {
  const clubs = generateAllClubs();
  console.log(`=== ${clubs.length} takım üretildi ===\n`);

  // Trait dağılımı analizi
  let totalPlayers = 0;
  let playersWithTraits = 0;
  let playersWithNegTraits = 0;
  let playersWithPersonality = 0;
  let totalTraits = 0;
  let totalNegTraits = 0;
  let totalPersonality = 0;

  for (const club of clubs) {
    for (const p of club.players) {
      totalPlayers++;
      if (p.traits && p.traits.length > 0) {
        playersWithTraits++;
        totalTraits += p.traits.length;
      }
      if (p.negTraits && p.negTraits.length > 0) {
        playersWithNegTraits++;
        totalNegTraits += p.negTraits.length;
      }
      if (p.personalityTraits && p.personalityTraits.length > 0) {
        playersWithPersonality++;
        totalPersonality += p.personalityTraits.length;
      }
    }
  }

  console.log("=== TRAIT DAĞILIMI ===");
  console.log(`Toplam oyuncu: ${totalPlayers}`);
  console.log(`Pozitif trait'li oyuncu: ${playersWithTraits} (%${Math.round(playersWithTraits / totalPlayers * 100)})`);
  console.log(`Negatif trait'li oyuncu: ${playersWithNegTraits} (%${Math.round(playersWithNegTraits / totalPlayers * 100)})`);
  console.log(`Personality trait'li oyuncu: ${playersWithPersonality} (%${Math.round(playersWithPersonality / totalPlayers * 100)})`);
  console.log(`Toplam pozitif trait: ${totalTraits} (ortalama ${totalTraits / totalPlayers})`);
  console.log(`Toplam negatif trait: ${totalNegTraits} (ortalama ${totalNegTraits / totalPlayers})`);
  console.log(`Toplam personality: ${totalPersonality} (ortalama ${totalPersonality / totalPlayers})`);
  console.log("");

  // OVR dağılımı
  const ovrBuckets: Record<string, number> = {};
  for (const club of clubs) {
    for (const p of club.players) {
      const bucket = Math.floor(p.rating / 10) * 10;
      const key = `${bucket}-${bucket + 9}`;
      ovrBuckets[key] = (ovrBuckets[key] ?? 0) + 1;
    }
  }
  console.log("=== OVR DAĞILIMI ===");
  for (const [key, count] of Object.entries(ovrBuckets).sort()) {
    console.log(`  ${key}: ${count} oyuncu (${"#".repeat(Math.round(count / 10))})`);
  }
  console.log("");

  // 50 maç simüle et
  console.log("=== 50 MAÇ SİMÜLASYONU ===\n");
  let totalGoals = 0;
  let totalHomeGoals = 0;
  let totalAwayGoals = 0;
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let cleanSheets = 0;
  let highScoring = 0; // 4+ gol
  let zeroZero = 0;

  const scorelines: string[] = [];

  for (let i = 0; i < 50; i++) {
    const homeIdx = Math.floor(Math.random() * clubs.length);
    let awayIdx = Math.floor(Math.random() * clubs.length);
    while (awayIdx === homeIdx) awayIdx = Math.floor(Math.random() * clubs.length);

    const home = clubs[homeIdx];
    const away = clubs[awayIdx];

    const result = simulateBotMatch(home, away, 1);

    totalGoals += result.homeScore + result.awayScore;
    totalHomeGoals += result.homeScore;
    totalAwayGoals += result.awayScore;

    if (result.homeScore > result.awayScore) homeWins++;
    else if (result.homeScore < result.awayScore) awayWins++;
    else draws++;

    if (result.homeScore === 0 && result.awayScore === 0) zeroZero++;
    if (result.homeScore === 0 || result.awayScore === 0) cleanSheets++;
    if (result.homeScore + result.awayScore >= 4) highScoring++;

    scorelines.push(`${home.shortName} ${result.homeScore}-${result.awayScore} ${away.shortName}`);
  }

  console.log("Skorlar:");
  for (let i = 0; i < scorelines.length; i++) {
    process.stdout.write(`${scorelines[i]}  `);
    if ((i + 1) % 5 === 0) console.log();
  }
  console.log("\n");

  console.log("=== İSTATİSTİK ===");
  console.log(`Toplam gol: ${totalGoals} (ortalama ${(totalGoals / 50).toFixed(2)} gol/maç)`);
  console.log(`Ev sahibi gol: ${totalHomeGoals} (ortalama ${(totalHomeGoals / 50).toFixed(2)})`);
  console.log(`Deplasman gol: ${totalAwayGoals} (ortalama ${(totalAwayGoals / 50).toFixed(2)})`);
  console.log(`Ev sahibi galibiyet: ${homeWins} (%${Math.round(homeWins / 50 * 100)})`);
  console.log(`Deplasman galibiyet: ${awayWins} (%${Math.round(awayWins / 50 * 100)})`);
  console.log(`Beraberlik: ${draws} (%${Math.round(draws / 50 * 100)})`);
  console.log(`Golsuz maç (0-0): ${zeroZero}`);
  console.log(`Gol yemeyen takım (clean sheet): ${cleanSheets}`);
  console.log(`Yüksek skorlu (4+ gol): ${highScoring}`);
  console.log("");

  // Formasyon dağılımı
  console.log("=== BOT FORMASYON DAĞILIMI ===");
  const formationCounts: Record<string, number> = {};
  for (const club of clubs) {
    const f = getBotFormation(club.id);
    formationCounts[f] = (formationCounts[f] ?? 0) + 1;
  }
  for (const [f, count] of Object.entries(formationCounts).sort()) {
    console.log(`  ${f}: ${count} takım`);
  }
  console.log("");

  // Bot XI pozisyon kontrolü — ilk 3 takımın ilk 11'i
  console.log("=== İLK 3 TAKIM BOT XI (pozisyon kontrolü) ===");
  for (let i = 0; i < 3; i++) {
    const club = clubs[i];
    const formation = getBotFormation(club.id);
    const xi = pickBotXI(club.players, formation, 1);
    const profile = getBotTacticProfile(club);
    console.log(`\n${club.name} (${formation}, mentality=${profile.mentality}, pressing=${profile.pressing}):`);
    const positions = xi.map(p => `${p.specificPosition}(${p.rating})`);
    console.log(`  XI: ${positions.join(", ")}`);
    const groups = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    for (const p of xi) {
      if (p.specificPosition === "GK") groups.GK++;
      else if (["CB","LB","RB","LWB","RWB"].includes(p.specificPosition)) groups.DEF++;
      else if (["CDM","CM","CAM","LM","RM"].includes(p.specificPosition)) groups.MID++;
      else groups.FWD++;
    }
    console.log(`  Dağılım: GK=${groups.GK} DEF=${groups.DEF} MID=${groups.MID} FWD=${groups.FWD}`);
  }

  console.log("\n=== ANALİZ ===");
  const avgGoals = totalGoals / 50;
  if (avgGoals > 3.0) {
    console.log("⚠️ ORTALAMA GOL ÇOK YÜKSEK! (" + avgGoals.toFixed(2) + "/maç)");
    console.log("   Hedef: 2.2-2.8 gol/maç (gerçek futbol ortalaması)");
  } else if (avgGoals < 1.5) {
    console.log("⚠️ ORTALAMA GOL ÇOK DÜŞÜK! (" + avgGoals.toFixed(2) + "/maç)");
  } else {
    console.log("✓ Ortalama gol makul: " + avgGoals.toFixed(2) + "/maç");
  }

  const homeWinPct = homeWins / 50 * 100;
  if (homeWinPct > 55) {
    console.log("⚠️ EV SAHİBİ AVANTAJI ÇOK YÜKSEK! (%" + Math.round(homeWinPct) + ")");
    console.log("   Hedef: %42-48 ev sahibi galibiyet");
  } else if (homeWinPct < 35) {
    console.log("⚠️ EV SAHİBİ AVANTAJI ÇOK DÜŞÜK! (%" + Math.round(homeWinPct) + ")");
  } else {
    console.log("✓ Ev sahibi avantajı makul: %" + Math.round(homeWinPct));
  }

  if (playersWithTraits / totalPlayers > 0.5) {
    console.log("⚠️ TRAIT DAĞILIMI ÇOK YOĞUN! %" + Math.round(playersWithTraits / totalPlayers * 100) + " oyuncuda trait var");
    console.log("   Hedef: %30-40 oyuncuda pozitif trait");
  } else {
    console.log("✓ Trait dağılımı makul: %" + Math.round(playersWithTraits / totalPlayers * 100));
  }
}

runSimulation();
