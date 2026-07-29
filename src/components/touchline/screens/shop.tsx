"use client";

import { useState, useMemo } from "react";
import { Coins, Package, Sparkles, X, Zap, Crown, Award, ShoppingBag, Layers, Wand2, Archive } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { PlayerAvatar, PositionPill, RatingBadge } from "../ui-bits";
import { POSITION_GROUP } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
// v2.9.28 GÖREV 1: Kart sistemi
import {
  getAllShopCards,
  getCardsByType,
  getRarityColor,
  getRarityLabel,
  getLevelColor,
  getLevelLabel,
  getGroupLabel,
  type ShopCard,
  type CardType,
} from "@/lib/card-system";
import { CardInventoryView } from "../card-inventory-view";
import { CardApplyModal } from "../card-apply-modal";

type PackType = "bronze" | "silver" | "gold" | "platinum";
type ShopTab = "packs" | "cards" | "inventory";

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
  const buyCard = useAppStore((s) => s.buyCard);
  const [tab, setTab] = useState<ShopTab>("packs");
  const [opening, setOpening] = useState<PackType | null>(null);
  const [phase, setPhase] = useState<"idle" | "shaking" | "revealing" | "done">("idle");
  const [pulledPlayers, setPulledPlayers] = useState<any[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  // v2.9.28 GÖREV 4: Kart basma modal'ı
  const [applyCard, setApplyCard] = useState<ShopCard | null>(null);

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

    setTimeout(() => {
      const result = buyPlayerPack(packType);
      if (result.success && result.players) {
        haptic("success");
        setPulledPlayers(result.players);
        setPhase("revealing");
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

  // v2.9.28 GÖREV 1: Kart satın alma
  const handleBuyCard = (card: ShopCard) => {
    if (credits < card.price) {
      haptic("error");
      setFeedback(`✗ Yetersiz kredi! ${card.cardName} için ${card.price} kredi gerek.`);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    const result = buyCard(
      card.cardId,
      card.cardType,
      card.cardName,
      card.groupName,
      card.price,
      card.description,
      card.effectData
    );
    if (result.success) {
      haptic("success");
      setFeedback(`✓ ${card.cardName} satın alındı! Envanterine eklendi.`);
      setTimeout(() => setFeedback(null), 2500);
    } else {
      haptic("error");
      setFeedback(`✗ ${result.reason ?? "Satın alma başarısız"}`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
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
          Futbolcu paketleri aç, kartlar satın al. Kartlarla oyuncularına trait/arketip ekle veya negatif özelliklerini gider.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1.5">
        <button
          onClick={() => { haptic("light"); setTab("packs"); }}
          className={cn(
            "tm-tap flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
            tab === "packs" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          )}
        >
          <Package size={14} />
          Paketler
        </button>
        <button
          onClick={() => { haptic("light"); setTab("cards"); }}
          className={cn(
            "tm-tap flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
            tab === "cards" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          )}
        >
          <Layers size={14} />
          Kartlar
        </button>
        <button
          onClick={() => { haptic("light"); setTab("inventory"); }}
          className={cn(
            "tm-tap flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
            tab === "inventory" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          )}
        >
          <Archive size={14} />
          Envanterim
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="tm-card p-2.5 text-center text-xs font-bold bg-red-50 border-red-200 text-red-700">
          {feedback}
        </div>
      )}

      {/* ===== PAKETLER TAB ===== */}
      {tab === "packs" && (
        <>
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
                  <div className={cn("absolute inset-0 rounded-xl opacity-20 blur-xl", pack.bgColor)} />
                  <div className={cn("relative w-16 h-16 rounded-2xl flex items-center justify-center", pack.bgColor, "border", pack.borderColor)}>
                    <Icon size={32} className={pack.color} />
                  </div>
                  <div className={cn("text-sm font-bold", pack.color)}>{pack.name}</div>
                  <div className="text-[10px] text-muted-foreground font-semibold">{pack.ovrRange}</div>
                  <div className="text-[11px] text-muted-foreground text-center leading-tight">{pack.desc}</div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 mt-1">
                    <Coins size={12} className="text-amber-300" />
                    <span className="text-xs font-bold text-amber-100 tabular-nums">{pack.price}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="tm-card p-3 border-sky-500/20 bg-sky-500/5">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap size={13} className="text-sky-400" />
              <span className="text-[11px] font-bold text-sky-300 uppercase">Nasıl Çalışır?</span>
            </div>
            <ul className="text-[10px] text-muted-foreground space-y-1 leading-relaxed">
              <li>• Her paketten 3 oyuncu çıkar (17 yaşında genç yetenekler)</li>
              <li>• Çıkan oyuncular doğrudan kadroya eklenir</li>
              <li>• Kredi kazanma: Sezon sonu bonusları, günlük görevler</li>
            </ul>
          </div>
        </>
      )}

      {/* ===== KARTLAR TAB ===== */}
      {tab === "cards" && (
        <CardsTab onBuyCard={handleBuyCard} onApplyCard={(card) => setApplyCard(card)} />
      )}

      {/* ===== ENVANTERİM TAB ===== */}
      {tab === "inventory" && (
        <CardInventoryView onApplyCard={(card) => setApplyCard(card)} />
      )}

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

      {/* v2.9.28 GÖREV 4: Kart basma modal'ı */}
      {applyCard && (
        <CardApplyModal
          card={applyCard}
          onClose={() => setApplyCard(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// GÖREV 1: Kartlar Tab — pozitif trait / negatif giderme / arketip kartları
// ============================================================================

function CardsTab({
  onBuyCard,
  onApplyCard,
}: {
  onBuyCard: (card: ShopCard) => void;
  onApplyCard: (card: ShopCard) => void;
}) {
  const [cardFilter, setCardFilter] = useState<CardType | "all">("all");
  const credits = useAppStore((s) => s.credits);
  const cardInventory = useAppStore((s) => s.cardInventory);

  const allCards = useMemo(() => getAllShopCards(), []);
  const filteredCards = useMemo(() => {
    if (cardFilter === "all") return allCards;
    return allCards.filter(c => c.cardType === cardFilter);
  }, [allCards, cardFilter]);

  const filterLabels: Record<string, { label: string; icon: typeof Layers }> = {
    all: { label: "Tümü", icon: Layers },
    trait_positive: { label: "Pozitif Trait", icon: Wand2 },
    trait_negative_removal: { label: "Giderme", icon: X },
    arketip: { label: "Arketip", icon: Crown },
  };

  return (
    <div className="space-y-3">
      {/* Filtre */}
      <div className="flex gap-1.5 overflow-x-auto tm-no-scrollbar">
        {(Object.keys(filterLabels) as (CardType | "all")[]).map((key) => {
          const item = filterLabels[key];
          const Icon = item.icon;
          return (
            <button
              key={key}
              onClick={() => { haptic("light"); setCardFilter(key); }}
              className={cn(
                "tm-tap px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border flex items-center gap-1",
                cardFilter === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground"
              )}
            >
              <Icon size={11} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Kart listesi */}
      <div className="grid grid-cols-2 gap-2">
        {filteredCards.map((card) => {
          const owned = cardInventory.find(c => c.cardId === card.cardId)?.quantity ?? 0;
          const canAfford = credits >= card.price;
          return (
            <div
              key={card.cardId}
              className={cn(
                "tm-tap relative rounded-xl p-3 flex flex-col gap-1.5 border-2 transition-all",
                getRarityColor(card.rarity)
              )}
            >
              {/* Owned badge */}
              {owned > 0 && (
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-[9px] font-bold">
                  ×{owned}
                </div>
              )}

              {/* Card type icon */}
              <div className="flex items-center gap-1.5">
                {card.cardType === "trait_positive" && <Wand2 size={12} className="text-emerald-400" />}
                {card.cardType === "trait_negative_removal" && <X size={12} className="text-red-400" />}
                {card.cardType === "arketip" && <Crown size={12} className="text-amber-400" />}
                <span className="text-[9px] text-muted-foreground uppercase font-bold">
                  {getRarityLabel(card.rarity)}
                </span>
              </div>

              {/* Card name */}
              <div className="text-xs font-bold leading-tight">{card.cardName}</div>

              {/* Level (pozitif traitler için) */}
              {card.level && (
                <div className={cn("text-[9px] font-bold", getLevelColor(card.level))}>
                  {getLevelLabel(card.level)}
                </div>
              )}

              {/* Group */}
              <div className="text-[9px] text-muted-foreground">{getGroupLabel(card.groupName)}</div>

              {/* Description */}
              <div className="text-[9px] text-muted-foreground leading-tight line-clamp-2 flex-1">
                {card.description}
              </div>

              {/* Price + Buy */}
              <button
                onClick={() => onBuyCard(card)}
                disabled={!canAfford}
                className={cn(
                  "tm-tap w-full flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold transition-colors",
                  canAfford
                    ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                    : "bg-muted/30 text-muted-foreground/50"
                )}
              >
                <Coins size={10} />
                {card.price}
              </button>
            </div>
          );
        })}
      </div>

      {/* Bilgi notu */}
      <div className="tm-card p-3 border-purple-500/20 bg-purple-500/5">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={13} className="text-purple-400" />
          <span className="text-[11px] font-bold text-purple-300 uppercase">Kart Nasıl Çalışır?</span>
        </div>
        <ul className="text-[10px] text-muted-foreground space-y-1 leading-relaxed">
          <li>• <strong className="text-foreground">Pozitif Trait:</strong> Oyuncuya yeni özellik ekler (maç motorunu etkiler)</li>
          <li>• <strong className="text-foreground">Giderme Kartı:</strong> Negatif trait'i kaldırır, penaltıyı geri alır</li>
          <li>• <strong className="text-foreground">Arketip Kartı:</strong> Oyuncunun arketipini değiştirir</li>
          <li>• Satın aldığın kartlar <strong className="text-foreground">Envanterim</strong>'de birikir</li>
          <li>• Kartı oyuncuya uygulamak için oyuncu profilinde <strong className="text-foreground">"Kart Bas"</strong> butonunu kullan</li>
        </ul>
      </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      {phase === "shaking" && (
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn("w-32 h-32 rounded-3xl flex items-center justify-center border-4", pack.bgColor, pack.borderColor)}
            style={{ animation: "shake 0.3s ease-in-out infinite" }}
          >
            <Icon size={64} className={pack.color} />
          </div>
          <div className="text-white text-sm font-bold">Paket açılıyor...</div>
          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0) rotate(0deg); }
              25% { transform: translateX(-8px) rotate(-3deg); }
              75% { transform: translateX(8px) rotate(3deg); }
            }
          `}</style>
        </div>
      )}

      {phase === "revealing" && currentPlayer && (
        <div className="flex flex-col items-center gap-4 max-w-[320px] w-full">
          <div className="text-white/60 text-xs">Oyuncu {revealIndex + 1} / {pulledPlayers.length}</div>
          <div
            className="w-full tm-card p-6 flex flex-col items-center gap-3"
            style={{ animation: "scaleIn 0.5s ease-out" }}
          >
            <PlayerAvatar initials={currentPlayer.specificPosition} color="#1a3a2a" size={64} />
            <div className="text-center">
              <div className="text-base font-bold">{currentPlayer.firstName} {currentPlayer.lastName}</div>
              <div className="text-xs text-muted-foreground">{currentPlayer.specificPosition} · {currentPlayer.age} yaş</div>
            </div>
            <RatingBadge value={currentPlayer.rating} />
            <div className="flex gap-2">
              <PositionPill label={currentPlayer.specificPosition} group={POSITION_GROUP[currentPlayer.specificPosition]} />
            </div>
            {currentPlayer.archetype && (
              <div className="text-[10px] text-purple-400 font-bold">{currentPlayer.archetype}</div>
            )}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col items-center gap-4 max-w-[320px] w-full">
          <Crown size={48} className="text-amber-400" />
          <div className="text-white text-sm font-bold">Paket Açıldı!</div>
          <div className="text-white/60 text-xs text-center">
            {pulledPlayers.length} oyuncu kadroya eklendi
          </div>
          <button
            onClick={onClose}
            className="tm-tap px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold"
          >
            Tamam
          </button>
        </div>
      )}

      {phase === "revealing" && (
        <button
          onClick={onNext}
          className="absolute bottom-8 tm-tap px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold"
        >
          {revealIndex < pulledPlayers.length - 1 ? "Sonraki" : "Tamam"}
        </button>
      )}

      {(phase === "shaking" || phase === "revealing") && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 tm-tap p-2 text-white/50 hover:text-white"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}
