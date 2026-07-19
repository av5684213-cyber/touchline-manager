"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Trophy, Flame, Coins, Zap } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

type WeeklyChallenge = {
  id: string;
  day: number;
  title: string;
  desc: string;
  reward: { type: "credits" | "morale" | "form" | "budget"; amount: number };
  icon: typeof Trophy;
  done: boolean;
  claimed: boolean;
};

/**
 * Haftalık Zorluklar — 7 gün milestone zinciri.
 * Her gün bir görev, tamamla → ödül al.
 * 7 günün hepsini tamamla → bonus ödül.
 * Haftalık reset (Pazartesi).
 */
export function WeeklyChallengesCard() {
  const { credits, seasonMatchday } = useAppStore();
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Hafta başlangıcı — Pazartesi
  const weekKey = (() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Pazartesi'ye git
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    return monday.toISOString().slice(0, 10);
  })();

  useEffect(() => {
    // localStorage'dan yükle veya yeni hafta oluştur
    const storageKey = `tm_weekly_${weekKey}`;
    const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (saved) {
      try {
        setChallenges(JSON.parse(saved));
        return;
      } catch {}
    }
    // Yeni hafta — 7 görev üret
    const fresh: WeeklyChallenge[] = [
      { id: "d1", day: 1, title: "İlk Maçını Oyna", desc: "1 lig maçı oyna", reward: { type: "credits", amount: 3 }, icon: Trophy, done: false, claimed: false },
      { id: "d2", day: 2, title: "Gol At", desc: "1 maçta en az 2 gol at", reward: { type: "credits", amount: 3 }, icon: Zap, done: false, claimed: false },
      { id: "d3", day: 3, title: "Temiz Fikstür", desc: "Mağlubiyet almadan 2 maç oyna", reward: { type: "morale", amount: 5 }, icon: Flame, done: false, claimed: false },
      { id: "d4", day: 4, title: "Transfer Yap", desc: "1 oyuncu transfer et veya teklif ver", reward: { type: "credits", amount: 3 }, icon: Coins, done: false, claimed: false },
      { id: "d5", day: 5, title: "Antrenman", desc: "1 antrenman seansı tamamla", reward: { type: "form", amount: 5 }, icon: Flame, done: false, claimed: false },
      { id: "d6", day: 6, title: "Galibiyet Serisi", desc: "Üst üste 2 galibiyet al", reward: { type: "credits", amount: 5 }, icon: Trophy, done: false, claimed: false },
      { id: "d7", day: 7, title: "Kupa Maçı", desc: "Kupa turu oyna veya hazırlık maçı yap", reward: { type: "budget", amount: 500000 }, icon: Trophy, done: false, claimed: false },
    ];
    setChallenges(fresh);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(fresh));
    }
  }, [weekKey]);

  // P0 FIX BUG #30: d1 görevi haftalık olarak tamamlansın — sezon değil hafta bazlı
  // Eğer bu hafta en az 1 maç oynandıysa (seasonMatchday hafta içinde değiştiyse) d1 tamamla
  useEffect(() => {
    // seasonMatchday değiştiyse = bir maç oynandı demektir
    if (seasonMatchday > 1 && challenges.length > 0) {
      setChallenges(prev => {
        // Sadece d1 henüz tamamlanmadıysa güncelle
        const d1 = prev.find(c => c.id === "d1");
        if (d1?.done) return prev; // zaten tamamlandı, tekrar yazma
        const updated = prev.map(c => c.id === "d1" ? { ...c, done: true } : c);
        if (typeof window !== "undefined") {
          localStorage.setItem(`tm_weekly_${weekKey}`, JSON.stringify(updated));
        }
        return updated;
      });
    }
  }, [seasonMatchday, weekKey, challenges.length]);

  const handleClaim = (id: string) => {
    const challenge = challenges.find(c => c.id === id);
    if (!challenge || !challenge.done || challenge.claimed) return;
    haptic("success");
    // Ödül uygula
    const store = useAppStore.getState();
    if (challenge.reward.type === "credits") {
      store.addCredits(challenge.reward.amount);
    } else if (challenge.reward.type === "morale") {
      const clubs = [...store.clubs];
      const myClub = clubs.find(c => c.id === store.myTeamId);
      if (myClub) {
        myClub.players = myClub.players.map(p => ({ ...p, morale: Math.min(100, p.morale + challenge.reward.amount) }));
        useAppStore.setState({ clubs });
      }
    } else if (challenge.reward.type === "form") {
      const clubs = [...store.clubs];
      const myClub = clubs.find(c => c.id === store.myTeamId);
      if (myClub) {
        myClub.players = myClub.players.map(p => ({ ...p, form: Math.min(100, p.form + challenge.reward.amount) }));
        useAppStore.setState({ clubs });
      }
    } else if (challenge.reward.type === "budget") {
      const clubs = [...store.clubs];
      const myClub = clubs.find(c => c.id === store.myTeamId);
      if (myClub) {
        myClub.budget += challenge.reward.amount;
        useAppStore.setState({ clubs });
      }
    }
    // Challenge'ı claimed olarak işaretle
    const updated = challenges.map(c => c.id === id ? { ...c, claimed: true } : c);
    setChallenges(updated);
    localStorage.setItem(`tm_weekly_${weekKey}`, JSON.stringify(updated));
    const rewardText = challenge.reward.type === "credits" ? `+${challenge.reward.amount} kredi`
      : challenge.reward.type === "morale" ? `+${challenge.reward.amount} moral`
      : challenge.reward.type === "form" ? `+${challenge.reward.amount} form`
      : `+€${challenge.reward.amount.toLocaleString("tr-TR")}`;
    setFeedback(`✓ ${challenge.title} tamamlandı! ${rewardText}`);
    setTimeout(() => setFeedback(null), 2500);

    // Tüm günler claim edildiyse bonus
    if (updated.every(c => c.claimed)) {
      haptic("success");
      store.addCredits(10);
      setFeedback(`🏆 Haftanın tüm görevleri tamamlandı! +10 bonus kredi!`);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const completedCount = challenges.filter(c => c.claimed).length;
  const allDone = completedCount === 7;

  if (challenges.length === 0) return null;

  return (
    <div className="tm-card p-3 border-purple-500/20 bg-purple-500/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Trophy size={14} className="text-purple-400" />
          <span className="text-xs font-bold">Haftalık Zorluklar</span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {completedCount}/7
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
          style={{ width: `${(completedCount / 7) * 100}%` }}
        />
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="tm-card p-2 text-center text-[11px] font-bold bg-purple-50 border-purple-200 text-purple-800 mb-2">
          {feedback}
        </div>
      )}

      {/* Challenge list */}
      <div className="space-y-1.5">
        {challenges.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border",
                c.claimed ? "bg-emerald-50 border-emerald-200 opacity-60"
                  : c.done ? "bg-amber-50 border-amber-200"
                  : "bg-card border-border"
              )}
            >
              {/* Day badge */}
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                c.claimed ? "bg-emerald-500 text-white"
                  : c.done ? "bg-amber-500 text-white"
                  : "bg-muted text-muted-foreground"
              )}>
                {c.claimed ? <CheckCircle2 size={14} /> : c.day}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold truncate flex items-center gap-1">
                  <Icon size={10} className="text-muted-foreground" />
                  {c.title}
                </div>
                <div className="text-[9px] text-muted-foreground truncate">{c.desc}</div>
              </div>

              {/* Reward */}
              <div className="text-right shrink-0">
                <div className="text-[9px] text-muted-foreground">
                  {c.reward.type === "credits" ? `+${c.reward.amount} kredi`
                    : c.reward.type === "morale" ? `+${c.reward.amount} moral`
                    : c.reward.type === "form" ? `+${c.reward.amount} form`
                    : `+€${(c.reward.amount / 1000000).toFixed(1)}M`}
                </div>
                {c.done && !c.claimed && (
                  <button
                    onClick={() => handleClaim(c.id)}
                    className="tm-tap text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold mt-0.5"
                  >
                    Al
                  </button>
                )}
                {c.claimed && (
                  <CheckCircle2 size={12} className="text-emerald-500 ml-auto" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* All done bonus */}
      {allDone && (
        <div className="mt-2 p-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 text-center">
          <div className="text-[11px] font-bold text-amber-400">🏆 Hafta Tamamlandı! +10 bonus kredi kazanıldı!</div>
        </div>
      )}

      {/* Reset info */}
      <div className="text-[9px] text-muted-foreground text-center mt-2">
        Haftalık reset: Her Pazartesi yenilenir
      </div>
    </div>
  );
}
