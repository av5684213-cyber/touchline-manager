/**
 * v2.9.46 GÖREV 6 — Oyuncu başına maksimum 2 kart limiti testi
 *
 * Çalıştırma: npx tsx scripts/test-card-limit.ts
 *
 * Test akışı:
 *   1. Mock store + oyuncu + kart envanteri oluştur
 *   2. 1. kartı bas → success, count 0→1
 *   3. 2. kartı bas → success, count 1→2
 *   4. 3. kartı bas → FAIL, "maksimum kart sayısına ulaştı"
 *   5. UI mesajı doğru gösteriliyor mu kontrolü (string match)
 *
 * Not: Bu test gerçek store'u kullanmaz — applyCardToPlayer mantığını
 * birebir taklit eden bir mock ile çalışır. Gerçek entegrasyon için
 * store.test.ts (zombie integration test) gerekir.
 */
import type { Player } from "../src/lib/mock/data";

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("✗ FAIL:", msg);
    failures++;
  } else {
    console.log("✓ PASS:", msg);
  }
}

// Mock kart tipi
type MockCard = {
  cardId: string;
  cardType: "trait_positive" | "trait_negative_removal" | "arketip";
  cardName: string;
  quantity: number;
  effectData?: any;
};

// Mock applyCardToPlayer — store.ts'teki mantığın birebir taklidi
function mockApplyCardToPlayer(
  card: MockCard,
  player: Player,
  inventory: MockCard[]
): { success: boolean; reason?: string; player?: Player; inventory?: MockCard[] } {
  if (card.quantity <= 0) return { success: false, reason: "Kart adedi yetersiz" };

  // v2.9.46 GÖREV 6: Max 2 kart limiti
  const currentCount = (player as any).cardsAppliedCount ?? 0;
  const MAX_CARDS_PER_PLAYER = 2;
  if (currentCount >= MAX_CARDS_PER_PLAYER) {
    return {
      success: false,
      reason: `Bu oyuncu maksimum kart sayısına ulaştı — ${currentCount}/${MAX_CARDS_PER_PLAYER}`,
    };
  }

  // Uygulanabilirlik kontrolü (basit mock)
  if (card.cardType === "trait_positive") {
    if ((player.traits ?? []).includes(card.cardName)) {
      return { success: false, reason: "Bu oyuncuda zaten bu trait var" };
    }
  }

  // Kartı uygula
  const updatedPlayer: Player = { ...player };
  if (card.cardType === "trait_positive") {
    updatedPlayer.traits = [...(updatedPlayer.traits ?? []), card.cardName];
  } else if (card.cardType === "arketip") {
    updatedPlayer.archetype = card.cardName;
  }
  updatedPlayer.cardsAppliedCount = (updatedPlayer.cardsAppliedCount ?? 0) + 1;

  // Envanterden 1 düşür
  const updatedInventory = inventory
    .map(c => c.cardId === card.cardId ? { ...c, quantity: c.quantity - 1 } : c)
    .filter(c => c.quantity > 0);

  return { success: true, player: updatedPlayer, inventory: updatedInventory };
}

// Mock oyuncu
function makeMockPlayer(): Player {
  return {
    id: "p1",
    firstName: "Ahmet",
    lastName: "Yıldız",
    name: "Ahmet Yıldız",
    position: "FWD",
    specificPosition: "ST",
    age: 25,
    potential: 80,
    hidden_potential: 80,
    rating: 75,
    formRating: 7.5,
    nationality: "TR",
    nation: "Türkiye",
    foot: "Right",
    market_value: 10_000_000,
    marketValue: 10_000_000,
    salary: 50_000,
    weeklyWage: 50_000,
    defending: 30,
    passing: 70,
    shooting: 80,
    speed: 75,
    power: 70,
    stats: { pace: 75, shooting: 80, passing: 70, defending: 30, physical: 70, dribbling: 75 },
    cond: 100,
    condition: 100,
    form: 75,
    morale: 80,
    confidence: 75,
    traits: [],
    goals: 0,
    assists: 0,
    saves: 0,
    appearances: 0,
    cardsAppliedCount: 0,
  } as unknown as Player;
}

// === TEST SENARYOLARI ===

// Senaryo 1: Sıfırdan başla, 2 kart bas, 3. denemede engellenmeli
let player = makeMockPlayer();
let inventory: MockCard[] = [
  { cardId: "c1", cardType: "trait_positive", cardName: "Hız Ustası", quantity: 1 },
  { cardId: "c2", cardType: "trait_positive", cardName: "Şut Ustası", quantity: 1 },
  { cardId: "c3", cardType: "trait_positive", cardName: "Pas Ustası", quantity: 1 },
];

assert((player as any).cardsAppliedCount === 0, "Başlangıç: cardsAppliedCount = 0");
assert(inventory.length === 3, "Başlangıç: 3 kart envanterde");

// 1. kart
const r1 = mockApplyCardToPlayer(inventory[0], player, inventory);
assert(r1.success === true, "1. kart başarıyla basıldı");
assert(r1.player?.traits?.includes("Hız Ustası") === true, "1. kart trait eklendi");
assert((r1.player as any).cardsAppliedCount === 1, "1. kart sonrası count = 1");
player = r1.player!;
inventory = r1.inventory!;
assert(inventory.length === 2, "1. kart sonrası envanter 2 kart");

// 2. kart
const r2 = mockApplyCardToPlayer(inventory[0], player, inventory);
assert(r2.success === true, "2. kart başarıyla basıldı");
assert((r2.player as any).cardsAppliedCount === 2, "2. kart sonrası count = 2");
player = r2.player!;
inventory = r2.inventory!;
assert(inventory.length === 1, "2. kart sonrası envanter 1 kart");

// 3. kart — ENGELLENMELİ
const r3 = mockApplyCardToPlayer(inventory[0], player, inventory);
assert(r3.success === false, "3. kart ENGELLENDİ");
assert(
  r3.reason?.includes("maksimum kart sayısına ulaştı") === true,
  `3. kart hatası 'maksimum kart sayısına ulaştı' içermeli (bulunan: ${r3.reason})`
);
assert(r3.reason?.includes("2/2") === true, "3. kart hatası '2/2' içermeli");
// Envanter ve oyuncu değişmemeli
assert(inventory.length === 1, "3. kart engellendi — envanter hala 1 kart");
assert((player as any).cardsAppliedCount === 2, "3. kart engellendi — count hala 2");

// Senaryo 2: Negatif giderme kartı da sayıma dahil
let player2 = makeMockPlayer();
// İlk 2 kartı bas (1 pozitif trait + 1 arketip)
player2.traits = ["Hız Ustası"];
player2.archetype = "Gol Makinesi";
(player2 as any).cardsAppliedCount = 2;
const inventory2: MockCard[] = [
  { cardId: "c4", cardType: "trait_negative_removal", cardName: "Yavaşlık Gider", quantity: 1,
    effectData: { negTraitName: "Yavaş" } },
];
player2.negTraits = ["Yavaş"];
const r4 = mockApplyCardToPlayer(inventory2[0], player2, inventory2);
assert(r4.success === false, "2 kart dolu → negatif giderme de engellendi");
assert(r4.reason?.includes("2/2") === true, "Negatif giderme engeli doğru mesaj");

// Senaryo 3: Eski oyuncu (cardsAppliedCount undefined) — 0 sayılır
let player3 = makeMockPlayer();
delete (player3 as any).cardsAppliedCount;
const inventory3: MockCard[] = [
  { cardId: "c5", cardType: "trait_positive", cardName: "Kafa Ustası", quantity: 1 },
];
const r5 = mockApplyCardToPlayer(inventory3[0], player3, inventory3);
assert(r5.success === true, "Eski oyuncu (count undefined) → 0 sayıldı, kart basıldı");
assert((r5.player as any).cardsAppliedCount === 1, "Eski oyuncu sonrası count = 1");

// Senaryo 4: Sayaç sadece artar — kart geri alınamaz (kalıcı)
let player4 = makeMockPlayer();
(player4 as any).cardsAppliedCount = 2;
const inventory4: MockCard[] = [
  { cardId: "c6", cardType: "trait_positive", cardName: "Pas Ustası", quantity: 5 },
];
// 2 kart zaten basılı, yeni kart basılamaz
const r6 = mockApplyCardToPlayer(inventory4[0], player4, inventory4);
assert(r6.success === false, "2 kart dolu → yeni kart basılamaz (sayaç geri alınamaz)");
assert(inventory4[0].quantity === 5, "Envanterdeki kart adedi değişmedi (5)");

console.log("\n" + (failures === 0 ? "✅ TÜM TESTLER BAŞARILI" : `❌ ${failures} test başarısız`));
process.exit(failures === 0 ? 0 : 1);
