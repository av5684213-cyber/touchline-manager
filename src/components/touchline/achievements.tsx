"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_win", name: "İlk Galibiyet", description: "İlk maçını kazan", icon: "🏆", unlocked: false },
  { id: "first_goal", name: "İlk Gol", description: "İlk gol atan oyuncun", icon: "⚽", unlocked: false },
  { id: "first_transfer", name: "İlk Transfer", description: "İlk transferini tamamla", icon: "💰", unlocked: false },
  { id: "goal_machine", name: "Gol Makinesi", description: "Bir oyuncu sezonda 20+ gol at", icon: "🔥", unlocked: false },
  { id: "assist_king", name: "Asist Kralı", description: "Bir oyuncu sezonda 15+ asist yap", icon: "🎯", unlocked: false },
  { id: "wall", name: "Kale Duvarı", description: "5 maçta 0 gol yeme", icon: "🧱", unlocked: false },
  { id: "win_streak_5", name: "Galibiyet Serisi", description: "5 maç üst üste galibiyet", icon: "🔥", unlocked: false },
  { id: "promotion", name: "Yükselme", description: "Bir üst lige çık", icon: "📈", unlocked: false },
  { id: "cup_champion", name: "Kupa Şampiyonu", description: "Kupayı kazan", icon: "🥇", unlocked: false },
  { id: "genius", name: "Deha", description: "Taktik puanı 90+", icon: "🧠", unlocked: false },
  { id: "youth_star", name: "Altyapı Yıldızı", description: "Altyapıdan oyuncu terfi et", icon: "⭐", unlocked: false },
  { id: "transfer_mogul", name: "Transfer Cüzdanı", description: "10 transfer yap", icon: "💼", unlocked: false },
  { id: "budget_master", name: "Bütçe Ustası", description: "50M+ bütçe biriktir", icon: "💎", unlocked: false },
  { id: "champion", name: "Sezon Şampiyonu", description: "Ligi 1. bitir", icon: "👑", unlocked: false },
  { id: "legend", name: "Efsane", description: "5 sezon oyna", icon: "🌟", unlocked: false },
  // ADDED: Yeni başarım tetikleyiciler
  { id: "first_login", name: "Hoş Geldin", description: "Oyuna ilk kez giriş yap", icon: "👋", unlocked: false },
  { id: "tactical_master", name: "Taktik Ustası", description: "Tüm taktik talimatlarını aktif et", icon: "📋", unlocked: false },
  { id: "youth_promoted", name: "Altyapı Fatihi", description: "3 altyapı oyuncusu terfi et", icon: "🎓", unlocked: false },
];

const STORAGE_KEY = "tm_achievements";

export function loadAchievements(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function saveAchievements(data: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function unlockAchievement(id: string): { newlyUnlocked: boolean; achievement?: Achievement } {
  const data = loadAchievements();
  if (data[id]) return { newlyUnlocked: false };
  data[id] = true;
  saveAchievements(data);
  const ach = ACHIEVEMENTS.find((a) => a.id === id);
  if (ach) haptic("success");
  return { newlyUnlocked: true, achievement: ach };
}

export function checkAchievements(context: {
  matchWon?: boolean;
  goalScored?: boolean;
  transferDone?: boolean;
  topScorerGoals?: number;
  topAssists?: number;
  cleanSheetStreak?: number;
  winStreak?: number;
  promoted?: boolean;
  cupWon?: boolean;
  tacticScore?: number;
  youthPromoted?: boolean;
  transferCount?: number;
  budget?: number;
  // ADDED: Yeni başarım context alanları
  firstLogin?: boolean;
  tacticalMaster?: boolean;
  youthPromotedCount?: number;
  leaguePosition?: number;
  seasonsPlayed?: number;
}) {
  const newlyUnlocked: Achievement[] = [];

  if (context.matchWon) {
    const r = unlockAchievement("first_win");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if (context.goalScored) {
    const r = unlockAchievement("first_goal");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if (context.transferDone) {
    const r = unlockAchievement("first_transfer");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if ((context.topScorerGoals ?? 0) >= 20) {
    const r = unlockAchievement("goal_machine");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if ((context.topAssists ?? 0) >= 15) {
    const r = unlockAchievement("assist_king");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if ((context.cleanSheetStreak ?? 0) >= 5) {
    const r = unlockAchievement("wall");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if ((context.winStreak ?? 0) >= 5) {
    const r = unlockAchievement("win_streak_5");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if (context.promoted) {
    const r = unlockAchievement("promotion");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if (context.cupWon) {
    const r = unlockAchievement("cup_champion");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if ((context.tacticScore ?? 0) >= 90) {
    const r = unlockAchievement("genius");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if (context.youthPromoted) {
    const r = unlockAchievement("youth_star");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if ((context.transferCount ?? 0) >= 10) {
    const r = unlockAchievement("transfer_mogul");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if ((context.budget ?? 0) >= 50_000_000) {
    const r = unlockAchievement("budget_master");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if (context.leaguePosition === 1) {
    const r = unlockAchievement("champion");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if ((context.seasonsPlayed ?? 0) >= 5) {
    const r = unlockAchievement("legend");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  // ADDED: Yeni başarım kontrolleri
  if (context.firstLogin) {
    const r = unlockAchievement("first_login");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if (context.tacticalMaster) {
    const r = unlockAchievement("tactical_master");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }
  if ((context.youthPromotedCount ?? 0) >= 3) {
    const r = unlockAchievement("youth_promoted");
    if (r.newlyUnlocked && r.achievement) newlyUnlocked.push(r.achievement);
  }

  return newlyUnlocked;
}

// Toast notification for newly unlocked achievements
export function AchievementToast({ achievements, onClose }: {
  achievements: Achievement[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (achievements.length > 0) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievements, onClose]);

  if (achievements.length === 0) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] space-y-2 w-full max-w-[340px] px-4">
      {achievements.map((ach) => (
        <div
          key={ach.id}
          className="tm-card p-3 flex items-center gap-3 bg-amber-500/15 border-amber-500/40 animate-[slidein_0.3s_ease]"
        >
          <span className="text-3xl">{ach.icon}</span>
          <div className="flex-1">
            <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wide">🏆 Rozet Açıldı!</div>
            <div className="text-sm font-bold text-foreground">{ach.name}</div>
            <div className="text-[10px] text-muted-foreground">{ach.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Dashboard rozet kartı
export function AchievementsCard() {
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setUnlocked(loadAchievements());
  }, []);

  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;

  return (
    <div className="tm-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">Rozetlerim</div>
        <div className="text-[10px] font-bold text-amber-400">{unlockedCount}/{ACHIEVEMENTS.length}</div>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {ACHIEVEMENTS.map((ach) => (
          <div
            key={ach.id}
            className={cn(
              "aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all",
              unlocked[ach.id]
                ? "bg-amber-500/15 border border-amber-500/30"
                : "bg-muted/20 border border-border opacity-40"
            )}
            title={`${ach.name} — ${ach.description}`}
          >
            <span className={cn("text-lg", !unlocked[ach.id] && "grayscale")}>{ach.icon}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ADDED: checkAndAwardBadges — tüm başarım tetikleyicileri için merkezi fonksiyon
// loginDemo, transfer, maç sonu, sezon sonu tarafından çağrılır
export function checkAndAwardBadges(context: {
  matchWon?: boolean;
  goalScored?: boolean;
  transferDone?: boolean;
  topScorerGoals?: number;
  topAssists?: number;
  cleanSheetStreak?: number;
  winStreak?: number;
  promoted?: boolean;
  cupWon?: boolean;
  tacticScore?: number;
  youthPromoted?: boolean;
  transferCount?: number;
  budget?: number;
  leaguePosition?: number;
  seasonsPlayed?: number;
}) {
  if (typeof window === "undefined") return [];
  try {
    return checkAchievements(context);
  } catch (e) {
    console.warn("[checkAndAwardBadges] hata:", e);
    return [];
  }
}

// ADDED: Transfer başarımı tetikleyici — transfer sayısını localStorage'da sayar
const TRANSFER_COUNT_KEY = "tm_transfer_count";

export function incrementTransferCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const current = parseInt(localStorage.getItem(TRANSFER_COUNT_KEY) ?? "0", 10) + 1;
    localStorage.setItem(TRANSFER_COUNT_KEY, String(current));
    // İlk transfer başarımı
    checkAndAwardBadges({ transferDone: true, transferCount: current });
    // Budget master — 50M+ bütçe
    const store = require("@/lib/store").useAppStore.getState();
    const myTeam = store.clubs?.find((c: any) => c.id === store.myTeamId);
    if (myTeam) {
      checkAndAwardBadges({ budget: myTeam.budget });
    }
    return current;
  } catch {
    return 0;
  }
}
