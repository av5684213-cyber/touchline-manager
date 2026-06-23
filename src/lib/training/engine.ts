import type { Player, Position } from "@/lib/mock/data";

/**
 * Training engine — referans siyah-beyaz-fc'den uyarlandı.
 *
 * 10 program (6 kategoriye eşleştirilmiş):
 *  - Fitness: Fiziksel Yükleme, Kondisyon & Toparlanma
 *  - Midfield: Teknik Driller
 *  - Defense: Savunma Okulu
 *  - Attack: Bitiricilik Kampı
 *  - GK: Kaleci Antrenmanı
 *  - Mixed: Set Parçası, Zihinsel Hazırlık, Takım Kimyası, Pozisyon Adaptasyonu
 *
 * Günde 2 seans (morning/afternoon).
 * Tesis seviyesi × 0.1 ile çarpan.
 * Mentor sistemi: 33+ yaş oyuncu 21- oyuncuya +%25 gelişim.
 */

export type TrainingCategoryId = "fitness" | "midfield" | "defense" | "attack" | "gk" | "mixed";

export type TrainingProgram = {
  id: string;
  name: { tr: string; en: string };
  category: TrainingCategoryId;
  targetStats: (keyof Player["stats"])[];
  allowedPositions: Position[] | "ALL" | "FIELD";
  intensity: number;
  condCost: number; // negatif = kayıp, pozitif = kazanç
  icon: string;
  desc: { tr: string; en: string };
};

export const TRAINING_PROGRAMS: TrainingProgram[] = [
  {
    id: "fiziksel_yukleme",
    name: { tr: "Fiziksel Yükleme", en: "Physical Loading" },
    category: "fitness",
    targetStats: ["physical", "pace"],
    allowedPositions: "FIELD",
    intensity: 80,
    condCost: -12,
    icon: "💪",
    desc: { tr: "Fizik ve hız geliştirir, yüksek kondisyon kaybı", en: "Boosts physical and pace, high condition drain" },
  },
  {
    id: "kondisyon_toparlanma",
    name: { tr: "Kondisyon & Toparlanma", en: "Recovery" },
    category: "fitness",
    targetStats: ["physical"],
    allowedPositions: "ALL",
    intensity: 30,
    condCost: 20,
    icon: "🧘",
    desc: { tr: "Kondisyonu geri kazandırır", en: "Restores condition" },
  },
  {
    id: "teknik_driller",
    name: { tr: "Teknik Driller", en: "Technical Drills" },
    category: "midfield",
    targetStats: ["passing", "dribbling"],
    allowedPositions: "FIELD",
    intensity: 70,
    condCost: -6,
    icon: "🎯",
    desc: { tr: "Pas ve dripling geliştirir", en: "Improves passing and dribbling" },
  },
  {
    id: "savunma_okulu",
    name: { tr: "Savunma Okulu", en: "Defense School" },
    category: "defense",
    targetStats: ["defending", "physical"],
    allowedPositions: ["CB", "LB", "RB", "CDM"],
    intensity: 75,
    condCost: -8,
    icon: "🛡️",
    desc: { tr: "Defansif oyuncular için", en: "For defensive players" },
  },
  {
    id: "bitiricilik_kampi",
    name: { tr: "Bitiricilik Kampı", en: "Finishing Camp" },
    category: "attack",
    targetStats: ["shooting", "pace"],
    allowedPositions: ["CAM", "LW", "RW", "ST", "CF"],
    intensity: 85,
    condCost: -10,
    icon: "⚽",
    desc: { tr: "Ofansif oyuncular için", en: "For attacking players" },
  },
  {
    id: "kaleci_antrenmani",
    name: { tr: "Kaleci Antrenmanı", en: "Goalkeeper Training" },
    category: "gk",
    targetStats: ["defending", "physical"],
    allowedPositions: ["GK"],
    intensity: 80,
    condCost: -8,
    icon: "🧤",
    desc: { tr: "Sadece kaleciler", en: "Goalkeepers only" },
  },
  {
    id: "set_parcasi",
    name: { tr: "Set Parçası", en: "Set Piece" },
    category: "mixed",
    targetStats: ["passing", "defending"],
    allowedPositions: "FIELD",
    intensity: 55,
    condCost: -4,
    icon: "🚩",
    desc: { tr: "Dengeli gelişim", en: "Balanced development" },
  },
  {
    id: "zihinsel_hazirlik",
    name: { tr: "Zihinsel Hazırlık", en: "Mental Prep" },
    category: "mixed",
    targetStats: ["passing"],
    allowedPositions: "ALL",
    intensity: 45,
    condCost: -2,
    icon: "🧠",
    desc: { tr: "Hafif antrenman", en: "Light session" },
  },
  {
    id: "takim_kimyasi",
    name: { tr: "Takım Kimyası", en: "Team Chemistry" },
    category: "mixed",
    targetStats: ["passing", "dribbling"],
    allowedPositions: "ALL",
    intensity: 50,
    condCost: -3,
    icon: "🤝",
    desc: { tr: "Tüm takım moral +5", en: "Team morale +5" },
  },
  {
    id: "pozisyon_adaptasyonu",
    name: { tr: "Pozisyon Adaptasyonu", en: "Position Adaptation" },
    category: "mixed",
    targetStats: ["defending", "passing"],
    allowedPositions: "FIELD",
    intensity: 60,
    condCost: -7,
    icon: "🔄",
    desc: { tr: "Pozisyon geçişi", en: "Position transition" },
  },
];

export const CATEGORY_LABELS: Record<TrainingCategoryId, { tr: string; en: string }> = {
  fitness: { tr: "Fitness", en: "Fitness" },
  midfield: { tr: "Orta Saha", en: "Midfield" },
  defense: { tr: "Defans", en: "Defense" },
  attack: { tr: "Hücum", en: "Attack" },
  gk: { tr: "Kaleci", en: "Goalkeeper" },
  mixed: { tr: "Karma", en: "Mixed" },
};

export type SessionSlot = "morning" | "afternoon";

export type PlayerAssignment = {
  playerId: string;
  programId: string;
};

export type TrainingSessionResult = {
  playerId: string;
  programId: string;
  statGains: Partial<Player["stats"]>;
  condChange: number;
  moraleChange: number;
  ratingChange: number;
};

export type MentorAssignment = { mentorId: string; menteeId: string; bonusRate: number };

export type TrainingState = {
  assignments: PlayerAssignment[];
  dailyCount: number;
  lastTrainingDate: string;
  lastSessionResults: TrainingSessionResult[];
  sessionSlot: SessionSlot;
  mentorAssignments: MentorAssignment[];
};

export function getDefaultTrainingState(): TrainingState {
  return {
    assignments: [],
    dailyCount: 0,
    lastTrainingDate: "",
    lastSessionResults: [],
    sessionSlot: "morning",
    mentorAssignments: [],
  };
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function runTrainingSession(
  squad: Player[],
  state: TrainingState,
  facilityLevel: number,
  multiplier = 1.0
): TrainingSessionResult[] {
  const facilityMult = 1.0 + facilityLevel * 0.1;
  const todayMentees = new Map<string, number>();
  for (const m of state.mentorAssignments) {
    todayMentees.set(m.menteeId, m.bonusRate);
  }

  const results: TrainingSessionResult[] = [];

  for (const assignment of state.assignments) {
    const player = squad.find((p) => p.id === assignment.playerId);
    if (!player) continue;
    const program = TRAINING_PROGRAMS.find((p) => p.id === assignment.programId);
    if (!program) continue;

    const pos = player.specificPosition;
    if (program.allowedPositions !== "ALL" && program.allowedPositions !== "FIELD") {
      if (!program.allowedPositions.includes(pos)) continue;
    } else if (program.allowedPositions === "FIELD" && pos === "GK") {
      continue;
    }

    const ageMult = player.age <= 21 ? 1.15 : player.age >= 30 ? 0.75 : 1.0;
    const mentorBonus = todayMentees.get(player.id) ?? 0;
    const rawMult = multiplier * ageMult * facilityMult * (1 + mentorBonus);
    const cappedMult = Math.min(3.0, rawMult);

    const statGains: Partial<Player["stats"]> = {};
    for (const stat of program.targetStats) {
      const current = player.stats[stat];
      const ceilingFactor = Math.max(0.05, (100 - current) / 100);
      const gain = Math.random() * 0.5 * cappedMult * ceilingFactor;
      statGains[stat] = Math.round(gain * 10) / 10;
    }

    const intensityMult = program.intensity >= 80 ? 1.25 : program.intensity < 60 ? 0.5 : 1.0;
    const condChange = Math.round(program.condCost * intensityMult);

    const moraleChange = program.id === "takim_kimyasi" ? 5 : 0;

    const totalGain = Object.values(statGains).reduce((s, v) => s + (v ?? 0), 0);
    const ratingChange = Math.round((totalGain / 10) * 10) / 10;

    results.push({
      playerId: player.id,
      programId: program.id,
      statGains,
      condChange,
      moraleChange,
      ratingChange,
    });
  }

  return results;
}

export function applyResultsToSquad(squad: Player[], results: TrainingSessionResult[]): Player[] {
  const map = new Map(results.map((r) => [r.playerId, r]));
  return squad.map((p) => {
    const r = map.get(p.id);
    if (!r) return p;
    const newCond = Math.max(0, Math.min(100, p.cond + r.condChange));
    return {
      ...p,
      stats: {
        pace: Math.min(99, p.stats.pace + (r.statGains.pace ?? 0)),
        shooting: Math.min(99, p.stats.shooting + (r.statGains.shooting ?? 0)),
        passing: Math.min(99, p.stats.passing + (r.statGains.passing ?? 0)),
        defending: Math.min(99, p.stats.defending + (r.statGains.defending ?? 0)),
        physical: Math.min(99, p.stats.physical + (r.statGains.physical ?? 0)),
        dribbling: Math.min(99, p.stats.dribbling + (r.statGains.dribbling ?? 0)),
      },
      cond: newCond,
      condition: newCond,
      morale: Math.max(0, Math.min(100, p.morale + r.moraleChange)),
      // rating 0-100, küçük artış
      rating: Math.min(99, Math.round(p.rating + r.ratingChange * 10)),
    };
  });
}

// ===== Mentor =====
export const MENTOR_MIN_AGE = 33;
export const MENTEE_MAX_AGE = 21;
export const MENTOR_BONUS_RATE = 0.25;

export function canBeMentor(p: Player): boolean {
  return p.age >= MENTOR_MIN_AGE;
}

export function canBeMentee(p: Player): boolean {
  return p.age <= MENTEE_MAX_AGE;
}

export function assignMentor(
  state: TrainingState,
  mentorId: string,
  menteeId: string
): TrainingState {
  const filtered = state.mentorAssignments.filter((m) => m.menteeId !== menteeId);
  return {
    ...state,
    mentorAssignments: [...filtered, { mentorId, menteeId, bonusRate: MENTOR_BONUS_RATE }],
  };
}

export function removeMentor(state: TrainingState, menteeId: string): TrainingState {
  return {
    ...state,
    mentorAssignments: state.mentorAssignments.filter((m) => m.menteeId !== menteeId),
  };
}
