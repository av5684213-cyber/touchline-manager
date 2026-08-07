"use client";

import { useState, useMemo, useEffect } from "react";
import { Coins, Package, Sparkles, X, Zap, Crown, Award, ShoppingBag, Layers, Wand2, Archive, TrendingUp, ArrowLeft } from "lucide-react";
import { useAppStore, useMyTeam } from "@/lib/store";
import { PlayerAvatar, PositionPill, RatingBadge } from "../ui-bits";
import { POSITION_GROUP } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
// v2.9.48: Paketten çıkan oyuncu profili için
import { PlayerProfileModal } from "../player-profile-modal";
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
  RARITY_COLORS,
  RARITY_LABELS,
  SEED_COSMETICS,
  type CosmeticItem,
  type CosmeticCategory,
  COSMETIC_CATEGORY_META,
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
type ShopTab = "packs" | "cards" | "credits" | "inventory";

const PACKS: Record<PackType, {
  name: string;
  price: number;
  icon: typeof Package;
  color: string;
  bgColor: string;
  borderColor: string;
  ovrRange: string;
  desc: string;
  // v2.9.65: Loot box olasılıkları (Play Store politikası gereği)
  probabilities: Array<{ range: string; chance: number }>;
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
    probabilities: [
      { range: "50-55 OVR", chance: 40 },
      { range: "56-60 OVR", chance: 35 },
      { range: "61-63 OVR", chance: 20 },
      { range: "64-65 OVR", chance: 5 },
    ],
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
    probabilities: [
      { range: "60-64 OVR", chance: 35 },
      { range: "65-69 OVR", chance: 35 },
      { range: "70-72 OVR", chance: 22 },
      { range: "73-75 OVR", chance: 8 },
    ],
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
    probabilities: [
      { range: "70-74 OVR", chance: 30 },
      { range: "75-79 OVR", chance: 35 },
      { range: "80-82 OVR", chance: 25 },
      { range: "83-85 OVR", chance: 10 },
    ],
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
    probabilities: [
      { range: "78-82 OVR", chance: 25 },
      { range: "83-86 OVR", chance: 35 },
      { range: "87-89 OVR", chance: 28 },
      { range: "90-92 OVR", chance: 12 },
    ],
  },
};

export function ShopScreen() {
  const { t } = useI18n();
  const credits = useAppStore((s) => s.credits);
  const buyPlayerPack = useAppStore((s) => s.buyPlayerPack);
  const buyCard = useAppStore((s) => s.buyCard);
  const myTeam = useMyTeam();
  const [tab, setTab] = useState<ShopTab>("packs");
  const [opening, setOpening] = useState<PackType | null>(null);
  const [phase, setPhase] = useState<"idle" | "shaking" | "revealing" | "done">("idle");
  const [pulledPlayers, setPulledPlayers] = useState<any[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  // v2.9.75: Satın alma onayı — "Emin misin?" modal'ı
  const [confirmPurchase, setConfirmPurchase] = useState<{
    type: "pack" | "card";
    name: string;
    price: number;
    onConfirm: () => void;
  } | null>(null);
  // v2.9.28 GÖREV 4: Kart basma modal'ı
  const [applyCard, setApplyCard] = useState<ShopCard | null>(null);
  // v2.9.48: Paketten çıkan oyuncu profili
  const [packProfilePlayer, setPackProfilePlayer] = useState<any | null>(null);

  const handleBuy = (packType: PackType) => {
    const pack = PACKS[packType];
    if (credits < pack.price) {
      haptic("error");
      setFeedback(`✗ ${t("shop.insufficient")}! ${pack.name} için ${pack.price} kredi gerek.`);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    // v2.9.75: Onay modal'ı göster
    setConfirmPurchase({
      type: "pack",
      name: pack.name,
      price: pack.price,
      onConfirm: () => {
        setConfirmPurchase(null);
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
      },
    });
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
      setFeedback(`✗ ${t("shop.insufficient")}! ${card.cardName} için ${card.price} kredi gerek.`);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    // v2.9.75: Onay modal'ı göster
    setConfirmPurchase({
      type: "card",
      name: card.cardName,
      price: card.price,
      onConfirm: () => {
        setConfirmPurchase(null);
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
          setFeedback(`✗ ${result.reason ?? t("shop.purchase_failed")}`);
          setTimeout(() => setFeedback(null), 3000);
        }
      },
    });
  };

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
      {/* Header */}
      <div className="tm-card p-3 bg-gradient-to-br from-amber-900/20 to-yellow-900/10 border-amber-500/30">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-amber-400" />
            <h1 className="text-base font-bold">{t("shop.title")}</h1>
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
          {t("shop.packs")}
        </button>
        <button
          onClick={() => { haptic("light"); setTab("cards"); }}
          className={cn(
            "tm-tap flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
            tab === "cards" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          )}
        >
          <Layers size={14} />
          {t("shop.cards")}
        </button>
        {/* v2.9.76: "market" (kozmetik) tab KALDIRILDI — etkisi olmayan öğeler satılıyordu */}
        <button
          onClick={() => { haptic("light"); setTab("credits"); }}
          className={cn(
            "tm-tap flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
            tab === "credits" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          )}
        >
          <Coins size={14} />
          {t("shop.credits")}
        </button>
        <button
          onClick={() => { haptic("light"); setTab("inventory"); }}
          className={cn(
            "tm-tap flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
            tab === "inventory" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          )}
        >
          <Archive size={14} />
          {t("shop.inventory")}
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
                  disabled={!canAfford || opening !== null || phase !== "idle"}
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
                  {/* v2.9.65+v2.9.73: Loot box olasılıkları — Play Store politikası gereği
                      v2.9.73: <details open> ile her zaman görünür başlat. Play Store
                      "clearly visible" gereksinimi — collapsed olasılık politikaya aykırı. */}
                  <details className="mt-1.5 w-full" open>
                    <summary className="text-[9px] text-muted-foreground cursor-pointer hover:text-foreground text-center">
                      📊 {t("shop.probabilities")}
                    </summary>
                    <div className="mt-1 space-y-0.5 p-1.5 rounded bg-muted/30">
                      {pack.probabilities.map((p) => (
                        <div key={p.range} className="flex justify-between text-[9px]">
                          <span className="text-muted-foreground">{p.range}</span>
                          <span className="font-bold tabular-nums text-foreground">%{p.chance}</span>
                        </div>
                      ))}
                    </div>
                  </details>
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
              <span className="text-[11px] font-bold text-sky-300 uppercase">{t("shop.how_it_works")}</span>
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

      {/* v2.9.76: Kozmetik market tab KALDIRILDI — etkisi olmayan öğeler */}
      {/* ===== KREDİ SATIN AL TAB ===== */}
      {tab === "credits" && (
        <CreditsPurchaseTab
          onFeedback={(msg) => { setFeedback(msg); setTimeout(() => setFeedback(null), 3000); }}
        />
      )}

      {/* ===== ENVANTERİM TAB ===== */}
      {tab === "inventory" && (
        <>
          <CardInventoryView onApplyCard={(card) => setApplyCard(card)} />
          {/* v2.9.76: CosmeticInventoryView KALDIRILDI — etkisi olmayan öğeler */}
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
          onPlayerClick={(p) => { haptic("light"); setPackProfilePlayer(p); }}
        />
      )}

      {/* v2.9.48: Paketten çıkan oyuncunun profili */}
      {packProfilePlayer && (
        <PlayerProfileModal
          player={packProfilePlayer}
          teamColor={myTeam?.primaryColor ?? "#1a3a2a"}
          onClose={() => setPackProfilePlayer(null)}
        />
      )}

      {/* v2.9.28 GÖREV 4: Kart basma modal'ı */}
      {applyCard && (
        <CardApplyModal
          card={applyCard}
          onClose={() => setApplyCard(null)}
        />
      )}

      {/* v2.9.75: Satın alma onayı — "Emin misin?" modal'ı */}
      {confirmPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="tm-card w-full max-w-[300px] p-4 space-y-3 text-center">
            <div className="text-2xl">🛒</div>
            <div className="text-sm font-bold">Satın Almayı Onayla</div>
            <div className="text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground">{confirmPurchase.name}</span> satın almak üzeresin.
              <br />
              Fiyat: <span className="font-bold text-amber-300">{confirmPurchase.price} kredi</span>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { haptic("light"); setConfirmPurchase(null); }}
                className="tm-tap flex-1 py-2 rounded-md border border-border text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                onClick={() => { haptic("success"); confirmPurchase.onConfirm(); }}
                className="tm-tap flex-1 py-2 rounded-md bg-amber-600 text-white text-xs font-bold"
              >
                Satın Al
              </button>
            </div>
          </div>
        </div>
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
  const { t } = useI18n();
  const credits = useAppStore((s) => s.credits);
  const cardInventory = useAppStore((s) => s.cardInventory);
  const [selectedPack, setSelectedPack] = useState<CardType | null>(null);

  // v2.9.89: 4 kart paketi — her kategori tek paket, olasılık sistemi
  const CARD_PACKAGES: Record<CardType, {
    name: string;
    desc: string;
    icon: typeof Package;
    gradient: string;
    border: string;
    iconColor: string;
    price: number;
    tiers: Array<{ label: string; chance: number; color: string }>;
  }> = {
    trait_positive: {
      name: "Pozitif Trait Paketi",
      desc: "Oyuncuna yeni pozitif özellik ekler. Maç motorunu doğrudan etkiler.",
      icon: Wand2,
      gradient: "from-emerald-600/20 to-emerald-900/10",
      border: "border-emerald-500/40",
      iconColor: "text-emerald-400",
      price: 25,
      tiers: [
        { label: "Beyaz (Yaygın)", chance: 50, color: "text-slate-300" },
        { label: "Lacivert (Nadir)", chance: 30, color: "text-blue-400" },
        { label: "Mor (Epik)", chance: 15, color: "text-purple-400" },
        { label: "Altın (Efsanevi)", chance: 5, color: "text-amber-400" },
      ],
    },
    trait_negative_removal: {
      name: "Negatif Giderme Paketi",
      desc: "Oyuncundaki negatif özelliği kaldırır. Penaltıyı geri alır.",
      icon: X,
      gradient: "from-red-600/20 to-red-900/10",
      border: "border-red-500/40",
      iconColor: "text-red-400",
      price: 20,
      tiers: [
        { label: "Hafif Giderme", chance: 60, color: "text-slate-300" },
        { label: "Orta Giderme", chance: 28, color: "text-amber-400" },
        { label: "Ağır Giderme", chance: 12, color: "text-red-400" },
      ],
    },
    arketip: {
      name: "Arketip Paketi",
      desc: "Oyuncunun arketipini değiştirir. Maç içindeki davranışını belirler.",
      icon: Crown,
      gradient: "from-amber-600/20 to-amber-900/10",
      border: "border-amber-500/40",
      iconColor: "text-amber-400",
      price: 30,
      tiers: [
        { label: "Standart Arketip", chance: 70, color: "text-slate-300" },
        { label: "Özel Arketip", chance: 25, color: "text-amber-400" },
        { label: "Nadir Arketip", chance: 5, color: "text-purple-400" },
      ],
    },
    stat_boost: {
      name: "Stat Boost Paketi",
      desc: "Oyuncunun belirli stat'ını kalıcı olarak artırır.",
      icon: TrendingUp,
      gradient: "from-sky-600/20 to-sky-900/10",
      border: "border-sky-500/40",
      iconColor: "text-sky-400",
      price: 20,
      tiers: [
        { label: "+1 (Yaygın)", chance: 60, color: "text-slate-300" },
        { label: "+2 (Nadir)", chance: 30, color: "text-blue-400" },
        { label: "+3 (Epik)", chance: 10, color: "text-purple-400" },
      ],
    },
  };

  // Seçili paketin kartları
  const allCards = useMemo(() => getAllShopCards(), []);
  const packCards = useMemo(() => {
    if (!selectedPack) return [];
    return allCards.filter(c => c.cardType === selectedPack);
  }, [allCards, selectedPack]);

  // v2.9.89: Paket satın al — rastgele kart verir (olasılık bazlı)
  const handleBuyPack = (packType: CardType) => {
    const pack = CARD_PACKAGES[packType];
    if (credits < pack.price) {
      haptic("error");
      return;
    }
    // Paketten rastgele kart çek
    const cards = allCards.filter(c => c.cardType === packType);
    if (cards.length === 0) return;
    const randomCard = cards[Math.floor(Math.random() * cards.length)];
    onBuyCard(randomCard);
  };

  return (
    <div className="space-y-3">
      {/* v2.9.89: 4 kart paketi — grid layout, güzel görsel */}
      {!selectedPack && (
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(CARD_PACKAGES) as CardType[]).map((type) => {
            const pack = CARD_PACKAGES[type];
            const Icon = pack.icon;
            const canAfford = credits >= pack.price;
            const ownedInCategory = cardInventory.filter(c => {
              const card = allCards.find(ac => ac.cardId === c.cardId);
              return card?.cardType === type;
            }).reduce((s, c) => s + c.quantity, 0);

            return (
              <button
                key={type}
                onClick={() => { haptic("light"); setSelectedPack(type); }}
                className={cn(
                  "tm-tap relative rounded-xl p-4 flex flex-col items-center gap-2 border-2 transition-all active:scale-[0.97] overflow-hidden",
                  "bg-gradient-to-b", pack.gradient, pack.border
                )}
              >
                {/* Glow efekti */}
                <div className={cn("absolute inset-0 rounded-xl opacity-10 blur-xl bg-gradient-to-b", pack.gradient)} />

                {/* İkon */}
                <div className={cn("relative w-14 h-14 rounded-2xl flex items-center justify-center bg-black/30 border", pack.border)}>
                  <Icon size={28} className={pack.iconColor} />
                </div>

                {/* Paket adı */}
                <div className={cn("relative text-xs font-bold text-center leading-tight", pack.iconColor)}>
                  {pack.name}
                </div>

                {/* Açıklama — truncate ile taşma önle */}
                <div className="relative text-[9px] text-muted-foreground text-center leading-tight line-clamp-2">
                  {pack.desc}
                </div>

                {/* Olasılık önizleme — kompakt */}
                <div className="relative w-full space-y-0.5 mt-1">
                  {pack.tiers.map((tier) => (
                    <div key={tier.label} className="flex justify-between text-[8px]">
                      <span className={cn("truncate", tier.color)}>{tier.label}</span>
                      <span className="font-bold tabular-nums text-muted-foreground shrink-0 ml-1">%{tier.chance}</span>
                    </div>
                  ))}
                </div>

                {/* Fiyat + sahip olunan */}
                <div className="relative flex items-center gap-1.5 mt-1">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40">
                    <Coins size={11} className="text-amber-300" />
                    <span className="text-[11px] font-bold text-amber-100 tabular-nums">{pack.price}</span>
                  </div>
                  {ownedInCategory > 0 && (
                    <span className="text-[9px] text-emerald-400 font-bold">×{ownedInCategory}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Seçili paketin detayları + kart satın alma */}
      {selectedPack && (
        <div className="space-y-3">
          {/* Geri butonu + paket başlığı */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { haptic("light"); setSelectedPack(null); }}
              className="tm-tap p-1.5 rounded-lg bg-card border border-border"
            >
              <ArrowLeft size={14} />
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {(() => {
                const pack = CARD_PACKAGES[selectedPack];
                const Icon = pack.icon;
                return (
                  <>
                    <Icon size={16} className={pack.iconColor} />
                    <span className="text-xs font-bold truncate">{pack.name}</span>
                  </>
                );
              })()}
            </div>
            {/* Hızlı satın al butonu */}
            <button
              onClick={() => handleBuyPack(selectedPack)}
              disabled={credits < CARD_PACKAGES[selectedPack].price}
              className={cn(
                "tm-tap flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors shrink-0",
                credits >= CARD_PACKAGES[selectedPack].price
                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                  : "bg-muted/30 text-muted-foreground/50"
              )}
            >
              <Coins size={10} />
              {CARD_PACKAGES[selectedPack].price} · Rastgele Çek
            </button>
          </div>

          {/* Olasılıklar — detaylı */}
          <div className="tm-card p-3">
            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">📊 Olasılıklar</div>
            <div className="space-y-1.5">
              {CARD_PACKAGES[selectedPack].tiers.map((tier) => (
                <div key={tier.label} className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full",
                        tier.color.includes("slate") ? "bg-slate-400" :
                        tier.color.includes("blue") ? "bg-blue-400" :
                        tier.color.includes("purple") ? "bg-purple-400" :
                        tier.color.includes("amber") ? "bg-amber-400" :
                        tier.color.includes("red") ? "bg-red-400" : "bg-slate-400"
                      )}
                      style={{ width: `${tier.chance}%` }}
                    />
                  </div>
                  <span className={cn("text-[10px] font-bold tabular-nums w-8 text-right", tier.color)}>%{tier.chance}</span>
                  <span className={cn("text-[10px] w-24 truncate", tier.color)}>{tier.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bireysel kartlar — satın al + uygula */}
          <div className="grid grid-cols-2 gap-2">
            {packCards.map((card) => {
              const owned = cardInventory.find(c => c.cardId === card.cardId)?.quantity ?? 0;
              const canAfford = credits >= card.price;
              return (
                <div
                  key={card.cardId}
                  className={cn(
                    "relative rounded-xl p-2.5 flex flex-col gap-1 border-2 transition-all overflow-hidden",
                    getRarityColor(card.rarity)
                  )}
                >
                  {owned > 0 && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-[8px] font-bold">
                      ×{owned}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {card.cardType === "trait_positive" && <Wand2 size={10} className="text-emerald-400 shrink-0" />}
                    {card.cardType === "trait_negative_removal" && <X size={10} className="text-red-400 shrink-0" />}
                    {card.cardType === "arketip" && <Crown size={10} className="text-amber-400 shrink-0" />}
                    {card.cardType === "stat_boost" && <TrendingUp size={10} className="text-sky-400 shrink-0" />}
                    <span className="text-[8px] text-muted-foreground uppercase font-bold truncate">{getRarityLabel(card.rarity)}</span>
                  </div>
                  <div className="text-[11px] font-bold leading-tight truncate">{card.cardName}</div>
                  {card.level && (
                    <div className={cn("text-[8px] font-bold", getLevelColor(card.level))}>{getLevelLabel(card.level)}</div>
                  )}
                  <div className="text-[8px] text-muted-foreground truncate">{getGroupLabel(card.groupName)}</div>
                  <div className="text-[8px] text-muted-foreground leading-tight line-clamp-2 flex-1">{card.description}</div>
                  <button
                    onClick={() => onBuyCard(card)}
                    disabled={!canAfford}
                    className={cn(
                      "tm-tap w-full flex items-center justify-center gap-1 py-1 rounded-md text-[9px] font-bold transition-colors",
                      canAfford ? "bg-amber-500/20 text-amber-300 border border-amber-400/40" : "bg-muted/30 text-muted-foreground/50"
                    )}
                  >
                    <Coins size={9} />
                    {card.price}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bilgi notu */}
      <div className="tm-card p-3 border-purple-500/20 bg-purple-500/5">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={13} className="text-purple-400" />
          <span className="text-[11px] font-bold text-purple-300 uppercase">Nasıl Çalışır?</span>
        </div>
        <ul className="text-[10px] text-muted-foreground space-y-1 leading-relaxed">
          <li>• <strong className="text-foreground">Pozitif Trait:</strong> Oyuncuya yeni özellik ekler (maç motorunu etkiler)</li>
          <li>• <strong className="text-foreground">Giderme Kartı:</strong> Negatif trait'i kaldırır, penaltıyı geri alır</li>
          <li>• <strong className="text-foreground">Arketip Kartı:</strong> Oyuncunun arketipini değiştirir</li>
          <li>• <strong className="text-foreground">Stat Boost:</strong> Oyuncunun belirli stat'ını kalıcı olarak artırır</li>
          <li>• <strong className="text-foreground">Rastgele Çek:</strong> Paket fiyatıyla rastgele kart alırsın (daha ucuz)</li>
          <li>• Satın aldığın kartlar <strong className="text-foreground">Envanterim</strong>'de birikir</li>
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
  onPlayerClick,
}: {
  packType: PackType;
  phase: "shaking" | "revealing" | "done";
  pulledPlayers: any[];
  revealIndex: number;
  onClose: () => void;
  onNext: () => void;
  // v2.9.48: Oyuncuya tıklayınca profil aç
  onPlayerClick?: (player: any) => void;
}) {
  const { t } = useI18n();
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
          <div className="text-white text-sm font-bold">{t("shop.opening")}</div>
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
        <div className="flex flex-col items-center gap-4 max-w-[360px] w-full max-h-[80vh] overflow-y-auto tm-thin-scrollbar">
          <Crown size={48} className="text-amber-400 shrink-0" />
          <div className="text-white text-sm font-bold">{t("shop.opened")}</div>
          <div className="text-white/60 text-xs text-center">
            {pulledPlayers.length} oyuncu kadroya eklendi — detay için tıkla
          </div>

          {/* v2.9.48: Tüm oyuncuları liste halinde göster */}
          <div className="w-full space-y-2">
            {pulledPlayers.map((p, i) => (
              <button
                key={i}
                onClick={() => { haptic("light"); onPlayerClick?.(p); }}
                className="tm-tap w-full tm-card p-3 flex items-center gap-3 hover:bg-accent/30 transition-colors text-left"
              >
                <PlayerAvatar initials={p.specificPosition} color="#1a3a2a" size={40} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{p.firstName} {p.lastName}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {p.specificPosition} · {p.age} yaş
                    {p.archetype && ` · ${p.archetype}`}
                  </div>
                </div>
                <RatingBadge value={p.rating} />
                <PositionPill label={p.specificPosition} group={POSITION_GROUP[p.specificPosition]} />
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="tm-tap px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold shrink-0"
          >
            {t("shop.ok")}
          </button>
        </div>
      )}

      {phase === "revealing" && (
        <button
          onClick={onNext}
          className="absolute bottom-8 tm-tap px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold"
        >
          {revealIndex < pulledPlayers.length - 1 ? t("shop.next") : t("shop.ok")}
        </button>
      )}

      {(phase === "shaking" || phase === "revealing") && (
        <button
          onClick={onClose}
          aria-label="Kapat"
          className="absolute top-4 right-4 tm-tap p-2 text-white/50 hover:text-white"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// v2.9.76: CosmeticMarketTab VE CosmeticInventoryView KALDIRILDI
// Neden: kit/badge/stadium/ball kategorilerinin oyuna hiçbir etkisi yoktu.
// Theme kategorisi CSS değişkeni uyguluyordu ama bu "oyun mekanik etkisi" değil.
// Kullanıcı kredi harcayıp etkisiz öğeler alıyordu — kaldırıldı.
// Mevcut equipped cosmetics state'i korunur (CosmeticsApplier çalışmaya devam eder).
// ============================================================================


// ============================================================================
// v2.9.46 Görev 2: Kredi Satın Al Tab — Google Play Billing
// ============================================================================

function CreditsPurchaseTab({ onFeedback }: { onFeedback: (msg: string) => void }) {
  const { t } = useI18n();
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
      // 1. Google Play Billing ile satın alma akışı başlat (DEĞİŞMEDİ)
      const result = await launchPurchaseFlow(pack.sku);
      if (!result.success) {
        haptic("error");
        onFeedback(`✗ ${result.reason ?? "Satın alma başarısız"}`);
        return;
      }

      // 2. Satın almayı onayla — Google Play gereği (DEĞİŞMEDİ)
      if (result.purchase?.purchaseToken) {
        await acknowledgePurchase(result.purchase.purchaseToken);
      }

      // 3. v2.9.65 FIX: purchaseToken YOKSA kredi ekleme — "Dev mode" bypass kaldırıldı
      // Eski kod: purchaseToken undefined → else branch → addCredits (BYPASS!)
      // Yeni: purchaseToken yoksa hata ver, kredi ekleme
      if (!result.purchase?.purchaseToken) {
        haptic("error");
        onFeedback("✗ Satın alma doğrulanamadı — purchaseToken alınamadı. Kredi eklenmedi.");
        console.warn("[billing] No purchaseToken received — credits NOT added");
        return;
      }

      // 4. v2.9.53: Server-side doğrulama — purchaseToken'ı verify-purchase'a gönder
      try {
          const { supabase } = await import("@/lib/supabase/client");
          const { data: verifyData, error: verifyErr } = await supabase()
            .functions.invoke("verify-purchase", {
              body: {
                purchaseToken: result.purchase.purchaseToken,
                sku: pack.sku,
              },
            });

          if (verifyErr || !verifyData?.success) {
            // Doğrulama başarısız — ama para alındı, sessizce iptal etme
            const reason = verifyData?.reason || verifyErr?.message || "doğrulama hatası";
            const isAlreadyRedeemed = verifyData?.alreadyRedeemed === true;
            if (isAlreadyRedeemed) {
              onFeedback("⚠️ Bu satın alma zaten kullanılmış — kredi tekrar eklenmedi.");
            } else {
              onFeedback("⏳ Satın alman doğrulanıyor — kredin birazdan eklenecek.");
              // Arka planda tekrar dene (1 deneme, 5s sonra)
              setTimeout(async () => {
                try {
                  const retry = await supabase().functions.invoke("verify-purchase", {
                    body: { purchaseToken: result.purchase!.purchaseToken, sku: pack.sku },
                  });
                  if (retry.data?.success && retry.data.creditsGranted) {
                    addCredits(retry.data.creditsGranted);
                    haptic("success");
                    onFeedback(`✓ ${retry.data.creditsGranted} kredi eklendi!`);
                  }
                } catch { /* sessiz — kullanıcıya zaten mesaj gösterildi */ }
              }, 5000);
            }
            return;
          }

          // 4. Doğrulama başarılı — sunucunun onayladığı miktarı kullan
          const grantedCredits = verifyData.creditsGranted ?? (pack.credits + pack.bonusCredits);
          addCredits(grantedCredits);
          haptic("success");
          onFeedback(`✓ ${grantedCredits} kredi eklendi!${pack.bonusCredits > 0 ? ` (${pack.bonusCredits} bonus)` : ""}`);
      } catch (verifyErr: any) {
        // Network hatası — para alındı ama doğrulanamadı
        onFeedback("⏳ Satın alman doğrulanıyor — kredin birazdan eklenecek.");
        console.warn("[billing] verify-purchase error:", verifyErr);
        return;
      }
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
          <span className="text-[11px] font-bold text-amber-300 uppercase">{t("shop.buy_credits")}</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Kredilerle futbolcu paketi aç, kart satın al, kozmetik marketten eşya al. Bonus kredili paketler daha avantajlı!
        </p>
      </div>

      {/* Billing durumu uyarısı */}
      {!billingAvailable && (
        <div className="tm-card p-3 text-center text-[10px] text-amber-400 bg-amber-500/10 border-amber-500/30">
          ⚠️ {t("shop.dev_mode_warning")} — gerçek para ile satın alma devre dışı. Android APK'da Google Play Billing aktif olur. Test için "satın alma" simülasyonu çalışır.
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
        <span className="text-[11px] text-muted-foreground uppercase font-bold">{t("shop.current_credits")}</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40">
          <Coins size={14} className="text-amber-300" />
          <span className="text-sm font-bold text-amber-100 tabular-nums">{credits}</span>
        </div>
      </div>
    </div>
  );
}
