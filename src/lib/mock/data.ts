/**
 * Sahte (kurgusal) Türk futbol verisi.
 * Hiçbir gerçek kulüp/oyuncu adı kullanılmaz.
 * Sadece Türkçe isim yapısı taklit edilir.
 */

export type Position =
  | "GK"
  | "CB"
  | "LB"
  | "RB"
  | "CDM"
  | "CM"
  | "CAM"
  | "LW"
  | "RW"
  | "ST"
  | "CF";

export type PositionGroup = "GK" | "DEF" | "MID" | "FWD";

export const POSITION_GROUP: Record<Position, PositionGroup> = {
  GK: "GK",
  CB: "DEF",
  LB: "DEF",
  RB: "DEF",
  CDM: "MID",
  CM: "MID",
  CAM: "MID",
  LW: "FWD",
  RW: "FWD",
  ST: "FWD",
  CF: "FWD",
};

export type Foot = "left" | "right" | "both";

export type PlayerStats = {
  pace: number; // Hız
  shooting: number; // Şut
  passing: number; // Pas
  defending: number; // Defans
  physical: number; // Fizik
  dribbling: number; // Dripling
};

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  position: Position;
  secondaryPositions?: Position[];
  age: number;
  nationality: "TR" | "foreign";
  foot: Foot;
  ovr: number; // 0-100
  rating: number; // 0-10 (form rating, ondalık)
  stats: PlayerStats;
  morale: number; // 0-100
  condition: number; // 0-100
  goals: number;
  assists: number;
  saves: number;
  appearances: number;
  archetype?: string;
  potential?: number; // hidden until scouted
  marketValue: number; // €
  weeklyWage: number; // €
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

  return {
    id: nextId("p"),
    firstName: first,
    lastName: last,
    position: pos,
    age,
    nationality: isForeign ? "foreign" : "TR",
    foot: Math.random() < 0.7 ? "right" : Math.random() < 0.5 ? "left" : "both",
    ovr,
    rating: Math.round((ovr / 10 + (Math.random() * 2 - 1)) * 10) / 10,
    stats,
    morale: rand(55, 90),
    condition: rand(70, 100),
    goals,
    assists,
    saves,
    appearances: rand(8, 28),
    marketValue: ovr * rand(80_000, 180_000),
    weeklyWage: ovr * rand(800, 2200),
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
