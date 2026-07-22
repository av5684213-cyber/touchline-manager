"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Banknote,
  Building2,
  Calendar,
  Clock,
  Construction,
  Dumbbell,
  GraduationCap,
  Heart,
  Plus,
  Stethoscope,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { applyInflation } from "@/lib/fm/inflation";
import { getStaffBonusSummary } from "@/lib/staffBonus";
import type { StaffMember } from "@/lib/store";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

type FacilityKey = "stadium" | "pitch" | "academy" | "gym" | "medical" | "analysis";

const FACILITY_META: Record<
  FacilityKey,
  { icon: typeof Building2; effectLabelKey: string; maxLevel: number }
> = {
  stadium: { icon: Building2, effectLabelKey: "facilities.effect.stadium", maxLevel: 10 },
  pitch: { icon: Activity, effectLabelKey: "facilities.effect.pitch", maxLevel: 10 },
  academy: { icon: GraduationCap, effectLabelKey: "facilities.effect.academy", maxLevel: 10 },
  gym: { icon: Dumbbell, effectLabelKey: "facilities.effect.gym", maxLevel: 10 },
  medical: { icon: Stethoscope, effectLabelKey: "facilities.effect.medical", maxLevel: 10 },
  analysis: { icon: TrendingUp, effectLabelKey: "facilities.effect.analysis", maxLevel: 10 },
};

const STAFF_META: Record<
  StaffMember["type"],
  { icon: typeof Users; baseFee: number; maxCount: number; effectDescKey: string }
> = {
  scout: { icon: Users, baseFee: 400_000, maxCount: 3, effectDescKey: "Scout" },
  coach: { icon: GraduationCap, baseFee: 650_000, maxCount: 3, effectDescKey: "Antrenör" },
  physio: { icon: Heart, baseFee: 200_000, maxCount: 3, effectDescKey: "Fizyo" },
  analyst: { icon: TrendingUp, baseFee: 150_000, maxCount: 2, effectDescKey: "Analist" },
  youth_coordinator: { icon: GraduationCap, baseFee: 450_000, maxCount: 2, effectDescKey: "Altyapı" },
  sporting_director: { icon: Wallet, baseFee: 350_000, maxCount: 1, effectDescKey: "Sportif" },
};

const STAFF_TYPE_ORDER: StaffMember["type"][] = [
  "scout", "coach", "physio", "analyst", "youth_coordinator", "sporting_director",
];

// Tesis yükseltme maliyeti — baz × level çarpanı × enflasyon
function calcUpgradeCost(currentLevel: number): number {
  const seasonNumber = useAppStore.getState().seasonNumber ?? 1;
  const baseCost = Math.floor(250000 * Math.pow(2.2, currentLevel));
  return applyInflation(baseCost, seasonNumber);
}
function calcUpgradeDays(currentLevel: number): number {
  return currentLevel <= 1 ? 2 : Math.floor(2 * Math.pow(1.5, currentLevel - 2));
}
function facilityEffectValue(key: FacilityKey, level: number): string {
  switch (key) {
    case "stadium":
      return `${(1 + level * 0.1).toFixed(1)}× (kapasite ${(5000 + level * 10000).toLocaleString("tr-TR")})`;
    case "pitch":
      return `${(1 + level * 0.1).toFixed(1)}× antrenman XP`;
    case "academy":
      return `${(1 + level * 0.15).toFixed(2)}× altyapı kalitesi`;
    case "gym":
      return `+${level * 8}% fizik gelişimi`;
    case "medical":
      return `+${level * 6}% sakatlık önleme`;
    case "analysis":
      return `+${level * 5}% analiz bonusu`;
  }
}

export function FacilitiesScreen() {
  const { t } = useI18n();
  const team = useMyTeam();
  const facilities = useAppStore((s) => s.facilities);
  const upgradeFacility = useAppStore((s) => s.upgradeFacility);
  const cancelUpgrade = useAppStore((s) => s.cancelUpgrade);
  const completeUpgradeIfDue = useAppStore((s) => s.completeUpgradeIfDue);
  const setTicketPrice = useAppStore((s) => s.setTicketPrice);
  const [staffModal, setStaffModal] = useState<StaffMember["type"] | null>(null);
  const [ticketInput, setTicketInput] = useState(facilities.ticketPrice);
  const [, force] = useState(0);

  // Aktif inşaat varsa, süre doldu mu kontrol et — sadece aktif inşaat varken çalışır
  const hasActiveUpgrade = !!facilities.activeUpgrade;
  useEffect(() => {
    if (!hasActiveUpgrade) return;
    let id: ReturnType<typeof setInterval>;
    const start = () => {
      id = setInterval(() => {
        completeUpgradeIfDue();
        force((n) => n + 1);
      }, 1000);
    };
    const stop = () => { if (id) clearInterval(id); };
    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    start();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [completeUpgradeIfDue, hasActiveUpgrade]);

  if (!team) return null;

  const activeUpgrade = facilities.activeUpgrade;
  const activeRemaining = activeUpgrade
    ? Math.max(0, activeUpgrade.finishAt - Date.now())
    : 0;
  const activeRemainingSec = Math.floor(activeRemaining / 1000);
  const activeDays = Math.floor(activeRemainingSec / 86400);
  const activeHours = Math.floor((activeRemainingSec % 86400) / 3600);
  const activeMins = Math.floor((activeRemainingSec % 3600) / 60);
  const activeSecs = activeRemainingSec % 60;
  const activeProgress = activeUpgrade
    ? Math.min(100, ((Date.now() - activeUpgrade.startedAt) / (activeUpgrade.finishAt - activeUpgrade.startedAt)) * 100)
    : 0;

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
      <h1 className="text-base font-bold">{t("facilities.title")}</h1>

      {/* Budget header */}
      <div className="tm-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-muted-foreground" />
          <span className="text-xs">{t("facilities.cost")}</span>
        </div>
        <div className="text-sm font-bold tabular-nums text-emerald-700">
          {formatEuro(team.budget)}
        </div>
      </div>

      {/* Active upgrade banner */}
      {activeUpgrade && (
        <div className="tm-card p-3 border-amber-300 bg-amber-50/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Construction size={16} className="text-amber-700 animate-spin" style={{ animationDuration: "3s" }} />
              <span className="text-xs font-bold">
                {t("facilities.upgrading")}:{" "}
                {activeUpgrade.facilityId !== "staff"
                  ? t(`facilities.facility.${activeUpgrade.facilityId}`)
                  : "—"}
              </span>
            </div>
            <button
              onClick={() => {
                if (confirm(t("facilities.cancel_confirm"))) {
                  haptic("light");
                  cancelUpgrade();
                }
              }}
              className="tm-tap p-1 text-red-600"
              aria-label={t("facilities.cancel")}
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex items-baseline gap-1 text-lg font-bold tabular-nums mb-2">
            {activeDays > 0 && <span>{activeDays}g </span>}
            <span>{String(activeHours).padStart(2, "0")}</span>
            <span>:</span>
            <span>{String(activeMins).padStart(2, "0")}</span>
            <span>:</span>
            <span>{String(activeSecs).padStart(2, "0")}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${activeProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Ticket price */}
      <div className="tm-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Banknote size={14} className="text-muted-foreground" />
            <span className="text-sm font-bold">{t("facilities.ticket_price")}</span>
          </div>
          <span className="text-xs font-bold tabular-nums">€{ticketInput}</span>
        </div>
        <input
          type="range"
          min={0}
          max={150}
          value={ticketInput}
          onChange={(e) => {
            const v = Number(e.target.value);
            setTicketInput(v);
            setTicketPrice(v);
          }}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-primary tm-tap"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>€0</span>
          <span>
            {t("facilities.demand")}: {Math.max(0, Math.round((1 - ticketInput / 150) * 100))}%
          </span>
          <span>€150</span>
        </div>
      </div>

      {/* Facilities grid */}
      <div className="grid grid-cols-1 gap-2">
        {(Object.keys(FACILITY_META) as FacilityKey[]).map((key) => {
          const meta = FACILITY_META[key];
          const Icon = meta.icon;
          const level = facilities.levels[key];
          const isMax = level >= meta.maxLevel;
          const isUpgrading = activeUpgrade?.facilityId === key;
          const cost = calcUpgradeCost(level);
          const days = calcUpgradeDays(level);
          const canUpgrade = !activeUpgrade && !isMax && team.budget >= cost;
          return (
            <div key={key} className="tm-card p-3">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{t(`facilities.facility.${key}`)}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-primary/10 text-primary">
                      LV {level}/{meta.maxLevel}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {facilityEffectValue(key, level)}
                  </div>
                </div>
              </div>

              {/* Level bar */}
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: meta.maxLevel }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full",
                      i < level ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>

              {/* Action */}
              {isMax ? (
                <div className="text-center text-[11px] font-bold text-muted-foreground py-1.5">
                  {t("facilities.max_level")}
                </div>
              ) : isUpgrading ? (
                <div className="text-center text-[11px] font-bold text-amber-700 py-1.5">
                  {t("facilities.upgrading")}…
                </div>
              ) : (
                <button
                  onClick={() => {
                    haptic("medium");
                    const r = upgradeFacility(key);
                    if (!r.success) {
                      haptic("error");
                    }
                  }}
                  disabled={!canUpgrade}
                  className={cn(
                    "tm-tap w-full py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2",
                    !canUpgrade
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  <Zap size={12} />
                  {t("facilities.upgrade")} → LV {level + 1}
                  <span className="opacity-80">·</span>
                  <span className="tabular-nums">{formatEuro(cost)}</span>
                  <span className="opacity-80">·</span>
                  <span>{days}{t("facilities.days")}</span>
                </button>
              )}
              {!canUpgrade && !isMax && !isUpgrading && activeUpgrade && (
                <div className="text-center text-[10px] text-muted-foreground mt-1">
                  {t("facilities.in_progress")}
                </div>
              )}
              {!canUpgrade && !isMax && !isUpgrading && !activeUpgrade && team.budget < cost && (
                <div className="text-center text-[10px] text-red-600 mt-1">
                  {t("facilities.budget_low")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Staff section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Users size={14} className="text-muted-foreground" />
          <h2 className="text-sm font-bold">{t("facilities.staff.title")}</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {STAFF_TYPE_ORDER.map((type) => {
            const meta = STAFF_META[type];
            const Icon = meta.icon;
            const count = facilities.staff.filter((s) => s.type === type).length;
            const isFull = count >= meta.maxCount;
            return (
              <button
                key={type}
                onClick={() => {
                  if (isFull) {
                    haptic("error");
                    return;
                  }
                  haptic("light");
                  setStaffModal(type);
                }}
                disabled={isFull}
                className={cn(
                  "tm-tap p-3 rounded-md border text-left",
                  isFull
                    ? "bg-muted border-border opacity-60 cursor-not-allowed"
                    : "bg-card border-border hover:bg-accent"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <Icon size={14} className="text-primary" />
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {count}/{meta.maxCount}
                  </span>
                </div>
                <div className="text-[11px] font-bold leading-tight">
                  {t(`facilities.staff.type.${type}`)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {t("facilities.staff.hire")} · ~{formatEuro(meta.baseFee)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active staff list */}
        {/* ADDED: Personel bonus özeti — Scout/Doctor/Coach etkileri tooltip */}
        {facilities.staff.length > 0 && (
          <div className="tm-card p-2.5 bg-primary/5 border-primary/20 mb-2">
            <div className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5">Personel Faydaları</div>
            <div className="space-y-1">
              {(() => {
                try {
                  const summary = getStaffBonusSummary(facilities.staff);
                  return [
                    { icon: "🔍", ...summary.scout },
                    { icon: "⚕️", ...summary.doctor },
                    { icon: "📋", ...summary.coach },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <span>{s.icon}</span>
                      <span className="font-semibold">{s.level > 0 ? `${s.level}★` : "—"}</span>
                      <span className="text-muted-foreground flex-1 truncate">{s.description}</span>
                    </div>
                  ));
                } catch {
                  return <div className="text-[11px] text-muted-foreground">Personel bonusları yüklenemedi</div>;
                }
              })()}
            </div>
          </div>
        )}
        {facilities.staff.length > 0 && (
          <div className="tm-card divide-y divide-border">
            {facilities.staff.map((s) => {
              const meta = STAFF_META[s.type];
              const Icon = meta.icon;
              return (
                <div key={s.id} className="p-3 flex items-center gap-2">
                  <Icon size={16} className="text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {t(`facilities.staff.type.${s.type}`)} · {formatEuro(s.weeklyWage)}/{t("facilities.days").slice(0, 1) === "g" ? "hafta" : "wk"}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "text-[10px]",
                          i < s.stars ? "text-amber-500" : "text-muted-foreground/30"
                        )}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      haptic("light");
                      useAppStore.getState().fireStaff(s.id);
                    }}
                    className="tm-tap text-[10px] text-red-600 font-semibold px-1.5"
                  >
                    {t("facilities.staff.fire")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staff hire modal */}
      {staffModal && (
        <StaffHireModal
          type={staffModal}
          onClose={() => setStaffModal(null)}
        />
      )}
    </div>
  );
}

function StaffHireModal({
  type,
  onClose,
}: {
  type: StaffMember["type"];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const team = useMyTeam()!;
  const facilities = useAppStore((s) => s.facilities);
  const hireStaff = useAppStore((s) => s.hireStaff);
  const [stars, setStars] = useState(2);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const meta = STAFF_META[type];
  const hireFee = Math.round(meta.baseFee * (1 + (stars - 1) * 0.2));
  const weeklyWage = Math.floor(hireFee / 52);
  const overBudget = team.budget < hireFee;

  const handleHire = () => {
    haptic("medium");
    const r = hireStaff(type, stars);
    if (r.success) {
      haptic("success");
      setFeedback({ type: "success", msg: "✓" });
      setTimeout(onClose, 800);
    } else {
      haptic("error");
      setFeedback({ type: "error", msg: t("facilities.budget_low") });
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="close" />
      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold">
            {t("facilities.staff.hire")} · {t(`facilities.staff.type.${type}`)}
          </h3>
          <button onClick={onClose} className="tm-tap p-1">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {/* Star selector */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Yıldız
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => { haptic("light"); setStars(s); }}
                  className={cn(
                    "tm-tap flex-1 py-2 rounded-md text-sm font-bold border flex items-center justify-center gap-1",
                    stars === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border"
                  )}
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "text-xs",
                        i <= s
                          ? stars === s
                            ? "text-amber-300"
                            : "text-amber-500"
                          : "text-muted-foreground/30"
                      )}
                    >
                      ★
                    </span>
                  ))}
                </button>
              ))}
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="tm-card p-3 space-y-1.5 bg-muted/30">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("facilities.cost")}</span>
              <span className="font-bold tabular-nums">{formatEuro(hireFee)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("facilities.staff.weekly_wage")}</span>
              <span className="font-bold tabular-nums">{formatEuro(weeklyWage)}</span>
            </div>
            <div className="border-t border-border pt-1.5 flex justify-between">
              <span className="text-xs font-bold">{t("facilities.cost")}</span>
              <span className={cn("text-sm font-bold tabular-nums", overBudget ? "text-red-600" : "text-emerald-700")}>
                {formatEuro(hireFee)}
              </span>
            </div>
          </div>

          {overBudget && (
            <div className="tm-card p-2.5 bg-red-50 border-red-200 text-center text-xs font-bold text-red-700">
              {t("facilities.budget_low")}
            </div>
          )}

          {feedback && (
            <div className={cn(
              "tm-card p-2.5 text-center text-xs font-bold",
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            )}>
              {feedback.msg}
            </div>
          )}

          <button
            onClick={handleHire}
            disabled={overBudget}
            className={cn(
              "tm-tap w-full py-2.5 rounded-md text-sm font-bold",
              overBudget
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground"
            )}
          >
            {t("facilities.staff.hire")}
          </button>
        </div>
      </div>
    </div>
  );
}
