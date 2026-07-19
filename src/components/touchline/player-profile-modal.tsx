"use client";

import { useEffect, useRef, useState } from "react";
import { X, User, Upload, ArrowLeftRight, Banknote } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { POSITION_GROUP, type Player, type SeasonStat } from "@/lib/mock/data";
import { TIER_TEAM_NAMES, TEAM_NAME_BANK } from "@/lib/match/engine/constants";
import { SEASON_INFO } from "@/lib/mock/season";
import { useBodyScrollLock, useEscapeToClose } from "@/hooks/touchline";

// Oyun içi takım havuzu — Supabase'den gelen oyuncular için fallback
const FALLBACK_CLUBS: string[] = Array.from(new Set([
  ...TIER_TEAM_NAMES[1], ...TIER_TEAM_NAMES[2],
  ...TIER_TEAM_NAMES[3], ...TIER_TEAM_NAMES[4],
  ...TEAM_NAME_BANK,
]));
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
  const [arkModal, setArkModal] = useState<string | null>(null);

  // P0 FIX: Escape tuşu + body scroll lock
  useEscapeToClose(onClose);
  useBodyScrollLock(true);

  // BULGU #10 DÜZELTME (v2.9.1): reactive seasonMatchday — getState yerine
  const seasonMatchday = useAppStore((s) => s.seasonMatchday ?? 0);

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
    <div className="fixed inset-0 z-50 flex items-stretch justify-center">
      <div className="absolute inset-0 bg-black/85" onClick={onClose} aria-label="close" />

      <div className="relative w-full max-w-[440px] bg-background h-dvh flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border" style={{ background: "var(--primary)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-white truncate">{player.firstName} {player.lastName}</span>
            {/* P2: Sakatlık rozeti — ismin yanında */}
            {player.is_injured && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold bg-red-500 text-white shrink-0" title={player.injury?.remaining_days ? `${player.injury.remaining_days} gün sakat` : "Sakat"}>
                🤕 {player.injury?.remaining_days ? `${player.injury.remaining_days}g` : "Sakat"}
              </span>
            )}
            {/* P0 FIX BUG #11: Cezalı rozeti — ismin yanında */}
            {player.suspended_until && Number(player.suspended_until) > seasonMatchday && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-white shrink-0" title={`Cezalı · ${Number(player.suspended_until) - seasonMatchday} maç`}>
                🟥 CEZALI {Number(player.suspended_until) - seasonMatchday}m
              </span>
            )}
            {/* TALİMAT: Takım adı ismin yanına */}
            {(() => {
              const allClubs = useAppStore.getState().clubs;
              const playerTeam = allClubs.find(c => c.players.some(p => p.id === player.id));
              return playerTeam ? (
                <span className="text-[10px] text-white/70 truncate">· {playerTeam.name}</span>
              ) : null;
            })()}
          </div>
          <button onClick={onClose} className="tm-tap p-1 text-white/80 shrink-0" aria-label={t("common.close")}>
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
              onArketipClick={(ark) => setArkModal(ark)}
            />
          )}
          {tab === "stats" && <StatsTab player={player} t={t} locale={locale} />}
          {tab === "actions" && (
            <ActionsTab player={player} teamColor={teamColor} onClose={onClose} t={t} locale={locale} />
          )}
        </div>
      </div>

      {/* Arketip açıklama modal'ı */}
      {arkModal && (
        <ArkInfoModal
          arketip={arkModal}
          position={player.specificPosition}
          onClose={() => setArkModal(null)}
        />
      )}
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
  onArketipClick,
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
  onArketipClick?: (ark: string) => void;
}) {
  // BULGU #10 DÜZELTME (v2.9.1): reactive seasonMatchday — getState değil
  const seasonMatchday = useAppStore((s) => s.seasonMatchday ?? 0);
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
                <span className="text-[10px] text-amber-300/70 mt-0.5 font-bold">{player.rating}</span>
                <span className="text-[11px] text-white/30 uppercase">GENEL</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
              <Upload size={12} className="text-white" />
              <span className="text-[11px] text-white font-bold mt-0.5">FOTO YÜKLE</span>
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
            {/* 🎭 Maç Karakteri rozeti */}
            {player.match_character && (() => {
              const chars: Record<string, { icon: string; name: string; color: string }> = {
                stable: { icon: "🔵", name: "İstikrarlı", color: "bg-sky-500/20 text-sky-300 border-sky-500/30" },
                inconsistent: { icon: "🟡", name: "İstikrarsız", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
                big_match: { icon: "🔥", name: "Büyük Maç", color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
                closer: { icon: "⏰", name: "Kapanma", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
                fast_starter: { icon: "🌅", name: "İlk Yarı", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
                clutch: { icon: "🧊", name: "Soğukkanlı", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
                hot_headed: { icon: "😤", name: "Sıcak Kanlı", color: "bg-red-500/20 text-red-300 border-red-500/30" },
                leader: { icon: "👑", name: "Lider", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
                injury_prone: { icon: "🩹", name: "Sakatlanabilir", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
                super_sub: { icon: "🪑", name: "Yedek Kulübü", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
              };
              const c = chars[player.match_character];
              if (!c) return null;
              return (
                <span className={`text-[10px] px-1 py-0.5 rounded font-bold border ${c.color}`} title={c.name}>
                  {c.icon} {c.name}
                </span>
              );
            })()}
            <span className="text-[10px] text-muted-foreground">{player.age}{t("common.year")}</span>
            <span className="text-[10px]">{player.nationality === "TR" ? "🇹🇷" : "🌍"}</span>
            <span className="text-[10px] text-muted-foreground">· {player.foot}</span>
            {player.height && (
              <span className="text-[10px] text-muted-foreground">· {player.height}cm</span>
            )}
          </div>
          {/* P2: Sakatlık paneli — oyuncu sakatsa kırmızı kutu göster */}
          {player.is_injured && (
            <div className="mt-1.5 p-2 rounded-lg bg-red-500/15 border border-red-500/40">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🤕</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-red-300">Sakat</div>
                  <div className="text-[11px] text-red-300/80">
                    {player.injury?.remaining_days
                      ? `${player.injury.remaining_days} gün sonra iyileşecek`
                      : "İyileşme süresi bilinmiyor"}
                    {player.injury?.type && ` · ${player.injury.type}`}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* P0 FIX BUG #11: Cezalı paneli — oyuncu cezalısysa turuncu kutu */}
          {player.suspended_until && Number(player.suspended_until) > seasonMatchday && (
            <div className="mt-1.5 p-2 rounded-lg bg-amber-500/15 border border-amber-500/40">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🟥</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-amber-300">Cezalı</div>
                  <div className="text-[11px] text-amber-300/80">
                    {Number(player.suspended_until) - seasonMatchday} maç sonra oynayabilir
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Arketip + playStyle — tıklanabilir */}
          {player.archetype && (
            <div className="mt-1.5">
              <button
                onClick={() => { haptic("light"); onArketipClick?.(player.archetype!); }}
                className="tm-tap inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
              >
                {player.archetype}
                <span className="text-[11px] opacity-60">ⓘ</span>
              </button>
            </div>
          )}
          {player.playStyle && (
            <div className="mt-1">
              <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold bg-sky-500/20 text-sky-300">
                {player.playStyle}
              </span>
            </div>
          )}
        </div>

        {/* OVR + radar chart altında */}
        <div className="text-right shrink-0 flex flex-col items-center">
          <div className="text-2xl font-bold text-amber-300 tabular-nums leading-none">{player.rating}</div>
          <div className="text-[10px] text-muted-foreground uppercase">OVR</div>
          {/* Radar chart — OVR'ın altında */}
          <StatRadar player={player} compact />
        </div>
      </div>

      {/* Traits */}
      {(player.traits.length > 0 || (player.negTraits && player.negTraits.length > 0)) && (
        <div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Yetenekler</div>
          <div className="flex flex-wrap gap-1">
            {player.traits.map((tr) => (
              <span key={tr} className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {tr}
              </span>
            ))}
            {player.negTraits?.map((tr) => (
              <span key={tr} className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
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
        <StatColumn title="Teknik" stats={technical} playerId={player.id} statKeys={["goalkeeping","goalkeeping","goalkeeping","heading","positioning","passing","goalkeeping","leadership","concentration","agility","finishing","dribbling","firstTouch","heading","marking","crossing","passing","technique","tackling","longShots"]} />
        <StatColumn title="Zihinsel" stats={mental} playerId={player.id} statKeys={["aggression","bravery","workRate","decisions","determination","concentration","leadership","anticipation","flair","positioning","composure","teamwork","vision"]} />
        <StatColumn title="Fiziksel" stats={physical} playerId={player.id} statKeys={["agility","stamina","balance","strength","speed","acceleration","jumping","leftFoot","rightFoot"]} />
      </div>

      {/* Match stats */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border">
        <StatTile label="Maç" value={player.appearances} />
        <StatTile label="Gol" value={player.goals} />
        <StatTile label="Asist" value={player.assists} />
        <StatTile label="MoM" value={player.motmAwards ?? 0} />
      </div>

      {/* Güncel sezon kartı — sezon istatistikleri + gol türü dağılımı */}
      <CurrentSeasonCard player={player} locale={locale} />

      {/* Gelişim grafiği — son maç rating'leri */}
      {player.match_ratings && player.match_ratings.length > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1 font-bold">Son Maç Puanları</div>
          <div className="flex items-end gap-1 h-12">
            {player.match_ratings.slice(-10).map((r, i) => {
              const pct = ((r - 3) / 7) * 100; // 3-10 arası → 0-100%
              const color = r >= 7 ? "bg-emerald-500" : r >= 6 ? "bg-amber-400" : "bg-red-500";
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className="text-[11px] text-muted-foreground mb-0.5">{r.toFixed(1)}</span>
                  <div
                    className={cn("w-full rounded-sm", color)}
                    style={{ height: `${Math.max(10, pct)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground mt-0.5">
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
              <div className="flex justify-between text-[11px] mt-1">
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
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Kariyer toplamları
  const totals = history.reduce(
    (acc, s) => {
      acc.apps += s.appearances;
      acc.goals += s.goals;
      acc.assists += s.assists;
      acc.yellow += s.yellowCards;
      acc.red += s.redCards;
      acc.minutes += s.minutesPlayed;
      acc.right += s.goalsRight ?? 0;
      acc.left += s.goalsLeft ?? 0;
      acc.head += s.goalsHead ?? 0;
      acc.penalty += s.goalsPenalty ?? 0;
      acc.freekick += s.goalsFreekick ?? 0;
      return acc;
    },
    { apps: 0, goals: 0, assists: 0, yellow: 0, red: 0, minutes: 0, right: 0, left: 0, head: 0, penalty: 0, freekick: 0 }
  );

  if (history.length === 0) {
    return (
      <div className="tm-card p-4 text-center text-xs text-muted-foreground">
        Bu oyuncunun kayıtlı sezon geçmişi yok.
      </div>
    );
  }

  const toggleExpand = (idx: number) => {
    haptic("light");
    setExpandedIdx(expandedIdx === idx ? null : idx);
  };

  return (
    <div className="space-y-2.5">
      {/* Kariyer özeti */}
      <div className="tm-card p-2.5">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-bold mb-2">Kariyer Toplamı</div>
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

      {/* Kariyer Gol Dağılımı kartı (C) — sadece gol atan oyuncular için */}
      {!isGK && totals.goals > 0 && (
        <GoalDistributionCard totals={totals} />
      )}

      {/* Sezon sezon listesi — kompakt tek satır */}
      <div className="space-y-0.5">
        {/* Başlık satırı — sola yaslı, sıkışık */}
        <div className="flex items-center gap-0.5 text-[11px] uppercase text-muted-foreground font-bold px-1">
          <span className="shrink-0 w-9">Sezon</span>
          <span className="shrink-0 w-4 text-center">L</span>
          <span className="flex-1 min-w-0">Kulüp</span>
          <span className="shrink-0 w-4 text-right">M</span>
          {!isGK ? (
            <>
              <span className="shrink-0 w-4 text-right">G</span>
              <span className="shrink-0 w-4 text-right">A</span>
            </>
          ) : (
            <>
              <span className="shrink-0 w-7 text-right">Dk</span>
              <span className="shrink-0 w-4 text-right">Kr</span>
            </>
          )}
          <span className="shrink-0 w-3 text-right">S</span>
          <span className="shrink-0 w-3 text-right">K</span>
          <span className="shrink-0 w-6 text-right">Puan</span>
        </div>
        {history.map((s, idx) => (
          <div key={`${s.season}-${idx}`}>
            <SeasonRow
              season={s}
              isGK={isGK}
              expanded={expandedIdx === idx}
              onToggle={() => toggleExpand(idx)}
            />
            {expandedIdx === idx && !isGK && s.goals > 0 && (
              <SeasonGoalBreakdown season={s} />
            )}
          </div>
        ))}
      </div>

      {/* TALİMAT: Sakatlık geçmişi — istatistikler sekmesinin en altında */}
      {(() => {
        const injuries = (player as any).injury_history ?? [];
        if (injuries.length === 0) {
          return (
            <div className="tm-card p-2.5">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-bold mb-1">🩹 Sakatlık Geçmişi</div>
              <div className="text-[10px] text-muted-foreground text-center py-1">Kayıtlı sakatlık yok.</div>
            </div>
          );
        }
        return (
          <div className="tm-card p-2.5">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-bold mb-2">🩹 Sakatlık Geçmişi</div>
            <div className="space-y-1">
              {injuries.map((inj: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-[10px] py-1 border-b border-border/30 last:border-b-0">
                  <span className="text-muted-foreground">{inj.date ?? "—"}</span>
                  <span className="font-medium">{inj.type ?? "Sakatlık"}</span>
                  <span className="text-muted-foreground tabular-nums">{inj.duration_days ?? inj.remaining_days ?? "?"} gün</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Kariyer Gol Dağılımı kartı (C)
function GoalDistributionCard({ totals }: {
  totals: { goals: number; right: number; left: number; head: number; penalty: number; freekick: number };
}) {
  const total = totals.goals;
  if (total === 0) return null;
  const pct = (n: number) => Math.round((n / total) * 100);
  const segments = [
    { label: "Sağ Ayak", value: totals.right, color: "bg-sky-500", text: "text-sky-400" },
    { label: "Sol Ayak", value: totals.left, color: "bg-amber-500", text: "text-amber-400" },
    { label: "Kafa", value: totals.head, color: "bg-purple-500", text: "text-purple-400" },
    { label: "Penaltı", value: totals.penalty, color: "bg-emerald-500", text: "text-emerald-400" },
    { label: "Serbest", value: totals.freekick, color: "bg-red-500", text: "text-red-400" },
  ];
  return (
    <div className="tm-card p-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-bold">Kariyer Gol Dağılımı</div>
        <div className="text-[10px] font-bold text-emerald-400 tabular-nums">{total} gol</div>
      </div>
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-muted mb-2">
        {segments.map((seg) => seg.value > 0 && (
          <div
            key={seg.label}
            className={cn(seg.color, "transition-all")}
            style={{ width: `${pct(seg.value)}%` }}
            title={`${seg.label}: ${seg.value} (${pct(seg.value)}%)`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-5 gap-1">
        {segments.map((seg) => (
          <div key={seg.label} className="text-center">
            <div className="flex items-center justify-center gap-0.5 mb-0.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", seg.color)} />
            </div>
            <div className={cn("text-[10px] font-bold tabular-nums leading-none", seg.text)}>{seg.value}</div>
            <div className="text-[11px] text-muted-foreground uppercase leading-none mt-0.5">{seg.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sezon gol türü breakdown paneli (A) — açılır
function SeasonGoalBreakdown({ season }: { season: SeasonStat }) {
  const items = [
    { label: "Sağ Ayak", value: season.goalsRight ?? 0, color: "text-sky-400", dot: "bg-sky-500" },
    { label: "Sol Ayak", value: season.goalsLeft ?? 0, color: "text-amber-400", dot: "bg-amber-500" },
    { label: "Kafa", value: season.goalsHead ?? 0, color: "text-purple-400", dot: "bg-purple-500" },
    { label: "Penaltı", value: season.goalsPenalty ?? 0, color: "text-emerald-400", dot: "bg-emerald-500" },
    { label: "Serbest", value: season.goalsFreekick ?? 0, color: "text-red-400", dot: "bg-red-500" },
  ].filter((it) => it.value > 0);

  if (items.length === 0) return null;

  return (
    <div className="tm-card px-2 py-1.5 mx-1 mb-1 bg-muted/20 border-l-2 border-amber-500/40">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground uppercase font-bold shrink-0">Gol Türü:</span>
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full", it.dot)} />
            <span className={cn("text-[11px] font-bold tabular-nums", it.color)}>{it.value}</span>
            <span className="text-[10px] text-muted-foreground">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CareerStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-muted/30 rounded px-1 py-1 text-center">
      <div className={cn("text-sm font-bold tabular-nums leading-none", color)}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase mt-0.5">{label}</div>
    </div>
  );
}

// Güncel sezon için gol türü breakdown — arketip + foot + rightFoot/leftFoot/heading'e göre deterministik
function computeGoalBreakdown(player: Player): {
  right: number; left: number; head: number; penalty: number; freekick: number;
} {
  const goals = player.goals ?? 0;
  if (goals === 0) return { right: 0, left: 0, head: 0, penalty: 0, freekick: 0 };

  const foot = player.foot ?? "Right";
  const heading = player.heading ?? 50;
  const rightFootStat = player.rightFoot ?? 50;
  const leftFootStat = player.leftFoot ?? 30;
  const archetype = player.archetype ?? "";
  const pos = player.specificPosition;
  const isAtt = pos.startsWith("ST") || pos === "CF" || pos.startsWith("W");
  const isMid = pos.startsWith("CM") || pos.startsWith("AM") || pos.startsWith("DM");

  // Arketip baz ağırlıkları (fallback ile aynı tablo)
  const ARK_MOD: Record<string, { right: number; left: number; head: number }> = {
    "Gol Makinesi":   { right: 0.45, left: 0.40, head: 0.15 },
    "Bitirici":       { right: 0.50, left: 0.35, head: 0.15 },
    "Hedef Adam":     { right: 0.30, left: 0.25, head: 0.45 },
    "Fırsatçı":       { right: 0.40, left: 0.35, head: 0.25 },
    "Hızlı Forvet":   { right: 0.50, left: 0.40, head: 0.10 },
    "İkinci Forvet":  { right: 0.40, left: 0.40, head: 0.20 },
    "Yaratıcı Forvet":{ right: 0.40, left: 0.40, head: 0.20 },
    "Hızlı Kanat":    { right: 0.55, left: 0.35, head: 0.10 },
    "İçeri Dönen":    { right: 0.50, left: 0.40, head: 0.10 },
    "Dribling Ustası":{ right: 0.45, left: 0.40, head: 0.15 },
    "Kanat":          { right: 0.50, left: 0.35, head: 0.15 },
    "Playmaker":      { right: 0.50, left: 0.35, head: 0.15 },
    "Numara 10":      { right: 0.45, left: 0.40, head: 0.15 },
    "Yaratıcı":       { right: 0.50, left: 0.35, head: 0.15 },
    "Oyun Kurucu":    { right: 0.50, left: 0.35, head: 0.15 },
    "Motor":          { right: 0.50, left: 0.30, head: 0.20 },
    "Truva Atı":      { right: 0.45, left: 0.30, head: 0.25 },
    "Pas Ustası":     { right: 0.55, left: 0.30, head: 0.15 },
    "Box-to-Box":     { right: 0.45, left: 0.35, head: 0.20 },
    "Tempo Kontrolcüsü":{ right: 0.55, left: 0.30, head: 0.15 },
    "Yıkıcı":         { right: 0.45, left: 0.30, head: 0.25 },
    "Regista":        { right: 0.55, left: 0.30, head: 0.15 },
    "Ekran Oyuncusu": { right: 0.45, left: 0.35, head: 0.20 },
    "Duvar Orta Saha":{ right: 0.45, left: 0.30, head: 0.25 },
    "Duvar":          { right: 0.40, left: 0.25, head: 0.35 },
    "Lider Stoper":   { right: 0.40, left: 0.25, head: 0.35 },
    "Top Çıkan Stoper":{ right: 0.45, left: 0.30, head: 0.25 },
    "Hava Hakimi":    { right: 0.30, left: 0.20, head: 0.50 },
    "Baskı Ustası":   { right: 0.45, left: 0.30, head: 0.25 },
    "Kale Gibi":      { right: 0.45, left: 0.30, head: 0.25 },
    "Kanat Beki":     { right: 0.50, left: 0.35, head: 0.15 },
    "Hücumcu Bek":    { right: 0.50, left: 0.35, head: 0.15 },
    "Defansif Bek":   { right: 0.50, left: 0.30, head: 0.20 },
    "Ters Bek":       { right: 0.45, left: 0.40, head: 0.15 },
    "Ofansif Bek":    { right: 0.50, left: 0.35, head: 0.15 },
  };
  const arkMod = ARK_MOD[archetype] ?? { right: 0.45, left: 0.30, head: 0.25 };

  let wRight = arkMod.right;
  let wLeft = arkMod.left;
  let wHead = arkMod.head;

  // rightFoot/leftFoot stat oranına göre kaydır
  const totalFootStat = Math.max(1, rightFootStat + leftFootStat);
  const footRightShare = rightFootStat / totalFootStat;
  const footLeftShare = leftFootStat / totalFootStat;

  if (foot === "Left") {
    wLeft = Math.max(wLeft, wRight * 0.8);
    wRight = wRight * 0.6;
  } else if (foot === "Both") {
    wRight = (wRight + wLeft) * 0.45;
    wLeft = (wRight + wLeft) * 0.45;
  }
  const footDelta = (footRightShare - footLeftShare) * 0.3;
  wRight += footDelta;
  wLeft -= footDelta;

  const headDelta = (heading - 50) / 200;
  wHead = Math.max(0.05, Math.min(0.60, wHead + headDelta));

  wRight = Math.max(0.05, wRight);
  wLeft = Math.max(0.05, wLeft);
  wHead = Math.max(0.05, wHead);
  const wSum = wRight + wLeft + wHead;
  wRight /= wSum; wLeft /= wSum; wHead /= wSum;

  const penaltyRate = isAtt ? 0.18 : isMid ? 0.10 : 0.04;
  const freekickRate = isMid ? 0.08 : isAtt ? 0.05 : 0.02;

  // Deterministik: oyuncu ID'sine göre sabit seed
  const seed = player.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const rand = (i: number) => {
    const x = Math.sin(seed * 31 + i * 17) * 10000;
    return x - Math.floor(x);
  };

  let goalsPenalty = Math.round(goals * penaltyRate * (0.5 + rand(1)));
  let goalsFreekick = Math.round(goals * freekickRate * (0.3 + rand(2)));
  const setPieces = Math.min(goalsPenalty + goalsFreekick, goals);
  goalsPenalty = Math.min(goalsPenalty, setPieces);
  goalsFreekick = setPieces - goalsPenalty;
  const openGoals = goals - setPieces;
  let goalsRight = Math.round(openGoals * wRight);
  let goalsLeft = Math.round(openGoals * wLeft);
  let goalsHead = openGoals - goalsRight - goalsLeft;
  if (goalsHead < 0) { goalsRight += goalsHead; goalsHead = 0; }
  const drift = goals - (goalsRight + goalsLeft + goalsHead + goalsPenalty + goalsFreekick);
  if (drift !== 0) goalsRight += drift;
  if (goalsRight < 0) { goalsLeft += goalsRight; goalsRight = 0; }
  if (goalsLeft < 0) { goalsHead += goalsLeft; goalsLeft = 0; }

  return {
    right: Math.max(0, goalsRight),
    left: Math.max(0, goalsLeft),
    head: Math.max(0, goalsHead),
    penalty: goalsPenalty,
    freekick: goalsFreekick,
  };
}

// Güncel sezon kartı — sezon istatistikleri + gol türü dağılımı
function CurrentSeasonCard({ player, locale }: { player: Player; locale: "tr" | "en" }) {
  const isGK = player.specificPosition === "GK";
  const goals = player.goals ?? 0;
  const breakdown = computeGoalBreakdown(player);
  const hasGoals = !isGK && goals > 0;

  // Dakika tahmini (maç sayısı × ortalama 75 dk)
  const minutes = (player.appearances ?? 0) * 75;
  // Sarı/kırmızı kart canlı veri yok — 0 göster
  const yellow = 0;
  const red = 0;

  const segments = [
    { label: "Sağ", value: breakdown.right, color: "bg-sky-500", text: "text-sky-400" },
    { label: "Sol", value: breakdown.left, color: "bg-amber-500", text: "text-amber-400" },
    { label: "Kafa", value: breakdown.head, color: "bg-purple-500", text: "text-purple-400" },
    { label: "Pen", value: breakdown.penalty, color: "bg-emerald-500", text: "text-emerald-400" },
    { label: "Ser", value: breakdown.freekick, color: "bg-red-500", text: "text-red-400" },
  ];

  return (
    <div className="tm-card p-2.5 space-y-2">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-bold">Güncel Sezon</div>
        <div className="text-[11px] text-muted-foreground tabular-nums">
          {SEASON_INFO.year} · {SEASON_INFO.matchday}. {locale === "tr" ? "Hafta" : "GW"}
        </div>
      </div>

      {/* Sezon istatistikleri — kompakt */}
      <div className="grid grid-cols-6 gap-1">
        <SeasonStatMini label="Maç" value={player.appearances ?? 0} color="text-sky-400" />
        <SeasonStatMini label="Gol" value={goals} color="text-emerald-400" />
        <SeasonStatMini label="Asist" value={player.assists ?? 0} color="text-amber-400" />
        <SeasonStatMini label="Dk" value={minutes} color="text-purple-400" />
        <SeasonStatMini label="Sarı" value={yellow} color="text-yellow-400" />
        <SeasonStatMini label="Krm" value={red} color="text-red-400" />
      </div>

      {/* Gol türü dağılımı — sadece gol atan saha oyuncuları */}
      {hasGoals && (
        <div className="pt-1.5 border-t border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Gol Dağılımı</span>
            <span className="text-[11px] font-bold text-emerald-400 tabular-nums">{goals} gol</span>
          </div>
          {/* Stacked bar */}
          <div className="flex h-2 rounded-full overflow-hidden bg-muted mb-1.5">
            {segments.map((seg) => seg.value > 0 && (
              <div
                key={seg.label}
                className={cn(seg.color, "transition-all")}
                style={{ width: `${(seg.value / goals) * 100}%` }}
              />
            ))}
          </div>
          {/* Legend */}
          <div className="grid grid-cols-5 gap-0.5">
            {segments.map((seg) => (
              <div key={seg.label} className="text-center">
                <div className="flex items-center justify-center gap-0.5 mb-0.5">
                  <span className={cn("w-1 h-1 rounded-full", seg.color)} />
                </div>
                <div className={cn("text-[11px] font-bold tabular-nums leading-none", seg.text)}>{seg.value}</div>
                <div className="text-[11px] text-muted-foreground uppercase leading-none mt-0.5">{seg.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SeasonStatMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-muted/30 rounded px-0.5 py-1 text-center">
      <div className={cn("text-[11px] font-bold tabular-nums leading-none", color)}>{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase leading-none mt-0.5">{label}</div>
    </div>
  );
}

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

  // ===== Gol türü ağırlıkları — arketip + foot + rightFoot/leftFoot/heading =====
  const foot = player.foot ?? "Right";
  const heading = player.heading ?? 50;
  const rightFootStat = player.rightFoot ?? 50;
  const leftFootStat = player.leftFoot ?? 30;
  const archetype = player.archetype ?? "";

  // Arketip baz ağırlıkları (mock/data.ts ile aynı tablo)
  const ARK_MOD: Record<string, { right: number; left: number; head: number; goals: number }> = {
    "Gol Makinesi":   { right: 0.45, left: 0.40, head: 0.15, goals: 1.30 },
    "Bitirici":       { right: 0.50, left: 0.35, head: 0.15, goals: 1.20 },
    "Hedef Adam":     { right: 0.30, left: 0.25, head: 0.45, goals: 1.10 },
    "Fırsatçı":       { right: 0.40, left: 0.35, head: 0.25, goals: 1.15 },
    "Hızlı Forvet":   { right: 0.50, left: 0.40, head: 0.10, goals: 1.10 },
    "İkinci Forvet":  { right: 0.40, left: 0.40, head: 0.20, goals: 0.95 },
    "Yaratıcı Forvet":{ right: 0.40, left: 0.40, head: 0.20, goals: 0.85 },
    "Hızlı Kanat":    { right: 0.55, left: 0.35, head: 0.10, goals: 0.70 },
    "İçeri Dönen":    { right: 0.50, left: 0.40, head: 0.10, goals: 0.85 },
    "Dribling Ustası":{ right: 0.45, left: 0.40, head: 0.15, goals: 0.80 },
    "Kanat":          { right: 0.50, left: 0.35, head: 0.15, goals: 0.65 },
    "Playmaker":      { right: 0.50, left: 0.35, head: 0.15, goals: 0.50 },
    "Numara 10":      { right: 0.45, left: 0.40, head: 0.15, goals: 0.70 },
    "Yaratıcı":       { right: 0.50, left: 0.35, head: 0.15, goals: 0.55 },
    "Oyun Kurucu":    { right: 0.50, left: 0.35, head: 0.15, goals: 0.45 },
    "Motor":          { right: 0.50, left: 0.30, head: 0.20, goals: 0.55 },
    "Truva Atı":      { right: 0.45, left: 0.30, head: 0.25, goals: 0.65 },
    "Pas Ustası":     { right: 0.55, left: 0.30, head: 0.15, goals: 0.40 },
    "Box-to-Box":     { right: 0.45, left: 0.35, head: 0.20, goals: 0.60 },
    "Tempo Kontrolcüsü":{ right: 0.55, left: 0.30, head: 0.15, goals: 0.45 },
    "Yıkıcı":         { right: 0.45, left: 0.30, head: 0.25, goals: 0.30 },
    "Regista":        { right: 0.55, left: 0.30, head: 0.15, goals: 0.35 },
    "Ekran Oyuncusu": { right: 0.45, left: 0.35, head: 0.20, goals: 0.40 },
    "Duvar Orta Saha":{ right: 0.45, left: 0.30, head: 0.25, goals: 0.30 },
    "Duvar":          { right: 0.40, left: 0.25, head: 0.35, goals: 0.25 },
    "Lider Stoper":   { right: 0.40, left: 0.25, head: 0.35, goals: 0.30 },
    "Top Çıkan Stoper":{ right: 0.45, left: 0.30, head: 0.25, goals: 0.35 },
    "Hava Hakimi":    { right: 0.30, left: 0.20, head: 0.50, goals: 0.40 },
    "Baskı Ustası":   { right: 0.45, left: 0.30, head: 0.25, goals: 0.25 },
    "Kale Gibi":      { right: 0.45, left: 0.30, head: 0.25, goals: 0.20 },
    "Kanat Beki":     { right: 0.50, left: 0.35, head: 0.15, goals: 0.30 },
    "Hücumcu Bek":    { right: 0.50, left: 0.35, head: 0.15, goals: 0.45 },
    "Defansif Bek":   { right: 0.50, left: 0.30, head: 0.20, goals: 0.20 },
    "Ters Bek":       { right: 0.45, left: 0.40, head: 0.15, goals: 0.35 },
    "Ofansif Bek":    { right: 0.50, left: 0.35, head: 0.15, goals: 0.40 },
  };

  const arkMod = ARK_MOD[archetype] ?? { right: 0.45, left: 0.30, head: 0.25, goals: 0.60 };
  let wRight = arkMod.right;
  let wLeft = arkMod.left;
  let wHead = arkMod.head;

  // rightFoot/leftFoot stat oranına göre kaydır
  const totalFootStat = Math.max(1, rightFootStat + leftFootStat);
  const footRightShare = rightFootStat / totalFootStat;
  const footLeftShare = leftFootStat / totalFootStat;

  if (foot === "Left") {
    wLeft = Math.max(wLeft, wRight * 0.8);
    wRight = wRight * 0.6;
  } else if (foot === "Both") {
    wRight = (wRight + wLeft) * 0.45;
    wLeft = (wRight + wLeft) * 0.45;
  }
  const footDelta = (footRightShare - footLeftShare) * 0.3;
  wRight += footDelta;
  wLeft -= footDelta;

  const headDelta = (heading - 50) / 200;
  wHead = Math.max(0.05, Math.min(0.60, wHead + headDelta));

  wRight = Math.max(0.05, wRight);
  wLeft = Math.max(0.05, wLeft);
  wHead = Math.max(0.05, wHead);
  const wSum = wRight + wLeft + wHead;
  wRight /= wSum; wLeft /= wSum; wHead /= wSum;

  const penaltyRate = isAtt ? 0.18 : isMid ? 0.10 : 0.04;
  const freekickRate = isMid ? 0.08 : isAtt ? 0.05 : 0.02;
  const goalMult = arkMod.goals;

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
    const goals = Math.round(Math.random() * gMax * perf * goalMult);
    const assists = Math.round(Math.random() * aMax * perf);

    // Gol türü dağılımı
    let goalsPenalty = Math.round(goals * penaltyRate * (0.5 + Math.random()));
    let goalsFreekick = Math.round(goals * freekickRate * (0.3 + Math.random()));
    const setPieces = Math.min(goalsPenalty + goalsFreekick, goals);
    goalsPenalty = Math.min(goalsPenalty, setPieces);
    goalsFreekick = setPieces - goalsPenalty;
    const openGoals = goals - setPieces;
    let goalsRight = Math.round(openGoals * wRight);
    let goalsLeft = Math.round(openGoals * wLeft);
    let goalsHead = openGoals - goalsRight - goalsLeft;
    if (goalsHead < 0) { goalsRight += goalsHead; goalsHead = 0; }
    const drift = goals - (goalsRight + goalsLeft + goalsHead + goalsPenalty + goalsFreekick);
    if (drift !== 0) goalsRight += drift;
    if (goalsRight < 0) { goalsLeft += goalsRight; goalsRight = 0; }
    if (goalsLeft < 0) { goalsHead += goalsLeft; goalsLeft = 0; }

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
      goalsRight: Math.max(0, goalsRight),
      goalsLeft: Math.max(0, goalsLeft),
      goalsHead: Math.max(0, goalsHead),
      goalsPenalty,
      goalsFreekick,
    });
  }
  return seasons.reverse();
}

function SeasonRow({
  season,
  isGK,
  expanded = false,
  onToggle,
}: {
  season: SeasonStat;
  isGK: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const tierLabel = ["", "SL", "1L", "2L", "3L"][season.leagueTier] ?? "—";
  const tierColor =
    season.leagueTier === 1 ? "text-emerald-400"
    : season.leagueTier === 2 ? "text-sky-300"
    : season.leagueTier === 3 ? "text-amber-300"
    : "text-muted-foreground";

  // Rating renk
  const ratingColor =
    season.avgRating >= 7.5 ? "text-emerald-400"
    : season.avgRating >= 6.5 ? "text-amber-300"
    : "text-red-400";

  // Sadece gol atan saha oyuncuları genişletilebilir
  const canExpand = !isGK && season.goals > 0;

  return (
    <button
      type="button"
      onClick={canExpand ? onToggle : undefined}
      disabled={!canExpand}
      className={cn(
        "tm-card px-1 py-1 flex items-center gap-0.5 text-[11px] w-full text-left transition-colors",
        canExpand && "tm-tap hover:bg-accent/50",
        expanded && "bg-amber-500/5 border-amber-500/30"
      )}
    >
      {/* Sezon */}
      <span className="font-bold tabular-nums shrink-0 w-9">{season.season}</span>
      {/* Lig kodu */}
      <span className={cn("font-bold shrink-0 w-4 text-center", tierColor)}>{tierLabel}</span>
      {/* Kulüp — esnek genişlik */}
      <span className="text-muted-foreground truncate flex-1 min-w-0">{season.club}</span>
      {/* Stats — sabit genişlik */}
      <span className="text-sky-400 font-bold tabular-nums shrink-0 w-4 text-right">{season.appearances}</span>
      {!isGK ? (
        <>
          <span className={cn("text-emerald-400 font-bold tabular-nums shrink-0 w-4 text-right", canExpand && "underline decoration-dotted")}>
            {season.goals}
          </span>
          <span className="text-amber-400 font-bold tabular-nums shrink-0 w-4 text-right">{season.assists}</span>
        </>
      ) : (
        <>
          <span className="text-purple-400 font-bold tabular-nums shrink-0 w-7 text-right">{season.minutesPlayed}</span>
          <span className="text-orange-400 font-bold tabular-nums shrink-0 w-4 text-right">{season.yellowCards + season.redCards}</span>
        </>
      )}
      <span className="text-yellow-400 font-bold tabular-nums shrink-0 w-3 text-right">{season.yellowCards}</span>
      <span className="text-red-400 font-bold tabular-nums shrink-0 w-3 text-right">{season.redCards}</span>
      <span className={cn("font-bold tabular-nums shrink-0 w-6 text-right", ratingColor)}>{season.avgRating.toFixed(1)}</span>
    </button>
  );
}

function SeasonCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <span className={cn("text-[11px] font-bold tabular-nums leading-none", color)}>{value}</span>
      <span className="text-[11px] text-muted-foreground uppercase mt-0.5">{label}</span>
    </div>
  );
}

function StatColumn({
  title,
  stats,
  playerId,
  statKeys,
}: {
  title: string;
  stats: { label: string; value: number | undefined }[];
  playerId: string;
  statKeys: string[];
}) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1 font-bold">{title}</div>
      <div className="space-y-0.5">
        {stats.map((s, i) => (
          <div key={s.label} className="flex justify-between items-center text-[11px]">
            <span className="text-muted-foreground truncate flex-1 mr-1">{s.label}</span>
            <StatValue value={s.value} playerId={playerId} statKey={statKeys[i]} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatValue({ value, playerId, statKey }: { value: number | undefined; playerId?: string; statKey?: string }) {
  if (value === undefined) return <span className="text-muted-foreground/50">—</span>;
  // P0 FIX: Stat değerleri tam sayı göster
  const displayValue = Math.round(value);
  const cls =
    displayValue >= 80 ? "text-emerald-400"
    : displayValue >= 65 ? "text-emerald-300"
    : displayValue >= 50 ? "text-amber-300"
    : displayValue >= 35 ? "text-orange-400"
    : "text-red-400";

  // P2: Gelişim rozeti — sezon başına göre, tam sayı
  let growth: number | null = null;
  if (playerId && statKey) {
    try {
      const store = require("@/lib/store").useAppStore.getState();
      const startStats = store.seasonStartStats?.[playerId];
      if (startStats) {
        const startValue = startStats[statKey];
        if (startValue !== undefined) {
          const diff = Math.round(value - startValue);
          if (diff > 0) growth = diff;
        }
      }
    } catch { /* ignore */ }
  }

  return (
    <span className="flex items-center gap-0.5">
      {growth !== null && (
        <span className="text-[11px] font-bold text-emerald-400 leading-none">
          +{growth}
        </span>
      )}
      <span className={cn("font-bold tabular-nums", cls)}>{displayValue}</span>
    </span>
  );
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-0.5">
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
      <div className={cn("font-bold tabular-nums", small ? "text-[11px]" : "text-sm")}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
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
  const listPlayerForSale = useAppStore((s) => s.listPlayerForSale);
  const transfer = useAppStore((s) => s.transfer);
  // BULGU #10 DÜZELTME (v2.9.1): ActionsTab de kendi reactive seasonMatchday'ine ihtiyaç duyar
  const seasonMatchday = useAppStore((s) => s.seasonMatchday ?? 0);
  const makeTransferOffer = useAppStore((s) => s.makeTransferOffer);
  const makeLoanOffer = useAppStore((s) => s.makeLoanOffer);
  const setCaptain = useAppStore((s) => s.setCaptain); // P0 FIX BUG #4: Kaptan seç
  const myTeam = useMyTeam();
  const [listPrice, setListPrice] = useState(player.marketValue);
  const [loanFee, setLoanFee] = useState(Math.round(player.marketValue * 0.05));
  const [loanWeeks, setLoanWeeks] = useState(8);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Transfer teklifi state (başka takımın oyuncusu için)
  const [offerFee, setOfferFee] = useState(player.marketValue);
  const [offerWage, setOfferWage] = useState(player.weeklyWage);
  const [offerYears, setOfferYears] = useState(3);

  // Kiralama teklifi state (başka takımın oyuncusu için)
  const [loanOfferFee, setLoanOfferFee] = useState(Math.round(player.marketValue * 0.1));
  const [loanOfferWeeks, setLoanOfferWeeks] = useState(12);

  const isListed = transfer.myListedPlayers.some((l) => l.playerId === player.id);
  const isMyPlayer = myTeam?.players.some((p) => p.id === player.id) ?? false;
  // P0 FIX BUG #4: Oyuncu şu an kaptan mı? ("kaptan" eski değer, "captain" yeni — ikisini de kontrol et)
  const myPlayer = myTeam?.players.find((p) => p.id === player.id);
  const isCaptain = !!myPlayer && (myPlayer.special_role === "captain" || myPlayer.special_role === "kaptan");

  // P0 FIX BUG #4: Kaptan yap/çıkar — store action'ını kullan
  const handleToggleCaptain = () => {
    haptic("success");
    if (isCaptain) {
      // Kaptanlığı kaldır — myTeam içindeki tüm special_role'leri temizle
      // BULGU #11 DÜZELTME (v2.9.1): undefined yerine null kullan.
      // JSON.stringify undefined'ı drop eder (cloud-save sonrası tutarsızlık),
      // null korunur. setCaptain action'ı da null kullanıyor.
      const state = useAppStore.getState();
      if (!myTeam) return;
      const updatedClubs = state.clubs.map((c) =>
        c.id === myTeam.id
          ? { ...c, players: c.players.map((p) => ({ ...p, special_role: null })) }
          : c
      );
      useAppStore.setState({ clubs: updatedClubs });
      setFeedback(`✓ ${player.firstName} ${player.lastName} kaptanlıktan alındı`);
    } else {
      // Kaptan yap — store action diğer kaptanları otomatik temizler
      setCaptain(player.id);
      setFeedback(`✓ ${player.firstName} ${player.lastName} kaptan yapıldı`);
    }
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleList = () => {
    haptic("success");
    listPlayerForSale(player.id, listPrice);
    setFeedback("✓ Transfer listesine eklendi");
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleLoan = () => {
    haptic("success");
    // P0 FIX: Gerçekten kiralık pazara gönder — myListedPlayers'a loan flag ile ekle
    // Botlar advanceMatchday'de bu listeden teklif üretir
    const state = useAppStore.getState();
    if (!myTeam) return;
    const loanListing = {
      playerId: player.id,
      askingPrice: loanFee * loanWeeks * 7, // toplam kira bedeli
      isLoan: true,
      loanWeeks: loanWeeks,
      loanDailyFee: loanFee,
    };
    useAppStore.setState({
      transfer: {
        ...state.transfer,
        myListedPlayers: [...state.transfer.myListedPlayers, loanListing],
      },
    });
    setFeedback(`✓ Kiralık pazarına gönderildi (${loanWeeks} hafta, ${formatEuro(loanFee, locale)}/gün)`);
    setTimeout(() => setFeedback(null), 2500);
  };

  // Serbest bırak — oyuncuyu kadrodan çıkar, serbest oyuncu listesine ekle
  const handleRelease = () => {
    haptic("success");
    const state = useAppStore.getState();
    if (!myTeam) return;
    // Oyuncuyu kulüpten çıkar
    const updatedClubs = state.clubs.map((c) =>
      c.id === myTeam.id
        ? { ...c, players: c.players.filter((p) => p.id !== player.id) }
        : c
    );
    // Serbest oyuncu listesine ekle
    const releasedPlayer = { ...player, is_free_agent: true };
    const updatedFreeAgentListings = [
      {
        player: releasedPlayer,
        wageDemand: player.weeklyWage,
        daysListed: 0,
        offers: 0,
      },
      ...(state.transfer.freeAgentListings ?? []),
    ];
    useAppStore.setState({
      clubs: updatedClubs,
      transfer: {
        ...state.transfer,
        freeAgentListings: updatedFreeAgentListings,
        messages: [
          {
            id: `msg-release-${Date.now()}`,
            kind: "general",
            fromTeamName: myTeam.name,
            fromTeamShort: myTeam.shortName,
            fromTeamColor: myTeam.primaryColor,
            message: `${player.firstName} ${player.lastName} serbest bırakıldı. Artık takımsız oyuncular listesinde.`,
            at: Date.now(),
            read: false,
            playerId: player.id,
          },
          ...state.transfer.messages,
        ],
      },
    });
    setFeedback(`✓ ${player.firstName} ${player.lastName} serbest bırakıldı`);
    setTimeout(() => {
      setFeedback(null);
      onClose();
    }, 1500);
  };

  // Transfer teklifi gönder (başka takımın oyuncusuna)
  const handleTransferOffer = () => {
    haptic("medium");
    const res = makeTransferOffer(player.id, offerFee, offerWage, offerYears);
    if (!res.success) {
      haptic("error");
      if (res.reason === "budget") {
        setFeedback("✗ Yetersiz bütçe! Transfer ücreti + %8 ek maliyet gerekiyor.");
      } else if (res.reason === "not-found") {
        setFeedback("✗ Oyuncu bulunamadı veya serbest ajan.");
      } else {
        setFeedback("✗ Transfer teklifi gönderilemedi.");
      }
    } else if (res.response === "accepted") {
      haptic("success");
      setFeedback(`✓ ${player.firstName} ${player.lastName} transfer edildi! ${formatEuro(offerFee, locale)}`);
      onClose();
    } else if (res.response === "countered") {
      haptic("medium");
      setFeedback(`↩ Karşı teklif: ${formatEuro(res.counterFee ?? 0, locale)}. Haberler sekmesini kontrol et.`);
      setOfferFee(res.counterFee ?? offerFee);
    } else {
      haptic("error");
      setFeedback("✗ Teklif reddedildi. Piyasa değerinin en az %70'ini teklif et.");
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  // Kiralama teklifi gönder (başka takımın oyuncusuna)
  const handleLoanOffer = () => {
    haptic("medium");
    const res = makeLoanOffer(player.id, loanOfferFee, loanOfferWeeks);
    if (!res.success) {
      haptic("error");
      if (res.reason === "budget") {
        setFeedback("✗ Yetersiz bütçe!");
      } else if (res.reason === "free-agent") {
        setFeedback("✗ Serbest ajanlar kiralanamaz. 'Transfer Teklifi' gönder.");
      } else {
        setFeedback("✗ Oyuncu bulunamadı.");
      }
    } else if (res.response === "accepted") {
      haptic("success");
      setFeedback(`✓ ${player.firstName} ${player.lastName} ${loanOfferWeeks} haftalığına kiralandı!`);
      onClose();
    } else {
      haptic("error");
      setFeedback("✗ Kiralama teklifi reddedildi. Daha yüksek ücret teklif et.");
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  // Transfer penceresi açık mı?
  const transferWindowOpen = (() => {
    try {
      const { isTransferWindowOpen } = require("@/lib/mock/season");
      return isTransferWindowOpen();
    } catch { return true; }
  })();

  return (
    <div className="space-y-3">
      {/* Player mini header */}
      <div className="flex items-center gap-2 p-2 tm-card">
        <PlayerAvatar initials={player.specificPosition} size={36} color={teamColor} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{player.firstName} {player.lastName}</div>
          <div className="text-[10px] text-muted-foreground">
            {player.specificPosition} · {player.age}{t("common.year")} · {formatEuro(player.marketValue, locale)}
          </div>
        </div>
        <RatingBadge value={player.formRating} />
      </div>

      {/* Transfer penceresi uyarısı */}
      {!transferWindowOpen && (
        <div className="tm-card p-2.5 text-center text-[11px] font-bold bg-red-500/10 text-red-400 border-red-500/30">
          🔒 Transfer penceresi kapalı. Teklif gönderemezsiniz.
        </div>
      )}

      {!isMyPlayer ? (
        <>
          {/* ===== BAŞKA TAKIMIN OYUNCUSU — TRANSFER TEKLİFİ ===== */}
          <div className="tm-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <Banknote size={14} className="text-emerald-400" />
              <span className="text-xs font-bold">Transfer Teklifi</span>
            </div>
            <div className="text-[10px] text-muted-foreground mb-2">
              Bu oyuncu için satın alma teklifi gönder. Bot kulüp teklifinizi değerlendirecek.
            </div>

            {/* Transfer ücreti */}
            <div className="mb-2">
              <div className="text-[10px] text-muted-foreground mb-1">Transfer Ücreti (€)</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOfferFee(Math.max(0, offerFee - 50000))}
                  className="tm-tap w-7 h-7 rounded-md border border-border text-sm font-bold"
                >−</button>
                <input
                  type="number"
                  value={offerFee}
                  onChange={(e) => setOfferFee(Number(e.target.value))}
                  className="flex-1 bg-card border border-border rounded-md px-2 py-1 text-xs font-bold tabular-nums text-center"
                />
                <button
                  onClick={() => setOfferFee(offerFee + 50000)}
                  className="tm-tap w-7 h-7 rounded-md border border-border text-sm font-bold"
                >+</button>
              </div>
              {/* Hızlı yüzde butonları */}
              <div className="flex gap-1 mt-1">
                {[70, 85, 100, 120].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setOfferFee(Math.round(player.marketValue * pct / 100))}
                    className="tm-tap flex-1 py-0.5 rounded text-[11px] font-semibold border border-border"
                  >
                    %{pct}
                  </button>
                ))}
              </div>
            </div>

            {/* P2: Maaş input KALDIRILDI — oyunda maaş yok */}

            {/* P2: Sözleşme süresi KALDIRILDI — oyunda sözleşme yok */}

            {/* Toplam maliyet özeti */}
            <div className="mb-2 p-2 bg-muted/30 rounded text-[10px] space-y-0.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Transfer ücreti</span><span className="font-bold tabular-nums">{formatEuro(offerFee, locale)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Agent (%5)</span><span className="tabular-nums">{formatEuro(Math.round(offerFee * 0.05), locale)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">İmza (%3)</span><span className="tabular-nums">{formatEuro(Math.round(offerFee * 0.03), locale)}</span></div>
              <div className="flex justify-between font-bold border-t border-border pt-0.5"><span>Toplam</span><span className="tabular-nums text-emerald-400">{formatEuro(offerFee + Math.round(offerFee * 0.05) + Math.round(offerFee * 0.03), locale)}</span></div>
            </div>

            <button
              onClick={handleTransferOffer}
              disabled={!transferWindowOpen}
              className={cn(
                "tm-tap w-full py-2 rounded-md text-xs font-bold",
                transferWindowOpen ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
              )}
            >
              Teklif Gönder
            </button>
          </div>

          {/* ===== KİRALAMA TEKLİFİ ===== */}
          <div className="tm-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <ArrowLeftRight size={14} className="text-sky-400" />
              <span className="text-xs font-bold">Kiralama Teklifi</span>
            </div>
            <div className="text-[10px] text-muted-foreground mb-2">
              Oyuncuyu belirli süreliğine kirala. Kira süresi boyunca kadonda oynar.
            </div>

            {/* Kira ücreti */}
            <div className="mb-2">
              <div className="text-[10px] text-muted-foreground mb-1">Toplam Kira Ücreti (€)</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLoanOfferFee(Math.max(0, loanOfferFee - 25000))}
                  className="tm-tap w-7 h-7 rounded-md border border-border text-sm font-bold"
                >−</button>
                <input
                  type="number"
                  value={loanOfferFee}
                  onChange={(e) => setLoanOfferFee(Number(e.target.value))}
                  className="flex-1 bg-card border border-border rounded-md px-2 py-1 text-xs font-bold tabular-nums text-center"
                />
                <button
                  onClick={() => setLoanOfferFee(loanOfferFee + 25000)}
                  className="tm-tap w-7 h-7 rounded-md border border-border text-sm font-bold"
                >+</button>
              </div>
            </div>

            {/* Kira süresi */}
            <div className="mb-2">
              <div className="text-[10px] text-muted-foreground mb-1">Süre: {loanOfferWeeks} hafta</div>
              <input
                type="range"
                min={4}
                max={34}
                value={loanOfferWeeks}
                onChange={(e) => setLoanOfferWeeks(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted accent-primary tm-tap"
              />
            </div>

            {/* Tahmini min ücret bilgisi */}
            <div className="mb-2 p-2 bg-muted/30 rounded text-[10px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tahmini min. kira ücreti</span>
                <span className="font-bold tabular-nums">{formatEuro(Math.round(player.marketValue * 0.02 * loanOfferWeeks), locale)}</span>
              </div>
            </div>

            <button
              onClick={handleLoanOffer}
              disabled={!transferWindowOpen}
              className={cn(
                "tm-tap w-full py-2 rounded-md text-xs font-bold",
                transferWindowOpen ? "bg-sky-600 text-white" : "bg-muted text-muted-foreground"
              )}
            >
              Kiralama Teklifi Gönder
            </button>
          </div>
        </>
      ) : (
        <>
          {/* ===== KENDİ OYUNCUM — SATIŞA/KİRALIĞA ÇIKAR ===== */}
          {/* P0 FIX BUG #4: Kaptan Yap/Çıkar butonu */}
          <div className="tm-card p-3 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">©️</span>
              <span className="text-xs font-bold text-amber-400">Kaptanlık</span>
            </div>
            <div className="text-[10px] text-muted-foreground mb-2">
              {isCaptain
                ? "Bu oyuncu şu an kaptan. Kaptanlık bonusu: takım moraline +%2-7 (liderlik/trait'lere göre)."
                : "Bu oyuncuyu kaptan yap. Kaptan, maç sırasında takım moralini artırır ve gol yedikçe morali korur."}
            </div>
            <button
              onClick={handleToggleCaptain}
              className={cn(
                "tm-tap w-full py-2 rounded-md text-xs font-bold",
                isCaptain
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-amber-600 text-white"
              )}
            >
              {isCaptain ? "©️ Kaptanlıktan Al" : "©️ Kaptan Yap"}
            </button>
          </div>

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
              <div className="flex gap-1 mt-1">
                {[10, 15, 20, 30].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setLoanFee(Math.round(player.marketValue * pct / 1000))}
                    className="tm-tap flex-1 py-0.5 rounded text-[11px] font-semibold border border-border"
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

          {/* Serbest Bırak — oyuncuyu kadrodan çıkar */}
          <div className="tm-card p-3 border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-2 mb-2">
              <X size={14} className="text-red-400" />
              <span className="text-xs font-bold text-red-400">Serbest Bırak</span>
            </div>
            <div className="text-[10px] text-muted-foreground mb-2">
              Oyuncuyu kadrodan çıkar. Başka takım imzalayana kadar "Takımsız" listesinde kalır.
              <span className="text-red-400"> Bu işlem geri alınamaz.</span>
            </div>
            <button
              onClick={() => {
                if (confirm(`${player.firstName} ${player.lastName} serbest bırakılacak. Emin misin?`)) {
                  handleRelease();
                }
              }}
              className="tm-tap w-full py-2 rounded-md text-xs font-bold bg-red-600 text-white"
            >
              Serbest Bırak
            </button>
          </div>
        </>
      )}

      {feedback && (
        <div className={cn(
          "tm-card p-2.5 text-center text-xs font-bold",
          feedback.startsWith("✓") ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
          : feedback.startsWith("↩") ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
          : "bg-red-500/20 text-red-300 border-red-500/30"
        )}>
          {feedback}
        </div>
      )}

      {/* Quick stats summary */}
      <div className="tm-card p-2.5">
        <div className="text-[11px] text-muted-foreground uppercase mb-1.5">Hızlı Bilgi</div>
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Piyasa Değeri</span><span className="font-bold tabular-nums">{formatEuro(player.marketValue, locale)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Potansiyel</span><span className="font-bold tabular-nums">{player.potential}</span></div>
          {/* P2: Haftalık Maaş KALDIRILDI — oyunda maaş yok */}
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
    </div>
  );
}

// ===== Arketip Açıklama Tablosu =====
const ARKETIP_DESCRIPTIONS: Record<string, {
  desc: string;
  strengths: string[];
  weaknesses: string[];
  bestPos: string;
  playStyle: string;
}> = {
  // Kaleci
  "Refleks Canavarı": {
    desc: "Müthiş refleksleri ile yakın mesafeli şutları kurtarır. Ceza sahası içinde rakip forvetlerin korkulu rüyasıdır.",
    strengths: ["Refleks", "Birebir", "Kısa mesafe kurtarış"],
    weaknesses: ["Topla ayak oyunu", "Uzun pas"],
    bestPos: "Kaleci",
    playStyle: "Defansif takımlar için ideal",
  },
  "Güvenli Eller": {
    desc: "Topu tutmayı seven, sert şutları kontrol edebilen kaleci. Hava topu mücadelesinde üstündür.",
    strengths: ["Top tutma", "Hava topu", "Pozisyon alma"],
    weaknesses: ["Refleks", "Hızlı çıkış"],
    bestPos: "Kaleci",
    playStyle: "Klasik kaleci",
  },
  "Süpürücü Kaleci": {
    desc: "Ceza sahası dışına çıkarak savunma arkasını kapatır. Modern oyunun kalecisi, pas oyununa katkı sağlar.",
    strengths: ["Topla ayak", "Çıkış", "Pas dağıtımı"],
    weaknesses: ["Geleneksel kurtarış"],
    bestPos: "Kaleci",
    playStyle: "Yüksek savunma çizgisi ile",
  },
  "Penaltı Uzmanı": {
    desc: "Penaltılarda rakip oyuncuyu okuma konusunda ustalaşmış. Kritik anlarda fark yaratır.",
    strengths: ["Penaltı kurtarış", "Konsantrasyon"],
    weaknesses: ["Açık oyun"],
    bestPos: "Kaleci",
    playStyle: "Kupa maçları için",
  },
  "Büyük Maç Kalecisi": {
    desc: "Baskılı maçlarda performansını artıran, kritik kurtarışlar yapan deneyimli kaleci.",
    strengths: ["Baskı altında performans", "Liderlik", "Konsantrasyon"],
    weaknesses: ["Sıradan maçlar"],
    bestPos: "Kaleci",
    playStyle: "Derbi ve kupa maçları için",
  },
  // Stoper
  "Duvar": {
    desc: "Fiziksel gücü ve hava topu hakimiyeti ile rakip forvetleri durduran klasik stoper.",
    strengths: ["Fiziksel güç", "Hava topu", "Top çalma"],
    weaknesses: ["Hız", "Pas oyunu"],
    bestPos: "Stoper",
    playStyle: "Catenaccio / Defansif",
  },
  "Lider Stoper": {
    desc: "Savunmayı organize eden, arkada kalan son adam. Takımına güven verir.",
    strengths: ["Pozisyon alma", "Liderlik", "Karar verme"],
    weaknesses: ["Hız"],
    bestPos: "Stoper",
    playStyle: "Her sistemde",
  },
  "Top Çıkan Stoper": {
    desc: "Savunmadan topu taşıyarak hücuma katkı sağlayan modern stoper.",
    strengths: ["Topla çıkış", "Pas", "Hız"],
    weaknesses: ["Defansif pozisyon"],
    bestPos: "Stoper",
    playStyle: "Tiki-Taka / Gegenpressing",
  },
  "Hava Hakimi": {
    desc: "Hava topu mücadelesinde rakipsiz. Hem savunmada hem hücumda kafa golleri atan stoper.",
    strengths: ["Hava topu", "Fiziksel", "Kafa golü"],
    weaknesses: ["Yerden oyun", "Hız"],
    bestPos: "Stoper",
    playStyle: "Duran top taktikleri ile",
  },
  "Baskı Ustası": {
    desc: "Yüksek baskı yapan, rakibi hataya zorlayan agresif stoper.",
    strengths: ["Baskı", "Agresiflik", "Top çalma"],
    weaknesses: ["Pozisyon disiplini"],
    bestPos: "Stoper",
    playStyle: "Gegenpressing",
  },
  "Kale Gibi": {
    desc: "Adı gibi — kale gibi duran, nadiren hata yapan güvenilir stoper.",
    strengths: ["Tutarlılık", "Konsantrasyon", "Pozisyon"],
    weaknesses: ["Yaratıcılık"],
    bestPos: "Stoper",
    playStyle: "Catenaccio",
  },
  // Bek
  "Kanat Beki": {
    desc: "Hem savunma hem hücum yapan, kanattan yüklenen çabalı bek.",
    strengths: ["Dayanıklılık", "Hız", "Kanat desteği"],
    weaknesses: ["Defansif pozisyon"],
    bestPos: "Sağ/Sol Bek",
    playStyle: "Wing Play / Kanat oyunu",
  },
  "Hücumcu Bek": {
    desc: "Hücuma çıkmayı seven, asist üreten ofansif bek. Defansif katkısı sınırlı.",
    strengths: ["Hücum", "Orta", "Asist"],
    weaknesses: ["Defans"],
    bestPos: "Sağ/Sol Bek",
    playStyle: "Hücumcu takımlar",
  },
  "Defansif Bek": {
    desc: "Öncelikle savunma yapan, kanadı kapatan güvenilir bek.",
    strengths: ["Defans", "Pozisyon", "Markaj"],
    weaknesses: ["Hücum katkısı"],
    bestPos: "Sağ/Sol Bek",
    playStyle: "Defansif sistemler",
  },
  "Ters Bek": {
    desc: "Zayıf ayağını kullanan, içeri kesen modern bek. Kanattan forvet area'sına girer.",
    strengths: ["İçeri kesme", "Zayıf ayak", "Şut"],
    weaknesses: ["Klasik orta"],
    bestPos: "Sağ/Sol Bek",
    playStyle: "Tiki-Taka / Modern",
  },
  "Ofansif Bek": {
    desc: "Sürekli hücum eden, kanadı işgal eden bek. Hücumda etkili, savunmada riskli.",
    strengths: ["Hız", "Hücum", "Orta"],
    weaknesses: ["Savunma dönüşü"],
    bestPos: "Sağ/Sol Bek",
    playStyle: "Wing Play",
  },
  // Orta saha
  "Yıkıcı": {
    desc: "Rakip hücumları bozan, top çalan defansif orta saha. Ekran arkasında çalışır.",
    strengths: ["Top çalma", "Pozisyon", "Defans"],
    weaknesses: ["Yaratıcılık", "Pas"],
    bestPos: "Defansif Orta Saha",
    playStyle: "Catenaccio / Defansif",
  },
  "Regista": {
    desc: "Derinlerden oyunu yöneten, pas dağıtan playmaker. Modern regista.",
    strengths: ["Pas", "Vizyon", "Oyun okuma"],
    weaknesses: ["Fiziksel", "Defans"],
    bestPos: "Defansif Orta Saha",
    playStyle: "Tiki-Taka",
  },
  "Ekran Oyuncusu": {
    desc: "Savunma önünde ekran görevi gören, rakip baskıyı kıran orta saha.",
    strengths: ["Top koruma", "Pas", "Pozisyon"],
    weaknesses: ["Hız", "Hücum"],
    bestPos: "Defansif Orta Saha",
    playStyle: "Possession / Tiki-Taka",
  },
  "Duvar Orta Saha": {
    desc: "Defansif duvar özelliği gösteren, fiziksel orta saha. Topu iyi korur.",
    strengths: ["Fiziksel", "Top koruma", "Dayanıklılık"],
    weaknesses: ["Teknik", "Pas"],
    bestPos: "Defansif Orta Saha",
    playStyle: "Fiziksel takımlar",
  },
  "Motor": {
    desc: "Box-to-box koşan, hem savunma hem hücum yapan çabalı orta saha.",
    strengths: ["Dayanıklılık", "Çalışkanlık", "Tüm saha"],
    weaknesses: ["Yaratıcılık"],
    bestPos: "Merkez Orta Saha",
    playStyle: "Gegenpressing / Pressing",
  },
  "Truva Atı": {
    desc: "Görünmez ama etkili — sessizce işini yapan, kritik anlarda ortaya çıkan orta saha.",
    strengths: ["Pozisyon", "Konsantrasyon", "Kritik anlar"],
    weaknesses: ["İstikrar"],
    bestPos: "Merkez Orta Saha",
    playStyle: "Counter-Attack",
  },
  "Pas Ustası": {
    desc: "Pas isabeti ve dağıtımı ile oyunu yöneten teknik orta saha.",
    strengths: ["Pas", "Teknik", "Vizyon"],
    weaknesses: ["Fiziksel", "Defans"],
    bestPos: "Merkez Orta Saha",
    playStyle: "Tiki-Taka",
  },
  "Box-to-Box": {
    desc: "Sahanın başından sonuna koşan, hem gol hem asist üreten modern orta saha.",
    strengths: ["Dayanıklılık", "Hücum", "Defans"],
    weaknesses: ["Pozisyon disiplini"],
    bestPos: "Merkez Orta Saha",
    playStyle: "Gegenpressing",
  },
  "Tempo Kontrolcüsü": {
    desc: "Oyunun temposunu ayarlayan, ne zaman hızlanıp ne zaman yavaşlayacağını bilen.",
    strengths: ["Oyun yönetimi", "Pas", "Karar"],
    weaknesses: ["Fiziksel"],
    bestPos: "Merkez Orta Saha",
    playStyle: "Possession",
  },
  "Playmaker": {
    desc: "Yaratıcı pasları ve asistleri ile hücumu yönlendiren hücum orta saha.",
    strengths: ["Yaratıcılık", "Asist", "Vizyon"],
    weaknesses: ["Defans"],
    bestPos: "Hücum Orta Saha",
    playStyle: "Tiki-Taka / Yaratıcı",
  },
  "Numara 10": {
    desc: "Klasik 10 numara — forvet arkasında oynayan, yaratıcı ve golcü.",
    strengths: ["Yaratıcılık", "Gol", "Asist"],
    weaknesses: ["Defans"],
    bestPos: "Hücum Orta Saha",
    playStyle: "Klasik 10 numara sistemi",
  },
  "Yaratıcı": {
    desc: "Farklı şeyler deneyen, beklenmedik paslar atan yaratıcı oyuncu.",
    strengths: ["Yaratıcılık", "Teknik", "Flair"],
    weaknesses: ["Disiplin"],
    bestPos: "Hücum Orta Saha",
    playStyle: "Serbest rol",
  },
  "Oyun Kurucu": {
    desc: "Takımın hücum oyununu kuran, pas ağının merkezinde olan oyuncu.",
    strengths: ["Pas", "Vizyon", "Oyun okuma"],
    weaknesses: ["Hız"],
    bestPos: "Hücum Orta Saha",
    playStyle: "Possession",
  },
  // Kanat
  "Hızlı Kanat": {
    desc: "Hızıyla kanattan rakip savunmayı aşan, çalım atabilen kanat oyuncusu.",
    strengths: ["Hız", "Çalım", "Kanal aşma"],
    weaknesses: ["Defans"],
    bestPos: "Kanat",
    playStyle: "Counter-Attack",
  },
  "İçeri Dönen": {
    desc: "Kanattan içeri keserek şut atan, golcü kanat. Zayıf ayağını kullanır.",
    strengths: ["İçeri kesme", "Şut", "Gol"],
    weaknesses: ["Klasik orta"],
    bestPos: "Kanat",
    playStyle: "Modern kanat oyunu",
  },
  "Dribling Ustası": {
    desc: "Çalım atma konusunda usta, rakip savunmayı birebir aşan kanat.",
    strengths: ["Dribling", "Çalım", "Teknik"],
    weaknesses: ["Defans", "Pas"],
    bestPos: "Kanat",
    playStyle: "Bireysel yetenek gerektiren",
  },
  "Kanat": {
    desc: "Klasik kanat — orta açan, kanattan yüklenen, hücumu genişleten oyuncu.",
    strengths: ["Orta", "Hız", "Kanal"],
    weaknesses: ["İçeri oyun"],
    bestPos: "Kanat",
    playStyle: "Wing Play",
  },
  // Forvet
  "Gol Makinesi": {
    desc: "Gol atmaktan başka şey düşünmeyen, ceza sahasında öldürücü forvet.",
    strengths: ["Bitiricilik", "Gol", "Pozisyon"],
    weaknesses: ["Defansa yardım"],
    bestPos: "Forvet",
    playStyle: "Hücumcu sistemler",
  },
  "Bitirici": {
    desc: "Yarım fırsatı gol çeviren, soğukkanlı bitirici.",
    strengths: ["Bitiricilik", "Soğukkanlılık", "Gol"],
    weaknesses: ["Oyun kurma"],
    bestPos: "Forvet",
    playStyle: "Counter-Attack",
  },
  "Hedef Adam": {
    desc: "Fiziksel gücü ve hava topu ile topu tutan, takımın hücum referansı olan forvet.",
    strengths: ["Fiziksel", "Hava topu", "Top tutma"],
    weaknesses: ["Hız", "Teknik"],
    bestPos: "Forvet",
    playStyle: "Wing Play / Direkt",
  },
  "Fırsatçı": {
    desc: "Doğru yerde doğru zamanda olan, seken topları gol çeviren forvet.",
    strengths: ["Pozisyon", "Fırsat değerlendirme", "Gol"],
    weaknesses: ["Oyun kurma"],
    bestPos: "Forvet",
    playStyle: "Reaktif",
  },
  "Hızlı Forvet": {
    desc: "Hızıyla rakip savunma arkasına koşan, kontra atakların yıldızı.",
    strengths: ["Hız", "Hızlanma", "Kontra"],
    weaknesses: ["Fiziksel mücadele"],
    bestPos: "Forvet",
    playStyle: "Counter-Attack",
  },
  "İkinci Forvet": {
    desc: "Forvet arkasında oynayan, hem gol atan hem asist veren yaratıcı forvet.",
    strengths: ["Yaratıcılık", "Asist", "Gol"],
    weaknesses: ["Fiziksel"],
    bestPos: "İkinci Forvet",
    playStyle: "Yaratıcı sistemler",
  },
  "Yaratıcı Forvet": {
    desc: "Gol atmaktan çok oyun kuran, asist üreten yaratıcı forvet.",
    strengths: ["Yaratıcılık", "Asist", "Teknik"],
    weaknesses: ["Bitiricilik"],
    bestPos: "İkinci Forvet",
    playStyle: "Possession / Tiki-Taka",
  },
  // P2 FIX: Eksik arketip açıklamaları eklendi
  "İlk Yarı Oyuncusu": {
    desc: "Maçın ilk yarısında performansı zirvede olan oyuncu. İlk 45 dakikada gol ve asist üretir, ikinci yarıda etkisi azalır.",
    strengths: ["İlk yarı performansı", "Hızlı başlangıç", "Erken gol"],
    weaknesses: ["İkinci yarı", "Dayanıklılık"],
    bestPos: "Orta Saha / Forvet",
    playStyle: "Hızlı başlayan takımlar",
  },
  "Büyük Maç Oyuncusu": {
    desc: "Derbi, kupa finali ve büyük maçlarda performansını artıran oyuncu. Baskı altında en iyisini verir.",
    strengths: ["Baskı altında performans", "Büyük maç", "Konsantrasyon"],
    weaknesses: ["Sıradan maçlar"],
    bestPos: "Tüm pozisyonlar",
    playStyle: "Derbi ve kupa maçları için",
  },
  "Kapanma Ustası": {
    desc: "Maçın son dakikalarında galibiyet golünü atan veya beraberliği kurtaran oyuncu. Kritik anlarda soğukkanlıdır.",
    strengths: ["Kapanma", "Kritik anlar", "Soğukkanlılık"],
    weaknesses: ["İlk yarı"],
    bestPos: "Forvet",
    playStyle: "Kontrollü takımlar",
  },
  "1v1 Ustası": {
    desc: "Birebir mücadelede üstün olan, rakibini çalım atarak geçen oyuncu. Dar alanda fark yaratır.",
    strengths: ["Birebir", "Çalım", "Dar alan"],
    weaknesses: ["Pas oyunu"],
    bestPos: "Kanat / Forvet",
    playStyle: "Hızlı hücum",
  },
  "Sessiz Suikastçı": {
    desc: "Maç boyunca görünmez ama bir anda golü atan oyuncu. Az dokunuşla çok şey yapar.",
    strengths: ["Bitiricilik", "Pozisyon alma", "Az dokunuş"],
    weaknesses: ["Defansif katkı"],
    bestPos: "Forvet",
    playStyle: "Kontra atak",
  },
};

// Arketip bilgi modal'ı
function ArkInfoModal({
  arketip,
  position,
  onClose,
}: {
  arketip: string;
  position: string;
  onClose: () => void;
}) {
  const info = ARKETIP_DESCRIPTIONS[arketip];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-[340px] bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded text-xs font-bold bg-purple-500/20 text-purple-300">
              {arketip}
            </span>
            <span className="text-[10px] text-muted-foreground">{position}</span>
          </div>
          <button onClick={onClose} className="tm-tap p-1 text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {info ? (
          <>
            <p className="text-xs leading-relaxed text-foreground/90">{info.desc}</p>

            <div>
              <div className="text-[10px] text-emerald-400 font-bold uppercase mb-1">Güçlü Yönler</div>
              <div className="flex flex-wrap gap-1">
                {info.strengths.map((s) => (
                  <span key={s} className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-red-400 font-bold uppercase mb-1">Zayıf Yönler</div>
              <div className="flex flex-wrap gap-1">
                {info.weaknesses.map((s) => (
                  <span key={s} className="text-[11px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 font-semibold">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">En İyi Mevki</div>
                <div className="text-[10px] font-bold">{info.bestPos}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase">Uyumlu Oyun Stili</div>
                <div className="text-[10px] font-bold text-sky-300">{info.playStyle}</div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Bu arketip için detaylı bilgi bulunmuyor.</p>
        )}
      </div>
    </div>
  );
}
