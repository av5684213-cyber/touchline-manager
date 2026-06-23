"use client";

export function formatEuro(amount: number, locale: "tr" | "en" = "tr"): string {
  const localeTag = locale === "tr" ? "tr-TR" : "en-US";
  if (Math.abs(amount) >= 1_000_000) {
    return new Intl.NumberFormat(localeTag, {
      style: "currency",
      currency: "EUR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number, locale: "tr" | "en" = "tr"): string {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(n);
}

export function formatDate(
  iso: string,
  locale: "tr" | "en" = "tr"
): string {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function relativeTime(
  iso: string,
  locale: "tr" | "en" = "tr"
): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (locale === "tr") {
    if (sec < 60) return "az önce";
    if (min < 60) return `${min} dk önce`;
    if (hr < 24) return `${hr} sa önce`;
    return `${day} gün önce`;
  } else {
    if (sec < 60) return "just now";
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    return `${day}d ago`;
  }
}

export function countdownParts(target: Date, locale: "tr" | "en") {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) {
    return locale === "tr" ? "başladı" : "live now";
  }
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (d > 0) return `${d}${locale === "tr" ? "g" : "d"} ${h}${locale === "tr" ? "sa" : "h"}`;
  if (h > 0) return `${h}${locale === "tr" ? "sa" : "h"} ${m}${locale === "tr" ? "dk" : "m"}`;
  return `${m}${locale === "tr" ? "dk" : "m"}`;
}
