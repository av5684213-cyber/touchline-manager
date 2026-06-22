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
