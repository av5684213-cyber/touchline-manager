/**
 * Debug: SEASON_INFO ve fikstür kontrolü
 */
import { useAppStore } from "@/lib/store";
import { SEASON_INFO, computeStandings } from "@/lib/mock/season";

function debugSeason() {
  useAppStore.getState().loginDemo();
  const state = useAppStore.getState();

  console.log("=== SEASON_INFO ===");
  console.log("matchday:", SEASON_INFO.matchday);
  console.log("totalMatchdays:", SEASON_INFO.totalMatchdays);

  console.log("\n=== FIXTURES ===");
  console.log("Toplam fikstür:", state.fixtures.length);
  const matchdays = new Set(state.fixtures.map(f => f.matchday));
  console.log("Matchday sayısı:", matchdays.size);
  console.log("Matchday'ler:", [...matchdays].sort((a, b) => a - b).join(", "));

  const teamId = state.myTeamId;
  const myFixtures = state.fixtures.filter(f => f.homeId === teamId || f.awayId === teamId);
  console.log("\nKullanıcı fikstürü:", myFixtures.length, "maç");
  console.log("Kullanıcı matchday'leri:", myFixtures.map(f => f.matchday).sort((a, b) => a - b).join(", "));

  // 1 hafta ilerlet
  console.log("\n=== 1 HAFTA İLERLET ===");
  const beforeMd = SEASON_INFO.matchday;
  useAppStore.getState().advanceMatchday();
  const afterMd = SEASON_INFO.matchday;
  console.log(`matchday: ${beforeMd} → ${afterMd}`);

  // Sezon bitti mi?
  const state2 = useAppStore.getState();
  console.log("Sezon numarası:", state2.seasonNumber);

  // 5 hafta daha ilerlet
  for (let i = 0; i < 5; i++) {
    const before = SEASON_INFO.matchday;
    useAppStore.getState().advanceMatchday();
    const after = SEASON_INFO.matchday;
    console.log(`Hafta ${before} → ${after} (sezon: ${useAppStore.getState().seasonNumber})`);

    // Sezon değişti mi?
    if (useAppStore.getState().seasonNumber > 1) {
      console.log("!!! SEZON DEĞİŞTİ !!!");
      console.log("totalMatchdays:", SEASON_INFO.totalMatchdays);
      console.log("matchday:", SEASON_INFO.matchday);
      const fixtures2 = useAppStore.getState().fixtures;
      const mds2 = new Set(fixtures2.map(f => f.matchday));
      console.log("Yeni sezon matchday sayısı:", mds2.size);
      console.log("Yeni sezon matchday'leri:", [...mds2].sort((a, b) => a - b).join(", "));
      break;
    }
  }
}

debugSeason();
process.exit(0);
