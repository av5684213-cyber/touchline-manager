"use client";

import {
  LayoutDashboard,
  ClipboardList,
  Trophy,
  ArrowLeftRight,
  Dumbbell,
  Grid2x2,
  Calendar,
  Search,
  GraduationCap,
  Award,
  BarChart3,
  Wallet,
  Crown,
  ShoppingBag,
  Palette,
  MessageSquare,
  Inbox,
  Newspaper,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { haptic } from "@/hooks/touchline";
import { cn } from "@/lib/utils";
// v2.9.153: Dev mode flag — "Maç" sekmesini göster/gizle için
import { useAppStore } from "@/lib/store";

// Hook: mevcut kullanıcı dev mode'da mı?
function useAppStoreDevMode(): boolean {
  return useAppStore((s) => s.isDevMode);
}

export type TabKey =
  | "dashboard"
  | "tactics"
  | "match"
  | "transfer"
  | "training"
  // Diğer drawer'ındaki sekmeler
  | "standings"
  | "fixture"
  | "scouting"
  | "youth"
  | "facilities"
  | "finance"
  | "awards"
  | "reports"
  | "cup"
  | "topscorers"
  | "shop" // P0: Mağaza sekmesi
  // v2.9.21 GÖREV 7: "market" sekmesi KALDIRILDI — kozmetik market kullanılmıyor,
  // kullanıcı "market sekmesini kaldır, içindekileri sil" dedi. Shop sekmesi kaldı (kredi paketleri).
  | "leaderboard" // P0: Liderlik tablosu
  | "forum" // v2.9.32: Forum
  // v2.9.45: Önceden orphan olan 3 ekran artık menüde
  | "news" // Haberler
  | "messages" // Mesajlar (tam liste)
  // Üst şerit sekmesi — coming-soon
  | "friendly";

export const MAIN_TABS: { key: TabKey; icon: typeof LayoutDashboard; labelKey: string }[] = [
  { key: "dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { key: "tactics", icon: ClipboardList, labelKey: "nav.tactics" },
  { key: "match", icon: Trophy, labelKey: "nav.match" },
  { key: "transfer", icon: ArrowLeftRight, labelKey: "nav.transfer" },
  { key: "finance", icon: Wallet, labelKey: "nav.finance" },
];

// v2.9.153: Normal kullanıcılar için "Maç" sekmesi YOK — onun yerine "Mesajlar" var.
// Dev mode (Geliştirici Modu) için "Maç" sekmesi korunur.
// route/component SİLİNMEDİ — sadece normal user'ın nav'ında gösterilmiyor.
export const MAIN_TABS_NORMAL: { key: TabKey; icon: typeof LayoutDashboard; labelKey: string }[] = [
  { key: "dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { key: "tactics", icon: ClipboardList, labelKey: "nav.tactics" },
  // "match" yerine "messages" — normal kullanıcı maç fikstürünü Fixture ekranından erişir
  { key: "messages", icon: Inbox, labelKey: "nav.messages" },
  { key: "transfer", icon: ArrowLeftRight, labelKey: "nav.transfer" },
  { key: "finance", icon: Wallet, labelKey: "nav.finance" },
];

export const OTHER_TABS: { key: TabKey; icon: LucideIcon; labelKey: string }[] = [
  { key: "leaderboard", icon: Trophy, labelKey: "nav.leaderboard" },
  { key: "forum", icon: MessageSquare, labelKey: "nav.forum" },
  { key: "shop", icon: ShoppingBag, labelKey: "nav.shop" },
  // v2.9.21 GÖREV 7: market sekmesi kaldırıldı
  { key: "youth", icon: GraduationCap, labelKey: "nav.youth" },
  { key: "topscorers", icon: Crown, labelKey: "nav.topscorers" },
  { key: "awards", icon: Award, labelKey: "nav.awards" },
  { key: "reports", icon: BarChart3, labelKey: "nav.reports" },
  // v2.9.45: Önceden orphan olan 2 ekran — haberler + mesajlar
  { key: "news", icon: Newspaper, labelKey: "nav.news" },
  { key: "messages", icon: Inbox, labelKey: "nav.messages" },
];

export function BottomNav({
  active,
  onChange,
  onOpenOther,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
  onOpenOther: () => void;
}) {
  const { t } = useI18n();
  const otherActive = OTHER_TABS.some((tab) => tab.key === active);

  // v2.9.153: Dev mode ise "Maç" sekmesi göster, normal user ise "Mesajlar" göster
  const isDevMode = useAppStoreDevMode();
  const tabs = isDevMode ? MAIN_TABS : MAIN_TABS_NORMAL;

  return (
    <nav
      className="tm-bottom-nav grid grid-cols-6 gap-0"
      role="tablist"
      aria-label="tabs"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            aria-label={t(tab.labelKey)}
            onClick={() => {
              if (!isActive) haptic("light");
              onChange(tab.key);
            }}
            className={cn(
              "tm-tap flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
            <span className="truncate max-w-full px-1">{t(tab.labelKey)}</span>
            <span
              className={cn(
                "h-0.5 w-6 rounded-full transition-all",
                isActive ? "bg-primary opacity-100" : "opacity-0"
              )}
            />
          </button>
        );
      })}
      <button
        role="tab"
        aria-label={t("nav.other")}
        aria-selected={otherActive}
        onClick={() => {
          haptic("light");
          onOpenOther();
        }}
        className={cn(
          "tm-tap flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
          otherActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Grid2x2 size={20} strokeWidth={otherActive ? 2.4 : 2} />
        <span className="truncate max-w-full px-1">{t("nav.other")}</span>
        <span
          className={cn(
            "h-0.5 w-6 rounded-full transition-all",
            otherActive ? "bg-primary opacity-100" : "opacity-0"
          )}
        />
      </button>
    </nav>
  );
}
