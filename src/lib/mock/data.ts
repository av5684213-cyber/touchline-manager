/**
 * Sahte (kurgusal) Türk futbol verisi.
 * Hiçbir gerçek kulüp/oyuncu adı kullanılmaz.
 * Sadece Türkçe isim yapısı taklit edilir.
 *
 * Player tipi, eski oyunun (siyah-beyaz-fc) maç motoruyla birebir uyumlu —
 * 40+ attribute (teknik/zihinsel/fiziksel + fitness + traits).
 * Mock data üreticisi tüm alanları doldurur.
 */

import { TIER_TEAM_NAMES, TEAM_NAME_BANK } from "@/lib/match/engine/constants";

export type Position =
  | "GK"
  | "CB"
  | "LB"
  | "RB"
  | "LWB"
  | "RWB"
  | "CDM"
  | "CM"
  | "CAM"
  | "LM"
  | "RM"
  | "LW"
  | "RW"
  | "CF"
  | "ST";

export type PositionGroup = "GK" | "DEF" | "MID" | "FWD";

export const POSITION_GROUP: Record<Position, PositionGroup> = {
  GK: "GK",
  CB: "DEF",
  LB: "DEF",
  RB: "DEF",
  LWB: "DEF",
  RWB: "DEF",
  CDM: "MID",
  CM: "MID",
  CAM: "MID",
  LM: "MID",
  RM: "MID",
  LW: "FWD",
  RW: "FWD",
  ST: "FWD",
  CF: "FWD",
};

export type Foot = "Left" | "Right" | "Both";

// 🎭 Maç Karakteri — her oyuncunun maç içi performans kişiliği
// Motor bu karaktere göre rating'i modifiye eder
export type MatchCharacter =
  | "stable"          // 🔵 İstikrarlı — her maç 6.5-7.5, sürpriz yok
  | "inconsistent"    // 🟡 İstikrarsız — bir maç 9, diğer 4
  | "big_match"       // 🔥 Büyük Maç — derbi/kupa'da +1.5
  | "closer"          // ⏰ Kapanma Ustası — son 15 dk +1.0
  | "fast_starter"    // 🌅 İlk Yarı Oyuncusu — ilk yarı +1.0, ikinci -0.5
  | "clutch"          // 🧊 Soğukkanlı — penaltıda %95 gol
  | "hot_headed"      // 😤 Sıcak Kanlı — +%30 kart riski
  | "leader"          // 👑 Lider — takım moraline +3
  | "injury_prone"    // 🩹 Sakatlanabilir — +%50 sakatlık riski
  | "super_sub";      // 🪑 Yedek Kulübü — yedekten girince +1.0

export const MATCH_CHARACTERS: { id: MatchCharacter; name: string; icon: string; desc: string }[] = [
  { id: "stable", name: "İstikrarlı", icon: "🔵", desc: "Her maç aynı seviye, sürpriz yok (6.5-7.5)" },
  { id: "inconsistent", name: "İstikrarsız", icon: "🟡", desc: "Bir maç 9, diğer 4 — kumar" },
  { id: "big_match", name: "Büyük Maç Oyuncusu", icon: "🔥", desc: "Derbi/kupa maçında +1.5 rating" },
  { id: "closer", name: "Kapanma Ustası", icon: "⏰", desc: "Son 15 dakikada +1.0 rating" },
  { id: "fast_starter", name: "İlk Yarı Oyuncusu", icon: "🌅", desc: "İlk yarı +1.0, ikinci yarı -0.5" },
  { id: "clutch", name: "Soğukkanlı", icon: "🧊", desc: "Penaltıda %95 gol, kriz anında en iyisi" },
  { id: "hot_headed", name: "Sıcak Kanlı", icon: "😤", desc: "+%30 kart riski, agresif" },
  { id: "leader", name: "Lider", icon: "👑", desc: "Takım moraline +3, saha içi koç" },
  { id: "injury_prone", name: "Sakatlanabilir", icon: "🩹", desc: "+%50 sakatlık riski" },
  { id: "super_sub", name: "Yedek Kulübü", icon: "🪑", desc: "Yedekten girince +1.0, ilk 11'de -0.5" },
];

// ===== 6 temel stat (UI'da hızlı gösterim için, motor da bunları okur) =====
export type PlayerStats = {
  pace: number; // = speed
  shooting: number;
  passing: number;
  defending: number;
  physical: number; // = power
  dribbling: number;
};

/**
 * Player — eski oyunla birebir uyumlu 40+ attribute.
 * Motorun okuduğu tüm alanlar (zorunlu + opsiyonel) burada.
 */
export type Player = {
  // ── Temel kimlik ────────────────────────────────────────
  id: string;
  firstName: string;
  lastName: string;
  name: string; // "Ad Soyad" — motor bunu kullanır
  position: PositionGroup; // motor beklediği alan (geniş grup)
  specificPosition: Position; // spesifik mevki
  secondaryPositions?: Position[];
  age: number;
  potential: number;
  hidden_potential: number;
  rating: number; // 0-100 (OVR, motor beklediği format)
  formRating: number; // 0-10 (UI için ondalık form puanı)
  nationality: "TR" | "foreign";
  nation: string; // ülke adı
  foot: Foot;
  preferred_foot?: Foot;
  height?: number;
  weight?: number;
  market_value: number; // € (motor bu ismi kullanır)
  marketValue: number; // € (UI bu ismi kullanır — alias)
  salary: number; // haftalık ücret (motor)
  weeklyWage: number; // haftalık ücret (UI — alias)

  // ── 6 temel stat (motor + UI) ──────────────────────────
  defending: number;
  passing: number;
  shooting: number;
  speed: number;
  power: number;
  vision?: number;
  control?: number;
  stamina?: number;
  heading?: number;
  goalkeeping?: number;
  stats: PlayerStats; // UI için özet (pace/shooting/passing/defending/physical/dribbling)

  // ── Teknik (9) ─────────────────────────────────────────
  finishing?: number;
  dribbling?: number;
  firstTouch?: number;
  crossing?: number;
  marking?: number;
  tackling?: number;
  technique?: number;
  longShots?: number;
  offTheBall?: number;

  // ── Zihinsel (12) ──────────────────────────────────────
  aggression?: number;
  bravery?: number;
  workRate?: number;
  decisions?: number;
  determination?: number;
  concentration?: number;
  leadership?: number;
  anticipation?: number;
  flair?: number;
  positioning?: number;
  composure?: number;
  teamwork?: number;

  // ── Fiziksel (7) ───────────────────────────────────────
  agility?: number;
  balance?: number;
  strength?: number;
  acceleration?: number;
  jumping?: number;
  leftFoot?: number;
  rightFoot?: number;

  // ── Fitness/form/moral ─────────────────────────────────
  cond: number; // 0-100 (kondisyon — motor)
  condition: number; // 0-100 (UI — alias)
  form: number; // 0-100 (motor)
  morale: number; // 0-100
  confidence: number; // 0-100
  chemistry?: number;

  // ── Traits/style ───────────────────────────────────────
  traits: string[];
  negTraits?: string[];
  personalityTraits?: string[];
  playStyle?: string;
  archetype?: string;
  special_role?: string | null;

  // ── Maç istatistikleri ─────────────────────────────────
  goals: number;
  assists: number;
  saves: number;
  appearances: number;
  motmAwards?: number; // Maçın Adamı ödül sayısı
  match_ratings?: number[];
  last_match_rating?: number;
  // 🎭 Maç Karakteri — her oyuncunun maç içi performans kişiliği
  // Motor bu karaktere göre rating'i modifiye eder
  match_character?: MatchCharacter;

  // ── Kariyer sezon geçmişi ──────────────────────────────
  seasonHistory?: SeasonStat[];

  // ── Detaylı sezon istatistikleri (maç sonrası accumule edilir) ──
  seasonStats?: {
    shots: number;
    shotsOnTarget: number;
    shotsOffTarget?: number;
    shotsBlocked?: number;
    passes: number;
    passesCompleted: number;
    keyPasses: number;
    crosses: number;
    crossesCompleted: number;
    longBalls: number;
    longBallsCompleted: number;
    tackles: number;
    interceptions: number;
    clearances: number;
    fouls: number;
    fouled: number;
    yellowCards: number;
    redCards: number;
    offsides: number;
    dribblesAttempted: number;
    dribblesCompleted: number;
    duels: number;
    duelsWon: number;
    errors: number;
    minutesPlayed: number;
    // Gol türü dağılımı
    goalsRight: number;
    goalsLeft: number;
    goalsHead: number;
    goalsPenalty: number;
    goalsFreekick: number;
  };

  // ── Sakatlık geçmişi ───────────────────────────────────
  injury_history?: { date: string; duration_days: number; type: string }[];

  // ── Transfer/durum ─────────────────────────────────────
  is_for_sale?: boolean;
  sale_price?: number;
  is_free_agent?: boolean;
  isResting?: boolean;
  suspended_until?: string;
  is_injured?: boolean;
  injury?: {
    type: "light" | "chronic" | "risky";
    remaining_days: number;
    severity: number;
  };
};

// ── Kariyer sezon istatistiği ──────────────────────────
export type SeasonStat = {
  season: string;        // "2024/25"
  club: string;          // kulüp adı
  leagueTier: number;    // 1=Süper Lig ... 4=3. Lig
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  avgRating: number;     // 0-10
  minutesPlayed: number;
  // Gol türü dağılımı (toplam = goals)
  goalsRight?: number;     // sağ ayak
  goalsLeft?: number;      // sol ayak
  goalsHead?: number;      // kafa
  goalsPenalty?: number;   // penaltıdan
  goalsFreekick?: number;  // serbest vuruştan
};

export type LeagueTier = 1 | 2 | 3 | 4;
export type Department = 1 | 2 | 3 | 4;

export type Team = {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  leagueTier: LeagueTier; // 1=Süper Lig, 2=1. Lig, 3=2. Lig, 4=3. Lig
  department: Department; // 1-4 (her lig 4 departmana bölünmüş)
  players: Player[];
  budget: number;
  stadiumCapacity: number;
  stadiumName: string;
  is_bot?: boolean;
  facilities?: any; // P0 FIX: Bot takımları için facility levels
};

export const LEAGUE_NAMES: Record<LeagueTier, { tr: string; en: string }> = {
  1: { tr: "Süper Lig", en: "Super Lig" },
  2: { tr: "1. Lig", en: "1. Lig" },
  3: { tr: "2. Lig", en: "2. Lig" },
  4: { tr: "3. Lig", en: "3. Lig" },
};

// ===== Sahte takım isimleri (kurgusal, hiçbiri gerçek değil) =====
const FICTIONAL_CLUB_NAMES: { name: string; short: string; c1: string; c2: string }[] = [
  { name: "Yeşilvadispor", short: "YVS", c1: "#1a3a2a", c2: "#f5f5f0" },
  { name: "Yıldıztepespor", short: "YTP", c1: "#1f2937", c2: "#fbbf24" },
  { name: "Maviderespor", short: "MDR", c1: "#1e3a8a", c2: "#ffffff" },
  { name: "Defnespor", short: "DEF", c1: "#7c2d12", c2: "#fef3c7" },
  { name: "Çamlıkspor", short: "CLK", c1: "#065f46", c2: "#d1fae5" },
  { name: "Pınarbaşıspor", short: "PNB", c1: "#0e7490", c2: "#cffafe" },
  { name: "Hisarspor", short: "HIS", c1: "#4c1d95", c2: "#ede9fe" },
  { name: "Toroslarspor", short: "TRS", c1: "#92400e", c2: "#fff7ed" },
  { name: "Yeditepespor", short: "YED", c1: "#14532d", c2: "#bbf7d0" },
  { name: "Çınarspor", short: "CNR", c1: "#7f1d1d", c2: "#fee2e2" },
  { name: "Halispor", short: "HAL", c1: "#0c4a6e", c2: "#e0f2fe" },
  { name: "Şehzadespor", short: "SHZ", c1: "#581c87", c2: "#f3e8ff" },
  { name: "Boğazspor", short: "BGZ", c1: "#134e4a", c2: "#ccfbf1" },
  { name: "Efespor", short: "EFS", c1: "#854d0e", c2: "#fef9c3" },
  { name: "Zaferpınarspor", short: "ZFP", c1: "#9f1239", c2: "#ffe4e6" },
  { name: "Berrakspor", short: "BRK", c1: "#155e75", c2: "#ecfeff" },
  { name: "Kaynarspor", short: "KYN", c1: "#9a3412", c2: "#fff7ed" },
  { name: "Anadolu Yıldızları", short: "ANY", c1: "#1a3a2a", c2: "#fbbf24" },
];

// ===== Sahte Türk isim havuzu =====
export const FIRST_NAMES_TR = [
  "Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "Hasan", "İbrahim", "Osman",
  "Yusuf", "Murat", "Emre", "Burak", "Cemal", "Kerem", "Deniz", "Serkan",
  "Barış", "Volkan", "Tolga", "Onur", "Alper", "Berkay", "Cenk", "Doğan",
  "Eren", "Furkan", "Görkem", "Halil", "İlyas", "Kaan", "Levent", "Mert",
  "Oğuz", "Polat", "Rıdvan", "Selim", "Taha", "Umut", "Yiğit", "Batu",
  "Sinan", "Koray", "Tuncay", "Şahan", "Ergün", "Erdem", "Akın", "Bora",
  "Caner", "Efe", "Yakup", "Bayram", "Recep", "Şükrü", "Galip", "Tarık",
  "Soner", "Taner", "Yalçın", "Eray", "Bedirhan", "Çağlar", "Çağatay",
];

export const LAST_NAMES_TR = [
  "Yıldız", "Demir", "Şahin", "Çelik", "Yılmaz", "Aydın", "Öztürk", "Arslan",
  "Doğan", "Kılıç", "Aslan", "Çetin", "Kara", "Koç", "Kurt", "Özdemir",
  "Şimşek", "Polat", "Korkmaz", "Çakır", "Erdoğan", "Güneş", "Aksoy", "Bulut",
  "Tunç", "Aktaş", "Yavuz", "Akın", "Bilgin", "Taş", "Karaca", "Akdoğan",
  "Türk", "Kaya", "Erdem", "Güler", "Yaşar", "Altun", "Toprak", "Soylu",
  "Turan", "Kaplan", "Acar", "Baysal", "Erol", "Eren", "Gökçe", "Köse",
  "Özkan", "Sancak", "Yalçın", "Yücel", "Ateş", "Bal", "Cangöz", "Demirci",
  "Ergin", "Gazi", "Kahraman", "Mumcu", "Salman", "Türkmen", "Ünal", "Yıldırım",
];

// Foreign first names (for variety, marked as foreign)
export const FIRST_NAMES_FOREIGN = [
  "Carlos", "Diego", "Marco", "Luca", "Andrei", "Stefan", "Nikola", "Pablo",
  "Mateo", "Ivan", "Lucas", "Bruno", "Felipe", "Rafael", "Hassan", "Youssef",
  "Amine", "Omar", "Karim", "Serge", "Dmitri", "Vlad", "Anton", "Niko",
];

// ===== Helpers =====
let _id = 0;
function nextId(prefix: string) {
  _id += 1;
  return `${prefix}_${_id.toString(36)}`;
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Pozisyona göre Türkçe arketipler
export const ARKETIPLER: Record<string, string[]> = {
  GK: ["Refleks Canavarı", "Güvenli Eller", "Süpürücü Kaleci", "Penaltı Uzmanı", "Büyük Maç Kalecisi"],
  CB: ["Duvar", "Lider Stoper", "Top Çıkan Stoper", "Hava Hakimi", "Baskı Ustası", "Kale Gibi"],
  LB: ["Kanat Beki", "Hücumcu Bek", "Defansif Bek", "Ters Bek"],
  RB: ["Kanat Beki", "Hücumcu Bek", "Defansif Bek", "Ters Bek"],
  LWB: ["Kanat Beki", "Ofansif Bek"],
  RWB: ["Kanat Beki", "Ofansif Bek"],
  CDM: ["Yıkıcı", "Regista", "Ekran Oyuncusu", "Duvar Orta Saha"],
  CM: ["Motor", "Truva Atı", "Pas Ustası", "Box-to-Box", "Tempo Kontrolcüsü"],
  CAM: ["Playmaker", "Numara 10", "Yaratıcı", "Oyun Kurucu"],
  LM: ["Kanat", "İçeri Dönen"],
  RM: ["Kanat", "İçeri Dönen"],
  LW: ["Hızlı Kanat", "İçeri Dönen", "Dribling Ustası"],
  RW: ["Hızlı Kanat", "İçeri Dönen", "Dribling Ustası"],
  ST: ["Gol Makinesi", "Bitirici", "Hedef Adam", "Fırsatçı", "Hızlı Forvet"],
  CF: ["İkinci Forvet", "Yaratıcı Forvet", "Hedef Adam"],
};

// P0 FIX: Arketip → imza stat eşleştirme tablosu
// Her arketip için hangi statların yüksek olması gerektiğini tanımlar
const ARKETIP_SIGNATURE_STATS: Record<string, string[]> = {
  // Kaleci
  "Refleks Canavarı": ["reflexes", "agility"],
  "Güvenli Eller": ["handling", "concentration"],
  "Süpürücü Kaleci": ["acceleration", "decisions"],
  "Penaltı Uzmanı": ["reflexes", "composure"],
  "Büyük Maç Kalecisi": ["reflexes", "leadership"],
  // Defans
  "Duvar": ["tackling", "marking"],
  "Lider Stoper": ["leadership", "positioning"],
  "Top Çıkan Stoper": ["passing", "longShots"],
  "Hava Hakimi": ["heading", "jumping"],
  "Baskı Ustası": ["aggression", "workRate"],
  "Kale Gibi": ["tackling", "positioning"],
  "Kanat Beki": ["crossing", "stamina"],
  "Hücumcu Bek": ["crossing", "acceleration"],
  "Defansif Bek": ["marking", "tackling"],
  "Ters Bek": ["crossing", "dribbling"],
  "Ofansif Bek": ["crossing", "technique"],
  // Orta Saha
  "Yıkıcı": ["tackling", "aggression"],
  "Regista": ["passing", "vision"],
  "Ekran Oyuncusu": ["positioning", "decisions"],
  "Duvar Orta Saha": ["tackling", "strength"],
  "Motor": ["stamina", "workRate"],
  "Truva Atı": ["tackling", "passing"],
  "Pas Ustası": ["passing", "technique"],
  "Box-to-Box": ["stamina", "passing"],
  "Tempo Kontrolcüsü": ["passing", "decisions"],
  // Ofansif Orta Saha
  "Playmaker": ["vision", "passing"],
  "Numara 10": ["flair", "technique"],
  "Yaratıcı": ["vision", "dribbling"],
  "Oyun Kurucu": ["passing", "decisions"],
  // Kanat
  "Kanat": ["crossing", "pace"],
  "İçeri Dönen": ["dribbling", "finishing"],
  "Hızlı Kanat": ["pace", "acceleration"],
  "Dribling Ustası": ["dribbling", "flair"],
  // Forvet
  "Gol Makinesi": ["finishing", "composure"],
  "Bitirici": ["finishing", "offTheBall"],
  "Hedef Adam": ["heading", "strength"],
  "Fırsatçı": ["offTheBall", "anticipation"],
  "Hızlı Forvet": ["pace", "finishing"],
  "İkinci Forvet": ["dribbling", "passing"],
  "Yaratıcı Forvet": ["vision", "dribbling"],
};

/**
 * P0 FIX: Statlara göre en uygun arketibi seç — körü körüne random DEĞİL
 * Her arketip için imza statların ortalama değerini hesapla,
 * en yüksek ortalama veren arketibi ağırlıklı rastgelelikle seç.
 */
export function pickArketipByStats(pos: string, playerStats: Record<string, number>): string {
  const list = ARKETIPLER[pos] ?? ARKETIPLER.CM;

  // Her arketip için imza stat ortalaması hesapla
  const scores = list.map(arketip => {
    const sigStats = ARKETIP_SIGNATURE_STATS[arketip] ?? [];
    if (sigStats.length === 0) return { arketip, score: 50 };
    const vals = sigStats.map(s => playerStats[s] ?? 50);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { arketip, score: avg };
  });

  // Ağırlıklı rastgele seçim — yüksek skorlu arketip 3x daha şanslı
  const weights = scores.map(s => Math.max(1, s.score - 30));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < scores.length; i++) {
    r -= weights[i];
    if (r <= 0) return scores[i].arketip;
  }
  return scores[scores.length - 1].arketip;
}

function pickArketip(pos: string): string {
  const list = ARKETIPLER[pos] ?? ARKETIPLER.CM;
  return list[Math.floor(Math.random() * list.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

// ===== Position-required roster shape (23 players, sahte 1. Lig kalitesi) =====
const ROSTER_SHAPE: { pos: Position; count: number; minOvr: number; maxOvr: number }[] = [
  { pos: "GK", count: 3, minOvr: 60, maxOvr: 74 },
  { pos: "CB", count: 4, minOvr: 62, maxOvr: 76 },
  { pos: "LB", count: 2, minOvr: 60, maxOvr: 73 },
  { pos: "RB", count: 2, minOvr: 60, maxOvr: 73 },
  { pos: "CDM", count: 2, minOvr: 63, maxOvr: 75 },
  { pos: "CM", count: 3, minOvr: 64, maxOvr: 78 },
  { pos: "CAM", count: 2, minOvr: 63, maxOvr: 77 },
  { pos: "LW", count: 2, minOvr: 62, maxOvr: 76 },
  { pos: "RW", count: 1, minOvr: 62, maxOvr: 76 },
  { pos: "ST", count: 2, minOvr: 64, maxOvr: 79 },
];

function generateStats(pos: Position, ovr: number): PlayerStats {
  const base = ovr;
  const spread = (n: number, lo = 12, hi = 22) =>
    Math.max(30, Math.min(99, n + rand(-hi, -lo)));
  const boost = (n: number, lo = 5, hi = 18) =>
    Math.max(30, Math.min(99, n + rand(lo, hi)));

  switch (pos) {
    case "GK":
      return {
        pace: spread(base, 15, 25),
        shooting: spread(base, 35, 45),
        passing: spread(base, 10, 18),
        defending: boost(base, 5, 15),
        physical: boost(base, 0, 10),
        dribbling: spread(base, 5, 15),
      };
    case "CB":
    case "LB":
    case "RB":
      return {
        pace: pos === "CB" ? spread(base, 5, 15) : boost(base, 0, 10),
        shooting: spread(base, 25, 35),
        passing: spread(base, 5, 15),
        defending: boost(base, 8, 18),
        physical: boost(base, 5, 15),
        dribbling: spread(base, 10, 20),
      };
    case "CDM":
      return {
        pace: spread(base, 0, 10),
        shooting: spread(base, 15, 25),
        passing: boost(base, 0, 10),
        defending: boost(base, 5, 15),
        physical: boost(base, 0, 10),
        dribbling: spread(base, 0, 10),
      };
    case "CM":
      return {
        pace: spread(base, 0, 10),
        shooting: spread(base, 5, 15),
        passing: boost(base, 8, 18),
        defending: spread(base, 0, 10),
        physical: boost(base, 0, 8),
        dribbling: boost(base, 0, 10),
      };
    case "CAM":
      return {
        pace: spread(base, 0, 8),
        shooting: boost(base, 0, 10),
        passing: boost(base, 8, 18),
        defending: spread(base, 15, 25),
        physical: spread(base, 5, 15),
        dribbling: boost(base, 8, 18),
      };
    case "LW":
    case "RW":
      return {
        pace: boost(base, 8, 18),
        shooting: boost(base, 0, 10),
        passing: spread(base, 0, 8),
        defending: spread(base, 25, 35),
        physical: spread(base, 5, 15),
        dribbling: boost(base, 8, 18),
      };
    case "ST":
    case "CF":
      return {
        pace: boost(base, 5, 15),
        shooting: boost(base, 10, 20),
        passing: spread(base, 5, 15),
        defending: spread(base, 30, 40),
        physical: boost(base, 5, 15),
        dribbling: boost(base, 0, 10),
      };
    case "LWB":
    case "RWB":
      return {
        pace: boost(base, 8, 18),
        shooting: spread(base, 20, 30),
        passing: spread(base, 5, 15),
        defending: boost(base, 5, 15),
        physical: spread(base, 5, 15),
        dribbling: spread(base, 0, 10),
      };
    case "LM":
    case "RM":
      return {
        pace: boost(base, 5, 15),
        shooting: spread(base, 10, 20),
        passing: boost(base, 5, 15),
        defending: spread(base, 15, 25),
        physical: spread(base, 5, 15),
        dribbling: boost(base, 5, 15),
      };
    default:
      return {
        pace: base,
        shooting: base,
        passing: base,
        defending: base,
        physical: base,
        dribbling: base,
      };
  }
}

export function generatePlayer(pos: Position, ovrRange: { min: number; max: number }): Player {
  const ovr = rand(ovrRange.min, ovrRange.max);
  const isForeign = Math.random() < 0.25;
  const first = isForeign ? pick(FIRST_NAMES_FOREIGN) : pick(FIRST_NAMES_TR);
  const last = pick(LAST_NAMES_TR);
  const age = rand(17, 36);
  const stats = generateStats(pos, ovr);
  const goals = pos === "GK" ? 0 : rand(0, pos.startsWith("ST") || pos === "CF" ? 12 : 6);
  const assists = pos === "GK" ? 0 : rand(0, 8);
  const saves = pos === "GK" ? rand(10, 60) : 0;
  const appearancesVal = rand(8, 28);
  const nation = isForeign ? "Yabancı" : "Türkiye";
  const foot: Foot = Math.random() < 0.7 ? "Right" : Math.random() < 0.5 ? "Left" : "Both";
  // P0 FIX: Piyasa değeri — yaş ve potansiyel hesaba kat
  // Peak yaş 24-29 → prim, 30+ → düşüş, 17-21 → potansiyel primi
  const ageMult = age <= 21 ? 1.4 : age <= 23 ? 1.2 : age >= 24 && age <= 29 ? 1.0 : age >= 30 && age <= 32 ? 0.7 : age >= 33 ? 0.45 : 0.85;
  // Potansiyel farkı primi (potential - rating büyükse → wonderkid primi)
  const potentialDiff = (ovr + rand(0, 15)) - ovr;
  const potentialMult = potentialDiff >= 10 ? 1.5 : potentialDiff >= 5 ? 1.2 : 1.0;
  const marketValue = Math.round(ovr * rand(80_000, 180_000) * ageMult * potentialMult);
  const weeklyWage = ovr * rand(800, 2200);

  // Pozisyon grubu
  const group = POSITION_GROUP[pos];

  // 40+ attribute üret — pozisyona göre ağırlıklı
  const base = ovr;
  const spread = (n: number, lo = 8, hi = 18) =>
    Math.max(30, Math.min(99, n + rand(-hi, -lo)));
  const boost = (n: number, lo = 4, hi = 14) =>
    Math.max(30, Math.min(99, n + rand(lo, hi)));
  const headingVal = pos === "CB" || pos === "ST" ? boost(base, 5, 12) : spread(base, 5, 15);

  // Traits havuzu — TRAITS_DATA'dan gerçek isimlerle (motor bunları tanır)
  const groupKey = pos === "GK" ? "kaleci" : ["CB", "LB", "RB", "LWB", "RWB"].includes(pos) ? "defans"
    : ["CDM", "CM", "CAM", "LM", "RM"].includes(pos) ? "orta_saha" : "forvet";
  // TRAITS_DATA yapısı: { defans: { pozitif: [], negatif: [] }, ... }
  const traitsByGroup: Record<string, { pozitif: { name: string }[]; negatif: { name: string }[] }> = {
    kaleci: { pozitif: [{ name: "Refleks canavarı" }, { name: "Güvenli eller" }, { name: "1v1 ustası" }, { name: "Hava hakimiyeti" }], negatif: [{ name: "Sektirir" }, { name: "Yavaş refleks" }] },
    defans: { pozitif: [{ name: "Kale gibi" }, { name: "Top kapma uzmanı" }, { name: "Pozisyon ustası" }, { name: "Hava hakimiyeti" }, { name: "Markajcı" }, { name: "Oyun okuyan" }, { name: "Lider stoper" }, { name: "Ofsayt ustası" }, { name: "Soğukkanlı" }, { name: "Dayanıklı" }, { name: "Topla çıkan stoper" }, { name: "Uzun pas ustası" }], negatif: [{ name: "Ağır kalır" }, { name: "Zamanlama hatası" }, { name: "Zayıf markaj" }, { name: "Hava zaafı" }] },
    orta_saha: { pozitif: [{ name: "Oyun kurucu" }, { name: "Top dağıtıcı" }, { name: "Box-to-box" }, { name: "Pres ustası" }, { name: "Top saklayan" }, { name: "Oyun görüşü yüksek" }, { name: "Boşluk bulucu" }, { name: "Tempo kontrolcüsü" }, { name: "Pas arası ustası" }, { name: "Regista" }, { name: "10 numara" }, { name: "Uzaktan şutçu" }], negatif: [{ name: "Top kaybı yapar" }, { name: "Yavaş karar verir" }, { name: "Savunmaya yardım etmez" }, { name: "Pas hatası yapar" }] },
    forvet: { pozitif: [{ name: "Bitirici" }, { name: "Pozisyoncu" }, { name: "Hızlı forvet" }, { name: "Fiziksel santrafor" }, { name: "Fırsatçı" }, { name: "Boşluk avcısı" }, { name: "Ofsayt ustası" }, { name: "Gol makinesi" }, { name: "Sahte 9" }, { name: "Kontra canavarı" }], negatif: [{ name: "Beceriksiz bitirici" }, { name: "Ofsayta düşer" }, { name: "Bencil" }, { name: "Kararsız" }] },
  };
  const groupTraits = traitsByGroup[groupKey] ?? traitsByGroup.defans;
  const POSITIVE_TRAITS = groupTraits.pozitif.map((t) => t.name);
  const NEGATIVE_TRAITS = groupTraits.negatif.map((t) => t.name);
  const PERSONALITY_TRAITS = ["Profesyonel", "Disiplinli", "Çalışkan", "Hırslı", "Kazanan karakter", "Takım oyuncusu", "Mentor", "Lider", "Soğukkanlı", "Büyük maç oyuncusu"];

  // Pozisyona göre teknik attribute vurguları
  const technical = {
    finishing: pos === "ST" || pos === "CF" ? boost(base, 8, 18) : spread(base, 15, 25),
    dribbling: stats.dribbling,
    firstTouch: pos === "CAM" || pos === "CF" ? boost(base, 5, 15) : spread(base, 5, 15),
    crossing: pos === "LB" || pos === "RB" || pos === "LW" || pos === "RW" ? boost(base, 5, 15) : spread(base, 10, 20),
    marking: pos === "CB" || pos === "LB" || pos === "RB" ? boost(base, 5, 15) : spread(base, 15, 25),
    tackling: pos === "CB" || pos === "CDM" ? boost(base, 5, 15) : spread(base, 10, 20),
    technique: pos === "CAM" || pos === "LW" || pos === "RW" ? boost(base, 5, 15) : spread(base, 5, 15),
    longShots: pos === "CAM" || pos === "CM" ? boost(base, 3, 12) : spread(base, 10, 20),
    offTheBall: pos === "ST" || pos === "CF" ? boost(base, 5, 15) : spread(base, 5, 15),
  };

  const mental = {
    aggression: pos === "CB" || pos === "CDM" ? boost(base, 5, 15) : spread(base, 8, 18),
    bravery: rand(40, 80),
    workRate: rand(45, 85),
    decisions: pos === "CAM" || pos === "CM" ? boost(base, 5, 12) : spread(base, 5, 15),
    determination: rand(50, 85),
    concentration: pos === "GK" || pos === "CB" ? boost(base, 5, 12) : spread(base, 5, 15),
    leadership: rand(30, 75),
    anticipation: pos === "ST" || pos === "GK" ? boost(base, 5, 12) : spread(base, 5, 15),
    flair: pos === "CAM" || pos === "LW" || pos === "RW" ? boost(base, 8, 18) : spread(base, 10, 20),
    positioning: pos === "CB" || pos === "GK" ? boost(base, 5, 12) : spread(base, 5, 15),
    composure: pos === "ST" || pos === "CAM" ? boost(base, 5, 12) : spread(base, 5, 15),
    teamwork: rand(50, 85),
  };

  const physical = {
    agility: pos === "LW" || pos === "RW" || pos === "CAM" ? boost(base, 5, 12) : spread(base, 5, 15),
    balance: rand(50, 85),
    strength: pos === "CB" || pos === "ST" ? boost(base, 5, 12) : spread(base, 5, 15),
    acceleration: stats.pace,
    jumping: pos === "CB" || pos === "GK" ? boost(base, 5, 12) : spread(base, 5, 15),
    leftFoot: foot === "Left" ? rand(75, 95) : foot === "Both" ? rand(60, 80) : rand(30, 50),
    rightFoot: foot === "Right" ? rand(75, 95) : foot === "Both" ? rand(60, 80) : rand(30, 50),
  };

  const leftFootVal = foot === "Left" ? rand(75, 95) : foot === "Both" ? rand(60, 80) : rand(30, 50);
  const rightFootVal = foot === "Right" ? rand(75, 95) : foot === "Both" ? rand(60, 80) : rand(30, 50);

  // P0 FIX: Arketipi statlarla uyumlu seç — körü körüne random DEĞİL
  // Önce tüm statları topla, sonra imza statlarına göre en uygun arketibi seç
  const allStats: Record<string, number> = {
    ...stats,
    ...technical,
    ...mental,
    ...physical,
    heading: headingVal,
    stamina: physical.agility, // approximation
    vision: mental.decisions, // approximation
    reflexes: pos === "GK" ? boost(base, 8, 18) : spread(base, 20, 30),
    handling: pos === "GK" ? boost(base, 5, 15) : spread(base, 20, 30),
    pace: stats.pace,
  };
  const archetypeVal = pickArketipByStats(pos, allStats);

  const traits = pickN(POSITIVE_TRAITS, rand(1, 3));
  const negTraits = Math.random() < 0.3 ? pickN(NEGATIVE_TRAITS, 1) : [];

  return {
    id: nextId("p"),
    firstName: first,
    lastName: last,
    name: `${first} ${last}`,
    position: group,
    specificPosition: pos,
    age,
    potential: ovr + rand(0, 15),
    hidden_potential: ovr + rand(0, 20),
    rating: ovr,
    formRating: Math.round((ovr / 10 + (Math.random() * 2 - 1)) * 10) / 10,
    nationality: isForeign ? "foreign" : "TR",
    nation,
    foot,
    preferred_foot: foot,
    height: rand(170, 195),
    weight: rand(65, 90),
    market_value: marketValue,
    marketValue,
    salary: weeklyWage,
    weeklyWage,

    defending: stats.defending,
    passing: stats.passing,
    shooting: stats.shooting,
    speed: stats.pace,
    power: stats.physical,
    vision: pos === "CAM" || pos === "CM" ? boost(base, 5, 12) : spread(base, 5, 15),
    control: stats.dribbling,
    stamina: rand(50, 90),
    heading: headingVal,
    goalkeeping: pos === "GK" ? boost(base, 8, 18) : spread(base, 40, 50),
    stats,
    ...technical,
    ...mental,
    ...physical,

    cond: rand(70, 100),
    condition: rand(70, 100),
    form: rand(60, 90),
    morale: rand(55, 90),
    confidence: rand(50, 85),
    chemistry: rand(60, 85),

    traits,
    negTraits,
    personalityTraits: pickN(PERSONALITY_TRAITS, rand(0, 2)),
    playStyle: pick(["Gegenpressing", "Tiki-Taka", "Catenaccio", "Counter-Attack", "Wing Play"]),
    archetype: archetypeVal,
    special_role: null,
    // 🎭 Maç karakteri — her oyuncuya rastgele ata
    // Ağırlıklı: stable en yaygın, inconsistent ikinci, diğerleri daha az
    match_character: (() => {
      const r = Math.random();
      if (r < 0.35) return "stable" as const;
      if (r < 0.55) return "inconsistent" as const;
      if (r < 0.65) return "big_match" as const;
      if (r < 0.72) return "closer" as const;
      if (r < 0.78) return "fast_starter" as const;
      if (r < 0.84) return "clutch" as const;
      if (r < 0.89) return "hot_headed" as const;
      if (r < 0.94) return "leader" as const;
      if (r < 0.97) return "injury_prone" as const;
      return "super_sub" as const;
    })(),

    goals,
    assists,
    saves,
    appearances: appearancesVal,
    match_ratings: Array.from({ length: rand(0, 10) }, () => rand(50, 90) / 10),
    last_match_rating: rand(50, 90) / 10,

    seasonHistory: generateSeasonHistory(age, pos, ovr, goals, assists, appearancesVal, foot, headingVal, rightFootVal, leftFootVal, archetypeVal),

    is_for_sale: false,
    isResting: false,
    is_injured: false,
  };
}

// Oyun içi takım havuzu (TIER_TEAM_NAMES + TEAM_NAME_BANK)
// Kariyer geçmişi bu takımlardan rastgele seçilir
const GAME_CLUBS: string[] = Array.from(new Set([
  ...TIER_TEAM_NAMES[1], ...TIER_TEAM_NAMES[2],
  ...TIER_TEAM_NAMES[3], ...TIER_TEAM_NAMES[4],
  ...TEAM_NAME_BANK,
]));

// Arketip → gol dağılım modifier'ları
// Baz ağırlıklar (right/left/head) arketipe göre kayar
const ARKETIP_GOAL_MODIFIERS: Record<string, { right: number; left: number; head: number; goals: number }> = {
  // Forvet arketipleri
  "Gol Makinesi":   { right: 0.45, left: 0.40, head: 0.15, goals: 1.30 },
  "Bitirici":       { right: 0.50, left: 0.35, head: 0.15, goals: 1.20 },
  "Hedef Adam":     { right: 0.30, left: 0.25, head: 0.45, goals: 1.10 },
  "Fırsatçı":       { right: 0.40, left: 0.35, head: 0.25, goals: 1.15 },
  "Hızlı Forvet":   { right: 0.50, left: 0.40, head: 0.10, goals: 1.10 },
  "İkinci Forvet":  { right: 0.40, left: 0.40, head: 0.20, goals: 0.95 },
  "Yaratıcı Forvet":{ right: 0.40, left: 0.40, head: 0.20, goals: 0.85 },
  // Kanat arketipleri
  "Hızlı Kanat":    { right: 0.55, left: 0.35, head: 0.10, goals: 0.70 },
  "İçeri Dönen":    { right: 0.50, left: 0.40, head: 0.10, goals: 0.85 },
  "Dribling Ustası":{ right: 0.45, left: 0.40, head: 0.15, goals: 0.80 },
  "Kanat":          { right: 0.50, left: 0.35, head: 0.15, goals: 0.65 },
  // Orta saha arketipleri
  "Playmaker":      { right: 0.50, left: 0.35, head: 0.15, goals: 0.50 },
  "Numara 10":      { right: 0.45, left: 0.40, head: 0.15, goals: 0.70 },
  "Yaratıcı":       { right: 0.50, left: 0.35, head: 0.15, goals: 0.55 },
  "Oyun Kurucu":    { right: 0.50, left: 0.35, head: 0.15, goals: 0.45 },
  "Motor":          { right: 0.50, left: 0.30, head: 0.20, goals: 0.55 },
  "Truva Atı":      { right: 0.45, left: 0.30, head: 0.25, goals: 0.65 },
  "Pas Ustası":     { right: 0.55, left: 0.30, head: 0.15, goals: 0.40 },
  "Box-to-Box":     { right: 0.45, left: 0.35, head: 0.20, goals: 0.60 },
  "Tempo Kontrolcüsü":{ right: 0.55, left: 0.30, head: 0.15, goals: 0.45 },
  "Yıkıcı":         { right: 0.45, left: 0.30, head: 0.25, goals: 0.30 },
  "Regista":        { right: 0.55, left: 0.30, head: 0.15, goals: 0.35 },
  "Ekran Oyuncusu": { right: 0.45, left: 0.35, head: 0.20, goals: 0.40 },
  "Duvar Orta Saha":{ right: 0.45, left: 0.30, head: 0.25, goals: 0.30 },
  // Defans arketipleri
  "Duvar":          { right: 0.40, left: 0.25, head: 0.35, goals: 0.25 },
  "Lider Stoper":   { right: 0.40, left: 0.25, head: 0.35, goals: 0.30 },
  "Top Çıkan Stoper":{ right: 0.45, left: 0.30, head: 0.25, goals: 0.35 },
  "Hava Hakimi":    { right: 0.30, left: 0.20, head: 0.50, goals: 0.40 },
  "Baskı Ustası":   { right: 0.45, left: 0.30, head: 0.25, goals: 0.25 },
  "Kale Gibi":      { right: 0.45, left: 0.30, head: 0.25, goals: 0.20 },
  "Kanat Beki":     { right: 0.50, left: 0.35, head: 0.15, goals: 0.30 },
  "Hücumcu Bek":    { right: 0.50, left: 0.35, head: 0.15, goals: 0.45 },
  "Defansif Bek":   { right: 0.50, left: 0.30, head: 0.20, goals: 0.20 },
  "Ters Bek":       { right: 0.45, left: 0.40, head: 0.15, goals: 0.35 },
  "Ofansif Bek":    { right: 0.50, left: 0.35, head: 0.15, goals: 0.40 },
  // Kaleci
  "Refleks Canavarı": { right: 0, left: 0, head: 0, goals: 0 },
  "Güvenli Eller":    { right: 0, left: 0, head: 0, goals: 0 },
  "Süpürücü Kaleci":  { right: 0, left: 0, head: 0, goals: 0 },
  "Penaltı Uzmanı":   { right: 0, left: 0, head: 0, goals: 0 },
  "Büyük Maç Kalecisi":{ right: 0, left: 0, head: 0, goals: 0 },
};

function generateSeasonHistory(
  age: number,
  pos: string,
  ovr: number,
  currentGoals: number,
  currentAssists: number,
  currentApps: number,
  foot: Foot = "Right",
  headingVal: number = 50,
  rightFootStat: number = 50,
  leftFootStat: number = 30,
  archetype: string = ""
): SeasonStat[] {
  // Kariyer başlangıcı: 17 yaşında
  const careerStartAge = 17;
  if (age <= careerStartAge) return [];

  const seasons: SeasonStat[] = [];
  const totalSeasons = Math.min(age - careerStartAge, 18); // max 18 sezon
  const currentYear = new Date().getFullYear();

  // OVR'e göre lig seviyesi (genç yaşta daha alt lig)
  const baseTier = ovr >= 75 ? 1 : ovr >= 65 ? 2 : ovr >= 55 ? 3 : 4;

  // ===== Gol türü ağırlıkları — arketip + foot + rightFoot/leftFoot/heading stat'larından hesaplanır =====
  // 1) Arketip baz ağırlıkları
  const arkMod = ARKETIP_GOAL_MODIFIERS[archetype] ?? { right: 0.45, left: 0.30, head: 0.25, goals: 0.60 };
  let wRight = arkMod.right;
  let wLeft = arkMod.left;
  let wHead = arkMod.head;

  // 2) rightFoot / leftFoot stat'larına göre ağırlıkları ayarla (0-100 arası)
  //    yüksek rightFoot stat'i → sağ ayak gollerine % daha fazla ağırlık
  const totalFootStat = Math.max(1, rightFootStat + leftFootStat);
  const footRightShare = rightFootStat / totalFootStat; // 0..1
  const footLeftShare = leftFootStat / totalFootStat;

  // foot tercihi tüm ağırlıkları kaydırır
  if (foot === "Left") {
    // Solak: sol ayak ağırlığı artar
    wLeft = Math.max(wLeft, wRight * 0.8);
    wRight = wRight * 0.6;
  } else if (foot === "Both") {
    // Her iki ayak: dengeli
    wRight = (wRight + wLeft) * 0.45;
    wLeft = (wRight + wLeft) * 0.45;
  }
  // footStat oranına göre kaydır
  const footDelta = (footRightShare - footLeftShare) * 0.3; // -0.3..+0.3
  wRight += footDelta;
  wLeft -= footDelta;

  // 3) heading stat'ına göre kafa ağırlığını ayarla
  //    heading 50 → değişiklik yok, heading 80 → +0.15, heading 30 → -0.10
  const headDelta = (headingVal - 50) / 200; // -0.25..+0.15
  wHead = Math.max(0.05, Math.min(0.60, wHead + headDelta));

  // Negatif olmasın, toplam 1'e normalize et
  wRight = Math.max(0.05, wRight);
  wLeft = Math.max(0.05, wLeft);
  wHead = Math.max(0.05, wHead);
  const wSum = wRight + wLeft + wHead;
  wRight /= wSum; wLeft /= wSum; wHead /= wSum;

  // ===== Mevkiye göre penaltı/serbest vuruş oranı =====
  const isAttacker = pos.startsWith("ST") || pos === "CF" || pos.startsWith("W");
  const isMid = pos.startsWith("CM") || pos.startsWith("AM") || pos.startsWith("DM");
  const penaltyRate = isAttacker ? 0.18 : isMid ? 0.10 : 0.04;
  const freekickRate = isMid ? 0.08 : isAttacker ? 0.05 : 0.02;

  // Arketip gol çarpanı (mevkiye göre baz golü çarpar)
  const goalMult = arkMod.goals;

  for (let i = 0; i < totalSeasons; i++) {
    const seasonAge = careerStartAge + i;
    const startYear = currentYear - (totalSeasons - i);
    const seasonLabel = `${startYear}/${String(startYear + 1).slice(-2)}`;

    // Genç yaşta daha az süre, gelişim yıllarında alt ligler
    const youngFactor = seasonAge < 20 ? 0.4 : seasonAge < 23 ? 0.7 : 1.0;
    const primeFactor = seasonAge >= 24 && seasonAge <= 29 ? 1.15 : 1.0;
    const perfFactor = youngFactor * primeFactor;

    // Lig seviyesi: yaşla yükselir
    const tierBoost = Math.floor((seasonAge - careerStartAge) / 4);
    const tier = Math.max(1, Math.min(4, baseTier - tierBoost));

    // Maç sayısı
    const apps = Math.max(0, Math.round(currentApps * perfFactor * (0.7 + Math.random() * 0.6)));

    // Gol/asist (mevkiye + arketip çarpanına göre)
    let seasonGoals = 0;
    let seasonAssists = 0;
    if (pos !== "GK") {
      const gMax = isAttacker ? 18 : isMid ? 8 : 3;
      // Arketip çarpanını uygula
      seasonGoals = Math.round(Math.random() * gMax * perfFactor * goalMult);
      seasonAssists = Math.round(Math.random() * (isAttacker ? 10 : isMid ? 12 : 5) * perfFactor);
    }

    // Gol türü dağılımı — toplam = seasonGoals
    let goalsPenalty = Math.round(seasonGoals * penaltyRate * (0.5 + Math.random()));
    let goalsFreekick = Math.round(seasonGoals * freekickRate * (0.3 + Math.random()));
    // Penaltı + serbest vuruş toplam golleri aşmasın
    const setPieces = Math.min(goalsPenalty + goalsFreekick, seasonGoals);
    goalsPenalty = Math.min(goalsPenalty, setPieces);
    goalsFreekick = setPieces - goalsPenalty;
    // Kalan goller açık oyundan — ayak/kafa dağıt
    const openGoals = seasonGoals - setPieces;
    let goalsRight = Math.round(openGoals * wRight);
    let goalsLeft = Math.round(openGoals * wLeft);
    let goalsHead = openGoals - goalsRight - goalsLeft;
    // Negatif olmasın, toplam doğru olsun
    if (goalsHead < 0) { goalsRight += goalsHead; goalsHead = 0; }
    const drift = seasonGoals - (goalsRight + goalsLeft + goalsHead + goalsPenalty + goalsFreekick);
    if (drift !== 0) goalsRight += drift;
    if (goalsRight < 0) { goalsLeft += goalsRight; goalsRight = 0; }
    if (goalsLeft < 0) { goalsHead += goalsLeft; goalsLeft = 0; }

    // Kartlar
    const yellowCards = Math.round(Math.random() * 8 * perfFactor);
    const redCards = Math.random() < 0.15 ? 1 : 0;

    // Ortalama rating
    const avgRating = Math.round((5.8 + Math.random() * 2.5 + (ovr - 60) * 0.02) * 10) / 10;

    // Dakika
    const minutesPlayed = apps * Math.round(60 + Math.random() * 30);

    seasons.push({
      season: seasonLabel,
      club: GAME_CLUBS[Math.floor(Math.random() * GAME_CLUBS.length)],
      leagueTier: tier,
      appearances: apps,
      goals: seasonGoals,
      assists: seasonAssists,
      yellowCards,
      redCards,
      avgRating: Math.max(4.5, Math.min(9.5, avgRating)),
      minutesPlayed,
      goalsRight: Math.max(0, goalsRight),
      goalsLeft: Math.max(0, goalsLeft),
      goalsHead: Math.max(0, goalsHead),
      goalsPenalty,
      goalsFreekick,
    });
  }

  // En son sezon en üstte olacak şekilde tersine çevir
  return seasons.reverse();
}

export function generateTeam(
  meta: { name: string; short: string; c1: string; c2: string },
  leagueTier: LeagueTier = 2,
  department: Department = 1
): Team {
  const players: Player[] = [];
  // Lig seviyesine göre OVR aralıkları
  const ovrMult: Record<LeagueTier, number> = { 1: 1.15, 2: 1.0, 3: 0.85, 4: 0.7 };
  const mult = ovrMult[leagueTier];
  for (const slot of ROSTER_SHAPE) {
    for (let i = 0; i < slot.count; i++) {
      const adjustedMin = Math.max(30, Math.round(slot.minOvr * mult));
      const adjustedMax = Math.max(35, Math.round(slot.maxOvr * mult));
      players.push(generatePlayer(slot.pos, { min: adjustedMin, max: adjustedMax }));
    }
  }
  // Lig seviyesine göre bütçe
  const budgetRanges: Record<LeagueTier, [number, number]> = {
    1: [10_000_000, 50_000_000],
    2: [2_000_000, 8_000_000],
    3: [500_000, 2_000_000],
    4: [100_000, 500_000],
  };
  const [minBudget, maxBudget] = budgetRanges[leagueTier];
  return {
    id: nextId("t"),
    name: meta.name,
    shortName: meta.short,
    primaryColor: meta.c1,
    secondaryColor: meta.c2,
    leagueTier,
    department,
    players,
    budget: rand(minBudget, maxBudget),
    stadiumCapacity: rand(8000, 32000) * (leagueTier === 1 ? 2 : leagueTier === 4 ? 0.5 : 1),
    stadiumName: `${meta.name} Stadyumu`,
    is_bot: true,
    // P0 FIX BUG #28: Bot takımlarına initial facilities ver
    facilities: {
      levels: {
        stadium: Math.floor(rand(0, 3)),
        pitch: Math.floor(rand(0, 2)),
        academy: Math.floor(rand(0, 2)),
        gym: Math.floor(rand(0, 2)),
        medical: Math.floor(rand(0, 2)),
        analysis: 0,
      },
      staff: [],
      activeUpgrade: null,
      ticketPrice: 50 + Math.floor(rand(0, 30)),
    },
  };
}

// 18 takım ismi × 16 lig/departman = 288 takım
// Ama biz 18 takım per lig per departman yapalım = 4×4×18 = 288 takım
// Performans için: sadece kullanıcının lig/departmanındaki 18 takımı üret
export function generateAllClubs(): Team[] {
  return FICTIONAL_CLUB_NAMES.map((m) => generateTeam(m, 2, 1));
}

// Belirli bir lig/departman için 18 takım üret
export function generateClubsForLeague(tier: LeagueTier, dept: Department): Team[] {
  return FICTIONAL_CLUB_NAMES.map((m) => generateTeam(m, tier, dept));
}

export function getInitials(p: Player): string {
  return initials(p.firstName, p.lastName);
}

// ===== Formasyon tanımları =====
export type FormationSlot = {
  pos: Position;
  // 0-100 normalizeli pitch koordinatı
  x: number;
  y: number;
};

export type Formation = {
  key: string;
  // GK dahil 11 slot
  slots: FormationSlot[];
};

export const FORMATIONS: Formation[] = [
  {
    key: "4-4-2",
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "RB", x: 12, y: 75 },
      { pos: "CB", x: 36, y: 78 },
      { pos: "CB", x: 64, y: 78 },
      { pos: "LB", x: 88, y: 75 },
      { pos: "RM", x: 14, y: 50 },
      { pos: "CM", x: 38, y: 52 },
      { pos: "CM", x: 62, y: 52 },
      { pos: "LM", x: 86, y: 50 },
      { pos: "ST", x: 38, y: 20 },
      { pos: "ST", x: 62, y: 20 },
    ],
  },
  {
    key: "4-3-3",
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "RB", x: 12, y: 75 },
      { pos: "CB", x: 36, y: 78 },
      { pos: "CB", x: 64, y: 78 },
      { pos: "LB", x: 88, y: 75 },
      { pos: "CDM", x: 50, y: 60 },
      { pos: "CM", x: 28, y: 48 },
      { pos: "CM", x: 72, y: 48 },
      { pos: "RW", x: 86, y: 22 },
      { pos: "ST", x: 50, y: 16 },
      { pos: "LW", x: 14, y: 22 },
    ],
  },
  {
    key: "4-2-3-1",
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "RB", x: 12, y: 75 },
      { pos: "CB", x: 36, y: 78 },
      { pos: "CB", x: 64, y: 78 },
      { pos: "LB", x: 88, y: 75 },
      { pos: "CDM", x: 38, y: 58 },
      { pos: "CDM", x: 62, y: 58 },
      { pos: "CAM", x: 50, y: 38 },
      { pos: "RW", x: 82, y: 38 },
      { pos: "LW", x: 18, y: 38 },
      { pos: "ST", x: 50, y: 18 },
    ],
  },
  {
    key: "3-5-2",
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "CB", x: 28, y: 78 },
      { pos: "CB", x: 50, y: 80 },
      { pos: "CB", x: 72, y: 78 },
      { pos: "RM", x: 10, y: 50 },
      { pos: "CM", x: 32, y: 52 },
      { pos: "CDM", x: 50, y: 60 },
      { pos: "CM", x: 68, y: 52 },
      { pos: "LM", x: 90, y: 50 },
      { pos: "ST", x: 38, y: 20 },
      { pos: "ST", x: 62, y: 20 },
    ],
  },
  {
    key: "4-5-1",
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "RB", x: 12, y: 75 },
      { pos: "CB", x: 36, y: 78 },
      { pos: "CB", x: 64, y: 78 },
      { pos: "LB", x: 88, y: 75 },
      { pos: "RM", x: 14, y: 48 },
      { pos: "CM", x: 34, y: 50 },
      { pos: "CDM", x: 50, y: 60 },
      { pos: "CM", x: 66, y: 50 },
      { pos: "LM", x: 86, y: 48 },
      { pos: "ST", x: 50, y: 18 },
    ],
  },
  {
    key: "4-4-1-1",
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "RB", x: 12, y: 75 },
      { pos: "CB", x: 36, y: 78 },
      { pos: "CB", x: 64, y: 78 },
      { pos: "LB", x: 88, y: 75 },
      { pos: "RM", x: 14, y: 50 },
      { pos: "CM", x: 38, y: 52 },
      { pos: "CM", x: 62, y: 52 },
      { pos: "LM", x: 86, y: 50 },
      { pos: "CF", x: 50, y: 30 },
      { pos: "ST", x: 50, y: 14 },
    ],
  },
  {
    key: "3-4-3",
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "CB", x: 28, y: 78 },
      { pos: "CB", x: 50, y: 80 },
      { pos: "CB", x: 72, y: 78 },
      { pos: "RM", x: 12, y: 50 },
      { pos: "CM", x: 38, y: 52 },
      { pos: "CM", x: 62, y: 52 },
      { pos: "LM", x: 88, y: 50 },
      { pos: "RW", x: 84, y: 22 },
      { pos: "ST", x: 50, y: 16 },
      { pos: "LW", x: 16, y: 22 },
    ],
  },
  {
    key: "5-3-2",
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "RB", x: 8, y: 65 },
      { pos: "CB", x: 28, y: 78 },
      { pos: "CB", x: 50, y: 80 },
      { pos: "CB", x: 72, y: 78 },
      { pos: "LB", x: 92, y: 65 },
      { pos: "CM", x: 30, y: 50 },
      { pos: "CM", x: 50, y: 52 },
      { pos: "CM", x: 70, y: 50 },
      { pos: "ST", x: 38, y: 20 },
      { pos: "ST", x: 62, y: 20 },
    ],
  },
  {
    key: "4-1-4-1",
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "RB", x: 12, y: 75 },
      { pos: "CB", x: 36, y: 78 },
      { pos: "CB", x: 64, y: 78 },
      { pos: "LB", x: 88, y: 75 },
      { pos: "CDM", x: 50, y: 62 },
      { pos: "RM", x: 16, y: 42 },
      { pos: "CM", x: 38, y: 44 },
      { pos: "CM", x: 62, y: 44 },
      { pos: "LM", x: 84, y: 42 },
      { pos: "ST", x: 50, y: 18 },
    ],
  },
  {
    key: "4-2-4",
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "RB", x: 12, y: 75 },
      { pos: "CB", x: 36, y: 78 },
      { pos: "CB", x: 64, y: 78 },
      { pos: "LB", x: 88, y: 75 },
      { pos: "CDM", x: 38, y: 56 },
      { pos: "CDM", x: 62, y: 56 },
      { pos: "RW", x: 84, y: 22 },
      { pos: "ST", x: 38, y: 16 },
      { pos: "ST", x: 62, y: 16 },
      { pos: "LW", x: 16, y: 22 },
    ],
  },
  {
    key: "3-4-2-1",
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "CB", x: 28, y: 78 },
      { pos: "CB", x: 50, y: 80 },
      { pos: "CB", x: 72, y: 78 },
      { pos: "RM", x: 12, y: 50 },
      { pos: "CM", x: 38, y: 54 },
      { pos: "CM", x: 62, y: 54 },
      { pos: "LM", x: 88, y: 50 },
      { pos: "CAM", x: 38, y: 30 },
      { pos: "CAM", x: 62, y: 30 },
      { pos: "ST", x: 50, y: 14 },
    ],
  },
  {
    key: "4-3-2-1",
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "RB", x: 12, y: 75 },
      { pos: "CB", x: 36, y: 78 },
      { pos: "CB", x: 64, y: 78 },
      { pos: "LB", x: 88, y: 75 },
      { pos: "CDM", x: 50, y: 60 },
      { pos: "CM", x: 28, y: 46 },
      { pos: "CM", x: 72, y: 46 },
      { pos: "CAM", x: 38, y: 28 },
      { pos: "CAM", x: 62, y: 28 },
      { pos: "ST", x: 50, y: 12 },
    ],
  },
  {
    key: "5-4-1",
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "RB", x: 8, y: 65 },
      { pos: "CB", x: 28, y: 78 },
      { pos: "CB", x: 50, y: 80 },
      { pos: "CB", x: 72, y: 78 },
      { pos: "LB", x: 92, y: 65 },
      { pos: "RM", x: 16, y: 46 },
      { pos: "CM", x: 38, y: 48 },
      { pos: "CM", x: 62, y: 48 },
      { pos: "LM", x: 84, y: 46 },
      { pos: "ST", x: 50, y: 18 },
    ],
  },
  {
    key: "4-1-3-2",
    slots: [
      { pos: "GK", x: 50, y: 92 },
      { pos: "RB", x: 12, y: 75 },
      { pos: "CB", x: 36, y: 78 },
      { pos: "CB", x: 64, y: 78 },
      { pos: "LB", x: 88, y: 75 },
      { pos: "CDM", x: 50, y: 62 },
      { pos: "CM", x: 28, y: 44 },
      { pos: "CM", x: 50, y: 42 },
      { pos: "CM", x: 72, y: 44 },
      { pos: "ST", x: 38, y: 18 },
      { pos: "ST", x: 62, y: 18 },
    ],
  },
];

export const FORMATION_KEYS = FORMATIONS.map((f) => f.key);
