"use client";

import { useState } from "react";
import { AuthGate } from "@/components/touchline/auth-gate";
import { TopBar } from "@/components/touchline/top-bar";
import { StickyQuickBar } from "@/components/touchline/sticky-quick-bar";
import { ErrorBoundary } from "@/components/touchline/error-boundary";
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
import { TopScorersScreen } from "@/components/touchline/screens/top-scorers";
import { ReportsScreen } from "@/components/touchline/screens/reports";
import { ComingSoonScreen } from "@/components/touchline/screens/coming-soon";
import { FriendlyScreen } from "@/components/touchline/screens/friendly";
import { ShopScreen } from "@/components/touchline/screens/shop";
import { MarketScreen } from "@/components/touchline/screens/market";
import { LeaderboardScreen } from "@/components/touchline/screens/leaderboard";
import { OtherDrawer } from "@/components/touchline/other-drawer";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useBodyScrollLock } from "@/hooks/touchline";
import { useKeyboardScrollLock } from "@/hooks/use-keyboard-scroll-lock";

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
  useKeyboardScrollLock();

  // Yatay swipe ile sekme geçişi iptal edildi — kullanıcı yanlışlıkla sekme değiştirmesin

  const handleSelectFromOther = (k: TabKey) => {
    setTab(k);
    setOtherOpen(false);
  };

  // Maç ekranında TopBar ve StickyQuickBar gizlenir (full-screen maç deneyimi)
  const isMatch = tab === "match";

  // Her sekme değişiminde ErrorBoundary reset olsun — "Tekrar Dene" butonu yeni render başlatır
  const renderScreen = () => {
    switch (tab) {
      case "dashboard": return <DashboardScreen />;
      case "tactics": return <TacticsScreen />;
      case "match": return <MatchScreen />;
      case "transfer": return <TransferScreen />;
      case "standings": return <StandingsScreen />;
      case "fixture": return <FixtureScreen />;
      case "scouting": return <ScoutingScreen />;
      case "youth": return <YouthAcademyScreen />;
      case "facilities": return <FacilitiesScreen />;
      case "finance": return <FinanceScreen />;
      case "awards": return <AwardsScreen />;
      case "topscorers": return <TopScorersScreen />;
      case "cup": return <CupScreen />;
      case "friendly": return <FriendlyScreen />;
      case "shop": return <ShopScreen />;
      case "market": return <MarketScreen />;
      case "leaderboard": return <LeaderboardScreen />;
      case "reports": return <ReportsScreen />;
      default: return <ComingSoonScreen title="Yakında" />;
    }
  };

  return (
    <AuthGate>
      <div className="tm-app-shell flex flex-col">
        {isMatch && <TopBar compact />}
        {!isMatch && <StickyQuickBar activeTab={tab} onChange={setTab} />}
        <main className="flex-1 overflow-y-auto tm-thin-scrollbar">
          <ErrorBoundary resetKey={tab}>
            {renderScreen()}
          </ErrorBoundary>
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
