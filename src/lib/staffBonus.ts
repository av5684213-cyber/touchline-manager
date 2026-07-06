// ADDED: staffBonus.ts — Personel (Scout/Doctor/Coach) faydaları merkezi hesaplama
// Scout: Transfer listesinde OVR gizliliğini azaltır (scoutLevel arttıkça tam OVR görünür)
// Doctor: Sakatlık iyileşme süresini -(doctorLevel * 5)% azaltır
// Coach: Antrenman sonrası stat artışını +(coachLevel * 2)% arttırır

import type { StaffMember } from "@/lib/store";

/**
 * Scout seviyesine göre OVR gizlilik yüzdesi
 * scoutLevel 0 = OVR tamamen gizli (???)
 * scoutLevel 1-2 = OVR ±10 dalgalanma
 * scoutLevel 3-4 = OVR ±5 dalgalanma
 * scoutLevel 5 = OVR tam görünür
 */
export function getScoutOvrVisibility(scouts: StaffMember[]): {
  isHidden: boolean;
  variance: number; // ±variance
  description: string;
} {
  // En yüksek yıldızlı scout'u al
  const topScout = scouts
    .filter((s) => s.type === "scout")
    .sort((a, b) => b.stars - a.stars)[0];

  if (!topScout) {
    return {
      isHidden: true,
      variance: 0,
      description: "Scout yok — OVR tamamen gizli (???)",
    };
  }

  const level = topScout.stars;
  const variance = Math.max(0, 10 - level * 2); // 5★ → 0, 4★ → 2, 3★ → 4, 2★ → 6, 1★ → 8
  const isHidden = false;

  return {
    isHidden,
    variance,
    description: `Scout ${level}★ — OVR ${variance > 0 ? `±${variance} dalgalanma` : "tam görünür"}`,
  };
}

/**
 * Scout OVR gizleme uygula — eğer variance > 0 ise gerçek OVR'ı variance kadar saptır
 */
export function applyScoutOvrMask(realOvr: number, scouts: StaffMember[]): number | null {
  const { isHidden, variance } = getScoutOvrVisibility(scouts);
  if (isHidden) return null; // ??? göster
  if (variance === 0) return realOvr;
  // Variance kadar sapma — ama her oyuncu için sabit olsun (id bazlı seed)
  const seed = (realOvr * 7) % 100;
  const offset = ((seed % (variance * 2 + 1)) - variance);
  return Math.max(1, Math.min(99, realOvr + offset));
}

/**
 * Doctor seviyesine göre sakatlık iyileşme süresi kısaltması
 * doctorLevel * 5% azaltma (5★ → -25%)
 */
export function getDoctorHealingBonus(doctors: StaffMember[]): {
  reductionPercent: number;
  description: string;
} {
  const topDoctor = doctors
    .filter((s) => s.type === "physio")
    .sort((a, b) => b.stars - a.stars)[0];

  if (!topDoctor) {
    return {
      reductionPercent: 0,
      description: "Doktor yok — sakatlık normal sürede iyileşir",
    };
  }

  const level = topDoctor.stars;
  const reductionPercent = level * 5; // 5★ → %25

  return {
    reductionPercent,
    description: `Doktor ${level}★ — iyileşme süresi -%${reductionPercent}`,
  };
}

/**
 * Doctor ile kısaltılmış sakatlık süresi
 */
export function applyDoctorHealingBonus(days: number, doctors: StaffMember[]): number {
  const { reductionPercent } = getDoctorHealingBonus(doctors);
  if (reductionPercent === 0) return days;
  return Math.max(1, Math.round(days * (1 - reductionPercent / 100)));
}

/**
 * Coach seviyesine göre antrenman stat artışı bonusu
 * coachLevel * 2% artış (5★ → +10%)
 */
export function getCoachTrainingBonus(coaches: StaffMember[]): {
  boostPercent: number;
  description: string;
} {
  const topCoach = coaches
    .filter((s) => s.type === "coach")
    .sort((a, b) => b.stars - a.stars)[0];

  if (!topCoach) {
    return {
      boostPercent: 0,
      description: "Antrenör yok — normal stat artışı",
    };
  }

  const level = topCoach.stars;
  const boostPercent = level * 2; // 5★ → %10

  return {
    boostPercent,
    description: `Antrenör ${level}★ — stat artışı +%${boostPercent}`,
  };
}

/**
 * Coach bonus uygula — stat artışını boostPercent kadar artır
 */
export function applyCoachTrainingBoost(statGain: number, coaches: StaffMember[]): number {
  const { boostPercent } = getCoachTrainingBonus(coaches);
  if (boostPercent === 0) return statGain;
  return Math.round(statGain * (1 + boostPercent / 100) * 10) / 10;
}

/**
 * Tüm personel tipleri için özet tooltip içeriği
 */
export function getStaffBonusSummary(staff: StaffMember[]): {
  scout: { level: number; description: string; effect: string };
  doctor: { level: number; description: string; effect: string };
  coach: { level: number; description: string; effect: string };
} {
  const scoutInfo = getScoutOvrVisibility(staff.filter((s) => s.type === "scout"));
  const doctorInfo = getDoctorHealingBonus(staff.filter((s) => s.type === "physio"));
  const coachInfo = getCoachTrainingBonus(staff.filter((s) => s.type === "coach"));

  const topScout = staff.filter((s) => s.type === "scout").sort((a, b) => b.stars - a.stars)[0];
  const topDoctor = staff.filter((s) => s.type === "physio").sort((a, b) => b.stars - a.stars)[0];
  const topCoach = staff.filter((s) => s.type === "coach").sort((a, b) => b.stars - a.stars)[0];

  return {
    scout: {
      level: topScout?.stars ?? 0,
      description: scoutInfo.description,
      effect: "Transfer listesinde oyuncu OVR'larını daha net görürsün",
    },
    doctor: {
      level: topDoctor?.stars ?? 0,
      description: doctorInfo.description,
      effect: "Sakat oyuncuların iyileşme süresini kısaltır",
    },
    coach: {
      level: topCoach?.stars ?? 0,
      description: coachInfo.description,
      effect: "Antrenman sonrası stat artışını yükseltir",
    },
  };
}
