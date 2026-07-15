"use client";

import { useState } from "react";
import { Coins, Shirt, Shield, Palette, Check, Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

type CosmeticType = "kit" | "badge" | "theme";

type Cosmetic = {
  id: string;
  type: CosmeticType;
  name: string;
  price: number;
  icon: typeof Shirt;
  preview: string; // CSS gradient or color
  desc: string;
};

const COSMETICS: Cosmetic[] = [
  // Formalar
  { id: "kit_classic", type: "kit", name: "Klasik Forma", price: 15, icon: Shirt, preview: "linear-gradient(135deg, #1a3a2a 50%, #ffffff 50%)", desc: "Klasik çizgili forma" },
  { id: "kit_fire", type: "kit", name: "Ateş Forma", price: 25, icon: Shirt, preview: "linear-gradient(135deg, #dc2626 0%, #f59e0b 100%)", desc: "Kırmızı-turuncu gradient" },
  { id: "kit_ocean", type: "kit", name: "Okyanus Forma", price: 25, icon: Shirt, preview: "linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)", desc: "Mavi tonları" },
  { id: "kit_neon", type: "kit", name: "Neon Forma", price: 40, icon: Shirt, preview: "linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #8b5cf6 100%)", desc: "Neon renk geçişli" },
  // Rozetler
  { id: "badge_lion", type: "badge", name: "Aslan Rozeti", price: 20, icon: Shield, preview: "🦁", desc: "Aslan figürlü rozet" },
  { id: "badge_eagle", type: "badge", name: "Kartal Rozeti", price: 20, icon: Shield, preview: "🦅", desc: "Kartal figürlü rozet" },
  { id: "badge_star", type: "badge", name: "Yıldız Rozeti", price: 30, icon: Shield, preview: "⭐", desc: "Yıldız figürlü rozet" },
  { id: "badge_crown", type: "badge", name: "Taç Rozeti", price: 50, icon: Shield, preview: "👑", desc: "Taç figürlü rozet" },
  // Temalar
  { id: "theme_dark", type: "theme", name: "Karanlık Tema", price: 30, icon: Palette, preview: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", desc: "Koyu arka plan teması" },
  { id: "theme_forest", type: "theme", name: "Orman Teması", price: 30, icon: Palette, preview: "linear-gradient(135deg, #14532d 0%, #166534 100%)", desc: "Orman yeşili tema" },
  { id: "theme_sunset", type: "theme", name: "Gün Batımı Teması", price: 40, icon: Palette, preview: "linear-gradient(135deg, #f97316 0%, #db2777 100%)", desc: "Sıcak gün batımı" },
  { id: "theme_royal", type: "theme", name: "Kraliyet Teması", price: 50, icon: Palette, preview: "linear-gradient(135deg, #581c87 0%, #7e22ce 100%)", desc: "Mor kraliyet teması" },
];

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
    kit: { icon: Shirt, label: "Formalar" },
    badge: { icon: Shield, label: "Rozetler" },
    theme: { icon: Palette, label: "Temalar" },
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
          return (
            <div
              key={item.id}
              className={cn(
                "tm-card p-3 flex flex-col items-center gap-2 border-2",
                isEquipped ? "border-emerald-500" : "border-border"
              )}
            >
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
