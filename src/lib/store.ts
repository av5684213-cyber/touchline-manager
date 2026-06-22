"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  FORMATIONS,
  generateAllClubs,
  type Formation,
  type Player,
  type Team,
} from "@/lib/mock/data";
import {
  autoFillLineup,
  generateFixtures,
  playFixturesUpTo,
  SEASON_INFO,
  type FixtureRow,
} from "@/lib/mock/season";
import {
  generateFreeAgents,
  generateIncomingOffers,
  type IncomingOffer,
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

type Tactics = {
  formationKey: string;
  lineup: (Player | null)[];
  sliders: {
    attackingPressure: number;
    defensiveLine: number;
    tempo: number;
    wingPlay: number;
  };
  roles: Record<string, "balanced" | "attacking" | "defensive" | "support">;
};

// Transfer state — oyuncu ID'leri string olarak saklanır
type TransferState = {
  freeAgents: TransferListing[];
  watchlist: string[]; // player IDs
  incomingOffers: IncomingOffer[];
  myListedPlayers: { playerId: string; askingPrice: number }[];
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
  // auth
  isAuthed: boolean;
  managerName: string;
  myTeamId: string | null;

  // data
  clubs: Team[];
  fixtures: FixtureRow[];

  // tactics
  tactics: Tactics;

  // transfer
  transfer: TransferState;

  // training
  training: TrainingState;

  // facilities
  facilities: FacilitiesState;

  // actions
  loginDemo: (name?: string) => void;
  logout: () => void;
  setFormation: (key: string) => void;
  setSlider: (key: keyof Tactics["sliders"], value: number) => void;
  swapLineupSlot: (slotIndex: number, playerId: string) => void;
  setRole: (slotIndex: number, role: Tactics["roles"][string]) => void;
  // transfer actions
  toggleWatchlist: (playerId: string) => void;
  buyPlayer: (playerId: string, fee: number, wage: number, contractYears: number) =>
    { success: boolean; reason?: string };
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
};

function buildInitialClubs(): Team[] {
  return generateAllClubs();
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
    formationKey: formation.key,
    lineup: autoFillLineup(team, formation),
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
  persist(
    (set, get) => ({
      isAuthed: false,
      managerName: "",
      myTeamId: null,
      clubs: [],
      fixtures: [],
      tactics: {
        formationKey: "4-4-2",
        lineup: Array(11).fill(null),
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
        watchlist: [],
        incomingOffers: [],
        myListedPlayers: [],
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

        // Transfer verisi — boşsa üret
        let transfer = get().transfer;
        if (transfer.freeAgents.length === 0) {
          transfer = {
            freeAgents: generateFreeAgents(30),
            watchlist: [],
            incomingOffers: generateIncomingOffers(team.players),
            myListedPlayers: [],
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

      logout: () => set({ isAuthed: false, myTeamId: null, managerName: "" }),

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
    }),
    {
      name: "tm.app.v1",
      // Sadece auth + seçimleri sakla; büyük data her seferinde rebuild edilsin
      partialize: (s) => ({
        isAuthed: s.isAuthed,
        managerName: s.managerName,
        myTeamId: s.myTeamId,
        tactics: s.tactics,
        transfer: s.transfer,
        training: s.training,
        facilities: s.facilities,
      }),
      // Hydration sonrası clubs/fixtures'ı yeniden üret
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.clubs.length === 0) {
          state.clubs = buildInitialClubs();
        }
        if (state.fixtures.length === 0) {
          state.fixtures = buildInitialFixtures(state.clubs);
        }
        // myTeam varsa taktikleri güncelle (lineup eski kalmış olabilir)
        if (state.myTeamId) {
          const team = state.clubs.find((c) => c.id === state.myTeamId);
          if (team) {
            const formation =
              FORMATIONS.find((f) => f.key === state.tactics.formationKey) ??
              FORMATIONS[0];
            // Sadece lineup boşsa veya tutarsızsa yeniden doldur
            const valid = state.tactics.lineup.every(
              (p, i) =>
                p === null ||
                team.players.some((tp) => tp.id === p.id) ||
                i >= formation.slots.length
            );
            if (!valid || state.tactics.lineup.length !== formation.slots.length) {
              state.tactics.lineup = autoFillLineup(team, formation);
            }
          }
        }
      },
    }
  )
);

// Helpers (selectors)
export function useMyTeam(): Team | null {
  return useAppStore((s) => s.clubs.find((c) => c.id === s.myTeamId) ?? null);
}

export function getFormation(key: string): Formation {
  return FORMATIONS.find((f) => f.key === key) ?? FORMATIONS[0];
}
