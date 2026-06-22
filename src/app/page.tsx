"use client";

import { useState } from "react";
import { AuthGate } from "@/components/touchline/auth-gate";
import { TopBar } from "@/components/touchline/top-bar";
import { BottomNav, type TabKey } from "@/components/touchline/bottom-nav";
import { DashboardScreen } from "@/components/touchline/screens/dashboard";
import { TacticsScreen } from "@/components/touchline/screens/tactics";
import { ComingSoonScreen } from "@/components/touchline/screens/coming-soon";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useSwipe } from "@/hooks/touchline";

const TAB_ORDER: TabKey[] = ["dashboard", "tactics", "match", "transfer", "finance"];

export default function Home() {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>("dashboard");

  const idx = TAB_ORDER.indexOf(tab);
  useSwipe({
    onLeft: () => setTab(TAB_ORDER[Math.min(TAB_ORDER.length - 1, idx + 1)]),
    onRight: () => setTab(TAB_ORDER[Math.max(0, idx - 1)]),
  });

  return (
    <AuthGate>
      <div className="tm-app-shell flex flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto tm-thin-scrollbar">
          {tab === "dashboard" && <DashboardScreen />}
          {tab === "tactics" && <TacticsScreen />}
          {tab === "match" && <ComingSoonScreen title={t("nav.match")} />}
          {tab === "transfer" && <ComingSoonScreen title={t("nav.transfer")} />}
          {tab === "finance" && <ComingSoonScreen title={t("nav.finance")} />}
        </main>
        <BottomNav active={tab} onChange={setTab} />
      </div>
    </AuthGate>
  );
}
