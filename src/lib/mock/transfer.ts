import {
  FIRST_NAMES_FOREIGN,
  FIRST_NAMES_TR,
  LAST_NAMES_TR,
  POSITION_GROUP,
  type Foot,
  type Player,
  type PlayerStats,
  type Position,
  generatePlayer,
} from "@/lib/mock/data";

/**
 * Transfer market — sahte serbest oyuncu havuzu.
 * Referans siyah-beyaz-fc'deki MarketTab mantığı uyarlanmıştır:
 * - Serbest oyuncular (free agents)
 * - Watchlist (localStorage)
 * - Gelen teklifler (kullanıcının listelediği oyunculara bot teklifleri)
 * - Teklif yapma akışı (modal)
 *
 * Vergi modeli: satıcı %2.5 + alıcı %5 agent + %3 imza = ~%8 ek maliyet alıcıya
 * (referans repodan alınan değerler)
 */

export type TransferListing = {
  player: Player;
  askingPrice: number; // kulüp talebi
  daysListed: number;
  offers: number; // kaç bot teklif etti
};

export type FreeAgentListing = {
  player: Player;
  // Takımsız — serbest, bedelsiz transfer
  wageDemand: number; // talep edilen haftalık maaş
};

export type LoanListing = {
  player: Player;
  lenderTeamName: string;
  lenderTeamShort: string;
  lenderTeamColor: string;
  dailyFee: number; // günlük kira ücreti
  durationWeeks: number; // kiralık süre
  buyOption?: number; // opsiyonel satın alma bedeli
};

export type IncomingOffer = {
  id: string;
  myPlayerId: string;
  buyerTeamId: string;
  buyerTeamName: string;
  buyerTeamShort: string;
  buyerTeamColor: string;
  offerAmount: number;
  wageOffer: number;
  contractYears: number;
  // Oyuncu değerine göre kabul/ret tavsiyesi
  recommended: "accept" | "reject" | "negotiate";
  expiresHours: number;
};

export type WatchlistEntry = {
  playerId: string;
  addedAt: number;
};

// ===== Sahte serbest oyuncu havuzu =====
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

let _id = 0;
function nextId(prefix: string) {
  _id += 1;
  return `${prefix}_${_id.toString(36)}`;
}

const POSITIONS_BY_GROUP: Record<string, Position[]> = {
  GK: ["GK"],
  DEF: ["CB", "LB", "RB"],
  MID: ["CDM", "CM", "CAM"],
  FWD: ["LW", "RW", "ST", "CF"],
};

const ARCHETYPES: Record<Position, string[]> = {
  GK: ["Kale Duvarı", "Süpürücü Kaleci", "Penaltı Uzmanı"],
  CB: ["Duvar", "Yapıcı Stop", "Hava Hakimi", "Baskı Ustası"],
  LB: ["Kanat Beki", "Yorumcu Bek", "Defansif Bek"],
  RB: ["Kanat Beki", "Yorumcu Bek", "Defansif Bek"],
  LWB: ["Kanat Beki", "Ofansif Bek"],
  RWB: ["Kanat Beki", "Ofansif Bek"],
  CDM: ["Yıkıcı", "Yapıcı CDM", "Ekran Oyuncusu"],
  CM: ["Truva Atı", "Motor", "Pas Ustası", "Box-to-Box"],
  CAM: ["Playmaker", "Numara 10", "Yaratıcı"],
  LM: ["Kanat", "İçeri Dönen"],
  RM: ["Kanat", "İçeri Dönen"],
  LW: ["Kanat", "İçeri Dönen", "Hızlı Kanat"],
  RW: ["Kanat", "İçeri Dönen", "Hızlı Kanat"],
  ST: ["Gol Makinesi", "Bitirici", "Hedef Adam", "Baskı Ustası"],
  CF: ["İkinci Forvet", "Yaratıcı Forvet", "Hedef Adam"],
};

const NATIONALITIES = [
  { code: "TR", flag: "🇹🇷", name: "Türkiye" },
  { code: "BR", flag: "🇧🇷", name: "Brezilya" },
  { code: "AR", flag: "🇦🇷", name: "Arjantin" },
  { code: "DE", flag: "🇩🇪", name: "Almanya" },
  { code: "FR", flag: "🇫🇷", name: "Fransa" },
  { code: "ES", flag: "🇪🇸", name: "İspanya" },
  { code: "IT", flag: "🇮🇹", name: "İtalya" },
  { code: "PT", flag: "🇵🇹", name: "Portekiz" },
  { code: "NL", flag: "🇳🇱", name: "Hollanda" },
  { code: "MA", flag: "🇲🇦", name: "Fas" },
  { code: "SN", flag: "🇸🇳", name: "Senegal" },
  { code: "RS", flag: "🇷🇸", name: "Sırbistan" },
];

export type Nationality = (typeof NATIONALITIES)[number];

export function generateFreeAgents(count = 30): TransferListing[] {
  const listings: TransferListing[] = [];
  const groups: (keyof typeof POSITIONS_BY_GROUP)[] = ["GK", "DEF", "MID", "FWD"];
  const groupCounts: Record<string, number> = { GK: 3, DEF: 8, MID: 10, FWD: 9 };

  for (const group of groups) {
    const positions = POSITIONS_BY_GROUP[group];
    const n = groupCounts[group];
    for (let i = 0; i < n; i++) {
      const pos = pick(positions);
      const ovrRange =
        group === "GK"
          ? { min: 60, max: 75 }
          : group === "DEF"
          ? { min: 62, max: 78 }
          : group === "MID"
          ? { min: 63, max: 80 }
          : { min: 64, max: 81 };

      // generatePlayer() çağır — tüm attribute'lar, traits, archetype, seasonHistory dahil
      const player = generatePlayer(pos, ovrRange);

      // Serbest ajan specific ayarlar
      const marketValue = player.marketValue;
      const askingPrice = Math.round(marketValue * (1 + rand(-10, 20) / 100));

      listings.push({
        player,
        askingPrice,
        daysListed: rand(1, 14),
        offers: rand(0, 4),
      });
    }
  }

  return listings.sort((a, b) => b.player.rating - a.player.rating);
}

// ===== Gelen teklifler (kullanıcının oyuncularına botlardan) =====
export function generateIncomingOffers(myPlayers: Player[]): IncomingOffer[] {
  // P1 FIX: rating eşiği düşürüldü — alt liglerde de teklif gelsin
  const minRating = myPlayers.length > 0
    ? Math.max(45, Math.floor(Math.max(...myPlayers.map(p => p.rating)) - 10))
    : 60;
  const top = [...myPlayers]
    .filter((p) => !p.is_injured && p.rating >= minRating)
    .sort((a, b) => (b.rating * 0.6 + b.marketValue * 0.000001) - (a.rating * 0.6 + a.marketValue * 0.000001))
    .slice(0, 8);
  const target = top.slice(0, rand(2, 4));

  const buyerNames = [
    { name: "Boğazspor", short: "BGZ", color: "#134e4a" },
    { name: "Hisarspor", short: "HIS", color: "#4c1d95" },
    { name: "Yeditepespor", short: "YTP", color: "#14532d" },
    { name: "Efespor", short: "EFS", color: "#854d0e" },
    { name: "Çınarspor", short: "CNR", color: "#7f1d1d" },
  ];

  return target.map((p) => {
    const buyer = pick(buyerNames);
    const baseOffer = p.marketValue;
    const variance = rand(-15, 25) / 100; // -%15'ten +%25'e
    const offerAmount = Math.round(baseOffer * (1 + variance));
    const recommended: IncomingOffer["recommended"] =
      variance >= 0.15 ? "accept" : variance < -0.05 ? "reject" : "negotiate";
    return {
      id: nextId("io"),
      myPlayerId: p.id,
      // P0 FIX: buyerTeamId ekle — acceptOffer alıcı takıma oyuncuyu ekleyebilsin
      buyerTeamId: `bot_${buyer.short.toLowerCase()}_${Math.random().toString(36).slice(2, 6)}`,
      buyerTeamName: buyer.name,
      buyerTeamShort: buyer.short,
      buyerTeamColor: buyer.color,
      offerAmount,
      wageOffer: Math.round(p.weeklyWage * 1.1),
      contractYears: rand(2, 4),
      recommended,
      expiresHours: rand(12, 72),
    };
  });
}

// ===== Vergi hesaplama =====
export const TRANSFER_TAX_RATE = 0.025; // satıcıdan %2.5
export const AGENT_FEE_RATE = 0.05; // alıcıya %5
export const SIGNING_BONUS_RATE = 0.03; // alıcıya %3

export function calculateBuyerCost(askingPrice: number) {
  const agentFee = Math.round(askingPrice * AGENT_FEE_RATE);
  const signingBonus = Math.round(askingPrice * SIGNING_BONUS_RATE);
  const total = askingPrice + agentFee + signingBonus;
  return {
    transferFee: askingPrice,
    agentFee,
    signingBonus,
    total,
  };
}

export function calculateSellerNet(salePrice: number) {
  const tax = Math.round(salePrice * TRANSFER_TAX_RATE);
  return {
    salePrice,
    tax,
    net: salePrice - tax,
  };
}

export function getPositionGroup(pos: Position) {
  return POSITION_GROUP[pos];
}

// ===== Takımsız (serbest) oyuncu üretimi — her mevkiiden =====
export function generateFreeAgentListings(count = 15): FreeAgentListing[] {
  const positions: Position[] = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST", "CF"];
  const listings: FreeAgentListing[] = [];

  for (let i = 0; i < count; i++) {
    const pos = positions[i % positions.length];
    const ovr = rand(55, 78);
    const isForeign = Math.random() < 0.4;
    const first = isForeign ? pick(FIRST_NAMES_FOREIGN) : pick(FIRST_NAMES_TR);
    const last = pick(LAST_NAMES_TR);
    const stats = generateStats(pos, ovr);
    const age = rand(18, 33);

    const player: Player = {
      id: nextId("fa"),
      firstName: first,
      lastName: last,
      name: `${first} ${last}`,
      position: POSITION_GROUP[pos],
      specificPosition: pos,
      age,
      potential: ovr + rand(0, 15),
      hidden_potential: ovr + rand(0, 20),
      rating: ovr,
      formRating: Math.round((ovr / 10) * 10) / 10,
      nationality: isForeign ? "foreign" : "TR",
      nation: isForeign ? "Yabancı" : "Türkiye",
      foot: Math.random() < 0.7 ? "Right" : Math.random() < 0.5 ? "Left" : "Both",
      market_value: ovr * 80_000,
      marketValue: ovr * 80_000,
      salary: ovr * 1500,
      weeklyWage: ovr * 1500,
      defending: stats.defending,
      passing: stats.passing,
      shooting: stats.shooting,
      speed: stats.pace,
      power: stats.physical,
      stats,
      cond: rand(70, 100),
      condition: rand(70, 100),
      form: rand(60, 90),
      morale: rand(40, 70),
      confidence: rand(50, 80),
      traits: [],
      goals: 0,
      assists: 0,
      saves: pos === "GK" ? rand(0, 20) : 0,
      appearances: 0,
      archetype: pick(ARCHETYPES[pos]),
      is_free_agent: true,
    };

    listings.push({
      player,
      wageDemand: Math.round(player.weeklyWage * 1.2),
    });
  }

  return listings;
}

// ===== Kiralık oyuncu üretimi — diğer takımlardan =====
export function generateLoanListings(clubs: { id: string; name: string; shortName: string; primaryColor: string; players: Player[] }[], count = 10): LoanListing[] {
  const listings: LoanListing[] = [];
  const lenderPool = clubs.filter((c) => c.players.length > 20);

  for (let i = 0; i < count && lenderPool.length > 0; i++) {
    const lender = pick(lenderPool);
    // En zayıf 5 oyuncudan birini kiralığa ver
    const player = [...lender.players]
      .sort((a, b) => a.rating - b.rating)
      .slice(0, 8)
      [Math.floor(Math.random() * 5)];

    if (!player) continue;

    listings.push({
      player,
      lenderTeamName: lender.name,
      lenderTeamShort: lender.shortName,
      lenderTeamColor: lender.primaryColor,
      dailyFee: Math.round(player.marketValue * 0.0003),
      durationWeeks: pick([4, 8, 12, 17, 26, 34]),
      buyOption: Math.random() < 0.4 ? Math.round(player.marketValue * 1.1) : undefined,
    });
  }

  return listings;
}

export { NATIONALITIES };
