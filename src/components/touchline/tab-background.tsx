"use client";

/**
 * TabBackground — sekme bazlı arka plan görseli + overlay katmanı.
 *
 * v2.9.74: Sadece görsel katman — hiçbir state/mantık değiştirmeden
 * tm-app-shell'in arka planına sekme key'ine uygun WebP görseli uygular.
 *
 * Özellikler:
 *   - 20 sekme için merkezi TAB_BACKGROUNDS eşlemesi
 *   - Eksik görselde sessizce fallback (bg-background)
 *   - pointer-events: none → tıklama/scroll bozulmaz
 *   - Hafif koyu overlay (bg-black/50) ile okunabilirlik güvenliği
 *   - position: fixed → sekme scroll'unda arka plan sabit (parallax benzeri),
 *     görsel tekrar yüklenmez
 *   - z-index: 0 → içerik (z-10+) üstte kalır
 *
 * Kullanım:
 *   <TabBackground tabKey="dashboard" />
 *   <div className="relative z-10">...içerik...</div>
 *
 * Performans:
 *   - WebP ~70-180KB/görsel, toplam ~1.4MB
 *   - Next.js static asset → otomatik cache (immutable)
 *   - position:fixed → sadece 1 görsel render edilir (DOM'da tek <img>)
 *   - onError handler → 404/bozuk dosyada sessizce gizlenir
 */

import { useEffect, useState } from "react";
import type { TabKey } from "@/components/touchline/bottom-nav";

/**
 * Sekme key → WebP görsel yolu eşlemesi.
 *
 * Görseller Manus.ai ile 1080x1920 PNG üretildi, scripts/optimize-backgrounds.py
 * ile WebP'ye çevrildi (~150KB avg). public/backgrounds/ altında.
 *
 * Eksik key → undefined döner, TabBackground fallback (solid bg) uygular.
 */
export const TAB_BACKGROUNDS: Partial<Record<TabKey, string>> = {
  // Ana navigasyon (5)
  dashboard: "/backgrounds/bg_dashboard.webp",
  tactics: "/backgrounds/bg_tactics.webp",
  match: "/backgrounds/bg_match.webp",
  transfer: "/backgrounds/bg_transfer.webp",
  finance: "/backgrounds/bg_finance.webp",

  // "Diğer" menüsü (9)
  leaderboard: "/backgrounds/bg_leaderboard.webp",
  forum: "/backgrounds/bg_forum.webp",
  shop: "/backgrounds/bg_shop.webp",
  youth: "/backgrounds/bg_youth.webp",
  topscorers: "/backgrounds/bg_topscorers.webp",
  awards: "/backgrounds/bg_awards.webp",
  reports: "/backgrounds/bg_reports.webp",
  news: "/backgrounds/bg_news.webp",
  messages: "/backgrounds/bg_messages.webp",

  // Kulüp/lig alt sekmeleri (6)
  standings: "/backgrounds/bg_standings.webp",
  scouting: "/backgrounds/bg_scouting.webp",
  fixture: "/backgrounds/bg_fixture.webp",
  friendly: "/backgrounds/bg_friendly.webp",
  facilities: "/backgrounds/bg_facilities.webp",
  cup: "/backgrounds/bg_cup.webp",
};

/**
 * Arka plan görselini uygulayan fixed katman.
 *
 * - tm-app-shell'in içine konumlandırılır (absolute), sadece o alanı kaplar
 * - Görsel yüklenene kadar <div> (bg-background) görünür → flash yok
 * - Görsel yüklenince <img> fade-in (opacity transition)
 * - Hata durumunda <img> gizlenir, fallback <div> kalır
 */
export function TabBackground({ tabKey }: { tabKey: TabKey }) {
  const src = TAB_BACKGROUNDS[tabKey];
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Sekme değişiminde state reset (yeni görsel için)
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  // Görsel yoksa (eksik key) → sadece fallback bg döndür
  if (!src) {
    return (
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-background pointer-events-none"
        style={{ zIndex: 0 }}
      />
    );
  }

  // Görsel varsa → fallback bg + img üstte
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Fallback solid bg (görsel yüklenene kadar veya hata durumunda) */}
      <div className="absolute inset-0 bg-background" />

      {/* Görsel — cover + center */}
      {/* Next.js Image yerine raw <img> kullanıyoruz çünkü:
          - background değil dekoratif <img> (z-index arkada)
          - Next.js Image fill + priority ile daha karmaşık
          - raw <img> + browser cache yeterli (1.4MB total, immutable) */}
      <img
        src={src}
        alt=""
        role="presentation"
        loading="eager"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
        style={{
          opacity: loaded && !error ? 1 : 0,
        }}
      />

      {/* Overlay — okunabilirlik için koyu katman
          v2.9.74: 0.55 → 0.35 — arka plan görseli daha net görünsün
          Kartların kendi backdrop-blur'u okunabilirliği zaten sağlıyor */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.35)",
          opacity: loaded && !error ? 1 : 0.2,
          transition: "opacity 300ms ease-out",
        }}
      />
    </div>
  );
}

/**
 * Helper: Belirli bir sekme için arka plan var mı kontrol et.
 * Test/preview için kullanılabilir.
 */
export function hasTabBackground(tabKey: TabKey): boolean {
  return Boolean(TAB_BACKGROUNDS[tabKey]);
}
