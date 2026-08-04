import type { Player } from "@/lib/mock/data";

/**
 * Tek kaynak piyasa değeri hesaplama — tüm uygulama bunu kullanır.
 *
 * Eski tutarsız formüller:
 *  - data.ts: ovr × rand(80K, 180K) → rating 70 için 5.6M-12.6M
 *  - transfer.ts serbest: ovr × 100K × ageMult → rating 70 için 7M
 *  - transfer.ts takımsız: ovr × 80K → rating 70 için 5.6M
 *
 * Yeni tek formül:
 *  - Base = rating² × 8000 (rating 80 → 51M, 70 → 39M, 60 → 29M)
 *  - Yaş çarpanı: ≤23 → 1.30, ≤27 → 1.15, ≤30 → 1.00, ≤33 → 0.75, 34+ → 0.50
 *  - Potansiyel bonusu: (potential - rating) × 200K
 *  - Arketip çarpanı: 0.95 - 1.30 (Gol Makinesi ×1.30, Defansif Bek ×0.95)
 *  - Pozisyon çarpanı: ST ×1.25, GK ×1.10, CB ×0.90
 *  - Kondisyon cezası: <50 → -%15
 *  - Moral bonusu: >80 → +%5
 *
 * v2.9.46 GÖREV 5: Sezon performans modifier'ı (opsiyonel 2. parametre)
 *  - Sadece sezon sonunda endSeason tarafından kullanılır
 *  - Sezon ortasında piyasa değeri bu faktörden etkilenmez
 *  - Gol/asist beklenenin üstündeyse değer artar
 *  - Sık sakatlanmışsa değer düşer
 *  - 0.80 - 1.25 arası çarpan (varsayılan 1.0 = etkisiz)
 *
 * Min 50K, max 200M
 */

// Arketip çarpanları
const ARCHETYPE_MULTIPLIERS: Record<string, number> = {
  "Refleks Canavarı": 1.20, "Güvenli Eller": 1.00, "Süpürücü Kaleci": 1.10,
  "Penaltı Uzmanı": 0.95, "Büyük Maç Kalecisi": 1.15,
  "Duvar": 1.15, "Lider Stoper": 1.20, "Top Çıkan Stoper": 1.10,
  "Hava Hakimi": 1.05, "Baskı Ustası": 1.00, "Kale Gibi": 1.05,
  "Kanat Beki": 1.10, "Hücumcu Bek": 1.15, "Defansif Bek": 0.95,
  "Ters Bek": 1.20, "Ofansif Bek": 1.15,
  "Yıkıcı": 1.05, "Regista": 1.20, "Ekran Oyuncusu": 1.00, "Duvar Orta Saha": 0.95,
  "Motor": 1.10, "Truva Atı": 1.05, "Pas Ustası": 1.15, "Box-to-Box": 1.20,
  "Tempo Kontrolcüsü": 1.10,
  "Playmaker": 1.25, "Numara 10": 1.20, "Yaratıcı": 1.20, "Oyun Kurucu": 1.20,
  "Kanat": 1.05, "İçeri Dönen": 1.15, "Hızlı Kanat": 1.20, "Dripling Ustası": 1.20,
  "Gol Makinesi": 1.30, "Bitirici": 1.25, "Hedef Adam": 1.10,
  "Fırsatçı": 1.10, "Hızlı Forvet": 1.20,
  "İkinci Forvet": 1.10, "Yaratıcı Forvet": 1.15,
};

const POSITION_VALUE_WEIGHT: Record<string, number> = {
  GK: 1.10,
  CB: 0.90, LB: 0.95, RB: 0.95, LWB: 0.90, RWB: 0.90,
  CDM: 1.00, CM: 1.00, CAM: 1.15,
  LM: 0.95, RM: 0.95, LW: 1.10, RW: 1.10,
  ST: 1.25, CF: 1.15,
};

/**
 * v2.9.46 GÖREV 5: Sezon performans modifier'ını hesapla.
 *
 * Oyuncunun sezon sonundaki gerçek performansına göre 0.80 - 1.25 arası
 * bir çarpan üretir. Sadece sezon sonunda çağrılır.
 *
 * Faktörler:
 *  - Gol/maç oranı: forvet için 0.5 gol/maç beklenir, üstünde +%10-25
 *  - Asist/maç oranı: orta saha için 0.4 asist/maç beklenir, üstünde +%5-15
 *  - Maç reytingi: 7.5+ ise +%5, 6.5 altı ise -%5
 *  - Sakatlık sıklığı: sezon boyunca 3+ sakatlık → -%10-20
 *
 * @param player sezon sonundaki oyuncu (goals/assists/appearances dolu)
 * @returns 0.80 - 1.25 arası çarpan (1.0 = etkisiz)
 */
export function calculateSeasonPerformanceModifier(player: Player): number {
  const apps = player.appearances ?? 0;
  const goals = player.goals ?? 0;
  const assists = player.assists ?? 0;
  const pos = player.specificPosition ?? "CM";
  const lastRating = player.last_match_rating ?? 0;
  // Sakatlık geçmişi — injury_history varsa ondan, yoksa sezonda is_injured sayısı tahmin
  const injuryHistory = (player as any).injury_history ?? [];
  const injuryCount = Array.isArray(injuryHistory) ? injuryHistory.length : 0;

  // Maç oynamamışsa modifier uygulanmaz (yeni transfer, genç oyuncu)
  if (apps === 0) return 1.0;

  let modifier = 1.0;
  const isForward = pos === "ST" || pos === "CF" || pos.startsWith("W") || pos.startsWith("LW") || pos.startsWith("RW");
  const isMid = pos.startsWith("CM") || pos.startsWith("AM") || pos.startsWith("DM") || pos.startsWith("LM") || pos.startsWith("RM");
  const isGK = pos === "GK";

  // Gol/maç oranı (forvet ve ofansif orta saha için)
  if (isForward || isMid) {
    const goalsPerGame = goals / apps;
    const expected = isForward ? 0.5 : 0.2; // forvet için 0.5, orta saha için 0.2 beklenen
    if (goalsPerGame > expected * 1.5) modifier += 0.15; // %50 üstünde → +15%
    else if (goalsPerGame > expected * 1.2) modifier += 0.08; // %20 üstünde → +8%
    else if (goalsPerGame < expected * 0.3) modifier -= 0.05; // %70 altında → -5%
  }

  // Asist/maç oranı (orta saha ve forvet için)
  if (isMid || isForward) {
    const assistsPerGame = assists / apps;
    const expected = isMid ? 0.4 : 0.25;
    if (assistsPerGame > expected * 1.5) modifier += 0.10;
    else if (assistsPerGame > expected * 1.2) modifier += 0.05;
  }

  // Maç reytingi (tüm pozisyonlar)
  if (lastRating >= 8.0) modifier += 0.05;
  else if (lastRating >= 7.5) modifier += 0.03;
  else if (lastRating < 6.5 && lastRating > 0) modifier -= 0.05;

  // Kaleci için saves/maç oranı
  if (isGK) {
    const saves = player.saves ?? 0;
    const savesPerGame = saves / apps;
    if (savesPerGame >= 5) modifier += 0.10; // yüksek kurtarış → +10%
    else if (savesPerGame >= 3.5) modifier += 0.05;
  }

  // Sakatlık sıklığı — sezon boyunca 3+ sakatlık değeri düşürür
  if (injuryCount >= 5) modifier -= 0.20; // kronik sakat → -20%
  else if (injuryCount >= 3) modifier -= 0.10; // sık sakat → -10%
  else if (injuryCount >= 1) modifier -= 0.03; // 1-2 sakat → -3%

  // Clamp: 0.80 - 1.25 arası
  return Math.max(0.80, Math.min(1.25, modifier));
}

export function calculatePlayerValue(player: Player, seasonPerformanceModifier?: number): number {
  const rating = player.rating ?? 50;
  const potential = player.potential ?? rating;
  const age = player.age ?? 25;
  const archetype = player.archetype ?? "";
  const pos = player.specificPosition ?? "CM";
  const cond = player.cond ?? 100;
  const morale = player.morale ?? 70;

  const base = Math.pow(rating, 2) * 8000;

  let ageMult: number;
  if (age <= 23) ageMult = 1.30;
  else if (age <= 27) ageMult = 1.15;
  else if (age <= 30) ageMult = 1.00;
  else if (age <= 33) ageMult = 0.75;
  else ageMult = 0.50;

  const potentialBonus = Math.max(0, potential - rating) * 200_000;
  const archMult = ARCHETYPE_MULTIPLIERS[archetype] ?? 1.00;
  const posMult = POSITION_VALUE_WEIGHT[pos] ?? 1.00;
  const condMult = cond < 50 ? 0.85 : 1.00;
  const moraleMult = morale > 80 ? 1.05 : 1.00;
  const perfMult = seasonPerformanceModifier ?? 1.0;

  // v2.9.76: Ödül çarpanı — en yüksek sezon tier + en yüksek milestone tier AYRI AYRI uygulanır
  // Sezon ödülü: gold=%12, silver=%6, bronze=%3 (en yüksek tek bir sezon ödülü)
  // Milestone ödülü: gold=%6, silver=%3, bronze=%1 (en yüksek tek bir milestone ödülü)
  // İki grup ayrı çarpanlar — kümülatif DEĞİL, her gruptan en yüksek tier
  let awardMult = 1.0;
  try {
    const awards = (player as any).seasonAwards as any[] | undefined;
    if (awards && awards.length > 0) {
      const TIER_RANK: Record<string, number> = { gold: 3, silver: 2, bronze: 1 };
      const SEASON_MULT: Record<string, number> = { gold: 1.12, silver: 1.06, bronze: 1.03 };
      const MILESTONE_MULT: Record<string, number> = { gold: 1.06, silver: 1.03, bronze: 1.01 };
      const MILESTONE_KEYS = new Set(["hattrick_hero", "century_club", "iron_man"]);

      let bestSeasonTier: string | null = null;
      let bestMilestoneTier: string | null = null;

      for (const a of awards) {
        const tier = a.tier ?? (a.rank === 1 ? "gold" : a.rank === 2 ? "silver" : "bronze");
        const isMilestone = MILESTONE_KEYS.has(a.awardType);
        if (isMilestone) {
          if (!bestMilestoneTier || TIER_RANK[tier] > TIER_RANK[bestMilestoneTier]) {
            bestMilestoneTier = tier;
          }
        } else {
          if (!bestSeasonTier || TIER_RANK[tier] > TIER_RANK[bestSeasonTier]) {
            bestSeasonTier = tier;
          }
        }
      }

      // En yüksek sezon ödülü + en yüksek milestone ödülü (ikisi ayrı çarpanlar)
      if (bestSeasonTier) awardMult *= SEASON_MULT[bestSeasonTier] ?? 1.0;
      if (bestMilestoneTier) awardMult *= MILESTONE_MULT[bestMilestoneTier] ?? 1.0;
    }
  } catch { /* seasonAwards yoksa 1.0 kalır */ }

  const value = Math.round(
    (base + potentialBonus) * ageMult * archMult * posMult * condMult * moraleMult * perfMult * awardMult
  );

  return Math.min(200_000_000, Math.max(50_000, value));
}

// v2.9.30 T-06: calculateWeeklyWage SİLİNDİ — salaryUtils.ts calculateSalaryRange tek kaynak
// v2.9.30 T-07: TRANSFER_TAX_RATE, AGENT_FEE_RATE, SIGNING_BONUS_RATE, calculateBuyerCost, calculateSellerNet
// SİLİNDİ — mock/transfer.ts tek kaynak
