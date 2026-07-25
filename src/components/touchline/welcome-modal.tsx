"use client";

import { useState } from "react";
import { Trophy, Sparkles, Gift, X, ChevronRight, Shield, Coins } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * v2.9.20 GÖREV 7 — Yeni kullanıcı hoş geldin modal'ı.
 *
 * İlk kez giriş yapan kullanıcıya gösterilir (onboarding.hasSeenWelcome = false).
 * 3 adımdan oluşur:
 *   1. Hoş geldin + takım adı
 *   2. 7 günlük grace period (deneme süresi) — kredi hediyesi + antrenman bonusu
 *   3. İlk adımlar (taktik ayarla, maç oyna, transfer yap)
 *
 * Modal kapatılınca onboarding.hasSeenWelcome = true set edilir.
 */

type WelcomeStep = "intro" | "grace" | "next_steps";

export function WelcomeModal() {
  const onboarding = useAppStore((s) => s.onboarding);
  const managerName = useAppStore((s) => s.managerName);
  const myTeam = useAppStore((s) => s.clubs.find((c) => c.id === s.myTeamId));
  const credits = useAppStore((s) => s.credits);

  const [step, setStep] = useState<WelcomeStep>("intro");
  const [dismissed, setDismissed] = useState(false);

  // Modal gösterilme koşulu:
  // 1. onboarding yüklendi
  // 2. hasSeenWelcome = false
  // 3. dismissed = false
  if (!onboarding || onboarding.hasSeenWelcome || dismissed) {
    return null;
  }

  const handleClose = () => {
    useAppStore.setState({
      onboarding: {
        ...onboarding,
        hasSeenWelcome: true,
      },
    });
    setDismissed(true);
  };

  const handleNext = () => {
    if (step === "intro") setStep("grace");
    else if (step === "grace") setStep("next_steps");
    else handleClose();
  };

  const handleSkip = () => {
    handleClose();
  };

  // Grace period kalan süre
  const graceRemaining = onboarding.gracePeriodEndsAt
    ? Math.max(0, onboarding.gracePeriodEndsAt - Date.now())
    : 0;
  const daysLeft = Math.ceil(graceRemaining / (24 * 60 * 60 * 1000));
  const isGraceActive = graceRemaining > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="tm-card w-full max-w-[340px] overflow-hidden">
        {/* Header gradient */}
        <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-emerald-900/40 to-purple-900/30 border-b border-border">
          <button
            onClick={handleSkip}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
            aria-label="Kapat"
          >
            <X size={14} className="text-white/80" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--primary)" }}>
              <Trophy size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {step === "intro" && "Hoş Geldin!"}
                {step === "grace" && "Deneme Süresi"}
                {step === "next_steps" && "İlk Adımlar"}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Adım {step === "intro" ? 1 : step === "grace" ? 2 : 3} / 3
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {step === "intro" && (
            <>
              <p className="text-sm leading-relaxed">
                Merhaba <span className="font-bold">{managerName || "Menajer"}</span>! 👋
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Touchline Manager'a hoş geldin. {myTeam?.name ?? "Takımın"} menajeri olarak
                takımını zirveye taşıyacaksın. İlk hafta başlamak için biraz bilgi verelim.
              </p>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Sparkles size={14} />
                  Senin Takımın
                </div>
                <p className="text-sm font-bold">{myTeam?.name ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">
                  Lig tier: {myTeam?.leagueTier ?? 4} • Bütçe: {(myTeam?.budget ?? 0).toLocaleString("tr-TR")} €
                </p>
              </div>
            </>
          )}

          {step === "grace" && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Gift size={16} className="text-purple-400" />
                <h3 className="text-sm font-bold">7 Günlük Deneme Süresi</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                İlk 7 gün boyunca <span className="text-purple-300 font-semibold">deneme süresi</span> avantajların var:
              </p>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <Coins size={14} className="text-amber-300 mt-0.5 shrink-0" />
                  <span>
                    <span className="font-bold">50 bonus kredi</span> — kozmetik öğeler için
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles size={14} className="text-emerald-300 mt-0.5 shrink-0" />
                  <span>
                    <span className="font-bold">Çift antrenman XP'si</span> — oyuncuların daha hızlı gelişir
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield size={14} className="text-sky-300 mt-0.5 shrink-0" />
                  <span>
                    <span className="font-bold">Transfer ücreti yok</span> — ilk 3 transferde komisyon yok
                  </span>
                </li>
              </ul>
              {isGraceActive ? (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-purple-300/80">Kalan süre</p>
                  <p className="text-base font-bold text-purple-200">{daysLeft} gün</p>
                </div>
              ) : (
                <p className="text-[10px] text-amber-400 text-center">
                  Deneme süresi sona erdi
                </p>
              )}
            </>
          )}

          {step === "next_steps" && (
            <>
              <h3 className="text-sm font-bold">İlk Adımların</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                Hızlı başlamak için:
              </p>
              <div className="space-y-2">
                <NextStepItem
                  num={1}
                  title="Taktiklerini Ayarla"
                  desc="Formasyon, çizgiler, roller — alt sekmeden 'Taktik' bölümüne git"
                />
                <NextStepItem
                  num={2}
                  title="İlk Maçını Oyna"
                  desc="'Maç' sekmesinden haftalık fikstüründeki rakiple oyna"
                />
                <NextStepItem
                  num={3}
                  title="Transfer Yap"
                  desc="'Transfer' sekmesinden serbest oyuncuları kadroya kat"
                />
                <NextStepItem
                  num={4}
                  title="Antrenman Planla"
                  desc="'Diğer' menüsünden 'Antrenman' ile oyuncularını geliştir"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-2">
          <button
            onClick={handleSkip}
            className="tm-tap flex-1 py-2.5 rounded-lg text-xs font-semibold text-muted-foreground border border-border"
          >
            Atla
          </button>
          <button
            onClick={handleNext}
            className="tm-tap flex-[2] py-2.5 rounded-lg text-xs font-bold text-white shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
            style={{ background: "var(--primary)" }}
          >
            {step === "intro" && "Devam"}
            {step === "grace" && "Devam"}
            {step === "next_steps" && "Başla"}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function NextStepItem({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-2.5 p-2.5 rounded-lg bg-card border border-border">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold" style={{ background: "var(--primary)", color: "white" }}>
        {num}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold">{title}</p>
        <p className="text-[10px] text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/**
 * Hook: Kullanıcı grace period'da mı?
 * v2.9.20 GÖREV 7 — antrenman XP bonusu, transfer ücretsiz gibi avantajlar için.
 */
export function useIsInGracePeriod(): boolean {
  return useAppStore((s) => {
    if (!s.onboarding?.gracePeriodEndsAt) return false;
    return Date.now() < s.onboarding.gracePeriodEndsAt;
  });
}

/**
 * Hook: Onboarding adımı tamamlandı mı?
 */
export function useOnboardingStepCompleted(step: string): boolean {
  return useAppStore((s) => {
    return s.onboarding?.stepsCompleted?.includes(step) ?? false;
  });
}

/**
 * Action: Onboarding adımını tamamlandı olarak işaretle.
 */
export function completeOnboardingStep(step: string) {
  const state = useAppStore.getState();
  const onboarding = state.onboarding;
  if (!onboarding) return;
  if (onboarding.stepsCompleted.includes(step)) return;
  useAppStore.setState({
    onboarding: {
      ...onboarding,
      stepsCompleted: [...onboarding.stepsCompleted, step],
    },
  });
}
