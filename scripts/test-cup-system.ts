/**
 * Kupa Sistemi Testi
 * - Kupa fikstürünün doğru oluştuğunu kontrol et
 * - Turların ilerlediğini doğrula
 * - Şampiyonun belirlendiğini teyit et
 * - Kupa maçlarının gerçekten oynandığını gör
 * - Eliminasyon sonrası kupa devam ediyor mu?
 * - Yeni sezonda kupa sıfırlanıyor mu?
 */
import { useAppStore } from "@/lib/store";
import { SEASON_INFO } from "@/lib/mock/season";

function runCupTest() {
  console.log("=== KUPA SİSTEMİ TESTİ ===\n");

  useAppStore.getState().loginDemo("Test Menajer");
  let state = useAppStore.getState();
  const teamId = state.myTeamId!;
  const team = state.clubs.find(c => c.id === teamId)!;
  console.log(`Takım: ${team.name} (Tier ${team.leagueTier})`);
  console.log(`Takım OVR: ${Math.round(team.players.reduce((s, p) => s + p.rating, 0) / team.players.length)}`);
  console.log(`Toplam takım: ${state.clubs.length}`);

  // Kupa ilk durumu
  console.log("\n--- İLK KUPA DURUMU ---");
  console.log(`currentRound: ${state.cup.currentRound}`);
  console.log(`champion: ${state.cup.champion ?? "Yok"}`);
  console.log(`eliminated: ${state.cup.eliminated}`);
  console.log(`Maç sayısı: ${state.cup.matches.length}`);
  state.cup.matches.forEach((m, i) => {
    const home = state.clubs.find(c => c.id === m.homeId);
    const away = state.clubs.find(c => c.id === m.awayId);
    console.log(`  Maç ${i+1}: Round ${m.round} | ${home?.shortName} vs ${away?.shortName} | played=${m.played}`);
  });

  // Kullanıcının takımı kupada mı?
  const myCupMatch = state.cup.matches.find(
    m => (m.homeId === teamId || m.awayId === teamId) && !m.played && m.round === state.cup.currentRound
  );
  console.log(`\nKullanıcının maçı var mı? ${myCupMatch ? "EVET" : "HAYIR"}`);
  if (myCupMatch) {
    const opp = state.clubs.find(c => c.id === (myCupMatch.homeId === teamId ? myCupMatch.awayId : myCupMatch.homeId));
    console.log(`Rakip: ${opp?.name}`);
  }

  // Check if user is in top 8 (initial cup participants)
  const top8 = [...state.clubs].sort((a, b) =>
    b.players.reduce((s, p) => s + p.rating, 0) -
    a.players.reduce((s, p) => s + p.rating, 0)
  ).slice(0, 8);
  const userInTop8 = top8.some(c => c.id === teamId);
  console.log(`Kullanıcı top 8'de mi? ${userInTop8 ? "EVET" : "HAYIR"} (kupa katılımı)`);
  if (!userInTop8) {
    console.log("⚠️ Kullanıcı kupada değil — izleyici modunda");
  }

  // ===== TURLARI İLERLET =====
  console.log("\n--- TURLARI İLERLETME TESTİ ---");
  const issues: string[] = [];
  let roundLog: { md: number; round: number; matches: number; champion?: string; eliminated: boolean }[] = [];

  // advanceMatchday'i çağır — her 5 matchday'de bir kupa oynanır
  let prevRound = state.cup.currentRound;
  let prevMatchCount = state.cup.matches.length;
  let prevChampion = state.cup.champion;
  
  let maxIter = 40;
  while (maxIter-- > 0 && !state.cup.champion && SEASON_INFO.matchday < SEASON_INFO.totalMatchdays) {
    const beforeMd = SEASON_INFO.matchday;
    const beforeRound = state.cup.currentRound;
    const beforeMatches = state.cup.matches.length;
    const beforeChampion = state.cup.champion;
    
    useAppStore.getState().advanceMatchday();
    state = useAppStore.getState();
    
    const afterMd = SEASON_INFO.matchday;
    const afterRound = state.cup.currentRound;
    const afterMatches = state.cup.matches.length;
    const afterChampion = state.cup.champion;
    
    // Kupa değişikliği oldu mu?
    if (afterRound !== beforeRound || afterChampion !== beforeChampion || afterMatches !== beforeMatches) {
      const unplayed = state.cup.matches.filter(m => m.round === afterRound && !m.played).length;
      const played = state.cup.matches.filter(m => m.played).length;
      console.log(`MD ${beforeMd}→${afterMd} | Round ${beforeRound}→${afterRound} | Maçlar ${beforeMatches}→${afterMatches} (oynanan: ${played}, bekleyen: ${unplayed}) | Şampiyon: ${afterChampion ?? "Yok"}`);
      
      // Yeni round'da bekleyen maç 0 ise problem
      if (afterRound !== beforeRound && !afterChampion) {
        const newRoundMatches = state.cup.matches.filter(m => m.round === afterRound);
        if (newRoundMatches.length === 0) {
          issues.push(`MD ${afterMd}: Round ${afterRound}'a geçildi ama maç yok!`);
        } else {
          const allPlayed = newRoundMatches.every(m => m.played);
          if (allPlayed) {
            issues.push(`MD ${afterMd}: Round ${afterRound} oluşur oluşmaz tüm maçlar oynanmış görünüyor`);
          }
        }
      }
      roundLog.push({ md: afterMd, round: afterRound, matches: afterMatches, champion: afterChampion, eliminated: state.cup.eliminated });
    }
    
    // Sezon değiştiyse break
    if (state.seasonNumber > 1) {
      console.log(`Sezon 2'ye geçildi — kupa sıfırlanmalı`);
      break;
    }
  }

  // ===== FİNAL DURUM =====
  console.log("\n--- SEZON 1 FİNAL DURUM ---");
  console.log(`Şampiyon: ${state.cup.champion ? state.clubs.find(c => c.id === state.cup.champion)?.name : "BELİRSİZ!"}`);
  console.log(`currentRound: ${state.cup.currentRound}`);
  console.log(`eliminated: ${state.cup.eliminated}`);
  
  // Tüm kupa maçları oynandı mı?
  const unplayedMatches = state.cup.matches.filter(m => !m.played);
  if (unplayedMatches.length > 0 && state.cup.champion) {
    issues.push(`Şampiyon belirlendi ama ${unplayedMatches.length} kupa maçı hala oynanmamış!`);
  }

  // Şampiyon belirlenmedi mi?
  if (!state.cup.champion && state.seasonNumber === 1) {
    issues.push(`Sezon 1 tamamlandı ama kupa şampiyonu belirlenmedi! (currentRound: ${state.cup.currentRound})`);
  }

  // ===== TUR GELİŞİM ÖZETİ =====
  console.log("\n--- KUPA TUR GELİŞİMİ ---");
  roundLog.forEach(r => {
    console.log(`  MD ${r.md}: Round ${r.round} | Toplam maç: ${r.matches} | Şampiyon: ${r.champion ?? "-"} | Eliminated: ${r.eliminated}`);
  });

  // ===== KUPA MAÇLARININ DETAYLARI =====
  console.log("\n--- KUPA MAÇLARI DETAYI ---");
  state.cup.matches.forEach((m, i) => {
    const home = state.clubs.find(c => c.id === m.homeId);
    const away = state.clubs.find(c => c.id === m.awayId);
    const isMine = m.homeId === teamId || m.awayId === teamId;
    console.log(`  R${m.round} ${home?.shortName} ${m.homeScore ?? "-"}-${m.awayScore ?? "-"} ${away?.shortName} ${m.played ? "✓" : "✗"}${isMine ? " [BEN]" : ""}`);
  });

  // ===== ŞAMPİYON ÖDÜLÜ KONTROLÜ =====
  if (state.cup.champion === teamId) {
    const myTeam = state.clubs.find(c => c.id === teamId)!;
    console.log(`\n🏆 Kullanıcı şampiyon! Bütçe: €${myTeam.budget.toLocaleString()}`);
    console.log("   (1M ödül eklenmiş olmalı)");
  }

  // ===== YENİ SEZON KUPA SIFIRLAMA =====
  console.log("\n--- YENİ SEZON KUPA SIFIRLAMA TESTİ ---");
  // Sezonu bitir
  while (state.seasonNumber === 1 && SEASON_INFO.matchday < SEASON_INFO.totalMatchdays + 5) {
    useAppStore.getState().advanceMatchday();
    state = useAppStore.getState();
    if (state.seasonNumber > 1) break;
  }
  
  if (state.seasonNumber > 1) {
    console.log(`Yeni sezon: ${state.seasonNumber}`);
    console.log(`Kupa currentRound: ${state.cup.currentRound}`);
    console.log(`Kupa champion: ${state.cup.champion ?? "Yok (doğru)"}`);
    console.log(`Kupa maç sayısı: ${state.cup.matches.length}`);
    console.log(`Kupa eliminated: ${state.cup.eliminated}`);
    
    if (state.cup.champion) {
      issues.push(`Yeni sezonda kupa şampiyonu hala duruyor!`);
    }
    if (state.cup.eliminated) {
      issues.push(`Yeni sezonda eliminated flag hala true!`);
    }
    if (state.cup.currentRound !== 2) {
      issues.push(`Yeni sezonda currentRound ${state.cup.currentRound} (2 olmalı)`);
    }
    if (state.cup.matches.length !== 4) {
      issues.push(`Yeni sezonda ${state.cup.matches.length} maç var (4 olmalı)`);
    }
  }

  // ===== SORUNLAR =====
  console.log("\n=== TESPİT EDİLEN SORUNLAR ===");
  if (issues.length === 0) {
    console.log("✅ Sorun yok!");
  } else {
    issues.forEach((i, idx) => console.log(`${idx + 1}. ${i}`));
  }
  console.log(`\nToplam sorun: ${issues.length}`);
}

runCupTest();
process.exit(0);
