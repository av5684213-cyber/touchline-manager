"use client";

import { useEffect, useState } from "react";
import { Trophy, Sparkles, X, ChevronRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { completeOnboardingStep, useOnboardingStepCompleted } from "./welcome-modal";
import { cn } from "@/lib/utils";

/**
 * v2.9.147: FirstWinCelebration
 *
 * Kullanıcı ilk hazırlık maçını kazandığında gösterilen tek seferlik kutlama ekranı.
 *
 * Tetiklenme koşulu:
 *   - onboarding.stepsCompleted içinde 'first_win' YOK
 *   - Kullanıcı hazırlık maçından galibiyetle çıkmış (lastMatchResult.result === 'win')
 *   - Maç "hazırlık" tipinde (friendly) — resmi lig maçı değil, çünkü kullanıcı
 *     kolay rakiple ilk galibiyetini yaşasın diye bu ekran tasarlandı.
 *
 * Modal kapatılınca completeOnboardingStep("first_win") çağrılır → bir daha gösterilmez.
 */
export function FirstWinCelebration() {
  const lastFriendlyResult = useAppStore((s) => s.lastFriendlyResult);
  const isFirstWinDone = useOnboardingStepCompleted("first_win");

  const [show, setShow] = useState(false);
  const [shownMatchKey, setShownMatchKey] = useState<string | null>(null);

  useEffect(() => {
    if (isFirstWinDone) return;
    if (!lastFriendlyResult) return;
    if (lastFriendlyResult.result !== "win") return;

    // Aynı maç için tekrar gösterme — matchKey (timestamp + score) ile takip
    const matchKey = `${lastFriendlyResult.playedAt ?? Date.now()}-${lastFriendlyResult.homeScore}-${lastFriendlyResult.awayScore}`;
    if (matchKey === shownMatchKey) return;

    setShow(true);
    setShownMatchKey(matchKey);
  }, [lastFriendlyResult, isFirstWinDone, shownMatchKey]);

  const handleClose = () => {
    completeOnboardingStep("first_win");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="tm-card w-full max-w-[340px] overflow-hidden relative">
        {/* Confetti background */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute top-4 left-4 text-2xl">🎉</div>
          <div className="absolute top-8 right-6 text-xl">⭐</div>
          <div className="absolute bottom-12 left-8 text-xl">🎊</div>
          <div className="absolute bottom-20 right-4 text-2xl">🏆</div>
          <div className="absolute top-16 left-12 text-lg">✨</div>
          <div className="absolute top-24 right-10 text-lg">💫</div>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 transition-colors z-10"
          aria-label="Kapat"
        >
          <X size={14} className="text-white/80" />
        </button>

        <div className="relative px-5 pt-6 pb-4 text-center">
          {/* Trophy icon */}
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
            <Trophy size={32} className="text-white" />
          </div>

          <h2 className="text-lg font-bold mb-1">İlk Galibiyetin! 🎉</h2>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Doğru taktikle her takımı yenebilirsin.
            <br />
            Bu sadece başlangıç — sonraki maçlar daha zorlu olacak.
          </p>

          {/* Reward strip */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 mb-3">
            <div className="flex items-center justify-center gap-1.5">
              <Sparkles size={14} className="text-amber-300" />
              <span className="text-[11px] font-semibold text-amber-200">
                +5 kredi hediye — bir sonraki transferine harca
              </span>
            </div>
          </div>

          {/* Score recap */}
          {lastFriendlyResult && (
            <div className="bg-card border border-border rounded-lg p-2.5 mb-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Maç Sonucu</div>
              <div className="flex items-center justify-center gap-3 text-base font-bold tabular-nums">
                <span>{lastFriendlyResult.homeName ?? "Sen"}</span>
                <span className="text-emerald-400">
                  {lastFriendlyResult.homeScore} - {lastFriendlyResult.awayScore}
                </span>
                <span>{lastFriendlyResult.awayName ?? "Rakip"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-2">
          <button
            onClick={handleClose}
            className="tm-tap flex-1 py-2.5 rounded-lg text-xs font-bold text-white shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
            style={{ background: "var(--primary)" }}
          >
            Devam et
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
