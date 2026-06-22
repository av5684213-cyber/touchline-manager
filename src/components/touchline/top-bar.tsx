"use client";

import { useI18n } from "@/lib/i18n/locale-provider";
import { LocaleSwitcher } from "@/lib/i18n/locale-switcher";
import { useAppStore } from "@/lib/store";
import { ClubBadge } from "./ui-bits";
import { formatEuro } from "@/lib/format";

export function TopBar() {
  const { t, locale } = useI18n();
  const { clubs, myTeamId, managerName } = useAppStore();
  const team = clubs.find((c) => c.id === myTeamId);

  return (
    <header
      className="tm-safe-top text-white"
      style={{ background: "var(--primary)" }}
    >
      <div className="px-4 pt-2 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">
            {t("app.name")}
          </div>
          <LocaleSwitcher />
        </div>
        <div className="flex items-center gap-3">
          {team && (
            <>
              <ClubBadge
                short={team.shortName}
                primaryColor={team.primaryColor}
                size={44}
              />
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold leading-tight truncate">
                  {team.name}
                </div>
                <div className="text-[11px] opacity-80 truncate">
                  {t("dash.season")} {t("app.tagline") !== "app.tagline" ? "" : ""}
                  2025–26 · {t("dash.1lig")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] opacity-70 uppercase tracking-wide">
                  {t("dash.budget")}
                </div>
                <div className="text-sm font-bold tabular-nums">
                  {formatEuro(team.budget, locale)}
                </div>
              </div>
            </>
          )}
          {!team && (
            <div className="text-sm opacity-70">
              {t("auth.demo.title")} — {managerName}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
