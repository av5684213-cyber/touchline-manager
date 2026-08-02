"use client";

import { useState, useEffect } from "react";
import { Trophy, X, Sparkles, Coins, TrendingUp, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic, useBodyScrollLock, useEscapeToClose } from "@/hooks/touchline";
import { useAppStore } from "@/lib/store"; // v2.9.34 F2: addPendingGain

/**
 * Maç Sonu Ödül Töreni — gol kutlaması animasyonu.
 * Maç bittiğinde 3 saniyelik full-screen animasyon gösterir.
 * Kazandıysa: trofi + konfeti + kredi ödülü
 * Berabere: alkış + küçük ödül
 * Kaybetti: teşvik mesajı
 *
 * v2.9.23 Z1: Gelişen oyuncuları da gösterir (Pas +1 yeşil)
 * v2.9.67 FIX: Her zaman "Devam Et" butonu görünür (kullanıcı çıkamıyordu)
 * v2.9.67 FIX: Gelişim seviyeleri maçtan gelen events'ten hesaplanır (Math.random değil)
 */
export function MatchCelebration({
  result,
  homeScore,
  awayScore,
  isHome,
  creditsEarned,
  events,
  homeTeam,
  awayTeam,
  onClose,
}: {
  result: "win" | "draw" | "loss";
  homeScore: number;
  awayScore: number;
  isHome: boolean;
  creditsEarned: number;
  events?: any[];
  homeTeam?: any;
  awayTeam?: any;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"animating" | "showing">("animating");
  // P0 FIX BUG #17: Escape + scroll lock
  useEscapeToClose(onClose);
  useBodyScrollLock(true);
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

    // v2.9.67 FIX: setTimeout'u güvenli hale getir — hata olursa bile "showing" fazına geç
    const timer = setTimeout(() => {
      try {
        setPhase("showing");
      } catch (e) {
        console.warn("[match-celebration] phase set error:", e);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [result]);

  // v2.9.67 FIX: Phase güvenlik ağı — 5 sn sonra phase ne olursa olsun "showing" yap
  // Eğer setTimeout çalışmazsa bile kullanıcı buton görsün
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (phase !== "showing") {
        setPhase("showing");
      }
    }, 5000);
    return () => clearTimeout(safetyTimer);
  }, [phase]);

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

  // v2.9.67 FIX: Gelişim seviyelerini events'ten hesapla (Math.random değil)
  // Maç events'inden oyuncu performansını çıkar → stat artışı hesapla
  const playerImprovements = (() => {
    const myTeam = isHome ? homeTeam : awayTeam;
    if (!myTeam?.players) return [];

    // Events'ten oyuncu bazlı performans topla
    const perfMap = new Map<string, { goals: number; assists: number; saves: number; shots: number; tackles: number; passes: number; rating: number }>();

    if (events && events.length > 0) {
      for (const ev of events) {
        const pid = ev.playerId ?? ev.player_id;
        if (!pid) continue;
        // Sadece benim takımımın oyuncuları
        if (!myTeam.players.find((p: any) => p.id === pid)) continue;

        if (!perfMap.has(pid)) {
          perfMap.set(pid, { goals: 0, assists: 0, saves: 0, shots: 0, tackles: 0, passes: 0, rating: 0 });
        }
        const perf = perfMap.get(pid)!;

        switch (ev.type) {
          case "goal": case "GOAL": perf.goals++; perf.shots++; break;
          case "assist": perf.assists++; break;
          case "save": case "SAVE": case "shot_saved": perf.saves++; break;
          case "shot_wide": case "shot_post": perf.shots++; break;
          case "tackle": perf.tackles++; break;
          case "chance": perf.passes++; break;
          case "interception": perf.tackles++; break;
        }
      }
    }

    // Performans'a göre stat artışı hesapla
    const statMap: Record<string, string> = {
      "Pas": "passing", "Şut": "shooting", "Defans": "defending",
      "Hız": "speed", "Güç": "power", "Dribling": "dribbling",
    };

    const improvements: Array<{ player: any; stat: string; gain: number }> = [];

    for (const [pid, perf] of perfMap.entries()) {
      const player = myTeam.players.find((p: any) => p.id === pid);
      if (!player) continue;

      // Gol atan → Şut +1 veya +2
      if (perf.goals > 0) {
        const gain = perf.goals >= 2 ? 2 : 1;
        improvements.push({ player, stat: "Şut", gain });
      }
      // Asist yapan → Pas +1
      if (perf.assists > 0) {
        improvements.push({ player, stat: "Pas", gain: 1 });
      }
      // Kurtarış yapan → Defans +1
      if (perf.saves >= 2) {
        improvements.push({ player, stat: "Defans", gain: 1 });
      }
      // Çok tackle yapan → Defans +1
      if (perf.tackles >= 3) {
        improvements.push({ player, stat: "Defans", gain: 1 });
      }
      // Şut çeken ama gol atamayan → Şut +1 (en az 2 şut)
      if (perf.shots >= 2 && perf.goals === 0) {
        improvements.push({ player, stat: "Şut", gain: 1 });
      }
    }

    // Eğer events'ten hiç gelişim çıkmadıysa, en iyi 3 oyuncuya küçük gelişim ver
    if (improvements.length === 0) {
      const top3 = [...myTeam.players]
        .filter((p: any) => !p.is_injured)
        .sort((a: any, b: any) => b.rating - a.rating)
        .slice(0, 3);
      for (const p of top3) {
        const statTr = statMap["Pas"]; // Pas +1 (her oyuncuya)
        const gain = 1;
        try {
          useAppStore.getState().addPendingGain(p.id, statTr, gain);
        } catch (e) { /* store yoksa sessiz geç */ }
        improvements.push({ player: p, stat: "Pas", gain });
      }
    } else {
      // Events'ten gelen gelişimleri store'a yaz
      for (const imp of improvements) {
        try {
          useAppStore.getState().addPendingGain(imp.player.id, statMap[imp.stat] ?? "passing", imp.gain);
        } catch (e) { /* store yoksa sessiz geç */ }
      }
    }

    return improvements.slice(0, 8); // Maksimum 8 oyuncu göster
  })();

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90">
      {/* v2.9.67 FIX: Arka plana tıklayınca da kapan */}
      <div className="absolute inset-0" onClick={() => { haptic("light"); onClose(); }} />

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
        className="relative flex flex-col items-center gap-4 px-6 max-h-[90vh] overflow-y-auto tm-thin-scrollbar"
        style={{
          animation: phase === "animating" ? "scaleIn 0.5s ease-out" : "none",
        }}
        onClick={(e) => e.stopPropagation()} // Arka plan tıklamasını engelle
      >
        {/* v2.9.67 FIX: X butonu HER ZAMAN görünür (animating + showing) */}
        <button
          onClick={() => { haptic("light"); onClose(); }}
          className="absolute top-4 right-4 tm-tap p-2 text-white/70 hover:text-white z-10"
          aria-label="Kapat"
        >
          <X size={20} />
        </button>

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
        {creditsEarned > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-400/40"
            style={{ animation: "fadeInUp 0.5s ease-out" }}
          >
            <Coins size={16} className="text-amber-300" />
            <span className="text-sm font-bold text-amber-100">+{creditsEarned} kredi</span>
            <Sparkles size={14} className="text-amber-300" />
          </div>
        )}

        {/* v2.9.67 FIX: Oyuncu gelişim seviyeleri — events'ten hesaplanır */}
        {playerImprovements.length > 0 && (
          <div className="w-full max-w-[300px] mt-2" style={{ animation: "fadeInUp 0.5s ease-out 0.8s both" }}>
            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5 text-center">📈 Oyuncu Gelişimi</div>
            <div className="space-y-1">
              {playerImprovements.map((imp, i) => (
                <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-xs font-semibold truncate flex-1">
                    {imp.player.firstName} {imp.player.lastName}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-bold whitespace-nowrap">
                    {imp.stat} +{imp.gain}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* v2.9.67 FIX: "Devam Et" butonu HER ZAMAN görünür */}
        <button
          onClick={() => { haptic("light"); onClose(); }}
          className="tm-tap mt-4 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold"
        >
          Devam Et
        </button>
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
