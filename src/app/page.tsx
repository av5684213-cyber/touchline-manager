"use client";

import { useState } from "react";
import { AuthGate } from "@/components/touchline/auth-gate";
import { TopBar } from "@/components/touchline/top-bar";
import { StickyQuickBar } from "@/components/touchline/sticky-quick-bar";
import {
  BottomNav,
  OTHER_TABS,
  type TabKey,
} from "@/components/touchline/bottom-nav";
import { DashboardScreen } from "@/components/touchline/screens/dashboard";
import { TacticsScreen } from "@/components/touchline/screens/tactics";
import { MatchScreen } from "@/components/touchline/screens/match";
import { TransferScreen } from "@/components/touchline/screens/transfer";
import { StandingsScreen } from "@/components/touchline/screens/standings";
import { FixtureScreen } from "@/components/touchline/screens/fixture";
import { ScoutingScreen } from "@/components/touchline/screens/scouting";
import { YouthAcademyScreen } from "@/components/touchline/screens/youth-academy";
import { FacilitiesScreen } from "@/components/touchline/screens/facilities";
import { FinanceScreen } from "@/components/touchline/screens/finance";
import { AwardsScreen } from "@/components/touchline/screens/awards";
import { CupScreen } from "@/components/touchline/screens/cup";
import { WeeklyReportScreen } from "@/components/touchline/screens/weekly-report";
import { ComingSoonScreen } from "@/components/touchline/screens/coming-soon";
import { OtherDrawer } from "@/components/touchline/other-drawer";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useSwipe, useBodyScrollLock } from "@/hooks/touchline";

const TAB_ORDER: TabKey[] = [
  "dashboard",
  "tactics",
  "match",
  "transfer",
];

export default function Home() {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [otherOpen, setOtherOpen] = useState(false);

  useBodyScrollLock(otherOpen);

  const idx = TAB_ORDER.indexOf(tab);
  useSwipe({
    onLeft: () => {
      if (idx >= 0 && idx < TAB_ORDER.length - 1) {
        setTab(TAB_ORDER[idx + 1]);
      }
    },
    onRight: () => {
      if (idx > 0) {
        setTab(TAB_ORDER[idx - 1]);
      }
    },
  });

  const handleSelectFromOther = (k: TabKey) => {
    setTab(k);
    setOtherOpen(false);
  };

  // Maç ekranında TopBar ve StickyQuickBar gizlenir (full-screen maç deneyimi)
  const isMatch = tab === "match";

  return (
    <AuthGate>
      <div className="tm-app-shell flex flex-col">
        {isMatch && <TopBar compact />}
        {!isMatch && <StickyQuickBar activeTab={tab} onChange={setTab} />}
        <main className="flex-1 overflow-y-auto tm-thin-scrollbar">
          {tab === "dashboard" && <DashboardScreen />}
          {tab === "tactics" && <TacticsScreen />}
          {tab === "match" && <MatchScreen />}
          {tab === "transfer" && <TransferScreen />}
          {tab === "standings" && <StandingsScreen />}
          {tab === "fixture" && <FixtureScreen />}
          {tab === "scouting" && <ScoutingScreen />}
          {tab === "youth" && <YouthAcademyScreen />}
          {tab === "facilities" && <FacilitiesScreen />}
          {tab === "finance" && <FinanceScreen />}
          {tab === "awards" && <AwardsScreen />}
          {tab === "cup" && <CupScreen />}
          {tab === "reports" && <WeeklyReportScreen />}
          {tab === "friendly" && <ComingSoonScreen title="Hazırlık Maçı" />}
        </main>
        <BottomNav
          active={tab}
          onChange={setTab}
          onOpenOther={() => setOtherOpen(true)}
        />
        <OtherDrawer
          open={otherOpen}
          onClose={() => setOtherOpen(false)}
          onSelect={handleSelectFromOther}
          activeTab={tab}
          tabs={OTHER_TABS}
        />
      </div>
    </AuthGate>
  );
}
