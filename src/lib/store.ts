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
import { DEFAULT_TACTIC, type ActiveTactic } from "@/lib/tactics/types";

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
  // season actions
  endSeason: () => { success: boolean; summary?: SeasonSummary };
  advanceMatchday: () => void;
  recordMatchResult: (homeId: string, awayId: string, homeScore: number, awayScore: number) => void;
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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function defaultTacticsFor(team: Team): Tactics {
  const formation = FORMATIONS[0]; // 4-4-2
  return {
    active: { ...DEFAULT_TACTIC },
    lineup: autoFillLineup(team, formation),
    slotRoles: {},
    activeInstructions: {},
    formationKey: formation.key,
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

        set({
          isAuthed: true,
          managerName: name || "Menajer",
          myTeamId,
          clubs,
          fixtures,
          tactics,
          transfer,
        });
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
        // formation değiştiğinde lineup'ı yeniden doldur
        let newLineup = tactics.lineup;
        if (patch.formation && patch.formation !== tactics.active.formation) {
          const formation = FORMATIONS.find((f) => f.key === patch.formation);
          const team = get().clubs.find((c) => c.id === get().myTeamId);
          if (formation && team) {
            newLineup = autoFillLineup(team, formation);
          }
        }
        set({
          tactics: {
            ...tactics,
            active: newActive,
            lineup: newLineup,
            formationKey: newActive.formation,
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

      buyPlayer: (playerId, fee, _wage, _contractYears) => {
        const { clubs, myTeamId, transfer } = get();
        const team = clubs.find((c) => c.id === myTeamId);
        if (!team) return { success: false, reason: "no-team" };

        // Toplam maliyet (transfer + %5 agent + %3 imza)
        const total = fee + Math.round(fee * 0.05) + Math.round(fee * 0.03);
        if (team.budget < total) {
          return { success: false, reason: "budget" };
        }

        // Listing bul
        const listing = transfer.freeAgents.find((l) => l.player.id === playerId);
        if (!listing) return { success: false, reason: "not-found" };

        // Teklif kontrolü — istilen fiyatın %85'i altında reddedilir
        if (fee < listing.askingPrice * 0.85) {
          return { success: false, reason: "too-low" };
        }

        // Atomik işlem: bütçe düş, oyuncu kadroya ekle, free agent'tan çıkar
        team.budget -= total;
        team.players = [...team.players, listing.player];

        set({
          clubs: [...clubs], // array referansı değişsin
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

        // Toplam maliyet: transfer ücreti + %5 agent + %3 imza
        const total = fee + Math.round(fee * 0.05) + Math.round(fee * 0.03);
        if (myTeam.budget < total) {
          return { success: false, reason: "budget" };
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
            set({
              clubs: [...clubs],
              transfer: { ...transfer, freeAgents: transfer.freeAgents.filter((l) => l.player.id !== playerId) },
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
            set({
              clubs: [...clubs],
              transfer: { ...transfer, freeAgentListings: transfer.freeAgentListings?.filter((l) => l.player.id !== playerId) ?? [] },
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

          set({
            clubs: [...clubs],
            news: [newNews, ...news],
          });

          return { success: true, response: "accepted" };
        } else if (response === "countered") {
          // Karşı teklif mesajı ekle
          const newNews: NewsItem = {
            id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            category: "transfer",
            headline: "Karşı Teklif",
            body: `${sellerTeam.name}, ${player.firstName} ${player.lastName} için ${formatEuroShort(fee)} teklifinizi reddetti. Karşı teklif: ${formatEuroShort(counterFee)}.`,
            timestamp: Date.now(),
            importance: 1,
            read: false,
          };

          set({ news: [newNews, ...news] });
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

          set({ news: [newNews, ...news] });
          return { success: true, response: "rejected" };
        }
      },

      makeLoanOffer: (playerId, loanFee, weeks) => {
        const { clubs, myTeamId, news, transfer } = get();
        const myTeam = clubs.find((c) => c.id === myTeamId);
        if (!myTeam) return { success: false, reason: "no-team" };

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

        const marketValue = player.marketValue ?? player.market_value ?? 0;
        // Bot kiralama kararı: min ücret = marketValue * 0.02 * hafta
        const minLoanFee = Math.round(marketValue * 0.02 * weeks);

        if (loanFee >= minLoanFee) {
          // Kabul edildi — oyuncuyu kiralık ver
          myTeam.budget -= loanFee;
          sellerTeam.budget += loanFee;
          // Oyuncu geçici olarak kadroya ekle (kiralık)
          myTeam.players = [...myTeam.players, { ...player, is_free_agent: false, _loaned: true, _loanWeeks: weeks }];
          // Satıcıda kalsın ama oynayamaz (basitleştirilmiş: satıcıdan çıkarmıyoruz, sadece kopyalıyoruz)

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
        const { clubs, myTeamId, transfer } = get();
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
        team.budget += net;
        team.players = team.players.filter((p) => p.id !== offer.myPlayerId);

        set({
          clubs: [...clubs],
          transfer: {
            ...transfer,
            incomingOffers: transfer.incomingOffers.filter((o) => o.id !== offerId),
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
        const results = runTrainingSession(team.players, training, facilityLevel, multiplier);

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

      // ===== Season actions =====
      advanceMatchday: () => {
        const { fixtures, clubs, myTeamId, transfer } = get();
        const currentMd = SEASON_INFO.matchday;

        // Bot vs bot maçlarını simüle et (kullanıcının maçları hariç)
        const updatedFixtures = fixtures.map((f) => {
          if (f.matchday !== currentMd || f.played) return f;
          if (f.homeId === myTeamId || f.awayId === myTeamId) return f;
          const homeTeam = clubs.find((c) => c.id === f.homeId);
          const awayTeam = clubs.find((c) => c.id === f.awayId);
          if (!homeTeam || !awayTeam) return f;
          const homeStr = homeTeam.players.slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11;
          const awayStr = awayTeam.players.slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11;
          const diff = homeStr - awayStr;
          const homeAdv = diff > 5 ? 0.3 : diff < -5 ? -0.3 : 0;
          const hs = Math.max(0, Math.floor(Math.random() * 4 + homeAdv * 2));
          const as = Math.max(0, Math.floor(Math.random() * 3 - homeAdv * 2));
          return { ...f, homeScore: hs, awayScore: as, played: true };
        });

        // Bot maçlarında oyunculara gol/assist dağıt — Gol Kralı yarışması için
        const pickScorer = (players: any[]) => {
          const attackers = players.filter(p => p.specificPosition !== "GK" && !p.is_injured);
          if (attackers.length === 0) return null;
          // Forvetler daha çok gol atar
          const forwards = attackers.filter(p => ["ST", "CF", "LW", "RW", "LM", "RM", "CAM"].includes(p.specificPosition));
          const pool = forwards.length > 0 && Math.random() > 0.3 ? forwards : attackers;
          return pool[Math.floor(Math.random() * pool.length)];
        };

        for (const f of updatedFixtures) {
          if (f.matchday !== currentMd || !f.played) continue;
          if (f.homeId === myTeamId || f.awayId === myTeamId) continue;
          const homeTeam = clubs.find((c) => c.id === f.homeId);
          const awayTeam = clubs.find((c) => c.id === f.awayId);
          if (!homeTeam || !awayTeam) continue;

          // Home goals dağıt
          for (let i = 0; i < (f.homeScore ?? 0); i++) {
            const scorer = pickScorer(homeTeam.players);
            if (scorer) {
              scorer.goals = (scorer.goals ?? 0) + 1;
              scorer.appearances = (scorer.appearances ?? 0) + 1;
              // Asistçi
              const assistPool = homeTeam.players.filter(p => p.id !== scorer?.id && p.specificPosition !== "GK");
              if (assistPool.length > 0 && Math.random() > 0.4) {
                const assister = assistPool[Math.floor(Math.random() * assistPool.length)];
                assister.assists = (assister.assists ?? 0) + 1;
              }
            }
          }
          // Away goals dağıt
          for (let i = 0; i < (f.awayScore ?? 0); i++) {
            const scorer = pickScorer(awayTeam.players);
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

        // Bot AI — transfer aktivitesi
        const botTeams = clubs.filter((c) => c.id !== myTeamId && c.is_bot);
        const updatedTransfer = { ...transfer };
        const updatedClubs = [...clubs];

        for (const bot of botTeams) {
          // %30 ihtimalle serbest oyuncu al
          if (Math.random() < 0.3 && updatedTransfer.freeAgents.length > 0 && bot.budget > 500000) {
            const idx = Math.floor(Math.random() * Math.min(5, updatedTransfer.freeAgents.length));
            const listing = updatedTransfer.freeAgents[idx];
            if (listing.askingPrice < bot.budget) {
              const botIdx = updatedClubs.findIndex((c) => c.id === bot.id);
              updatedClubs[botIdx] = {
                ...bot,
                budget: bot.budget - listing.askingPrice,
                players: [...bot.players, listing.player],
              };
              updatedTransfer.freeAgents = updatedTransfer.freeAgents.filter((_, i) => i !== idx);
            }
          }

          // %15 ihtimalle oyuncu sat (en düşük OVR'li)
          if (Math.random() < 0.15 && bot.players.length > 18) {
            const weakest = [...bot.players].sort((a, b) => a.rating - b.rating)[0];
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
          // Gelir
          const stadiumCap = 5000 + facilitiesState.levels.stadium * 10000;
          const ticketRev = Math.round(stadiumCap * 0.6 * facilitiesState.ticketPrice);
          const sponsor = 200_000 + facilitiesState.levels.stadium * 30_000;
          const tv = 150_000;
          const merch = Math.round(stadiumCap * 0.4 * 2);
          const totalIncome = ticketRev + sponsor + tv + merch;
          // Gider
          const wages = myTeam.players.reduce((s, p) => s + p.weeklyWage, 0);
          const staffWages = facilitiesState.staff.reduce((s, st) => s + st.weeklyWage, 0);
          const facilityCost = Object.values(facilitiesState.levels).reduce((s, l) => s + l * 5000, 0);
          const totalExpense = wages + staffWages + facilityCost;
          const net = totalIncome - totalExpense;
          myTeam.budget += net;

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
        SEASON_INFO.matchday = Math.min(SEASON_INFO.totalMatchdays, currentMd + 1);

        // BUG-004 FIX: Otomatik antrenman — kullanıcı manuel tıklamak zorunda kalmasın
        // Her hafta hafif bir antrenman seansı çalıştır (multiplier=0.7, daha az kondisyon düşüşü)
        try {
          const trainingState = get().training;
          const facilitiesState = get().facilities;
          if (myTeam && trainingState.assignments.length > 0) {
            const facilityLevel = facilitiesState.levels.pitch;
            const results = runTrainingSession(myTeam.players, trainingState, facilityLevel, 0.7);
            const updatedPlayers = applyResultsToSquad(myTeam.players, results);
            const teamIdx = updatedClubs.findIndex((c) => c.id === myTeamId);
            if (teamIdx >= 0) {
              updatedClubs[teamIdx] = { ...updatedClubs[teamIdx], players: updatedPlayers };
            }
          }
        } catch (e) {
          console.warn("[advanceMatchday] auto-training failed:", e);
        }

        set({ fixtures: updatedFixtures, clubs: updatedClubs, transfer: updatedTransfer });
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
          const retireCount = c.players.length - remainingPlayers.length;
          const regens: Player[] = [];
          for (let i = 0; i < retireCount; i++) {
            const pos = c.players[Math.floor(Math.random() * c.players.length)].specificPosition;
            const regen = generatePlayer(pos, { min: 55, max: 70 });
            regen.age = 17; // Yeni regen
            regens.push(regen);
          }

          // Tüm oyuncuları yaşlandır + stat sıfırla
          const agedPlayers = [...remainingPlayers, ...regens].map((p) => ({
            ...p,
            age: p.age + 1,
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
          }));

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
        const { getInflationMultiplier } = require("@/lib/fm/inflation");
        const { TIER_BASE_BUDGETS } = require("@/lib/match/engine/constants");
        const newBudgetMultiplier = getInflationMultiplier(newSeasonNumber);
        updatedClubs.forEach((c) => {
          // Yeni lig tier'ına göre baz bütçe × enflasyon
          const tier = c.leagueTier ?? 2;
          const baseBudget = TIER_BASE_BUDGETS[tier] ?? TIER_BASE_BUDGETS[2];
          c.budget = Math.round(baseBudget * newBudgetMultiplier);
        });

        // Taktikleri sıfırla
        const updatedTeam = updatedClubs.find((c) => c.id === myTeamId);
        const newTactics = updatedTeam ? defaultTacticsFor(updatedTeam) : get().tactics;

        set({
          clubs: updatedClubs,
          fixtures: newFixtures,
          tactics: newTactics,
          seasonNumber: newSeasonNumber,
          seasonMatchday: 1,
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
        const { transfer, clubs, myTeamId } = get();
        const team = clubs.find((c) => c.id === myTeamId);
        if (!team) return { success: false, reason: "no-team" };
        const msg = transfer.messages.find((m) => m.relatedOfferId === offerId);
        if (!msg || !msg.amount) return { success: false, reason: "no-offer" };
        if (team.budget < msg.amount) return { success: false, reason: "budget" };
        team.budget -= msg.amount;
        set({ clubs: [...clubs], transfer: { ...transfer, messages: transfer.messages.filter((m) => m.id !== msg.id) } });
        return { success: true };
      },
      acceptCounterOffer: (offerId) => {
        const { transfer, clubs, myTeamId } = get();
        const team = clubs.find((c) => c.id === myTeamId);
        if (!team) return { success: false, reason: "no-team" };
        const msg = transfer.messages.find((m) => m.relatedOfferId === offerId);
        if (!msg || !msg.counterOffer) return { success: false, reason: "no-offer" };
        if (team.budget < msg.counterOffer) return { success: false, reason: "budget" };
        team.budget -= msg.counterOffer;
        set({ clubs: [...clubs], transfer: { ...transfer, messages: transfer.messages.filter((m) => m.id !== msg.id) } });
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
