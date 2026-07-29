"use client";

import { useState, useMemo } from "react";
import { X, Wand2, Check, AlertCircle, Crown } from "lucide-react";
import { useAppStore, useMyTeam } from "@/lib/store";
import { PlayerAvatar, PositionPill, RatingBadge } from "./ui-bits";
import { POSITION_GROUP, ARKETIPLER } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { haptic, useBodyScrollLock, useEscapeToClose } from "@/hooks/touchline";
import type { ShopCard } from "@/lib/card-system";

/**
 * v2.9.28 GÖREV 4: Kart Basma Modal'ı.
 *
 * Kullanıcı bir kart seçip oyuncuya uygular.
 * - Pozitif trait: oyuncuya trait ekler
 * - Negatif giderme: sadece ilgili negatif trait'e sahip oyunculara uygulanabilir
 * - Arketip: oyuncunun arketipini değiştirir
 *
 * Uygun olmayan oyuncular görsel olarak ayırt edilir (gri, uygulanamaz rozeti).
 */
export function CardApplyModal({
  card,
  onClose,
}: {
  card: ShopCard;
  onClose: () => void;
}) {
  const myTeam = useMyTeam();
  const applyCardToPlayer = useAppStore((s) => s.applyCardToPlayer);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  useEscapeToClose(onClose);
  useBodyScrollLock(true);

  // Kartın bu oyuncuya uygulanabilir olup olmadığını kontrol et
  const isApplicableToPlayer = (player: any): boolean => {
    if (card.cardType === "trait_positive") {
      // Aynı trait varsa tekrar ekleme
      return !(player.traits ?? []).includes(card.cardName);
    }
    if (card.cardType === "trait_negative_removal") {
      // İlgili negatif trait oyuncuda var mı?
      const negTraitName = card.effectData?.negTraitName;
      return (player.negTraits ?? []).includes(negTraitName);
    }
    if (card.cardType === "arketip") {
      // v2.9.31: Pozisyon uyumu kontrolü — defans oyuncusuna forvet arketipi basılamaz
      const validArketips = ARKETIPLER[player.specificPosition] ?? [];
      if (!validArketips.includes(card.cardName)) return false;
      // Aynı arketip varsa değiştirme
      return player.archetype !== card.cardName;
    }
    return false;
  };

  // Oyuncuları pozisyon grubuna göre sırala
  const sortedPlayers = useMemo(() => {
    if (!myTeam?.players) return [];
    const order = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
    return [...myTeam.players].sort((a, b) => {
      const ga = POSITION_GROUP[a.specificPosition] ?? "MID";
      const gb = POSITION_GROUP[b.specificPosition] ?? "MID";
      return (order[ga as keyof typeof order] ?? 2) - (order[gb as keyof typeof order] ?? 2);
    });
  }, [myTeam]);

  const handleApply = () => {
    if (!selectedPlayerId) return;
    haptic("medium");
    const result = applyCardToPlayer(card.cardId, selectedPlayerId);
    if (result.success) {
      haptic("success");
      setFeedback("✓ Kart başarıyla basıldı!");
      setApplied(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      haptic("error");
      setFeedback(`✗ ${result.reason ?? "Kart uygulanamadı"}`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="tm-card w-full max-w-[400px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 size={16} className="text-primary" />
            <span className="text-sm font-bold">Kart Bas: {card.cardName}</span>
          </div>
          <button onClick={onClose} className="tm-tap p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Kart bilgisi */}
        <div className="p-3 bg-muted/20 border-b border-border">
          <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Kart Açıklaması</div>
          <p className="text-[11px] leading-relaxed">{card.description}</p>
          {card.cardType === "trait_negative_removal" && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-1.5">
              <AlertCircle size={11} />
              Bu kart sadece "{card.effectData?.negTraitName}" negatif trait'ine sahip oyunculara uygulanabilir.
            </div>
          )}
        </div>

        {/* Oyuncu listesi */}
        <div className="flex-1 overflow-y-auto tm-thin-scrollbar p-2">
          <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2 px-1">
            Oyuncu Seç ({sortedPlayers.length})
          </div>
          <div className="space-y-1">
            {sortedPlayers.map((player) => {
              const applicable = isApplicableToPlayer(player);
              const isSelected = selectedPlayerId === player.id;
              return (
                <button
                  key={player.id}
                  onClick={() => {
                    if (!applicable) {
                      haptic("error");
                      return;
                    }
                    haptic("light");
                    setSelectedPlayerId(player.id);
                  }}
                  disabled={!applicable}
                  className={cn(
                    "tm-tap w-full flex items-center gap-2 p-2 rounded-lg border transition-colors text-left",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : applicable
                        ? "border-border hover:bg-accent/30"
                        : "border-border/50 opacity-40 cursor-not-allowed"
                  )}
                >
                  <PlayerAvatar initials={player.specificPosition} color={myTeam?.primaryColor ?? "#1a3a2a"} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate flex items-center gap-1">
                      {player.firstName} {player.lastName}
                      {isSelected && <Check size={12} className="text-primary" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <PositionPill label={player.specificPosition} group={POSITION_GROUP[player.specificPosition]} />
                      <span>{player.age} yaş</span>
                      {player.archetype && (
                        <span className="text-purple-400 truncate">{player.archetype}</span>
                      )}
                    </div>
                    {/* Trait rozetleri */}
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {(player.traits ?? []).slice(0, 2).map((t: string) => (
                        <span key={t} className="text-[8px] px-1 rounded bg-emerald-500/20 text-emerald-300">
                          {t}
                        </span>
                      ))}
                      {(player.negTraits ?? []).slice(0, 2).map((t: string) => (
                        <span key={t} className="text-[8px] px-1 rounded bg-red-500/20 text-red-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <RatingBadge value={player.rating} />
                  {/* Uygulanamaz rozeti */}
                  {!applicable && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {card.cardType === "trait_positive" && (player.traits ?? []).includes(card.cardName) ? "Zaten var" :
                       card.cardType === "trait_negative_removal" ? "Uygun değil" :
                       "Aynı arketip"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={cn(
            "p-2 text-center text-[11px] font-bold border-t border-border",
            applied ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          )}>
            {feedback}
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-border flex gap-2">
          <button
            onClick={onClose}
            className="tm-tap flex-1 py-2.5 rounded-lg text-xs font-bold border border-border text-muted-foreground"
          >
            İptal
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedPlayerId || applied}
            className="tm-tap flex-[2] py-2.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {applied ? (
              <>
                <Check size={13} /> Basıldı
              </>
            ) : (
              <>
                <Wand2 size={13} /> Kartı Bas
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
