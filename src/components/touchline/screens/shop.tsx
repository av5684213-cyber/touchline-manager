"use client";

import { useState, useMemo, useEffect } from "react";
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
// v2.9.46 Görev 1: Kozmetik Market
import {
  fetchCosmeticsCatalog,
  COSMETIC_CATEGORY_META,
  RARITY_COLORS,
  RARITY_LABELS,
  SEED_COSMETICS,
  type CosmeticItem,
  type CosmeticCategory,
} from "@/lib/cosmetics";
// v2.9.46 Görev 2: Google Play Billing
import {
  CREDIT_PACKS,
  isBillingAvailable,
  launchPurchaseFlow,
  acknowledgePurchase,
  type CreditPack,
} from "@/lib/billing/bridge";
import { useI18n } from "@/lib/i18n/locale-provider";

type PackType = "bronze" | "silver" | "gold" | "platinum";
type ShopTab = "packs" | "cards" | "market" | "credits" | "inventory";

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
      <div className="flex gap-1.5 overflow-x-auto tm-no-scrollbar">
        <button
          onClick={() => { haptic("light"); setTab("packs"); }}
          className={cn(
            "tm-tap flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
            tab === "packs" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          )}
        >
          <Package size={14} />
          Paketler
        </button>
        <button
          onClick={() => { haptic("light"); setTab("cards"); }}
          className={cn(
            "tm-tap flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
            tab === "cards" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          )}
        >
          <Layers size={14} />
          Kartlar
        </button>
        <button
          onClick={() => { haptic("light"); setTab("market"); }}
          className={cn(
            "tm-tap flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
            tab === "market" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          )}
        >
          <ShoppingBag size={14} />
          Market
        </button>
        <button
          onClick={() => { haptic("light"); setTab("credits"); }}
          className={cn(
            "tm-tap flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
            tab === "credits" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          )}
        >
          <Coins size={14} />
          Kredi
        </button>
        <button
          onClick={() => { haptic("light"); setTab("inventory"); }}
          className={cn(
            "tm-tap flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
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

      {/* ===== KOZMETİK MARKET TAB (v2.9.46 Görev 1) ===== */}
      {tab === "market" && (
        <CosmeticMarketTab
          onFeedback={(msg) => { setFeedback(msg); setTimeout(() => setFeedback(null), 3000); }}
        />
      )}

      {/* ===== KREDİ SATIN AL TAB (v2.9.46 Görev 2) ===== */}
      {tab === "credits" && (
        <CreditsPurchaseTab
          onFeedback={(msg) => { setFeedback(msg); setTimeout(() => setFeedback(null), 3000); }}
        />
      )}

      {/* ===== ENVANTERİM TAB ===== */}
      {tab === "inventory" && (
        <>
          <CardInventoryView onApplyCard={(card) => setApplyCard(card)} />
          <CosmeticInventoryView />
        </>
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

// ============================================================================
// v2.9.46 Görev 1: Kozmetik Market Tab — forma, rozet, tema, stadyum, top
// ============================================================================

function CosmeticMarketTab({ onFeedback }: { onFeedback: (msg: string) => void }) {
  const { locale } = useI18n();
  const credits = useAppStore((s) => s.credits);
  const buyCosmetic = useAppStore((s) => s.buyCosmetic);
  const equipCosmetic = useAppStore((s) => s.equipCosmetic);
  const cosmeticsOwned = useAppStore((s) => s.cosmetics.owned);
  const cosmeticsEquipped = useAppStore((s) => s.cosmetics.equipped);

  const [catalog, setCatalog] = useState<CosmeticItem[]>(SEED_COSMETICS);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CosmeticCategory | "all">("all");

  // Kataloğu yükle (Supabase bağlıysa oradan, değilse seed)
  useEffect(() => {
    let mounted = true;
    fetchCosmeticsCatalog().then(items => {
      if (mounted) {
        setCatalog(items);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const filteredCatalog = selectedCategory === "all"
    ? catalog
    : catalog.filter(c => c.category === selectedCategory);

  const handleBuy = (item: CosmeticItem) => {
    haptic("medium");
    const result = buyCosmetic(item.id, item.creditPrice);
    if (result.success) {
      haptic("success");
      onFeedback(`✓ ${locale === "tr" ? item.nameTr : item.nameEn} satın alındı!`);
      // Satın alınınca otomatik giy
      equipCosmetic(item.category, item.id);
    } else {
      haptic("error");
      onFeedback(`✗ ${result.reason ?? "Satın alma başarısız"}`);
    }
  };

  const handleEquip = (item: CosmeticItem) => {
    haptic("light");
    equipCosmetic(item.category, item.id);
    onFeedback(`✓ ${locale === "tr" ? item.nameTr : item.nameEn} giyildi`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const categories: Array<CosmeticCategory | "all"> = ["all", "kit", "badge", "theme", "stadium", "ball"];

  return (
    <div className="space-y-3">
      {/* Bilgi kartı */}
      <div className="tm-card p-3 border-purple-500/20 bg-purple-500/5">
        <div className="flex items-center gap-2 mb-1.5">
          <ShoppingBag size={13} className="text-purple-400" />
          <span className="text-[11px] font-bold text-purple-300 uppercase">Kozmetik Market</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Forma, rozet, tema, stadyum ve top kozmetiklerini kredi ile satın al. Satın aldığın kozmetikler kalıcıdır ve envanterinde birikir.
        </p>
      </div>

      {/* Kategori filtre */}
      <div className="flex gap-1.5 overflow-x-auto tm-no-scrollbar">
        {categories.map(cat => {
          const meta = cat === "all" ? null : COSMETIC_CATEGORY_META[cat];
          const label = cat === "all"
            ? (locale === "tr" ? "Tümü" : "All")
            : (locale === "tr" ? meta!.labelTr : meta!.labelEn);
          return (
            <button
              key={cat}
              onClick={() => { haptic("light"); setSelectedCategory(cat); }}
              className={cn(
                "tm-tap px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border flex items-center gap-1",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground"
              )}
            >
              {meta && <span>{meta.icon}</span>}
              {label}
            </button>
          );
        })}
      </div>

      {/* Katalog grid */}
      <div className="grid grid-cols-2 gap-2">
        {filteredCatalog.map(item => {
          const meta = COSMETIC_CATEGORY_META[item.category];
          const owned = cosmeticsOwned.includes(item.id);
          const equipped = cosmeticsEquipped[item.category] === item.id;
          const canAfford = credits >= item.creditPrice;
          const name = locale === "tr" ? item.nameTr : item.nameEn;
          const rarityLabel = locale === "tr"
            ? RARITY_LABELS[item.rarity].tr
            : RARITY_LABELS[item.rarity].en;

          return (
            <div
              key={item.id}
              className={cn(
                "tm-tap relative rounded-xl p-3 flex flex-col gap-1.5 border-2 transition-all",
                RARITY_COLORS[item.rarity],
                equipped && "ring-2 ring-emerald-400"
              )}
            >
              {/* Owned/Equipped badge */}
              {equipped && (
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-[9px] font-bold">
                  ✓ Giyili
                </div>
              )}
              {!equipped && owned && (
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-sky-500/30 text-sky-300 text-[9px] font-bold">
                  Sahip
                </div>
              )}

              {/* İkon */}
              <div className="flex items-center gap-1.5">
                <span className="text-2xl">{meta.icon}</span>
                <span className={cn("text-[9px] uppercase font-bold", `text-${item.rarity === "legendary" ? "amber" : item.rarity === "epic" ? "purple" : item.rarity === "rare" ? "sky" : "slate"}-400`)}>
                  {rarityLabel}
                </span>
              </div>

              {/* İsim */}
              <div className="text-xs font-bold leading-tight">{name}</div>

              {/* Açıklama */}
              <div className="text-[9px] text-muted-foreground leading-tight line-clamp-2 flex-1">
                {locale === "tr" ? (item.descTr ?? meta.descTr) : (item.descEn ?? meta.descEn)}
              </div>

              {/* Fiyat + Aksiyon */}
              {owned ? (
                <button
                  onClick={() => handleEquip(item)}
                  disabled={equipped}
                  className={cn(
                    "tm-tap w-full flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold transition-colors",
                    equipped
                      ? "bg-emerald-500/20 text-emerald-300 cursor-default"
                      : "bg-sky-500/20 text-sky-300 border border-sky-400/40"
                  )}
                >
                  {equipped ? "✓ Giyili" : "Giy"}
                </button>
              ) : (
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford}
                  className={cn(
                    "tm-tap w-full flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold transition-colors",
                    canAfford
                      ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                      : "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                  )}
                >
                  <Coins size={10} />
                  {item.creditPrice}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filteredCatalog.length === 0 && (
        <div className="tm-card p-6 text-center text-xs text-muted-foreground">
          Bu kategoride kozmetik yok.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Kozmetik Envanter Görünümü — sahip olunan + giyili kozmetikler
// ============================================================================

function CosmeticInventoryView() {
  const { locale } = useI18n();
  const cosmeticsOwned = useAppStore((s) => s.cosmetics.owned);
  const cosmeticsEquipped = useAppStore((s) => s.cosmetics.equipped);
  const equipCosmetic = useAppStore((s) => s.equipCosmetic);
  const unequipCosmetic = useAppStore((s) => s.unequipCosmetic);

  // Sahip olunan kozmetikleri katalogdan bul
  const ownedItems = SEED_COSMETICS.filter(c => cosmeticsOwned.includes(c.id));

  if (ownedItems.length === 0) {
    return null; // kozmetik yoksa bölümü gizle
  }

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
        🎨 Kozmetiklerim ({ownedItems.length})
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ownedItems.map(item => {
          const meta = COSMETIC_CATEGORY_META[item.category];
          const equipped = cosmeticsEquipped[item.category] === item.id;
          const name = locale === "tr" ? item.nameTr : item.nameEn;
          return (
            <div
              key={item.id}
              className={cn(
                "tm-card p-2 flex items-center gap-2",
                equipped && "ring-2 ring-emerald-400"
              )}
            >
              <span className="text-xl shrink-0">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold truncate">{name}</div>
                <div className="text-[9px] text-muted-foreground">{meta.labelTr}</div>
              </div>
              <button
                onClick={() => {
                  haptic("light");
                  if (equipped) {
                    unequipCosmetic(item.category);
                  } else {
                    equipCosmetic(item.category, item.id);
                  }
                }}
                className={cn(
                  "tm-tap px-2 py-1 rounded text-[9px] font-bold",
                  equipped
                    ? "bg-red-500/20 text-red-400 border border-red-400/40"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                )}
              >
                {equipped ? "Çıkar" : "Giy"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// v2.9.46 Görev 2: Kredi Satın Al Tab — Google Play Billing
// ============================================================================

function CreditsPurchaseTab({ onFeedback }: { onFeedback: (msg: string) => void }) {
  const credits = useAppStore((s) => s.credits);
  const addCredits = useAppStore((s) => s.addCredits);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const billingAvailable = isBillingAvailable();

  const formatPrice = (cents: number): string => {
    // sent → TL (basit dönüşüm, gerçek fiyat Google Play'den gelir)
    const tryAmount = (cents / 100) * 33; // ~$1 = 33 TL
    return `${tryAmount.toFixed(2)} ₺`;
  };

  const handlePurchase = async (pack: CreditPack) => {
    haptic("medium");
    setPurchasing(pack.sku);
    try {
      // 1. Google Play Billing ile satın alma akışı başlat
      const result = await launchPurchaseFlow(pack.sku);
      if (!result.success) {
        haptic("error");
        onFeedback(`✗ ${result.reason ?? "Satın alma başarısız"}`);
        return;
      }

      // 2. Satın almayı onayla (Google Play gereği)
      if (result.purchase?.purchaseToken) {
        await acknowledgePurchase(result.purchase.purchaseToken);
      }

      // 3. Kredileri kullanıcıya ekle
      const totalCredits = pack.credits + pack.bonusCredits;
      addCredits(totalCredits);
      haptic("success");
      onFeedback(`✓ ${totalCredits} kredi eklendi!${pack.bonusCredits > 0 ? ` (${pack.bonusCredits} bonus)` : ""}`);

      // TODO: Server-side receipt verification (Supabase Edge Function)
      // — result.purchase.purchaseToken'ı server'a gönder, Google Play API ile doğrula
      // — Bu, sahte satın almaları önler (root'lu cihazlarda)
    } catch (e: any) {
      haptic("error");
      onFeedback(`✗ Satın alma hatası: ${e?.message ?? "bilinmeyen"}`);
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Bilgi kartı */}
      <div className="tm-card p-3 bg-gradient-to-br from-amber-900/20 to-yellow-900/10 border-amber-500/30">
        <div className="flex items-center gap-2 mb-1.5">
          <Coins size={13} className="text-amber-400" />
          <span className="text-[11px] font-bold text-amber-300 uppercase">Kredi Satın Al</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Kredilerle futbolcu paketi aç, kart satın al, kozmetik marketten eşya al. Bonus kredili paketler daha avantajlı!
        </p>
      </div>

      {/* Billing durumu uyarısı */}
      {!billingAvailable && (
        <div className="tm-card p-3 text-center text-[10px] text-amber-400 bg-amber-500/10 border-amber-500/30">
          ⚠️ Geliştirici Modu — gerçek para ile satın alma devre dışı. Android APK'da Google Play Billing aktif olur. Test için "satın alma" simülasyonu çalışır.
        </div>
      )}

      {/* Kredi paketleri grid */}
      <div className="grid grid-cols-2 gap-2">
        {CREDIT_PACKS.map(pack => {
          const totalCredits = pack.credits + pack.bonusCredits;
          const isPurchasing = purchasing === pack.sku;
          return (
            <button
              key={pack.sku}
              onClick={() => handlePurchase(pack)}
              disabled={isPurchasing}
              className={cn(
                "tm-tap relative rounded-xl p-3 flex flex-col items-center gap-1.5 border-2 transition-all active:scale-[0.97]",
                pack.bestValue
                  ? "border-amber-400 bg-amber-900/30"
                  : pack.popular
                    ? "border-sky-400 bg-sky-900/30"
                    : "border-border bg-card"
              )}
            >
              {/* Rozetler */}
              {pack.popular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-sky-500 text-white text-[9px] font-bold">
                  Popüler
                </div>
              )}
              {pack.bestValue && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-500 text-amber-900 text-[9px] font-bold">
                  En Avantajlı
                </div>
              )}

              {/* Kredi miktarı */}
              <Coins size={24} className={cn(
                "mt-1",
                pack.bestValue ? "text-amber-400" : pack.popular ? "text-sky-400" : "text-muted-foreground"
              )} />
              <div className="text-lg font-bold tabular-nums">
                {totalCredits.toLocaleString("tr-TR")}
              </div>
              <div className="text-[9px] text-muted-foreground">kredi</div>

              {/* Bonus rozet */}
              {pack.bonusCredits > 0 && (
                <div className="text-[9px] font-bold text-emerald-400">
                  +{pack.bonusCredits} bonus
                </div>
              )}

              {/* Fiyat */}
              <div className={cn(
                "mt-1 px-3 py-1 rounded-full text-xs font-bold",
                pack.bestValue
                  ? "bg-amber-500 text-amber-900"
                  : pack.popular
                    ? "bg-sky-500 text-white"
                    : "bg-muted text-foreground"
              )}>
                {isPurchasing ? "..." : formatPrice(pack.priceCents)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Güvenlik notu */}
      <div className="tm-card p-3 border-sky-500/20 bg-sky-500/5">
        <div className="text-[10px] text-muted-foreground leading-relaxed text-center">
          🔒 Satın almalar Google Play Billing üzerinden güvenli şekilde işlenir. Krediler anında hesabına eklenir.
        </div>
      </div>

      {/* Mevcut kredi */}
      <div className="tm-card p-3 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground uppercase font-bold">Mevcut Kredi</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40">
          <Coins size={14} className="text-amber-300" />
          <span className="text-sm font-bold text-amber-100 tabular-nums">{credits}</span>
        </div>
      </div>
    </div>
  );
}
