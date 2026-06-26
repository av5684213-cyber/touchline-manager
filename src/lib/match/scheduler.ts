/**
 * Match Scheduler — maçlar Türkiye saatiyle belirli saatlerde oynanır.
 *
 * Mantık:
 * - Her 4 saatte bir "maç saati" var: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 (TR)
 * - Her maç saatinde 60 dakikalık bir "izleme penceresi" açılır
 * - Pencere içindeysek: kullanıcı "İZLE" butonuyla maça girebilir
 * - Pencere geçmiş ve kullanıcı izlememişse: otomatik simülasyon sonucu üretilir
 * - Pencere dışındaysak: bir sonraki maç saatine geri sayım gösterilir
 *
 * Tüm hesaplar UTC'de yapılır, gösterimde TR'ye (UTC+3) çevrilir.
 */

// Maç saatleri (TR saatiyle) — hafta içi her gün 12:00 ve 18:00
export const MATCH_HOUR_TR = [12, 18] as const;

// İzleme penceresi süresi (dakika) — maç saati başlangıcından itibaren
export const MATCH_WINDOW_MINUTES = 60;

// Türkiye saat dilimi ofseti (UTC+3)
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Verilen UTC zamanının TR gün dizini (0=Pazar, 1=Pazartesi, ..., 6=Cumartesi).
 */
function trDayOfWeek(now: Date): number {
  const trDate = new Date(now.getTime() + TR_OFFSET_MS);
  return trDate.getUTCDay();
}

/**
 * Verilen UTC zamanı hafta içi mi (Pazartesi-Cuma)?
 */
export function isWeekday(now: Date = new Date()): boolean {
  const d = trDayOfWeek(now);
  return d >= 1 && d <= 5;
}

/**
 * Şu anki zamanın TR saatiyle gün içindeki dakika değerini döndür.
 */
function nowTrMinuteOfDay(now: Date = new Date()): number {
  const trMs = now.getTime() + TR_OFFSET_MS;
  const trDate = new Date(trMs);
  return trDate.getUTCHours() * 60 + trDate.getUTCMinutes();
}

/**
 * Bugünün TR tarih anahtarı (YYYY-MM-DD TR).
 */
export function todayTrKey(now: Date = new Date()): string {
  const trMs = now.getTime() + TR_OFFSET_MS;
  return new Date(trMs).toISOString().slice(0, 10);
}

export type MatchScheduleStatus = {
  // Şu an maç penceresinde miyiz?
  inWindow: boolean;
  // Pencere bitiş zamanı (UTC ms) — inWindow true iken geçerli
  windowEndsAt: number | null;
  // Pencere başlangıç zamanı (UTC ms)
  windowStartsAt: number | null;
  // Bir sonraki maç penceresinin başlangıcı (UTC ms) — inWindow false iken geçerli
  nextWindowAt: number;
  // Bir sonraki maçın TR saati (HH:MM formatında)
  nextMatchTimeTr: string;
  // Bir sonraki maçın tarihi (TR, "28 Haz" gibi)
  nextMatchDateTr: string;
  // Bir sonraki maç saatine kalan süre (ms)
  msUntilNext: number;
  // Bugünün TR tarih anahtarı
  todayKey: string;
  // Şu anki maçın ID'si (date+hour kombinasyonu) — bir maç penceresini benzersiz tanımlar
  currentMatchId: string | null;
};

const TR_MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function formatTrDate(ts: number): string {
  const trDate = new Date(ts + TR_OFFSET_MS);
  return `${trDate.getUTCDate()} ${TR_MONTHS_SHORT[trDate.getUTCMonth()]}`;
}

function formatTrTime(hour: number, minute = 0): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function trDateKey(ts: number): string {
  return new Date(ts + TR_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Verilen UTC zamanının TR saatiyle saat başındaki (00 dk) maç saati olup olmadığını kontrol et.
 */
function isMatchHour(trHour: number): boolean {
  return (MATCH_HOUR_TR as readonly number[]).includes(trHour);
}

/**
 * Şu anki maç takvim durumunu hesapla.
 */
export function getMatchScheduleStatus(now: Date = new Date()): MatchScheduleStatus {
  const nowMs = now.getTime();
  const trMs = nowMs + TR_OFFSET_MS;
  const trDate = new Date(trMs);
  const trHour = trDate.getUTCHours();
  const trMinuteOfHour = trDate.getUTCMinutes();
  const today = trDateKey(nowMs);
  const weekday = isWeekday(now);

  // Şu an bir maç penceresinde miyiz? (sadece hafta içi)
  if (weekday && isMatchHour(trHour) && trMinuteOfHour < MATCH_WINDOW_MINUTES) {
    // Pencerenin başlangıcı: bugün TR saati trHour:00 → UTC'ye çevir
    const trDayStart = new Date(trDate.toISOString().slice(0, 10) + "T00:00:00Z").getTime();
    const windowStartMs = trDayStart + trHour * 60 * 60 * 1000 - TR_OFFSET_MS;
    const windowEndMs = windowStartMs + MATCH_WINDOW_MINUTES * 60 * 1000;

    return {
      inWindow: true,
      windowEndsAt: windowEndMs,
      windowStartsAt: windowStartMs,
      nextWindowAt: windowStartMs,
      nextMatchTimeTr: formatTrTime(trHour, 0),
      nextMatchDateTr: formatTrDate(nowMs),
      msUntilNext: 0,
      todayKey: today,
      currentMatchId: `${today}_${trHour}`,
    };
  }

  // Pencerede değiliz — bir sonraki HAFTA İÇİ maç saatini bul
  // En fazla 7 gün ileri ara (hafta sonu atlanır)
  let nextHour = -1;
  let nextDateOffset = 0;
  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const candidateDate = new Date(trMs + dayOffset * 24 * 60 * 60 * 1000);
    const candidateDay = candidateDate.getUTCDay();
    // Hafta içi (1-5) değilse atla
    if (candidateDay < 1 || candidateDay > 5) continue;

    if (dayOffset === 0) {
      // Bugün — kalan saatleri ara
      for (const h of MATCH_HOUR_TR) {
        if (h > trHour) {
          nextHour = h;
          break;
        }
      }
      if (nextHour !== -1) break;
    } else {
      // Gelecek gün — ilk maç saatini al
      nextHour = MATCH_HOUR_TR[0];
      nextDateOffset = dayOffset;
      break;
    }
  }

  // Fallback (olmaması gerek ama)
  if (nextHour === -1) {
    nextHour = MATCH_HOUR_TR[0];
    nextDateOffset = 1;
  }

  // Bir sonraki maç penceresinin başlangıç UTC ms'ini hesapla
  const trTodayStart = new Date(trDate.toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  const nextWindowMs = trTodayStart
    + nextDateOffset * 24 * 60 * 60 * 1000
    + nextHour * 60 * 60 * 1000
    - TR_OFFSET_MS;

  const msUntilNext = Math.max(0, nextWindowMs - nowMs);

  return {
    inWindow: false,
    windowEndsAt: null,
    windowStartsAt: null,
    nextWindowAt: nextWindowMs,
    nextMatchTimeTr: formatTrTime(nextHour, 0),
    nextMatchDateTr: formatTrDate(nextWindowMs),
    msUntilNext,
    todayKey: today,
    currentMatchId: null,
  };
}

/**
 * Verilen ms süreyi "2s 15dk" / "45dk 30sn" / "30sn" formatında göster.
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0sn";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (days > 0) return `${days}g ${hours}s`;
  if (hours > 0) return `${hours}s ${mins}dk`;
  if (mins > 0) return `${mins}dk ${secs}sn`;
  return `${secs}sn`;
}

/**
 * Verilen matchId (örn "2026-06-27_12") bu kullanıcı tarafından izlendi mi?
 * localStorage'da saklanan set'ten kontrol et.
 */
const WATCHED_KEY = "touchline.match.watched.v1";

export function isMatchWatched(matchId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(WATCHED_KEY);
    if (!raw) return false;
    const set = JSON.parse(raw) as string[];
    return Array.isArray(set) && set.includes(matchId);
  } catch {
    return false;
  }
}

export function markMatchWatched(matchId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(WATCHED_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (!set.includes(matchId)) {
      set.push(matchId);
      // En fazla 100 maç ID'si sakla
      localStorage.setItem(WATCHED_KEY, JSON.stringify(set.slice(-100)));
    }
  } catch {
    /* no-op */
  }
}

/**
 * Verilen matchId için otomatik simülasyon yapıldı mı (kullanıcı izlemedi)?
 */
const AUTO_SIM_KEY = "touchline.match.autosim.v1";

export function isMatchAutoSimmed(matchId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(AUTO_SIM_KEY);
    if (!raw) return false;
    const set = JSON.parse(raw) as string[];
    return Array.isArray(set) && set.includes(matchId);
  } catch {
    return false;
  }
}

export function markMatchAutoSimmed(matchId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(AUTO_SIM_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (!set.includes(matchId)) {
      set.push(matchId);
      localStorage.setItem(AUTO_SIM_KEY, JSON.stringify(set.slice(-100)));
    }
  } catch {
    /* no-op */
  }
}
