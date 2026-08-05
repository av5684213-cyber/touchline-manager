"use client";

import { useState } from "react";
import { Trophy as TrophyIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import type { Trophy, TrophyKey } from "@/lib/mock/data";
import {
  TROPHY_METADATA,
  getDivisionDisplayName,
} from "@/lib/trophy-system";
import { useI18n } from "@/lib/i18n/locale-provider";

/**
 * v2.9.78: TrophyShowcase — Kulübün kazandığı kupaların vitrini.
 *
 * v2.9.79: Gruplama modu — "isimlerine göre mevkiilerine koy"
 * Aynı trophyKey'den birden fazla varsa (ör. 3x Lig Şampiyonu) tek slot'ta
 * "3x" rozetiyle gösterilir. Her kupa türü için ayrı slot.
 *
 * Dashboard'a WelcomeBanner sonrası eklenir. `trophies` boşsa hiç render edilmez.
 *
 * Veri akışı: Dashboard `useMyTeam()` ile team objesini reaktif okur, team.trophies
 * prop olarak geçirilir. team.trophies değiştiğinde (sezon sonu kupa eklendiğinde)
 * otomatik re-render olur.
 *
 * Etkileşim: Her kupa kartına tıklanınca büyük önizleme modal'ı açılır
 * (kupa görseli + isim + açıklama + kazanıldığı sezonlar listesi).
 */

type GroupedTrophy = {
  trophyKey: TrophyKey;
  count: number;
  trophies: Trophy[]; // aynı key'den tüm kazanım örnekleri — en yeni önce
  lastSeason: number;
  divisions: Set<string>;
};

function groupTrophiesByKey(trophies: Trophy[]): GroupedTrophy[] {
  const map = new Map<TrophyKey, GroupedTrophy>();
  for (const t of trophies) {
    const existing = map.get(t.trophyKey);
    if (existing) {
      existing.count++;
      existing.trophies.push(t);
      if (t.season > existing.lastSeason) existing.lastSeason = t.season;
      existing.divisions.add(t.division);
    } else {
      map.set(t.trophyKey, {
        trophyKey: t.trophyKey,
        count: 1,
        trophies: [t],
        lastSeason: t.season,
        divisions: new Set([t.division]),
      });
    }
  }
  // Her grup içindeki kupaları en yeni önce sırala
  for (const g of map.values()) {
    g.trophies.sort((a, b) => b.awardedAt - a.awardedAt);
  }
  // Grupları sırala: en son kazanılan trophyKey önce
  return Array.from(map.values()).sort((a, b) => b.lastSeason - a.lastSeason);
}

export function TrophyShowcase({ trophies }: { trophies: Trophy[] }) {
  const { locale } = useI18n();
  const [selected, setSelected] = useState<GroupedTrophy | null>(null);

  // Boşsa hiç gösterme — kullanıcı henüz kupa kazanmamış
  if (!trophies || trophies.length === 0) return null;

  const grouped = groupTrophiesByKey(trophies);
  const totalTrophies = trophies.length;

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <TrophyIcon size={14} className="text-amber-400" />
        <h3 className="text-sm font-bold">Kupa Vitrini</h3>
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
          {totalTrophies} kupa · {grouped.length} tür
        </span>
      </div>

      {/* Yatay kaydırılabilir şerit — her kupa türü = 1 slot */}
      <div className="tm-card p-2 overflow-x-auto tm-thin-scrollbar">
        <div className="flex gap-2 min-w-min">
          {grouped.map((group) => {
            const meta = TROPHY_METADATA[group.trophyKey];
            if (!meta) return null;
            const divisionName = getDivisionDisplayName(
              Array.from(group.divisions)[0] ?? "",
              locale as "tr" | "en"
            );

            return (
              <button
                key={group.trophyKey}
                onClick={() => { haptic("light"); setSelected(group); }}
                className="tm-tap shrink-0 w-[100px] flex flex-col items-center text-center gap-1 p-1.5 rounded-lg hover:bg-accent/20 transition-colors relative"
                title={`${meta.trName} — ${group.count}x kazanılan · son: S${group.lastSeason}`}
              >
                {/* Count badge — sağ üst köşe, sadece 1'den fazla ise */}
                {group.count > 1 && (
                  <div className="absolute top-0 right-0 px-1 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-black tabular-nums leading-none z-10">
                    {group.count}x
                  </div>
                )}

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
                  S{group.lastSeason}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Büyük önizleme modal'ı — tüm kazanım örneklerini gösterir */}
      {selected && (
        <TrophyDetailModal
          group={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

/**
 * TrophyDetailModal — kupa kartına tıklanınca açılan büyük önizleme.
 * Player statue modal ile aynı görsel dili kullanır:
 * tier renkli gradient arka plan + BÜYÜK görsel + isim + açıklama + meta bilgiler.
 *
 * Eğer aynı kupa türünden birden fazla kazanılmışsa, alt kısımda tüm sezonlar
 * listelenir (ters kronolojik).
 */
function TrophyDetailModal({ group, onClose }: { group: GroupedTrophy; onClose: () => void }) {
  const { locale } = useI18n();
  const meta = TROPHY_METADATA[group.trophyKey];
  if (!meta) return null;

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

      <div className="relative w-full max-w-[340px] text-center max-h-[95vh] overflow-y-auto tm-thin-scrollbar">
        <button
          onClick={onClose}
          className="tm-tap absolute top-0 right-0 p-2 text-white/70 hover:text-white z-20"
        >
          <X size={20} />
        </button>

        {/* Count rozeti — 1'den fazla ise */}
        {group.count > 1 && (
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-black border border-amber-400/50 mb-3 mt-2 backdrop-blur-sm">
            {group.count}x KAZANILDI
          </div>
        )}

        {/* BÜYÜK kupa görseli */}
        <div className="mb-4 flex justify-center mt-3">
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

        {/* Meta bilgi — son kazanılan sezon + lig */}
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-4">
          <div className="text-left">
            <div className="text-[9px] uppercase tracking-wider text-white/50">Son Sezon</div>
            <div className="text-sm font-bold text-white tabular-nums">S{group.lastSeason}</div>
          </div>
          <div className="w-px h-6 bg-white/20" />
          <div className="text-left">
            <div className="text-[9px] uppercase tracking-wider text-white/50">Lig/Turnuva</div>
            <div className="text-sm font-bold text-white">
              {getDivisionDisplayName(Array.from(group.divisions)[0] ?? "", locale as "tr" | "en")}
            </div>
          </div>
        </div>

        {/* Tüm kazanım örnekleri — ters kronolojik (en yeni en üstte) */}
        {group.count > 1 && (
          <div className="mb-5 px-3">
            <div className="text-[10px] uppercase font-bold text-white/60 mb-2">
              Tüm Kazanım Sezonları ({group.trophies.length})
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {group.trophies.map((t, i) => (
                <div
                  key={`${t.season}-${t.division}-${i}`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-[10px]"
                >
                  <span className="text-white/70">S</span>
                  <span className="font-bold text-white tabular-nums">{t.season}</span>
                  <span className="text-white/40">·</span>
                  <span className="text-white/60">
                    {getDivisionDisplayName(t.division, locale as "tr" | "en")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
