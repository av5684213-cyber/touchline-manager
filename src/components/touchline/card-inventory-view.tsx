"use client";

import { useState, useMemo } from "react";
import { Archive, Coins, Wand2, X, Crown, ChevronRight, Info } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import {
  getCardById,
  getRarityColor,
  getRarityLabel,
  getLevelColor,
  getLevelLabel,
  getGroupLabel,
  type ShopCard,
} from "@/lib/card-system";

/**
 * v2.9.28 GÖREV 5+6: Envanter görünümü.
 *
 * Kullanıcının satın aldığı kartları listeler.
 * Her kart tıklanınca açıklama modal'ı açılır.
 * Açıklama modal'ında "Kart Bas" butonu — oyuncu seçip kartı uygula.
 */
export function CardInventoryView({
  onApplyCard,
}: {
  onApplyCard: (card: ShopCard) => void;
}) {
  const cardInventory = useAppStore((s) => s.cardInventory);
  const [selectedCard, setSelectedCard] = useState<{ card: ShopCard; quantity: number } | null>(null);

  // Envanterdeki kartları ShopCard ile eşleştir
  const inventoryCards = useMemo(() => {
    return cardInventory
      .map(item => {
        const shopCard = getCardById(item.cardId);
        if (!shopCard) return null;
        return { ...shopCard, quantity: item.quantity };
      })
      .filter(Boolean) as (ShopCard & { quantity: number })[];
  }, [cardInventory]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="tm-card p-3 bg-gradient-to-br from-indigo-900/20 to-purple-900/10 border-indigo-500/30">
        <div className="flex items-center gap-2 mb-1">
          <Archive size={16} className="text-indigo-400" />
          <span className="text-sm font-bold">Envanterim</span>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {inventoryCards.length} farklı kart
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Satın aldığın kartlar burada birikir. Bir karta tıkla → açıklamasını oku → oyuncuna bas.
        </p>
      </div>

      {/* Boş envanter */}
      {inventoryCards.length === 0 && (
        <div className="tm-card p-8 text-center space-y-2">
          <Archive size={32} className="text-muted-foreground/50 mx-auto mb-2" />
          <div className="text-sm font-bold text-muted-foreground">Envanterin boş</div>
          <div className="text-[11px] text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
            "Kartlar" sekmesinden trait/arketip kartları satın al. Aldığın kartlar burada birikecek.
          </div>
        </div>
      )}

      {/* Kart grid */}
      {inventoryCards.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {inventoryCards.map((card) => (
            <button
              key={card.cardId}
              onClick={() => {
                haptic("light");
                setSelectedCard({ card, quantity: card.quantity });
              }}
              className={cn(
                "tm-tap relative rounded-xl p-3 flex flex-col gap-1.5 border-2 transition-all active:scale-[0.97] text-left",
                getRarityColor(card.rarity)
              )}
            >
              {/* Quantity badge */}
              <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-[9px] font-bold">
                ×{card.quantity}
              </div>

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

              {/* Description kısa */}
              <div className="text-[9px] text-muted-foreground leading-tight line-clamp-2 flex-1">
                {card.description}
              </div>

              {/* Detay için ipucu */}
              <div className="flex items-center justify-end gap-0.5 text-[9px] text-indigo-400 font-bold pt-0.5">
                <Info size={9} /> Detay
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Kart detay modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard.card}
          quantity={selectedCard.quantity}
          onClose={() => setSelectedCard(null)}
          onApply={() => {
            onApplyCard(selectedCard.card);
            setSelectedCard(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Kart detay modal — açıklama + etkiler + "Kart Bas" butonu
 */
function CardDetailModal({
  card,
  quantity,
  onClose,
  onApply,
}: {
  card: ShopCard;
  quantity: number;
  onClose: () => void;
  onApply: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="tm-card w-full max-w-[360px] max-h-[80vh] overflow-y-auto tm-thin-scrollbar">
        {/* Header */}
        <div className={cn("p-4 border-b border-border", getRarityColor(card.rarity))}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {card.cardType === "trait_positive" && <Wand2 size={14} className="text-emerald-400" />}
                {card.cardType === "trait_negative_removal" && <X size={14} className="text-red-400" />}
                {card.cardType === "arketip" && <Crown size={14} className="text-amber-400" />}
                <span className="text-[10px] text-muted-foreground uppercase font-bold">
                  {getRarityLabel(card.rarity)}
                </span>
              </div>
              <h2 className="text-base font-bold leading-tight">{card.cardName}</h2>
              {card.level && (
                <div className={cn("text-[11px] font-bold mt-0.5", getLevelColor(card.level))}>
                  {getLevelLabel(card.level)} seviyesi
                </div>
              )}
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {getGroupLabel(card.groupName)}
              </div>
            </div>
            <button onClick={onClose} className="tm-tap p-1 text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Açıklama */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Açıklama</div>
            <p className="text-xs leading-relaxed">{card.description}</p>
          </div>

          {/* Kart tipi açıklaması */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Kart Tipi</div>
            <div className="text-xs font-semibold">
              {card.cardType === "trait_positive" && "🟢 Pozitif Trait Kartı"}
              {card.cardType === "trait_negative_removal" && "🔴 Negatif Özellik Giderme Kartı"}
              {card.cardType === "arketip" && "🟡 Arketip Kartı"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              {card.cardType === "trait_positive" && "Bu kartı bir oyuncuya basarak ona yeni bir pozitif trait eklersin. Trait maç motorunu etkiler."}
              {card.cardType === "trait_negative_removal" && "Bu kartı bir oyuncuya basarak ondaki negatif trait'i kaldırırsın. Penaltı geri alınır."}
              {card.cardType === "arketip" && "Bu kartı bir oyuncuya basarak arketipini değiştirirsin. Yeni arketip maç motoru profilini belirler."}
            </p>
          </div>

          {/* Efekt detayı */}
          {card.effectData && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Etki Detayı</div>
              <div className="text-[11px] space-y-1">
                {card.cardType === "trait_positive" && card.effectData.engineEffect && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maç Motoru Etkisi:</span>
                    <span className="font-bold text-emerald-400">
                      %{Math.round((card.effectData.engineEffect.engineWeight ?? 0) * 100)}
                    </span>
                  </div>
                )}
                {card.cardType === "trait_negative_removal" && card.effectData.penalty && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kaldırılan Negatif:</span>
                      <span className="font-bold text-red-400">{card.effectData.negTraitName}</span>
                    </div>
                    <div className="text-muted-foreground">Geri alınan penaltılar:</div>
                    {Object.entries(card.effectData.penalty).map(([stat, val]) => (
                      <div key={stat} className="flex justify-between pl-3">
                        <span className="text-muted-foreground">{stat}:</span>
                        <span className="font-bold text-emerald-400">+{Math.abs(val as number)}</span>
                      </div>
                    ))}
                  </>
                )}
                {card.cardType === "arketip" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Yeni Arketip:</span>
                    <span className="font-bold text-amber-400">{card.effectData.arketip}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Adet */}
          <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Envanterdeki Adet</span>
            <span className="text-sm font-bold text-emerald-400">×{quantity}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-2">
          <button
            onClick={onClose}
            className="tm-tap flex-1 py-2.5 rounded-lg text-xs font-bold border border-border text-muted-foreground"
          >
            Kapat
          </button>
          <button
            onClick={onApply}
            disabled={quantity <= 0}
            className="tm-tap flex-[2] py-2.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Wand2 size={13} />
            Kart Bas
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
