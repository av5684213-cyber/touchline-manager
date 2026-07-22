"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AuthGate } from "@/components/touchline/auth-gate";
import { TopBar } from "@/components/touchline/top-bar";
import { StickyQuickBar } from "@/components/touchline/sticky-quick-bar";
import { ErrorBoundary } from "@/components/touchline/error-boundary";
import {
  BottomNav,
  OTHER_TABS,
  type TabKey,
} from "@/components/touchline/bottom-nav";
// v2.9.15 MADDE 3: Sadece Dashboard top-level import (ilk açılış ekranı)
import { DashboardScreen } from "@/components/touchline/screens/dashboard";
import { ComingSoonScreen } from "@/components/touchline/screens/coming-soon";
// Diğer tüm ekranlar dynamic import ile lazy-load
const TacticsScreen = dynamic(() => import("@/components/touchline/screens/tactics").then(m => ({ default: m.TacticsScreen })), { ssr: false });
const MatchScreen = dynamic(() => import("@/components/touchline/screens/match").then(m => ({ default: m.MatchScreen })), { ssr: false });
const TransferScreen = dynamic(() => import("@/components/touchline/screens/transfer").then(m => ({ default: m.TransferScreen })), { ssr: false });
const StandingsScreen = dynamic(() => import("@/components/touchline/screens/standings").then(m => ({ default: m.StandingsScreen })), { ssr: false });
const FixtureScreen = dynamic(() => import("@/components/touchline/screens/fixture").then(m => ({ default: m.FixtureScreen })), { ssr: false });
const ScoutingScreen = dynamic(() => import("@/components/touchline/screens/scouting").then(m => ({ default: m.ScoutingScreen })), { ssr: false });
const YouthAcademyScreen = dynamic(() => import("@/components/touchline/screens/youth-academy").then(m => ({ default: m.YouthAcademyScreen })), { ssr: false });
const FacilitiesScreen = dynamic(() => import("@/components/touchline/screens/facilities").then(m => ({ default: m.FacilitiesScreen })), { ssr: false });
const FinanceScreen = dynamic(() => import("@/components/touchline/screens/finance").then(m => ({ default: m.FinanceScreen })), { ssr: false });
const AwardsScreen = dynamic(() => import("@/components/touchline/screens/awards").then(m => ({ default: m.AwardsScreen })), { ssr: false });
const CupScreen = dynamic(() => import("@/components/touchline/screens/cup").then(m => ({ default: m.CupScreen })), { ssr: false });
const TopScorersScreen = dynamic(() => import("@/components/touchline/screens/top-scorers").then(m => ({ default: m.TopScorersScreen })), { ssr: false });
const ReportsScreen = dynamic(() => import("@/components/touchline/screens/reports").then(m => ({ default: m.ReportsScreen })), { ssr: false });
const FriendlyScreen = dynamic(() => import("@/components/touchline/screens/friendly").then(m => ({ default: m.FriendlyScreen })), { ssr: false });
const ShopScreen = dynamic(() => import("@/components/touchline/screens/shop").then(m => ({ default: m.ShopScreen })), { ssr: false });
const MarketScreen = dynamic(() => import("@/components/touchline/screens/market").then(m => ({ default: m.MarketScreen })), { ssr: false });
const LeaderboardScreen = dynamic(() => import("@/components/touchline/screens/leaderboard").then(m => ({ default: m.LeaderboardScreen })), { ssr: false });
const OtherDrawer = dynamic(() => import("@/components/touchline/other-drawer").then(m => ({ default: m.OtherDrawer })), { ssr: false });
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
