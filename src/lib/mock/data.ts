/**
 * Sahte (kurgusal) Türk futbol verisi.
 * Hiçbir gerçek kulüp/oyuncu adı kullanılmaz.
 * Sadece Türkçe isim yapısı taklit edilir.
 *
 * Player tipi, eski oyunun (siyah-beyaz-fc) maç motoruyla birebir uyumlu —
 * 40+ attribute (teknik/zihinsel/fiziksel + fitness + traits).
 * Mock data üreticisi tüm alanları doldurur.
 */

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
  match_ratings?: number[];
  last_match_rating?: number;

  // ── Transfer/durum ─────────────────────────────────────
  is_for_sale?: boolean;
  sale_price?: number;
  isResting?: boolean;
  suspended_until?: string;
  is_injured?: boolean;
  injury?: {
    type: "light" | "chronic" | "risky";
    remaining_days: number;
    severity: number;
  };
};

export type Team = {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  league: "1lig";
  players: Player[];
  budget: number;
  stadiumCapacity: number;
  stadiumName: string;
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
  { name: "Yeditepespor", short: "YTP", c1: "#14532d", c2: "#bbf7d0" },
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

function generatePlayer(pos: Position, ovrRange: { min: number; max: number }): Player {
  const ovr = rand(ovrRange.min, ovrRange.max);
  const isForeign = Math.random() < 0.25;
  const first = isForeign ? pick(FIRST_NAMES_FOREIGN) : pick(FIRST_NAMES_TR);
  const last = pick(LAST_NAMES_TR);
  const age = rand(17, 36);
  const stats = generateStats(pos, ovr);
  const goals = pos === "GK" ? 0 : rand(0, pos.startsWith("ST") || pos === "CF" ? 12 : 6);
  const assists = pos === "GK" ? 0 : rand(0, 8);
  const saves = pos === "GK" ? rand(10, 60) : 0;
  const nation = isForeign ? "Yabancı" : "Türkiye";
  const foot: Foot = Math.random() < 0.7 ? "Right" : Math.random() < 0.5 ? "Left" : "Both";
  const marketValue = ovr * rand(80_000, 180_000);
  const weeklyWage = ovr * rand(800, 2200);

  // Pozisyon grubu
  const group = POSITION_GROUP[pos];

  // 40+ attribute üret — pozisyona göre ağırlıklı
  const base = ovr;
  const spread = (n: number, lo = 8, hi = 18) =>
    Math.max(30, Math.min(99, n + rand(-hi, -lo)));
  const boost = (n: number, lo = 4, hi = 14) =>
    Math.max(30, Math.min(99, n + rand(lo, hi)));

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
    heading: pos === "CB" || pos === "ST" ? boost(base, 5, 12) : spread(base, 5, 15),
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
    archetype: pick(["Press Master", "Goal Machine", "Playmaker", "Wall", "Engine Room"]),
    special_role: null,

    goals,
    assists,
    saves,
    appearances: rand(8, 28),
    match_ratings: Array.from({ length: rand(0, 10) }, () => rand(50, 90) / 10),
    last_match_rating: rand(50, 90) / 10,

    is_for_sale: false,
    isResting: false,
    is_injured: false,
  };
}

export function generateTeam(
  meta: { name: string; short: string; c1: string; c2: string }
): Team {
  const players: Player[] = [];
  for (const slot of ROSTER_SHAPE) {
    for (let i = 0; i < slot.count; i++) {
      players.push(generatePlayer(slot.pos, { min: slot.minOvr, max: slot.maxOvr }));
    }
  }
  return {
    id: nextId("t"),
    name: meta.name,
    shortName: meta.short,
    primaryColor: meta.c1,
    secondaryColor: meta.c2,
    league: "1lig",
    players,
    budget: rand(2_000_000, 6_500_000),
    stadiumCapacity: rand(8000, 32000),
    stadiumName: `${meta.name} Stadyumu`,
  };
}

export function generateAllClubs(): Team[] {
  return FICTIONAL_CLUB_NAMES.map((m) => generateTeam(m));
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
