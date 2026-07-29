/**
 * v2.9.28 GÖREV 1-3: Kart Sistemi — Trait/Arketip Kartları.
 *
 * Mevcut trait/arketip verisinden (traitsData.ts + data.ts ARKETIPLER)
 * otomatik olarak satılabilir kart listesi türetir.
 *
 * 3 kart tipi:
 *   1. Pozitif Trait Kartı — oyuncuya yeni pozitif trait ekler
 *   2. Negatif Özellik Giderme Kartı — oyuncudaki negatif trait'i kaldırır
 *   3. Arketip Kartı — oyuncunun arketipini değiştirir
 *
 * Fiyatlandırma (GÖREV 2):
 *   - Pozitif trait: taban_fiyat[level] × (1 + engineWeight × 10)
 *     BEYAZ: 10, LACIVERT: 20, MOR: 35, ALTIN: 50
 *     engineWeight yoksa (kozmetik) taban fiyat
 *   - Negatif giderme: taban 15 + |penalty toplamı| × 1.5
 *   - Arketip: 30 (sabit, tüm arketipler aynı fiyat)
 *
 * İsimlendirme (GÖREV 3):
 *   - Negatif giderme kartları: "[Karşıt Sıfat] Eğitimi Kartı"
 *   - Fiziksel: speed→Hız, heading→Hava Hakimiyeti, workrate→Çalışkanlık
 *   - Zihinsel: awareness→Farkındalık, coolness→Soğukkanlılık, vision→Vizyon,
 *     decision→Karar Verme, disciplin→Disiplin
 *   - Teknik: control→Top Kontrolü, passing→Pas, shooting→Şut,
 *     catching→Tutuş, reflexes→Refleks, defending→Defans
 */

import { TRAITS_DATA, type TraitLevel, type TraitDef } from "@/lib/match/engine/traitsData";
import { ARKETIPLER } from "@/lib/mock/data";

export type CardType = "trait_positive" | "trait_negative_removal" | "arketip";

export type ShopCard = {
  cardId: string;
  cardType: CardType;
  cardName: string;
  groupName: string; // defans/orta_saha/forvet/kaleci/arketip
  price: number;
  description: string;
  effectData?: any;
  level?: TraitLevel; // pozitif traitler için nadirlik
  rarity?: "common" | "rare" | "epic" | "legendary"; // UI için
};

// ============================================================================
// GÖREV 2: Fiyatlandırma — TEK KANONİK FORMÜL
// ============================================================================

const LEVEL_BASE_PRICES: Record<TraitLevel, number> = {
  BEYAZ: 10,
  LACIVERT: 20,
  MOR: 35,
  ALTIN: 50,
};

const LEVEL_RARITY: Record<TraitLevel, "common" | "rare" | "epic" | "legendary"> = {
  BEYAZ: "common",
  LACIVERT: "rare",
  MOR: "epic",
  ALTIN: "legendary",
};

/**
 * Pozitif trait kartı fiyatı hesapla.
 * Formül: taban_fiyat[level] × (1 + engineWeight × 10)
 * engineWeight yoksa (kozmetik) taban fiyat.
 */
function calculatePositiveTraitPrice(trait: any): number {
  const base = LEVEL_BASE_PRICES[trait.level as TraitLevel] ?? 10;
  const engineWeight = trait.engineEffect?.engineWeight ?? 0;
  const price = Math.round(base * (1 + engineWeight * 10));
  return price;
}

/**
 * Negatif trait giderme kartı fiyatı hesapla.
 * Formül: taban 15 + |penalty toplamı| × 1.5
 * Büyük penaltı (örn -25) → 15 + 25×1.5 = 52.5 → 53
 * Küçük penaltı (örn -5) → 15 + 5×1.5 = 22.5 → 23
 */
function calculateNegativeRemovalPrice(penalty: Record<string, number>): number {
  const totalPenalty = Object.values(penalty).reduce((s, v) => s + Math.abs(v), 0);
  return Math.round(15 + totalPenalty * 1.5);
}

/**
 * Arketip kartı fiyatı — sabit 30 kredi.
 * Tüm arketipler aynı fiyat (oyuncu gücünü doğrudan etkilemez,
 * sadece maç motoru için profil belirler).
 */
const ARKETIP_PRICE = 30;

// ============================================================================
// GÖREV 3: Negatif trait giderme kart isimlendirme
// "[Karşıt Sıfat] Eğitimi Kartı" kalıbı
// ============================================================================

const STAT_OPPOSITE_NAMES: Record<string, string> = {
  // Fiziksel
  speed: "Hız",
  heading: "Hava Hakimiyeti",
  workrate: "Çalışkanlık",
  // Zihinsel
  awareness: "Farkındalık",
  coolness: "Soğukkanlılık",
  vision: "Vizyon",
  decision: "Karar Verme",
  disciplin: "Disiplin",
  // Teknik
  control: "Top Kontrolü",
  passing: "Pas",
  shooting: "Şut",
  catching: "Tutuş",
  reflexes: "Refleks",
  defending: "Defans",
};

/**
 * Negatif trait için giderme kart adı üret.
 * "[Karşıt Sıfat] Eğitimi Kartı" kalıbı.
 * Eğer penalty birden fazla stat'i etkiliyorsa, en büyük penaltıyı al.
 */
function getNegativeRemovalCardName(penalty: Record<string, number>): string {
  // En büyük penaltıyı bul (mutlak değer olarak)
  let maxStat = "";
  let maxValue = 0;
  for (const [stat, value] of Object.entries(penalty)) {
    if (Math.abs(value) > maxValue) {
      maxValue = Math.abs(value);
      maxStat = stat;
    }
  }
  const oppositeName = STAT_OPPOSITE_NAMES[maxStat] ?? "Gelişim";
  return `${oppositeName} Eğitimi Kartı`;
}

// ============================================================================
// Kart listesi türetme — mevcut trait verisinden otomatik
// ============================================================================

/**
 * Tüm pozitif trait kartlarını üret (4 pozisyon grubu × tüm pozitif traitler).
 */
function generatePositiveTraitCards(): ShopCard[] {
  const cards: ShopCard[] = [];
  const groups = ["defans", "orta_saha", "forvet", "kaleci"] as const;

  for (const group of groups) {
    const groupData = TRAITS_DATA[group];
    if (!groupData?.pozitif) continue;

    for (const trait of groupData.pozitif as any[]) {
      const cardId = `trait_pos_${trait.name}_${group}`;
      cards.push({
        cardId,
        cardType: "trait_positive",
        cardName: trait.name,
        groupName: group,
        price: calculatePositiveTraitPrice(trait),
        description: trait.description,
        effectData: trait,
        level: trait.level,
        rarity: LEVEL_RARITY[trait.level],
      });
    }
  }

  return cards;
}

/**
 * Tüm negatif trait giderme kartlarını üret (4 pozisyon grubu × tüm negatif traitler).
 */
function generateNegativeRemovalCards(): ShopCard[] {
  const cards: ShopCard[] = [];
  const groups = ["defans", "orta_saha", "forvet", "kaleci"] as const;

  for (const group of groups) {
    const groupData = TRAITS_DATA[group];
    if (!groupData?.negatif) continue;

    for (const negTrait of groupData.negatif as any[]) {
      if (!negTrait.penalty) continue;
      const cardName = getNegativeRemovalCardName(negTrait.penalty);
      const cardId = `trait_neg_remove_${negTrait.name}_${group}`;
      cards.push({
        cardId,
        cardType: "trait_negative_removal",
        cardName,
        groupName: group,
        price: calculateNegativeRemovalPrice(negTrait.penalty),
        description: `"${negTrait.name}" negatif özelliğini kaldırır. ${negTrait.description} (Etki: ${Object.entries(negTrait.penalty).map(([k, v]) => `${k} ${v}`).join(", ")})`,
        effectData: {
          negTraitName: negTrait.name,
          penalty: negTrait.penalty,
        },
        rarity: "rare",
      });
    }
  }

  return cards;
}

/**
 * Tüm arketip kartlarını üret (tüm pozisyonlar × tüm arketipler).
 */
function generateArketipCards(): ShopCard[] {
  const cards: ShopCard[] = [];

  for (const [pos, arketipList] of Object.entries(ARKETIPLER)) {
    for (const arketip of arketipList) {
      const cardId = `arketip_${arketip}_${pos}`;
      cards.push({
        cardId,
        cardType: "arketip",
        cardName: arketip,
        groupName: `arketip_${pos}`,
        price: ARKETIP_PRICE,
        description: `Oyuncunun arketipini "${arketip}" olarak değiştirir. Pozisyon: ${pos}`,
        effectData: { arketip, position: pos },
        rarity: "epic",
      });
    }
  }

  return cards;
}

/**
 * Tüm kartları üret — mağaza için tek giriş noktası.
 * Mevcut trait verisinden otomatik türetildiği için, ileride yeni trait
 * eklendiğinde kart sistemi otomatik güncellenir.
 */
export function getAllShopCards(): ShopCard[] {
  return [
    ...generatePositiveTraitCards(),
    ...generateNegativeRemovalCards(),
    ...generateArketipCards(),
  ];
}

/**
 * Belirli bir tipteki kartları getir (mağaza kategorileri için).
 */
export function getCardsByType(cardType: CardType): ShopCard[] {
  return getAllShopCards().filter(c => c.cardType === cardType);
}

/**
 * Kart ID'sine göre tek bir kart getir.
 */
export function getCardById(cardId: string): ShopCard | undefined {
  return getAllShopCards().find(c => c.cardId === cardId);
}

/**
 * Nadirlik rengi — UI için.
 */
export function getRarityColor(rarity?: string): string {
  switch (rarity) {
    case "common": return "border-zinc-500/50 bg-zinc-500/10";
    case "rare": return "border-sky-500/50 bg-sky-500/10";
    case "epic": return "border-purple-500/50 bg-purple-500/10";
    case "legendary": return "border-amber-500/50 bg-amber-500/10";
    default: return "border-border bg-card";
  }
}

/**
 * Nadirlik etiketi — UI için.
 */
export function getRarityLabel(rarity?: string): string {
  switch (rarity) {
    case "common": return "Yaygın";
    case "rare": return "Nadir";
    case "epic": return "Epik";
    case "legendary": return "Efsane";
    default: return "";
  }
}

/**
 * Level rengi — pozitif traitler için (BEYAZ/LACIVERT/MOR/ALTIN).
 */
export function getLevelColor(level?: TraitLevel): string {
  switch (level) {
    case "BEYAZ": return "text-zinc-400";
    case "LACIVERT": return "text-sky-400";
    case "MOR": return "text-purple-400";
    case "ALTIN": return "text-amber-400";
    default: return "text-muted-foreground";
  }
}

/**
 * Level etiketi — pozitif traitler için.
 */
export function getLevelLabel(level?: TraitLevel): string {
  switch (level) {
    case "BEYAZ": return "Standart";
    case "LACIVERT": return "Elit";
    case "MOR": return "Üstat";
    case "ALTIN": return "Efsanevi";
    default: return "";
  }
}

/**
 * Pozisyon grubu etiketi — UI için.
 */
export function getGroupLabel(groupName: string): string {
  if (groupName.startsWith("arketip_")) {
    const pos = groupName.replace("arketip_", "");
    return `Arketip · ${pos}`;
  }
  switch (groupName) {
    case "defans": return "Defans";
    case "orta_saha": return "Orta Saha";
    case "forvet": return "Forvet";
    case "kaleci": return "Kaleci";
    default: return groupName;
  }
}
