"use client";

import { useState } from "react";
import { Coins, Package, Sparkles, X, Zap, Crown, Award, ShoppingBag } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { PlayerAvatar, PositionPill, RatingBadge } from "../ui-bits";
import { POSITION_GROUP } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

type PackType = "bronze" | "silver" | "gold" | "platinum";

const PACKS: Record<PackType, {
  name: string;
  price: number;
  icon: typeof Package;
  color: string;
  bgColor: string;
  borderColor: string;
  ovrRange: string;
  desc: string;
}> = {
  bronze: {
    name: "Bronz Paket",
    price: 10,
    icon: Award,
    color: "text-amber-700",
    bgColor: "bg-amber-900/30",
    borderColor: "border-amber-700/50",
    ovrRange: "50-65 OVR",
    desc: "3 oyuncu — genç yetenekler ve yedekler",
  },
  silver: {
    name: "Gümüş Paket",
    price: 25,
    icon: Package,
    color: "text-slate-300",
    bgColor: "bg-slate-700/40",
    borderColor: "border-slate-400/50",
    ovrRange: "60-75 OVR",
    desc: "3 oyuncu — rotation oyuncuları",
  },
  gold: {
    name: "Altın Paket",
    price: 50,
    icon: Crown,
    color: "text-yellow-400",
    bgColor: "bg-yellow-900/30",
    borderColor: "border-yellow-500/50",
    ovrRange: "70-85 OVR",
    desc: "3 oyuncu — ilk 11 kalibresinde",
  },
  platinum: {
    name: "Platin Paket",
    price: 100,
    icon: Sparkles,
    color: "text-cyan-300",
    bgColor: "bg-cyan-900/30",
    borderColor: "border-cyan-400/50",
    ovrRange: "78-92 OVR",
    desc: "3 oyuncu — yıldız oyuncular",
  },
};

export function ShopScreen() {
  const credits = useAppStore((s) => s.credits);
  const buyPlayerPack = useAppStore((s) => s.buyPlayerPack);
  const [opening, setOpening] = useState<PackType | null>(null);
  const [phase, setPhase] = useState<"idle" | "shaking" | "revealing" | "done">("idle");
  const [pulledPlayers, setPulledPlayers] = useState<any[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleBuy = (packType: PackType) => {
    const pack = PACKS[packType];
    if (credits < pack.price) {
      haptic("error");
      setFeedback(`✗ Yetersiz kredi! ${pack.name} için ${pack.price} kredi gerek.`);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    haptic("medium");
    setOpening(packType);
    setPhase("shaking");
    setPulledPlayers([]);
    setRevealIndex(0);

    // Paket açma animasyonu — 2 saniye sallanma
    setTimeout(() => {
      const result = buyPlayerPack(packType);
      if (result.success && result.players) {
        haptic("success");
        setPulledPlayers(result.players);
        setPhase("revealing");
        // İlk oyuncuyu göster
        setTimeout(() => {
          setPhase("done");
          haptic("success");
        }, 2500);
      } else {
        setFeedback(result.reason ?? "Paket açılamadı");
        setOpening(null);
        setPhase("idle");
        setTimeout(() => setFeedback(null), 3000);
      }
    }, 2000);
  };

  const handleClose = () => {
    setOpening(null);
    setPhase("idle");
    setPulledPlayers([]);
    setRevealIndex(0);
  };

  const handleNextReveal = () => {
    haptic("light");
    if (revealIndex < pulledPlayers.length - 1) {
      setRevealIndex(revealIndex + 1);
    } else {
      handleClose();
    }
  };

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      {/* Header */}
      <div className="tm-card p-3 bg-gradient-to-br from-amber-900/20 to-yellow-900/10 border-amber-500/30">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-amber-400" />
            <h1 className="text-base font-bold">Mağaza</h1>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40">
            <Coins size={14} className="text-amber-300" />
            <span className="text-sm font-bold text-amber-100 tabular-nums">{credits}</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Futbolcu paketleri aç, yeni yetenekler keşfet. Paketten çıkan oyuncular serbest ajan listesine eklenir — imzalamak için bütçe gerekir (pay-to-win değil).
        </p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="tm-card p-2.5 text-center text-xs font-bold bg-red-50 border-red-200 text-red-700">
          {feedback}
        </div>
      )}

      {/* Paket grid */}
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(PACKS) as PackType[]).map((type) => {
          const pack = PACKS[type];
          const Icon = pack.icon;
          const canAfford = credits >= pack.price;
          return (
            <button
              key={type}
              onClick={() => handleBuy(type)}
              disabled={!canAfford}
              className={cn(
                "tm-tap relative rounded-xl p-4 flex flex-col items-center gap-2 border-2 transition-all active:scale-[0.97]",
                pack.bgColor,
                pack.borderColor,
                !canAfford && "opacity-50"
              )}
            >
              {/* Glow effect */}
              <div className={cn("absolute inset-0 rounded-xl opacity-20 blur-xl", pack.bgColor)} />

              {/* Pack icon */}
              <div className={cn("relative w-16 h-16 rounded-2xl flex items-center justify-center", pack.bgColor, "border", pack.borderColor)}>
                <Icon size={32} className={pack.color} />
              </div>

              {/* Pack name */}
              <div className={cn("text-sm font-bold", pack.color)}>{pack.name}</div>

              {/* OVR range */}
              <div className="text-[10px] text-muted-foreground font-semibold">{pack.ovrRange}</div>

              {/* Description */}
              <div className="text-[11px] text-muted-foreground text-center leading-tight">{pack.desc}</div>

              {/* Price */}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 mt-1">
                <Coins size={12} className="text-amber-300" />
                <span className="text-xs font-bold text-amber-100 tabular-nums">{pack.price}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info kartı */}
      <div className="tm-card p-3 border-sky-500/20 bg-sky-500/5">
        <div className="flex items-center gap-2 mb-1.5">
          <Zap size={13} className="text-sky-400" />
          <span className="text-[11px] font-bold text-sky-300 uppercase">Nasıl Çalışır?</span>
        </div>
        <ul className="text-[10px] text-muted-foreground space-y-1 leading-relaxed">
          <li>• Her paketten 3 oyuncu çıkar</li>
          <li>• Çıkan oyuncular Serbest Ajan listesine eklenir (%20 indirimli)</li>
          <li>• Oyuncuyu kadroya almak için normal bütçeyle imzalaman gerekir</li>
          <li>• Kredi kazanma: Sezon sonu bonusları, günlük görevler (yakında)</li>
        </ul>
      </div>

      {/* Yakında: Market */}
      <div className="tm-card p-3 border-purple-500/20 bg-purple-500/5">
        <div className="flex items-center gap-2 mb-1">
          <Crown size={13} className="text-purple-400" />
          <span className="text-[11px] font-bold text-purple-300 uppercase">Yakında: Market</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Formalar, kulüp rozetleri ve tema renkleri yakında mağazada. Tamamen kozmetik — oyunu etkilemez.
        </p>
      </div>

      {/* Paket açılış animasyonu */}
      {opening && phase !== "idle" && (
        <PackOpeningAnimation
          packType={opening}
          phase={phase}
          pulledPlayers={pulledPlayers}
          revealIndex={revealIndex}
          onClose={handleClose}
          onNext={handleNextReveal}
        />
      )}
    </div>
  );
}

// ===== Paket Açılış Animasyonu =====
function PackOpeningAnimation({
  packType,
  phase,
  pulledPlayers,
  revealIndex,
  onClose,
  onNext,
}: {
  packType: PackType;
  phase: "shaking" | "revealing" | "done";
  pulledPlayers: any[];
  revealIndex: number;
  onClose: () => void;
  onNext: () => void;
}) {
  const pack = PACKS[packType];
  const Icon = pack.icon;
  const currentPlayer = pulledPlayers[revealIndex];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Background particles */}
      {phase === "shaking" && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={cn("absolute w-1 h-1 rounded-full", pack.color)}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `ping ${1 + Math.random()}s ease-out infinite`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Shaking phase */}
      {phase === "shaking" && (
        <div className="relative flex flex-col items-center gap-4">
          <div
            className={cn("w-32 h-32 rounded-3xl flex items-center justify-center border-4", pack.bgColor, pack.borderColor)}
            style={{
              animation: "shake 0.3s ease-in-out infinite",
            }}
          >
            <Icon size={56} className={pack.color} />
          </div>
          <div className="text-lg font-bold text-white animate-pulse">Paket açılıyor...</div>
          <style jsx>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0) rotate(0deg) scale(1); }
              25% { transform: translateX(-8px) rotate(-3deg) scale(1.02); }
              75% { transform: translateX(8px) rotate(3deg) scale(1.02); }
            }
          `}</style>
        </div>
      )}

      {/* Revealing phase — flash effect */}
      {phase === "revealing" && (
        <div className="relative flex flex-col items-center gap-4">
          <div
            className="absolute inset-0 bg-white"
            style={{ animation: "flash 0.5s ease-out forwards" }}
          />
          <style jsx>{`
            @keyframes flash {
              0% { opacity: 0; }
              50% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Done phase — show pulled players */}
      {phase === "done" && currentPlayer && (
        <div className="relative flex flex-col items-center gap-4 px-6 w-full max-w-sm">
          {/* Glow background */}
          <div className={cn("absolute inset-0 opacity-30 blur-3xl", pack.bgColor)} />

          {/* "Kazandın!" text */}
          <div className="relative text-center mb-2">
            <div className={cn("text-xs font-bold uppercase tracking-wider", pack.color)}>
              {pack.name} — Oyuncu {revealIndex + 1}/{pulledPlayers.length}
            </div>
          </div>

          {/* Player card — flip animation */}
          <div
            className="relative w-full max-w-[280px]"
            style={{ animation: "cardFlip 0.6s ease-out" }}
          >
            <div className={cn("tm-card p-5 border-2", pack.borderColor, pack.bgColor)}>
              {/* Player avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center border-2", pack.borderColor)}>
                  <PlayerAvatar initials={currentPlayer.specificPosition} size={48} />
                </div>

                {/* Name */}
                <div className="text-center">
                  <div className="text-base font-bold text-white">
                    {currentPlayer.firstName} {currentPlayer.lastName}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <PositionPill label={currentPlayer.specificPosition} group={POSITION_GROUP[currentPlayer.specificPosition]} />
                    <span className="text-[10px] text-muted-foreground">{currentPlayer.age} yaş</span>
                  </div>
                </div>

                {/* OVR */}
                <div className={cn("px-4 py-2 rounded-xl border-2", pack.borderColor)}>
                  <div className="text-[11px] text-muted-foreground uppercase font-bold text-center">OVR</div>
                  <div className={cn("text-2xl font-bold tabular-nums text-center", pack.color)}>
                    {currentPlayer.rating}
                  </div>
                </div>

                {/* Key stats */}
                <div className="grid grid-cols-3 gap-2 w-full mt-2">
                  {currentPlayer.specificPosition === "GK" ? (
                    <>
                      <StatBox label="REF" value={currentPlayer.stats?.reflexes ?? currentPlayer.reflexes ?? 50} />
                      <StatBox label="TUT" value={currentPlayer.stats?.handling ?? currentPlayer.goalkeeping ?? 50} />
                      <StatBox label="BIR" value={currentPlayer.stats?.oneOnOnes ?? 50} />
                    </>
                  ) : (
                    <>
                      <StatBox label="HIZ" value={currentPlayer.stats?.pace ?? currentPlayer.speed ?? 50} />
                      <StatBox label="ŞUT" value={currentPlayer.stats?.shooting ?? currentPlayer.shooting ?? 50} />
                      <StatBox label="PAS" value={currentPlayer.stats?.passing ?? currentPlayer.passing ?? 50} />
                    </>
                  )}
                </div>

                {/* Market value */}
                <div className="text-[10px] text-muted-foreground mt-2">
                  Piyasa Değeri: €{(currentPlayer.marketValue ?? currentPlayer.market_value ?? 500000).toLocaleString("tr-TR")}
                </div>
              </div>
            </div>
          </div>

          {/* Next button */}
          <button
            onClick={onNext}
            className="tm-tap px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold active:scale-[0.98] transition-transform"
          >
            {revealIndex < pulledPlayers.length - 1 ? "Sonraki Oyuncu →" : "Tamamla ✓"}
          </button>

          <style jsx>{`
            @keyframes cardFlip {
              0% { transform: rotateY(90deg) scale(0.5); opacity: 0; }
              100% { transform: rotateY(0deg) scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Skip button */}
      {phase === "shaking" && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 tm-tap p-2 text-white/60 hover:text-white"
          aria-label="Kapat"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "text-emerald-400" : value >= 65 ? "text-yellow-400" : "text-orange-400";
  return (
    <div className="bg-muted/30 rounded p-1.5 text-center">
      <div className="text-[11px] text-muted-foreground uppercase font-bold">{label}</div>
      <div className={cn("text-sm font-bold tabular-nums", color)}>{Math.round(value)}</div>
    </div>
  );
}
