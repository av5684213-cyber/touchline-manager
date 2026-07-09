/**
 * Maç Takvimi — Merkezi Zamanlama Modülü
 * Eski siyah-beyaz-fc oyununun MatchScheduleManager mantığından uyarlandı.
 *
 * TAKVİM KURALLARI:
 * ─────────────────
 * Pazartesi - Cuma:     12:00 Lig maçı, 18:00 Lig maçı
 * Cumartesi:            Sadece Kupa maçları (18:00)
 * Pazar:                Sadece Kupa maçları (18:00)
 *
 * Antrenman:
 * Pazartesi - Cuma:      15:00 ve 21:00 (günde 2 seans)
 * Hafta sonu:            Antrenman yok
 *
 * Hazırlık Maçı:
 * Her gün:               15:00 (tek slot)
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Pazar, 1=Pzt, ..., 6=Cmt
export type MatchCompetitionType = "league" | "cup" | "friendly";

export type MatchSlot = {
  dayName: string;
  dayOfWeek: DayOfWeek;
  time: string; // "12:00" format
  competitionType: MatchCompetitionType;
  isActive: boolean;
};

export type DaySchedule = {
  dayName: string;
  dayOfWeek: DayOfWeek;
  slots: MatchSlot[];
  hasLeague: boolean;
  hasCup: boolean;
  hasTraining: boolean;
};

export type WeekSchedule = {
  days: DaySchedule[];
  totalLeagueSlots: number;
  totalCupSlots: number;
  totalTrainingSlots: number;
};

// ═══ Sabitler ═══

export const LEAGUE_TIMES = ["12:00", "18:00"] as const;
export const CUP_TIMES = ["18:00"] as const;
export const TRAINING_TIMES = ["15:00", "21:00"] as const;
export const FRIENDLY_TIME = "15:00";

const DAY_NAMES_TR: Record<number, string> = {
  0: "Pazar",
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
};

const DAY_NAMES_SHORT_TR: Record<number, string> = {
  0: "Paz",
  1: "Pzt",
  2: "Sal",
  3: "Çar",
  4: "Per",
  5: "Cum",
  6: "Cmt",
};

// ═══ İstanbul Saat Dilimi Yardımcıları ═══

/**
 * Şu anki İstanbul (UTC+3) saatini döndürür.
 * Tüm maç/antrenman zamanlaması bu fonksiyonu kullanır.
 */
export function getIstanbulNow(): Date {
  const now = new Date();
  // İstanbul = UTC+3
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3 * 3600000);
}

/**
 * Bir Date objesinden İstanbul saatine göre gün numarası (0-6).
 */
export function getIstanbulDay(date: Date = new Date()): number {
  const ist = getIstanbulNow();
  return ist.getDay();
}

/**
 * Bir Date objesinden İstanbul saatine göre saat (0-23).
 */
export function getIstanbulHour(date: Date = new Date()): number {
  const ist = getIstanbulNow();
  return ist.getHours();
}

/**
 * Bir Date objesinden İstanbul saatine göre dakika (0-59).
 */
export function getIstanbulMinute(date: Date = new Date()): number {
  const ist = getIstanbulNow();
  return ist.getMinutes();
}

// ═══ Gün Kontrolleri ═══

/** Pazartesi-Cuma lig maçı oynanır */
export function shouldPlayLeague(dayOfWeek: number): boolean {
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/** Cumartesi-Pazar kupa maçı oynanır */
export function shouldPlayCup(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/** Pazartesi-Cuma antrenman yapılır */
export function shouldTrain(dayOfWeek: number): boolean {
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/** Dinlenme günü yok — her gün maç var */
export function isRestDay(dayOfWeek: number): boolean {
  return false;
}

// ═══ Maç Tipi ve Saat ═══

export function getMatchTypeForDay(dayOfWeek: number): MatchCompetitionType | null {
  if (shouldPlayLeague(dayOfWeek)) return "league";
  if (shouldPlayCup(dayOfWeek)) return "cup";
  return null; // Cuma → maç yok
}

export function getMatchTimesForDay(
  dayOfWeek: number,
  competitionType: MatchCompetitionType
): string[] {
  if (competitionType === "league" && shouldPlayLeague(dayOfWeek)) {
    return [...LEAGUE_TIMES];
  }
  if (competitionType === "cup" && shouldPlayCup(dayOfWeek)) {
    return [...CUP_TIMES];
  }
  if (competitionType === "friendly") {
    return [FRIENDLY_TIME];
  }
  return [];
}

export function getTrainingTimesForDay(dayOfWeek: number): string[] {
  if (!shouldTrain(dayOfWeek)) return [];
  return [...TRAINING_TIMES];
}

// ═══ Haftalık Program ═══

export function generateWeekSchedule(): WeekSchedule {
  const days: DaySchedule[] = [];
  let totalLeagueSlots = 0;
  let totalCupSlots = 0;
  let totalTrainingSlots = 0;

  const dayOrder: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0]; // Pzt → Paz

  for (const dow of dayOrder) {
    const dayName = DAY_NAMES_TR[dow];
    const slots: MatchSlot[] = [];
    const hasLeague = shouldPlayLeague(dow);
    const hasCup = shouldPlayCup(dow);
    const hasTraining = shouldTrain(dow);

    if (hasLeague) {
      for (const time of LEAGUE_TIMES) {
        slots.push({ dayName, dayOfWeek: dow, time, competitionType: "league", isActive: true });
        totalLeagueSlots++;
      }
    }
    if (hasCup) {
      for (const time of CUP_TIMES) {
        slots.push({ dayName, dayOfWeek: dow, time, competitionType: "cup", isActive: true });
        totalCupSlots++;
      }
    }
    if (hasTraining) {
      totalTrainingSlots += TRAINING_TIMES.length;
    }

    days.push({ dayName, dayOfWeek: dow, slots, hasLeague, hasCup, hasTraining });
  }

  return { days, totalLeagueSlots, totalCupSlots, totalTrainingSlots };
}

// ═══ Fikstür Tarih Hesaplama ═══

/**
 * Verilen tur ve maç indeksine göre fikstür tarih/saat hesaplar.
 *
 * Lig: Pzt-Per, günde 2 slot (12:00 ve 18:00)
 * 18 takım → 9 maç/tur, 2 slot/gün → ~5 gün/tur
 *
 * Kupa: Cmt veya Pazar 18:00
 */
export function computeFixtureDateTime(
  tur: number,
  matchIndex: number,
  competitionType: MatchCompetitionType,
  seasonStartDate: Date = new Date(2025, 7, 4) // 4 Ağustos 2025 Pazartesi
): { matchDate: string; matchTime: string; dayOfWeek: number; dayName: string } {
  if (competitionType === "league") {
    const SLOTS_PER_DAY = 2;
    const WORK_DAYS_PER_TUR = 4; // Pzt-Per = 4 gün
    const dayOffset = Math.floor(matchIndex / SLOTS_PER_DAY);
    const slotInDay = matchIndex % SLOTS_PER_DAY;

    const turStartDay = (tur - 1) * WORK_DAYS_PER_TUR;
    const absoluteDay = turStartDay + dayOffset;

    const fixtureDate = new Date(seasonStartDate);
    fixtureDate.setDate(fixtureDate.getDate() + absoluteDay);

    const matchTime = slotInDay === 0 ? "12:00" : "18:00";
    const dow = fixtureDate.getDay();

    return {
      matchDate: fixtureDate.toISOString().split("T")[0],
      matchTime,
      dayOfWeek: dow,
      dayName: DAY_NAMES_SHORT_TR[dow] ?? DAY_NAMES_TR[dow],
    };
  }

  if (competitionType === "cup") {
    const fixtureDate = new Date(seasonStartDate);
    const startDay = seasonStartDate.getDay();
    const daysToSaturday = startDay === 6 ? 0 : (6 - startDay + 7) % 7;
    fixtureDate.setDate(fixtureDate.getDate() + daysToSaturday + (tur - 1) * 7);

    const cupDay = tur % 2 === 0 ? 6 : 0; // Çift tur: Cmt, tek tur: Pazar
    if (fixtureDate.getDay() !== cupDay) {
      const diff = (cupDay - fixtureDate.getDay() + 7) % 7;
      fixtureDate.setDate(fixtureDate.getDate() + diff);
    }

    return {
      matchDate: fixtureDate.toISOString().split("T")[0],
      matchTime: "18:00",
      dayOfWeek: cupDay,
      dayName: cupDay === 6 ? "Cmt" : "Paz",
    };
  }

  // Hazırlık maçı
  const fixtureDate = new Date(seasonStartDate);
  return {
    matchDate: fixtureDate.toISOString().split("T")[0],
    matchTime: FRIENDLY_TIME,
    dayOfWeek: fixtureDate.getDay() as DayOfWeek,
    dayName: DAY_NAMES_SHORT_TR[fixtureDate.getDay()] ?? "",
  };
}

// ═══ Bugünün Programı ═══

export function getTodaySchedule(): {
  dayName: string;
  dayOfWeek: number;
  matchSlots: MatchSlot[];
  trainingTimes: string[];
  isRestDay: boolean;
} {
  const dayOfWeek = getIstanbulDay();
  const dayName = DAY_NAMES_TR[dayOfWeek];

  const matchSlots: MatchSlot[] = [];
  const compType = getMatchTypeForDay(dayOfWeek);

  if (compType) {
    const times = getMatchTimesForDay(dayOfWeek, compType);
    for (const time of times) {
      matchSlots.push({ dayName, dayOfWeek: dayOfWeek as DayOfWeek, time, competitionType: compType, isActive: true });
    }
  }

  const trainingTimes = getTrainingTimesForDay(dayOfWeek);

  return {
    dayName,
    dayOfWeek,
    matchSlots,
    trainingTimes,
    isRestDay: isRestDay(dayOfWeek),
  };
}

// ═══ Sıradaki Maç ═══

/**
 * Şu anki saatten sonraki ilk maç slotunu döndürür.
 * Bugün slot varsa bugünün, yoksa yarın ve sonrasının.
 */
export function getNextMatchSlot(): { dayName: string; time: string; type: MatchCompetitionType; daysAhead: number } | null {
  const istNow = getIstanbulNow();
  const currentHour = istNow.getHours();

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(istNow);
    checkDate.setDate(checkDate.getDate() + i);
    const dow = checkDate.getDay() as DayOfWeek;
    const compType = getMatchTypeForDay(dow);
    if (!compType) continue;

    const times = getMatchTimesForDay(dow, compType);
    for (const time of times) {
      const hour = parseInt(time.split(":")[0]);
      if (i === 0 && hour <= currentHour) continue; // bugün geçti
      return {
        dayName: DAY_NAMES_SHORT_TR[dow] ?? DAY_NAMES_TR[dow],
        time,
        type: compType,
        daysAhead: i,
      };
    }
  }
  return null;
}

// ═══ Format Yardımcıları ═══

export function getCompetitionIcon(type: MatchCompetitionType): string {
  switch (type) {
    case "cup": return "🏆";
    case "friendly": return "🤝";
    case "league":
    default: return "⚽";
  }
}

export function getCompetitionLabel(type: MatchCompetitionType): string {
  switch (type) {
    case "cup": return "Kupa Maçı";
    case "friendly": return "Hazırlık Maçı";
    case "league":
    default: return "Lig Maçı";
  }
}

export function getDayName(dayOfWeek: number, short: boolean = false): string {
  return short
    ? (DAY_NAMES_SHORT_TR[dayOfWeek] ?? "")
    : (DAY_NAMES_TR[dayOfWeek] ?? "");
}

/**
 * Şu anki saate göre hangi maç slotundayız?
 * - Eğer şu an 12:00-12:30 arasıysa → 12:00 slotu aktif
 * - Eğer 18:00-18:30 arasıysa → 18:00 slotu aktif
 * - Cmt/Paz 18:00-18:30 → kupa slotu
 * - Değilse → null (maç yok)
 */
export function getCurrentMatchSlot(): { type: MatchCompetitionType; time: string } | null {
  const dayOfWeek = getIstanbulDay();
  const hour = getIstanbulHour();
  const minute = getIstanbulMinute();

  // Lig maçları: Pzt-Cum, 12:00 ve 18:00
  if (shouldPlayLeague(dayOfWeek)) {
    if (hour === 12 && minute < 30) return { type: "league", time: "12:00" };
    if (hour === 18 && minute < 30) return { type: "league", time: "18:00" };
  }

  // Kupa maçları: Cmt-Paz, 18:00
  if (shouldPlayCup(dayOfWeek)) {
    if (hour === 18 && minute < 30) return { type: "cup", time: "18:00" };
  }

  return null;
}

/**
 * Sıradaki maç slotuna kalan süre (dakika cinsinden).
 * Maç yoksa null.
 */
export function getMinutesToNextMatch(): { minutes: number; slot: { type: MatchCompetitionType; time: string; dayName: string } } | null {
  const istNow = getIstanbulNow();
  const currentHour = istNow.getHours();
  const currentMinute = istNow.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(istNow);
    checkDate.setDate(checkDate.getDate() + i);
    const dow = checkDate.getDay() as DayOfWeek;
    const compType = getMatchTypeForDay(dow);
    if (!compType) continue;

    const times = getMatchTimesForDay(dow, compType);
    for (const time of times) {
      const [h, m] = time.split(":").map(Number);
      const slotTotalMinutes = h * 60 + m;

      if (i === 0 && slotTotalMinutes <= currentTotalMinutes) continue;

      const totalMinutesUntil = i * 24 * 60 + (slotTotalMinutes - currentTotalMinutes);
      return {
        minutes: totalMinutesUntil,
        slot: {
          type: compType,
          time,
          dayName: i === 0 ? "Bugün" : DAY_NAMES_SHORT_TR[dow] ?? DAY_NAMES_TR[dow],
        },
      };
    }
  }
  return null;
}

/**
 * Geri sayım metni üretir.
 * "2s 34dk" veya "3g 5sa 20dk" formatında.
 */
export function formatCountdown(minutes: number): string {
  if (minutes <= 0) return "Şimdi";
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = Math.floor(minutes % 60);

  if (days > 0) return `${days}g ${hours}sa`;
  if (hours > 0) return `${hours}sa ${mins}dk`;
  return `${mins}dk`;
}

/**
 * Matchday numarasını (1-34) haftanın gününe ve slotuna çevirir.
 */
export function matchdayToSchedule(
  matchday: number,
  matchIndex: number = 0
): { dayName: string; time: string; type: MatchCompetitionType } {
  const WORK_DAYS_PER_TUR = 4;
  const SLOTS_PER_DAY = 2;

  const dayOffset = Math.floor(matchIndex / SLOTS_PER_DAY) % WORK_DAYS_PER_TUR;
  const slotInDay = matchIndex % SLOTS_PER_DAY;

  const jsDay = (1 + dayOffset) as DayOfWeek;
  const time = slotInDay === 0 ? "12:00" : "18:00";

  return {
    dayName: DAY_NAMES_SHORT_TR[jsDay] ?? DAY_NAMES_TR[jsDay],
    time,
    type: "league",
  };
}
