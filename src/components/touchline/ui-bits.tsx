"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";
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
  photoUrl,
  onPhotoUpload,
}: {
  initials: string;
  color?: string;
  size?: number;
  photoUrl?: string | null;
  onPhotoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <span
      className="relative inline-flex items-center justify-center rounded-full font-semibold text-white overflow-hidden shrink-0"
      style={{
        width: size,
        height: size,
        background: color ?? "#1a3a2a",
        fontSize: size * 0.36,
      }}
      aria-hidden={!onPhotoUpload}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="w-full h-full object-cover rounded-full" />
      ) : (
        initials
      )}
      {onPhotoUpload && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileRef.current?.click();
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-full"
            aria-label="Fotoğraf yükle"
            style={{ width: size, height: size }}
          >
            <Camera size={size * 0.35} className="text-white" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPhotoUpload}
            className="sr-only"
          />
        </>
      )}
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
// v2.9.70 FIX: Reaktif seasonStartStats okuma — getState() değil
// v2.9.86 FIX: Rating ondalık olabilir (training 0.5 artış) — Math.round ile tam sayı göster
export function GrowthBadge({ currentRating, playerId }: { currentRating: number; playerId: string }) {
  const startStats = useAppStore((s) => s.seasonStartStats?.[playerId]);
  if (!startStats) return null;
  const startRating = startStats.rating ?? currentRating;
  const diff = Math.round(currentRating - startRating);
  if (diff <= 0) return null;
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        ↑ +{diff}
      </span>
    );
}

// P2: Stat gelişim rozeti — belirli bir stat için sezon başına göre artış gösterir
// v2.9.70 FIX: Reaktif seasonStartStats okuma — getState() değil
// v2.9.86 FIX: Ondalık farkları tam sayıya yuvarla, 0.5'ten büyükse göster
export function StatGrowth({ playerId, statKey, currentValue }: { playerId: string; statKey: string; currentValue: number }) {
  const startStats = useAppStore((s) => s.seasonStartStats?.[playerId]);
  if (!startStats) return null;
  const startValue = startStats[statKey];
  if (startValue === undefined) return null;
  const diff = Math.round(currentValue - startValue);
  if (diff <= 0) return null;
    return (
      <span className="text-[11px] font-bold text-emerald-400 leading-none ml-0.5">
        +{diff}
      </span>
    );
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
      title={days ? `${days} tur sakat` : "Sakat"}
    >
      🤕 {days ? `${days}g` : ""}
    </span>
  );
}
