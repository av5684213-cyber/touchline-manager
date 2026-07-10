"use client";

// ADDED: LiveMatchPitch — canlı maç sırasında 11v11 oyuncuları 2D sahada göster
// Top-down view, oyuncu daireleri, top animasyonu

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface LivePlayer {
  id: string;
  name: string;
  rating: number;
  position: string; // GK, CB, LB, RB, CM, ST, vb.
  side: "home" | "away";
  isCaptain?: boolean;
  isCarded?: "yellow" | "red" | null;
}

interface LiveMatchPitchProps {
  homePlayers: LivePlayer[];
  awayPlayers: LivePlayer[];
  homeColor: string;
  awayColor: string;
  homeFormation: string; // "4-4-2"
  awayFormation: string;
  ballPosition?: { x: number; y: number }; // 0-100
  minute: number;
  homeScore: number;
  awayScore: number;
  homeShort: string;
  awayShort: string;
  onPlayerClick?: (playerId: string) => void;
}

// Formasyon slot koordinatları (0-100, top-down view)
// x: 0=sol çizgi, 100=sağ çizgi
// y: 0=kaleci (alt), 100=forvet (üst)
// Home altta (kaleci y≈10), Away üstte (kaleci y≈90)
const FORMATION_COORDS: Record<string, { x: number; y: number }[]> = {
  "4-4-2": [
    { x: 50, y: 8 }, { x: 15, y: 28 }, { x: 38, y: 25 }, { x: 62, y: 25 }, { x: 85, y: 28 },
    { x: 18, y: 50 }, { x: 40, y: 48 }, { x: 60, y: 48 }, { x: 82, y: 50 },
    { x: 38, y: 72 }, { x: 62, y: 72 },
  ],
  "4-3-3": [
    { x: 50, y: 8 }, { x: 15, y: 28 }, { x: 38, y: 25 }, { x: 62, y: 25 }, { x: 85, y: 28 },
    { x: 30, y: 48 }, { x: 50, y: 50 }, { x: 70, y: 48 },
    { x: 20, y: 72 }, { x: 50, y: 75 }, { x: 80, y: 72 },
  ],
  "4-2-3-1": [
    { x: 50, y: 8 }, { x: 15, y: 28 }, { x: 38, y: 25 }, { x: 62, y: 25 }, { x: 85, y: 28 },
    { x: 38, y: 45 }, { x: 62, y: 45 },
    { x: 20, y: 65 }, { x: 50, y: 60 }, { x: 80, y: 65 },
    { x: 50, y: 80 },
  ],
  "4-1-4-1": [
    { x: 50, y: 8 }, { x: 15, y: 28 }, { x: 38, y: 25 }, { x: 62, y: 25 }, { x: 85, y: 28 },
    { x: 50, y: 42 },
    { x: 16, y: 62 }, { x: 38, y: 60 }, { x: 62, y: 60 }, { x: 84, y: 62 },
    { x: 50, y: 80 },
  ],
  "4-5-1": [
    { x: 50, y: 8 }, { x: 15, y: 28 }, { x: 38, y: 25 }, { x: 62, y: 25 }, { x: 85, y: 28 },
    { x: 14, y: 48 }, { x: 34, y: 50 }, { x: 50, y: 45 }, { x: 66, y: 50 }, { x: 86, y: 48 },
    { x: 50, y: 78 },
  ],
  "4-3-2-1": [
    { x: 50, y: 8 }, { x: 15, y: 28 }, { x: 38, y: 25 }, { x: 62, y: 25 }, { x: 85, y: 28 },
    { x: 28, y: 46 }, { x: 50, y: 50 }, { x: 72, y: 46 },
    { x: 38, y: 68 }, { x: 62, y: 68 },
    { x: 50, y: 82 },
  ],
  "4-4-1-1": [
    { x: 50, y: 8 }, { x: 15, y: 28 }, { x: 38, y: 25 }, { x: 62, y: 25 }, { x: 85, y: 28 },
    { x: 18, y: 50 }, { x: 40, y: 48 }, { x: 60, y: 48 }, { x: 82, y: 50 },
    { x: 50, y: 65 },
    { x: 50, y: 80 },
  ],
  "4-3-1-2": [
    { x: 50, y: 8 }, { x: 15, y: 28 }, { x: 38, y: 25 }, { x: 62, y: 25 }, { x: 85, y: 28 },
    { x: 28, y: 48 }, { x: 50, y: 50 }, { x: 72, y: 48 },
    { x: 50, y: 65 },
    { x: 38, y: 80 }, { x: 62, y: 80 },
  ],
  "3-5-2": [
    { x: 50, y: 8 }, { x: 28, y: 25 }, { x: 50, y: 22 }, { x: 72, y: 25 },
    { x: 12, y: 48 }, { x: 32, y: 45 }, { x: 50, y: 50 }, { x: 68, y: 45 }, { x: 88, y: 48 },
    { x: 38, y: 72 }, { x: 62, y: 72 },
  ],
  "3-4-3": [
    { x: 50, y: 8 }, { x: 28, y: 25 }, { x: 50, y: 22 }, { x: 72, y: 25 },
    { x: 12, y: 50 }, { x: 38, y: 48 }, { x: 62, y: 48 }, { x: 88, y: 50 },
    { x: 20, y: 72 }, { x: 50, y: 75 }, { x: 80, y: 72 },
  ],
  "3-1-4-2": [
    { x: 50, y: 8 }, { x: 28, y: 25 }, { x: 50, y: 22 }, { x: 72, y: 25 },
    { x: 50, y: 42 },
    { x: 16, y: 62 }, { x: 38, y: 60 }, { x: 62, y: 60 }, { x: 84, y: 62 },
    { x: 38, y: 80 }, { x: 62, y: 80 },
  ],
  "3-3-3-1": [
    { x: 50, y: 8 }, { x: 28, y: 25 }, { x: 50, y: 22 }, { x: 72, y: 25 },
    { x: 30, y: 48 }, { x: 50, y: 50 }, { x: 70, y: 48 },
    { x: 20, y: 68 }, { x: 50, y: 65 }, { x: 80, y: 68 },
    { x: 50, y: 82 },
  ],
  "5-4-1": [
    { x: 50, y: 8 }, { x: 8, y: 30 }, { x: 28, y: 25 }, { x: 50, y: 22 }, { x: 72, y: 25 }, { x: 92, y: 30 },
    { x: 18, y: 52 }, { x: 40, y: 50 }, { x: 60, y: 50 }, { x: 82, y: 52 },
    { x: 50, y: 78 },
  ],
  "5-3-2": [
    { x: 50, y: 8 }, { x: 10, y: 30 }, { x: 28, y: 25 }, { x: 50, y: 22 }, { x: 72, y: 25 }, { x: 90, y: 30 },
    { x: 30, y: 50 }, { x: 50, y: 52 }, { x: 70, y: 50 },
    { x: 38, y: 72 }, { x: 62, y: 72 },
  ],
};

// Default fallback (4-4-2)
const DEFAULT_COORDS = FORMATION_COORDS["4-4-2"];

export function LiveMatchPitch({
  homePlayers,
  awayPlayers,
  homeColor,
  awayColor,
  homeFormation,
  awayFormation,
  ballPosition,
  minute,
  homeScore,
  awayScore,
  homeShort,
  awayShort,
  onPlayerClick,
}: LiveMatchPitchProps) {
  // Koordinatları al, yoksa default
  const homeCoords = FORMATION_COORDS[homeFormation] ?? DEFAULT_COORDS;
  const awayCoords = FORMATION_COORDS[awayFormation] ?? DEFAULT_COORDS;

  // Home altta (y 0-100 → alt), Away üstte (y 0-100 → üst, ama ters çevir)
  // Home koordinatları y=8 (kaleci) altta, y=72 (forvet) üstte
  // Away koordinatları y=8 (kaleci) üstte, y=72 (forvet) altta — y'yi 100-y olarak çevir

  return (
    <div className="tm-card p-2">
      {/* Skor bar'ı */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full"
            style={{ background: homeColor }}
          />
          <span className="text-[10px] font-bold">{homeShort}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold tabular-nums">{homeScore}</span>
          <span className="text-[10px] text-muted-foreground">-</span>
          <span className="text-base font-bold tabular-nums">{awayScore}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold">{awayShort}</span>
          <span
            className="w-3 h-3 rounded-full"
            style={{ background: awayColor }}
          />
        </div>
      </div>

      {/* Dakika */}
      <div className="text-center mb-1.5">
        <span className="text-[9px] font-bold text-amber-400 tabular-nums">
          {minute > 90 ? `90+${minute - 90}'` : `${minute}'`}
        </span>
      </div>

      {/* 2D Saha — aspect-ratio 3/4 (dikey) */}
      <div
        className="relative rounded-lg overflow-hidden mx-auto"
        style={{
          aspectRatio: "3 / 4",
          background: "linear-gradient(180deg, #1a3a2a 0%, #0f2818 100%)",
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 8%,
              rgba(255,255,255,0.04) 8%,
              rgba(255,255,255,0.04) 16%
            )
          `,
        }}
      >
        {/* Saha çizgileri — SVG overlay */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 133"
          preserveAspectRatio="none"
        >
          <g fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3">
            {/* Saha kenar */}
            <rect x="2" y="2" width="96" height="129" rx="0.5" />
            {/* Orta çizgi */}
            <line x1="2" y1="66.5" x2="98" y2="66.5" />
            {/* Orta daire */}
            <circle cx="50" cy="66.5" r="10" />
            <circle cx="50" cy="66.5" r="0.5" fill="rgba(255,255,255,0.5)" />
            {/* Alt ceza alanı (home kale) */}
            <rect x="20" y="2" width="60" height="14" />
            <rect x="35" y="2" width="30" height="6" />
            <path d="M 30 16 A 8 8 0 0 0 70 16" />
            {/* Üst ceza alanı (away kale) */}
            <rect x="20" y="117" width="60" height="14" />
            <rect x="35" y="125" width="30" height="6" />
            <path d="M 30 117 A 8 8 0 0 1 70 117" />
          </g>
        </svg>

        {/* Away oyuncuları (üst yarı: 0-50%) — koordinatları üst yarıya sıkıştır */}
        {awayPlayers.slice(0, 11).map((p, i) => {
          const coord = awayCoords[i] ?? DEFAULT_COORDS[i % 11];
          const x = coord.x;
          const y = 2 + (100 - coord.y) * 0.46;
          return (
            <PlayerDot
              key={`away-${p.id}-${i}`}
              player={p}
              x={x}
              y={y}
              color={awayColor}
              side="away"
              onClick={onPlayerClick ? () => onPlayerClick(p.id) : undefined}
            />
          );
        })}

        {/* Home oyuncuları (alt yarı: 50-98%) — koordinatları alt yarıya sıkıştır */}
        {homePlayers.slice(0, 11).map((p, i) => {
          const coord = homeCoords[i] ?? DEFAULT_COORDS[i % 11];
          const x = coord.x;
          const y = 52 + coord.y * 0.46;
          return (
            <PlayerDot
              key={`home-${p.id}-${i}`}
              player={p}
              x={x}
              y={y}
              color={homeColor}
              side="home"
              onClick={onPlayerClick ? () => onPlayerClick(p.id) : undefined}
            />
          );
        })}

        {/* Top — eğer ballPosition verilmişse */}
        {ballPosition && (
          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-white border border-gray-400 shadow-md transition-all duration-500 ease-out"
            style={{
              left: `${ballPosition.x}%`,
              top: `${ballPosition.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: 20,
            }}
          />
        )}
      </div>

      {/* Açıklama */}
      <div className="text-[8px] text-muted-foreground text-center mt-1">
        Üst: {awayShort} · Alt: {homeShort} ({homeFormation} vs {awayFormation})
      </div>
    </div>
  );
}

// Oyuncu noktası — daire + isim/numara
function PlayerDot({
  player,
  x,
  y,
  color,
  side,
  onClick,
}: {
  player: LivePlayer;
  x: number;
  y: number;
  color: string;
  side: "home" | "away";
  onClick?: () => void;
}) {
  const isGK = player.position === "GK";
  const hasYellow = player.isCarded === "yellow";
  const hasRed = player.isCarded === "red";

  return (
    <div
      onClick={onClick}
      className={cn("absolute flex flex-col items-center gap-0.5", onClick && "cursor-pointer tm-tap")}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 10,
      }}
    >
      <div className="relative">
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2",
            isGK ? "border-amber-300" : "border-white/60",
            hasRed && "ring-2 ring-red-500"
          )}
          style={{ background: color }}
        >
          {player.rating}
        </div>
        {/* Kart rozeti */}
        {hasYellow && (
          <span className="absolute -top-1 -right-1 w-2 h-2.5 bg-yellow-400 rounded-sm border border-yellow-600" />
        )}
        {hasRed && (
          <span className="absolute -top-1 -right-1 w-2 h-2.5 bg-red-500 rounded-sm border border-red-700" />
        )}
        {/* Kaptan */}
        {player.isCaptain && (
          <span className="absolute -top-1 -left-1 text-[7px] font-bold text-amber-300">C</span>
        )}
      </div>
      <span className="text-[7px] text-white font-semibold drop-shadow max-w-[40px] truncate text-center">
        {player.name.split(" ").pop()}
      </span>
    </div>
  );
}
