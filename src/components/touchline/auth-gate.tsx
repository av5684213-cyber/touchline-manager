"use client";

import { useI18n } from "@/lib/i18n/locale-provider";
import { LocaleSwitcher } from "@/lib/i18n/locale-switcher";
import { useAppStore } from "@/lib/store";
import { Trophy } from "lucide-react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { isAuthed, loginDemo } = useAppStore();

  if (isAuthed) return <>{children}</>;

  return (
    <div className="tm-app-shell flex flex-col">
      <header
        className="tm-safe-top text-white"
        style={{ background: "var(--primary)" }}
      >
        <div className="px-4 pt-3 pb-4 flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">
            {t("app.name")}
          </div>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: "var(--primary)" }}
        >
          <Trophy size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-1">{t("app.name")}</h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-[260px]">
          {t("auth.demo.subtitle")}
        </p>

        <button
          onClick={() => loginDemo()}
          className="tm-tap w-full max-w-[280px] py-3 rounded-xl text-sm font-bold text-white shadow-md active:scale-[0.98] transition-transform"
          style={{ background: "var(--primary)" }}
        >
          {t("auth.demo.cta")}
        </button>

        <p className="text-[11px] text-muted-foreground mt-6 max-w-[260px]">
          {t("auth.demo.note")}
        </p>
      </main>
    </div>
  );
}
