/**
 * 10 Sezonluk Tam Simülasyon Testi v2
 * - Kaleci limiti kontrolü (max 3)
 * - Tesis yükseltme (her sezon)
 * - Gol kontrolü sezon ORTASINDA (endSeason sıfırlamasından önce)
 * - Incoming offers debug
 */
import { useAppStore } from "@/lib/store";
import { SEASON_INFO, computeStandings } from "@/lib/mock/season";

function runFullGameTest() {
  console.log("=== 10 SEZONLUK TAM OYUN TESTİ v2 ===\n");

  useAppStore.getState().loginDemo();
  let state = useAppStore.getState();
  const teamId = state.myTeamId!;
  let team = state.clubs.find(c => c.id === teamId)!;
  console.log(`Takım: ${team.name} (Tier ${team.leagueTier})`);
  console.log(`Bütçe: €${team.budget.toLocaleString()}`);
  console.log(`Kadro: ${team.players.length} oyuncu\n`);

  const issues: string[] = [];
  const seasonResults: any[] = [];

  for (let season = 1; season <= 10; season++) {
    console.log(`\n=== SEZON ${season} ===`);

    // Taktik değiştir
    const formations = ["4-3-3", "4-4-2", "4-5-1", "3-5-2", "4-2-3-1"];
    useAppStore.getState().updateActiveTactic({ formation: formations[(season - 1) % 5] });

    // Tesis yükselt — her sezon 1 tesis
    const facilityKeys = Object.keys(state.facilities.levels);
    const fkey = facilityKeys[(season - 1) % facilityKeys.length];
    try { useAppStore.getState().upgradeFacility(fkey as any); } catch (e) { /* budget */ }

    // Transfer — kaleci limitine dikkat et
    state = useAppStore.getState();
    const freeAgents = state.transfer.freeAgents;
    if (freeAgents.length > 0) {
      const myTeam = state.clubs.find(c => c.id === teamId)!;
      // Kaleci değilse ve kadro 25'ten az ise al
      const target = freeAgents.find(fa => {
        if (myTeam.players.length >= 25) return false;
        if (fa.player.specificPosition === "GK") {
          const gkCount = myTeam.players.filter(p => p.specificPosition === "GK").length;
          return gkCount < 3;
        }
        return true;
      });
      if (target && myTeam.budget >= target.askingPrice) {
        const result = useAppStore.getState().buyPlayer(target.player.id, target.askingPrice, 0, 3);
        console.log(`Transfer: ${target.player.firstName} ${target.player.lastName} (OVR ${target.player.rating}) — ${result.success ? "BAŞARILI" : "BAŞARISIZ: " + result.reason}`);
      }
    }

    // Takımsız imza — kaleci limitine dikkat et
    state = useAppStore.getState();
    const faListings = state.transfer.freeAgentListings ?? [];
    if (faListings.length > 0) {
      const myTeam = state.clubs.find(c => c.id === teamId)!;
      const target = faListings.find(l => {
        if (myTeam.players.length >= 25) return false;
        if (l.player.specificPosition === "GK") {
          const gkCount = myTeam.players.filter(p => p.specificPosition === "GK").length;
          return gkCount < 3;
        }
        return true;
      });
      if (target) {
        const signingFee = (target.wageDemand ?? 0) * 4;
        if (signingFee <= myTeam.budget) {
          useAppStore.setState({
            clubs: state.clubs.map(c => c.id === teamId ? { ...c, players: [...c.players, { ...target.player, is_free_agent: false }], budget: c.budget - signingFee } : c),
            transfer: { ...state.transfer, freeAgentListings: (state.transfer.freeAgentListings ?? []).filter(l => l.player.id !== target.player.id) },
          });
          console.log(`Takımsız imza: ${target.player.firstName} ${target.player.lastName} (OVR ${target.player.rating})`);
        }
      }
    }

    // 34 tur oyna — gol kontrolü sezon ORTASINDA (tur 17)
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    let midSeasonGoals = 0;
    let startingBudget = useAppStore.getState().clubs.find(c => c.id === teamId)?.budget ?? 0;
    state = useAppStore.getState();
    let myTeamStart = state.clubs.find(c => c.id === teamId)!;
    const startingAvgOvr = Math.round(myTeamStart.players.reduce((s, p) => s + p.rating, 0) / myTeamStart.players.length);

    while (SEASON_INFO.matchday <= SEASON_INFO.totalMatchdays) {
      const currentMd = SEASON_INFO.matchday;
      state = useAppStore.getState();

      const userMatch = state.fixtures.find(
        f => f.matchday === currentMd && !f.played && (f.homeId === teamId || f.awayId === teamId)
      );

      if (!userMatch) {
        useAppStore.getState().advanceMatchday();
        if (useAppStore.getState().seasonNumber > season) break;
        continue;
      }

      useAppStore.getState().advanceMatchday();
      if (useAppStore.getState().seasonNumber > season) break;

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

        // Sezon ortası gol kontrolü (tur 17)
        if (currentMd === 17) {
          const myTeamMid = state.clubs.find(c => c.id === teamId)!;
          const myTopScorerMid = [...myTeamMid.players].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
          midSeasonGoals = myTopScorerMid?.goals ?? 0;
          console.log(`Tur 17 kontrol: Benim gol kralım ${myTopScorerMid?.firstName} ${myTopScorerMid?.lastName} (${midSeasonGoals} gol)`);
          if (midSeasonGoals === 0 && goalsFor > 0) {
            issues.push(`Sezon ${season} tur 17: ${goalsFor} gol atıldı ama gol kralı 0!`);
          }
        }
      }
    }

    // Sezon sonu özeti
    state = useAppStore.getState();
    team = state.clubs.find(c => c.id === teamId)!;
    const endingBudget = team.budget;
    const endingAvgOvr = Math.round(team.players.reduce((s, p) => s + p.rating, 0) / team.players.length);
    const gkCount = team.players.filter(p => p.specificPosition === "GK").length;
    const injuredCount = team.players.filter(p => p.is_injured).length;
    const incomingOffers = state.transfer.incomingOffers.length;
    const loanListings = (state.transfer.loanListings ?? []).length;

    console.log(`Sonuç: ${wins}G ${draws}B ${losses}M | ${goalsFor}-${goalsAgainst} | Bütçe: €${(endingBudget/1e6).toFixed(1)}M | OVR: ${startingAvgOvr}→${endingAvgOvr}`);
    console.log(`Kaleci: ${gkCount} | Sakat: ${injuredCount} | Incoming: ${incomingOffers} | Loan: ${loanListings}`);

    seasonResults.push({ season, wins, draws, losses, goalsFor, goalsAgainst, budgetEnd: endingBudget, ovrStart: startingAvgOvr, ovrEnd: endingAvgOvr, gkCount, injuredCount, incomingOffers, loanListings, midSeasonGoals });

    // Kontroller
    if (endingAvgOvr <= startingAvgOvr) issues.push(`Sezon ${season}: OVR gelişmedi (${startingAvgOvr}→${endingAvgOvr})`);
    if (gkCount > 3) issues.push(`Sezon ${season}: ${gkCount} kaleci (max 3 olmalı)`);
    if (team.players.length > 25) issues.push(`Sezon ${season}: Kadro 25'i aştı (${team.players.length})`);
    if (endingBudget < 0) issues.push(`Sezon ${season}: Bütçe negatif`);
    if (loanListings === 0) issues.push(`Sezon ${season}: Loan listings 0`);
    if (incomingOffers === 0 && season > 1) issues.push(`Sezon ${season}: Incoming offers 0`);

    // Aynı isimli takım kontrolü
    const teamNames = state.clubs.map(c => c.name);
    const dups = teamNames.filter((n, i) => teamNames.indexOf(n) !== i);
    if (dups.length > 0) issues.push(`Sezon ${season}: Aynı isimli takımlar: ${dups.join(", ")}`);
  }

  // Final özet
  console.log("\n=== 10 SEZON ÖZETİ ===");
  console.log("S | G-B-M | OVR | GK | Sakat | Inc | Loan | MidGol");
  seasonResults.forEach(r => {
    console.log(`${r.season} | ${r.wins}-${r.draws}-${r.losses} | ${r.ovrStart}→${r.ovrEnd} | ${r.gkCount} | ${r.injuredCount} | ${r.incomingOffers} | ${r.loanListings} | ${r.midSeasonGoals}`);
  });

  console.log("\n=== TESPİT EDİLEN SORUNLAR ===");
  if (issues.length === 0) console.log("✅ Sorun yok!");
  else issues.forEach((i, idx) => console.log(`${idx + 1}. ${i}`));

  console.log(`\nToplam sorun: ${issues.length}`);
}

runFullGameTest();
process.exit(0);
