"use client";

import { create } from "zustand";
import {
  FORMATIONS,
  generateAllClubs,
  generateClubsForLeague,
  generatePlayer,
  type Formation,
  type LeagueTier,
  type Department,
  type Player,
  type Team,
} from "@/lib/mock/data";
import {
  autoFillLineup,
  computeStandings,
  generateFixtures,
  isTransferWindowOpen,
  playFixturesUpTo,
  SEASON_INFO,
  type FixtureRow,
} from "@/lib/mock/season";
import {
  generateFreeAgents,
  generateFreeAgentListings,
  generateIncomingOffers,
  generateLoanListings,
  type FreeAgentListing,
  type IncomingOffer,
  type LoanListing,
  type TransferListing,
} from "@/lib/mock/transfer";
import {
  assignMentor as assignMentorFn,
  getDefaultTrainingState,
  removeMentor as removeMentorFn,
  runTrainingSession,
  applyResultsToSquad,
  todayKey,
  type TrainingState,
} from "@/lib/training/engine";
import { DEFAULT_TACTIC, FORMATION_SLOTS, type ActiveTactic } from "@/lib/tactics/types";
// P1: require() → top-level ES import (circular dependency riski yok, Next.js 16 Turbopack)
import { TIER_BASE_BUDGETS } from "@/lib/match/engine/constants";
import { simulateEnhancedMatch } from "@/lib/match/engine/enhancedMatchEngine";
import { getInflationMultiplier } from "@/lib/fm/inflation";
import { applyCoachTrainingBoost } from "@/lib/staffBonus";
import { generateSponsorOffers, getTotalSponsorIncome } from "@/lib/sponsorSystem";
import { checkAndAwardBadges, checkAchievements } from "@/components/touchline/achievements";

type Tactics = {
  // Yeni şema — eski oyunun ActiveTactic'i ile birebir
  active: ActiveTactic;
  lineup: (Player | null)[];
  // slot index → roleId eşlemesi
  slotRoles: Record<number, string>;
  // talimat adı → seçilen opsiyon (örn "Tempo" → "Yüksek")
  activeInstructions: Record<string, string>;
  // Eski şema (geri uyumluluk için kalsın, Tactics ekranı eski slider'ları kullanmıyor artık)
  formationKey: string;
  sliders: {
    attackingPressure: number;
    defensiveLine: number;
    tempo: number;
    wingPlay: number;
  };
  roles: Record<string, "balanced" | "attacking" | "defensive" | "support">;
};

// Transfer state — oyuncu ID'leri string olarak saklanır
export type MessageItem = {
  id: string;
  kind: "transfer_accepted" | "transfer_rejected" | "transfer_negotiated"
    | "transfer_offer_incoming" | "transfer_offer_response" | "loan_request" | "general" | "transfer";
  fromTeamName: string;
  fromTeamShort?: string;
  fromTeamColor?: string;
  message: string;
  at: number;
  read: boolean;
  amount?: number;
  counterOffer?: number;
  relatedOfferId?: string;
  playerId?: string;
};

export type NewsItem = {
  id: string;
  category: "headline" | "match" | "transfer" | "rumor" | "injury" | "milestone";
  headline: string;
  body: string;
  timestamp: number;
  importance: number;
  read: boolean;
  relatedTeamId?: string;
  // ADDED: İlişkili oyuncu ID'si (transfer/sakatlık haberleri için)
  playerId?: string;
};

type TransferState = {
  freeAgents: TransferListing[];
  freeAgentListings: import("@/lib/mock/transfer").FreeAgentListing[];
  loanListings: import("@/lib/mock/transfer").LoanListing[];
  watchlist: string[];
  incomingOffers: IncomingOffer[];
  myListedPlayers: { playerId: string; askingPrice: number }[];
  messages: MessageItem[];
};

// Facilities state — tesis seviyeleri + personel + aktif inşaat
type FacilitiesState = {
  // 10 facility × max level 10 (stadium_matrix)
  levels: {
    stadium: number; // capacity
    pitch: number; // training pitch
    academy: number; // youth academy
    gym: number;
    medical: number;
    analysis: number;
  };
  staff: StaffMember[];
  activeUpgrade: {
    facilityId: keyof FacilitiesState["levels"] | "staff" | null;
    startedAt: number;
    finishAt: number;
    cost: number;
  } | null;
  // Ticket price (0-150)
  ticketPrice: number;
};

export type StaffMember = {
  id: string;
  type: "scout" | "coach" | "physio" | "analyst" | "youth_coordinator" | "sporting_director";
  name: string;
  stars: number; // 1-5
  hireFee: number;
  weeklyWage: number;
};

// Kupa sistemi — store'da tutulur
type CupMatch = {
  round: number; // 2=çeyrek, 3=yarı, 4=final
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
};

type CupState = {
  matches: CupMatch[];
  currentRound: number;
  champion?: string;
  eliminated: boolean; // kullanıcı elendi mi
};

type AppState = {
  isAuthed: boolean;
  managerName: string;
  myTeamId: string | null;
  seasonMatchday: number;
  seasonNumber: number;
  clubs: Team[];
  fixtures: FixtureRow[];
  news: NewsItem[];
  tactics: Tactics;
  transfer: TransferState;
  training: TrainingState;
  facilities: FacilitiesState;
  // Kupa sistemi — store'da tutulur, component state değil
  cup: CupState;
  // P5: Sezon başı oyuncu stats'ları — gelişim rozeti için (playerId → { rating, finishing, ... })
  seasonStartStats: Record<string, Record<string, number>>;
  // ADDED: Sponsor sistemi — aktif + teklif sponsorlar
  sponsors: {
    active: any[]; // aktif imzalı sponsorlar
    offers: any[]; // bekleyen teklifler
  };
  // P0: Kredi sistemi — paket satın alma, hazırlık maçı için
  credits: number;

  // actions
  loginDemo: (name?: string) => void;
  logout: () => Promise<void>;
  setFormation: (key: string) => void;
  setSlider: (key: keyof Tactics["sliders"], value: number) => void;
  swapLineupSlot: (slotIndex: number, playerId: string) => void;
  setRole: (slotIndex: number, role: Tactics["roles"][string]) => void;
  // Yeni taktik action'ları
  updateActiveTactic: (patch: Partial<ActiveTactic>) => void;
  setSlotRole: (slotIndex: number, roleId: string) => void;
  setCaptain: (playerId: string) => void; // P0: Kaptan seç
  setInstruction: (name: string, option: string) => void;
  resetInstruction: (name: string) => void;
  // transfer actions
  toggleWatchlist: (playerId: string) => void;
  buyPlayer: (playerId: string, fee: number, wage: number, contractYears: number) =>
    { success: boolean; reason?: string };
  makeTransferOffer: (playerId: string, fee: number, wage: number, contractYears: number) =>
    { success: boolean; reason?: string; response?: "accepted" | "rejected" | "countered"; counterFee?: number };
  makeLoanOffer: (playerId: string, loanFee: number, weeks: number) =>
    { success: boolean; reason?: string; response?: "accepted" | "rejected" };
  acceptOffer: (offerId: string) => { success: boolean; salePrice?: number };
  rejectOffer: (offerId: string) => void;
  listPlayerForSale: (playerId: string, askingPrice: number) => void;
  unlistPlayer: (playerId: string) => void;
  // training actions
  assignProgram: (playerId: string, programId: string) => void;
  unassignPlayer: (playerId: string) => void;
  runSession: (multiplier: number) => { success: boolean; reason?: string; results?: ReturnType<typeof runTrainingSession> };
  assignMentor: (mentorId: string, menteeId: string) => void;
  removeMentor: (menteeId: string) => void;
  // facilities actions
  upgradeFacility: (facilityId: keyof FacilitiesState["levels"]) => { success: boolean; reason?: string };
  cancelUpgrade: () => void;
  completeUpgradeIfDue: () => void;
  hireStaff: (type: StaffMember["type"], stars: number) => { success: boolean; reason?: string };
  fireStaff: (staffId: string) => void;
  setTicketPrice: (price: number) => void;
  // cup actions
  playCupRound: () => { success: boolean; myResult?: string; champion?: string };
  // season actions
  endSeason: () => { success: boolean; summary?: SeasonSummary };
  advanceMatchday: () => void;
  recordMatchResult: (homeId: string, awayId: string, homeScore: number, awayScore: number) => void;
  // ADDED: Sponsor actions
  generateSponsorOffers: () => void;
  acceptSponsor: (sponsorId: string) => void;
  rejectSponsor: (sponsorId: string) => void;  // P2 FIX: Reddetme action'ı eklendi
  getSponsorWeeklyIncome: () => number;
  // P0: Kredi sistemi actions
  addCredits: (amount: number) => void;
  spendCredits: (amount: number) => boolean;
  buyPlayerPack: (packType: "bronze" | "silver" | "gold" | "platinum") => { success: boolean; players?: any[]; reason?: string };
  // message actions
  markMessageRead: (msgId: string) => void;
  markAllMessagesRead: () => void;
  clearMessage: (msgId: string) => void;
  respondToIncomingMessage: (msgId: string, response: "accept" | "reject") => void;
  completeTransfer: (offerId: string) => { success: boolean; reason?: string };
  acceptCounterOffer: (offerId: string) => { success: boolean; reason?: string };
  rejectCounterOffer: (offerId: string) => void;
  // news actions
  markNewsRead: (newsId: string) => void;
  markAllNewsRead: () => void;
  generateNews: () => void;
  // cloud
  loadMultiplayerState: (userId: string) => Promise<{ success: boolean; reason?: string }>;
  saveToCloud: (userId: string) => Promise<void>;
  saveTacticsToCloud: (userId: string) => Promise<void>;
};

export type SeasonSummary = {
  season: number;
  finalPosition: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  promoted: boolean;
  relegated: boolean;
  topScorer: { name: string; goals: number } | null;
  retiredPlayers: string[];
  newRegens: number;
};

// Kısa Euro formatı — haber mesajları için
function formatEuroShort(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M €`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K €`;
  return `${amount} €`;
}

function buildInitialClubs(): Team[] {
  // Kullanıcı rastgele bir lig/departmana atanacak
  // Sadece o lig/departmandaki 18 takımı üret
  const tier = ([1, 2, 2, 2, 3, 3, 3, 4, 4, 4] as const)[Math.floor(Math.random() * 10)];
  const dept = ([1, 1, 2, 2, 3, 3, 4, 4] as const)[Math.floor(Math.random() * 8)] as 1 | 2 | 3 | 4;
  return generateClubsForLeague(tier as 1 | 2 | 3 | 4, dept);
}

function buildInitialFixtures(clubs: Team[]): FixtureRow[] {
  const fx = generateFixtures(clubs);
  return playFixturesUpTo(fx, SEASON_INFO.matchday);
}

/**
 * Kupa fikstürünü üret — çeyrek final (8 takım, 4 maç).
 * P0 FIX: Kullanıcının takımı HER ZAMAN kupada olur.
 *  - Top 7 takım rating'e göre seçilir (kullanıcı hariç)
 *  - Kullanıcının takımı 8. takım olarak eklenir
 *  - İlk 3 maç bot vs bot, 4. maç kullanıcı vs 7. bot
 */
function buildCupFixtures(clubs: Team[], myTeamId: string | null): CupMatch[] {
  const sorted = [...clubs].sort((a, b) =>
    b.players.reduce((s, p) => s + p.rating, 0) -
    a.players.reduce((s, p) => s + p.rating, 0)
  );

  // Top 7 (kullanıcı hariç)
  const others = sorted.filter(c => c.id !== myTeamId).slice(0, 7);
  const myTeam = myTeamId ? clubs.find(c => c.id === myTeamId) : null;

  // Fisher-Yates shuffle — rastgele eşleşme
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }

  const cupMatches: CupMatch[] = [];

  // İlk 3 maç: bot vs bot (others'ın ilk 6'sı)
  for (let i = 0; i < 3 && others.length >= 6; i++) {
    cupMatches.push({
      round: 2,
      homeId: others[i * 2].id,
      awayId: others[i * 2 + 1].id,
      homeScore: null,
      awayScore: null,
      played: false,
    });
  }

  // 4. maç: myTeam vs others[6]
  if (myTeam && others[6]) {
    cupMatches.push({
      round: 2,
      homeId: myTeam.id,
      awayId: others[6].id,
      homeScore: null,
      awayScore: null,
      played: false,
    });
  } else if (others[6] && others[7]) {
    // Fallback: myTeam yoksa 4. maç da bot vs bot
    cupMatches.push({
      round: 2,
      homeId: others[6].id,
      awayId: others[7].id,
      homeScore: null,
      awayScore: null,
      played: false,
    });
  }

  return cupMatches;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function defaultTacticsFor(team: Team): Tactics {
  // FIX: FORMATION_SLOTS kullanarak doğru slot bazlı lineup doldur
  const formation = DEFAULT_TACTIC.formation || "4-4-2";
  const slots = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-4-2"];
  const used = new Set<string>();
  const lineup: (Player | null)[] = [];

  for (const slotPos of slots) {
    // P0 FIX: Sakat oyuncuları ele (!p.is_injured eklendi)
    // Önce tam pozisyon eşleşmesi
    let candidate = team.players
      .filter((p) => !used.has(p.id) && !p.is_injured && p.specificPosition === slotPos)
      .sort((a, b) => b.rating - a.rating)[0];

    // Yoksa aynı gruptan al
    if (!candidate) {
      const group = slotPos === "GK" ? "GK"
        : ["CB", "LB", "RB", "LWB", "RWB"].includes(slotPos) ? "DEF"
        : ["CDM", "CM", "CAM", "LM", "RM"].includes(slotPos) ? "MID" : "FWD";
      const groupPositions = group === "GK" ? ["GK"]
        : group === "DEF" ? ["CB", "LB", "RB", "LWB", "RWB"]
        : group === "MID" ? ["CDM", "CM", "CAM", "LM", "RM"]
        : ["LW", "RW", "ST", "CF"];
      candidate = team.players
        .filter((p) => !used.has(p.id) && !p.is_injured && groupPositions.includes(p.specificPosition))
        .sort((a, b) => b.rating - a.rating)[0];
    }

    // Hala yoksa en yüksek OVR'li boş oyuncu (sakat olmayan)
    if (!candidate) {
      candidate = team.players
        .filter((p) => !used.has(p.id) && !p.is_injured)
        .sort((a, b) => b.rating - a.rating)[0];
    }

    // Son çare: sakat bile olsa birini koy (kaleci hariç saha slotu için kaleci koyma)
    if (!candidate) {
      if (slotPos === "GK") {
        candidate = team.players
          .filter((p) => !used.has(p.id) && p.specificPosition === "GK")
          .sort((a, b) => b.rating - a.rating)[0] ?? null;
      } else {
        candidate = team.players
          .filter((p) => !used.has(p.id) && p.specificPosition !== "GK")
          .sort((a, b) => b.rating - a.rating)[0] ?? null;
      }
    }

    if (candidate) used.add(candidate.id);
    lineup.push(candidate ?? null);
  }

  return {
    active: { ...DEFAULT_TACTIC },
    lineup,
    slotRoles: {},
    activeInstructions: {},
    formationKey: "4-4-2",
    sliders: {
      attackingPressure: 55,
      defensiveLine: 50,
      tempo: 60,
      wingPlay: 65,
    },
    roles: {},
  };
}

export const useAppStore = create<AppState>()(
    (set, get) => ({
      isAuthed: false,
      managerName: "",
      myTeamId: null,
      seasonMatchday: 14,
      seasonNumber: 1,
      clubs: [],
      fixtures: [],
      news: [],
      tactics: {
        active: { ...DEFAULT_TACTIC },
        lineup: Array(11).fill(null),
        slotRoles: {},
        activeInstructions: {},
        formationKey: "4-4-2",
        sliders: {
          attackingPressure: 50,
          defensiveLine: 50,
          tempo: 50,
          wingPlay: 50,
        },
        roles: {},
      },
      transfer: {
        freeAgents: [],
        freeAgentListings: [],
        loanListings: [],
        watchlist: [],
        incomingOffers: [],
        myListedPlayers: [],
        messages: [],
      },
      training: getDefaultTrainingState(),
      facilities: {
        levels: { stadium: 0, pitch: 0, academy: 0, gym: 0, medical: 0, analysis: 0 },
        staff: [],
        activeUpgrade: null,
        ticketPrice: 60,
      },

      cup: {
        matches: [],
        currentRound: 0,
        champion: undefined,
        eliminated: false,
      },

      // P5: Sezon başı stats'ları — boş başlar, loginDemo'da doldurulur
      seasonStartStats: {},

      // ADDED: Sponsor sistemi — boş başlar
      sponsors: {
        active: [],
        offers: [],
      },

      // P0: Kredi sistemi — başlangıçta 50 kredi (2 hazırlık maçı bedava)
      credits: 50,

      loginDemo: (name) => {
        // Already-initialized clubs varsa yeniden üretme
        let clubs = get().clubs;
        if (clubs.length === 0) {
          clubs = buildInitialClubs();
        }
        let fixtures = get().fixtures;
        if (fixtures.length === 0) {
          fixtures = buildInitialFixtures(clubs);
        }

        let myTeamId = get().myTeamId;
        if (!myTeamId || !clubs.find((c) => c.id === myTeamId)) {
          const candidate = pickRandom(clubs);
          myTeamId = candidate.id;
        }

        const team = clubs.find((c) => c.id === myTeamId)!;
        // P2 FIX: Gerçekçi başlangıç bütçesi — lig tier'ına göre
        // 500M yerine: Süper Lig 25M, 1. Lig 12M, 2. Lig 6M, 3. Lig 3M
        // (test modu kaldırıldı, gerçek menajerlik hissi için)
        TIER_BASE_BUDGETS
        const tier = team.leagueTier ?? 2;
        const baseBudget = TIER_BASE_BUDGETS[tier] ?? TIER_BASE_BUDGETS[2];
        const realisticBudget = Math.round(baseBudget * 1.2); // %20 ekstra başlangıç
        if (team.budget < realisticBudget) {
          team.budget = realisticBudget;
          clubs = clubs.map((c) => (c.id === myTeamId ? { ...c, budget: realisticBudget } : c));
        }
        const tactics = defaultTacticsFor(team);

        // Transfer verisi — eksikse üret
        let transfer = get().transfer;
        if (transfer.freeAgents.length === 0 || !transfer.freeAgentListings || transfer.freeAgentListings.length === 0 || !transfer.loanListings || transfer.loanListings.length === 0) {
          transfer = {
            freeAgents: transfer.freeAgents.length > 0 ? transfer.freeAgents : generateFreeAgents(30),
            freeAgentListings: (transfer.freeAgentListings && transfer.freeAgentListings.length > 0) ? transfer.freeAgentListings : generateFreeAgentListings(15),
            loanListings: (transfer.loanListings && transfer.loanListings.length > 0) ? transfer.loanListings : generateLoanListings(clubs, 10),
            watchlist: transfer.watchlist ?? [],
            incomingOffers: transfer.incomingOffers.length > 0 ? transfer.incomingOffers : generateIncomingOffers(team.players),
            myListedPlayers: transfer.myListedPlayers ?? [],
            messages: transfer.messages ?? [],
          };
        }

        // Kupa fikstürünü üret — top 7 + kullanıcının takımı (zorunlu dahil)
        // P0 FIX: Kullanıcının takımı her zaman kupada olsun
        const cupMatches = buildCupFixtures(clubs, myTeamId);

        set({
          isAuthed: true,
          managerName: name || "Menajer",
          myTeamId,
          clubs,
          fixtures,
          tactics,
          transfer,
          cup: {
            matches: cupMatches,
            currentRound: 2,
            champion: undefined,
            eliminated: false,
          },
          // P5: Sezon başı stats'larını kaydet — gelişim rozeti için
          seasonStartStats: (() => {
            const map: Record<string, Record<string, number>> = {};
            for (const club of clubs) {
              for (const p of club.players) {
                map[p.id] = {
                  rating: p.rating ?? 50,
                  finishing: p.finishing ?? 50,
                  dribbling: p.dribbling ?? 50,
                  passing: p.passing ?? 50,
                  shooting: p.shooting ?? 50,
                  tackling: p.tackling ?? 50,
                  marking: p.marking ?? 50,
                  heading: p.heading ?? 50,
                  speed: p.speed ?? p.stats?.pace ?? 50,
                  stamina: p.stamina ?? 50,
                  strength: p.strength ?? 50,
                  vision: p.vision ?? 50,
                  technique: p.technique ?? 50,
                  crossing: p.crossing ?? 50,
                  longShots: p.longShots ?? 50,
                  firstTouch: p.firstTouch ?? 50,
                  offTheBall: p.offTheBall ?? 50,
                };
              }
            }
            return map;
          })(),
        });

        // P2: Sezon başında otomatik sponsor teklifleri üret
        try {
          const myTeam2 = clubs.find((c) => c.id === myTeamId);
          if (myTeam2) {
            const genOffers = generateSponsorOffers;
            const avgOvr2 = myTeam2.players.reduce((s, p) => s + p.rating, 0) / myTeam2.players.length;
            const offers = genOffers(myTeam2.leagueTier ?? 2, avgOvr2);
            useAppStore.setState({ sponsors: { active: [], offers } });
          }
        } catch (e) { /* sponsorSystem yoksa ignore */ }

        // ADDED: Başarım tetikleyici — login sonrası first_login başarımı
        try {
          if (typeof window !== "undefined") {
            checkAndAwardBadges({});
          }
        } catch (e) {
          console.warn("[achievements] login tetikleyici hatası:", e);
        }
      },

      logout: async () => {
        try {
          const { supabase } = await import("@/lib/supabase/client");
          await supabase().auth.signOut();
        } catch {}
        set({ isAuthed: false, myTeamId: null, managerName: "" });
      },

      setFormation: (key) => {
        const formation = FORMATIONS.find((f) => f.key === key);
        if (!formation) return;
        const { myTeamId, clubs } = get();
        const team = clubs.find((c) => c.id === myTeamId);
        if (!team) return;
        set({
          tactics: {
            ...get().tactics,
            formationKey: key,
            lineup: autoFillLineup(team, formation),
          },
        });
      },

      setSlider: (key, value) => {
        set({
          tactics: {
            ...get().tactics,
            sliders: { ...get().tactics.sliders, [key]: value },
          },
        });
      },

      swapLineupSlot: (slotIndex, playerId) => {
        const { tactics, clubs, myTeamId } = get();
        const team = clubs.find((c) => c.id === myTeamId);
        if (!team) return;
        const player = team.players.find((p) => p.id === playerId);
        if (!player) return;
        // P1 FIX: Sakat oyuncu dizilişe konmasın
        if (player.is_injured) return;
        // Eğer oyuncu başka slotta varsa, o slotu null yap
        const newLineup = [...tactics.lineup];
        for (let i = 0; i < newLineup.length; i++) {
          if (newLineup[i]?.id === playerId) newLineup[i] = null;
        }
        newLineup[slotIndex] = player;
        set({ tactics: { ...tactics, lineup: newLineup } });
      },

      setRole: (slotIndex, role) => {
        set({
          tactics: {
            ...get().tactics,
            roles: { ...get().tactics.roles, [slotIndex]: role },
          },
        });
      },

      // ===== Yeni taktik action'ları (ActiveTactic) =====
      updateActiveTactic: (patch) => {
        const { tactics } = get();
        const newActive = { ...tactics.active, ...patch };
        // Karşılıklı dışlayan toggle'ları yönet
        if (patch.pressing === true) {
          newActive.parkTheBus = false;
          newActive.wasteTime = false;
        }
        if (patch.parkTheBus === true) {
          newActive.pressing = false;
          newActive.offsideTrap = false;
        }
        if (patch.wasteTime === true) {
          newActive.pressing = false;
        }
        if (patch.offsideTrap === true) {
          newActive.parkTheBus = false;
        }
        // formation değiştiğinde lineup'ı yeniden doldur — FORMATION_SLOTS kullan
        let newLineup = tactics.lineup;
        if (patch.formation && patch.formation !== tactics.active.formation) {
          const team = get().clubs.find((c) => c.id === get().myTeamId);
          if (team) {
            const slots = FORMATION_SLOTS[patch.formation] ?? FORMATION_SLOTS["4-4-2"];
            const used = new Set<string>();
            newLineup = [];
            for (const slotPos of slots) {
              let candidate = team.players
                .filter((p) => !used.has(p.id) && !p.is_injured && p.specificPosition === slotPos)
                .sort((a, b) => b.rating - a.rating)[0];
              if (!candidate) {
                const group = slotPos === "GK" ? "GK"
                  : ["CB", "LB", "RB", "LWB", "RWB"].includes(slotPos) ? "DEF"
                  : ["CDM", "CM", "CAM", "LM", "RM"].includes(slotPos) ? "MID" : "FWD";
                const groupPositions = group === "GK" ? ["GK"]
                  : group === "DEF" ? ["CB", "LB", "RB", "LWB", "RWB"]
                  : group === "MID" ? ["CDM", "CM", "CAM", "LM", "RM"]
                  : ["LW", "RW", "ST", "CF"];
                candidate = team.players
                  .filter((p) => !used.has(p.id) && !p.is_injured && groupPositions.includes(p.specificPosition))
                  .sort((a, b) => b.rating - a.rating)[0];
              }
              // P0 FIX: Son çare fallback — kaleciyi SADECE GK slotu için al, saha slotu için ASLA
              if (!candidate) {
                if (slotPos === "GK") {
                  // GK slotu için kaleci al
                  candidate = team.players
                    .filter((p) => !used.has(p.id) && p.specificPosition === "GK")
                    .sort((a, b) => b.rating - a.rating)[0];
                } else {
                  // Saha slotu için kaleci HARİÇ en yüksek OVR'li oyuncu
                  candidate = team.players
                    .filter((p) => !used.has(p.id) && !p.is_injured && p.specificPosition !== "GK")
                    .sort((a, b) => b.rating - a.rating)[0];
                }
              }
              if (candidate) used.add(candidate.id);
              newLineup.push(candidate ?? null);
            }
          }
        }
        set({
          tactics: {
            ...tactics,
            active: newActive,
            lineup: newLineup,
            formationKey: newActive.formation,
            // P1 FIX: Formation değişince slotRoles sıfırla — pozisyonlar değişti, roller artık uyumsuz
            slotRoles: patch.formation && patch.formation !== tactics.active.formation ? {} : tactics.slotRoles,
          },
        });
      },

      setSlotRole: (slotIndex, roleId) => {
        const { tactics } = get();
        set({
          tactics: {
            ...tactics,
            slotRoles: { ...tactics.slotRoles, [slotIndex]: roleId },
          },
        });
      },

      // P0: Kaptan seç — special_role'ü "kaptan" yap, diğerlerini temizle
      setCaptain: (playerId) => {
        const { clubs, myTeamId } = get();
        const clubs_ = clubs.map(c => {
          if (c.id !== myTeamId) return c;
          return {
            ...c,
            players: c.players.map(p => ({
              ...p,
              special_role: p.id === playerId ? "kaptan" : null,
            })),
          };
        });
        set({ clubs: clubs_ });
      },

      setInstruction: (name, option) => {
        const { tactics } = get();
        set({
          tactics: {
            ...tactics,
            activeInstructions: { ...tactics.activeInstructions, [name]: option },
          },
        });
      },

      resetInstruction: (name) => {
        const { tactics } = get();
        const next = { ...tactics.activeInstructions };
        delete next[name];
        set({
          tactics: { ...tactics, activeInstructions: next },
        });
      },

      // ===== Transfer actions =====
      toggleWatchlist: (playerId) => {
        const { transfer } = get();
        const inList = transfer.watchlist.includes(playerId);
        set({
          transfer: {
            ...transfer,
            watchlist: inList
              ? transfer.watchlist.filter((id) => id !== playerId)
              : [...transfer.watchlist, playerId],
          },
        });
      },

      buyPlayer: (playerId, fee, wage, contractYears) => {
        const { clubs, myTeamId, transfer } = get();
        const team = clubs.find((c) => c.id === myTeamId);
        if (!team) return { success: false, reason: "no-team" };

        // P1 FIX: Transfer penceresi kontrolü
        if (!isTransferWindowOpen()) {
          return { success: false, reason: "window-closed" };
        }

        // Toplam maliyet (transfer + %5 agent + %3 imza)
        const total = fee + Math.round(fee * 0.05) + Math.round(fee * 0.03);
        if (team.budget < total) {
          return { success: false, reason: "budget" };
        }

        // P1 FIX: Kadro limiti (25 oyuncu)
        if (team.players.length >= 25) {
          return { success: false, reason: "squad-full" };
        }

        // P0 FIX: Kaleci limiti (max 3)
        const targetPlayer = transfer.freeAgents.find((l) => l.player.id === playerId)?.player;
        if (targetPlayer?.specificPosition === "GK") {
          const gkCount = team.players.filter(p => p.specificPosition === "GK").length;
          if (gkCount >= 3) {
            return { success: false, reason: "gk-limit" };
          }
        }

        // Listing bul
        const listing = transfer.freeAgents.find((l) => l.player.id === playerId);
        if (!listing) return { success: false, reason: "not-found" };

        // Teklif kontrolü — istilen fiyatın %85'i altında reddedilir
        if (fee < listing.askingPrice * 0.85) {
          return { success: false, reason: "too-low" };
        }

        // Atomik işlem: bütçe düş, oyuncu kadroya ekle (P0 FIX: wage/contractYears uygula), free agent'tan çıkar
        const newPlayer = {
          ...listing.player,
          weeklyWage: wage,
          salary: wage,
          contractYears: contractYears,
        };
        const updatedTeam = { ...team, budget: team.budget - total, players: [...team.players, newPlayer] };
        const updatedClubs = clubs.map((c) => (c.id === team.id ? updatedTeam : c));

        set({
          clubs: updatedClubs,
          transfer: {
            ...transfer,
            freeAgents: transfer.freeAgents.filter((l) => l.player.id !== playerId),
            watchlist: transfer.watchlist.filter((id) => id !== playerId),
          },
        });

        return { success: true };
      },

      makeTransferOffer: (playerId, fee, wage, contractYears) => {
        const { clubs, myTeamId, news, transfer } = get();
        const myTeam = clubs.find((c) => c.id === myTeamId);
        if (!myTeam) return { success: false, reason: "no-team" };

        // P1 FIX: Transfer penceresi kontrolü
        if (!isTransferWindowOpen()) {
          return { success: false, reason: "window-closed" };
        }

        // Toplam maliyet: transfer ücreti + %5 agent + %3 imza
        const total = fee + Math.round(fee * 0.05) + Math.round(fee * 0.03);
        if (myTeam.budget < total) {
          return { success: false, reason: "budget" };
        }

        // P0 FIX: Kadro limiti (25 oyuncu)
        if (myTeam.players.length >= 25) {
          return { success: false, reason: "squad-full" };
        }

        // P0 FIX: Kaleci limiti (max 3) — hedef oyuncuyu bul, kaleciyse kontrol et
        let targetPlayerPos: string | undefined;
        for (const c of clubs) {
          if (c.id === myTeamId) continue;
          const p = c.players.find((p) => p.id === playerId);
          if (p) { targetPlayerPos = p.specificPosition; break; }
        }
        if (!targetPlayerPos) {
          const faListing = transfer.freeAgents.find((l) => l.player.id === playerId);
          if (faListing) targetPlayerPos = faListing.player.specificPosition;
        }
        if (targetPlayerPos === "GK") {
          const gkCount = myTeam.players.filter(p => p.specificPosition === "GK").length;
          if (gkCount >= 3) {
            return { success: false, reason: "gk-limit" };
          }
        }

        // Oyuncunun sahibi olan takımı bul (kullanıcının takımı hariç)
        let sellerTeam: Team | undefined;
        let player: any;
        for (const c of clubs) {
          if (c.id === myTeamId) continue;
          const p = c.players.find((p) => p.id === playerId);
          if (p) { sellerTeam = c; player = p; break; }
        }

        // Bulunamadıysa — serbest ajan listelerinde ara (BOTH lists)
        if (!sellerTeam || !player) {
          // transfer.freeAgents (TransferListing)
          const faListing = transfer.freeAgents.find((l) => l.player.id === playerId);
          if (faListing) {
            if (myTeam.budget < fee) return { success: false, reason: "budget" };
            myTeam.budget -= fee;
            const newPlayer = { ...faListing.player, weeklyWage: wage, salary: wage };
            myTeam.players = [...myTeam.players, newPlayer];
            // ADDED: Transfer bildirimi — haber + mesaj
            const newMsg: MessageItem = {
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              kind: "transfer_accepted",
              fromTeamName: "Serbest Oyuncu",
              fromTeamShort: "SER",
              message: `${newPlayer.firstName} ${newPlayer.lastName} takımınıza katıldı. Transfer ücreti: ${formatEuroShort(fee)}.`,
              at: Date.now(),
              read: false,
              amount: fee,
              playerId,
            };
            const newNews: NewsItem = {
              id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              category: "transfer",
              headline: "Transfer Tamamlandı",
              body: `${newPlayer.firstName} ${newPlayer.lastName} takımınıza katıldı. Transfer ücreti: ${formatEuroShort(fee)}.`,
              timestamp: Date.now(),
              importance: 2,
              read: false,
              playerId,
            };
            set({
              clubs: [...clubs],
              news: [newNews, ...(get().news ?? [])],
              transfer: { ...transfer, freeAgents: transfer.freeAgents.filter((l) => l.player.id !== playerId), messages: [newMsg, ...transfer.messages] },
            });
            return { success: true, response: "accepted" };
          }
          // transfer.freeAgentListings (FreeAgentListing)
          const faListing2 = transfer.freeAgentListings?.find((l) => l.player.id === playerId);
          if (faListing2) {
            if (myTeam.budget < fee) return { success: false, reason: "budget" };
            myTeam.budget -= fee;
            const newPlayer = { ...faListing2.player, weeklyWage: wage, salary: wage };
            myTeam.players = [...myTeam.players, newPlayer];
            // ADDED: Transfer bildirimi — haber + mesaj
            const newMsg2: MessageItem = {
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              kind: "transfer_accepted",
              fromTeamName: "Takımsız Oyuncu",
              fromTeamShort: "TAZ",
              message: `${newPlayer.firstName} ${newPlayer.lastName} takımınıza katıldı (takımsız). İmza bonusu: ${formatEuroShort(fee)}.`,
              at: Date.now(),
              read: false,
              amount: fee,
              playerId,
            };
            const newNews2: NewsItem = {
              id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              category: "transfer",
              headline: "Takımsız Oyuncu Transferi",
              body: `${newPlayer.firstName} ${newPlayer.lastName} takımınıza katıldı. İmza bonusu: ${formatEuroShort(fee)}.`,
              timestamp: Date.now(),
              importance: 2,
              read: false,
              playerId,
            };
            set({
              clubs: [...clubs],
              news: [newNews2, ...(get().news ?? [])],
              transfer: { ...transfer, freeAgentListings: transfer.freeAgentListings?.filter((l) => l.player.id !== playerId) ?? [], messages: [newMsg2, ...transfer.messages] },
            });
            return { success: true, response: "accepted" };
          }
          return { success: false, reason: "not-found" };
        }

        const marketValue = player.marketValue ?? player.market_value ?? 0;

        // Bot takımın karar verme mantığı
        // fee >= %100 → kabul
        // fee >= %85 → kabul
        // fee >= %70 → karşı teklif (marketValue * 0.95)
        // fee < %70 → reddet
        const ratio = marketValue > 0 ? fee / marketValue : 1;
        let response: "accepted" | "rejected" | "countered" = "rejected";
        let counterFee = 0;

        if (ratio >= 0.85) {
          response = "accepted";
        } else if (ratio >= 0.70) {
          response = "countered";
          counterFee = Math.round(marketValue * 0.95);
        } else {
          response = "rejected";
        }

        if (response === "accepted") {
          // Transferi gerçekleştir
          myTeam.budget -= total;
          sellerTeam.budget += fee;
          // Oyuncuyu satıcıdan al, alıcıya ekle
          sellerTeam.players = sellerTeam.players.filter((p) => p.id !== playerId);
          myTeam.players = [...myTeam.players, player];
          // Maaş güncelle
          player.weeklyWage = wage;
          player.salary = wage;

          // Haber ekle
          const newNews: NewsItem = {
            id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            category: "transfer",
            headline: "Transfer Kabul Edildi",
            body: `${player.firstName} ${player.lastName} ${sellerTeam.name} takımından ${formatEuroShort(fee)} karşılığında transfer edildi.`,
            timestamp: Date.now(),
            importance: 2,
            read: false,
          };

          // P0#3 FIX: Mesaj ekle — transfer.messages'a da yaz
          const newMsg: MessageItem = {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            kind: "transfer_accepted",
            fromTeamName: sellerTeam.name,
            fromTeamShort: sellerTeam.shortName,
            fromTeamColor: sellerTeam.primaryColor,
            message: `${player.firstName} ${player.lastName} için ${formatEuroShort(fee)} teklifiniz KABUL EDİLDİ. Oyuncu kadronuza eklendi.`,
            at: Date.now(),
            read: false,
            amount: fee,
            playerId,
          };

          set({
            clubs: [...clubs],
            news: [newNews, ...news],
            transfer: { ...transfer, messages: [newMsg, ...transfer.messages] },
          });

          return { success: true, response: "accepted" };
        } else if (response === "countered") {
          // Karşı teklif mesajı ekle
          const offerId = `offer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const newNews: NewsItem = {
            id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            category: "transfer",
            headline: "Karşı Teklif",
            body: `${sellerTeam.name}, ${player.firstName} ${player.lastName} için ${formatEuroShort(fee)} teklifinizi reddetti. Karşı teklif: ${formatEuroShort(counterFee)}.`,
            timestamp: Date.now(),
            importance: 1,
            read: false,
          };

          // P0#3 FIX: Mesaj ekle — counter teklif mesaj olarak yazılır (kabul/red yapılabilsin)
          const newMsg: MessageItem = {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            kind: "transfer_negotiated",
            fromTeamName: sellerTeam.name,
            fromTeamShort: sellerTeam.shortName,
            fromTeamColor: sellerTeam.primaryColor,
            message: `${sellerTeam.name}, ${player.firstName} ${player.lastName} için ${formatEuroShort(fee)} teklifinizi reddetti. Karşı teklif: ${formatEuroShort(counterFee)}.`,
            at: Date.now(),
            read: false,
            amount: counterFee,
            counterOffer: counterFee,
            relatedOfferId: offerId,
            playerId,
          };

          set({
            news: [newNews, ...news],
            transfer: { ...transfer, messages: [newMsg, ...transfer.messages] },
          });
          return { success: true, response: "countered", counterFee };
        } else {
          // Reddedildi
          const newNews: NewsItem = {
            id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            category: "transfer",
            headline: "Teklif Reddedildi",
            body: `${sellerTeam.name}, ${player.firstName} ${player.lastName} için ${formatEuroShort(fee)} teklifinizi reddetti. Teklif çok düşük.`,
            timestamp: Date.now(),
            importance: 1,
            read: false,
          };

          // P0#3 FIX: Mesaj ekle
          const newMsg: MessageItem = {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            kind: "transfer_rejected",
            fromTeamName: sellerTeam.name,
            fromTeamShort: sellerTeam.shortName,
            fromTeamColor: sellerTeam.primaryColor,
            message: `${sellerTeam.name}, ${player.firstName} ${player.lastName} için ${formatEuroShort(fee)} teklifinizi REDDETTİ.`,
            at: Date.now(),
            read: false,
            amount: fee,
            playerId,
          };

          set({
            news: [newNews, ...news],
            transfer: { ...transfer, messages: [newMsg, ...transfer.messages] },
          });
          return { success: true, response: "rejected" };
        }
      },

      makeLoanOffer: (playerId, loanFee, weeks) => {
        const { clubs, myTeamId, news, transfer } = get();
        const myTeam = clubs.find((c) => c.id === myTeamId);
        if (!myTeam) return { success: false, reason: "no-team" };

        // P1 FIX: Kadro limiti kontrolü (25 oyuncu)
        if (myTeam.players.length >= 25) {
          return { success: false, reason: "squad-full" };
        }

        // Kira maliyeti = loanFee (toplam)
        if (myTeam.budget < loanFee) {
          return { success: false, reason: "budget" };
        }

        // Oyuncunun sahibi olan takımı bul
        let sellerTeam: Team | undefined;
        let player: any;
        for (const c of clubs) {
          if (c.id === myTeamId) continue;
          const p = c.players.find((p) => p.id === playerId);
          if (p) { sellerTeam = c; player = p; break; }
        }
        if (!sellerTeam || !player) {
          // Serbest ajan kontrolü — onlar kiralanamaz
          const isFreeAgent = transfer.freeAgents.some(l => l.player.id === playerId)
            || (transfer.freeAgentListings?.some(l => l.player.id === playerId) ?? false);
          if (isFreeAgent) {
            return { success: false, reason: "free-agent" };
          }
          return { success: false, reason: "not-found" };
        }

        // P0 FIX: Kaleci limiti (max 3)
        if (player.specificPosition === "GK") {
          const gkCount = myTeam.players.filter(p => p.specificPosition === "GK").length;
          if (gkCount >= 3) {
            return { success: false, reason: "gk-limit" };
          }
        }

        const marketValue = player.marketValue ?? player.market_value ?? 0;
        // Bot kiralama kararı: min ücret = marketValue * 0.02 * hafta
        const minLoanFee = Math.round(marketValue * 0.02 * weeks);

        if (loanFee >= minLoanFee) {
          // Kabul edildi — oyuncuyu kiralık ver
          myTeam.budget -= loanFee;
          sellerTeam.budget += loanFee;
          // P0 FIX: Oyuncuyu satıcıdan ÇIKAR (kiralık olduğu için artık oynayamaz)
          // Yeni takımına ekle, _loaned flag'i ile
          sellerTeam.players = sellerTeam.players.filter(p => p.id !== playerId);
          myTeam.players = [...myTeam.players, {
            ...player,
            is_free_agent: false,
            _loaned: true,
            _loanWeeks: weeks,
            _loanFrom: sellerTeam.id, // İade için kaynak takım
          }];

          const newNews: NewsItem = {
            id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            category: "transfer",
            headline: "Kiralama Kabul Edildi",
            body: `${player.firstName} ${player.lastName} ${sellerTeam.name} takımından ${weeks} haftalığına kiralandı. Ücret: ${formatEuroShort(loanFee)}.`,
            timestamp: Date.now(),
            importance: 2,
            read: false,
          };

          set({
            clubs: [...clubs],
            news: [newNews, ...news],
          });

          return { success: true, response: "accepted" };
        } else {
          const newNews: NewsItem = {
            id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            category: "transfer",
            headline: "Kiralama Reddedildi",
            body: `${sellerTeam.name}, ${player.firstName} ${player.lastName} için kiralama teklifinizi reddetti. Teklif çok düşük.`,
            timestamp: Date.now(),
            importance: 1,
            read: false,
          };

          set({ news: [newNews, ...news] });
          return { success: true, response: "rejected" };
        }
      },

      acceptOffer: (offerId) => {
        const { clubs, myTeamId, transfer, news } = get();
        const team = clubs.find((c) => c.id === myTeamId);
        if (!team) return { success: false };

        const offer = transfer.incomingOffers.find((o) => o.id === offerId);
        if (!offer) return { success: false };

        // Oyuncu takımda mı?
        const player = team.players.find((p) => p.id === offer.myPlayerId);
        if (!player) return { success: false, reason: "not-in-team" };

        // Satıştan %2.5 vergi düş, kalan bütçeye ekle
        const tax = Math.round(offer.offerAmount * 0.025);
        const net = offer.offerAmount - tax;

        // P0 FIX: Alıcı bot takımını bul
        // 1. buyerTeamId varsa ve gerçek kulüp ID'siyle eşleşiyorsa onu kullan
        // 2. Eşleşmiyorsa (sahte ID) bütçesi yeterli rastgele bir bot seç
        let buyerTeam = offer.buyerTeamId
          ? clubs.find((c) => c.id === offer.buyerTeamId)
          : null;
        if (!buyerTeam) {
          // Sahte buyerTeamId veya buyerTeamId yok — bütçesi yeterli rastgele bot seç
          const candidates = clubs.filter((c) =>
            c.id !== myTeamId && c.is_bot && c.budget >= offer.offerAmount
          );
          if (candidates.length > 0) {
            buyerTeam = candidates[Math.floor(Math.random() * candidates.length)];
          }
        }

        const updatedPlayer = {
          ...player,
          weeklyWage: offer.wageOffer ?? player.weeklyWage,
          salary: offer.wageOffer ?? player.salary,
        };

        const updatedClubs = clubs.map((c) => {
          if (c.id === team.id) {
            return { ...c, budget: c.budget + net, players: c.players.filter((p) => p.id !== offer.myPlayerId) };
          }
          if (buyerTeam && c.id === buyerTeam.id) {
            return {
              ...c,
              budget: Math.max(0, c.budget - offer.offerAmount),
              players: [...c.players, updatedPlayer],
            };
          }
          return c;
        });

        // P0 FIX: Haber ekle
        const newNews: NewsItem = {
          id: `news_sale_${offer.myPlayerId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          category: "transfer",
          headline: "Oyuncu Satıldı",
          body: `${player.firstName} ${player.lastName} ${buyerTeam?.name ?? "bir kulübe"} ${formatEuroShort(offer.offerAmount)} karşılığında satıldı.`,
          timestamp: Date.now(),
          importance: 3,
          read: false,
          playerId: player.id,
        };

        set({
          clubs: updatedClubs,
          news: [newNews, ...news],
          transfer: {
            ...transfer,
            // P0 FIX: Satılan oyuncuya ait TÜM teklifleri temizle (sadece kabul edileni değil)
            incomingOffers: transfer.incomingOffers.filter((o) => o.myPlayerId !== offer.myPlayerId),
            myListedPlayers: transfer.myListedPlayers.filter(
              (l) => l.playerId !== offer.myPlayerId
            ),
          },
        });

        return { success: true, salePrice: offer.offerAmount };
      },

      rejectOffer: (offerId) => {
        const { transfer } = get();
        set({
          transfer: {
            ...transfer,
            incomingOffers: transfer.incomingOffers.filter((o) => o.id !== offerId),
          },
        });
      },

      listPlayerForSale: (playerId, askingPrice) => {
        const { transfer } = get();
        // Aynı oyuncu zaten listede mi?
        if (transfer.myListedPlayers.some((l) => l.playerId === playerId)) return;
        set({
          transfer: {
            ...transfer,
            myListedPlayers: [
              ...transfer.myListedPlayers,
              { playerId, askingPrice },
            ],
          },
        });
      },

      unlistPlayer: (playerId) => {
        const { transfer } = get();
        set({
          transfer: {
            ...transfer,
            myListedPlayers: transfer.myListedPlayers.filter(
              (l) => l.playerId !== playerId
            ),
          },
        });
      },

      // ===== Training actions =====
      assignProgram: (playerId, programId) => {
        const training = get().training;
        const existing = training.assignments.find((a) => a.playerId === playerId);
        let newAssignments;
        if (existing) {
          newAssignments = training.assignments.map((a) =>
            a.playerId === playerId ? { ...a, programId } : a
          );
        } else {
          newAssignments = [...training.assignments, { playerId, programId }];
        }
        set({ training: { ...training, assignments: newAssignments } });
      },

      unassignPlayer: (playerId) => {
        const training = get().training;
        set({
          training: {
            ...training,
            assignments: training.assignments.filter((a) => a.playerId !== playerId),
          },
        });
      },

      runSession: (multiplier) => {
        const { clubs, myTeamId, training, facilities } = get();
        const team = clubs.find((c) => c.id === myTeamId);
        if (!team) return { success: false, reason: "no-team" };

        // Günlük limit kontrolü
        const today = todayKey();
        let todayCount = training.dailyCount;
        if (training.lastTrainingDate !== today) {
          todayCount = 0;
        }
        // Günde 2 antrenman (15:00 ve 21:00 penceresinde)
        if (todayCount >= 2) {
          return { success: false, reason: "daily-limit" };
        }

        const facilityLevel = facilities.levels.pitch;
        // ADDED: Coach bonus — antrenman çarpanını artır
        let effectiveMultiplier = multiplier;
        try {
          
          // multiplier'ı coach bonus ile artır (örn: 1.0 → 1.0 * (1 + 0.10) = 1.10)
          const boosted = applyCoachTrainingBoost(multiplier, facilities.staff);
          effectiveMultiplier = boosted;
        } catch (e) { /* staffBonus yüklenemezse default multiplier */ }
        const results = runTrainingSession(team.players, training, facilityLevel, effectiveMultiplier);

        // Sonuçları kadroya uygula
        const updatedPlayers = applyResultsToSquad(team.players, results);
        const updatedTeam = { ...team, players: updatedPlayers };
        const updatedClubs = clubs.map((c) => (c.id === team.id ? updatedTeam : c));

        // Slot güncelle
        const nextSlot: "morning" | "afternoon" = todayCount === 0 ? "afternoon" : "morning";

        set({
          clubs: updatedClubs,
          training: {
            ...training,
            dailyCount: todayCount + 1,
            lastTrainingDate: today,
            sessionSlot: nextSlot,
            lastSessionResults: results,
          },
        });

        return { success: true, results };
      },

      assignMentor: (mentorId, menteeId) => {
        const training = get().training;
        set({ training: assignMentorFn(training, mentorId, menteeId) });
      },

      removeMentor: (menteeId) => {
        const training = get().training;
        set({ training: removeMentorFn(training, menteeId) });
      },

      // ===== Facilities actions =====
      upgradeFacility: (facilityId) => {
        const { clubs, myTeamId, facilities } = get();
        const team = clubs.find((c) => c.id === myTeamId);
        if (!team) return { success: false, reason: "no-team" };

        if (facilities.activeUpgrade) {
          return { success: false, reason: "upgrade-in-progress" };
        }

        const currentLevel = facilities.levels[facilityId];
        if (currentLevel >= 10) {
          return { success: false, reason: "max-level" };
        }

        // Maliyet: 250K × 2.2^level
        const cost = Math.floor(250000 * Math.pow(2.2, currentLevel));
        if (team.budget < cost) {
          return { success: false, reason: "budget" };
        }

        // Süre: 2 gün (level ≤2), sonra 2 × 1.5^(level-2)
        const days = currentLevel <= 1 ? 2 : Math.floor(2 * Math.pow(1.5, currentLevel - 2));
        const now = Date.now();
        const finishAt = now + days * 24 * 60 * 60 * 1000;

        team.budget -= cost;

        set({
          clubs: [...clubs],
          facilities: {
            ...facilities,
            activeUpgrade: {
              facilityId,
              startedAt: now,
              finishAt,
              cost,
            },
          },
        });

        return { success: true };
      },

      cancelUpgrade: () => {
        const { clubs, myTeamId, facilities } = get();
        const team = clubs.find((c) => c.id === myTeamId);
        if (!team || !facilities.activeUpgrade) return;

        // %50 iade
        const refund = Math.floor(facilities.activeUpgrade.cost * 0.5);
        team.budget += refund;

        set({
          clubs: [...clubs],
          facilities: { ...facilities, activeUpgrade: null },
        });
      },

      completeUpgradeIfDue: () => {
        const { facilities } = get();
        if (!facilities.activeUpgrade) return;
        if (Date.now() < facilities.activeUpgrade.finishAt) return;

        const fid = facilities.activeUpgrade.facilityId;
        if (fid === "staff" || fid === null) {
          set({ facilities: { ...facilities, activeUpgrade: null } });
          return;
        }

        set({
          facilities: {
            ...facilities,
            levels: {
              ...facilities.levels,
              [fid]: facilities.levels[fid] + 1,
            },
            activeUpgrade: null,
          },
        });
      },

      hireStaff: (type, stars) => {
        const { clubs, myTeamId, facilities } = get();
        const team = clubs.find((c) => c.id === myTeamId);
        if (!team) return { success: false, reason: "no-team" };

        // Personel limiti
        const sameType = facilities.staff.filter((s) => s.type === type).length;
        const limits: Record<string, number> = {
          scout: 3, coach: 3, physio: 3, analyst: 2, youth_coordinator: 2, sporting_director: 1,
        };
        if (sameType >= limits[type]) {
          return { success: false, reason: "limit" };
        }

        // Ücret tablosu (basit)
        const baseFee: Record<string, number> = {
          scout: 400_000, coach: 650_000, physio: 200_000, analyst: 150_000,
          youth_coordinator: 450_000, sporting_director: 350_000,
        };
        const hireFee = Math.round(baseFee[type] * (1 + (stars - 1) * 0.2));
        if (team.budget < hireFee) {
          return { success: false, reason: "budget" };
        }

        team.budget -= hireFee;
        const names = ["Ahmet", "Mehmet", "Burak", "Serkan", "Emre", "Volkan", "Levent", "Cemal"];
        const surnames = ["Yıldız", "Demir", "Şahin", "Çelik", "Koç", "Aksoy", "Polat", "Erdoğan"];
        const name = `${names[Math.floor(Math.random() * names.length)]} ${surnames[Math.floor(Math.random() * surnames.length)]}`;

        const newStaff: StaffMember = {
          id: `staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type,
          name,
          stars,
          hireFee,
          weeklyWage: Math.floor(hireFee / 52),
        };

        set({
          clubs: [...clubs],
          facilities: { ...facilities, staff: [...facilities.staff, newStaff] },
        });

        return { success: true };
      },

      fireStaff: (staffId) => {
        const { facilities } = get();
        set({
          facilities: {
            ...facilities,
            staff: facilities.staff.filter((s) => s.id !== staffId),
          },
        });
      },

      setTicketPrice: (price) => {
        const { facilities } = get();
        set({ facilities: { ...facilities, ticketPrice: Math.max(0, Math.min(150, price)) } });
      },

      // ===== Cup actions =====
      playCupRound: () => {
        const { cup, clubs, myTeamId } = get();
        if (cup.champion) return { success: false };

        const currentMatches = cup.matches.filter(m => m.round === cup.currentRound && !m.played);
        if (currentMatches.length === 0) return { success: false };

        // Tur etiketleri — log ve haber için
        const ROUND_NAMES: Record<number, string> = {
          2: "Çeyrek Final",
          3: "Yarı Final",
          4: "Final",
        };
        const playedRoundLabel = ROUND_NAMES[cup.currentRound] ?? `Tur ${cup.currentRound}`;

        // P1 FIX: Kullanıcının maçını enhanced motorla oyna, diğerlerini basit sim'le
        // Enhanced motor: taktikler, formasyon, sakat filtreleme, kondisyon etkisi

        // Basit simülasyon — bot vs bot maçları için (önce tanımla, simulateUserCupMatch fallback olarak kullanır)
        // P2 FIX: rating sıralaması + sakat filtresi eklendi (advanceMatchday ile tutarlı)
        const simpleCupSim = (home: any, away: any): { hs: number; as: number } => {
          const homeXI = [...home.players]
            .filter((p: any) => !p.is_injured)
            .sort((a: any, b: any) => b.rating - a.rating)
            .slice(0, 11);
          const awayXI = [...away.players]
            .filter((p: any) => !p.is_injured)
            .sort((a: any, b: any) => b.rating - a.rating)
            .slice(0, 11);
          const homeStr = homeXI.reduce((s: number, p: any) => s + p.rating, 0) / Math.max(1, homeXI.length);
          const awayStr = awayXI.reduce((s: number, p: any) => s + p.rating, 0) / Math.max(1, awayXI.length);
          const diff = homeStr - awayStr;
          const homeAdv = diff > 5 ? 0.3 : diff < -5 ? -0.3 : 0;
          let hs = Math.max(0, Math.floor(Math.random() * 4 + homeAdv * 2));
          let as = Math.max(0, Math.floor(Math.random() * 3 - homeAdv * 2));
          if (hs === as) hs += 1; // beraberlik olmasın
          return { hs, as };
        };

        const simulateUserCupMatch = (homeId: string, awayId: string): { hs: number; as: number } => {
          const home = clubs.find(c => c.id === homeId);
          const away = clubs.find(c => c.id === awayId);
          if (!home || !away) return { hs: 0, as: 0 };
          try {
            
            
            const userTactic = get().tactics.active ?? DEFAULT_TACTIC;
            const isHome = homeId === myTeamId;
            const homeTactic = isHome ? userTactic : { ...DEFAULT_TACTIC, formation: "4-4-2" };
            const awayTactic = isHome ? { ...DEFAULT_TACTIC, formation: "4-4-2" } : userTactic;
            const pickXI = (players: any[]) =>
              [...players].filter((p) => !p.is_injured).sort((a, b) => b.rating - a.rating).slice(0, 11);
            const result = simulateEnhancedMatch(
              pickXI(home.players),
              pickXI(away.players),
              homeTactic,
              awayTactic,
              { homeTeamName: home.name, awayTeamName: away.name }
            );
            let hs = result.homeScore;
            let as = result.awayScore;
            // Kupa = eleme — beraberlik olamaz, penaltılara gerek yok (rastgele)
            if (hs === as) {
              if (Math.random() < 0.5) hs += 1; else as += 1;
            }
            return { hs, as };
          } catch (e) {
            console.warn("[playCupRound] enhanced sim hatası, basit sim'e düşülüyor:", e);
            return simpleCupSim(home, away);
          }
        };

        const simulateCupMatch = (homeId: string, awayId: string): { hs: number; as: number } => {
          const home = clubs.find(c => c.id === homeId);
          const away = clubs.find(c => c.id === awayId);
          if (!home || !away) return { hs: 0, as: 0 };
          // Kullanıcının maçı → enhanced motor + taktikler
          if (homeId === myTeamId || awayId === myTeamId) {
            return simulateUserCupMatch(homeId, awayId);
          }
          // Bot vs bot → basit sim
          return simpleCupSim(home, away);
        };

        const updatedMatches = cup.matches.map(m => {
          if (m.round !== cup.currentRound || m.played) return m;
          const { hs, as: asNum } = simulateCupMatch(m.homeId, m.awayId);
          return { ...m, homeScore: hs, awayScore: asNum, played: true };
        });

        // Adım 3: Kupa maçlarında oyunculara gol/asist dağıt — Gol Kralı resmi maçları kapsar
        const pickScorerCup = (players: any[]) => {
          const attackers = players.filter(p => p.specificPosition !== "GK" && !p.is_injured);
          if (attackers.length === 0) return null;
          const forwards = attackers.filter(p => ["ST", "CF", "LW", "RW", "LM", "RM", "CAM"].includes(p.specificPosition));
          const pool = forwards.length > 0 && Math.random() > 0.3 ? forwards : attackers;
          return pool[Math.floor(Math.random() * pool.length)];
        };

        const allClubsForCup = [...clubs];
        for (const m of updatedMatches) {
          if (m.round !== cup.currentRound || !m.played) continue;
          const homeTeam = allClubsForCup.find(c => c.id === m.homeId);
          const awayTeam = allClubsForCup.find(c => c.id === m.awayId);
          if (!homeTeam || !awayTeam) continue;

          // Home goals dağıt
          for (let i = 0; i < (m.homeScore ?? 0); i++) {
            const scorer = pickScorerCup(homeTeam.players);
            if (scorer) {
              scorer.goals = (scorer.goals ?? 0) + 1;
              scorer.appearances = (scorer.appearances ?? 0) + 1;
              const assistPool = homeTeam.players.filter(p => p.id !== scorer?.id && p.specificPosition !== "GK");
              if (assistPool.length > 0 && Math.random() > 0.4) {
                const assister = assistPool[Math.floor(Math.random() * assistPool.length)];
                assister.assists = (assister.assists ?? 0) + 1;
              }
            }
          }
          // Away goals dağıt
          for (let i = 0; i < (m.awayScore ?? 0); i++) {
            const scorer = pickScorerCup(awayTeam.players);
            if (scorer) {
              scorer.goals = (scorer.goals ?? 0) + 1;
              scorer.appearances = (scorer.appearances ?? 0) + 1;
              const assistPool = awayTeam.players.filter(p => p.id !== scorer?.id && p.specificPosition !== "GK");
              if (assistPool.length > 0 && Math.random() > 0.4) {
                const assister = assistPool[Math.floor(Math.random() * assistPool.length)];
                assister.assists = (assister.assists ?? 0) + 1;
              }
            }
          }
        }

        // Kullanıcının sonucu
        let myResult: string | undefined;
        const myMatch = currentMatches.find(m => m.homeId === myTeamId || m.awayId === myTeamId);
        let eliminated = cup.eliminated;
        if (myMatch) {
          const played = updatedMatches.find(m => m.homeId === myMatch.homeId && m.awayId === myMatch.awayId && m.round === myMatch.round);
          if (played && played.homeScore !== null) {
            const isHome = played.homeId === myTeamId;
            const myScore = isHome ? played.homeScore : played.awayScore;
            const oppScore = isHome ? played.awayScore : played.homeScore;
            if ((myScore ?? 0) > (oppScore ?? 0)) {
              myResult = `🎉 Tur atladınız! ${myScore}-${oppScore}`;
            } else {
              myResult = `😢 Kupadan elendiniz. ${myScore}-${oppScore}`;
              eliminated = true;
            }
          }
        }

        // Kazananları belirle
        const winners = updatedMatches
          .filter(m => m.round === cup.currentRound && m.played)
          .map(m => ((m.homeScore ?? 0) > (m.awayScore ?? 0)) ? m.homeId : m.awayId);

        const nextRound = cup.currentRound + 1;
        let nextMatches: CupMatch[] = [];
        if (winners.length >= 2) {
          for (let i = 0; i < winners.length; i += 2) {
            if (winners[i + 1]) {
              nextMatches.push({ round: nextRound, homeId: winners[i], awayId: winners[i + 1], homeScore: null, awayScore: null, played: false });
            }
          }
        }

        // Şampiyon
        let champion: string | undefined;
        if (winners.length === 1 && nextMatches.length === 0) {
          champion = winners[0];
          if (champion === myTeamId) {
            const reward = 1_000_000;
            const t2 = allClubsForCup.find(c => c.id === myTeamId);
            if (t2) t2.budget += reward;
          }
        }

        // P1 FIX: Tur ödülü — tur atladıkça ödül ver (kullanıcı için)
        if (myMatch && !eliminated) {
          const ROUND_REWARD: Record<number, number> = { 2: 50_000, 3: 150_000, 4: 400_000 };
          const reward = ROUND_REWARD[cup.currentRound] ?? 0;
          if (reward > 0) {
            const t = allClubsForCup.find(c => c.id === myTeamId);
            if (t) t.budget += reward;
          }
        }

        // P0 FIX: championRound değişkenini sakla — set() sonrası log için
        const wasChampionSet = !!champion;

        set({
          clubs: allClubsForCup,
          cup: {
            matches: [...updatedMatches, ...nextMatches],
            currentRound: nextMatches.length > 0 ? nextRound : cup.currentRound,
            champion,
            eliminated,
          },
        });

        // P0 FIX: Log mesajı düzeltildi — currentRound-1 yanlıştı
        // Şampiyon belirlendiyse final oynanmıştır, currentRound değişmemiştir (4'te kalır)
        // Şampiyon belirlenmediyse currentRound bir sonraki tura geçmiştir
        const logRoundLabel = wasChampionSet ? playedRoundLabel : (ROUND_NAMES[cup.currentRound] ?? `Tur ${cup.currentRound}`);
        console.log(`[playCupRound] ${playedRoundLabel} oynandı${wasChampionSet ? " — Şampiyon: " + (champion ? allClubsForCup.find(c => c.id === champion)?.name : "?") : " → Sonraki: " + (ROUND_NAMES[nextRound] ?? `Tur ${nextRound}`)}`);

        return { success: true, myResult, champion };
      },

      // ===== Season actions =====
      advanceMatchday: () => {
        const { fixtures, clubs, myTeamId, transfer, news } = get();
        const currentMd = SEASON_INFO.matchday;

        // P0 KÖK NEDEN ÇÖZÜMÜ: Kullanıcının maçını BOT maçlarıyla AYNI array'de simüle et
        // recordMatchResult'a ayrı set() yaptırmak yerine, direkt updatedFixtures'a dahil et
        // Bu sayede tek bir set() ile tüm haftanın maçları yazılır — veri kaybı olmaz

        // Kullanıcının bu haftaki maçı (henüz oynanmamış)
        const userMatch = fixtures.find(
          (f) => f.matchday === currentMd && !f.played && (f.homeId === myTeamId || f.awayId === myTeamId)
        );
        let userMatchResult: { homeScore: number; awayScore: number } | null = null;
        if (userMatch) {
          const homeTeam = clubs.find((c) => c.id === userMatch.homeId);
          const awayTeam = clubs.find((c) => c.id === userMatch.awayId);
          if (homeTeam && awayTeam) {
            // Enhanced motor ile simüle et
            try {
              
              
              const userTactic = get().tactics.active ?? DEFAULT_TACTIC;
              const isHome = homeTeam.id === myTeamId;
              const homeTactic = isHome ? userTactic : { ...DEFAULT_TACTIC, formation: "4-4-2" };
              const awayTactic = isHome ? { ...DEFAULT_TACTIC, formation: "4-4-2" } : userTactic;
              const pickXI = (players: any[]) =>
                [...players].filter((p) => !p.is_injured).sort((a, b) => b.rating - a.rating).slice(0, 11);
              const result = simulateEnhancedMatch(
                pickXI(homeTeam.players),
                pickXI(awayTeam.players),
                homeTactic,
                awayTactic,
                { homeTeamName: homeTeam.name, awayTeamName: awayTeam.name }
              );
              userMatchResult = { homeScore: result.homeScore, awayScore: result.awayScore };
            } catch (e) {
              console.warn("[advanceMatchday] enhanced sim hatası, basit sim:", e);
              const homeStr = [...homeTeam.players].filter(p => !p.is_injured).sort((a, b) => b.rating - a.rating).slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11;
              const awayStr = [...awayTeam.players].filter(p => !p.is_injured).sort((a, b) => b.rating - a.rating).slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11;
              const diff = homeStr - awayStr;
              const homeAdv = diff > 5 ? 0.3 : diff < -5 ? -0.3 : 0;
              userMatchResult = {
                homeScore: Math.max(0, Math.floor(Math.random() * 4 + homeAdv * 2)),
                awayScore: Math.max(0, Math.floor(Math.random() * 3 - homeAdv * 2)),
              };
            }
          }
        }

        // P0 FIX: Kullanıcı maçı sonrası kondisyon/form/morale güncelle
        // (Sadece canlı maçta applyPostMatchEffects çağrılıyordu, Turu İlerlet'te çağrılmıyordu)
        if (userMatchResult) {
          // P0 FIX: tacticsLineupIds'i burada tanımla — aşağıda pickStartingXI'da da kullanılıyor
          const _tacticsLineupIds = new Set(
            get().tactics.lineup.filter(p => p !== null).map(p => p!.id)
          );
          const myClub = clubs.find(c => c.id === myTeamId);
          if (myClub) {
            const isHome = userMatch!.homeId === myTeamId;
            const myScore = isHome ? userMatchResult.homeScore : userMatchResult.awayScore;
            const oppScore = isHome ? userMatchResult.awayScore : userMatchResult.homeScore;
            const won = myScore > oppScore;
            const lost = myScore < oppScore;
            // P0 FIX: Kondisyon drain sadece lineup'taki oyunculara, boş lineup'ta TÜM oyunculara değil
            const lineupHasPlayers = _tacticsLineupIds.size > 0;
            myClub.players = myClub.players.map(p => {
              // Kullanıcının lineup'ındaki oyunculara kondisyon düş
              const inLineup = lineupHasPlayers ? _tacticsLineupIds.has(p.id) : false;
              const condDrain = inLineup ? Math.floor(8 + Math.random() * 8) : 0;
              const newCond = Math.max(20, Math.min(100, p.cond - condDrain));
              const formChange = won ? 2 : lost ? -3 : 0;
              const moraleChange = won ? 3 : lost ? -3 : 0;
              // P0 FIX: %10 rastgele sakatlık KALDIRILDI — motorun dinamik sakatlık sistemi zaten çalışıyor
              // (enhancedMatchEngine.ts:2916-2956 kondisyon+dakika bazlı risk hesaplıyor)
              // Çift sakatlık üretimini önlemek için burada sakatlık ÜRETME
              return {
                ...p,
                cond: newCond,
                condition: newCond,
                form: Math.max(30, Math.min(100, p.form + formChange)),
                morale: Math.max(20, Math.min(100, p.morale + moraleChange)),
                // is_injured ve injury alanlarını DOKUNMA — motor/applyPostMatchEffects yönetir
              };
            });
          }
        }

        // TÜM maçları tek array'de simüle et — kullanıcı maçı + bot maçları
        const updatedFixtures = fixtures.map((f) => {
          if (f.matchday !== currentMd || f.played) return f;
          // Kullanıcının maçı — yukarıda simüle edilmiş sonucu kullan
          if (userMatch && f.id === userMatch.id && userMatchResult) {
            return { ...f, homeScore: userMatchResult.homeScore, awayScore: userMatchResult.awayScore, played: true };
          }
          // Bot vs bot maçı — basit sim
          const homeTeam = clubs.find((c) => c.id === f.homeId);
          const awayTeam = clubs.find((c) => c.id === f.awayId);
          if (!homeTeam || !awayTeam) return f;
          const homeStr = [...homeTeam.players].filter(p => !p.is_injured).sort((a, b) => b.rating - a.rating).slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11;
          const awayStr = [...awayTeam.players].filter(p => !p.is_injured).sort((a, b) => b.rating - a.rating).slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11;
          const diff = homeStr - awayStr;
          const homeAdv = diff > 5 ? 0.3 : diff < -5 ? -0.3 : 0;
          const hs = Math.max(0, Math.floor(Math.random() * 4 + homeAdv * 2));
          const as = Math.max(0, Math.floor(Math.random() * 3 - homeAdv * 2));
          return { ...f, homeScore: hs, awayScore: as, played: true };
        });

        // Kullanıcı maçı haberini hazırla (set'e eklenecek)
        const newNewsItems: NewsItem[] = [];
        if (userMatch && userMatchResult) {
          const homeTeam = clubs.find((c) => c.id === userMatch.homeId);
          const awayTeam = clubs.find((c) => c.id === userMatch.awayId);
          if (homeTeam && awayTeam) {
            const isHome = userMatch.homeId === myTeamId;
            const myScore = isHome ? userMatchResult.homeScore : userMatchResult.awayScore;
            const oppScore = isHome ? userMatchResult.awayScore : userMatchResult.homeScore;
            const oppName = isHome ? awayTeam.name : homeTeam.name;
            const result = myScore > oppScore ? "galibiyet" : myScore < oppScore ? "mağlubiyet" : "beraberlik";
            const headlineMap = { galibiyet: "Maç Sonucu: Galibiyet! 🎉", mağlubiyet: "Maç Sonucu: Mağlubiyet", beraberlik: "Maç Sonucu: Beraberlik" };
            const bodyMap = {
              galibiyet: `${myScore}-${oppScore} ${oppName} karşısında galip geldiniz!`,
              mağlubiyet: `${myScore}-${oppScore} ${oppName} karşısında mağlup oldunuz.`,
              beraberlik: `${myScore}-${oppScore} ${oppName} ile berabere kaldınız.`,
            };
            newNewsItems.push({
              id: `news_match_${currentMd}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              category: "match",
              headline: headlineMap[result],
              body: bodyMap[result],
              timestamp: Date.now(),
              importance: result === "galibiyet" ? 2 : 1,
              read: false,
            });
          }
        }

        // P0 FIX: Gol/assist dağıtımı — kullanıcının takımı için tactics.lineup kullan
        // Bot takımlar için en yüksek OVR'li 11 kullan
        const tacticsLineupIds = new Set(
          get().tactics.lineup.filter(p => p !== null).map(p => p!.id)
        );
        const pickStartingXI = (players: any[], teamId: string) => {
          // Kullanıcının takımı ise tactics.lineup'tan seç
          if (teamId === myTeamId && tacticsLineupIds.size > 0) {
            const lineup = players.filter(p => !p.is_injured && p.specificPosition !== "GK" && tacticsLineupIds.has(p.id));
            // P0 FIX: lineup boşsa fallback — en yüksek OVR'li 10 (tactics.lineup stale olabilir)
            if (lineup.length === 0) {
              console.warn(`[pickStartingXI] tactics.lineup stale! tacticsLineupIds=${tacticsLineupIds.size} ama players'ta eşleşen yok. Fallback: en yüksek OVR'li 10`);
            }
            if (lineup.length > 0) return lineup;
          }
          // Bot takımı — en yüksek OVR'li 10 saha oyuncusu
          return [...players]
            .filter(p => !p.is_injured && p.specificPosition !== "GK")
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 10);
        };
        const pickScorer = (startingXI: any[]) => {
          if (startingXI.length === 0) return null;
          // Forvetler daha çok gol atar
          const forwards = startingXI.filter(p => ["ST", "CF", "LW", "RW", "LM", "RM", "CAM"].includes(p.specificPosition));
          const pool = forwards.length > 0 && Math.random() > 0.3 ? forwards : startingXI;
          return pool[Math.floor(Math.random() * pool.length)];
        };

        // P0 FIX: Maç bonusunu topla, net clamp'ten SONRA ekle
        let matchBonus = 0;

        for (const f of updatedFixtures) {
          if (f.matchday !== currentMd || !f.played) continue;
          // P0 FIX: Çift gol sayımını önle
          // — Canlı maçta applyPostMatchEffects gol/assist dağıtır (use-match-engine.ts)
          // — Turu İlerlet'te advanceMatchday gol/assist dağıtmalı (canlı motor çağrılmaz)
          // — Ayırt etme: canlı maçta recordMatchResult çağrılır, fixture.played=true olur
          //   Sonra advanceMatchday çağrıldığında userMatch bulunamaz (played=true) → userMatchResult=null
          //   Turu İlerlet'te userMatch bulunur → userMatchResult set edilir
          // Dolayısıyla: userMatchResult varsa = Turu İlerlet yolu, gol dağıtımı YAPILMALI
          // userMatchResult null ise = canlı maçtan gelmiş, applyPostMatchEffects zaten yaptı
          const isUserMatch = f.homeId === myTeamId || f.awayId === myTeamId;
          // Maç bonusu her zaman ver (kullanıcının maçıysa)
          // P0 FIX: Bonus'u ayrı topla, net clamp'ten SONRA ekle (yutulmasını önle)
          if (isUserMatch) {
            const isUserHome = f.homeId === myTeamId;
            const myScore = isUserHome ? (f.homeScore ?? 0) : (f.awayScore ?? 0);
            const oppScore = isUserHome ? (f.awayScore ?? 0) : (f.homeScore ?? 0);
            if (myScore > oppScore) matchBonus += 200_000;      // Galibiyet
            else if (myScore === oppScore) matchBonus += 100_000; // Beraberlik
            else matchBonus += 50_000;                            // Yenilgi
          }
          // P0 FIX: userMatchResult null ise = canlı maçtan gelmiş, applyPostMatchEffects gol dağıttı
          // userMatchResult varsa = Turu İlerlet yolu, gol dağıtımı BURADA yapılmalı
          if (isUserMatch && !userMatchResult) {
            // Canlı maçtan gelmiş — gol/assist zaten dağıtıldı, atla
            continue;
          }
          // P0 FIX: updatedClubs henüz tanımlı değil ama myClub yukarıda güncellendi
          // Kullanıcının takımı için myClub kullan, botlar için clubs kullan
          const isHomeUser = f.homeId === myTeamId;
          const isAwayUser = f.awayId === myTeamId;
          const homeTeam = isHomeUser ? (clubs.find(c => c.id === myTeamId) ?? null) : clubs.find((c) => c.id === f.homeId);
          const awayTeam = isAwayUser ? (clubs.find(c => c.id === myTeamId) ?? null) : clubs.find((c) => c.id === f.awayId);
          if (!homeTeam || !awayTeam) continue;

          // P0 FIX: Sadece ilk 11'e gol/assist dağıt
          const homeXI = pickStartingXI(homeTeam.players, f.homeId);
          const awayXI = pickStartingXI(awayTeam.players, f.awayId);

          // Home goals dağıt
          for (let i = 0; i < (f.homeScore ?? 0); i++) {
            const scorer = pickScorer(homeXI);
            if (scorer) {
              scorer.goals = (scorer.goals ?? 0) + 1;
              const assistPool = homeXI.filter(p => p.id !== scorer?.id);
              if (assistPool.length > 0 && Math.random() > 0.4) {
                const assister = assistPool[Math.floor(Math.random() * assistPool.length)];
                assister.assists = (assister.assists ?? 0) + 1;
              }
            }
          }
          // Away goals dağıt
          for (let i = 0; i < (f.awayScore ?? 0); i++) {
            const scorer = pickScorer(awayXI);
            if (scorer) {
              scorer.goals = (scorer.goals ?? 0) + 1;
              const assistPool = awayXI.filter(p => p.id !== scorer?.id);
              if (assistPool.length > 0 && Math.random() > 0.4) {
                const assister = assistPool[Math.floor(Math.random() * assistPool.length)];
                assister.assists = (assister.assists ?? 0) + 1;
              }
            }
          }
          // P0 FIX: appearances SADECE ilk 11'e +1
          for (const p of homeXI) {
            p.appearances = (p.appearances ?? 0) + 1;
          }
          for (const p of awayXI) {
            p.appearances = (p.appearances ?? 0) + 1;
          }
        }

        // Bot AI — transfer aktivitesi
        const botTeams = clubs.filter((c) => c.id !== myTeamId && c.is_bot);
        const updatedTransfer = { ...transfer };
        const updatedClubs = [...clubs];

        for (const bot of botTeams) {
          // P2 FIX: Botlar her tur %5 ihtimalle 1 tesis yükselt
          if (Math.random() < 0.05) {
            const botIdx = updatedClubs.findIndex(c => c.id === bot.id);
            if (botIdx >= 0) {
              const levels = (updatedClubs[botIdx] as any).facilities?.levels;
              if (levels) {
                const facilityKeys = Object.keys(levels);
                if (facilityKeys.length > 0) {
                  const randomKey = facilityKeys[Math.floor(Math.random() * facilityKeys.length)];
                  const currentLevel = levels[randomKey] ?? 0;
                  if (currentLevel < 10) {
                    (updatedClubs[botIdx] as any).facilities = {
                      ...(updatedClubs[botIdx] as any).facilities,
                      levels: { ...levels, [randomKey]: currentLevel + 1 },
                    };
                  }
                }
              }
            }
          }
          // P0 FIX: Stale referans yerine updatedClubs'tan taze değer oku
          const currentBot = updatedClubs.find((c) => c.id === bot.id)!;
          // P1 FIX: %15 ihtimalle serbest oyuncu al (önce %30 idi)
          if (Math.random() < 0.15 && updatedTransfer.freeAgents.length > 0 && currentBot.budget > 500000) {
            const idx = Math.floor(Math.random() * Math.min(5, updatedTransfer.freeAgents.length));
            const listing = updatedTransfer.freeAgents[idx];
            if (listing.askingPrice < currentBot.budget && currentBot.players.length < 25) {
              const botIdx = updatedClubs.findIndex((c) => c.id === bot.id);
              updatedClubs[botIdx] = {
                ...currentBot,
                budget: currentBot.budget - listing.askingPrice,
                players: [...currentBot.players, listing.player],
              };
              updatedTransfer.freeAgents = updatedTransfer.freeAgents.filter((_, i) => i !== idx);
            }
          }

          // P1 FIX: %5 ihtimalle oyuncu sat (önce %10 idi, hala şişiyordu)
          // SADECE free agents 50'den az ise sat — şişmeyi önle
          const currentBot2 = updatedClubs.find((c) => c.id === bot.id)!;
          if (Math.random() < 0.05 && currentBot2.players.length > 20 && updatedTransfer.freeAgents.length < 50) {
            const weakest = [...currentBot2.players].sort((a, b) => a.rating - b.rating)[0];
            if (weakest) {
              const botIdx = updatedClubs.findIndex((c) => c.id === bot.id);
              const salePrice = weakest.marketValue;
              updatedClubs[botIdx] = {
                ...updatedClubs[botIdx],
                budget: updatedClubs[botIdx].budget + salePrice,
                players: updatedClubs[botIdx].players.filter((p) => p.id !== weakest.id),
              };
              // Serbest oyuncu havuzuna ekle
              updatedTransfer.freeAgents.unshift({
                player: weakest,
                askingPrice: salePrice,
                daysListed: 1,
                offers: 0,
              });
            }
          }
        }

        // Haftalık ekonomi + oyuncu güncellemesi
        const myTeam = updatedClubs.find((c) => c.id === myTeamId);
        if (myTeam) {
          const facilitiesState = get().facilities;
          // P0 FIX: Sponsor sistemini gerçekten uygula — getSponsorWeeklyIncome çağrılsın
          const activeSponsorIncome = get().getSponsorWeeklyIncome();
          // Gelir
          // P1 FIX: Gelirleri düşür — bütçe kontrolden çıkmıştı
          const stadiumCap = 5000 + facilitiesState.levels.stadium * 5000;
          const stadiumMult = 1 + facilitiesState.levels.stadium * 0.05;
          // P1 FIX: Doluluk oranı — bilet fiyatına göre azalsın (yüksek fiyat → düşük doluluk)
          // 60€ = %60 doluluk, 100€ = %40, 150€ = %20
          const fillRate = Math.max(0.2, Math.min(0.8, 1 - (facilitiesState.ticketPrice / 250)));
          const ticketRev = Math.round(stadiumCap * fillRate * facilitiesState.ticketPrice * stadiumMult);
          const sponsor = 50_000 + facilitiesState.levels.stadium * 10_000 + activeSponsorIncome;
          const tv = 50_000;
          const merch = Math.round(stadiumCap * 0.2 * 1);
          const totalIncome = ticketRev + sponsor + tv + merch;
          // Gider — P0 FIX: Futbolcu maaşları tamamen kaldırıldı, sadece personel + tesis
          const staffWages = facilitiesState.staff.reduce((s, st) => s + st.weeklyWage, 0);
          // P1 FIX: Tesis bakım maliyeti artır — bütçe birikmesini önle
          const facilityCost = Object.values(facilitiesState.levels).reduce((s, l) => s + l * 20000, 0);
          const totalExpense = staffWages + facilityCost;
          const net = totalIncome - totalExpense;
          // P0 FIX: Maç bonusunu net clamp'ten SONRA ekle (yutulmasını önle)
          myTeam.budget = Math.max(0, myTeam.budget + net) + matchBonus;

          // P0 FIX: Kiralık oyuncuların _loanWeeks değerini azalt — 0 olunca kaynak takıma iade et
          const playersAfterLoan: Player[] = [];
          const allClubsForLoanReturn = [...clubs];
          for (const p of myTeam.players) {
            if ((p as any)._loaned && (p as any)._loanWeeks !== undefined) {
              const newWeeks = (p as any)._loanWeeks - 1;
              if (newWeeks <= 0) {
                // Kiralık süresi doldu — kaynak takıma iade et
                const loanFromId = (p as any)._loanFrom;
                const sellerClub = allClubsForLoanReturn.find(c => c.id === loanFromId);
                if (sellerClub) {
                  const { _loaned, _loanWeeks, _loanFrom, ...playerWithoutFlags } = p as any;
                  sellerClub.players.push(playerWithoutFlags as Player);
                  console.log(`[advanceMatchday] Kiralık oyuncu iade edildi: ${p.firstName} ${p.lastName} → ${sellerClub.name}`);
                }
                // myTeam.players'a ekleme (kaldır)
                continue;
              } else {
                playersAfterLoan.push({ ...p, _loanWeeks: newWeeks } as Player);
                continue;
              }
            }
            playersAfterLoan.push(p);
          }
          myTeam.players = playersAfterLoan;
          // clubs array'ini güncellenmiş haliyle kullan (loan return için)
          clubs.splice(0, clubs.length, ...allClubsForLoanReturn);

          // P0 FIX: Sponsor endDate kontrolü — süresi dolan sponsorları kaldır
          const now = Date.now();
          const activeSponsors = get().sponsors.active.filter((s: any) => {
            if (!s.endDate) return true; // endDate yoksa sonsuz
            return s.endDate > now;
          });
          if (activeSponsors.length !== get().sponsors.active.length) {
            useAppStore.setState({
              sponsors: { ...get().sponsors, active: activeSponsors },
            });
          }

          // Oyuncu güncellemesi — kondisyon toparlanma + sakatlık iyileşme + moral
          myTeam.players = myTeam.players.map((p) => {
            const newCond = Math.min(100, p.cond + 12); // +12 kondisyon
            let newMorale = p.morale;
            // Moral: takım sonucuna göre (son maç)
            const lastFx = updatedFixtures
              .filter((f) => f.played && (f.homeId === myTeamId || f.awayId === myTeamId))
              .sort((a, b) => b.matchday - a.matchday)[0];
            if (lastFx) {
              const isHome = lastFx.homeId === myTeamId;
              const us = isHome ? lastFx.homeScore : lastFx.awayScore;
              const them = isHome ? lastFx.awayScore : lastFx.homeScore;
              if ((us ?? 0) > (them ?? 0)) newMorale = Math.min(100, newMorale + 2);
              else if ((us ?? 0) < (them ?? 0)) newMorale = Math.max(20, newMorale - 2);
            }
            // Sakatlık iyileşme
            let newInjury = p.injury;
            let isInjured = p.is_injured;
            if (p.injury && p.injury.remaining_days > 0) {
              const remaining = p.injury.remaining_days - 7;
              if (remaining <= 0) {
                newInjury = undefined;
                isInjured = false;
              } else {
                newInjury = { ...p.injury, remaining_days: remaining };
              }
            }
            return {
              ...p,
              cond: newCond,
              condition: newCond,
              morale: newMorale,
              injury: newInjury,
              is_injured: isInjured,
            };
          });
        }

        // Matchday'i ilerlet
        const nextMd = currentMd + 1;
        if (nextMd > SEASON_INFO.totalMatchdays) {
          // P0 FIX: Önce state'i set et (son haftanın bot maçları/transferleri kaybolmasın), SONRA endSeason
          SEASON_INFO.matchday = SEASON_INFO.totalMatchdays;
          // P0 FIX: updatedTransferFinal oluştur (aşağıdaki stale incomingOffers temizliği ile)
          const myCurrentTeamPre = updatedClubs.find((c) => c.id === myTeamId);
          const currentPlayerIdsPre = new Set(myCurrentTeamPre?.players.map((p) => p.id) ?? []);
          const validOffersPre = transfer.incomingOffers.filter((o) => currentPlayerIdsPre.has(o.myPlayerId));
          let finalOffersPre = validOffersPre;
          if (myCurrentTeamPre && validOffersPre.length < 2) {
            try {
              
              const freshOffers = generateIncomingOffers(myCurrentTeamPre.players);
              const existingIds = new Set(validOffersPre.map((o) => o.id));
              const newOffers = freshOffers.filter((o) => !existingIds.has(o.id));
              finalOffersPre = [...validOffersPre, ...newOffers].slice(0, 5);
            } catch (e) { /* ignore */ }
          }
          const updatedTransferFinalPre = { ...updatedTransfer, incomingOffers: finalOffersPre };
          set({ fixtures: updatedFixtures, clubs: updatedClubs, transfer: updatedTransferFinalPre });
          // Şimdi endSeason çağır — güncel state'i okuyacak
          const endResult = get().endSeason();
          if (endResult.success) {
            console.log(`[advanceMatchday] Sezon ${get().seasonNumber - 1} bitti, yeni sezon başladı.`);
          }
          return;
        }
        SEASON_INFO.matchday = nextMd;

        // P0 FIX: Otomatik antrenman — kullanıcı atama yapmasa bile varsayılan gelişim
        try {
          const trainingState = get().training;
          const facilitiesState = get().facilities;
          if (myTeam) {
            // Atama yoksa varsayılan "genel" antrenman uygula
            if (trainingState.assignments.length === 0) {
              // Basit gelişim — her oyuncuya küçük random boost
              const myClub = updatedClubs.find(c => c.id === myTeamId);
              if (myClub) {
                const updatedPlayers = myClub.players.map(p => {
                  // 21 altı %15 bonus, 30 üstü %25 ceza
                  const ageMult = p.age < 21 ? 1.3 : p.age > 30 ? 0.5 : 1.0;
                  const gain = Math.random() * 1.0 * ageMult;
                  const newStats = { ...p.stats };
                  // Rastgele 2 stat artır
                  const statKeys = ["pace", "shooting", "passing", "defending", "physical", "dribbling"] as const;
                  const idx1 = Math.floor(Math.random() * 6);
                  const idx2 = (idx1 + 1 + Math.floor(Math.random() * 5)) % 6;
                  newStats[statKeys[idx1]] = Math.min(99, Math.round((newStats[statKeys[idx1]] + gain) * 10) / 10);
                  newStats[statKeys[idx2]] = Math.min(99, Math.round((newStats[statKeys[idx2]] + gain * 0.5) * 10) / 10);
                  // P0 FIX: rating = 6 stat'ın ortalaması
                  const newRating = Math.min(99, Math.round(
                    (newStats.pace + newStats.shooting + newStats.passing + newStats.defending + newStats.physical + newStats.dribbling) / 6
                  ));
                  return {
                    ...p,
                    stats: newStats,
                    [statKeys[idx1]]: Math.min(99, (p[statKeys[idx1]] ?? 50) + gain),
                    [statKeys[idx2]]: Math.min(99, (p[statKeys[idx2]] ?? 50) + gain * 0.5),
                    rating: newRating,
                  } as any;
                });
                const teamIdx = updatedClubs.findIndex(c => c.id === myTeamId);
                if (teamIdx >= 0) {
                  updatedClubs[teamIdx] = { ...updatedClubs[teamIdx], players: updatedPlayers };
                }
              }
            } else {
              const facilityLevel = facilitiesState.levels.pitch;
              const results = runTrainingSession(myTeam.players, trainingState, facilityLevel, 0.7);
              const updatedPlayers = applyResultsToSquad(myTeam.players, results);
              const teamIdx = updatedClubs.findIndex(c => c.id === myTeamId);
              if (teamIdx >= 0) {
                updatedClubs[teamIdx] = { ...updatedClubs[teamIdx], players: updatedPlayers };
              }
            }
          }
        } catch (e) {
          console.warn("[advanceMatchday] auto-training failed:", e);
        }

        // P2 FIX: Loan listings yenile — 5'ten az ise yeni üret
        if ((transfer.loanListings ?? []).length < 5) {
          try {
            
            const newLoans = generateLoanListings(clubs, 10);
            if (newLoans && newLoans.length > 0) {
              updatedTransfer.loanListings = newLoans;
              console.log(`[advanceMatchday] Loan listings yenilendi: ${newLoans.length} oyuncu`);
            }
          } catch (e) {
            console.warn("[advanceMatchday] loan listings yenileme hatası:", e);
          }
        }

        // P1 FIX: Kupa turlarını ilerlet — her 5 turda bir kupa turu oyna
        // set()'ten SONRA çağır — yoksa set() tarafından ezilir
        const shouldPlayCup = currentMd % 5 === 0;

        // P7 FIX: Stale incoming offers temizle — artık kadroda olmayan oyunculara teklifleri kaldır
        const myCurrentTeam = updatedClubs.find((c) => c.id === myTeamId);
        const currentPlayerIds = new Set(myCurrentTeam?.players.map((p) => p.id) ?? []);
        const validOffers = transfer.incomingOffers.filter((o) => currentPlayerIds.has(o.myPlayerId));
        // P1 FIX: Her tur incoming offers yenile — 3'ten azsa yeni üret
        let finalOffers = validOffers;
        if (myCurrentTeam && validOffers.length < 3) {
          try {
            
            // P1 FIX: get().clubs'tan taze players al — updatedClubs'tan değil
            const freshTeam = get().clubs.find(c => c.id === myTeamId);
            const freshPlayers = freshTeam?.players ?? myCurrentTeam.players;
            const freshOffers = generateIncomingOffers(freshPlayers);
            if (freshOffers && freshOffers.length > 0) {
              const existingIds = new Set(validOffers.map((o) => o.id));
              const newOffers = freshOffers.filter((o) => !existingIds.has(o.id));
              finalOffers = [...validOffers, ...newOffers].slice(0, 5);
            }
          } catch (e) {
            console.warn("[advanceMatchday] generateIncomingOffers hatası:", e);
          }
        }
        const updatedTransferFinal = { ...transfer, incomingOffers: finalOffers };

        // P1 FIX: seasonMatchday state alanını da güncelle (cloud-save doğru kaydetsin)
        // P0 KÖK NEDEN: Tek set() ile fixtures + clubs + news + seasonMatchday yazılır
        const finalNews = newNewsItems.length > 0 ? [...newNewsItems, ...news] : news;
        set({ fixtures: updatedFixtures, clubs: updatedClubs, transfer: updatedTransferFinal, news: finalNews, seasonMatchday: nextMd });

        // P1 FIX: Kupa turlarını set()'ten SONRA oyna
        if (shouldPlayCup) {
          try {
            const cupResult = get().playCupRound();
            // playCupRound kendi log'unu üretir — burada sadece success kontrolü yap
            if (!cupResult.success) {
              // Champion zaten belirlenmiş veya oynanacak maç yok — sessiz geç
            }
          } catch (e) {
            console.warn("[advanceMatchday] playCupRound hatası:", e);
          }
        }
      },

      endSeason: () => {
        const { clubs, fixtures, myTeamId } = get();
        if (!myTeamId) return { success: false };

        const team = clubs.find((c) => c.id === myTeamId);
        if (!team) return { success: false };

        // Final standings hesapla
        const standings = computeStandings(clubs, fixtures);
        const myIdx = standings.findIndex((s) => s.teamId === myTeamId);
        const myStat = standings[myIdx];

        // Top scorer bul
        let topScorer: { name: string; goals: number } | null = null;
        for (const club of clubs) {
          for (const p of club.players) {
            if (!topScorer || p.goals > topScorer.goals) {
              topScorer = { name: `${p.firstName} ${p.lastName}`, goals: p.goals };
            }
          }
        }

        // 40+ yaş oyuncuları emekli et, regen üret
        const retiredNames: string[] = [];
        const updatedClubs = clubs.map((c) => {
          const remainingPlayers = c.players.filter((p) => {
            if (p.age >= 40) {
              retiredNames.push(`${p.firstName} ${p.lastName}`);
              return false;
            }
            return true;
          });

          // Regen üret — emekli edilen oyuncu sayısı kadar yeni genç oyuncu
          // P2 FIX: Pozisyonu emekli EDİLEN oyuncudan al (rastgele tüm oyunculardan değil)
          // Bu sayede kaleci emekli olunca kaleci regen üretilir — kadro dengesi korunur
          const retiredPlayers = c.players.filter(p => p.age >= 40);
          const retireCount = retiredPlayers.length;
          const regens: Player[] = [];
          for (let i = 0; i < retireCount; i++) {
            const pos = retiredPlayers[i]?.specificPosition
              ?? c.players[Math.floor(Math.random() * c.players.length)].specificPosition;
            const regen = generatePlayer(pos, { min: 55, max: 70 });
            regen.age = 17; // Yeni regen
            (regen as any)._isRegen = true;
            regens.push(regen);
          }

          // Tüm oyuncuları yaşlandır + stat sıfırla
          // P1 FIX: regen'ler 17 yaşında kalsın (önce 17 üret sonra yaşlandırma skip)
          const agedPlayers = [...remainingPlayers, ...regens].map((p) => {
            const isRegen = (p as any)._isRegen === true;
            const oldStats = p.seasonStats ?? {};
            return {
              ...p,
              age: isRegen ? p.age : p.age + 1,
              goals: 0,
              assists: 0,
              saves: 0,
              appearances: 0,
              match_ratings: [],
              last_match_rating: undefined,
              cond: 100,
              condition: 100,
              form: 70,
              morale: 70,
              confidence: 70,
              // P1 FIX: Sakatlık ve loan flag'lerini sıfırla
              is_injured: false,
              injury: undefined,
              injury_history: [],
              _loaned: false,
              _loanWeeks: 0,
              // P1 FIX: Sezon stats'larını sıfırla — mevcut yapıyı koru, değerleri 0 yap
              seasonStats: Object.fromEntries(
                Object.keys(oldStats).map((k) => [k, 0])
              ) as typeof p.seasonStats,
              // Form streak sıfırla
              formRating: 70,
              form_streak: "neutral" as const,
              form_streak_count: 0,
              motmAwards: (p as any).motmAwards ?? 0, // MotM ödülleri korunsun (kariyerlik)
            };
          });

          return { ...c, players: agedPlayers };
        });

        // Promosyon/relegasyon — kullanıcının takımının ligini değiştir
        const myFinalIdx = standings.findIndex((s) => s.teamId === myTeamId);
        const currentTier = team.leagueTier ?? 2;
        const currentDept = team.department ?? 1;
        let newTier = currentTier;
        let newDept = currentDept;
        if (myFinalIdx < 3 && currentTier > 1) {
          // Promosyon — bir üst lig
          newTier = (currentTier - 1) as LeagueTier;
          newDept = currentDept; // aynı departman
        } else if (myFinalIdx >= 15 && currentTier < 4) {
          // Relegasyon — bir alt lig
          newTier = (currentTier + 1) as LeagueTier;
          newDept = currentDept;
        }

        // Yeni lig/departman için takımları üret (kullanıcının takımı hariç)
        if (newTier !== currentTier || newDept !== currentDept) {
          const newLeagueClubs: Team[] = generateClubsForLeague(newTier, newDept);
          // Kullanıcının takımını yeni lige taşı
          const myUpdatedTeam = updatedClubs.find((c) => c.id === myTeamId);
          if (myUpdatedTeam) {
            myUpdatedTeam.leagueTier = newTier;
            myUpdatedTeam.department = newDept;
            newLeagueClubs[0] = myUpdatedTeam;
          }
          // P0 FIX: Kullanıcının takımıyla AYNI ADI taşıyan bot takımları yeniden adlandır
          if (myUpdatedTeam) {
            const myTeamName = myUpdatedTeam.name;
            const suffixes = [" SK", " FC", "spor", " GK", " AS"];
            for (let i = 1; i < newLeagueClubs.length; i++) {
              if (newLeagueClubs[i].name === myTeamName) {
                const suffix = suffixes[i % suffixes.length];
                newLeagueClubs[i] = {
                  ...newLeagueClubs[i],
                  name: myTeamName + suffix,
                  shortName: newLeagueClubs[i].shortName + (i % 10),
                };
              }
            }
          }
          updatedClubs.length = 0;
          (updatedClubs as Team[]).push(...newLeagueClubs);
        }

        // Yeni sezon fikstürü üret
        const newFixtures = generateFixtures(updatedClubs);

        // Sezon numarasını artır
        const oldSeasonNumber = get().seasonNumber ?? 1;
        const newSeasonNumber = oldSeasonNumber + 1;
        SEASON_INFO.matchday = 1;

        // Enflasyon uygula — bütçeleri yeni sezona göre güncelle
        
        TIER_BASE_BUDGETS
        const newBudgetMultiplier = getInflationMultiplier(newSeasonNumber);
        updatedClubs.forEach((c) => {
          // P1 FIX: Kullanıcının takımının bütçesini SIFIRLAMA — biriktirilen para korunsun
          if (c.id === myTeamId) {
            // Sadece enflasyon uygula (minimum lig baz bütçesi garanti)
            const tier = c.leagueTier ?? 2;
            const baseBudget = TIER_BASE_BUDGETS[tier] ?? TIER_BASE_BUDGETS[2];
            const minBudget = Math.round(baseBudget * newBudgetMultiplier);
            c.budget = Math.max(minBudget, Math.round(c.budget * newBudgetMultiplier));
            return;
          }
          // Yeni lig tier'ına göre baz bütçe × enflasyon
          const tier = c.leagueTier ?? 2;
          const baseBudget = TIER_BASE_BUDGETS[tier] ?? TIER_BASE_BUDGETS[2];
          c.budget = Math.round(baseBudget * newBudgetMultiplier);
        });

        // Taktikleri sıfırla
        const updatedTeam = updatedClubs.find((c) => c.id === myTeamId);
        const newTactics = updatedTeam ? defaultTacticsFor(updatedTeam) : get().tactics;

        // P0 FIX: Kiralık oyuncuları sezon sonunda kaynak takımlarına iade et
        // Kullanıcıdaki _loaned oyuncular → _loanFrom kulübüne geri gönder
        // Botlardaki _loaned oyuncular → kendi _loanFrom kulüplerine
        // P0 FIX: Eğer lender kulüp updatedClubs'ta yoksa (lig değişikliği), oyuncuyu serbest bırak
        for (const club of updatedClubs) {
          const loanedPlayers = club.players.filter((p: any) => p._loaned === true);
          if (loanedPlayers.length === 0) continue;
          // Kiralık oyuncuları bu kulüpten çıkar
          club.players = club.players.filter((p: any) => p._loaned !== true);
          // Her birini kaynak kulübüne iade et
          for (const lp of loanedPlayers) {
            const { _loaned, _loanWeeks, _loanFrom, ...cleanPlayer } = lp as any;
            const lenderClub = updatedClubs.find(c => c.id === _loanFrom);
            if (lenderClub) {
              lenderClub.players.push(cleanPlayer as any);
            } else {
              // P0 FIX: Lender kulüp bulunamadı (lig değişikliği) — oyuncuyu serbest bırak
              console.warn(`[endSeason] Kiralık oyuncu ${lp.firstName} ${lp.lastName} için kaynak kulüp bulunamadı: ${_loanFrom} — serbest bırakılıyor`);
              // Serbest oyuncu havuzuna ekle (transfer.freeAgents'a)
              try {
                const currentTransfer = get().transfer;
                const newFreeAgentListing = {
                  player: cleanPlayer,
                  askingPrice: (cleanPlayer as any).marketValue ?? (cleanPlayer as any).market_value ?? 500_000,
                  wageDemand: (cleanPlayer as any).weeklyWage ?? 5000,
                  daysListed: 1,
                  offers: 0,
                };
                set({
                  transfer: {
                    ...currentTransfer,
                    freeAgents: [newFreeAgentListing, ...(currentTransfer.freeAgents ?? [])],
                  },
                });
              } catch (e) {
                console.warn("[endSeason] Serbest bırakma hatası:", e);
              }
            }
          }
        }

        // Yeni sezon kupa fikstürünü üret — kullanıcı her zaman kupada
        // P0 FIX: buildCupFixtures kullan — kullanıcı zorunlu dahil
        const newCupMatches = buildCupFixtures(updatedClubs, myTeamId);

        set({
          clubs: updatedClubs,
          fixtures: newFixtures,
          tactics: newTactics,
          seasonNumber: newSeasonNumber,
          seasonMatchday: 1,
          cup: {
            matches: newCupMatches,
            currentRound: 2, // Çeyrek final = round 2
            champion: undefined,
            eliminated: false,
          },
          // P1 FIX: Transfer state temizle — ghost oyuncu referansları kalmasın
          // P0 FIX: Yeni sezonda serbest oyuncuları yaşlandır + 40+ oyuncuları kaldır
          // P0 FIX: Yeni sezonda sponsor state'i sıfırla
          transfer: (() => {
            try {
              
              const agedFreeAgents = (get().transfer.freeAgents || []).map((l: any) => ({
                ...l,
                player: { ...l.player, age: l.player.age + 1 },
              })).filter((l: any) => l.player.age < 40);
              const agedListings = (get().transfer.freeAgentListings || []).map((l: any) => ({
                ...l,
                player: { ...l.player, age: l.player.age + 1 },
              })).filter((l: any) => l.player.age < 40);
              return {
                freeAgents: agedFreeAgents.length > 0 ? agedFreeAgents : generateFreeAgents(30),
                freeAgentListings: agedListings.length > 0 ? agedListings : generateFreeAgentListings(15),
                loanListings: generateLoanListings(updatedClubs, 10),
                watchlist: [],
                myListedPlayers: [],
                incomingOffers: [], // P0 FIX: eski sezon tekliflerini temizle
                messages: [],
              };
            } catch (e) {
              console.warn("[endSeason] transfer reset hatası:", e);
              return {
                ...get().transfer,
                watchlist: [],
                myListedPlayers: [],
                incomingOffers: [],
                messages: [],
              };
            }
          })(),
          // P0 FIX: Sponsor state'i sıfırla — yeni sezonda yeni teklifler üretilecek
          sponsors: {
            active: [], // Eski sezon sponsorları biter
            offers: [],
          },
          // P5: Yeni sezon başı stats'larını kaydet
          seasonStartStats: (() => {
            const map: Record<string, Record<string, number>> = {};
            for (const club of updatedClubs) {
              for (const p of club.players) {
                map[p.id] = {
                  rating: p.rating ?? 50,
                  finishing: p.finishing ?? 50,
                  dribbling: p.dribbling ?? 50,
                  passing: p.passing ?? 50,
                  shooting: p.shooting ?? 50,
                  tackling: p.tackling ?? 50,
                  marking: p.marking ?? 50,
                  heading: p.heading ?? 50,
                  speed: p.speed ?? p.stats?.pace ?? 50,
                  stamina: p.stamina ?? 50,
                  strength: p.strength ?? 50,
                  vision: p.vision ?? 50,
                  technique: p.technique ?? 50,
                  crossing: p.crossing ?? 50,
                  longShots: p.longShots ?? 50,
                  firstTouch: p.firstTouch ?? 50,
                  offTheBall: p.offTheBall ?? 50,
                };
              }
            }
            return map;
          })(),
        });

        const summary: SeasonSummary = {
          season: newSeasonNumber,
          finalPosition: myIdx + 1,
          played: myStat?.played ?? 0,
          won: myStat?.won ?? 0,
          drawn: myStat?.drawn ?? 0,
          lost: myStat?.lost ?? 0,
          points: myStat?.points ?? 0,
          promoted: myIdx < 3 && (team.leagueTier ?? 2) > 1,
          relegated: myIdx >= 15 && (team.leagueTier ?? 2) < 4,
          topScorer,
          retiredPlayers: retiredNames,
          newRegens: retiredNames.length,
        };

        // Şampiyon belirle + bildirim ekle + achievement kontrolü
        try {
          const championTeam = standings[0];
          const isUserChampion = championTeam?.teamId === myTeamId;
          // Haber ekle — şampiyon
          const championNews: NewsItem = {
            id: `news-champion-${Date.now()}`,
            category: "milestone",
            headline: isUserChampion
              ? `🏆 ${team.name} Şampiyon Oldu!`
              : `🏆 ${championTeam?.teamName ?? "—"} Sezon Şampiyonu`,
            body: isUserChampion
              ? `Sezon ${oldSeasonNumber} sonunda ${team.name} ligi ${championTeam?.points ?? 0} puanla 1. sırada bitirdi! Tarihi an!`
              : `${championTeam?.teamName ?? "—"} ligi ${championTeam?.points ?? 0} puanla şampiyon olarak tamamladı. Sen ise ${myIdx + 1}. sırada bitirdin.`,
            timestamp: Date.now(),
            importance: 10,
            read: false,
            relatedTeamId: championTeam?.teamId,
          };
          // Achievement kontrolü — client-side localStorage
          if (typeof window !== "undefined") {
            try {
              const newlyUnlocked = checkAchievements({
                leaguePosition: myIdx + 1,
                promoted: summary.promoted,
                seasonsPlayed: newSeasonNumber - 1,
                cupWon: get().cup.champion === myTeamId,
              });
              // Achievement haberleri ekle
              for (const ach of newlyUnlocked) {
                championNews.body += `\n✅ Başarım açıldı: ${ach.name}!`;
              }
            } catch (e) {
              console.warn("[endSeason] achievement check failed:", e);
            }
          }
          set({ news: [championNews, ...get().news] });
        } catch (e) {
          console.warn("[endSeason] achievement/news failed:", e);
        }

        // P0 FIX: Yeni sezon başı incoming offers üret — kullanıcı yeni sezona boş transfer teklifleriyle başlamasın
        try {
          
          const myNewTeam = get().clubs.find(c => c.id === myTeamId);
          if (myNewTeam) {
            const newOffers = generateIncomingOffers(myNewTeam.players);
            if (newOffers && newOffers.length > 0) {
              set({
                transfer: { ...get().transfer, incomingOffers: newOffers },
              });
            }
          }
        } catch (e) {
          console.warn("[endSeason] incoming offers üretme hatası:", e);
        }

        // P0 FIX: Yeni sezon başı sponsor teklifleri üret
        try {
          const myNewTeam2 = get().clubs.find(c => c.id === myTeamId);
          if (myNewTeam2) {
            const genOffers = generateSponsorOffers;
            const avgOvr = myNewTeam2.players.reduce((s, p) => s + p.rating, 0) / myNewTeam2.players.length;
            const offers = genOffers(myNewTeam2.leagueTier ?? 2, avgOvr);
            set({ sponsors: { active: [], offers } });
          }
        } catch (e) { /* sponsorSystem yoksa ignore */ }

        // P0: Sezon sonu kredi bonusu — performans bazlı
        try {
          const finalPos = myIdx + 1;
          let seasonBonus = 20; // temel bonus
          if (finalPos === 1) seasonBonus += 80; // şampiyon
          else if (finalPos <= 3) seasonBonus += 40; // ilk 3
          else if (finalPos <= 6) seasonBonus += 20; // ilk 6
          if (summary.promoted) seasonBonus += 30; // yükselme
          if (get().cup.champion === myTeamId) seasonBonus += 50; // kupa şampiyonu
          const currentCredits = get().credits;
          set({ credits: currentCredits + seasonBonus });
          console.log(`[endSeason] Kredi bonusu: +${seasonBonus} (sezon sonu)`);
        } catch (e) { /* ignore */ }

        return { success: true, summary };
      },

      recordMatchResult: (homeId, awayId, homeScore, awayScore) => {
        const { fixtures, clubs, myTeamId, news } = get();
        const currentMd = SEASON_INFO.matchday;
        const updatedFixtures = fixtures.map((f) => {
          if (f.matchday === currentMd && f.homeId === homeId && f.awayId === awayId && !f.played) {
            return { ...f, homeScore, awayScore, played: true };
          }
          return f;
        });

        // Dinamik haber üret — kullanıcının takımı maçı oynadıysa
        const newNews: NewsItem[] = [];
        if (myTeamId && (homeId === myTeamId || awayId === myTeamId)) {
          const homeTeam = clubs.find((c) => c.id === homeId);
          const awayTeam = clubs.find((c) => c.id === awayId);
          const isHome = homeId === myTeamId;
          const myScore = isHome ? homeScore : awayScore;
          const oppScore = isHome ? awayScore : homeScore;
          const oppName = isHome ? awayTeam?.name : homeTeam?.name;
          const result = myScore > oppScore ? "galibiyet" : myScore < oppScore ? "mağlubiyet" : "beraberlik";

          const headlineMap = { galibiyet: "Maç Sonucu: Galibiyet! 🎉", mağlubiyet: "Maç Sonucu: Mağlubiyet", beraberlik: "Maç Sonucu: Beraberlik" };
          const bodyMap = {
            galibiyet: `${myScore}-${oppScore} ${oppName} karşısında galip geldiniz! Takım morali yükseldi.`,
            mağlubiyet: `${myScore}-${oppScore} ${oppName} karşısında mağlup oldunuz. Takım morali düştü.`,
            beraberlik: `${myScore}-${oppScore} ${oppName} ile berabere kaldınız.`,
          };

          newNews.push({
            id: `news_match_${currentMd}_${Date.now()}`,
            category: "match",
            headline: headlineMap[result],
            body: bodyMap[result],
            timestamp: Date.now(),
            importance: result === "galibiyet" ? 2 : 1,
            read: false,
          });

          // Gol krallığı haberi — 2+ gol atan oyuncu
          const myTeam = clubs.find((c) => c.id === myTeamId);
          if (myTeam) {
            const topScorer = [...myTeam.players].sort((a, b) => b.goals - a.goals)[0];
            if (topScorer && topScorer.goals >= 5 && topScorer.goals % 5 === 0) {
              newNews.push({
                id: `news_milestone_${topScorer.id}_${Date.now()}`,
                category: "milestone",
                headline: "Milestone! ⚽",
                body: `${topScorer.firstName} ${topScorer.lastName} sezonun ${topScorer.goals}. golünü attı!`,
                timestamp: Date.now(),
                importance: 2,
                read: false,
              });
            }
          }
        }

        set({ fixtures: updatedFixtures, news: [...newNews, ...news] });
      },

      // ADDED: ===== Sponsor actions =====
      generateSponsorOffers: () => {
        const { clubs, myTeamId, sponsors } = get();
        const myTeam = clubs.find((c) => c.id === myTeamId);
        if (!myTeam) return;
        // P2 FIX: Zaten aktif sponsor varsa veya teklifler varsa yeni üretme
        if (sponsors.active?.some((s: any) => s.isActive)) return;
        if (sponsors.offers && sponsors.offers.length > 0) return;
        const avgOvr = myTeam.players.reduce((s, p) => s + p.rating, 0) / myTeam.players.length;
        try {
          
          const offers = generateSponsorOffers(myTeam.leagueTier ?? 2, avgOvr);
          set({ sponsors: { ...sponsors, offers } });
        } catch (e) {
          console.warn("[generateSponsorOffers] hata:", e);
        }
      },

      acceptSponsor: (sponsorId) => {
        const { sponsors, clubs, myTeamId } = get();
        const offer = sponsors.offers.find((s) => s.id === sponsorId);
        if (!offer) return;
        // P0 FIX: Çoklu sponsor desteği — önceki aktif sponsorları koru, yenisini ekle
        // (Tasarım sponsorSystem.ts çoklu sponsor destekliyor — getTotalSponsorIncome tüm aktifleri toplar)
        const activeSponsor = { ...offer, isActive: true };
        const sponsorNews: NewsItem = {
          id: `news_sponsor_${Date.now()}`,
          category: "transfer",
          headline: `🤝 ${offer.name} Sponsor Oldu`,
          body: `${offer.name} ile ${offer.tier} tier sponsorluk anlaşması imzalandı. Haftalık gelir: ${offer.amount.toLocaleString("tr-TR")} €.`,
          timestamp: Date.now(),
          importance: 3,
          read: false,
        };
        set({
          sponsors: {
            // Önceki aktif sponsorları koru + yenisini ekle
            active: [...(sponsors.active ?? []), activeSponsor],
            offers: sponsors.offers.filter((s) => s.id !== sponsorId),
          },
          news: [sponsorNews, ...(get().news ?? [])],
        });
      },

      getSponsorWeeklyIncome: () => {
        const { sponsors } = get();
        try {
          
          return getTotalSponsorIncome(sponsors.active);
        } catch {
          return 0;
        }
      },

      // P2 FIX: Sponsor teklifini reddet — offers listesinden kaldır
      rejectSponsor: (sponsorId) => {
        const { sponsors } = get();
        set({
          sponsors: {
            ...sponsors,
            offers: sponsors.offers.filter((s) => s.id !== sponsorId),
          },
        });
      },

      // P0: ===== Kredi sistemi actions =====
      addCredits: (amount) => {
        const { credits } = get();
        set({ credits: credits + amount });
      },

      spendCredits: (amount) => {
        const { credits } = get();
        if (credits < amount) return false;
        set({ credits: credits - amount });
        return true;
      },

      buyPlayerPack: (packType) => {
        const { credits, clubs, myTeamId, transfer } = get();
        const PACK_PRICES = { bronze: 10, silver: 25, gold: 50, platinum: 100 };
        const PACK_OVR = {
          bronze: { min: 50, max: 65 },
          silver: { min: 60, max: 75 },
          gold: { min: 70, max: 85 },
          platinum: { min: 78, max: 92 },
        };
        const price = PACK_PRICES[packType];
        if (credits < price) {
          return { success: false, reason: "Yetersiz kredi" };
        }

        // 3 oyuncu üret
        
        const ovrRange = PACK_OVR[packType];
        const positions = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST", "CF"];
        const pulledPlayers: any[] = [];
        for (let i = 0; i < 3; i++) {
          const pos = positions[Math.floor(Math.random() * positions.length)];
          const player = generatePlayer(pos as any, ovrRange);
          // Paketten gelen oyuncuları serbest ajan listesine ekle
          // Kullanıcı normal bütçeyle imzalamak zorunda — pay-to-win değil
          pulledPlayers.push(player);
        }

        // Serbest ajan listesine ekle
        const newFreeAgents = pulledPlayers.map(p => ({
          player: p,
          askingPrice: Math.round((p.marketValue ?? p.market_value ?? 500_000) * 0.8), // %20 indirim
          wageDemand: Math.round((p.weeklyWage ?? 5000) * 0.8),
          daysListed: 1,
          offers: 0,
        }));

        set({
          credits: credits - price,
          transfer: {
            ...transfer,
            freeAgents: [...newFreeAgents, ...(transfer.freeAgents ?? [])],
          },
        });

        return { success: true, players: pulledPlayers };
      },

      // ===== Message actions =====
      markMessageRead: (msgId) => {
        const { transfer } = get();
        set({ transfer: { ...transfer, messages: transfer.messages.map((m) => m.id === msgId ? { ...m, read: true } : m) } });
      },
      markAllMessagesRead: () => {
        const { transfer } = get();
        set({ transfer: { ...transfer, messages: transfer.messages.map((m) => ({ ...m, read: true })) } });
      },
      clearMessage: (msgId) => {
        const { transfer } = get();
        set({ transfer: { ...transfer, messages: transfer.messages.filter((m) => m.id !== msgId) } });
      },
      respondToIncomingMessage: (msgId, response) => {
        const { transfer, clubs, myTeamId } = get();
        const msg = transfer.messages.find((m) => m.id === msgId);
        if (!msg || msg.kind !== "transfer_offer_incoming") return;
        if (response === "accept" && msg.playerId && msg.amount) {
          const team = clubs.find((c) => c.id === myTeamId);
          if (team) {
            team.budget += msg.amount;
            team.players = team.players.filter((p) => p.id !== msg.playerId);
            set({
              clubs: [...clubs],
              transfer: { ...transfer, myListedPlayers: transfer.myListedPlayers.filter((l) => l.playerId !== msg.playerId), messages: transfer.messages.map((m) => m.id === msgId ? { ...m, read: true } : m) },
            });
            return;
          }
        }
        set({ transfer: { ...transfer, messages: transfer.messages.map((m) => m.id === msgId ? { ...m, read: true } : m) } });
      },
      completeTransfer: (offerId) => {
        // P0 FIX: Oyuncu transferini gerçekleştir (sadece para düşmüyordu)
        const { transfer, clubs, myTeamId, news } = get();
        const team = clubs.find((c) => c.id === myTeamId);
        if (!team) return { success: false, reason: "no-team" };
        const msg = transfer.messages.find((m) => m.relatedOfferId === offerId);
        if (!msg || !msg.amount) return { success: false, reason: "no-offer" };
        if (team.budget < msg.amount) return { success: false, reason: "budget" };

        // P0 FIX: Oyuncuyu bul — msg.playerId'den
        const playerId = msg.playerId;
        if (playerId) {
          // Satıcı takımı bul
          let sellerTeam: Team | undefined;
          let player: any;
          for (const c of clubs) {
            if (c.id === myTeamId) continue;
            const p = c.players.find((pp) => pp.id === playerId);
            if (p) { sellerTeam = c; player = p; break; }
          }
          // Serbest ajan mı?
          const faListing = transfer.freeAgents.find((l) => l.player.id === playerId);
          if (faListing && !sellerTeam) {
            player = faListing.player;
          }

          if (player) {
            // P1 FIX: Kadro limiti
            if (team.players.length >= 25) {
              return { success: false, reason: "squad-full" };
            }
            const updatedPlayer = { ...player, weeklyWage: player.weeklyWage, salary: player.weeklyWage };
            const updatedClubs = clubs.map((c) => {
              if (c.id === team.id) {
                return { ...c, budget: c.budget - (msg.amount ?? 0), players: [...c.players, updatedPlayer] };
              }
              if (sellerTeam && c.id === sellerTeam.id) {
                return { ...c, budget: c.budget + (msg.amount ?? 0), players: c.players.filter((p) => p.id !== playerId) };
              }
              return c;
            });
            // Haber ekle
            const newNews: NewsItem = {
              id: `news_transfer_${playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              category: "transfer",
              headline: "Transfer Tamamlandı",
              body: `${player.firstName} ${player.lastName} takımınıza katıldı. Transfer ücreti: ${formatEuroShort(msg.amount)}.`,
              timestamp: Date.now(), importance: 3, read: false, playerId,
            };
            const updatedTransfer = faListing
              ? { ...transfer, freeAgents: transfer.freeAgents.filter((l) => l.player.id !== playerId), messages: transfer.messages.filter((m) => m.id !== msg.id) }
              : { ...transfer, messages: transfer.messages.filter((m) => m.id !== msg.id) };
            set({ clubs: updatedClubs, news: [newNews, ...news], transfer: updatedTransfer });
            return { success: true };
          }
        }

        // Oyuncu bulunamadı — sadece para düş
        const updatedTeam = { ...team, budget: team.budget - msg.amount };
        set({ clubs: clubs.map((c) => (c.id === team.id ? updatedTeam : c)), transfer: { ...transfer, messages: transfer.messages.filter((m) => m.id !== msg.id) } });
        return { success: true };
      },
      acceptCounterOffer: (offerId) => {
        // P0 FIX: Oyuncu transferini gerçekleştir (sadece para düşmüyordu)
        const { transfer, clubs, myTeamId, news } = get();
        const team = clubs.find((c) => c.id === myTeamId);
        if (!team) return { success: false, reason: "no-team" };
        const msg = transfer.messages.find((m) => m.relatedOfferId === offerId);
        if (!msg || !msg.counterOffer) return { success: false, reason: "no-offer" };
        if (team.budget < msg.counterOffer) return { success: false, reason: "budget" };

        const playerId = msg.playerId;
        if (playerId) {
          let sellerTeam: Team | undefined;
          let player: any;
          for (const c of clubs) {
            if (c.id === myTeamId) continue;
            const p = c.players.find((pp) => pp.id === playerId);
            if (p) { sellerTeam = c; player = p; break; }
          }
          const faListing = transfer.freeAgents.find((l) => l.player.id === playerId);
          if (faListing && !sellerTeam) {
            player = faListing.player;
          }

          if (player) {
            if (team.players.length >= 25) {
              return { success: false, reason: "squad-full" };
            }
            const updatedPlayer = { ...player, weeklyWage: player.weeklyWage, salary: player.weeklyWage };
            const updatedClubs = clubs.map((c) => {
              if (c.id === team.id) {
                return { ...c, budget: c.budget - (msg.counterOffer ?? 0), players: [...c.players, updatedPlayer] };
              }
              if (sellerTeam && c.id === sellerTeam.id) {
                return { ...c, budget: c.budget + (msg.counterOffer ?? 0), players: c.players.filter((p) => p.id !== playerId) };
              }
              return c;
            });
            const newNews: NewsItem = {
              id: `news_transfer_${playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              category: "transfer",
              headline: "Transfer Tamamlandı",
              body: `${player.firstName} ${player.lastName} takımınıza katıldı. Transfer ücreti: ${formatEuroShort(msg.counterOffer)}.`,
              timestamp: Date.now(), importance: 3, read: false, playerId,
            };
            const updatedTransfer = faListing
              ? { ...transfer, freeAgents: transfer.freeAgents.filter((l) => l.player.id !== playerId), messages: transfer.messages.filter((m) => m.id !== msg.id) }
              : { ...transfer, messages: transfer.messages.filter((m) => m.id !== msg.id) };
            set({ clubs: updatedClubs, news: [newNews, ...news], transfer: updatedTransfer });
            return { success: true };
          }
        }

        const updatedTeam = { ...team, budget: team.budget - msg.counterOffer };
        set({ clubs: clubs.map((c) => (c.id === team.id ? updatedTeam : c)), transfer: { ...transfer, messages: transfer.messages.filter((m) => m.id !== msg.id) } });
        return { success: true };
      },
      rejectCounterOffer: (offerId) => {
        const { transfer } = get();
        const msg = transfer.messages.find((m) => m.relatedOfferId === offerId);
        if (!msg) return;
        set({ transfer: { ...transfer, messages: transfer.messages.filter((m) => m.id !== msg.id) } });
      },

      // ===== News actions =====
      markNewsRead: (newsId) => {
        const { news } = get();
        set({ news: news.map((n) => n.id === newsId ? { ...n, read: true } : n) });
      },
      markAllNewsRead: () => {
        const { news } = get();
        set({ news: news.map((n) => ({ ...n, read: true })) });
      },
      generateNews: () => {
        const { clubs, myTeamId, news } = get();
        const team = clubs.find((c) => c.id === myTeamId);
        if (!team) return;
        const now = Date.now();
        const newItems: NewsItem[] = [];
        const recentFixture = get().fixtures.filter((f) => f.played && (f.homeId === myTeamId || f.awayId === myTeamId)).slice(-1)[0];
        if (recentFixture) {
          const isHome = recentFixture.homeId === myTeamId;
          const myScore = isHome ? recentFixture.homeScore : recentFixture.awayScore;
          const oppScore = isHome ? recentFixture.awayScore : recentFixture.homeScore;
          const opp = clubs.find((c) => c.id === (isHome ? recentFixture.awayId : recentFixture.homeId));
          const won = (myScore ?? 0) > (oppScore ?? 0);
          const drew = (myScore ?? 0) === (oppScore ?? 0);
          newItems.push({
            id: `n_${now}_m`, category: "match",
            headline: won ? `${team.name} ${opp?.name ?? "rakibini"} ${myScore}-${oppScore} mağlup etti!` : drew ? `${team.name} ${opp?.name ?? "rakibiyle"} ${myScore}-${oppScore} berabere kaldı` : `${team.name}, ${opp?.name ?? "rakibine"} ${myScore}-${oppScore} mağlup oldu`,
            body: won ? `${team.name} kritik maçtan 3 puanla ayrıldı.` : drew ? `${team.name} beraberlikle yetindi.` : `${team.name} hayal kırıklığı yarattı.`,
            timestamp: now, importance: won ? 4 : drew ? 2 : 3, read: false, relatedTeamId: team.id,
          });
        }
        if (newItems.length > 0) set({ news: [...newItems, ...news].slice(0, 50) });
      },

      // ===== Cloud actions =====
      loadMultiplayerState: async (userId) => {
        try {
          const { supabase } = await import("@/lib/supabase/client");
          const { POSITION_GROUP } = await import("@/lib/mock/data");
          const { data: myTeam, error: teamErr } = await supabase().from("teams").select("*").eq("manager_user_id", userId).maybeSingle();
          if (teamErr) return { success: false, reason: teamErr.message };
          if (!myTeam) return { success: true };

          const { data: userTactics } = await supabase().from("active_tactics").select("tactic_data, lineup_data, slot_roles, active_instructions").eq("profile_id", userId).maybeSingle();
          const { data: deptTeams, error: deptErr } = await supabase().from("teams").select("*").eq("department_id", myTeam.department_id);
          if (deptErr) return { success: false, reason: deptErr.message };
          const teamIds = deptTeams.map((t: any) => t.id);
          const { data: allPlayers, error: playerErr } = await supabase().from("players").select("*").in("team_id", teamIds);
          if (playerErr) return { success: false, reason: playerErr.message };
          const { data: fixtures, error: fxErr } = await supabase().from("fixtures").select("*").in("home_team_id", teamIds).order("matchday");
          if (fxErr) return { success: false, reason: fxErr.message };

          const { data: appStateData } = await supabase().from("app_state").select("state").eq("user_id", userId).maybeSingle();
          const savedState = appStateData?.state as any;

          const clubs = deptTeams.map((t: any) => {
            const players = (allPlayers ?? []).filter((p: any) => p.team_id === t.id).map((p: any) => ({
              id: p.id, firstName: p.first_name, lastName: p.last_name, name: p.name,
              position: POSITION_GROUP[p.specific_position as keyof typeof POSITION_GROUP] ?? "MID",
              specificPosition: p.specific_position, secondaryPositions: p.secondary_positions ?? [],
              age: p.age, potential: p.potential, hidden_potential: p.hidden_potential, rating: p.rating,
              formRating: 6.5, nationality: p.nationality, nation: p.nation, foot: p.preferred_foot,
              preferred_foot: p.preferred_foot, height: p.height, weight: p.weight,
              market_value: p.market_value, marketValue: p.market_value, salary: p.salary, weeklyWage: p.salary,
              defending: p.defending, passing: p.passing, shooting: p.shooting, speed: p.speed, power: p.power,
              vision: p.vision, control: p.control, stamina: p.stamina, heading: p.heading, goalkeeping: p.goalkeeping,
              finishing: p.finishing, dribbling: p.dribbling, firstTouch: p.first_touch, crossing: p.crossing,
              marking: p.marking, tackling: p.tackling, technique: p.technique, longShots: p.long_shots, offTheBall: p.off_the_ball,
              aggression: p.aggression, bravery: p.bravery, workRate: p.work_rate, decisions: p.decisions,
              determination: p.determination, concentration: p.concentration, leadership: p.leadership,
              anticipation: p.anticipation, flair: p.flair, positioning: p.positioning, composure: p.composure, teamwork: p.teamwork,
              agility: p.agility, balance: p.balance, strength: p.strength, acceleration: p.acceleration,
              jumping: p.jumping, leftFoot: p.left_foot, rightFoot: p.right_foot,
              stats: { pace: p.speed, shooting: p.shooting, passing: p.passing, defending: p.defending, physical: p.power, dribbling: p.dribbling },
              archetype: p.archetype ?? undefined, playStyle: p.play_style ?? undefined,
              traits: p.traits ?? [], negTraits: p.neg_traits ?? [], personalityTraits: p.personality_traits ?? [],
              cond: p.cond, condition: p.cond, form: p.form, morale: p.morale, confidence: p.confidence, chemistry: p.chemistry,
              goals: p.goals ?? 0, assists: p.assists ?? 0, saves: p.saves ?? 0, appearances: p.appearances ?? 0,
              match_ratings: p.match_ratings ?? [], last_match_rating: p.last_match_rating,
              is_injured: p.is_injured ?? false, injury: p.injury,
              suspended_until: p.suspended_until, is_for_sale: p.is_for_sale, sale_price: p.sale_price,
              is_free_agent: p.is_free_agent, photo_url: p.photo_url,
            }));
            return {
              id: t.id, name: t.name, shortName: t.short_name, primaryColor: t.primary_color, secondaryColor: t.secondary_color,
              leagueTier: t.league_tier === "super_lig" ? 1 : t.league_tier === "1_lig" ? 2 : t.league_tier === "2_lig" ? 3 : 4,
              department: t.department_id, players, budget: t.budget, stadiumCapacity: t.stadium_capacity,
              stadiumName: t.stadium_name, is_bot: t.is_bot, manager_user_id: t.manager_user_id,
            };
          });

          const fixtureRows = (fixtures ?? []).map((f: any) => ({
            id: f.id, matchday: f.matchday, homeId: f.home_team_id, awayId: f.away_team_id,
            homeScore: f.home_score, awayScore: f.away_score, played: f.status === "finished" || f.played_at != null,
          }));

          set({
            isAuthed: true, managerName: myTeam.name, myTeamId: myTeam.id, clubs, fixtures: fixtureRows,
            facilities: savedState?.facilities ?? { levels: { stadium: 0, pitch: 0, academy: 0, gym: 0, medical: 0, analysis: 0 }, staff: [], activeUpgrade: null, ticketPrice: 60 },
            training: savedState?.training ?? getDefaultTrainingState(),
            news: savedState?.news ?? [],
            tactics: userTactics ? {
              active: userTactics.tactic_data ?? { ...DEFAULT_TACTIC },
              lineup: userTactics.lineup_data ?? Array(11).fill(null),
              slotRoles: userTactics.slot_roles ?? {}, activeInstructions: userTactics.active_instructions ?? {},
              formationKey: userTactics.tactic_data?.formation ?? "4-4-2",
              sliders: { attackingPressure: userTactics.tactic_data?.aggression ?? 50, defensiveLine: userTactics.tactic_data?.lineHeight ?? 50, tempo: userTactics.tactic_data?.passingIntensity ?? 50, wingPlay: userTactics.tactic_data?.width ?? 50 },
              roles: {},
            } : get().tactics,
            seasonMatchday: 1, seasonNumber: 1,
          });
          return { success: true };
        } catch (err: any) {
          console.error("[loadMultiplayer] exception:", err);
          return { success: false, reason: err?.message ?? "unknown" };
        }
      },

      saveToCloud: async (userId) => {
        try {
          const { supabase } = await import("@/lib/supabase/client");
          let uid = userId;
          if (!uid) { const { data: sess } = await supabase().auth.getSession(); uid = sess.session?.user?.id ?? null; }
          if (!uid) return;
          const s = get();
          await supabase().from("active_tactics").upsert({
            profile_id: uid, tactic_data: s.tactics.active, lineup_data: s.tactics.lineup,
            slot_roles: s.tactics.slotRoles, active_instructions: s.tactics.activeInstructions,
          }, { onConflict: "profile_id" });
          await supabase().from("app_state").upsert({
            user_id: uid, state: { facilities: s.facilities, training: s.training, news: s.news },
          }, { onConflict: "user_id" });
        } catch {}
      },

      saveTacticsToCloud: async (userId) => {
        try {
          const { supabase } = await import("@/lib/supabase/client");
          let uid = userId;
          if (!uid) { const { data: sess } = await supabase().auth.getSession(); uid = sess.session?.user?.id ?? null; }
          if (!uid) return;
          const s = get();
          await supabase().from("active_tactics").upsert({
            profile_id: uid, tactic_data: s.tactics.active, lineup_data: s.tactics.lineup,
            slot_roles: s.tactics.slotRoles, active_instructions: s.tactics.activeInstructions,
          }, { onConflict: "profile_id" });
        } catch {}
      },
    })
);

// Helpers (selectors)
export function useMyTeam(): Team | null {
  return useAppStore((s) => s.clubs.find((c) => c.id === s.myTeamId) ?? null);
}

export function getFormation(key: string): Formation {
  return FORMATIONS.find((f) => f.key === key) ?? FORMATIONS[0];
}
