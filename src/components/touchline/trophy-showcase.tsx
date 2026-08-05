"use client";

import { useState } from "react";
import { Trophy as TrophyIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import type { Trophy } from "@/lib/mock/data";
import {
  TROPHY_METADATA,
  getDivisionDisplayName,
} from "@/lib/trophy-system";
import { useI18n } from "@/lib/i18n/locale-provider";

/**
 * v2.9.78: TrophyShowcase — Kulübün kazandığı kupaların vitrini.
 *
 * Dashboard'a WelcomeBanner sonrası eklenir. `trophies` boşsa hiç render edilmez.
 *
 * Tasarım dili: oyuncu ödül vitrini (player-profile-modal.tsx AwardCard) ile
 * aynı kart/liste görsel dilini kullanır — tutarlılık için yeni tasarım icat etmez.
 *
 * Veri akışı: Dashboard `useMyTeam()` ile team objesini reaktif okur, team.trophies
 * prop olarak geçirilir. team.trophies değiştiğinde (sezon sonu kupa eklendiğinde)
 * otomatik re-render olur.
 *
 * Etkileşim: Her kupa kartına tıklanınca büyük önizleme modal'ı açılır
 * (kupa görseli + isim + açıklama + sezon + lig).
 */
export function TrophyShowcase({ trophies }: { trophies: Trophy[] }) {
  const { locale } = useI18n();
  const [selected, setSelected] = useState<Trophy | null>(null);

  // Boşsa hiç gösterme — kullanıcı henüz kupa kazanmamış
  if (!trophies || trophies.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <TrophyIcon size={14} className="text-amber-400" />
        <h3 className="text-sm font-bold">Kupa Vitrini</h3>
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
          {trophies.length} kupa
        </span>
      </div>

      {/* Yatay kaydırılabilir şerit — mobil dostu */}
      <div className="tm-card p-2 overflow-x-auto tm-thin-scrollbar">
        <div className="flex gap-2 min-w-min">
          {trophies.map((trophy, i) => {
            const meta = TROPHY_METADATA[trophy.trophyKey];
            if (!meta) return null;
            const divisionName = getDivisionDisplayName(trophy.division, locale as "tr" | "en");

            return (
              <button
                key={`${trophy.trophyKey}-${trophy.season}-${trophy.division}-${i}`}
                onClick={() => { haptic("light"); setSelected(trophy); }}
                className="tm-tap shrink-0 w-[88px] flex flex-col items-center text-center gap-1 p-1.5 rounded-lg hover:bg-accent/20 transition-colors"
                title={`${meta.trName} — ${divisionName} (Sezon ${trophy.season})`}
              >
                {/* Kupa görseli — yüklenmezse emoji fallback */}
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <img
                    src={meta.imagePath}
                    alt={meta.trName}
                    className="w-14 h-14 object-contain drop-shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector(".fallback-emoji")) {
                        const span = document.createElement("span");
                        span.className = "fallback-emoji text-4xl";
                        span.textContent = meta.emojiFallback;
                        parent.appendChild(span);
                      }
                    }}
                  />
                </div>
                <div className="text-[10px] font-bold leading-tight line-clamp-1 w-full">
                  {meta.trName}
                </div>
                <div className="text-[9px] text-muted-foreground leading-tight">
                  S{trophy.season} · {divisionName}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Büyük önizleme modal'ı */}
      {selected && (
        <TrophyDetailModal
          trophy={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

/**
 * TrophyDetailModal — kupa kartına tıklanınca açılan büyük önizleme.
 * Player statue modal (season-end-modal awards fazı) ile aynı görsel dili kullanır:
 * tier renkli gradient arka plan + BÜYÜK görsel + isim + açıklama + meta bilgiler.
 */
function TrophyDetailModal({ trophy, onClose }: { trophy: Trophy; onClose: () => void }) {
  const { locale } = useI18n();
  const meta = TROPHY_METADATA[trophy.trophyKey];
  if (!meta) return null;

  const divisionName = getDivisionDisplayName(trophy.division, locale as "tr" | "en");
  const tierGradient = meta.tierColor === "gold"
    ? "from-amber-500/25 via-amber-900/30 to-black/95"
    : meta.tierColor === "silver"
    ? "from-slate-300/20 via-slate-700/30 to-black/95"
    : "from-orange-600/20 via-orange-900/30 to-black/95";
  const tierBorderColor = meta.tierColor === "gold"
    ? "border-amber-400/50"
    : meta.tierColor === "silver"
    ? "border-slate-300/50"
    : "border-orange-500/50";
  const tierTextColor = meta.tierColor === "gold"
    ? "text-amber-300"
    : meta.tierColor === "silver"
    ? "text-slate-200"
    : "text-orange-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={cn("absolute inset-0 bg-gradient-to-b", tierGradient)} onClick={onClose} />

      {/* Konfeti — altın için yoğun, diğerleri için hafif */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(meta.tierColor === "gold" ? 12 : 6)].map((_, i) => {
          const emojis = ["🎉", "✨", "🎊", "⭐"];
          return (
            <span
              key={i}
              className="absolute animate-ping"
              style={{
                left: `${(i * 8.5) % 100}%`,
                top: `${(i * 17) % 100}%`,
                fontSize: "16px",
                animationDelay: `${(i * 0.2) % 2}s`,
                animationDuration: `${2 + (i % 3) * 0.4}s`,
              }}
            >
              {emojis[i % emojis.length]}
            </span>
          );
        })}
      </div>

      <div className="relative w-full max-w-[340px] text-center">
        <button
          onClick={onClose}
          className="tm-tap absolute top-0 right-0 p-2 text-white/70 hover:text-white"
        >
          <X size={20} />
        </button>

        {/* BÜYÜK kupa görseli */}
        <div className="mb-4 flex justify-center mt-6">
          <div className={cn(
            "relative w-48 h-48 rounded-2xl bg-white/5 backdrop-blur-sm border-2 flex items-center justify-center overflow-hidden",
            tierBorderColor
          )}>
            <div className={cn(
              "absolute inset-0 rounded-2xl bg-gradient-to-b opacity-30",
              meta.tierColor === "gold" ? "from-amber-300/40 to-transparent" :
              meta.tierColor === "silver" ? "from-slate-200/40 to-transparent" :
              "from-orange-400/40 to-transparent"
            )} />
            <img
              src={meta.imagePath}
              alt={meta.trName}
              className="relative w-40 h-40 object-contain drop-shadow-2xl z-10"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent && !parent.querySelector(".fallback-emoji")) {
                  const span = document.createElement("span");
                  span.className = "fallback-emoji text-7xl relative z-10";
                  span.textContent = meta.emojiFallback;
                  parent.appendChild(span);
                }
              }}
            />
          </div>
        </div>

        {/* Kupa adı — BÜYÜK */}
        <h2 className={cn("text-2xl font-black mb-2 drop-shadow-lg", tierTextColor)}>
          {meta.trName}
        </h2>

        {/* Açıklama */}
        <p className="text-[12px] text-white/75 mb-3 px-4 leading-relaxed italic">
          {meta.trDesc}
        </p>

        {/* Meta bilgiler — sezon + lig */}
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-5">
          <div className="text-left">
            <div className="text-[9px] uppercase tracking-wider text-white/50">Sezon</div>
            <div className="text-sm font-bold text-white tabular-nums">{trophy.season}</div>
          </div>
          <div className="w-px h-6 bg-white/20" />
          <div className="text-left">
            <div className="text-[9px] uppercase tracking-wider text-white/50">Lig/Turnuva</div>
            <div className="text-sm font-bold text-white">{divisionName}</div>
          </div>
        </div>

        {/* Kapat butonu */}
        <button
          onClick={() => { haptic("light"); onClose(); }}
          className="tm-tap px-8 py-3 rounded-lg bg-white text-black text-sm font-bold flex items-center justify-center gap-2 mx-auto shadow-xl"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}
