"use client";

import { useRef, useState } from "react";
import { X, User, Upload, ArrowLeftRight, Banknote } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { POSITION_GROUP, type Player, type SeasonStat } from "@/lib/mock/data";
import { useAppStore, useMyTeam } from "@/lib/store";
import { PlayerAvatar, PositionPill, RatingBadge } from "./ui-bits";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

type Tab = "overview" | "stats" | "actions";

export function PlayerProfileModal({
  player,
  teamColor,
  onClose,
}: {
  player: Player;
  teamColor: string;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>("overview");
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isGK = player.specificPosition === "GK";

  const onPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
      haptic("light");
    };
    reader.readAsDataURL(file);
  };

  // Stat grupları
  const technical: { label: string; value: number | undefined }[] = isGK
    ? [
        { label: "Refleksler", value: player.goalkeeping },
        { label: "Top Tutma", value: player.goalkeeping },
        { label: "Bire Bir", value: player.goalkeeping },
        { label: "Hava Hakimiyeti", value: player.heading },
        { label: "Alan Hakimiyeti", value: player.positioning },
        { label: "Degaj", value: player.passing },
        { label: "Elle Oyun", value: player.goalkeeping },
        { label: "İletişim", value: player.leadership },
        { label: "Konsantrasyon", value: player.concentration },
        { label: "Çeviklik", value: player.agility },
      ]
    : [
        { label: "Bitiricilik", value: player.finishing },
        { label: "Dribling", value: player.dribbling },
        { label: "İlk Kontrol", value: player.firstTouch },
        { label: "Kafa Vuruşu", value: player.heading },
        { label: "Markaj", value: player.marking },
        { label: "Orta Yapma", value: player.crossing },
        { label: "Pas", value: player.passing },
        { label: "Teknik", value: player.technique },
        { label: "Top Kapma", value: player.tackling },
        { label: "Uzaktan Şut", value: player.longShots },
      ];

  const mental: { label: string; value: number | undefined }[] = [
    { label: "Agresiflik", value: player.aggression },
    { label: "Cesaret", value: player.bravery },
    { label: "Çalışkanlık", value: player.workRate },
    { label: "Karar Alma", value: player.decisions },
    { label: "Kararlılık", value: player.determination },
    { label: "Konsantrasyon", value: player.concentration },
    { label: "Liderlik", value: player.leadership },
    { label: "Önsezi", value: player.anticipation },
    { label: "Özel Yetenek", value: player.flair },
    { label: "Pozisyon Alma", value: player.positioning },
    { label: "Soğukkanlılık", value: player.composure },
    { label: "Takım Oyunu", value: player.teamwork },
    { label: "Vizyon", value: player.vision },
  ];

  const physical: { label: string; value: number | undefined }[] = [
    { label: "Çeviklik", value: player.agility },
    { label: "Dayanıklılık", value: player.stamina },
    { label: "Denge", value: player.balance },
    { label: "Güç", value: player.strength },
    { label: "Hız", value: player.stats.pace },
    { label: "Hızlanma", value: player.acceleration },
    { label: "Zıplama", value: player.jumping },
    { label: "Sol Ayak", value: player.leftFoot },
    { label: "Sağ Ayak", value: player.rightFoot },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="close" />

      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border" style={{ background: "var(--primary)" }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{player.firstName} {player.lastName}</span>
          </div>
          <button onClick={onClose} className="tm-tap p-1 text-white/80" aria-label={t("common.close")}>
            <X size={16} />
          </button>
        </div>

        {/* Tab nav */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("overview")}
            className={cn(
              "tm-tap flex-1 py-2 text-xs font-bold",
              tab === "overview" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            )}
          >
            Genel Bakış
          </button>
          <button
            onClick={() => setTab("stats")}
            className={cn(
              "tm-tap flex-1 py-2 text-xs font-bold",
              tab === "stats" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            )}
          >
            İstatistikler
          </button>
          <button
            onClick={() => setTab("actions")}
            className={cn(
              "tm-tap flex-1 py-2 text-xs font-bold",
              tab === "actions" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            )}
          >
            Eylemler
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto tm-thin-scrollbar p-3">
          {tab === "overview" && (
            <OverviewTab
              player={player}
              teamColor={teamColor}
              photo={photo}
              fileRef={fileRef}
              onPhotoUpload={onPhotoUpload}
              technical={technical}
              mental={mental}
              physical={physical}
              locale={locale}
              t={t}
            />
          )}
          {tab === "stats" && <StatsTab player={player} t={t} locale={locale} />}
          {tab === "actions" && (
            <ActionsTab player={player} teamColor={teamColor} onClose={onClose} t={t} locale={locale} />
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  player,
  teamColor,
  photo,
  fileRef,
  onPhotoUpload,
  technical,
  mental,
  physical,
  locale,
  t,
}: {
  player: Player;
  teamColor: string;
  photo: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  technical: { label: string; value: number | undefined }[];
  mental: { label: string; value: number | undefined }[];
  physical: { label: string; value: number | undefined }[];
  locale: "tr" | "en";
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="space-y-3">
      {/* Photo box + identity — sol üst */}
      <div className="flex gap-3">
        {/* Photo upload box */}
        <div className="shrink-0">
          <label className="relative block w-20 h-20 rounded-xl border-2 border-amber-500/30 bg-muted/30 overflow-hidden cursor-pointer group">
            {photo ? (
              <img src={photo} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <User size={20} className="text-white/30" />
                <span className="text-[8px] text-amber-300/70 mt-0.5 font-bold">{player.rating}</span>
                <span className="text-[7px] text-white/30 uppercase">GENEL</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
              <Upload size={12} className="text-white" />
              <span className="text-[7px] text-white font-bold mt-0.5">FOTO YÜKLE</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPhotoUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{player.firstName} {player.lastName}</div>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <PositionPill label={player.specificPosition} group={POSITION_GROUP[player.specificPosition]} />
            <span className="text-[10px] text-muted-foreground">{player.age}{t("common.year")}</span>
            <span className="text-[10px]">{player.nationality === "TR" ? "🇹🇷" : "🌍"}</span>
            <span className="text-[10px] text-muted-foreground">· {player.foot}</span>
            {player.height && (
              <span className="text-[10px] text-muted-foreground">· {player.height}cm</span>
            )}
          </div>
          {/* Arketip + playStyle */}
          {player.archetype && (
            <div className="mt-1.5">
              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300">
                {player.archetype}
              </span>
            </div>
          )}
          {player.playStyle && (
            <div className="mt-1">
              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300">
                {player.playStyle}
              </span>
            </div>
          )}
        </div>

        {/* OVR + radar chart altında */}
        <div className="text-right shrink-0 flex flex-col items-center">
          <div className="text-2xl font-bold text-amber-300 tabular-nums leading-none">{player.rating}</div>
          <div className="text-[8px] text-muted-foreground uppercase">OVR</div>
          {/* Radar chart — OVR'ın altında */}
          <StatRadar player={player} compact />
        </div>
      </div>

      {/* Traits */}
      {(player.traits.length > 0 || (player.negTraits && player.negTraits.length > 0)) && (
        <div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Yetenekler</div>
          <div className="flex flex-wrap gap-1">
            {player.traits.map((tr) => (
              <span key={tr} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {tr}
              </span>
            ))}
            {player.negTraits?.map((tr) => (
              <span key={tr} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                🚩 {tr}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fitness/form/morale bars */}
      <div className="grid grid-cols-3 gap-2">
        <MiniBar label="Kondisyon" value={player.cond} color="#3b82f6" />
        <MiniBar label="Form" value={player.form} color="#10b981" />
        <MiniBar label="Moral" value={player.morale} color="#f59e0b" />
      </div>

      {/* Stats — 3 sütun kompakt */}
      <div className="grid grid-cols-3 gap-2">
        <StatColumn title="Teknik" stats={technical} />
        <StatColumn title="Zihinsel" stats={mental} />
        <StatColumn title="Fiziksel" stats={physical} />
      </div>

      {/* Match stats */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border">
        <StatTile label="Maç" value={player.appearances} />
        <StatTile label="Gol" value={player.goals} />
        <StatTile label="Asist" value={player.assists} />
        <StatTile label="Değer" value={formatEuro(player.marketValue, locale)} small />
      </div>

      {/* Gelişim grafiği — son maç rating'leri */}
      {player.match_ratings && player.match_ratings.length > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1 font-bold">Son Maç Puanları</div>
          <div className="flex items-end gap-1 h-12">
            {player.match_ratings.slice(-10).map((r, i) => {
              const pct = ((r - 3) / 7) * 100; // 3-10 arası → 0-100%
              const color = r >= 7 ? "bg-emerald-500" : r >= 6 ? "bg-amber-400" : "bg-red-500";
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className="text-[7px] text-muted-foreground mb-0.5">{r.toFixed(1)}</span>
                  <div
                    className={cn("w-full rounded-sm", color)}
                    style={{ height: `${Math.max(10, pct)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[7px] text-muted-foreground mt-0.5">
            <span>Eski</span>
            <span>Şimdi</span>
          </div>
          {/* Gelişim özeti */}
          {player.match_ratings.length >= 2 && (() => {
            const recent = player.match_ratings.slice(-5);
            const old = player.match_ratings.slice(0, 5);
            const recentAvg = recent.reduce((s, r) => s + r, 0) / recent.length;
            const oldAvg = old.reduce((s, r) => s + r, 0) / old.length;
            const change = recentAvg - oldAvg;
            return (
              <div className="flex justify-between text-[9px] mt-1">
                <span className="text-muted-foreground">Ortalama: {recentAvg.toFixed(1)}</span>
                <span className={change >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ===== İstatistikler sekmesi — kariyer sezon sezon =====
function StatsTab({
  player,
  t,
  locale,
}: {
  player: Player;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: "tr" | "en";
}) {
  const isGK = player.specificPosition === "GK";
  // Eğer seasonHistory yoksa (ör. Supabase'den gelen oyuncu), mevcut stat'lardan üret
  const history: SeasonStat[] = player.seasonHistory ?? generateFallbackHistory(player);

  // Kariyer toplamları
  const totals = history.reduce(
    (acc, s) => {
      acc.apps += s.appearances;
      acc.goals += s.goals;
      acc.assists += s.assists;
      acc.yellow += s.yellowCards;
      acc.red += s.redCards;
      acc.minutes += s.minutesPlayed;
      return acc;
    },
    { apps: 0, goals: 0, assists: 0, yellow: 0, red: 0, minutes: 0 }
  );

  if (history.length === 0) {
    return (
      <div className="tm-card p-4 text-center text-xs text-muted-foreground">
        Bu oyuncunun kayıtlı sezon geçmişi yok.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Kariyer özeti */}
      <div className="tm-card p-2.5">
        <div className="text-[9px] text-muted-foreground uppercase tracking-wide font-bold mb-2">Kariyer Toplamı</div>
        <div className="grid grid-cols-4 gap-1.5">
          <CareerStat label="Maç" value={totals.apps} color="text-sky-400" />
          <CareerStat label="Gol" value={totals.goals} color="text-emerald-400" />
          <CareerStat label="Asist" value={totals.assists} color="text-amber-400" />
          <CareerStat label="Dk" value={totals.minutes} color="text-purple-400" />
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Sarı Kart</span>
            <span className="font-bold text-yellow-400 tabular-nums">{totals.yellow}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Kırmızı Kart</span>
            <span className="font-bold text-red-400 tabular-nums">{totals.red}</span>
          </div>
        </div>
      </div>

      {/* Sezon sezon listesi — alt alta */}
      <div className="space-y-1.5">
        {history.map((s, idx) => (
          <SeasonRow key={`${s.season}-${idx}`} season={s} isGK={isGK} />
        ))}
      </div>
    </div>
  );
}

function CareerStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-muted/30 rounded px-1 py-1 text-center">
      <div className={cn("text-sm font-bold tabular-nums leading-none", color)}>{value}</div>
      <div className="text-[8px] text-muted-foreground uppercase mt-0.5">{label}</div>
    </div>
  );
}

// Supabase'den gelen oyuncularda seasonHistory yoksa — mevcut stat'lardan üret
const FALLBACK_CLUBS = [
  "Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor",
  "Başakşehir", "Adana Demir", "Konyaspor", "Antalyaspor",
  "Alanyaspor", "Sivasspor", "Kayserispor", "Gaziantep FK",
  "Kasımpaşa", "Karagümrük", "Göztepe", "Samsunspor",
];

function generateFallbackHistory(player: Player): SeasonStat[] {
  const age = player.age ?? 20;
  const careerStartAge = 17;
  if (age <= careerStartAge) return [];

  const totalSeasons = Math.min(age - careerStartAge, 18);
  const currentYear = new Date().getFullYear();
  const baseTier = player.rating >= 75 ? 1 : player.rating >= 65 ? 2 : player.rating >= 55 ? 3 : 4;
  const isGK = player.specificPosition === "GK";
  const isAtt = player.specificPosition.startsWith("ST") || player.specificPosition === "CF" || player.specificPosition.startsWith("W");
  const isMid = player.specificPosition.startsWith("CM") || player.specificPosition.startsWith("AM") || player.specificPosition.startsWith("DM");

  const seasons: SeasonStat[] = [];
  for (let i = 0; i < totalSeasons; i++) {
    const seasonAge = careerStartAge + i;
    const startYear = currentYear - (totalSeasons - i);
    const youngFactor = seasonAge < 20 ? 0.4 : seasonAge < 23 ? 0.7 : 1.0;
    const primeFactor = seasonAge >= 24 && seasonAge <= 29 ? 1.15 : 1.0;
    const perf = youngFactor * primeFactor;

    const tierBoost = Math.floor((seasonAge - careerStartAge) / 4);
    const tier = Math.max(1, Math.min(4, baseTier - tierBoost));

    const apps = Math.max(0, Math.round((player.appearances ?? 18) * perf * (0.7 + Math.random() * 0.6)));
    const gMax = isGK ? 0 : isAtt ? 18 : isMid ? 8 : 3;
    const aMax = isGK ? 0 : isAtt ? 10 : isMid ? 12 : 5;
    const goals = Math.round(Math.random() * gMax * perf);
    const assists = Math.round(Math.random() * aMax * perf);
    const yellowCards = Math.round(Math.random() * 8 * perf);
    const redCards = Math.random() < 0.15 ? 1 : 0;
    const avgRating = Math.max(4.5, Math.min(9.5, Math.round((5.8 + Math.random() * 2.5 + (player.rating - 60) * 0.02) * 10) / 10));
    const minutesPlayed = apps * Math.round(60 + Math.random() * 30);

    seasons.push({
      season: `${startYear}/${String(startYear + 1).slice(-2)}`,
      club: FALLBACK_CLUBS[Math.floor(Math.random() * FALLBACK_CLUBS.length)],
      leagueTier: tier,
      appearances: apps,
      goals,
      assists,
      yellowCards,
      redCards,
      avgRating,
      minutesPlayed,
    });
  }
  return seasons.reverse();
}

function SeasonRow({ season, isGK }: { season: SeasonStat; isGK: boolean }) {
  const tierLabel = ["", "Süper Lig", "1. Lig", "2. Lig", "3. Lig"][season.leagueTier] ?? "—";
  const tierColor =
    season.leagueTier === 1 ? "bg-emerald-500/20 text-emerald-300"
    : season.leagueTier === 2 ? "bg-sky-500/20 text-sky-300"
    : season.leagueTier === 3 ? "bg-amber-500/20 text-amber-300"
    : "bg-muted text-muted-foreground";

  // Rating renk
  const ratingColor =
    season.avgRating >= 7.5 ? "text-emerald-400"
    : season.avgRating >= 6.5 ? "text-amber-300"
    : "text-red-400";

  return (
    <div className="tm-card p-2">
      {/* Üst satır: sezon + kulüp + lig */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold tabular-nums shrink-0">{season.season}</span>
          <span className="text-[10px] text-muted-foreground truncate">· {season.club}</span>
        </div>
        <span className={cn("text-[8px] px-1.5 py-0.5 rounded font-bold shrink-0", tierColor)}>
          {tierLabel}
        </span>
      </div>

      {/* Alt satır: istatistikler (6 sütun) */}
      <div className="grid grid-cols-6 gap-1 text-center">
        <SeasonCell label="Maç" value={season.appearances} color="text-sky-400" />
        {!isGK ? (
          <>
            <SeasonCell label="Gol" value={season.goals} color="text-emerald-400" />
            <SeasonCell label="Asist" value={season.assists} color="text-amber-400" />
          </>
        ) : (
          <>
            <SeasonCell label="Dk" value={season.minutesPlayed} color="text-purple-400" />
            <SeasonCell label="Krt" value={season.yellowCards + season.redCards} color="text-orange-400" />
          </>
        )}
        <SeasonCell label="Sarı" value={season.yellowCards} color="text-yellow-400" />
        <SeasonCell label="Krm" value={season.redCards} color="text-red-400" />
        <div className="flex flex-col items-center justify-center">
          <span className={cn("text-[11px] font-bold tabular-nums leading-none", ratingColor)}>
            {season.avgRating.toFixed(1)}
          </span>
          <span className="text-[7px] text-muted-foreground uppercase mt-0.5">Puan</span>
        </div>
      </div>
    </div>
  );
}

function SeasonCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <span className={cn("text-[11px] font-bold tabular-nums leading-none", color)}>{value}</span>
      <span className="text-[7px] text-muted-foreground uppercase mt-0.5">{label}</span>
    </div>
  );
}

function StatColumn({
  title,
  stats,
}: {
  title: string;
  stats: { label: string; value: number | undefined }[];
}) {
  return (
    <div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1 font-bold">{title}</div>
      <div className="space-y-0.5">
        {stats.map((s) => (
          <div key={s.label} className="flex justify-between items-center text-[9px]">
            <span className="text-muted-foreground truncate flex-1 mr-1">{s.label}</span>
            <StatValue value={s.value} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatValue({ value }: { value: number | undefined }) {
  if (value === undefined) return <span className="text-muted-foreground/50">—</span>;
  const cls =
    value >= 80 ? "text-emerald-400"
    : value >= 65 ? "text-emerald-300"
    : value >= 50 ? "text-amber-300"
    : value >= 35 ? "text-orange-400"
    : "text-red-400";
  return <span className={cn("font-bold tabular-nums", cls)}>{value}</span>;
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[9px] mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function StatTile({ label, value, small }: { label: string; value: number | string; small?: boolean }) {
  return (
    <div className="tm-card p-1.5 text-center">
      <div className={cn("font-bold tabular-nums", small ? "text-[9px]" : "text-sm")}>{value}</div>
      <div className="text-[8px] text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

function ActionsTab({
  player,
  teamColor,
  onClose,
  t,
  locale,
}: {
  player: Player;
  teamColor: string;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: "tr" | "en";
}) {
  const { listPlayerForSale, transfer } = useAppStore();
  const myTeam = useMyTeam();
  const [listPrice, setListPrice] = useState(player.marketValue);
  const [loanFee, setLoanFee] = useState(Math.round(player.marketValue * 0.05));
  const [loanWeeks, setLoanWeeks] = useState(8);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isListed = transfer.myListedPlayers.some((l) => l.playerId === player.id);
  // Oyuncu kullanıcının takımında mı?
  const isMyPlayer = myTeam?.players.some((p) => p.id === player.id) ?? false;

  const handleList = () => {
    haptic("success");
    listPlayerForSale(player.id, listPrice);
    setFeedback("✓ Transfer listesine eklendi");
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleLoan = () => {
    haptic("success");
    setFeedback(`✓ Kiralık pazarına gönderildi (${loanWeeks} hafta, ${formatEuro(loanFee, locale)}/gün)`);
    setTimeout(() => setFeedback(null), 2500);
  };

  return (
    <div className="space-y-3">
      {/* Player mini header */}
      <div className="flex items-center gap-2 p-2 tm-card">
        <PlayerAvatar initials={`${player.firstName[0]}${player.lastName[0]}`} size={36} color={teamColor} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{player.firstName} {player.lastName}</div>
          <div className="text-[10px] text-muted-foreground">
            {player.specificPosition} · {player.age}{t("common.year")} · {formatEuro(player.marketValue, locale)}
          </div>
        </div>
        <RatingBadge value={player.formRating} />
      </div>

      {!isMyPlayer ? (
        <div className="tm-card p-4 text-center">
          <div className="text-xs text-muted-foreground">
            Bu oyuncu senin takımında değil. Sadece kendi oyuncularını transfer listesine veya kiralık listesine koyabilirsin.
          </div>
        </div>
      ) : (
      <>
      {/* Normal transfer — satışa listele */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Banknote size={14} className="text-emerald-400" />
          <span className="text-xs font-bold">Transfer (Satış)</span>
        </div>
        <div className="text-[10px] text-muted-foreground mb-2">
          Oyuncuyu transfer listesine koy. Bot kulüpler teklif gönderecek.
        </div>
        <div className="mb-2">
          <div className="text-[10px] text-muted-foreground mb-1">Satılık Fiyat</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setListPrice(Math.max(0, listPrice - 50000))}
              className="tm-tap w-7 h-7 rounded-md border border-border text-sm font-bold"
            >−</button>
            <input
              type="number"
              value={listPrice}
              onChange={(e) => setListPrice(Number(e.target.value))}
              className="flex-1 bg-card border border-border rounded-md px-2 py-1 text-xs font-bold tabular-nums text-center"
            />
            <button
              onClick={() => setListPrice(listPrice + 50000)}
              className="tm-tap w-7 h-7 rounded-md border border-border text-sm font-bold"
            >+</button>
          </div>
        </div>
        <button
          onClick={handleList}
          disabled={isListed}
          className={cn(
            "tm-tap w-full py-2 rounded-md text-xs font-bold",
            isListed ? "bg-muted text-muted-foreground" : "bg-emerald-600 text-white"
          )}
        >
          {isListed ? "✓ Listede" : "Transfer Listesine Koy"}
        </button>
      </div>

      {/* Kiralık transfer */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <ArrowLeftRight size={14} className="text-sky-400" />
          <span className="text-xs font-bold">Kiralık Transfer</span>
        </div>
        <div className="text-[10px] text-muted-foreground mb-2">
          Oyuncuyu belirli süreliğine başka kulübe kirala.
        </div>
        <div className="mb-2">
          <div className="text-[10px] text-muted-foreground mb-1">Günlük Kira Ücreti (€)</div>
          <input
            type="number"
            value={loanFee}
            onChange={(e) => setLoanFee(Number(e.target.value))}
            className="w-full bg-card border border-border rounded-md px-2 py-1 text-xs font-bold tabular-nums"
          />
          {/* Quick percent buttons */}
          <div className="flex gap-1 mt-1">
            {[10, 15, 20, 30].map((pct) => (
              <button
                key={pct}
                onClick={() => setLoanFee(Math.round(player.marketValue * pct / 1000))}
                className="tm-tap flex-1 py-0.5 rounded text-[9px] font-semibold border border-border"
              >
                %{pct}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-2">
          <div className="text-[10px] text-muted-foreground mb-1">Süre (Hafta): {loanWeeks}</div>
          <input
            type="range"
            min={1}
            max={34}
            value={loanWeeks}
            onChange={(e) => setLoanWeeks(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted accent-primary tm-tap"
          />
        </div>
        <button
          onClick={handleLoan}
          className="tm-tap w-full py-2 rounded-md text-xs font-bold bg-sky-600 text-white"
        >
          Kiralık Pazarına Gönder
        </button>
      </div>

      {feedback && (
        <div className="tm-card p-2.5 text-center text-xs font-bold bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
          {feedback}
        </div>
      )}

      </>
      )}

      {/* Quick stats summary */}
      <div className="tm-card p-2.5">
        <div className="text-[9px] text-muted-foreground uppercase mb-1.5">Hızlı Bilgi</div>
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Piyasa Değeri</span><span className="font-bold tabular-nums">{formatEuro(player.marketValue, locale)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Haftalık Maaş</span><span className="font-bold tabular-nums">{formatEuro(player.weeklyWage, locale)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Potansiyel</span><span className="font-bold tabular-nums">{player.potential}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Sözleşme</span><span className="font-bold">2 yıl</span></div>
        </div>
      </div>
    </div>
  );
}

// 6 eksenli radar chart — SVG (compact modda yuvarlak alana sığar)
function StatRadar({ player, compact = false }: { player: Player; compact?: boolean }) {
  const isGK = player.specificPosition === "GK";
  const axes = isGK
    ? [
        { label: "Refleks", value: player.goalkeeping ?? 50 },
        { label: "Top Tutma", value: player.goalkeeping ?? 50 },
        { label: "Hava", value: player.heading ?? 50 },
        { label: "Alan", value: player.positioning ?? 50 },
        { label: "Pas", value: player.passing ?? 50 },
        { label: "Mental", value: player.leadership ?? 50 },
      ]
    : [
        { label: "Hız", value: player.stats?.pace ?? 50 },
        { label: "Şut", value: player.stats?.shooting ?? 50 },
        { label: "Pas", value: player.stats?.passing ?? 50 },
        { label: "Dribling", value: player.stats?.dribbling ?? 50 },
        { label: "Defans", value: player.stats?.defending ?? 50 },
        { label: "Fizik", value: player.stats?.physical ?? 50 },
      ];
  // compact: yuvarlak alana sığdır (80x80), normal: 95x95
  const size = compact ? 80 : 95;
  const cx = size / 2;
  const cy = size / 2;
  const R = compact ? 26 : 36;
  const labelOffset = compact ? 11 : 10;
  const fontSize = compact ? 5.5 : 7;
  const n = axes.length;
  const points = axes.map((a, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, a.value)) / 100) * R;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, lx: cx + Math.cos(angle) * (R + labelOffset), ly: cy + Math.sin(angle) * (R + labelOffset), label: a.label, value: a.value };
  });
  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");
  const rings = [25, 50, 75, 100];
  const avg = Math.round(points.reduce((s, p) => s + p.value, 0) / n);
  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <defs><linearGradient id="radar-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981" stopOpacity="0.6" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" /></linearGradient></defs>
        {rings.map((r) => { const ringPts = axes.map((_, i) => { const angle = (Math.PI * 2 * i) / n - Math.PI / 2; return `${cx + Math.cos(angle) * (R * r / 100)},${cy + Math.sin(angle) * (R * r / 100)}`; }).join(" "); return <polygon key={r} points={ringPts} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={0.5} />; })}
        {axes.map((_, i) => { const angle = (Math.PI * 2 * i) / n - Math.PI / 2; return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(angle) * R} y2={cy + Math.sin(angle) * R} stroke="currentColor" strokeOpacity={0.08} strokeWidth={0.5} />; })}
        <polygon points={polygon} fill="url(#radar-grad)" stroke="#10b981" strokeWidth={1.5} strokeLinejoin="round" />
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2} fill="#10b981" stroke="#fff" strokeWidth={0.8} />)}
        {points.map((p, i) => <text key={i} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle" className="fill-current text-muted-foreground" style={{ fontSize, fontWeight: 600 }}>{p.label}</text>)}
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
        <span className="text-[6px] text-muted-foreground uppercase">OVR</span>
        <span className="text-xs font-bold text-amber-300 tabular-nums leading-none">{avg}</span>
      </div>
    </div>
  );
}
