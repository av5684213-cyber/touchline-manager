"use client";

import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  Heart,
  Radio,
  Shirt,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { haptic } from "@/hooks/touchline";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FinanceScreen() {
  const { t, locale } = useI18n();
  const team = useMyTeam();
  const facilities = useAppStore((s) => s.facilities);
  const sponsors = useAppStore((s) => s.sponsors);
  // ADDED: Aktif sponsor — useMemo dışında hesapla ki render'da erişilebilsin
  const activeSponsor = sponsors?.active?.find((s: any) => s.isActive) ?? null;

  const computed = useMemo(() => {
    if (!team) return null;

    // P0 FIX: store.ts advanceMatchday ekonomisi ile BIREBIR senkronize
    // Personel maaşları
    const totalStaffWages = facilities.staff.reduce((s, st) => s + st.weeklyWage, 0);

    // Tesis bakım maliyeti — store ile aynı: seviye başına 20K/hafta
    const totalFacilityLevels = Object.values(facilities.levels).reduce((s, l) => s + l, 0);
    const facilityMaintenance = totalFacilityLevels * 20000;

    // Haftalık gelir — store advanceMatchday ile BIREBIR AYNI formüller
    // Bilet: doluluk × capacity × ticketPrice × stadiumMult
    const stadiumCapacity = 5000 + facilities.levels.stadium * 5000;
    const stadiumMult = 1 + facilities.levels.stadium * 0.05;
    // P0 FIX: Doluluk oranı — bilet fiyatına göre azalır (store ile aynı)
    const fillRate = Math.max(0.2, Math.min(0.8, 1 - (facilities.ticketPrice / 250)));
    const ticketRevenue = Math.round(
      stadiumCapacity * fillRate * facilities.ticketPrice * stadiumMult
    );
    // Sponsor: store base + aktif sponsor geliri
    const dynamicSponsorIncome = activeSponsor?.amount ?? 0;
    const baseSponsor = 50_000 + facilities.levels.stadium * 10_000;
    const sponsor = baseSponsor + dynamicSponsorIncome;
    // TV: store ile aynı
    const tv = 50_000;
    // Merch: store ile aynı
    const merch = Math.round(stadiumCapacity * 0.2 * 1);

    const totalIncome = ticketRevenue + sponsor + tv + merch;
    // P0 FIX: Futbolcu maaşları tamamen kaldırıldı — sadece personel + tesis
    const totalExpense = totalStaffWages + facilityMaintenance;
    const net = totalIncome - totalExpense;

    // Mali sağlık
    const ratio = net / Math.max(1, totalExpense);
    const health: "good" | "ok" | "bad" = ratio > 0.2 ? "good" : ratio > -0.1 ? "ok" : "bad";

    return {
      totalStaffWages,
      facilityMaintenance,
      ticketRevenue,
      sponsor,
      tv,
      merch,
      totalIncome,
      totalExpense,
      net,
      health,
      fillRate,
    };
  }, [team, facilities, activeSponsor]);

  if (!team || !computed) return null;

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
      <h1 className="text-base font-bold">{t("finance.title")}</h1>

      {/* Budget breakdown */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={14} className="text-muted-foreground" />
          <span className="text-xs font-bold">{t("finance.total_budget")}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide">
              {t("finance.total_budget")}
            </div>
            <div className="text-sm font-bold tabular-nums">{formatEuro(team.budget)}</div>
          </div>
          <div className="border-x border-border">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide">
              {t("finance.expense")}
            </div>
            <div className="text-sm font-bold tabular-nums text-red-600">
              {formatEuro(computed.totalExpense)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide">
              {t("finance.net")}
            </div>
            <div className={cn(
              "text-sm font-bold tabular-nums",
              computed.net >= 0 ? "text-emerald-700" : "text-red-600"
            )}>
              {computed.net >= 0 ? "+" : ""}{formatEuro(computed.net)}
            </div>
          </div>
        </div>

        {/* Health indicator */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-muted-foreground">{t("finance.health")}</span>
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              computed.health === "good" && "bg-emerald-100 text-emerald-700",
              computed.health === "ok" && "bg-amber-100 text-amber-700",
              computed.health === "bad" && "bg-red-100 text-red-700",
            )}>
              {t(`finance.health.${computed.health}`)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                computed.health === "good" && "bg-emerald-500",
                computed.health === "ok" && "bg-amber-500",
                computed.health === "bad" && "bg-red-500",
              )}
              style={{
                width: `${Math.max(5, Math.min(100, 50 + (computed.net / Math.max(1, computed.totalExpense)) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Income */}
      <div className="tm-card overflow-hidden">
        <div className="px-3 py-2 border-b border-border flex items-center gap-2 bg-emerald-50/50">
          <ArrowUpRight size={14} className="text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700">{t("finance.income")}</span>
          <span className="text-xs font-bold ml-auto tabular-nums text-emerald-700">
            +{formatEuro(computed.totalIncome)}
          </span>
        </div>
        <FinanceRow
          icon={Users}
          label={t("finance.income.tickets")}
          value={computed.ticketRevenue}
          color="emerald"
        />
        <FinanceRow
          icon={Wallet}
          label={t("finance.income.sponsor")}
          value={computed.sponsor}
          color="emerald"
        />
        <FinanceRow
          icon={Radio}
          label={t("finance.income.tv")}
          value={computed.tv}
          color="emerald"
        />
        <FinanceRow
          icon={Shirt}
          label={t("finance.income.merch")}
          value={computed.merch}
          color="emerald"
          last
        />
      </div>

      {/* Expense — futbolcu maaşları YOK, sadece personel + tesis */}
      <div className="tm-card overflow-hidden">
        <div className="px-3 py-2 border-b border-border flex items-center gap-2 bg-red-50/50">
          <ArrowDownRight size={14} className="text-red-600" />
          <span className="text-xs font-bold text-red-700">{t("finance.expense")}</span>
          <span className="text-xs font-bold ml-auto tabular-nums text-red-700">
            −{formatEuro(computed.totalExpense)}
          </span>
        </div>
        <FinanceRow
          icon={Users}
          label={t("finance.expense.staff")}
          value={computed.totalStaffWages}
          color="red"
        />
        <FinanceRow
          icon={Calendar}
          label={t("finance.expense.facilities")}
          value={computed.facilityMaintenance}
          color="red"
          last
        />
      </div>

      {/* ADDED: Sponsor Sistemi — teklifler + aktif sponsor */}
      <div className="tm-card p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold">🤝 Sponsor Sistemi</span>
          <button
            onClick={() => { haptic("light"); useAppStore.getState().generateSponsorOffers(); }}
            className="tm-tap text-[10px] px-2 py-1 rounded-md bg-primary text-primary-foreground font-bold"
          >
            Teklif Getir
          </button>
        </div>

        {/* Aktif sponsor */}
        {activeSponsor && (
          <div className="mb-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-muted-foreground">Aktif Sponsor</div>
                <div className="text-xs font-bold">{activeSponsor.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {activeSponsor.tier} · {activeSponsor.durationWeeks} hafta
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-400 tabular-nums">
                  +{activeSponsor.amount.toLocaleString("tr-TR")} €
                </div>
                <div className="text-[10px] text-muted-foreground">/hafta</div>
              </div>
            </div>
          </div>
        )}

        {/* Bekleyen teklifler */}
        {(sponsors?.offers ?? []).length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Teklifler ({sponsors.offers.length})</div>
            {sponsors.offers.map((offer: any) => (
              <div key={offer.id} className="flex items-center justify-between p-2 rounded-md bg-card border border-border">
                <div>
                  <div className="text-[11px] font-semibold">{offer.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {offer.tier} · {offer.amount.toLocaleString("tr-TR")} €/hafta · {offer.durationWeeks} hafta
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { haptic("success"); useAppStore.getState().acceptSponsor(offer.id); }}
                    className="tm-tap text-[10px] px-2 py-1 rounded-md bg-emerald-600 text-white font-bold"
                  >
                    Kabul Et
                  </button>
                  <button
                    onClick={() => { haptic("light"); useAppStore.getState().rejectSponsor(offer.id); }}
                    className="tm-tap text-[10px] px-2 py-1 rounded-md bg-muted text-muted-foreground font-bold border border-border"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!activeSponsor && (sponsors?.offers ?? []).length === 0 && (
          <div className="text-[10px] text-muted-foreground text-center py-2">
            Henüz sponsor yok. "Teklif Getir" butonuna bas.
          </div>
        )}
      </div>
    </div>
  );
}

function FinanceRow({
  icon: Icon,
  label,
  value,
  color,
  last,
}: {
  icon: typeof Wallet;
  label: string;
  value: number;
  color: "emerald" | "red";
  last?: boolean;
}) {
  const textColor = color === "emerald" ? "text-emerald-700" : "text-red-600";
  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2.5",
      !last && "border-b border-border/50"
    )}>
      <Icon size={14} className="text-muted-foreground shrink-0" />
      <span className="text-xs flex-1">{label}</span>
      <span className={cn("text-xs font-bold tabular-nums", textColor)}>
        {color === "emerald" ? "+" : "−"}{formatEuro(value)}
      </span>
    </div>
  );
}
