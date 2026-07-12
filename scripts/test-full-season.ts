/**
 * Tam Sezon Simülasyon Testi
 * 34 hafta boyunca "benim kararım → benim sonucum" akışını test eder
 */
import { useAppStore } from "@/lib/store";
import { SEASON_INFO } from "@/lib/mock/season";
import { computeStandings } from "@/lib/mock/season";

function runFullSeasonTest() {
  console.log("=== TAM SEZON SİMÜLASYONU BAŞLIYOR ===\n");

  // Demo giriş
  useAppStore.getState().loginDemo();
  const state0 = useAppStore.getState();
  const teamId = state0.myTeamId!;
  const team0 = state0.clubs.find(c => c.id === teamId)!;
  console.log(`Takım: ${team0.name} (Lig: Tier ${team0.leagueTier})`);
  console.log(`Başlangıç bütçesi: €${team0.budget.toLocaleString()}`);
  console.log(`Kadro: ${team0.players.length} oyuncu`);
  console.log(`Sezon: ${state0.seasonNumber}, Hafta: ${state0.seasonMatchday}`);
  console.log(`SEASON_INFO: matchday=${SEASON_INFO.matchday}, totalMatchdays=${SEASON_INFO.totalMatchdays}`);
  console.log(`Fikstür sayısı: ${state0.fixtures.length}`);
  const mds = new Set(state0.fixtures.map(f => f.matchday));
  console.log(`Matchday sayısı: ${mds.size}, max: ${Math.max(...mds)}\n`);

  // Sezon öncesi taktik ayarla
  useAppStore.getState().updateActiveTactic({ formation: "4-3-3", mentality: 4 });
  console.log("Taktik: 4-3-3, Ofansif mentality\n");

  let wins = 0, draws = 0, losses = 0;
  let goalsFor = 0, goalsAgainst = 0;
  const matchResults: { md: number; opp: string; score: string; result: string }[] = [];

  // 34 hafta oyna — ama sadece 1 sezon (14→34 = 20 hafta)
  for (let week = SEASON_INFO.matchday; week <= SEASON_INFO.totalMatchdays; week++) {
    const beforeState = useAppStore.getState();
    const beforeStandings = computeStandings(beforeState.clubs, beforeState.fixtures);
    const beforeMyStat = beforeStandings.find(s => s.teamId === teamId);
    const beforePoints = beforeMyStat?.points ?? 0;

    // Kullanıcının maçı oynanmamış mı kontrol et
    const currentMd = SEASON_INFO.matchday;
    const userMatch = beforeState.fixtures.find(
      f => f.matchday === currentMd && !f.played && (f.homeId === teamId || f.awayId === teamId)
    );

    if (!userMatch) {
      console.log(`Hafta ${currentMd}: Kullanıcı maçı yok veya zaten oynanmış`);
      if (currentMd >= SEASON_INFO.totalMatchdays) break;
      useAppStore.getState().advanceMatchday();
      continue;
    }

    // Haftayı ilerlet — kendi maçını da oynasın
    useAppStore.getState().advanceMatchday();

    // Sonucu kontrol et
    const afterState = useAppStore.getState();
    const afterStandings = computeStandings(afterState.clubs, afterState.fixtures);
    const afterMyStat = afterStandings.find(s => s.teamId === teamId);

    // Oynanan maçı bul
    const playedMatch = afterState.fixtures.find(
      f => f.matchday === currentMd && f.played && (f.homeId === teamId || f.awayId === teamId)
    );

    if (playedMatch) {
      const isHome = playedMatch.homeId === teamId;
      const myScore = isHome ? playedMatch.homeScore! : playedMatch.awayScore!;
      const oppScore = isHome ? playedMatch.awayScore! : playedMatch.homeScore!;
      const oppTeam = afterState.clubs.find(c => c.id === (isHome ? playedMatch.awayId : playedMatch.homeId));
      const result = myScore > oppScore ? "G" : myScore < oppScore ? "M" : "B";

      if (result === "G") wins++;
      else if (result === "B") draws++;
      else losses++;
      goalsFor += myScore;
      goalsAgainst += oppScore;

      matchResults.push({
        md: currentMd,
        opp: oppTeam?.name ?? "???",
        score: `${myScore}-${oppScore}`,
        result,
      });

      const pointsDiff = (afterMyStat?.points ?? 0) - beforePoints;
      console.log(`Hafta ${currentMd}: ${team0.name} ${myScore}-${oppScore} ${oppTeam?.name ?? "???"} [${result}] | Puan: ${beforePoints}→${afterMyStat?.points} (+${pointsDiff})`);
    } else {
      console.log(`Hafta ${currentMd}: HATA — maç oynanmadı!`);
    }

    // Sezon bitti mi?
    if (useAppStore.getState().seasonNumber > 1) {
      console.log(">>> Sezon bitti! <<<\n");
      break;
    }
  }

  // Sezon sonu özeti
  console.log("\n=== SEZON SONU ÖZETİ ===");
  const finalState = useAppStore.getState();
  const finalStandings = computeStandings(finalState.clubs, finalState.fixtures);
  const myFinalStat = finalStandings.find(s => s.teamId === teamId);
  const myFinalTeam = finalState.clubs.find(c => c.id === teamId)!;
  const myPos = finalStandings.findIndex(s => s.teamId === teamId) + 1;

  console.log(`Sıralama: ${myPos}. sırada (18 takım)`);
  console.log(`Puan: ${myFinalStat?.points ?? 0}`);
  console.log(`Maçlar: ${wins}G ${draws}B ${losses}M (Toplam: ${wins + draws + losses})`);
  console.log(`Goller: ${goalsFor} atıldı, ${goalsAgainst} yenildi (Averaj: ${goalsFor - goalsAgainst})`);
  console.log(`Bütçe: €${myFinalTeam.budget.toLocaleString()}`);
  console.log(`Kadro: ${myFinalTeam.players.length} oyuncu`);

  // Gol kralı kontrol
  const allPlayers = finalState.clubs.flatMap(c => c.players);
  const topScorer = [...allPlayers].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
  const myTopScorer = [...myFinalTeam.players].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
  console.log(`\nGol Kralı: ${topScorer?.firstName} ${topScorer?.lastName} (${topScorer?.goals} gol) — ${finalState.clubs.find(c => c.players.some(p => p.id === topScorer?.id))?.name}`);
  console.log(`Benim gol kralım: ${myTopScorer?.firstName} ${myTopScorer?.lastName} (${myTopScorer?.goals} gol)`);

  // Kullanıcı maçı oynandı mı kontrol
  const userMatches = finalState.fixtures.filter(
    f => (f.homeId === teamId || f.awayId === teamId) && f.played
  );
  console.log(`\nKullanıcı maçları oynandı: ${userMatches.length}/34`);

  // "Benim kararım → benim sonucum" testi
  console.log("\n=== 'BENİM KARARIM → BENİM SONUCUM' TESTİ ===");
  const pointsChanged = (myFinalStat?.points ?? 0) > 0;
  const matchesPlayed = userMatches.length === 34;
  const goalsScored = goalsFor > 0;
  const standingsChanged = myPos > 0;

  console.log(`✅ Puan değişti: ${pointsChanged ? "EVET" : "HAYIR"} (0 → ${myFinalStat?.points})`);
  console.log(`✅ 34 maç oynandı: ${matchesPlayed ? "EVET" : `HAYIR (${userMatches.length}/34)`}`);
  console.log(`✅ Gol atıldı: ${goalsScored ? "EVET" : "HAYIR"} (${goalsFor} gol)`);
  console.log(`✅ Sıralama var: ${standingsChanged ? "EVET" : "HAYIR"} (${myPos}.)`);

  const allPass = pointsChanged && matchesPlayed && goalsScored && standingsChanged;
  console.log(`\n${allPass ? "✅ TEST BAŞARILI — Oyun oynanabilir" : "❌ TEST BAŞARISIZ — Sorunlar var"}`);

  // İlk 10 maç özeti
  console.log("\n=== İLK 10 MAÇ ===");
  matchResults.slice(0, 10).forEach(m => {
    console.log(`  Hafta ${m.md}: vs ${m.opp} → ${m.score} [${m.result}]`);
  });

  // Son 10 maç özeti
  console.log("\n=== SON 10 MAÇ ===");
  matchResults.slice(-10).forEach(m => {
    console.log(`  Hafta ${m.md}: vs ${m.opp} → ${m.score} [${m.result}]`);
  });

  return { allPass, wins, draws, losses, points: myFinalStat?.points ?? 0, position: myPos };
}

// Testi çalıştır
const result = runFullSeasonTest();
console.log("\n=== TEST TAMAMLANDI ===");
process.exit(0);
