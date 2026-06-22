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

  // actions
  loginDemo: (name?: string) => void;
  logout: () => void;
  setFormation: (key: string) => void;
  setSlider: (key: keyof Tactics["sliders"], value: number) => void;
  swapLineupSlot: (slotIndex: number, playerId: string) => void;
  setRole: (slotIndex: number, role: Tactics["roles"][string]) => void;
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

        set({
          isAuthed: true,
          managerName: name || "Menajer",
          myTeamId,
          clubs,
          fixtures,
          tactics,
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
    }),
    {
      name: "tm.app.v1",
      // Sadece auth + seçimleri sakla; büyük data her seferinde rebuild edilsin
      partialize: (s) => ({
        isAuthed: s.isAuthed,
        managerName: s.managerName,
        myTeamId: s.myTeamId,
        tactics: s.tactics,
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
