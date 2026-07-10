"use client";

import { CloudRain, CloudSun, Sun, Wind, Shield, Users, Trophy, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import type { Player, Team } from "@/lib/mock/data";
import { POSITION_GROUP } from "@/lib/mock/data";
import { FORMATION_SLOTS } from "@/lib/tactics/types";
import { ClubBadge, PositionPill, RatingBadge } from "./ui-bits";
import { cn } from "@/lib/utils";

// Formasyon bazlı ilk 11 seç — her slot için doğru pozisyondan oyuncu al
// Bu sayede maksimum 1 kaleci olur (rating'e göre sıralama yapılmaz)
function pickXIByFormation(players: Player[], formation: string): Player[] {
  const slots = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-4-2"];
  const used = new Set<string>();
  const lineup: Player[] = [];

  const getGroup = (pos: string): "GK" | "DEF" | "MID" | "FWD" => {
    if (pos === "GK") return "GK";
    if (["CB", "LB", "RB", "LWB", "RWB"].includes(pos)) return "DEF";
    if (["CDM", "CM", "CAM", "LM", "RM"].includes(pos)) return "MID";
    return "FWD";
  };

  for (const slotPos of slots) {
    // 1. Tam pozisyon eşleşmesi (sakatlar hariç)
    let candidate = players
      .filter((p) => !used.has(p.id) && !p.is_injured && p.specificPosition === slotPos)
      .sort((a, b) => b.rating - a.rating)[0];
    // 2. Aynı gruptan
    if (!candidate) {
      const group = getGroup(slotPos);
      candidate = players
        .filter((p) => !used.has(p.id) && !p.is_injured && getGroup(p.specificPosition) === group)
        .sort((a, b) => b.rating - a.rating)[0];
    }
    // 3. En yüksek OVR (son çare)
    if (!candidate) {
      candidate = players
        .filter((p) => !used.has(p.id) && !p.is_injured)
        .sort((a, b) => b.rating - a.rating)[0];
    }
    if (candidate) { used.add(candidate.id); lineup.push(candidate); }
  }
  return lineup;
}

export function PreMatchScreen({
  homeTeam,
  awayTeam,
  weather,
  refereeName,
  refereePersonality,
  homeForm,
  awayForm,
  onStart,
  onBack,
}: {
  homeTeam: Team;
  awayTeam: Team;
  weather: string;
  refereeName: string;
  refereePersonality: string;
  homeForm: ("W" | "D" | "L")[];
  awayForm: ("W" | "D" | "L")[];
  onStart: () => void;
  onBack: () => void;
}) {
  const { t, locale } = useI18n();
  const myTeam = useMyTeam();
  const isHome = myTeam?.id === homeTeam.id;

  // İlk 11 (formasyon bazlı) — pozisyon sırasına göre: GK → DEF → MID → FWD
  const POSITION_ORDER: Record<string, number> = {
    GK: 0, CB: 1, LB: 2, RB: 3, LWB: 4, RWB: 5,
    CDM: 6, CM: 7, CAM: 8, LM: 9, RM: 10,
    LW: 11, RW: 12, CF: 13, ST: 14,
  };
  const sortByPosition = (arr: any[]) => [...arr].sort((a, b) => {
    const pa = POSITION_ORDER[a.specificPosition] ?? 99;
    const pb = POSITION_ORDER[b.specificPosition] ?? 99;
    if (pa !== pb) return pa - pb;
    return b.rating - a.rating;
  });

  // P1 FIX: İlk 11'i rating'e göre DEĞİL, formasyon bazlı seç — maksimum 1 kaleci
  // Kullanıcının takımı için tactics.lineup kullan (kullanıcının seçtiği diziliş)
  // Rakip için formasyon bazlı otomatik seçim
  const storeState = useAppStore.getState();
  const userFormation = storeState.tactics.active?.formation ?? "4-4-2";
  const tacticsLineup = storeState.tactics.lineup;
  const filledTactics = tacticsLineup.filter((p): p is Player => p !== null);

  let homeXI: Player[];
  let awayXI: Player[];
  if (isHome) {
    // Kullanıcı ev sahibi — tactics.lineup kullan, eksikse tamamla
    if (filledTactics.length === 11) {
      homeXI = sortByPosition(filledTactics);
    } else {
      homeXI = sortByPosition(pickXIByFormation(homeTeam.players, userFormation));
    }
    awayXI = sortByPosition(pickXIByFormation(awayTeam.players, "4-4-2"));
  } else {
    // Kullanıcı deplasmanda
    homeXI = sortByPosition(pickXIByFormation(homeTeam.players, "4-4-2"));
    if (filledTactics.length === 11) {
      awayXI = sortByPosition(filledTactics);
    } else {
      awayXI = sortByPosition(pickXIByFormation(awayTeam.players, userFormation));
    }
  }

  // Pozisyon grubuna göre satır arka planı (taktik ekranıyla uyumlu)
  const POSITION_ROW_BG: Record<string, string> = {
    GK: "bg-amber-100/70 dark:bg-amber-950/30",
    DEF: "bg-sky-100/70 dark:bg-sky-950/30",
    MID: "bg-emerald-100/70 dark:bg-emerald-950/30",
    FWD: "bg-rose-100/70 dark:bg-rose-950/30",
  };

  const homeAvg = Math.round(homeXI.reduce((s, p) => s + p.rating, 0) / 11);
  const awayAvg = Math.round(awayXI.reduce((s, p) => s + p.rating, 0) / 11);

  const homeBest = [...homeXI].sort((a, b) => b.rating - a.rating)[0];
  const awayBest = [...awayXI].sort((a, b) => b.rating - a.rating)[0];

  const WeatherIcon = weather === "sunny" ? Sun : weather === "rainy" ? CloudRain : weather === "windy" ? Wind : CloudSun;
  const weatherLabel = t(`match.weather.${weather}`);

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      {/* Header — takımlar */}
      <div className="tm-card p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <ClubBadge short={homeTeam.shortName} primaryColor={homeTeam.primaryColor} size={40} />
            <span className="text-[10px] font-bold truncate max-w-[100px]">{homeTeam.name}</span>
            <span className="text-[9px] text-muted-foreground">{isHome ? t("dash.home") : t("dash.away")}</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-bold">{t("dash.vs")}</span>
          <div className="flex flex-col items-center gap-1">
            <ClubBadge short={awayTeam.shortName} primaryColor={awayTeam.primaryColor} size={40} />
            <span className="text-[10px] font-bold truncate max-w-[100px]">{awayTeam.name}</span>
            <span className="text-[9px] text-muted-foreground">{!isHome ? t("dash.home") : t("dash.away")}</span>
          </div>
        </div>
      </div>

      {/* Hakem + Hava */}
      <div className="grid grid-cols-2 gap-2">
        <div className="tm-card p-2.5 flex items-center gap-2">
          <Shield size={16} className="text-amber-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[9px] text-muted-foreground uppercase">{t("match.referee")}</div>
            <div className="text-[10px] font-bold truncate">{refereeName}</div>
            <div className="text-[8px] text-muted-foreground">{t(`match.ref.${refereePersonality}`)}</div>
          </div>
        </div>
        <div className="tm-card p-2.5 flex items-center gap-2">
          <WeatherIcon size={16} className="text-sky-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[9px] text-muted-foreground uppercase">{t("match.weather")}</div>
            <div className="text-[10px] font-bold">{weatherLabel}</div>
            {weather !== "sunny" && (
              <div className="text-[8px] text-amber-400">{t(`match.banner.${weather}`)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Form karşılaştırması */}
      <div className="tm-card p-3">
        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">{t("fixture.form")}</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">{homeTeam.name}</span>
            <div className="flex gap-0.5">
              {homeForm.length === 0 ? (
                <span className="text-[9px] text-muted-foreground">—</span>
              ) : homeForm.map((f, i) => (
                <span key={i} className={cn(
                  "inline-flex items-center justify-center w-5 h-5 rounded text-[8px] font-bold text-white",
                  f === "W" ? "bg-emerald-500" : f === "D" ? "bg-amber-400" : "bg-red-500"
                )}>
                  {f === "W" ? "G" : f === "D" ? "B" : "M"}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">{awayTeam.name}</span>
            <div className="flex gap-0.5">
              {awayForm.length === 0 ? (
                <span className="text-[9px] text-muted-foreground">—</span>
              ) : awayForm.map((f, i) => (
                <span key={i} className={cn(
                  "inline-flex items-center justify-center w-5 h-5 rounded text-[8px] font-bold text-white",
                  f === "W" ? "bg-emerald-500" : f === "D" ? "bg-amber-400" : "bg-red-500"
                )}>
                  {f === "W" ? "G" : f === "D" ? "B" : "M"}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Takım güç karşılaştırması */}
      <div className="tm-card p-3">
        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Takım Gücü</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums text-primary">{homeAvg}</div>
            <div className="text-[8px] text-muted-foreground">Ort. OVR</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums text-primary">{awayAvg}</div>
            <div className="text-[8px] text-muted-foreground">Ort. OVR</div>
          </div>
        </div>
        {/* Güç barı */}
        <div className="flex h-2 rounded-full overflow-hidden mt-2">
          <div className="bg-emerald-500" style={{ width: `${(homeAvg / (homeAvg + awayAvg)) * 100}%` }} />
          <div className="bg-sky-500" style={{ width: `${(awayAvg / (homeAvg + awayAvg)) * 100}%` }} />
        </div>
      </div>

      {/* En iyi oyuncular */}
      <div className="tm-card p-3">
        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Yıldız Oyuncular</div>
        <div className="grid grid-cols-2 gap-3">
          {homeBest && (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold truncate">{homeBest.firstName} {homeBest.lastName}</div>
                <div className="text-[8px] text-muted-foreground">{homeBest.specificPosition} · {homeBest.archetype}</div>
              </div>
              <RatingBadge value={homeBest.formRating} />
            </div>
          )}
          {awayBest && (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold truncate">{awayBest.firstName} {awayBest.lastName}</div>
                <div className="text-[8px] text-muted-foreground">{awayBest.specificPosition} · {awayBest.archetype}</div>
              </div>
              <RatingBadge value={awayBest.formRating} />
            </div>
          )}
        </div>
      </div>

      {/* Senin kadron — İlk 11 (pozisyon sırasına göre, renkli) */}
      <div className="tm-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-muted-foreground uppercase font-bold">{homeTeam.name} — İlk 11</div>
          <div className="text-[9px] font-bold text-amber-300 tabular-nums">Ort: {homeAvg}</div>
        </div>
        <div className="space-y-0.5">
          {homeXI.map((p, i) => {
            const group = POSITION_GROUP[p.specificPosition] ?? "MID";
            return (
              <div key={p.id} className={cn("flex items-center gap-2 py-1 px-1.5 rounded", POSITION_ROW_BG[group])}>
                <PositionPill label={p.specificPosition} group={group} />
                <span className="text-[10px] font-semibold flex-1 truncate">{p.firstName} {p.lastName}</span>
                <span className="text-[9px] font-bold tabular-nums w-6 text-right">{p.rating}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rakip kadro özeti */}
      <div className="tm-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-muted-foreground uppercase font-bold">{awayTeam.name} — İlk 11</div>
          <div className="text-[9px] font-bold text-amber-300 tabular-nums">Ort: {awayAvg}</div>
        </div>
        <div className="space-y-0.5">
          {awayXI.map((p, i) => {
            const group = POSITION_GROUP[p.specificPosition] ?? "MID";
            return (
              <div key={p.id} className={cn("flex items-center gap-2 py-1 px-1.5 rounded", POSITION_ROW_BG[group])}>
                <PositionPill label={p.specificPosition} group={group} />
                <span className="text-[10px] font-semibold flex-1 truncate">{p.firstName} {p.lastName}</span>
                <span className="text-[9px] font-bold tabular-nums w-6 text-right">{p.rating}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aksiyon butonları */}
      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="tm-tap flex-1 py-3 rounded-lg border border-border text-sm font-bold"
        >
          {t("common.back")}
        </button>
        <button
          onClick={onStart}
          className="tm-tap flex-[2] py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2"
        >
          <Trophy size={16} /> {t("match.kick_off")}
        </button>
      </div>
    </div>
  );
}
