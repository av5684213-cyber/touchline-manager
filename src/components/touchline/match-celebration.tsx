"use client";

import { useState, useEffect } from "react";
import { Trophy, X, Sparkles, Coins, TrendingUp, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

/**
 * Maç Sonu Ödül Töreni — gol kutlaması animasyonu.
 * Maç bittiğinde 3 saniyelik full-screen animasyon gösterir.
 * Kazandıysa: trofi + konfeti + kredi ödülü
 * Berabere: alkış + küçük ödül
 * Kaybetti: teşvik mesajı
 */
export function MatchCelebration({
  result,
  homeScore,
  awayScore,
  isHome,
  creditsEarned,
  onClose,
}: {
  result: "win" | "draw" | "loss";
  homeScore: number;
  awayScore: number;
  isHome: boolean;
  creditsEarned: number;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"animating" | "showing">("animating");
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; delay: number; color: string }>>([]);

  useEffect(() => {
    haptic(result === "win" ? "success" : result === "draw" ? "medium" : "error");

    // Konfeti üret — sadece galibiyette
    if (result === "win") {
      const colors = ["#fbbf24", "#10b981", "#0ea5e9", "#8b5cf6", "#ec4899", "#f97316"];
      const pieces = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
      setConfetti(pieces);
    }

    // 2.5 saniye sonra "showing" fazına geç
    const timer = setTimeout(() => setPhase("showing"), 2500);
    return () => clearTimeout(timer);
  }, [result]);

  const config = {
    win: {
      title: "GALİBİYET!",
      color: "from-emerald-600 to-green-700",
      icon: Trophy,
      iconColor: "text-amber-300",
      message: "Tebrikler! Takımın harika oynadı!",
    },
    draw: {
      title: "BERABERLİK",
      color: "from-amber-600 to-orange-700",
      icon: Award,
      iconColor: "text-amber-200",
      message: "Çekişmeli bir maçtı. Bir sonraki sefere!",
    },
    loss: {
      title: "MAĞLUBİYET",
      color: "from-red-700 to-rose-900",
      icon: TrendingUp,
      iconColor: "text-red-300",
      message: "Pes etme! Sonraki maçta daha güçlü döneceksin.",
    },
  };

  const c = config[result];
  const Icon = c.icon;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90">
      {/* Konfeti */}
      {result === "win" && phase === "animating" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confetti.map((piece) => (
            <div
              key={piece.id}
              className="absolute w-2 h-3 rounded-sm"
              style={{
                left: `${piece.x}%`,
                top: "-20px",
                background: piece.color,
                animation: `confettiFall 3s linear ${piece.delay}s forwards`,
              }}
            />
          ))}
          <style>{`
            @keyframes confettiFall {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(110vh) rotate(720deg); opacity: 0.5; }
            }
          `}</style>
        </div>
      )}

      {/* Glow */}
      <div className={cn("absolute inset-0 opacity-30 blur-3xl bg-gradient-to-br", c.color)} />

      {/* Content */}
      <div
        className="relative flex flex-col items-center gap-4 px-6"
        style={{
          animation: phase === "animating" ? "scaleIn 0.5s ease-out" : "none",
        }}
      >
        {/* Icon */}
        <div
          className={cn("w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br", c.color)}
          style={{ animation: result === "win" ? "bounce 0.6s ease-out 0.3s" : "none" }}
        >
          <Icon size={48} className={c.iconColor} />
        </div>

        {/* Title */}
        <h1
          className={cn("text-3xl font-black tracking-tight bg-gradient-to-r bg-clip-text text-transparent", c.color)}
          style={{ animation: "fadeInUp 0.5s ease-out 0.2s both" }}
        >
          {c.title}
        </h1>

        {/* Score */}
        <div className="flex items-center gap-3 text-white" style={{ animation: "fadeInUp 0.5s ease-out 0.4s both" }}>
          <span className="text-2xl font-bold tabular-nums">{homeScore}</span>
          <span className="text-muted-foreground">-</span>
          <span className="text-2xl font-bold tabular-nums">{awayScore}</span>
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground text-center max-w-[260px]" style={{ animation: "fadeInUp 0.5s ease-out 0.6s both" }}>
          {c.message}
        </p>

        {/* Credits earned */}
        {creditsEarned > 0 && phase === "showing" && (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-400/40"
            style={{ animation: "fadeInUp 0.5s ease-out" }}
          >
            <Coins size={16} className="text-amber-300" />
            <span className="text-sm font-bold text-amber-100">+{creditsEarned} kredi</span>
            <Sparkles size={14} className="text-amber-300" />
          </div>
        )}

        {/* Close button */}
        {phase === "showing" && (
          <button
            onClick={() => { haptic("light"); onClose(); }}
            className="tm-tap mt-4 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold"
            style={{ animation: "fadeInUp 0.5s ease-out" }}
          >
            Devam Et
          </button>
        )}

        {/* Skip X */}
        {phase === "animating" && (
          <button
            onClick={() => { haptic("light"); onClose(); }}
            className="absolute top-4 right-4 tm-tap p-2 text-white/50 hover:text-white"
            aria-label="Atla"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes fadeInUp {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
