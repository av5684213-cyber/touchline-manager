"use client";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

export function ClubBadge({
  short,
  primaryColor,
  size = 36,
  className,
}: {
  short: string;
  primaryColor: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold text-white shadow-sm",
        className
      )}
      style={{
        width: size,
        height: size,
        background: primaryColor,
        fontSize: size * 0.34,
        letterSpacing: "-0.04em",
      }}
      aria-hidden
    >
      {short}
    </span>
  );
}

export function PlayerAvatar({
  initials,
  color,
  size = 40,
}: {
  initials: string;
  color?: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: color ?? "#1a3a2a",
        fontSize: size * 0.36,
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function ResultBadge({
  outcome,
  score,
}: {
  outcome: "win" | "draw" | "loss";
  score: string;
}) {
  const cls =
    outcome === "win"
      ? "tm-result-win"
      : outcome === "draw"
      ? "tm-result-draw"
      : "tm-result-loss";
  return (
    <span
      className={cn(
        "inline-flex min-w-10 px-2 py-0.5 rounded-md text-xs font-bold tabular-nums justify-center",
        cls
      )}
    >
      {score}
    </span>
  );
}

export function PositionPill({
  label,
  group,
}: {
  label: string;
  group: "GK" | "DEF" | "MID" | "FWD";
}) {
  const colors: Record<typeof group, string> = {
    GK: "bg-amber-100 text-amber-900",
    DEF: "bg-sky-100 text-sky-900",
    MID: "bg-emerald-100 text-emerald-900",
    FWD: "bg-rose-100 text-rose-900",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide",
        colors[group]
      )}
    >
      {label}
    </span>
  );
}

export function RatingBadge({ value }: { value: number }) {
  // P2 FIX: 0-100 (OVR/rating) tam sayı gösterilir, 0-10 (formRating) 1 ondalık gösterilir
  // 50+ değerler 0-100 aralığı kabul edilir (OVR), 10 ve altı 0-10 (formRating)
  const isOvr = value > 10;
  const ovrVal = isOvr ? Math.max(0, Math.min(100, Math.round(value))) : Math.round(value * 10);
  const formVal = isOvr ? value / 10 : Math.max(0, Math.min(10, value));
  const v = isOvr ? ovrVal / 10 : formVal; // renk tonu için normalize
  const tone =
    v >= 8 ? "bg-emerald-600 text-white" :
    v >= 7 ? "bg-emerald-500 text-white" :
    v >= 6 ? "bg-amber-500 text-white" :
    v >= 5 ? "bg-orange-500 text-white" :
    "bg-red-500 text-white";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-9 px-1.5 py-0.5 rounded text-sm font-bold tabular-nums tm-rating",
        tone
      )}
    >
      {isOvr ? ovrVal : formVal.toFixed(1)}
    </span>
  );
}

// P5: Gelişim rozeti — sezon başına göre oyuncunun rating artışını gösterir
export function GrowthBadge({ currentRating, playerId }: { currentRating: number; playerId: string }) {
  try {
    // Store'dan sezon başı stats'ını oku (lazy import ile circular dependency önle)
    const store = useAppStore.getState();
    const startStats = store.seasonStartStats?.[playerId];
    if (!startStats) return null;
    const startRating = startStats.rating ?? currentRating;
    const diff = currentRating - startRating;
    if (diff <= 0) return null;
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        ↑ +{diff}
      </span>
    );
  } catch {
    return null;
  }
}

// P2: Stat gelişim rozeti — belirli bir stat için sezon başına göre artış gösterir
// Örnek: pace 50→52 ise "+2" gösterir
export function StatGrowth({ playerId, statKey, currentValue }: { playerId: string; statKey: string; currentValue: number }) {
  try {
    const store = useAppStore.getState();
    const startStats = store.seasonStartStats?.[playerId];
    if (!startStats) return null;
    const startValue = startStats[statKey];
    if (startValue === undefined) return null;
    const diff = currentValue - startValue;
    if (diff <= 0) return null;
    return (
      <span className="text-[11px] font-bold text-emerald-400 leading-none ml-0.5">
        +{diff}
      </span>
    );
  } catch {
    return null;
  }
}

// P2: Sakatlık rozeti — sakat oyuncularda kırmızı 🤕 icon + gün sayısı
export function InjuryBadge({ days, size = "sm" }: { days?: number; size?: "sm" | "md" }) {
  const sizeCls = size === "md" ? "text-[11px] px-1.5 py-0.5" : "text-[10px] px-1 py-0.5";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded font-bold bg-red-500/20 text-red-300 border border-red-500/30",
        sizeCls
      )}
      title={days ? `${days} gün sakat` : "Sakat"}
    >
      🤕 {days ? `${days}g` : ""}
    </span>
  );
}
