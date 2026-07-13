/**
 * Kiralık Oyuncu Sistemi Testi
 * - Kiralama: satıcıdan çıkartılır, kullanıcıya eklenir, flag'ler set edilir
 * - Haftalık azaltma: _loanWeeks her advanceMatchday'de -1
 * - İade: _loanWeeks 0 olunca kaynak takıma iade
 * - Sezon sonu iade: endSeason'da tüm kiralıklar iade edilir
 */
import { useAppStore } from "@/lib/store";
import { SEASON_INFO } from "@/lib/mock/season";

function runLoanTest() {
  console.log("=== KIRALIK OYUNCU SİSTEMİ TESTİ ===\n");

  useAppStore.getState().loginDemo("Test Menajer");
  let state = useAppStore.getState();
  const teamId = state.myTeamId!;
  const team = state.clubs.find(c => c.id === teamId)!;
  console.log(`Takım: ${team.name}`);
  console.log(`Kadro: ${team.players.length} oyuncu, Bütçe: €${team.budget.toLocaleString()}`);

  // Loan listings kontrol
  const loans = state.transfer.loanListings ?? [];
  console.log(`\nLoan listings: ${loans.length}`);
  if (loans.length === 0) {
    console.log("❌ Loan listings yok — test yapılamaz");
    return;
  }

  // İlk listing'i al
  const listing = loans[0];
  const playerId = listing.player.id;
  const lenderName = listing.lenderTeamName;
  console.log(`\nHedef oyuncu: ${listing.player.firstName} ${listing.player.lastName} (OVR ${listing.player.rating})`);
  console.log(`Lender: ${lenderName}`);
  console.log(`Günlük ücret: ${listing.dailyFee}, Süre: ${listing.durationWeeks} hafta`);

  // Lender kulübünü bul
  const lenderClub = state.clubs.find(c => c.name === lenderName);
  if (!lenderClub) {
    console.log(`❌ Lender kulüp bulunamadı: ${lenderName}`);
    return;
  }
  console.log(`Lender kulüp ID: ${lenderClub.id}`);
  console.log(`Lender kadro: ${lenderClub.players.length} oyuncu`);

  // Oyuncu lender'da var mı?
  const playerInLender = lenderClub.players.find(p => p.id === playerId);
  console.log(`Oyuncu lender'da var mı? ${playerInLender ? "EVET" : "HAYIR"}`);

  // Kirala — yeterli ücret ver
  console.log("\n--- KİRALAMA ---");
  // minLoanFee = marketValue * 0.02 * weeks — yeterli ücret ver
  const playerMarketValue = (listing.player as any).marketValue ?? (listing.player as any).market_value ?? 500_000;
  const totalLoanFee = Math.max(listing.dailyFee * listing.durationWeeks * 7, Math.round(playerMarketValue * 0.02 * listing.durationWeeks) + 1000);
  console.log(`Hesaplanan kira ücreti: €${totalLoanFee.toLocaleString()}`);
  const result = useAppStore.getState().makeLoanOffer(playerId, totalLoanFee, listing.durationWeeks);
  console.log(`Kiralama sonucu: success=${result.success}, response=${result.response ?? "N/A"}, reason=${result.reason ?? "N/A"}`);

  if (!result.success || result.response !== "accepted") {
    console.log("❌ Kiralama reddedildi — test durduruldu");
    return;
  }

  state = useAppStore.getState();
  const myTeam = state.clubs.find(c => c.id === teamId)!;
  const lenderAfter = state.clubs.find(c => c.id === lenderClub.id)!;
  const loanedPlayer = myTeam.players.find(p => p.id === playerId);

  console.log(`\nKadro: ${team.players.length} → ${myTeam.players.length}`);
  console.log(`Bütçe: €${team.budget.toLocaleString()} → €${myTeam.budget.toLocaleString()}`);
  console.log(`Lender kadro: ${lenderClub.players.length} → ${lenderAfter.players.length}`);

  // Kontrol: oyuncu lender'dan çıkıp kullanıcıya geçti mi?
  const playerInLenderAfter = lenderAfter.players.find(p => p.id === playerId);
  console.log(`\nOyuncu lender'da hala var mı? ${playerInLenderAfter ? "EVET (HATA!)" : "HAYIR (doğru)"}`);
  console.log(`Oyuncu kullanıcıda var mı? ${loanedPlayer ? "EVET (doğru)" : "HAYIR (HATA!)"}`);

  // Flag'ler set edildi mi?
  if (loanedPlayer) {
    console.log(`_loaned: ${(loanedPlayer as any)._loaned}`);
    console.log(`_loanWeeks: ${(loanedPlayer as any)._loanWeeks}`);
    console.log(`_loanFrom: ${(loanedPlayer as any)._loanFrom}`);
  }

  const issues: string[] = [];
  if (playerInLenderAfter) issues.push("Oyuncu lender'da hala var (çift takım bug'ı)");
  if (!loanedPlayer) issues.push("Oyuncu kullanıcıda yok");
  if (loanedPlayer && !(loanedPlayer as any)._loaned) issues.push("_loaned flag set edilmedi");
  if (loanedPlayer && (loanedPlayer as any)._loanWeeks !== listing.durationWeeks) issues.push("_loanWeeks yanlış");

  // 1 hafta ilerlet — _loanWeeks azalmalı
  console.log("\n--- 1 HAFTA İLERLET ---");
  useAppStore.getState().advanceMatchday();
  state = useAppStore.getState();
  const myTeamAfter1 = state.clubs.find(c => c.id === teamId)!;
  const loanedPlayerAfter1 = myTeamAfter1.players.find(p => p.id === playerId);
  if (loanedPlayerAfter1) {
    const weeks = (loanedPlayerAfter1 as any)._loanWeeks;
    console.log(`1 hafta sonra _loanWeeks: ${weeks} (beklenen: ${listing.durationWeeks - 1})`);
    if (weeks !== listing.durationWeeks - 1) {
      issues.push(`_loanWeeks azalmadı: ${weeks} (beklenen ${listing.durationWeeks - 1})`);
    }
  } else {
    console.log("Oyuncu 1 hafta sonra kayboldu (süre 1 haftaysa iade edilmiş olabilir)");
  }

  // Sezon sonuna kadar ilerlet — iade edilmeli
  console.log("\n--- SEZON SONUNA KADAR İLERLET ---");
  let iter = 0;
  let loanedFound = true;
  while (state.seasonNumber === 1 && iter++ < 50) {
    useAppStore.getState().advanceMatchday();
    state = useAppStore.getState();
    // Kiralık oyuncu hala kullanıcıda mı kontrol et
    const myTeamCheck = state.clubs.find(c => c.id === teamId)!;
    const loanedCheck = myTeamCheck.players.find(p => p.id === playerId);
    if (loanedCheck && (loanedCheck as any)._loaned) {
      const weeks = (loanedCheck as any)._loanWeeks;
      if (weeks !== loanedFound ? weeks : -1) {
        console.log(`  MD${SEASON_INFO.matchday}: _loanWeeks=${weeks}`);
        loanedFound = weeks > 0;
      }
    }
  }

  if (state.seasonNumber > 1) {
    console.log(`Yeni sezon: ${state.seasonNumber}`);
    const myTeamFinal = state.clubs.find(c => c.id === teamId)!;
    const lenderFinal = state.clubs.find(c => c.id === lenderClub.id);
    if (!lenderFinal) {
      console.log(`⚠️ Lender kulüp (${lenderClub.id}) yeni sezonda bulunamadı — kullanıcı lig değiştirmiş`);
      console.log("Bu beklenen bir durum (yükselme/düşme ile farklı lige geçiş)");
      // Oyuncu kullanıcıda yok mu kontrol et
      const playerInMyTeam = myTeamFinal.players.find(p => p.id === playerId);
      if (playerInMyTeam) {
        issues.push("Oyuncu sezon sonunda hala kullanıcıda (iade edilmedi) — lender bulunamadı ama oyuncu hala kullanıcıda");
      } else {
        console.log("✅ Oyuncu kullanıcıda yok — iade edilmiş (lender farklı ligde olsa da)");
      }
    } else {
      const playerInMyTeam = myTeamFinal.players.find(p => p.id === playerId);
      const playerInLenderFinal = lenderFinal.players.find(p => p.id === playerId);

      console.log(`Oyuncu kullanıcıda: ${playerInMyTeam ? "EVET" : "HAYIR"}`);
      console.log(`Oyuncu lender'da: ${playerInLenderFinal ? "EVET (doğru - iade edildi)" : "HAYIR (HATA)"}`);

      if (playerInMyTeam) {
        issues.push("Oyuncu sezon sonunda hala kullanıcıda (iade edilmedi)");
      }
      if (!playerInLenderFinal) {
        issues.push("Oyuncu lender'a iade edilmedi");
      }
      if (playerInMyTeam && (playerInMyTeam as any)._loaned) {
        issues.push("Oyuncu hala _loaned=true (flag temizlenmedi)");
      }
    }
  }

  // Sonuç
  console.log("\n=== TESPİT EDİLEN SORUNLAR ===");
  if (issues.length === 0) {
    console.log("✅ Sorun yok!");
  } else {
    issues.forEach((i, idx) => console.log(`${idx + 1}. ${i}`));
  }
  console.log(`\nToplam sorun: ${issues.length}`);
}

runLoanTest();
process.exit(0);
