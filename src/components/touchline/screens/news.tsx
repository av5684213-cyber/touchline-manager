"use client";

import { useMemo, useState } from "react";
import { Newspaper, RefreshCw } from "lucide-react";
import { useAppStore, useMyTeam } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

const CATEGORY_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  headline: { color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/30", label: "MANŞET" },
  match: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", label: "MAÇ" },
  transfer: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", label: "TRANSFER" },
  rumor: { color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30", label: "SÖYLENTİ" },
  injury: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", label: "SAKATLIK" },
  milestone: { color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30", label: "DÖNÜM" },
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "az önce";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} dk önce`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} saat önce`;
  return `${Math.floor(diff / 86_400_000)} gün önce`;
}

export function NewsScreen() {
  const team = useMyTeam();
  const news = useAppStore((s) => s.news) ?? [];
  const [filter, setFilter] = useState<string>("ALL");
  const [generating, setGenerating] = useState(false);

  const filteredNews = useMemo(() => {
    if (filter === "ALL") return news;
    return news.filter((n: any) => n.category === filter);
  }, [news, filter]);

  if (!team) return null;

  const unreadCount = news.filter((n: any) => !n.read).length;

  return (
    <div className="px-3 py-3 pb-6 space-y-3">
      <div className="tm-card p-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold flex items-center gap-2">
            <Newspaper size={18} className="text-primary" />
            Gazete
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {team.name} · {unreadCount} okunmamış
          </p>
        </div>
        <div className="flex gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={() => { haptic("light"); useAppStore.getState().markAllNewsRead(); }}
              className="tm-tap px-2 py-1.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/30"
            >
              Tümünü okundu
            </button>
          )}
          <button
            onClick={() => { haptic("light"); setGenerating(true); setTimeout(() => { useAppStore.getState().generateNews(); setGenerating(false); }, 600); }}
            disabled={generating}
            className="tm-tap p-1.5 rounded-md border border-border"
            aria-label="Yenile"
          >
            <RefreshCw size={13} className={cn("text-muted-foreground", generating && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto tm-no-scrollbar">
        {(["ALL", "headline", "match", "transfer", "rumor", "injury", "milestone"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => { haptic("light"); setFilter(cat); }}
            className={cn(
              "tm-tap px-3 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap border",
              filter === cat ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
            )}
            style={{ minHeight: 26 }}
          >
            {cat === "ALL" ? "Tümü" : (CATEGORY_STYLE[cat]?.label ?? cat)}
          </button>
        ))}
      </div>

      {filteredNews.length === 0 ? (
        <div className="tm-card p-8 text-center">
          <Newspaper size={32} className="text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs font-bold mb-1">Henüz haber yok</p>
          <p className="text-[10px] text-muted-foreground">
            Maç oynadıkça haberler otomatik gelir.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNews.map((article: any) => {
            const style = CATEGORY_STYLE[article.category] ?? CATEGORY_STYLE.headline;
            return (
              <div
                key={article.id}
                className={cn(
                  "tm-card w-full text-left p-3 border-l-4 transition-colors",
                  style.bg,
                  !article.read && "ring-1 ring-primary/20"
                )}
                style={{ borderLeftColor: "currentColor" }}
                onClick={() => { haptic("light"); useAppStore.getState().markNewsRead(article.id); }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cn("text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", style.bg)}>
                    {style.label}
                  </span>
                  <span className="text-[8px] text-amber-400">{"★".repeat(Math.min(5, article.importance))}</span>
                  {!article.read && <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-auto shrink-0" />}
                </div>
                <h3 className={cn("text-xs font-bold leading-tight mb-1", !article.read && "text-primary")}>
                  {article.headline}
                </h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">
                  {article.body}
                </p>
                <div className="text-[9px] text-muted-foreground/70 mt-1.5">
                  {relativeTime(article.timestamp)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
