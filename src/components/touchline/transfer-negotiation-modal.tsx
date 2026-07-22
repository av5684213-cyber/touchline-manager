"use client";

// ADDED: TransferNegotiationModal — gelişmiş transfer/kiralık argümanları
// Sell-on clause, performance bonus, buy-back, takas, taksit, min appearances

import { useState } from "react";
import { X, ArrowLeftRight } from "lucide-react";
import { useAppStore, useMyTeam } from "@/lib/store";
import { useI18n } from "@/lib/i18n/locale-provider";
import { formatEuro } from "@/lib/format";
import { incrementTransferCount } from "@/components/touchline/achievements";
import { haptic, useBodyScrollLock, useEscapeToClose } from "@/hooks/touchline"  // P0: escape + scroll lock;
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/mock/data";

export function TransferNegotiationModal({
  player,
  askingPrice,
  onClose,
}: {
  player: Player;
  askingPrice: number;
  onClose: () => void;
}) {
  const myTeam = useMyTeam();
  const { t, locale } = useI18n();
  const [isLoan, setIsLoan] = useState(false);
  useEscapeToClose(onClose);
  useBodyScrollLock(true);

  // Transfer argümanları
  const [sellOnPercent, setSellOnPercent] = useState(0);
  const [performanceBonusGoals, setPerformanceBonusGoals] = useState(0);
  const [buyBackAmount, setBuyBackAmount] = useState(0);
  const [exchangePlayerId, setExchangePlayerId] = useState<string>("");
  const [installmentMonths, setInstallmentMonths] = useState(0); // 0 = peşin

  // Kiralık argümanları
  const [loanFee, setLoanFee] = useState(Math.round(askingPrice * 0.1));
  const [loanWeeks, setLoanWeeks] = useState(12);
  const [minAppearances, setMinAppearances] = useState(0);

  // Teklif gönder
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = () => {
    haptic("medium");
    // AI pazarlık değerlendirmesi — basit puanlama
    let aiScore = 50;
    // Sell-on clause: %10+ ise AI daha kabul edici
    if (sellOnPercent >= 10) aiScore += 10;
    if (sellOnPercent >= 20) aiScore += 5;
    // Buy-back: yüksek fiyat ise AI sever
    if (buyBackAmount >= askingPrice * 1.5) aiScore += 10;
    // Taksit: AI taksit sevmez (nakit tercih) — max 12 tur (her maç 1 tur)
    if (installmentMonths === 0) aiScore += 10;
    else if (installmentMonths <= 6) aiScore += 0;
    else aiScore -= 5;
    // Performance bonus: ek gelir
    if (performanceBonusGoals > 0) aiScore += 5;
    // Takas: oyuncu değeri kontrol
    const exchangePlayer = myTeam?.players.find((p) => p.id === exchangePlayerId);
    if (exchangePlayer) {
      if (exchangePlayer.marketValue >= askingPrice * 0.5) aiScore += 15;
      else aiScore -= 5;
    }

    // Random factor
    aiScore += Math.floor(Math.random() * 20) - 10;

    if (aiScore >= 60) {
      haptic("success");
      setFeedback(`✓ Teklif KABUL EDİLDİ! ${player.firstName} ${player.lastName} takımına katılıyor.`);
      // Transfer'i uygula
      setTimeout(() => {
        const result = useAppStore.getState().buyPlayer(player.id, askingPrice, player.weeklyWage, 3);
        if (result.success) {
          try {
            incrementTransferCount();
          } catch (e) { /* achievements yüklenemezse devam */ }
        }
        onClose();
      }, 1500);
    } else if (aiScore >= 40) {
      haptic("medium");
      setFeedback(`↩ Karşı teklif: ${formatEuro(Math.round(askingPrice * 1.1), locale)}. Şartları yumuşat.`);
    } else {
      haptic("error");
      setFeedback(`✗ Teklif REDDEDİLDİ. AI şartları yetersiz buldu.`);
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleLoanSubmit = () => {
    haptic("medium");
    // Kiralık pazarlık — min appearances yüksekse AI sever (zorunlu oynatma)
    let aiScore = 50;
    if (minAppearances >= 15) aiScore += 15;
    if (loanFee >= askingPrice * 0.1) aiScore += 10;
    aiScore += Math.floor(Math.random() * 20) - 10;

    if (aiScore >= 55) {
      haptic("success");
      // P0 FIX: Gerçekten makeLoanOffer çağır — oyuncu kadroya eklensin
      const result = useAppStore.getState().makeLoanOffer(player.id, loanFee, loanWeeks);
      if (result.success && result.response === "accepted") {
        setFeedback(`✓ Kiralık anlaşması KABUL EDİLDİ! ${loanWeeks} haftalığına kiralandı.`);
        setTimeout(() => onClose(), 1500);
      } else {
        haptic("error");
        setFeedback(`✗ ${result.reason === "budget" ? "Bütçe yetersiz" : result.reason === "squad-full" ? "Kadro dolu" : result.reason === "gk-limit" ? "3 kaleci limiti" : "Kiralık teklif reddedildi"}`);
      }
    } else {
      haptic("error");
      setFeedback(`✗ Kiralık teklif REDDEDİLDİ. Daha yüksek ücret veya oynatma şartı gerek.`);
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="close" />
      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-primary" />
            Gelişmiş Pazarlık
          </h3>
          <button onClick={onClose} className="tm-tap p-1">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto tm-thin-scrollbar p-4 space-y-3">
          {/* Player summary */}
          <div className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-md">
            <div className="flex-1">
              <div className="text-sm font-bold">{player.firstName} {player.lastName}</div>
              <div className="text-[11px] text-muted-foreground">
                {player.specificPosition} · {player.age} yaş · OVR {player.rating}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground">Bonservis</div>
              <div className="text-sm font-bold tabular-nums">{formatEuro(askingPrice, locale)}</div>
            </div>
          </div>

          {/* Transfer/Kiralık toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-md">
            <button
              onClick={() => { haptic("light"); setIsLoan(false); }}
              className={cn("flex-1 py-1.5 rounded text-[11px] font-bold", !isLoan ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              Transfer
            </button>
            <button
              onClick={() => { haptic("light"); setIsLoan(true); }}
              className={cn("flex-1 py-1.5 rounded text-[11px] font-bold", isLoan ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              Kiralık
            </button>
          </div>

          {!isLoan ? (
            <>
              {/* Transfer Argümanları */}
              <div className="space-y-3">
                {/* Sell-on clause */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Sonraki Satış Payı: %{sellOnPercent}
                  </label>
                  <input
                    type="range" min={0} max={30} step={5}
                    value={sellOnPercent}
                    onChange={(e) => setSellOnPercent(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted accent-primary"
                  />
                  <div className="text-[11px] text-muted-foreground">Gelecekte satarsan %'si rakibe gider</div>
                </div>

                {/* Performance bonus */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Performans Bonusu: {performanceBonusGoals} gol eşiği
                  </label>
                  <input
                    type="range" min={0} max={30} step={5}
                    value={performanceBonusGoals}
                    onChange={(e) => setPerformanceBonusGoals(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted accent-primary"
                  />
                  <div className="text-[11px] text-muted-foreground">{performanceBonusGoals > 0 ? `${performanceBonusGoals} golde ${formatEuro(askingPrice * 0.1, locale)} bonus` : "Bonus yok"}</div>
                </div>

                {/* Buy-back */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Geri Alma Opsiyonu
                  </label>
                  <input
                    type="number"
                    value={buyBackAmount || ""}
                    placeholder="0 = yok"
                    onChange={(e) => setBuyBackAmount(Number(e.target.value))}
                    className="w-full bg-card border border-border rounded-md px-2 py-1 text-xs font-bold tabular-nums mt-1"
                  />
                  <div className="text-[11px] text-muted-foreground">Bu fiyattan geri alabilirsin</div>
                </div>

                {/* Exchange player */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Takas + Para
                  </label>
                  <select
                    value={exchangePlayerId}
                    onChange={(e) => setExchangePlayerId(e.target.value)}
                    className="w-full bg-card border border-border rounded-md px-2 py-1 text-xs font-bold mt-1"
                  >
                    <option value="">Takas yok</option>
                    {myTeam?.players
                      .filter((p) => p.id !== player.id)
                      .sort((a, b) => b.marketValue - a.marketValue)
                      .slice(0, 10)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} — {formatEuro(p.marketValue, locale)}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Installment */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Taksitlendirme
                  </label>
                  <div className="flex gap-1 mt-1">
                    {[0, 3, 6, 12].map((months) => (
                      <button
                        key={months}
                        onClick={() => { haptic("light"); setInstallmentMonths(months); }}
                        className={cn("flex-1 py-1 rounded text-[10px] font-bold border",
                          installmentMonths === months ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card")}
                      >
                        {months === 0 ? "Peşin" : `${months} tur`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Kiralık Argümanları */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Kira Ücreti: {formatEuro(loanFee, locale)}
                  </label>
                  <input
                    type="range" min={Math.round(askingPrice * 0.05)} max={Math.round(askingPrice * 0.3)} step={Math.round(askingPrice * 0.01)}
                    value={loanFee}
                    onChange={(e) => setLoanFee(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted accent-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Süre: {loanWeeks} hafta
                  </label>
                  <input
                    type="range" min={4} max={34} step={2}
                    value={loanWeeks}
                    onChange={(e) => setLoanWeeks(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted accent-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Zorunlu Oynatma Şartı: {minAppearances} maç (ilk 11)
                  </label>
                  <input
                    type="range" min={0} max={30} step={5}
                    value={minAppearances}
                    onChange={(e) => setMinAppearances(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted accent-primary"
                  />
                  <div className="text-[11px] text-muted-foreground">
                    {minAppearances > 0
                      ? `${minAppearances} maçta ilk 11'de oynamazsan ceza ödersin`
                      : "Şart yok — serbest oynatma"}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Feedback */}
          {feedback && (
            <div className={cn(
              "p-2.5 rounded-md text-center text-xs font-bold",
              feedback.startsWith("✓") ? "bg-emerald-500/20 text-emerald-300"
              : feedback.startsWith("↩") ? "bg-amber-500/20 text-amber-300"
              : "bg-red-500/20 text-red-300"
            )}>
              {feedback}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={isLoan ? handleLoanSubmit : handleSubmit}
            className="tm-tap w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold"
          >
            {isLoan ? "Kiralık Teklifi Gönder" : "Transfer Teklifi Gönder"}
          </button>
        </div>
      </div>
    </div>
  );
}
