"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import { formatEuro } from "@/lib/format";

// Lig seviyesine göre sponsor havuzu
const SPONSOR_POOL: Record<number, { name: string; type: string; baseIncome: number; condition: string }[]> = {
  1: [ // Süper Lig — büyük sponsorlar
    { name: "Turkcell", type: "Ana Sponsor", baseIncome: 2_000_000, condition: "Ligin ilk yarısında kal" },
    { name: "Turkish Airlines", type: "Kol Sponsoru", baseIncome: 800_000, condition: "15+ galibiyet" },
    { name: "Garanti BBVA", type: "Stadyum Sponsoru", baseIncome: 500_000, condition: "60%+ doluluk" },
    { name: "Nike", type: "Teknik Sponsor", baseIncome: 300_000, condition: "Genç oyuncu gelişimi" },
    { name: "Ülker", type: "Beslenme Sponsoru", baseIncome: 200_000, condition: "—"},
  ],
  2: [ // 1. Lig — orta sponsorlar
    { name: "Vodafone", type: "Ana Sponsor", baseIncome: 800_000, condition: "Ligin ilk yarısında kal" },
    { name: "TÜPRAŞ", type: "Kol Sponsoru", baseIncome: 300_000, condition: "12+ galibiyet" },
    { name: "Teb", type: "Stadyum Sponsoru", baseIncome: 150_000, condition: "50%+ doluluk" },
    { name: "Puma", type: "Teknik Sponsor", baseIncome: 100_000, condition: "Genç oyuncu gelişimi" },
    { name: "ETI", type: "Beslenme Sponsoru", baseIncome: 80_000, condition: "—" },
  ],
  3: [ // 2. Lig — küçük sponsorlar
    { name: "Trendyol", type: "Ana Sponsor", baseIncome: 300_000, condition: "Ligin ilk yarısında kal" },
    { name: "Getir", type: "Kol Sponsoru", baseIncome: 100_000, condition: "10+ galibiyet" },
    { name: "Yemeksepeti", type: "Stadyum Sponsoru", baseIncome: 60_000, condition: "40%+ doluluk" },
    { name: "Lidl", type: "Teknik Sponsor", baseIncome: 40_000, condition: "Genç oyuncu gelişimi" },
    { name: "Doğuş", type: "Beslenme Sponsoru", baseIncome: 30_000, condition: "—" },
  ],
  4: [ // 3. Lig — çok küçük sponsorlar
    { name: "Yerel Market", type: "Ana Sponsor", baseIncome: 100_000, condition: "Ligin ilk yarısında kal" },
    { name: "Bölge Kebap", type: "Kol Sponsoru", baseIncome: 40_000, condition: "8+ galibiyet" },
    { name: "Mahalle Berberi", type: "Stadyum Sponsoru", baseIncome: 20_000, condition: "30%+ doluluk" },
    { name: "Spor Shop", type: "Teknik Sponsor", baseIncome: 15_000, condition: "Genç oyuncu gelişimi" },
    { name: "Süt Üreticisi", type: "Beslenme Sponsoru", baseIncome: 10_000, condition: "—" },
  ],
};

export type Sponsor = {
  name: string;
  type: string;
  baseIncome: number;
  condition: string;
};

export function generateSponsorOffers(tier: number): Sponsor[] {
  const pool = SPONSOR_POOL[tier] ?? SPONSOR_POOL[4];
  // 3 random sponsor teklif et
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export function SponsorCard({ sponsor, selected, onSelect }: {
  sponsor: Sponsor;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={() => { haptic("light"); onSelect(); }}
      className={cn(
        "tm-tap w-full p-3 rounded-lg border-2 text-left transition-all",
        selected ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-card hover:border-primary/50"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold">{sponsor.name}</span>
        <span className={cn("text-[8px] px-1.5 py-0.5 rounded font-bold", selected ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground")}>
          {sponsor.type}
        </span>
      </div>
      <div className="text-lg font-bold text-emerald-400">{formatEuro(sponsor.baseIncome, "tr")}<span className="text-[9px] text-muted-foreground font-normal">/sezon</span></div>
      <div className="text-[9px] text-muted-foreground mt-1">📋 {sponsor.condition}</div>
    </button>
  );
}

// Sezon başı sponsor seçim modalı
export function SponsorOfferModal({ tier, onSelect, onClose }: {
  tier: number;
  onSelect: (sponsor: Sponsor) => void;
  onClose: () => void;
}) {
  const [offers] = useState(() => generateSponsorOffers(tier));
  const [selected, setSelected] = useState<Sponsor | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    haptic("success");
    onSelect(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border" style={{ background: "var(--primary)" }}>
          <span className="text-xs font-bold text-white">Sponsor Anlaşması</span>
          <button onClick={onClose} className="tm-tap p-1 text-white/80">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto tm-thin-scrollbar p-3 space-y-2">
          <div className="text-[10px] text-muted-foreground text-center mb-2">
            Sezon başı sponsor teklifleri. Birini seç, gelir haftalık olarak yansısın.
          </div>
          {offers.map((s, i) => (
            <SponsorCard
              key={i}
              sponsor={s}
              selected={selected?.name === s.name}
              onSelect={() => setSelected(s)}
            />
          ))}
        </div>
        <div className="p-3 border-t border-border">
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className={cn(
              "tm-tap w-full py-2.5 rounded-lg text-sm font-bold",
              selected ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
            )}
          >
            {selected ? `✓ ${selected.name} ile anlaştım` : "Sponsor Seç"}
          </button>
        </div>
      </div>
    </div>
  );
}
