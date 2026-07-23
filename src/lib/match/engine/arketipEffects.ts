/**
 * ════════════════════════════════════════════════════════════════════════════
 * ARKETİP ETKİ SİSTEMİ — v2.9.10
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Overall seviyesine göre arketip kartlarının maç motoruna etki yüzdesini ölçekler.
 *
 * PRENSİP:
 * - 50 OVR'da arketip etkisi zayıf (%30)
 * - 70 OVR'da tam etki (%100)
 * - 85 OVR'da güçlü (%140)
 * - 95+ OVR'da efsanevi (%175)
 *
 * ETKİ ALANLARI:
 * - goalChance: gol olasılığı (scorer için artı, defansif için eksi)
 * - shotChance: şut atma olasılığı
 * - assistChance: asist olasılığı
 * - tackleChance: başarılı müdahale olasılığı (defansif arketipler)
 * - interceptionChance: top kesme olasılığı (defansif arketipler)
 * - saveChance: kaleci kurtarış olasılığı
 * - possessionBonus: topa sahip olma katkısı (orta saha arketipleri)
 * - attackStrength: takım hücum gücüne katkı
 * - midfieldStrength: takım orta saha gücüne katkı
 * - defenseStrength: takım defans gücüne katkı
 * - gkStrength: kaleci gücüne katkı
 */

// ════════════════════════════════════════════════════════════════════════════
// 1. OVERALL ÖLÇEKLEME FONKSİYONU
// ════════════════════════════════════════════════════════════════════════════

/**
 * Overall seviyesine göre arketip etki çarpanı.
 * Sürekli fonksiyon (basamaklı değil) — 79→80 sıçraması yok.
 *
 * @param ovr Oyuncu overall (30-99)
 * @returns 0.30 - 1.75 arası çarpan
 *
 * Örnek değerler:
 *   50 → 0.50 (zayıf — arketip az etki)
 *   60 → 0.70
 *   70 → 0.90
 *   75 → 1.00 (taban — tam etki)
 *   80 → 1.15
 *   85 → 1.30
 *   90 → 1.45
 *   95 → 1.60
 *   99 → 1.75 (efsane)
 */
export function getArchetypeOvrFactor(ovr: number): number {
  // 50 altı sabit 0.30 (çok zayıf oyuncuda arketip etki sınırlı)
  if (ovr <= 50) return 0.30;
  // 50-95 arası sürekli ölçekleme
  if (ovr <= 95) {
    // 50 → 0.30, 95 → 1.60
    // linear: factor = 0.30 + (ovr - 50) / 45 * 1.30
    return 0.30 + ((ovr - 50) / 45) * 1.30;
  }
  // 95+ sabit 1.75 (efsane seviye)
  return 1.75;
}

/**
 * Overall bandı etiketi — UI'da göstermek için.
 */
export function getOvrBand(ovr: number): "zayif" | "ortalama" | "iyi" | "yildiz" | "efsane" {
  if (ovr < 60) return "zayif";
  if (ovr < 70) return "ortalama";
  if (ovr < 80) return "iyi";
  if (ovr < 90) return "yildiz";
  return "efsane";
}

/**
 * Overall bandına göre etki yüzdesi (UI için, % olarak).
 */
export function getOvrFactorPercent(ovr: number): number {
  return Math.round(getArchetypeOvrFactor(ovr) * 100);
}

// ════════════════════════════════════════════════════════════════════════════
// 2. ARKETİP ETKİ TABLOSU
// ════════════════════════════════════════════════════════════════════════════

export type ArketipEtki = {
  // Pozitif etkiler (oyuncu bu arketipte iyiyse)
  goalChance?: number;        // gol olasılığı çarpanı (+0.22 = +%22, 75 OVR'da)
  shotChance?: number;        // şut atma olasılığı çarpanı
  assistChance?: number;      // asist olasılığı çarpanı
  tackleChance?: number;      // müdahale olasılığı çarpanı (defans)
  interceptionChance?: number;// top kesme olasılığı çarpanı (defans)
  saveChance?: number;        // kaleci kurtarış olasılığı çarpanı
  possessionBonus?: number;   // topa sahip olma katkısı (orta saha)
  // Takım strength katkısı (weak — rating çarpıcı olarak)
  attackStrength?: number;    // +%5 = 0.05
  midfieldStrength?: number;
  defenseStrength?: number;
  gkStrength?: number;
};

/**
 * Arketip etki tablosu — tüm 40 arketip.
 * Değerler 75 OVR (taban) için. Overall'a göre ölçeklenir.
 *
 * Örn: "Gol Makinesi" — goalChance +0.22 (75 OVR'da +%22 gol şansı)
 *   50 OVR'da: +0.22 × 0.30 = +%6.6
 *   75 OVR'da: +0.22 × 1.00 = +%22
 *   85 OVR'da: +0.22 × 1.30 = +%28.6
 *   95 OVR'da: +0.22 × 1.60 = +%35.2
 */
export const ARKETIP_EFFECTS: Record<string, ArketipEtki> = {
  // ═══ 🧤 KALECİ (5) ═══
  "Refleks Canavarı":      { saveChance: 0.16, gkStrength: 0.10 },
  "Güvenli Eller":         { saveChance: 0.12, gkStrength: 0.08, interceptionChance: 0.05 },
  "Süpürücü Kaleci":       { saveChance: 0.10, gkStrength: 0.06, possessionBonus: 0.04 },
  "Penaltı Uzmanı":        { saveChance: 0.14, gkStrength: 0.08 },
  "Büyük Maç Kalecisi":    { saveChance: 0.13, gkStrength: 0.09, leadership: 0.05 } as any,

  // ═══ 🛡️ STOPER (6) ═══
  "Duvar":                 { tackleChance: 0.14, interceptionChance: 0.10, defenseStrength: 0.10 },
  "Lider Stoper":          { tackleChance: 0.10, interceptionChance: 0.08, defenseStrength: 0.08, leadership: 0.06 } as any,
  "Top Çıkan Stoper":      { tackleChance: 0.08, interceptionChance: 0.06, defenseStrength: 0.06, possessionBonus: 0.05, assistChance: 0.04 },
  "Hava Hakimi":           { tackleChance: 0.10, interceptionChance: 0.08, defenseStrength: 0.08 },
  "Baskı Ustası":          { tackleChance: 0.12, interceptionChance: 0.09, defenseStrength: 0.08 },
  "Kale Gibi":             { tackleChance: 0.11, interceptionChance: 0.08, defenseStrength: 0.09 },

  // ═══ ↔️ BEK (5) ═══
  "Kanat Beki":            { tackleChance: 0.06, interceptionChance: 0.05, defenseStrength: 0.04, attackStrength: 0.04, assistChance: 0.05, possessionBonus: 0.03 },
  "Hücumcu Bek":           { tackleChance: 0.04, interceptionChance: 0.03, defenseStrength: 0.02, attackStrength: 0.07, assistChance: 0.06, possessionBonus: 0.04 },
  "Defansif Bek":          { tackleChance: 0.09, interceptionChance: 0.07, defenseStrength: 0.07 },
  "Ters Bek":              { tackleChance: 0.06, interceptionChance: 0.05, defenseStrength: 0.04, attackStrength: 0.05, assistChance: 0.05, possessionBonus: 0.04 },
  "Ofansif Bek":           { tackleChance: 0.04, interceptionChance: 0.03, defenseStrength: 0.02, attackStrength: 0.08, assistChance: 0.07, possessionBonus: 0.05 },

  // ═══ 🎯 DEFANSİF ORTA SAHA (4) ═══
  "Yıkıcı":                { tackleChance: 0.15, interceptionChance: 0.12, defenseStrength: 0.10, midfieldStrength: 0.04 },
  "Regista":               { tackleChance: 0.06, interceptionChance: 0.08, defenseStrength: 0.04, midfieldStrength: 0.09, assistChance: 0.08, possessionBonus: 0.07 },
  "Ekran Oyuncusu":        { tackleChance: 0.10, interceptionChance: 0.10, defenseStrength: 0.08, midfieldStrength: 0.05 },
  "Duvar Orta Saha":       { tackleChance: 0.12, interceptionChance: 0.09, defenseStrength: 0.09, midfieldStrength: 0.04 },

  // ═══ ⚙️ MERKEZ ORTA SAHA (5) ═══
  "Motor":                 { tackleChance: 0.06, interceptionChance: 0.06, midfieldStrength: 0.08, possessionBonus: 0.06, shotChance: 0.04 },
  "Truva Atı":             { tackleChance: 0.08, interceptionChance: 0.07, midfieldStrength: 0.07, possessionBonus: 0.05, shotChance: 0.05, goalChance: 0.04 },
  "Pas Ustası":            { midfieldStrength: 0.09, possessionBonus: 0.08, assistChance: 0.07 },
  "Box-to-Box":            { tackleChance: 0.06, interceptionChance: 0.05, midfieldStrength: 0.08, possessionBonus: 0.06, shotChance: 0.05, goalChance: 0.05, attackStrength: 0.03 },
  "Tempo Kontrolcüsü":     { midfieldStrength: 0.08, possessionBonus: 0.07, assistChance: 0.05 },

  // ═══ 🎨 OFANSİF ORTA SAHA (4) ═══
  "Playmaker":             { midfieldStrength: 0.08, attackStrength: 0.05, assistChance: 0.12, possessionBonus: 0.07, shotChance: 0.04 },
  "Numara 10":             { midfieldStrength: 0.05, attackStrength: 0.08, assistChance: 0.10, shotChance: 0.08, goalChance: 0.12, possessionBonus: 0.05 },
  "Yaratıcı":              { midfieldStrength: 0.06, attackStrength: 0.06, assistChance: 0.11, possessionBonus: 0.06, shotChance: 0.05 },
  "Oyun Kurucu":           { midfieldStrength: 0.08, attackStrength: 0.04, assistChance: 0.09, possessionBonus: 0.07, shotChance: 0.03 },

  // ═══ 🏃 KANAT (5) ═══
  "Kanat":                 { attackStrength: 0.07, assistChance: 0.10, shotChance: 0.06, possessionBonus: 0.04 },
  "İçeri Dönen":           { attackStrength: 0.08, assistChance: 0.07, shotChance: 0.09, goalChance: 0.12, possessionBonus: 0.04 },
  "Hızlı Kanat":           { attackStrength: 0.09, assistChance: 0.08, shotChance: 0.10, goalChance: 0.14, possessionBonus: 0.03 },
  "Dribling Ustası":       { attackStrength: 0.07, assistChance: 0.08, shotChance: 0.08, goalChance: 0.12, possessionBonus: 0.06 },

  // ═══ ⚽ FORVET (7) ═══
  "Gol Makinesi":          { attackStrength: 0.08, shotChance: 0.12, goalChance: 0.22 },
  "Bitirici":              { attackStrength: 0.07, shotChance: 0.10, goalChance: 0.19 },
  "Hedef Adam":            { attackStrength: 0.09, shotChance: 0.08, goalChance: 0.14, assistChance: 0.05 },
  "Fırsatçı":              { attackStrength: 0.06, shotChance: 0.11, goalChance: 0.17 },
  "Hızlı Forvet":          { attackStrength: 0.08, shotChance: 0.11, goalChance: 0.15 },
  "İkinci Forvet":         { attackStrength: 0.06, shotChance: 0.08, goalChance: 0.08, assistChance: 0.07, possessionBonus: 0.04 },
  "Yaratıcı Forvet":       { attackStrength: 0.07, shotChance: 0.07, goalChance: 0.10, assistChance: 0.09, possessionBonus: 0.05 },
};

// ════════════════════════════════════════════════════════════════════════════
// 3. ETKİ HESAPLAMA YARDIMCILARI
// ════════════════════════════════════════════════════════════════════════════

/**
 * Bir arketip + overall için belirli bir etki değerini döndürür.
 * Overall'a göre ölçeklenmiş olarak.
 *
 * @param archetype Arketip ismi
 * @param ovr Oyuncu overall
 * @param etkiTipi Hangi etki ("goalChance", "shotChance", vb.)
 * @returns Ölçeklenmiş etki değeri (örn: +0.22 = +%22)
 */
export function getArketipEtki(
  archetype: string | undefined,
  ovr: number,
  etkiTipi: keyof ArketipEtki
): number {
  if (!archetype) return 0;
  const etkiler = ARKETIP_EFFECTS[archetype];
  if (!etkiler) return 0;
  const baseValue = etkiler[etkiTipi];
  if (baseValue === undefined || typeof baseValue !== "number") return 0;
  const factor = getArchetypeOvrFactor(ovr);
  return baseValue * factor;
}

/**
 * Bir oyuncunun tüm arketip etkilerini overall ölçeklemesiyle döndürür.
 * Maç motorunda tek seferde çağrılır, her etki için ayrı çağırmaya gerek kalmaz.
 *
 * @param archetype Arketip ismi
 * @param ovr Oyuncu overall
 * @returns Tüm etki değerleri (overall ölçeklenmiş)
 */
export function getAllArketipEtkiler(
  archetype: string | undefined,
  ovr: number
): ArketipEtki {
  if (!archetype) return {};
  const etkiler = ARKETIP_EFFECTS[archetype];
  if (!etkiler) return {};
  const factor = getArchetypeOvrFactor(ovr);
  const result: ArketipEtki = {};
  for (const key of Object.keys(etkiler) as (keyof ArketipEtki)[]) {
    const val = etkiler[key];
    if (typeof val === "number") {
      (result as any)[key] = val * factor;
    }
  }
  return result;
}

/**
 * Arketipin etki özeti (UI için, metin olarak).
 *
 * Örn: "Gol Makinesi, 85 OVR" →
 *   "Gol Şansı +%28.6, Şut +%13.8, Hücum Gücü +%10.4"
 */
export function getArketipEtkiOzet(archetype: string | undefined, ovr: number): string {
  if (!archetype) return "Arketip yok";
  const etkiler = getAllArketipEtkiler(archetype, ovr);
  const parcalar: string[] = [];
  if (etkiler.goalChance) parcalar.push(`Gol +%${Math.round(etkiler.goalChance * 100)}`);
  if (etkiler.shotChance) parcalar.push(`Şut +%${Math.round(etkiler.shotChance * 100)}`);
  if (etkiler.assistChance) parcalar.push(`Asist +%${Math.round(etkiler.assistChance * 100)}`);
  if (etkiler.tackleChance) parcalar.push(`Müdahele +%${Math.round(etkiler.tackleChance * 100)}`);
  if (etkiler.interceptionChance) parcalar.push(`Kesme +%${Math.round(etkiler.interceptionChance * 100)}`);
  if (etkiler.saveChance) parcalar.push(`Kurtarış +%${Math.round(etkiler.saveChance * 100)}`);
  if (etkiler.possessionBonus) parcalar.push(`Top +%${Math.round(etkiler.possessionBonus * 100)}`);
  if (etkiler.attackStrength) parcalar.push(`Hücum +%${Math.round(etkiler.attackStrength * 100)}`);
  if (etkiler.midfieldStrength) parcalar.push(`Orta Saha +%${Math.round(etkiler.midfieldStrength * 100)}`);
  if (etkiler.defenseStrength) parcalar.push(`Defans +%${Math.round(etkiler.defenseStrength * 100)}`);
  if (etkiler.gkStrength) parcalar.push(`Kaleci +%${Math.round(etkiler.gkStrength * 100)}`);
  return parcalar.length > 0 ? parcalar.join(", ") : "Bu arketip için etki tanımlı değil";
}
