"use client";

import { useState } from "react";
import { Search, Sparkles, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { generateFreeAgents, type TransferListing } from "@/lib/mock/transfer";
import { POSITION_GROUP, type PositionGroup } from "@/lib/mock/data";
import { PlayerAvatar, PositionPill, RatingBadge } from "../ui-bits";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

export function ScoutingScreen() {
  const { t } = useI18n();
  const team = useMyTeam();
  const { facilities, transfer, toggleWatchlist } = useAppStore();
  const [tier, setTier] = useState<1 | 2 | 3>(1);
  const [posFilter, setPosFilter] = useState<PositionGroup | "ALL">("ALL");
  const [results, setResults] = useState<TransferListing[]>([]);
  const [searching, setSearching] = useState(false);

  if (!team) return null;

  const scoutCount = facilities.staff.filter((s) => s.type === "scout").length;
  const hasScouts = scoutCount > 0;

  const handleSearch = () => {
    if (!hasScouts) return;
    haptic("medium");
    setSearching(true);
    setTimeout(() => {
      // Tier'a göre sonuç sayısı ve kalite
      const count = tier === 1 ? 3 : tier === 2 ? 6 : 10;
      const minOvr = tier === 1 ? 55 : tier === 2 ? 60 : 65;
      const maxOvr = tier === 1 ? 72 : tier === 2 ? 78 : 85;
      const pool = generateFreeAgents(30).filter(
        (l) => l.player.rating >= minOvr && l.player.rating <= maxOvr
      );
      const filtered = posFilter === "ALL"
        ? pool
        : pool.filter((l) => POSITION_GROUP[l.player.specificPosition] === posFilter);
      setResults(filtered.slice(0, count));
      setSearching(false);
    }, 800);
  };

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      <h1 className="text-base font-bold">{t("scouting.title")}</h1>

      {/* Scout slots */}
      <div className="tm-card p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold">{t("scouting.slots")}</span>
          <span className="text-[10px] text-muted-foreground">{scoutCount}/3</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "flex-1 h-10 rounded-md border flex items-center justify-center text-[10px] font-bold",
                i < scoutCount
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted border-border text-muted-foreground"
              )}
            >
              {i < scoutCount ? `Scout ${i + 1}` : "—"}
            </div>
          ))}
        </div>
        {!hasScouts && (
          <div className="text-[10px] text-amber-400 mt-2 text-center">
            {t("scouting.no_scouts")}
          </div>
        )}
      </div>

      {/* Search controls */}
      <div className="tm-card p-3 space-y-3">
        {/* Tier selector */}
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">{t("scouting.tier")}</div>
          <div className="flex gap-1">
            {([1, 2, 3] as const).map((tr) => (
              <button
                key={tr}
                onClick={() => { haptic("light"); setTier(tr); }}
                disabled={!hasScouts}
                className={cn(
                  "tm-tap flex-1 py-1.5 rounded text-[10px] font-bold border",
                  tier === tr ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border",
                  !hasScouts && "opacity-50"
                )}
              >
                {t(`scouting.tier.${tr}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Position filter */}
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">Pozisyon</div>
          <div className="flex gap-1 overflow-x-auto tm-no-scrollbar">
            {(["ALL", "GK", "DEF", "MID", "FWD"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setPosFilter(g)}
                disabled={!hasScouts}
                className={cn(
                  "tm-tap px-2 py-1 rounded-full text-[10px] font-semibold border whitespace-nowrap",
                  posFilter === g ? "bg-foreground text-background border-foreground" : "bg-card border-border",
                  !hasScouts && "opacity-50"
                )}
              >
                {g === "ALL" ? t("common.all") : t(`pos.${g.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={!hasScouts || searching}
          className={cn(
            "tm-tap w-full py-2.5 rounded-md text-sm font-bold flex items-center justify-center gap-2",
            !hasScouts || searching ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
          )}
        >
          <Search size={14} />
          {searching ? "Aranıyor…" : t("scouting.search")}
        </button>
      </div>

      {/* Results */}
      <div>
        <div className="text-xs font-bold mb-2">{t("scouting.results")} ({results.length})</div>
        {results.length === 0 && !searching && (
          <div className="tm-card p-6 text-center text-xs text-muted-foreground">
            {t("scouting.no_results")}
          </div>
        )}
        <div className="space-y-1.5">
          {results.map((listing) => {
            const isHidden = listing.player.hidden_potential > listing.player.rating + 10;
            const isWatched = transfer.watchlist.includes(listing.player.id);
            return (
              <div key={listing.player.id} className="tm-card p-2.5 flex items-center gap-2.5">
                <PlayerAvatar
                  initials={`${listing.player.firstName[0]}${listing.player.lastName[0]}`}
                  size={32}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold truncate">
                      {listing.player.firstName} {listing.player.lastName}
                    </span>
                    <PositionPill label={listing.player.specificPosition} group={POSITION_GROUP[listing.player.specificPosition]} />
                    {isHidden && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold flex items-center gap-0.5">
                        <Sparkles size={8} /> {t("scouting.hidden_gem")}
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {listing.player.age}{t("common.year")} · OVR {listing.player.rating} · {formatEuro(listing.askingPrice)}
                  </div>
                </div>
                <RatingBadge value={listing.player.formRating} />
                <button
                  onClick={() => { haptic("light"); toggleWatchlist(listing.player.id); }}
                  className={cn(
                    "tm-tap p-1.5 rounded-full",
                    isWatched ? "text-red-400" : "text-muted-foreground"
                  )}
                >
                  <UserPlus size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
