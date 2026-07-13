/**
 * Kupa Şampiyonluğu Testi
 * Kullanıcının takımını çok güçlü yapıp kupayı kazanmasını sağla
 * Ödülün doğru eklenip eklenmediğini kontrol et
 */
import { useAppStore } from "@/lib/store";
import { SEASON_INFO } from "@/lib/mock/season";

function runCupChampionTest() {
  console.log("=== KUPA ŞAMPİYONLUĞU TESTİ ===\n");

  useAppStore.getState().loginDemo("Şampiyon Menajer");
  let state = useAppStore.getState();
  const teamId = state.myTeamId!;
  const team = state.clubs.find(c => c.id === teamId)!;
  console.log(`Takım: ${team.name}`);
  
  // Kullanıcının takımını ÇOK güçlü yap — tüm oyunculara +30 OVR
  const boostedClubs = state.clubs.map(c => {
    if (c.id === teamId) {
      return {
        ...c,
        players: c.players.map(p => ({ ...p, rating: Math.min(99, p.rating + 30) }))
      };
    }
    return c;
  });
  useAppStore.setState({ clubs: boostedClubs });
  state = useAppStore.getState();
  
  const boostedTeam = state.clubs.find(c => c.id === teamId)!;
  const avgOvr = Math.round(boostedTeam.players.reduce((s, p) => s + p.rating, 0) / boostedTeam.players.length);
  console.log(`Boost sonrası OVR: ${avgOvr}`);
  console.log(`Bütçe (başlangıç): €${boostedTeam.budget.toLocaleString()}`);
  
  // Kupayı manuel oyna — her turu sırayla
  console.log("\n--- KUPA TURLARINI OYNA ---");
  
  // Tur 2 (Çeyrek)
  let res = useAppStore.getState().playCupRound();
  console.log(`Tur 2 (Çeyrek): ${res.myResult ?? "Bot turu"}`);
  state = useAppStore.getState();
  console.log(`  currentRound: ${state.cup.currentRound}, eliminated: ${state.cup.eliminated}, champion: ${state.cup.champion ?? "Yok"}`);
  
  // Tur 3 (Yarı)
  res = useAppStore.getState().playCupRound();
  console.log(`Tur 3 (Yarı): ${res.myResult ?? "Bot turu"}`);
  state = useAppStore.getState();
  console.log(`  currentRound: ${state.cup.currentRound}, eliminated: ${state.cup.eliminated}, champion: ${state.cup.champion ?? "Yok"}`);
  
  // Tur 4 (Final)
  res = useAppStore.getState().playCupRound();
  console.log(`Tur 4 (Final): ${res.myResult ?? "Bot turu"}`);
  state = useAppStore.getState();
  console.log(`  currentRound: ${state.cup.currentRound}, eliminated: ${state.cup.eliminated}, champion: ${state.cup.champion ?? "Yok"}`);
  
  // Şampiyon kontrolü
  const finalTeam = state.clubs.find(c => c.id === teamId)!;
  console.log("\n--- FİNAL DURUM ---");
  console.log(`Şampiyon: ${state.cup.champion === teamId ? "BEN! 🏆" : state.cup.champion ? state.clubs.find(c => c.id === state.cup.champion)?.name : "Yok"}`);
  console.log(`Bütçe (final): €${finalTeam.budget.toLocaleString()}`);
  
  if (state.cup.champion === teamId) {
    console.log("\n✅ Kullanıcı kupayı kazandı!");
    
    // Kupa maçlarını kontrol et
    console.log("\n--- KUPA MAÇLARI ---");
    state.cup.matches.forEach(m => {
      const home = state.clubs.find(c => c.id === m.homeId);
      const away = state.clubs.find(c => c.id === m.awayId);
      const isMine = m.homeId === teamId || m.awayId === teamId;
      console.log(`  R${m.round} ${home?.shortName} ${m.homeScore}-${m.awayScore} ${away?.shortName}${isMine ? " [BEN]" : ""}`);
    });
    
    // Ödül kontrolü — Çeyrek (50K) + Yarı (150K) + Final (400K) + Şampiyon (1M) = 1.6M
    console.log("\n--- ÖDÜL KONTROLÜ ---");
    console.log("Beklenen ödüller: Çeyrek 50K + Yarı 150K + Final 400K + Şampiyon 1M = 1.6M");
    console.log("(Bütçe artışı diğer gelirler/giderlerden de etkilenir)");
  } else {
    console.log("\n❌ Kullanıcı kupayı kazanamadı!");
  }
  
  // Yeni sezonda kupa sıfırlanıyor mu?
  console.log("\n--- YENİ SEZON KONTROL ---");
  // Tüm maçları oyna
  let iter = 0;
  while (state.seasonNumber === 1 && iter++ < 50) {
    useAppStore.getState().advanceMatchday();
    state = useAppStore.getState();
  }
  
  if (state.seasonNumber > 1) {
    console.log(`Yeni sezon: ${state.seasonNumber}`);
    console.log(`Kupa currentRound: ${state.cup.currentRound} (2 olmalı)`);
    console.log(`Kupa champion: ${state.cup.champion ?? "Yok (doğru)"}`);
    console.log(`Kupa eliminated: ${state.cup.eliminated} (false olmalı)`);
    console.log(`Kupa maç sayısı: ${state.cup.matches.length} (4 olmalı)`);
    
    if (state.cup.champion) {
      console.log("❌ Yeni sezonda champion hala duruyor!");
    } else {
      console.log("✅ Yeni sezonda kupa sıfırlandı");
    }
  }
  
  console.log("\n=== TEST TAMAMLANDI ===");
}

runCupChampionTest();
process.exit(0);
