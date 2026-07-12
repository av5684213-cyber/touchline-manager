/**
 * 5 Sezonluk Tam Simülasyon Testi
 * Transfer, kiralama, taktik değişimi, sezon sonu — hepsi test edilir
 */
import { useAppStore } from "@/lib/store";
import { SEASON_INFO, computeStandings } from "@/lib/mock/season";

function runFullGameTest() {
  console.log("=== 5 SEZONLUK TAM OYUN TESTİ ===\n");

  // Demo giriş
  useAppStore.getState().loginDemo();
  let state = useAppStore.getState();
  const teamId = state.myTeamId!;
  let team = state.clubs.find(c => c.id === teamId)!;
  console.log(`Takım: ${team.name} (Tier ${team.leagueTier})`);
  console.log(`Bütçe: €${team.budget.toLocaleString()}`);
  console.log(`Kadro: ${team.players.length} oyuncu\n`);

  const issues: string[] = [];
  const seasonResults: any[] = [];

  // 5 sezon oyna
  for (let season = 1; season <= 5; season++) {
    console.log(`\n=== SEZON ${season} ===`);

    // Taktik değiştir (her sezon farklı)
    const formations = ["4-3-3", "4-4-2", "4-5-1", "3-5-2", "4-2-3-1"];
    const formation = formations[(season - 1) % formations.length];
    useAppStore.getState().updateActiveTactic({ formation });
    console.log(`Taktik: ${formation}`);

    // Transfer yap (her sezon 1 oyuncu al)
    state = useAppStore.getState();
    const freeAgents = state.transfer.freeAgents;
    if (freeAgents.length > 0) {
      const target = freeAgents[0];
      const fee = target.askingPrice;
      const myTeam = state.clubs.find(c => c.id === teamId)!;
      if (myTeam.budget >= fee) {
        const result = useAppStore.getState().buyPlayer(target.player.id, fee, 0, 3);
        console.log(`Transfer: ${target.player.firstName} ${target.player.lastName} (OVR ${target.player.rating}) — €${fee.toLocaleString()} — ${result.success ? "BAŞARILI" : "BAŞARISIZ: " + result.reason}`);
        if (!result.success) issues.push(`Sezon ${season}: Transfer başarısız — ${result.reason}`);
      } else {
        console.log(`Transfer: Bütçe yetersiz (€${myTeam.budget} < €${fee})`);
      }
    }

    // Takımsız oyuncu imzala (her sezon 1)
    state = useAppStore.getState();
    const freeAgentListings = state.transfer.freeAgentListings ?? [];
    if (freeAgentListings.length > 0) {
      const target = freeAgentListings[0];
      console.log(`Takımsız imza: ${target.player.firstName} ${target.player.lastName} (OVR ${target.player.rating})`);
      // Bu transfer.tsx'teki inline kodu simüle et
      const signingFee = (target.wageDemand ?? 0) * 4;
      const myTeam = state.clubs.find(c => c.id === teamId)!;
      if (signingFee <= myTeam.budget) {
        const updatedClubs = state.clubs.map(c =>
          c.id === teamId
            ? { ...c, players: [...c.players, { ...target.player, is_free_agent: false }], budget: c.budget - signingFee }
            : c
        );
        useAppStore.setState({
          clubs: updatedClubs,
          transfer: {
            ...state.transfer,
            freeAgentListings: (state.transfer.freeAgentListings ?? []).filter(l => l.player.id !== target.player.id),
          },
        });
        console.log(`  → İmza başarılı (€${signingFee})`);
      }
    }

    // 34 tur oyna
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    let startingBudget = useAppStore.getState().clubs.find(c => c.id === teamId)?.budget ?? 0;
    let startingAvgOvr = 0;
    state = useAppStore.getState();
    const myTeamStart = state.clubs.find(c => c.id === teamId)!;
    startingAvgOvr = Math.round(myTeamStart.players.reduce((s, p) => s + p.rating, 0) / myTeamStart.players.length);

    while (SEASON_INFO.matchday <= SEASON_INFO.totalMatchdays) {
      const currentMd = SEASON_INFO.matchday;
      state = useAppStore.getState();

      // Kullanıcı maçı oynanmadıysa oyna
      const userMatch = state.fixtures.find(
        f => f.matchday === currentMd && !f.played && (f.homeId === teamId || f.awayId === teamId)
      );

      if (!userMatch) {
        // Turu ilerlet
        useAppStore.getState().advanceMatchday();
        if (useAppStore.getState().seasonNumber > season) break;
        continue;
      }

      // Turu ilerlet — kendi maçını da oynasın
      useAppStore.getState().advanceMatchday();

      // Sezon bitti mi?
      if (useAppStore.getState().seasonNumber > season) break;

      // Sonucu kontrol et
      state = useAppStore.getState();
      const playedMatch = state.fixtures.find(
        f => f.matchday === currentMd && f.played && (f.homeId === teamId || f.awayId === teamId)
      );

      if (playedMatch) {
        const isHome = playedMatch.homeId === teamId;
        const myScore = isHome ? playedMatch.homeScore! : playedMatch.awayScore!;
        const oppScore = isHome ? playedMatch.awayScore! : playedMatch.homeScore!;
        if (myScore > oppScore) wins++;
        else if (myScore === oppScore) draws++;
        else losses++;
        goalsFor += myScore;
        goalsAgainst += oppScore;
      } else {
        issues.push(`Sezon ${season} Tur ${currentMd}: Maç oynanmadı!`);
      }
    }

    // Sezon sonu özeti
    state = useAppStore.getState();
    const finalStandings = computeStandings(state.clubs, state.fixtures);
    const myStat = finalStandings.find(s => s.teamId === teamId);
    const myPos = finalStandings.findIndex(s => s.teamId === teamId) + 1;
    team = state.clubs.find(c => c.id === teamId)!;
    const endingBudget = team.budget;
    const endingAvgOvr = Math.round(team.players.reduce((s, p) => s + p.rating, 0) / team.players.length);

    console.log(`Sonuç: ${myPos}. sırada | ${wins}G ${draws}B ${losses}M | ${goalsFor}-${goalsAgainst} | Puan: ${myStat?.points ?? 0}`);
    console.log(`Bütçe: €${startingBudget.toLocaleString()} → €${endingBudget.toLocaleString()}`);
    console.log(`Ort OVR: ${startingAvgOvr} → ${endingAvgOvr} (değişim: ${endingAvgOvr - startingAvgOvr > 0 ? "+" : ""}${endingAvgOvr - startingAvgOvr})`);
    console.log(`Kadro: ${team.players.length} oyuncu`);

    seasonResults.push({
      season,
      position: myPos,
      wins, draws, losses,
      goalsFor, goalsAgainst,
      points: myStat?.points ?? 0,
      budgetStart: startingBudget,
      budgetEnd: endingBudget,
      ovrStart: startingAvgOvr,
      ovrEnd: endingAvgOvr,
      ovrChange: endingAvgOvr - startingAvgOvr,
      squadSize: team.players.length,
    });

    // Kontroller
    if (endingAvgOvr <= startingAvgOvr) {
      issues.push(`Sezon ${season}: OVR gelişmedi (${startingAvgOvr} → ${endingAvgOvr})`);
    }
    if (team.players.length > 25) {
      issues.push(`Sezon ${season}: Kadro 25'i aştı (${team.players.length})`);
    }
    if (endingBudget < 0) {
      issues.push(`Sezon ${season}: Bütçe negatif (${endingBudget})`);
    }
    if (wins + draws + losses === 0) {
      issues.push(`Sezon ${season}: Hiç maç oynanmadı!`);
    }
    if (wins + draws + losses < 20) {
      issues.push(`Sezon ${season}: Az maç oynandı (${wins + draws + losses}/34)`);
    }

    // Gol kralı kontrol
    const allPlayers = state.clubs.flatMap(c => c.players);
    const topScorer = [...allPlayers].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
    const myTopScorer = [...team.players].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
    console.log(`Gol Kralı: ${topScorer?.firstName} ${topScorer?.lastName} (${topScorer?.goals} gol)`);
    console.log(`Benim gol kralım: ${myTopScorer?.firstName} ${myTopScorer?.lastName} (${myTopScorer?.goals ?? 0} gol)`);

    if ((myTopScorer?.goals ?? 0) === 0 && goalsFor > 0) {
      issues.push(`Sezon ${season}: ${goalsFor} gol atıldı ama benim oyuncumda 0 gol!`);
    }

    // Sakatlık kontrol
    const injuredCount = team.players.filter(p => p.is_injured).length;
    console.log(`Sakat: ${injuredCount} oyuncu`);
    if (injuredCount > 5) {
      issues.push(`Sezon ${season}: Çok fazla sakat (${injuredCount})`);
    }

    // Aynı isimli takım kontrolü
    const teamNames = state.clubs.map(c => c.name);
    const duplicates = teamNames.filter((name, i) => teamNames.indexOf(name) !== i);
    if (duplicates.length > 0) {
      issues.push(`Sezon ${season}: Aynı isimli takımlar: ${duplicates.join(", ")}`);
    }

    // Rumuz çakışması kontrolü
    const shorts = state.clubs.map(c => c.shortName);
    const dupShorts = shorts.filter((s, i) => shorts.indexOf(s) !== i);
    if (dupShorts.length > 0) {
      issues.push(`Sezon ${season}: Rumuz çakışması: ${dupShorts.join(", ")}`);
    }
  }

  // Final özet
  console.log("\n=== 5 SEZON ÖZETİ ===");
  console.log("Sezon | Sıra | G-B-M | Puan | Bütçe | OVR | Değişim");
  console.log("------|------|-------|------|-------|-----|--------");
  seasonResults.forEach(r => {
    console.log(`  ${r.season}   |  ${r.position}.  | ${r.wins}-${r.draws}-${r.losses} |  ${r.points} | €${(r.budgetEnd / 1e6).toFixed(1)}M | ${r.ovrEnd} | ${r.ovrChange > 0 ? "+" : ""}${r.ovrChange}`);
  });

  console.log("\n=== TESPİT EDİLEN SORUNLAR ===");
  if (issues.length === 0) {
    console.log("✅ Sorun bulunamadı!");
  } else {
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
  }

  // Ek kontroller
  console.log("\n=== EK KONTROLLER ===");
  state = useAppStore.getState();
  team = state.clubs.find(c => c.id === teamId)!;

  // 1. Kaleci sayısı
  const gks = team.players.filter(p => p.specificPosition === "GK");
  console.log(`1. Kaleci sayısı: ${gks.length} (beklenen: 2-3)`);
  if (gks.length < 2) issues.push("Yeterli kaleci yok (<2)");

  // 2. Taktik lineup kontrolü
  const lineup = state.tactics.lineup;
  const filledSlots = lineup.filter(p => p !== null).length;
  console.log(`2. Taktik lineup: ${filledSlots}/11 dolu`);
  if (filledSlots < 11) issues.push(`Taktik lineup eksik: ${filledSlots}/11`);

  // 3. Sakat oyuncu lineup'ta mı?
  const injuredInLineup = lineup.filter(p => p?.is_injured);
  console.log(`3. Sakat oyuncu lineup'ta: ${injuredInLineup.length}`);
  if (injuredInLineup.length > 0) issues.push(`${injuredInLineup.length} sakat oyuncu lineup'ta!`);

  // 4. Transfer state kontrolü
  console.log(`4. Free agents: ${state.transfer.freeAgents.length}`);
  console.log(`   Free agent listings: ${(state.transfer.freeAgentListings ?? []).length}`);
  console.log(`   Loan listings: ${(state.transfer.loanListings ?? []).length}`);
  console.log(`   Incoming offers: ${state.transfer.incomingOffers.length}`);
  console.log(`   Watchlist: ${state.transfer.watchlist.length}`);
  console.log(`   My listed: ${state.transfer.myListedPlayers.length}`);

  // 5. News kontrolü
  console.log(`5. Haber sayısı: ${state.news?.length ?? 0}`);

  // 6. Facilities kontrolü
  const facilityLevels = Object.values(state.facilities.levels);
  console.log(`6. Tesis seviyeleri: ${facilityLevels.join(", ")}`);

  // 7. Cup kontrolü
  console.log(`7. Kupa: ${state.cup.matches.length} maç, tur ${state.cup.currentRound}, şampiyon: ${state.cup.champion ?? "yok"}`);

  // 8. SeasonMatchday kontrolü
  console.log(`8. seasonMatchday: ${state.seasonMatchday}, SEASON_INFO.matchday: ${SEASON_INFO.matchday}`);
  if (state.seasonMatchday !== SEASON_INFO.matchday) {
    issues.push(`seasonMatchday (${state.seasonMatchday}) ≠ SEASON_INFO.matchday (${SEASON_INFO.matchday})`);
  }

  console.log("\n=== TEST TAMAMLANDI ===");
  console.log(`Toplam sorun: ${issues.length}`);
  return { issues, seasonResults };
}

const result = runFullGameTest();
process.exit(0);
