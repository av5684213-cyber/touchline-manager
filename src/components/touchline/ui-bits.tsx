"use client";

import { cn } from "@/lib/utils";

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
  const v = Math.max(0, Math.min(10, value));
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
      {v.toFixed(1)}
    </span>
  );
}
