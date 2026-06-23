"use client";

import { CloudRain, CloudSun, Sun, Wind, Shield, Users, Trophy, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useMyTeam } from "@/lib/store";
import type { Team } from "@/lib/mock/data";
import { POSITION_GROUP } from "@/lib/mock/data";
import { ClubBadge, PlayerAvatar, PositionPill, RatingBadge } from "./ui-bits";
import { cn } from "@/lib/utils";

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

  // İlk 11 (formasyon bazlı)
  const homeXI = homeTeam.players
    .slice()
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 11);
  const awayXI = awayTeam.players
    .slice()
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 11);

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
            <span className="text-[10px] font-bold truncate max-w-[80px]">{homeTeam.shortName}</span>
            <span className="text-[9px] text-muted-foreground">{isHome ? t("dash.home") : t("dash.away")}</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-bold">{t("dash.vs")}</span>
          <div className="flex flex-col items-center gap-1">
            <ClubBadge short={awayTeam.shortName} primaryColor={awayTeam.primaryColor} size={40} />
            <span className="text-[10px] font-bold truncate max-w-[80px]">{awayTeam.shortName}</span>
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
            <span className="text-[9px] text-muted-foreground">{homeTeam.shortName}</span>
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
            <span className="text-[9px] text-muted-foreground">{awayTeam.shortName}</span>
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
              <PlayerAvatar initials={`${homeBest.firstName[0]}${homeBest.lastName[0]}`} color={homeTeam.primaryColor} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold truncate">{homeBest.firstName} {homeBest.lastName}</div>
                <div className="text-[8px] text-muted-foreground">{homeBest.specificPosition} · {homeBest.archetype}</div>
              </div>
              <RatingBadge value={homeBest.formRating} />
            </div>
          )}
          {awayBest && (
            <div className="flex items-center gap-2">
              <PlayerAvatar initials={`${awayBest.firstName[0]}${awayBest.lastName[0]}`} color={awayTeam.primaryColor} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold truncate">{awayBest.firstName} {awayBest.lastName}</div>
                <div className="text-[8px] text-muted-foreground">{awayBest.specificPosition} · {awayBest.archetype}</div>
              </div>
              <RatingBadge value={awayBest.formRating} />
            </div>
          )}
        </div>
      </div>

      {/* Rakip kadro özeti */}
      <div className="tm-card p-3">
        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">{awayTeam.name} — İlk 11</div>
        <div className="space-y-0.5">
          {awayXI.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 py-0.5">
              <span className="text-[8px] text-muted-foreground w-4 text-right">{i + 1}</span>
              <PlayerAvatar initials={`${p.firstName[0]}${p.lastName[0]}`} color={awayTeam.primaryColor} size={20} />
              <span className="text-[10px] font-semibold flex-1 truncate">{p.firstName} {p.lastName}</span>
              <PositionPill label={p.specificPosition} group={POSITION_GROUP[p.specificPosition]} />
              <span className="text-[9px] font-bold tabular-nums w-6 text-right">{p.rating}</span>
            </div>
          ))}
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
