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
// v2.9.45: WeeklyReportScreen import'u KALDIRILDI — orphan code, hiçbir yerde kullanılmıyordu
// (Dashboard'da zaten weekly bilgiler gösteriliyor; gelecekte "reports" sekmesine taşınabilir)
import { ReportsScreen } from "@/components/touchline/screens/reports";
import { ComingSoonScreen } from "@/components/touchline/screens/coming-soon";
import { FriendlyScreen } from "@/components/touchline/screens/friendly";
import { ForumScreen } from "@/components/touchline/screens/forum";
import { ShopScreen } from "@/components/touchline/screens/shop";
// v2.9.21 GÖREV 7: MarketScreen import'u KALDIRILDI
import { LeaderboardScreen } from "@/components/touchline/screens/leaderboard";
// v2.9.45: Önceden orphan olan ekranlar artık menüde
import { NewsScreen } from "@/components/touchline/screens/news";
import { MessagesScreen } from "@/components/touchline/screens/messages";
import { OtherDrawer } from "@/components/touchline/other-drawer";
import { WelcomeModal } from "@/components/touchline/welcome-modal";
// v2.9.47: Kozmetik görünümlerini uygula (tema renkleri, forma)
import { CosmeticsApplier } from "@/components/touchline/cosmetics-applier";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useBodyScrollLock } from "@/hooks/touchline";
import { useKeyboardScrollLock } from "@/hooks/use-keyboard-scroll-lock";
import { usePushNotifications } from "@/hooks/use-push-notifications";

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
  // v2.9.20 GÖREV 8: FCM push notification token kaydı (kullanıcı giriş yapınca)
  usePushNotifications();

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
      case "forum": return <ForumScreen />;
      case "shop": return <ShopScreen />;
      // v2.9.21 GÖREV 7: "market" case'i KALDIRILDI — kozmetik market artık yok
      case "leaderboard": return <LeaderboardScreen />;
      case "reports": return <ReportsScreen />;
      // v2.9.45: Önceden orphan olan ekranlar artık menüde
      case "news": return <NewsScreen />;
      case "messages": return <MessagesScreen />;
      // v2.9.45: WeeklyReportScreen orphan import'u kaldırıldı — şu an kullanılmıyor
      // (Dashboard'da zaten weekly bilgiler gösteriliyor; gelecekte "reports" sekmesine taşınabilir)
      default: return <ComingSoonScreen title="Yakında" />;
    }
  };

  return (
    <AuthGate>
      <CosmeticsApplier />
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
        {/* v2.9.20 GÖREV 7: Yeni kullanıcı hoş geldin modal'ı */}
        <WelcomeModal />
      </div>
    </AuthGate>
  );
}
