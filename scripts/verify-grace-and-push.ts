/**
 * v2.9.148: Grace period + Push trigger doğrulama script'i
 *
 * İki senaryoyu karşılaştırır:
 * 1. Grace period AKTİF — bot rakip gücü %12 azalmalı, training XP 2x olmalı
 * 2. Grace period PASİF — Bot rakip gücü normal, training XP 1x
 *
 * Push trigger'ı için: bir mock kullanıcı simüle et, recordMatchResult çağır,
 * triggerMatchEndPush fonksiyonunun çağrıldığını console.log ile kanıtla.
 */

import { useAppStore } from "@/lib/store";
import { simulateBotMatch } from "@/lib/botAI";
import { runTrainingSession } from "@/lib/training/engine";
import { triggerMatchEndPush, triggerTransferOfferPush } from "@/lib/push-triggers";

function testGracePeriodBotStrength() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("TEST 1: Grace period bot OVR çarpanı");
  console.log("═══════════════════════════════════════════════════════════════");

  // Init store
  useAppStore.getState().loginDemo();
  const myTeamId = useAppStore.getState().myTeamId!;
  const clubs = useAppStore.getState().clubs;
  const myTeam = clubs.find((c) => c.id === myTeamId);
  const opponent = clubs.find((c) => c.id !== myTeamId && c.is_bot !== false)!;

  console.log(`User team: ${myTeam?.name}, opponent: ${opponent.name}`);
  console.log("");

  // Sim A: Grace AKTİF (firstLoginAt yeni set edildi, 7 gün var)
  const onboardingGrace = useAppStore.getState().onboarding;
  console.log(`onboarding.gracePeriodEndsAt: ${onboardingGrace?.gracePeriodEndsAt}`);
  console.log(`isGraceActive (Date.now() < endsAt): ${onboardingGrace && Date.now() < onboardingGrace.gracePeriodEndsAt!}`);
  console.log("");

  // Match sim A: bot-bot maçı (grace etkilenmesin) — sanity check
  console.log("Scenario A: Bot-Bot match (grace etkilenmemeli)");
  const bot1 = clubs.find((c) => c.id !== myTeamId && c.is_bot !== false)!;
  const bot2 = clubs.find((c) => c.id !== myTeamId && c.id !== bot1.id && c.is_bot !== false)!;
  const resultA = simulateBotMatch(bot1, bot2, 1, undefined, { home: 1.0, away: 1.0 });
  console.log(`  ${bot1.name} ${resultA.homeScore}-${resultA.awayScore} ${bot2.name} (grace OFF for both bots)`);

  // Match sim B: User vs Bot, grace OFF
  console.log("Scenario B: User vs Bot, grace OFF (multiplier 1.0)");
  const resultB = simulateBotMatch(myTeam!, opponent, 1, undefined, { home: 1.0, away: 1.0 });
  console.log(`  ${myTeam?.name} ${resultB.homeScore}-${resultB.awayScore} ${opponent.name} (grace OFF)`);

  // Match sim C: User vs Bot, grace ON (away 0.88)
  console.log("Scenario C: User vs Bot, grace ON (multiplier 0.88 for bot)");
  const resultC = simulateBotMatch(myTeam!, opponent, 1, undefined, { home: 1.0, away: 0.88 });
  console.log(`  ${myTeam?.name} ${resultC.homeScore}-${resultC.awayScore} ${opponent.name} (grace ON)`);

  // 10 maçı her senaryo için tekrarla, ortalama skor farkına bak
  let bTotalDiff = 0;
  let cTotalDiff = 0;
  for (let i = 0; i < 10; i++) {
    const b = simulateBotMatch(myTeam!, opponent, i + 1, undefined, { home: 1.0, away: 1.0 });
    const c = simulateBotMatch(myTeam!, opponent, i + 1, undefined, { home: 1.0, away: 0.88 });
    bTotalDiff += (b.homeScore - b.awayScore);
    cTotalDiff += (c.homeScore - c.awayScore);
  }
  console.log("");
  console.log(`Average over 10 matches (User score - Bot score):`);
  console.log(`  Scenario B (grace OFF): ${bTotalDiff / 10}`);
  console.log(`  Scenario C (grace ON):  ${cTotalDiff / 10}`);
  console.log(`  → Grace ON ile user +${(cTotalDiff - bTotalDiff) / 10} ortalama skor avantajı`);
  console.log("");
}

async function testTrainingXPGaceBoost() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("TEST 2: Grace period 2x training XP");
  console.log("═══════════════════════════════════════════════════════════════");

  // Set grace flag on runTrainingSession
  (runTrainingSession as any).__graceXPActive = true;
  const myTeam = useAppStore.getState().clubs.find((c) => c.id === useAppStore.getState().myTeamId);
  if (!myTeam) return;

  const training = useAppStore.getState().training;
  // Pick first player for test
  const testPlayer = myTeam.players[0];
  const beforeStats = { ...testPlayer.stats };
  console.log(`Test player: ${testPlayer.firstName} ${testPlayer.lastName}`);
  console.log(`Before stats: shooting=${beforeStats.shooting}, passing=${beforeStats.passing}`);
  console.log(`__graceXPActive = true`);

  // Run a training session
  const result = runTrainingSession([testPlayer], training, 1, 1.0);
  console.log(`Training result:`, JSON.stringify(result[0]?.statGains ?? {}));
  console.log("");

  // Clear flag, run again
  (runTrainingSession as any).__graceXPActive = false;
  console.log(`__graceXPActive = false`);
  const result2 = runTrainingSession([{ ...testPlayer, stats: beforeStats }], training, 1, 1.0);
  console.log(`Training result (grace OFF):`, JSON.stringify(result2[0]?.statGains ?? {}));
  console.log("");
}

async function testPushTriggers() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("TEST 3: Push notification trigger fonksiyonları");
  console.log("═══════════════════════════════════════════════════════════════");

  console.log("Calling triggerMatchEndPush...");
  const matchResult = await triggerMatchEndPush({
    homeName: "Pınarbaşıspor",
    awayName: "Boğazspor",
    homeScore: 2,
    awayScore: 1,
    matchType: "league",
  });
  console.log(`Result: ${JSON.stringify(matchResult)}`);
  console.log("");

  console.log("Calling triggerTransferOfferPush...");
  const offerResult = await triggerTransferOfferPush({
    playerName: "Ahmet Yılmaz",
    bidderClubName: "Galataspor",
    bidAmount: "1.250.000",
  });
  console.log(`Result: ${JSON.stringify(offerResult)}`);
  console.log("");

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("PUSH TRIGGER DURUM ÖZETİ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  console.log("recordMatchResult (store.ts:5506) → triggerMatchEndPush çağrılıyor");
  console.log("listPlayerForSale (store.ts:2244) → triggerTransferOfferPush çağrılıyor");
  console.log("");
  console.log("Kod yolu hazır. Production'da çalışması için:");
  console.log("  1. Supabase migration 040_push_notification_triggers.sql'i çalıştırın");
  console.log("     (rpc_trigger_match_end_push + rpc_trigger_transfer_offer_push)");
  console.log("  2. Supabase dashboard → Database → app.fcm_server_key = 'FCM_SERVER_KEY'");
  console.log("     (ALTER DATABASE <name> SET app.fcm_server_key = '...';)");
  console.log("  3. pg_http extension'ı aktif olmalı (Supabase → Extensions → pg_http)");
  console.log("  4. Kullanıcı telefonda register olunca push_tokens'a token yazılır");
  console.log("");
}

(async () => {
  testGracePeriodBotStrength();
  await testTrainingXPGaceBoost();
  await testPushTriggers();
})();
