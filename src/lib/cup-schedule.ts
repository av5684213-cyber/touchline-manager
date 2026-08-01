/**
 * v2.9.59: Kupa maçları cumartesi 12:00 ve 18:00'da oynanır.
 *
 * Kural:
 * - Tur 1 (Son 16) ve Tur 3 (Yarı): Cumartesi 12:00
 * - Tur 2 (Çeyrek) ve Tur 4 (Final): Cumartesi 18:00
 *
 * Eğer bugün cumartesi ise:
 *   - Saat 12:00'den önceyse: bugün 12:00 (tur 1/3) veya bugün 18:00 (tur 2/4)
 *   - Saat 12:00-18:00 arasıysa: bugün 18:00 (tur 2/4) veya haftaya 12:00 (tur 1/3)
 *   - Saat 18:00'den sonraysa: haftaya cumartesi
 * Değilse: Bir sonraki cumartesiyi bul
 *
 * v2.9.66: Locale-aware — formatDateLabel ve getTimeUntilCupMatch
 * artık tr/en desteği için dict.ts'ten çeviri okuyor.
 * cup-schedule.ts bir lib dosyası olduğu için useI18n kullanamaz;
 * bunun yerine locale parametresi + doğrudan dict importu kullanılır.
 */

import { dict } from "@/lib/i18n/dict";
import type { Locale } from "@/lib/i18n/types";

export type CupSchedule = {
  date: Date;
  isToday: boolean;
  isUpcoming: boolean;
  timeLabel: string;   // "12:00" veya "18:00"
  dateLabel: string;   // "Bugün" / "Today" veya "Cmt, 5 Ağu" / "Sat, 5 Aug"
  fullLabel: string;   // "Bugün 12:00" / "Today 12:00" veya "Cmt, 5 Ağu · 18:00" / "Sat, 5 Aug · 18:00"
};

const SATURDAY = 6; // JS: 0=Pazar, 6=Cumartesi

/**
 * locale'e özgü kısa gün ve ay isimleri.
 * Intl.DateTimeFormat çıktısı locale'e göre farklı sıralama/syntax ürettiği için
 * ("5 Ağu Cmt" vs "Sat, Aug 5"), tutarlı "Wkd, D Mon" formatı için kendi verimizi kullanıyoruz.
 */
const LOCALE_DATE_DATA: Record<Locale, { days: string[]; months: string[] }> = {
  tr: {
    days: ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"],
    months: [
      "Oca", "Şub", "Mar", "Nis", "May", "Haz",
      "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
    ],
  },
  en: {
    days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    months: [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ],
  },
};

/**
 * Dict'ten çeviri oku — useI18n olmadan lib içinden kullanılabilir.
 * Eksik anahtar durumunda key'i geri döner.
 */
function translateKey(key: string, locale: Locale): string {
  const entry = dict[key];
  if (!entry) return key;
  return locale === "en" ? entry.en : entry.tr;
}

/**
 * Belirli bir kupa turu için maç zamanını hesapla.
 * Tur 1 (Son 16) ve Tur 3 (Yarı) → 12:00
 * Tur 2 (Çeyrek) ve Tur 4 (Final) → 18:00
 *
 * @param locale Etiketler için dil ("tr" | "en"). Default "tr".
 */
export function getCupMatchSchedule(
  round: number,
  now: Date = new Date(),
  locale: Locale = "tr"
): CupSchedule {
  const hour = round % 2 === 1 ? 12 : 18; // Tek turlar 12:00, çift turlar 18:00
  const timeLabel = `${hour.toString().padStart(2, "0")}:00`;

  // Bugün cumartesi mi?
  const isSaturday = now.getDay() === SATURDAY;
  const currentHour = now.getHours();

  let matchDate: Date;
  let isToday = false;

  if (isSaturday) {
    // Bugün cumartesi — saat kontrol et
    if (currentHour < hour) {
      // Henüz maç saati gelmedi → bugün oynanacak
      matchDate = new Date(now);
      matchDate.setHours(hour, 0, 0, 0);
      isToday = true;
    } else if (currentHour < 18 && hour === 18) {
      // 12:00-18:00 arası, akşam maçı var → bugün 18:00
      matchDate = new Date(now);
      matchDate.setHours(18, 0, 0, 0);
      isToday = true;
    } else {
      // Maç saati geçti → haftaya cumartesi
      matchDate = nextSaturday(now);
      matchDate.setHours(hour, 0, 0, 0);
    }
  } else {
    // Bugün cumartesi değil → bir sonraki cumartesi
    matchDate = nextSaturday(now);
    matchDate.setHours(hour, 0, 0, 0);
  }

  // Tarih etiketi — locale-aware
  const todayLabel = translateKey("cup_schedule.today", locale);
  const dateLabel = isToday
    ? todayLabel
    : formatDateLabel(matchDate, locale);

  const fullLabel = isToday
    ? `${todayLabel} ${timeLabel}`
    : `${dateLabel} · ${timeLabel}`;

  return {
    date: matchDate,
    isToday,
    isUpcoming: !isToday,
    timeLabel,
    dateLabel,
    fullLabel,
  };
}

/**
 * Bir sonraki cumartesiyi bul (bugün cumartesi ise haftaya).
 */
function nextSaturday(from: Date): Date {
  const d = new Date(from);
  const daysUntilSaturday = (SATURDAY - d.getDay() + 7) % 7 || 7; // 0 ise 7 yap (haftaya)
  d.setDate(d.getDate() + daysUntilSaturday);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Tarihi locale'e göre "Cmt, 5 Ağu" (tr) / "Sat, 5 Aug" (en) formatında göster.
 * Format sabit: "<Wkd>, <D> <Mon>"
 */
function formatDateLabel(date: Date, locale: Locale = "tr"): string {
  const data = LOCALE_DATE_DATA[locale] ?? LOCALE_DATE_DATA.tr;
  const dayName = data.days[date.getDay()];
  const dayNum = date.getDate();
  const monthName = data.months[date.getMonth()];

  return `${dayName}, ${dayNum} ${monthName}`;
}

/**
 * Kalan süreyi locale'e göre "3 gün 5 saat" / "3 day(s) 5 h" gibi göster.
 *
 * @param locale Etiketler için dil ("tr" | "en"). Default "tr".
 */
export function getTimeUntilCupMatch(
  schedule: CupSchedule,
  now: Date = new Date(),
  locale: Locale = "tr"
): string {
  const diffMs = schedule.date.getTime() - now.getTime();
  if (diffMs <= 0) return translateKey("cup_schedule.starting", locale);

  const minShort = translateKey("cup_schedule.min_short", locale);
  const hourShort = translateKey("cup_schedule.hour_short", locale);
  const dayLabel = translateKey("cup_schedule.day", locale);

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;

  if (diffDays === 0) {
    if (remainingHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} ${minShort}`;
    }
    return `${remainingHours} ${hourShort}`;
  }
  if (diffDays === 1) {
    return remainingHours > 0
      ? `1 ${dayLabel} ${remainingHours} ${hourShort}`
      : `1 ${dayLabel}`;
  }
  return `${diffDays} ${dayLabel}`;
}
