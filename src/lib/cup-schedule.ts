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
 */

export type CupSchedule = {
  date: Date;
  isToday: boolean;
  isUpcoming: boolean;
  timeLabel: string;   // "12:00" veya "18:00"
  dateLabel: string;   // "Bugün" veya "Cmt, 5 Ağu"
  fullLabel: string;   // "Bugün 12:00" veya "Cmt, 5 Ağu · 18:00"
};

const SATURDAY = 6; // JS: 0=Pazar, 6=Cumartesi

/**
 * Belirli bir kupa turu için maç zamanını hesapla.
 * Tur 1 (Son 16) ve Tur 3 (Yarı) → 12:00
 * Tur 2 (Çeyrek) ve Tur 4 (Final) → 18:00
 */
export function getCupMatchSchedule(round: number, now: Date = new Date()): CupSchedule {
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

  // Tarih etiketi
  const dateLabel = isToday
    ? "Bugün"
    : formatDateLabel(matchDate);

  const fullLabel = isToday
    ? `Bugün ${timeLabel}`
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
 * Tarihi "Cmt, 5 Ağu" formatında göster (locale-aware).
 */
function formatDateLabel(date: Date, locale: string = "tr-TR"): string {
  const days = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  const months = [
    "Oca", "Şub", "Mar", "Nis", "May", "Haz",
    "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
  ];

  const dayName = days[date.getDay()];
  const dayNum = date.getDate();
  const monthName = months[date.getMonth()];

  return `${dayName}, ${dayNum} ${monthName}`;
}

/**
 * Kalan süreyi "3 gün 5 saat" gibi göster.
 */
export function getTimeUntilCupMatch(schedule: CupSchedule, now: Date = new Date()): string {
  const diffMs = schedule.date.getTime() - now.getTime();
  if (diffMs <= 0) return "Başlıyor...";

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;

  if (diffDays === 0) {
    if (remainingHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} dk`;
    }
    return `${remainingHours} saat`;
  }
  if (diffDays === 1) {
    return remainingHours > 0 ? `1 gün ${remainingHours} saat` : "1 gün";
  }
  return `${diffDays} gün`;
}
