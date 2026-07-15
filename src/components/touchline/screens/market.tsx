"use client";

import { useState } from "react";
import { Coins, Shirt, Shield, Palette, Check, Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

type CosmeticType = "kit" | "badge" | "theme" | "stadium" | "ball" | "manager";

type Cosmetic = {
  id: string;
  type: CosmeticType;
  name: string;
  price: number;
  icon: typeof Shirt;
  preview: string; // CSS gradient or color
  desc: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
};

const COSMETICS: Cosmetic[] = [
  // ===== Formalar (8) =====
  { id: "kit_classic", type: "kit", name: "Klasik Forma", price: 15, icon: Shirt, preview: "linear-gradient(135deg, #1a3a2a 50%, #ffffff 50%)", desc: "Klasik çizgili forma", rarity: "common" },
  { id: "kit_fire", type: "kit", name: "Ateş Forma", price: 25, icon: Shirt, preview: "linear-gradient(135deg, #dc2626 0%, #f59e0b 100%)", desc: "Kırmızı-turuncu gradient", rarity: "common" },
  { id: "kit_ocean", type: "kit", name: "Okyanus Forma", price: 25, icon: Shirt, preview: "linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)", desc: "Mavi tonları", rarity: "common" },
  { id: "kit_neon", type: "kit", name: "Neon Forma", price: 40, icon: Shirt, preview: "linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #8b5cf6 100%)", desc: "Neon renk geçişli", rarity: "rare" },
  { id: "kit_gold", type: "kit", name: "Altın Forma", price: 60, icon: Shirt, preview: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)", desc: "Altın parlama", rarity: "epic" },
  { id: "kit_dragon", type: "kit", name: "Ejder Forma", price: 80, icon: Shirt, preview: "linear-gradient(135deg, #7c2d12 0%, #dc2626 50%, #fbbf24 100%)", desc: "Ejder deseni", rarity: "epic" },
  { id: "kit_galaxy", type: "kit", name: "Galaksi Forma", price: 100, icon: Shirt, preview: "linear-gradient(135deg, #1e1b4b 0%, #7c3aed 50%, #ec4899 100%)", desc: "Galaksi deseni", rarity: "legendary" },
  { id: "kit_rainbow", type: "kit", name: "Gökkuşağı Forma", price: 120, icon: Shirt, preview: "linear-gradient(135deg, #ef4444 0%, #f59e0b 20%, #eab308 40%, #22c55e 60%, #3b82f6 80%, #8b5cf6 100%)", desc: "7 renk gökkuşağı", rarity: "legendary" },

  // ===== Rozetler (8) =====
  { id: "badge_lion", type: "badge", name: "Aslan Rozeti", price: 20, icon: Shield, preview: "🦁", desc: "Aslan figürlü rozet", rarity: "common" },
  { id: "badge_eagle", type: "badge", name: "Kartal Rozeti", price: 20, icon: Shield, preview: "🦅", desc: "Kartal figürlü rozet", rarity: "common" },
  { id: "badge_star", type: "badge", name: "Yıldız Rozeti", price: 30, icon: Shield, preview: "⭐", desc: "Yıldız figürlü rozet", rarity: "rare" },
  { id: "badge_crown", type: "badge", name: "Taç Rozeti", price: 50, icon: Shield, preview: "👑", desc: "Taç figürlü rozet", rarity: "epic" },
  { id: "badge_dragon", type: "badge", name: "Ejder Rozeti", price: 60, icon: Shield, preview: "🐉", desc: "Ejderha figürlü rozet", rarity: "epic" },
  { id: "badge_phoenix", type: "badge", name: "Anka Rozeti", price: 80, icon: Shield, preview: "🔥", desc: "Phoenix rozeti", rarity: "legendary" },
  { id: "badge_lightning", type: "badge", name: "Şimşek Rozeti", price: 40, icon: Shield, preview: "⚡", desc: "Şimşek figürlü rozet", rarity: "rare" },
  { id: "badge_skull", type: "badge", name: "Kafatası Rozeti", price: 70, icon: Shield, preview: "💀", desc: "Kafatası rozeti", rarity: "epic" },

  // ===== Temalar (8) =====
  { id: "theme_dark", type: "theme", name: "Karanlık Tema", price: 30, icon: Palette, preview: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", desc: "Koyu arka plan teması", rarity: "common" },
  { id: "theme_forest", type: "theme", name: "Orman Teması", price: 30, icon: Palette, preview: "linear-gradient(135deg, #14532d 0%, #166534 100%)", desc: "Orman yeşili tema", rarity: "common" },
  { id: "theme_sunset", type: "theme", name: "Gün Batımı Teması", price: 40, icon: Palette, preview: "linear-gradient(135deg, #f97316 0%, #db2777 100%)", desc: "Sıcak gün batımı", rarity: "rare" },
  { id: "theme_royal", type: "theme", name: "Kraliyet Teması", price: 50, icon: Palette, preview: "linear-gradient(135deg, #581c87 0%, #7e22ce 100%)", desc: "Mor kraliyet teması", rarity: "rare" },
  { id: "theme_ocean", type: "theme", name: "Okyanus Teması", price: 45, icon: Palette, preview: "linear-gradient(135deg, #0c4a6e 0%, #0891b2 100%)", desc: "Derin okyanus mavisi", rarity: "rare" },
  { id: "theme_cherry", type: "theme", name: "Sakura Teması", price: 55, icon: Palette, preview: "linear-gradient(135deg, #be185d 0%, #f472b6 100%)", desc: "Japon sakura çiçeği", rarity: "epic" },
  { id: "theme_neon", type: "theme", name: "Neon Teması", price: 70, icon: Palette, preview: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)", desc: "Cyberpunk neon", rarity: "epic" },
  { id: "theme_gold", type: "theme", name: "Altın Tema", price: 100, icon: Palette, preview: "linear-gradient(135deg, #78350f 0%, #fbbf24 50%, #f59e0b 100%)", desc: "Premium altın tema", rarity: "legendary" },

  // ===== Stadyum Temaları (6) — YENİ =====
  { id: "stadium_classic", type: "stadium", name: "Klasik Stadyum", price: 35, icon: Palette, preview: "linear-gradient(180deg, #1e3a5f 0%, #2d5016 100%)", desc: "Geleneksel stadyum görünümü", rarity: "common" },
  { id: "stadium_modern", type: "stadium", name: "Modern Stadyum", price: 50, icon: Palette, preview: "linear-gradient(180deg, #1e293b 0%, #334155 50%, #475569 100%)", desc: "Modern tasarım", rarity: "rare" },
  { id: "stadium_cologne", type: "stadium", name: "Köln Stadyumu", price: 60, icon: Palette, preview: "linear-gradient(180deg, #dc2626 0%, #000000 100%)", desc: "Kırmızı-siyah tribün", rarity: "rare" },
  { id: "stadium_tropical", type: "stadium", name: "Tropikal Stadyum", price: 70, icon: Palette, preview: "linear-gradient(180deg, #0ea5e9 0%, #fbbf24 100%)", desc: "Tropik ada stadyumu", rarity: "epic" },
  { id: "stadium_neon", type: "stadium", name: "Neon Stadyum", price: 90, icon: Palette, preview: "linear-gradient(180deg, #1e1b4b 0%, #7c3aed 50%, #06b6d4 100%)", desc: "Futuristik neon stadyum", rarity: "epic" },
  { id: "stadium_legendary", type: "stadium", name: "Efsane Stadyum", price: 120, icon: Palette, preview: "linear-gradient(180deg, #78350f 0%, #fbbf24 50%, #dc2626 100%)", desc: "Altın efsane stadyum", rarity: "legendary" },

  // ===== Top Desenleri (6) — YENİ =====
  { id: "ball_classic", type: "ball", name: "Klasik Top", price: 20, icon: Shirt, preview: "linear-gradient(135deg, #ffffff 0%, #000000 100%)", desc: "Beyaz-siyah klasik top", rarity: "common" },
  { id: "ball_fire", type: "ball", name: "Ateş Topu", price: 35, icon: Shirt, preview: "linear-gradient(135deg, #fbbf24 0%, #dc2626 100%)", desc: "Ateş topu deseni", rarity: "rare" },
  { id: "ball_ice", type: "ball", name: "Buz Topu", price: 35, icon: Shirt, preview: "linear-gradient(135deg, #e0f2fe 0%, #0ea5e9 100%)", desc: "Buz mavisi top", rarity: "rare" },
  { id: "ball_neon", type: "ball", name: "Neon Top", price: 55, icon: Shirt, preview: "linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #8b5cf6 100%)", desc: "Neon parlama", rarity: "epic" },
  { id: "ball_gold", type: "ball", name: "Altın Top", price: 80, icon: Shirt, preview: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)", desc: "Altın kaplama top", rarity: "epic" },
  { id: "ball_legendary", type: "ball", name: "Efsane Top", price: 110, icon: Shirt, preview: "linear-gradient(135deg, #1e1b4b 0%, #7c3aed 50%, #fbbf24 100%)", desc: "Galaksi efsane topu", rarity: "legendary" },

  // ===== Menajer Kıyafetleri (6) — YENİ =====
  { id: "manager_suit_classic", type: "manager", name: "Klasik Takım Elbise", price: 25, icon: Shirt, preview: "linear-gradient(135deg, #1e293b 0%, #334155 100%)", desc: "Siyah takım elbise", rarity: "common" },
  { id: "manager_tracksuit", type: "manager", name: "Eşofman", price: 30, icon: Shirt, preview: "linear-gradient(135deg, #1a3a2a 0%, #166534 100%)", desc: "Yeşil eşofman", rarity: "common" },
  { id: "manager_polo", type: "manager", name: "Polo Gömlek", price: 35, icon: Shirt, preview: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)", desc: "Mavi polo gömlek", rarity: "rare" },
  { id: "manager_blazer", type: "manager", name: "Blazer Ceket", price: 50, icon: Shirt, preview: "linear-gradient(135deg, #7c2d12 0%, #dc2626 100%)", desc: "Kırmızı blazer", rarity: "rare" },
  { id: "manager_designer", type: "manager", name: "Designer Takım", price: 75, icon: Shirt, preview: "linear-gradient(135deg, #581c87 0%, #7e22ce 100%)", desc: "Mor designer takım", rarity: "epic" },
  { id: "manager_legendary", type: "manager", name: "Efsane Menajer", price: 100, icon: Shirt, preview: "linear-gradient(135deg, #78350f 0%, #fbbf24 50%, #dc2626 100%)", desc: "Altın efsane kıyafet", rarity: "legendary" },
];

const RARITY_COLORS: Record<string, string> = {
  common: "border-slate-500/50",
  rare: "border-sky-500/50",
  epic: "border-purple-500/50",
  legendary: "border-amber-500/60",
};

const RARITY_LABELS: Record<string, string> = {
  common: "Yaygın",
  rare: "Nadir",
  epic: "Epik",
  legendary: "Efsane",
};

const RARITY_TEXT: Record<string, string> = {
  common: "text-slate-400",
  rare: "text-sky-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
};

export function MarketScreen() {
  const { credits, spendCredits } = useAppStore();
  const [ownedItems, setOwnedItems] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const saved = localStorage.getItem("tm_owned_cosmetics");
    return new Set(saved ? JSON.parse(saved) : []);
  });
  const [activeTab, setActiveTab] = useState<CosmeticType>("kit");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [equipped, setEquipped] = useState<{ [key: string]: string }>(() => {
    if (typeof window === "undefined") return {};
    const saved = localStorage.getItem("tm_equipped_cosmetics");
    return saved ? JSON.parse(saved) : {};
  });

  const handleBuy = (item: Cosmetic) => {
    if (ownedItems.has(item.id)) return;
    if (credits < item.price) {
      haptic("error");
      setFeedback(`✗ Yetersiz kredi! ${item.name} için ${item.price} kredi gerek.`);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    const ok = spendCredits(item.price);
    if (!ok) {
      haptic("error");
      setFeedback("✗ Kredi harcanamadı.");
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    haptic("success");
    const newOwned = new Set(ownedItems);
    newOwned.add(item.id);
    setOwnedItems(newOwned);
    localStorage.setItem("tm_owned_cosmetics", JSON.stringify([...newOwned]));
    setFeedback(`✓ ${item.name} satın alındı!`);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleEquip = (item: Cosmetic) => {
    haptic("light");
    const newEquipped = { ...equipped, [item.type]: item.id };
    setEquipped(newEquipped);
    localStorage.setItem("tm_equipped_cosmetics", JSON.stringify(newEquipped));
    setFeedback(`✓ ${item.name} giyildi!`);
    setTimeout(() => setFeedback(null), 2000);
  };

  const filteredItems = COSMETICS.filter((c) => c.type === activeTab);

  const tabLabels: Record<CosmeticType, { icon: typeof Shirt; label: string }> = {
    kit: { icon: Shirt, label: "Forma" },
    badge: { icon: Shield, label: "Rozet" },
    theme: { icon: Palette, label: "Tema" },
    stadium: { icon: Palette, label: "Stadyum" },
    ball: { icon: Shirt, label: "Top" },
    manager: { icon: Shirt, label: "Menajer" },
  };

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      {/* Header */}
      <div className="tm-card p-3 bg-gradient-to-br from-purple-900/20 to-pink-900/10 border-purple-500/30">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" />
            <h1 className="text-base font-bold">Market</h1>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40">
            <Coins size={14} className="text-amber-300" />
            <span className="text-sm font-bold text-amber-100 tabular-nums">{credits}</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Kozmetik öğeler — oyunu etkilemez, sadece görünüm. Formalar, rozetler ve temalar.
        </p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="tm-card p-2.5 text-center text-xs font-bold bg-amber-50 border-amber-200 text-amber-800">
          {feedback}
        </div>
      )}

      {/* Tab selector */}
      <div className="flex gap-1.5">
        {(Object.keys(tabLabels) as CosmeticType[]).map((type) => {
          const Icon = tabLabels[type].icon;
          return (
            <button
              key={type}
              onClick={() => { haptic("light"); setActiveTab(type); }}
              className={cn(
                "tm-tap flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
                activeTab === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground"
              )}
            >
              <Icon size={14} />
              {tabLabels[type].label}
            </button>
          );
        })}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isOwned = ownedItems.has(item.id);
          const isEquipped = equipped[item.type] === item.id;
          const rarity = item.rarity ?? "common";
          return (
            <div
              key={item.id}
              className={cn(
                "tm-card p-3 flex flex-col items-center gap-2 border-2 relative",
                isEquipped ? "border-emerald-500" : RARITY_COLORS[rarity]
              )}
            >
              {/* Rarity badge */}
              <div className={cn(
                "absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase",
                rarity === "legendary" ? "bg-amber-500/30 text-amber-300" :
                rarity === "epic" ? "bg-purple-500/30 text-purple-300" :
                rarity === "rare" ? "bg-sky-500/30 text-sky-300" :
                "bg-slate-500/30 text-slate-300"
              )}>
                {RARITY_LABELS[rarity]}
              </div>

              {/* Preview */}
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold"
                style={{ background: item.preview.startsWith("linear") ? item.preview : undefined }}
              >
                {item.preview.startsWith("linear") ? <Icon size={28} className="text-white" /> : item.preview}
              </div>

              {/* Name */}
              <div className="text-xs font-bold text-center">{item.name}</div>
              <div className="text-[9px] text-muted-foreground text-center leading-tight">{item.desc}</div>

              {/* Action button */}
              {isEquipped ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  <Check size={11} /> Giyili
                </div>
              ) : isOwned ? (
                <button
                  onClick={() => handleEquip(item)}
                  className="tm-tap px-3 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold"
                >
                  Giy
                </button>
              ) : (
                <button
                  onClick={() => handleBuy(item)}
                  disabled={credits < item.price}
                  className={cn(
                    "tm-tap flex items-center gap-1 px-3 py-1 rounded-md text-[10px] font-bold",
                    credits < item.price
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                  )}
                >
                  <Coins size={10} />
                  {item.price}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="tm-card p-3 border-sky-500/20 bg-sky-500/5">
        <div className="text-[10px] text-muted-foreground leading-relaxed">
          💡 Kozmetik öğeler tamamen görseldir — oyun performansını veya maç sonucunu etkilemez. Satın aldığın öğeler kalıcıdır ve istediğin zaman giyebilirsin.
        </div>
      </div>
    </div>
  );
}
