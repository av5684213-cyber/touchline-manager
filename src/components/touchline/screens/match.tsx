"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  ChevronDown,
  Clock,
  CloudRain,
  CloudSun,
  FastForward,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Sun,
  Trophy,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { useMatchEngine } from "@/hooks/use-match-engine";
import {
  FORMATION_KEYS,
  POSITION_GROUP,
  type Player as PlayerT,
  type Team,
} from "@/lib/mock/data";
import { simulateEnhancedMatch } from "@/lib/match/engine";
import { DEFAULT_TACTIC } from "@/lib/tactics/types";
import type {
  EnhancedMatchEvent as MatchEvent,
} from "@/lib/match/engine";
import type { LiveMatchState } from "@/hooks/use-match-engine";
import {
  formatCountdown,
  getMatchScheduleStatus,
  isMatchAutoSimmed,
  isMatchWatched,
  markMatchAutoSimmed,
  markMatchWatched,
} from "@/lib/match/scheduler";

type MatchState = LiveMatchState;
type MatchTactics = {
  formation: string;
  pressing: number;
  defensiveLine: number;
  tempo: number;
  width: number;
};
type Side = "home" | "away" | "neutral";
type HomeAway = "home" | "away";
import { ClubBadge, PositionPill, RatingBadge } from "../ui-bits";
import { PlayerProfileModal } from "../player-profile-modal";
// ADDED: 2D Live Match Pitch
import { LiveMatchPitch } from "../live-match-pitch";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import { PreMatchScreen } from "../pre-match-screen";

// Arka plan simülasyonu — canlı UI göstermeden sadece sonucu hesapla ve kaydet
function silentlySimulateMatch(home: Team, away: Team) {
  try {
    const storeState = useAppStore.getState();
    const userTactic = storeState.tactics.active ?? DEFAULT_TACTIC;
    const isHome = home.id === storeState.myTeamId;
    const homeTactic = isHome ? userTactic : { ...DEFAULT_TACTIC, formation: "4-4-2" };
    const awayTactic = isHome ? { ...DEFAULT_TACTIC, formation: "4-4-2" } : userTactic;

    // Basit ilk 11 seçimi (en yüksek OVR'li 11)
    const pickXI = (players: PlayerT[]) =>
      [...players].sort((a, b) => b.rating - a.rating).slice(0, 11);

    const result = simulateEnhancedMatch(
      pickXI(home.players) as any,
      pickXI(away.players) as any,
      homeTactic as any,
      awayTactic as any,
      { homeTeamName: home.name, awayTeamName: away.name } as any
    );

    // Fikstüre sonucu yaz
    storeState.recordMatchResult(home.id, away.id, result.homeScore, result.awayScore);
  } catch (e) {
    console.error("[silentSim] failed:", e);
  }
}

export function MatchScreen() {
  const { t, locale } = useI18n();
  const team = useMyTeam();
  const { clubs, fixtures } = useAppStore();

  // Rakip seçimi — bir sonraki oynanmamış maç
  const opponent = useMemo(() => {
    if (!team) return null;
    const next = clubs.find(
      (c) =>
        c.id !== team.id &&
        fixtures.some(
          (f) =>
            !f.played &&
            ((f.homeId === team.id && f.awayId === c.id) ||
              (f.awayId === team.id && f.homeId === c.id))
        )
    );
    return next ?? clubs.find((c) => c.id !== team.id) ?? null;
  }, [team, clubs, fixtures]);

  // Ev/deplasman yerleşimi: kullanıcının sonraki maçındaki yerine göre
  const { homeTeam, awayTeam, mySide } = useMemo(() => {
    if (!team || !opponent) {
      return { homeTeam: team, awayTeam: opponent, mySide: "home" as Side };
    }
    const nextFx = fixtures.find(
      (f) =>
        !f.played &&
        ((f.homeId === team.id && f.awayId === opponent.id) ||
          (f.awayId === team.id && f.homeId === opponent.id))
    );
    const mySide: Side = nextFx?.homeId === team.id ? "home" : "away";
    return {
      homeTeam: mySide === "home" ? team : opponent,
      awayTeam: mySide === "home" ? opponent : team,
      mySide,
    };
  }, [team, opponent, fixtures]);

  const engine = useMatchEngine(
    homeTeam ?? team!,
    awayTeam ?? opponent!,
    locale
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPreMatch, setShowPreMatch] = useState(false);
  // ADDED: Maç içi sekme — Saha / Akış / İstatistik
  const [matchTab, setMatchTab] = useState<"pitch" | "feed" | "stats">("pitch");
  // ADDED: Sabit hakem — her render'da değişmesin
  const [fixedReferee] = useState(() => ({
    name: ["Selim Aydoğan", "Burak Yıldırımer", "Kaan Demirci", "Tolga Şahin", "Emre Karaca", "Onur Toprak", "Mert Yavuz", "Serkan Aksoy"][Math.floor(Math.random() * 8)],
    personality: ["strict", "balanced", "lenient", "home_bias", "volatile"][Math.floor(Math.random() * 5)] as string,
  }));
  // ADDED: Saha oyuncusu profil modal'ı
  const [pitchProfilePlayer, setPitchProfilePlayer] = useState<PlayerT | null>(null);

  // ===== Scheduler — maçlar TR saatiyle belli saatlerde =====
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    let id: ReturnType<typeof setInterval>;
    const start = () => { id = setInterval(() => setNowTick(Date.now()), 1000); };
    const stop = () => { if (id) clearInterval(id); };
    const handleVisibility = () => {
      if (document.hidden) stop();
      else { setNowTick(Date.now()); start(); }
    };
    start();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const schedule = useMemo(() => getMatchScheduleStatus(new Date(nowTick)), [nowTick]);
  // Mevcut maç penceresinin ID'si (örn "2026-06-27_12")
  const currentMatchId = schedule.currentMatchId;
  // Bu pencere daha önce izlendi mi? (canlı simülasyon görüldü mü?)
  const currentWatched = currentMatchId ? isMatchWatched(currentMatchId) : false;
  // Bu pencere daha önce otomatik simüle edildi mi? (kullanıcı izlemedi)
  const currentAutoSimmed = currentMatchId ? isMatchAutoSimmed(currentMatchId) : false;

  // NOT: Otomatik maç başlatma KALDIRILDI.
  // Maçlar SADECE planlanan saatlerde (12:00 ve 18:00 TR, hafta içi) başlar.
  // Kullanıcı sekmede olsa bile pencere dışında "sıradaki maç" bekler.
  // Kaçırılan maçlar arka planda sessizce simüle edilir (sonuç kaydedilir, canlı UI gösterilmez).
  useEffect(() => {
    if (!team || !opponent) return;
    if (engine.state.status !== "idle") return;
    if (schedule.inWindow) return; // pencere içindeysek bekle

    // Bir önceki pencereyi bul
    const trMs = nowTick + 3 * 60 * 60 * 1000;
    const trDate = new Date(trMs);
    const trHour = trDate.getUTCHours();
    const allHours = [12, 18];
    let prevHour = -1;
    let prevDayOffset = 0;
    for (let i = allHours.length - 1; i >= 0; i--) {
      if (allHours[i] < trHour) { prevHour = allHours[i]; break; }
    }
    if (prevHour === -1) { prevHour = 18; prevDayOffset = -1; }

    const prevDay = new Date(trMs + prevDayOffset * 86400000).getUTCDay();
    if (prevDay < 1 || prevDay > 5) return;

    const trTodayStart = new Date(new Date(trMs).toISOString().slice(0, 10) + "T00:00:00Z").getTime();
    const prevWindowEnd = trTodayStart + prevDayOffset * 86400000 + prevHour * 3600000 + 3600000 - 10800000;

    if (nowTick > prevWindowEnd) {
      const trDayKey = new Date(prevWindowEnd + 10800000 - 3600000).toISOString().slice(0, 10);
      const prevMatchId = `${trDayKey}_${prevHour}`;
      if (!isMatchAutoSimmed(prevMatchId) && !isMatchWatched(prevMatchId)) {
        // ARKA PLAN SİMÜLASYONU — canlı UI gösterme, sadece sonucu kaydet
        markMatchAutoSimmed(prevMatchId);
        // engine.start() ÇAĞIRMA — bu canlı UI başlatır
        // Sadece sonucu sessizce hesapla ve fikstüre yaz
        if (homeTeam && awayTeam) {
          silentlySimulateMatch(homeTeam, awayTeam);
        }
      }
    }
  }, [nowTick, schedule.inWindow, team, opponent, engine]);

  if (!team || !opponent || !homeTeam || !awayTeam) {
    return (
      <div className="px-4 py-16 text-center text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  // Maç öncesi ekran
  if (showPreMatch) {
    const homeRecent = fixtures
      .filter((f) => f.played && (f.homeId === homeTeam.id || f.awayId === homeTeam.id))
      .sort((a, b) => b.matchday - a.matchday)
      .slice(0, 5)
      .map((f) => {
        const isHome = f.homeId === homeTeam.id;
        const us = isHome ? f.homeScore : f.awayScore;
        const them = isHome ? f.awayScore : f.homeScore;
        return (us ?? 0) > (them ?? 0) ? "W" as const : (us ?? 0) < (them ?? 0) ? "L" as const : "D" as const;
      });
    const awayRecent = fixtures
      .filter((f) => f.played && (f.homeId === awayTeam.id || f.awayId === awayTeam.id))
      .sort((a, b) => b.matchday - a.matchday)
      .slice(0, 5)
      .map((f) => {
        const isHome = f.homeId === awayTeam.id;
        const us = isHome ? f.homeScore : f.awayScore;
        const them = isHome ? f.awayScore : f.homeScore;
        return (us ?? 0) > (them ?? 0) ? "W" as const : (us ?? 0) < (them ?? 0) ? "L" as const : "D" as const;
      });

    return (
      <PreMatchScreen
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        weather={engine.state.weather || "sunny"}
        refereeName={engine.state.referee.name || fixedReferee.name}
        refereePersonality={engine.state.referee.personality || fixedReferee.personality}
        homeForm={homeRecent}
        awayForm={awayRecent}
        onStart={() => {
          setShowPreMatch(false);
          engine.start();
          // İzlendi olarak işaretle — test modunda currentMatchId yoksa manuel id ver
          const matchId = currentMatchId ?? `manual-${Date.now()}`;
          markMatchWatched(matchId);
        }}
        onBack={() => setShowPreMatch(false)}
      />
    );
  }

  return (
    <div className="dark text-foreground bg-background min-h-[calc(100dvh-50px)]">
      <div className="px-3 py-3 space-y-3 pb-6">
        <MatchTopBar
          state={engine.state}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />

        {/* Referee & weather info banner */}
        <InfoBanner state={engine.state} />

        {/* ADDED: Maç içi sekme — Saha / Akış / İstatistik (live/paused/halftime durumunda) */}
        {(engine.state.status === "live" || engine.state.status === "paused" || engine.state.status === "halftime") && (
          <>
            {/* Sekme seçici */}
            <div className="flex gap-1 p-1 bg-muted rounded-md">
              <button
                onClick={() => { haptic("light"); setMatchTab("pitch"); }}
                className={cn("flex-1 py-1.5 rounded text-[10px] font-bold", matchTab === "pitch" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                🏟️ Saha
              </button>
              <button
                onClick={() => { haptic("light"); setMatchTab("feed"); }}
                className={cn("flex-1 py-1.5 rounded text-[10px] font-bold", matchTab === "feed" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                📋 Akış
              </button>
              <button
                onClick={() => { haptic("light"); setMatchTab("stats"); }}
                className={cn("flex-1 py-1.5 rounded text-[10px] font-bold", matchTab === "stats" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                📊 İstatistik
              </button>
            </div>

            {/* Saha sekmesi — 2D pitch + oyuncu tıklanır */}
            {matchTab === "pitch" && (
              <LiveMatchPitch
                homePlayers={homeTeam.players.slice(0, 11).map((p: any) => ({
                  id: p.id,
                  name: p.name ?? `${p.firstName} ${p.lastName}`,
                  rating: p.rating,
                  position: p.specificPosition,
                  side: "home" as const,
                  isCaptain: p.special_role === "kaptan" || p.special_role === "captain",
                }))}
                awayPlayers={awayTeam.players.slice(0, 11).map((p: any) => ({
                  id: p.id,
                  name: p.name ?? `${p.firstName} ${p.lastName}`,
                  rating: p.rating,
                  position: p.specificPosition,
                  side: "away" as const,
                }))}
                homeColor={homeTeam.primaryColor}
                awayColor={awayTeam.primaryColor}
                homeFormation={useAppStore.getState().tactics.active?.formation ?? "4-4-2"}
                awayFormation="4-4-2"
                minute={engine.state.minute}
                homeScore={engine.state.homeScore}
                awayScore={engine.state.awayScore}
                homeShort={homeTeam.shortName}
                awayShort={awayTeam.shortName}
                onPlayerClick={(playerId) => {
                  const p = [...homeTeam.players, ...awayTeam.players].find((pp) => pp.id === playerId);
                  if (p) { haptic("light"); setPitchProfilePlayer(p); }
                }}
              />
            )}

            {/* Akış sekmesi */}
            {matchTab === "feed" && (
              <>
                <LiveCommentaryBanner events={engine.state.events} />
                <EventFeed
                  events={engine.state.events}
                  emptyText={t("match.events.empty")}
                  locale={locale}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                />
              </>
            )}

            {/* İstatistik sekmesi */}
            {matchTab === "stats" && (
              <StatsBar state={engine.state} />
            )}
          </>
        )}

        {/* ===== Scheduler Widget — maç saati bekleniyor ===== */}
        {engine.state.status === "idle" && !showPreMatch && (
          <ScheduleWidget
            schedule={schedule}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            currentWatched={currentWatched}
            currentAutoSimmed={currentAutoSimmed}
            onWatch={() => {
              // TEST/SOLO MOD: Pencere kontrolü yok — istediğin an maçı oynat
              haptic("medium");
              setShowPreMatch(true);
            }}
            onAdvanceWeek={() => {
              // TEST/SOLO MOD: Haftayı ilerle — kullanıcının maçını arka planda simüle et,
              // diğer maçları da oyna, fikstürü ilerlet.
              haptic("success");
              silentlySimulateMatch(homeTeam, awayTeam);
              useAppStore.getState().advanceMatchday();
              // Match ID'yi izlendi olarak işaretle ki pencere tekrar tetiklemesin
              if (currentMatchId) markMatchWatched(currentMatchId);
            }}
          />
        )}

        {/* Action buttons: pause / tactics — yalnızca live/paused durumunda */}
        {(engine.state.status === "live" || engine.state.status === "paused") && (
          <div className="flex gap-2">
            {engine.state.status === "live" && (
              <button
                onClick={() => { haptic("light"); engine.pause(); }}
                className="tm-tap flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-bold active:scale-[0.98] transition-transform"
              >
                <Pause size={16} /> {t("match.pause")}
              </button>
            )}
            {engine.state.status === "paused" && (
              <button
                onClick={() => { haptic("medium"); engine.start(); }}
                className="tm-tap flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold active:scale-[0.98] transition-transform"
              >
                <Play size={16} /> {t("match.resume")}
              </button>
            )}
            <button
              onClick={() => { haptic("light"); setDrawerOpen(true); }}
              className="tm-tap px-4 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
            >
              <Settings size={16} /> {t("match.tactics")}
            </button>
          </div>
        )}

        {/* DEVRE ARASI — 30 saniyelik mola + taktik + oyuncu değiştirme */}
        {engine.state.status === "halftime" && (
          <div className="tm-card p-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-amber-400">
              <Clock size={20} />
              <span className="text-lg font-bold">DEVRE ARASI</span>
            </div>
            <div className="text-4xl font-bold tabular-nums text-amber-300">
              00:{String(engine.state.halftimeSecondsLeft ?? 30).padStart(2, "0")}
            </div>
            <div className="text-xs text-muted-foreground">
              İkinci yarı {engine.state.halftimeSecondsLeft ?? 30} saniye sonra başlayacak
            </div>
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="font-bold">{homeTeam.shortName}</span>
              <span className="text-2xl font-bold tabular-nums text-amber-300">
                {engine.state.homeScore} - {engine.state.awayScore}
              </span>
              <span className="font-bold">{awayTeam.shortName}</span>
            </div>

            {/* Oyuncu değişikliği — devre arası */}
            <HalftimeSubs
              team={team!}
              homeTeam={homeTeam}
              engine={engine}
              mySide={mySide}
            />

            <button
              onClick={() => { haptic("light"); setDrawerOpen(true); }}
              className="tm-tap w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold"
            >
              <Settings size={16} /> Taktik Değiştir
            </button>
          </div>
        )}

        {/* Replay progress (when replaying) */}
        {engine.replay.active && (
          <div className="tm-card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin" />
                {t("match.post.replay_3x")}
              </span>
              <button
                onClick={() => engine.replay.stop()}
                className="tm-tap text-[11px] text-muted-foreground"
              >
                {t("common.close")}
              </button>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${engine.replay.progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Live event feed — artık Akış sekmesinde gösteriliyor, bağımsız değil */}

        {/* PostMatch — maç bittiğinde */}
        {engine.state.status === "finished" && !engine.replay.active && (
          <PostMatch
            state={engine.state}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            onReplay={() => engine.replay.start()}
            onNewMatch={() => { engine.reset(); setShowPreMatch(false); }}
          />
        )}

        {/* Match stats bar — artık İstatistik sekmesinde, bağımsız değil */}

        {engine.state.status === "finished" && !engine.replay.active && (
          <>
            {/* TEST/SOLO MOD: Maç bitti → sonraki maça hazırla */}
            <div className="tm-card p-4 bg-emerald-50/40 border-emerald-200 text-center space-y-3">
              <Trophy size={28} className="text-emerald-600 mx-auto" />
              <div className="text-sm font-bold text-emerald-700">Maç tamamlandı</div>
              <div className="text-[10px] text-muted-foreground">
                {homeTeam.shortName} {engine.state.homeScore} - {engine.state.awayScore} {awayTeam.shortName}
              </div>
              <button
                onClick={() => {
                  haptic("success");
                  engine.reset();
                }}
                className="tm-tap w-full py-3 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Play size={16} />
                SONRAKİ MAÇA HAZIRLAN
              </button>
              <div className="text-[8px] text-emerald-400/70">
                Test modu — sonraki maç için tıkla
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tactics drawer */}
      <TacticsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        engine={engine}
        mySide={mySide}
        myTeam={team}
      />

      {/* ADDED: Saha oyuncusu profil modal'ı — 2D sahada tıklayınca */}
      {pitchProfilePlayer && (
        <PlayerProfileModal
          player={pitchProfilePlayer}
          teamColor={
            homeTeam.players.some((p) => p.id === pitchProfilePlayer.id)
              ? homeTeam.primaryColor
              : awayTeam.primaryColor
          }
          onClose={() => setPitchProfilePlayer(null)}
        />
      )}
    </div>
  );
}

// ---- Schedule Widget — maç saati bekleniyor / maç penceresi ----
function ScheduleWidget({
  schedule,
  homeTeam,
  awayTeam,
  currentWatched,
  currentAutoSimmed,
  onWatch,
  onAdvanceWeek,
}: {
  schedule: import("@/lib/match/scheduler").MatchScheduleStatus;
  homeTeam: { name: string; shortName: string; primaryColor: string; secondaryColor?: string };
  awayTeam: { name: string; shortName: string; primaryColor: string; secondaryColor?: string };
  currentWatched: boolean;
  currentAutoSimmed: boolean;
  onWatch: () => void;
  onAdvanceWeek: () => void;
}) {
  const { t } = useI18n();

  // Pencere içindeyiz ve kullanıcı izledi → "Maç bitti" durumu (engine finished olacak)
  if (schedule.inWindow && currentWatched) {
    return (
      <div className="tm-card p-4 bg-emerald-50/40 border-emerald-200 text-center">
        <Trophy size={28} className="text-emerald-600 mx-auto mb-2" />
        <div className="text-sm font-bold text-emerald-700 mb-1">Maçını izledin</div>
        <div className="text-[10px] text-muted-foreground">
          Sonraki maç: {schedule.nextMatchDateTr} · {schedule.nextMatchTimeTr}
        </div>
        {/* TEST MODU: Haftayı ilerle butonu */}
        <button
          onClick={onAdvanceWeek}
          className="tm-tap w-full mt-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <FastForward size={14} />
          HAFTAYI İLERLE (Test Modu)
        </button>
      </div>
    );
  }

  // Pencere içindeyiz — kullanıcı maçı izleyebilir
  if (schedule.inWindow) {
    const windowRemaining = schedule.windowEndsAt ? schedule.windowEndsAt - Date.now() : 0;
    return (
      <div className="tm-card p-4 bg-amber-50/40 border-amber-300 space-y-3">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold mb-2 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            MAÇ SAATİ
          </div>
          <div className="text-base font-bold mb-1">{schedule.nextMatchTimeTr}</div>
          <div className="text-[10px] text-muted-foreground">
            Pencere süresi: {formatCountdown(windowRemaining)}
          </div>
        </div>

        {/* Takım rozetleri */}
        <div className="flex items-center justify-center gap-3 py-2">
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
            <ClubBadge short={homeTeam.shortName} primaryColor={homeTeam.primaryColor} size={48} />
            <span className="text-[10px] font-semibold truncate w-full text-center">
              {homeTeam.name}
            </span>
          </div>
          <span className="text-lg font-bold text-muted-foreground">vs</span>
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
            <ClubBadge short={awayTeam.shortName} primaryColor={awayTeam.primaryColor} size={48} />
            <span className="text-[10px] font-semibold truncate w-full text-center">
              {awayTeam.name}
            </span>
          </div>
        </div>

        <button
          onClick={onWatch}
          className="tm-tap w-full py-3 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform animate-pulse"
        >
          <Play size={18} />
          MAÇI İZLE
        </button>
        <div className="text-[9px] text-muted-foreground text-center">
          Pencere dolmadan izle, yoksa otomatik simüle edilir.
        </div>
        {/* TEST MODU: Haftayı ilerle butonu */}
        <button
          onClick={onAdvanceWeek}
          className="tm-tap w-full py-2 rounded-lg bg-muted text-foreground text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform border border-border"
        >
          <FastForward size={12} />
          HAFTAYI İLERLE (Test Modu)
        </button>
      </div>
    );
  }

  // Pencere dışı — sonraki maça geri sayım
  return (
    <div className="tm-card p-4 space-y-3">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-bold mb-2">
          <Clock size={11} />
          SONRAKİ MAÇ
        </div>
        <div className="text-2xl font-bold tabular-nums">
          {schedule.nextMatchTimeTr}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {schedule.nextMatchDateTr} · Türkiye saatiyle
        </div>
      </div>

      {/* Takım rozetleri */}
      <div className="flex items-center justify-center gap-3 py-1">
        <div className="flex flex-col items-center gap-1 min-w-0 flex-1 opacity-70">
          <ClubBadge short={homeTeam.shortName} primaryColor={homeTeam.primaryColor} size={40} />
          <span className="text-[10px] font-semibold truncate w-full text-center">
            {homeTeam.name}
          </span>
        </div>
        <span className="text-base font-bold text-muted-foreground">vs</span>
        <div className="flex flex-col items-center gap-1 min-w-0 flex-1 opacity-70">
          <ClubBadge short={awayTeam.shortName} primaryColor={awayTeam.primaryColor} size={40} />
          <span className="text-[10px] font-semibold truncate w-full text-center">
            {awayTeam.name}
          </span>
        </div>
      </div>

      {/* Geri sayım */}
      <div className="bg-muted/40 rounded-lg p-3 text-center">
        <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">
          Maç başlangıcına
        </div>
        <div className="text-xl font-bold tabular-nums text-primary">
          {formatCountdown(schedule.msUntilNext)}
        </div>
      </div>

      <div className="text-[9px] text-muted-foreground text-center leading-relaxed">
        Maçlar hafta içi (Pzt-Cum) TR saatiyle 12:00 ve 18:00'de oynanır. Hafta sonu maç yok.
        <br />
        Saat gelince "MAÇI İZLE" butonu aktif olur.
      </div>

      {/* TEST/SOLO MOD: Maçı Oynat — pencere dışında da canlı oynatabilir */}
      <button
        onClick={onWatch}
        className="tm-tap w-full py-3 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform animate-pulse"
      >
        <Play size={16} />
        MAÇI OYNAT (Test Modu)
      </button>
      <div className="text-[8px] text-emerald-400/70 text-center -mt-1">
        Test modu — saati beklemeden maçı canlı oynat
      </div>

      {/* TEST MODU: Haftayı ilerle butonu — pencere dışında da çalışır */}
      <button
        onClick={onAdvanceWeek}
        className="tm-tap w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <FastForward size={14} />
        HAFTAYI İLERLE (Test Modu)
      </button>
      <div className="text-[8px] text-amber-400/70 text-center -mt-1">
        Test amaçlı — maçı atlayıp haftayı ilerletir
      </div>
    </div>
  );
}

// ---- Top bar ----
function MatchTopBar({
  state,
  homeTeam,
  awayTeam,
}: {
  state: MatchState;
  homeTeam: { name: string; shortName: string; primaryColor: string };
  awayTeam: { name: string; shortName: string; primaryColor: string };
}) {
  const { t } = useI18n();
  const isLive = state.status === "live";
  const isFinished = state.status === "finished";

  const minuteLabel = state.minute > 90
    ? `90+${state.minute - 90}'`
    : `${state.minute}'`;

  return (
    <div className="tm-card p-3">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
        <span>{t("match.referee")}: {state.referee.name}</span>
        <RefereeBadge personality={state.referee.personality} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Home */}
        <div className="flex flex-col items-center gap-1">
          <ClubBadge
            short={homeTeam.shortName}
            primaryColor={homeTeam.primaryColor}
            size={48}
          />
          <span className="text-[11px] font-semibold text-center truncate max-w-[100px]">
            {homeTeam.name}
          </span>
        </div>
        {/* Score + minute */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-3xl font-bold tabular-nums">
            <span>{state.homeScore}</span>
            <span className="text-muted-foreground text-xl">-</span>
            <span>{state.awayScore}</span>
          </div>
          <div className="mt-1">
            {isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {t("match.live")} · {minuteLabel}
              </span>
            )}
            {isFinished && (
              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-foreground">
                {t("match.ft")} · {minuteLabel}
              </span>
            )}
            {state.status === "idle" && (
              <span className="text-[10px] text-muted-foreground">00:00</span>
            )}
            {state.status === "paused" && (
              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white">
                {t("match.pause")} · {minuteLabel}
              </span>
            )}
          </div>
        </div>
        {/* Away */}
        <div className="flex flex-col items-center gap-1">
          <ClubBadge
            short={awayTeam.shortName}
            primaryColor={awayTeam.primaryColor}
            size={48}
          />
          <span className="text-[11px] font-semibold text-center truncate max-w-[100px]">
            {awayTeam.name}
          </span>
        </div>
      </div>
      {/* Weather row */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <WeatherIcon weather={state.weather} />
        <span>{t(`match.weather.${state.weather}`)}</span>
      </div>
    </div>
  );
}

function RefereeBadge({ personality }: { personality: MatchState["referee"]["personality"] }) {
  const { t } = useI18n();
  const colors: Record<string, string> = {
    strict: "bg-red-100 text-red-700",
    balanced: "bg-emerald-100 text-emerald-700",
    soft: "bg-sky-100 text-sky-700",
  };
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", colors[personality])}>
      {t(`match.ref.${personality}`)}
    </span>
  );
}

function WeatherIcon({ weather, size = 14 }: { weather: string; size?: number }) {
  if (weather === "sunny") return <Sun size={size} className="text-amber-500" />;
  if (weather === "rainy") return <CloudRain size={size} className="text-sky-500" />;
  if (weather === "windy") return <Wind size={size} className="text-slate-400" />;
  return <CloudSun size={size} />;
}

// ---- Info banner ----
function InfoBanner({ state }: { state: MatchState }) {
  const { t } = useI18n();
  // Hakem veya hava etkisi varsa göster
  const messages: string[] = [];
  if (state.referee.personality === "strict") messages.push(t("match.banner.strict"));
  if (state.weather === "rainy") messages.push(t("match.banner.rainy"));
  if (state.weather === "windy") messages.push(t("match.banner.windy"));
  if (state.weather === "sunny" && state.referee.personality !== "strict") {
    messages.push(t("match.banner.sunny"));
  }
  if (messages.length === 0) return null;
  return (
    <div className="tm-card p-2.5 space-y-1 bg-muted/50">
      {messages.map((m, i) => (
        <div key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <Zap size={11} className="mt-0.5 shrink-0 text-amber-500" />
          <span>{m}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Event feed ----
function EventFeed({
  events,
  emptyText,
  locale,
  homeTeam,
  awayTeam,
}: {
  events: MatchEvent[];
  emptyText: string;
  locale: "tr" | "en";
  homeTeam?: any;
  awayTeam?: any;
}) {
  const { t } = useI18n();
  return (
    <div className="tm-card">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-bold">{t("match.events.title")}</span>
        <span className="text-[10px] text-muted-foreground">{events.length}</span>
      </div>
      <div className="max-h-72 overflow-y-auto tm-thin-scrollbar">
        {events.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            {emptyText}
          </div>
        )}
        {events.map((ev, i) => (
          <EventRow key={`${ev.minute}-${i}-${ev.type}`} ev={ev} locale={locale} homeTeam={homeTeam} awayTeam={awayTeam} />
        ))}
      </div>
    </div>
  );
}

// Event tipine göre Türkçe spiker metni
function getEventText(ev: MatchEvent, homeTeam: any, awayTeam: any): string {
  const playerName = ev.playerName || ev.playerId || "";
  const teamName = ev.team === "home" ? homeTeam?.shortName : ev.team === "away" ? awayTeam?.shortName : "";
  const base = ev.description && ev.description !== ev.type ? ev.description : "";

  const texts: Record<string, string> = {
    goal: base || `GOL! ${playerName} ağları sarstı! ${teamName} öne geçiyor!`,
    yellow_card: base || `${playerName} sarı kart gördü. Hakem uyardı.`,
    red_card: base || `${playerName} kırmızı kart! ${teamName} 10 kişi kaldı!`,
    injury: base || `${playerName} sakatlandı, sağlık ekibi içeri girdi.`,
    substitution: base || `Oyuncu değişikliği: ${playerName} oyuna girdi.`,
    foul: base || `Faul! ${playerName} rakibini indirdi.`,
    corner: base || `Korner! ${teamName} köşe vuruşu kullanacak.`,
    shot_saved: base || `Kaleci müthiş kurtarış! ${playerName} şutunu çıkardı.`,
    shot_wide: base || `${playerName} topu auta attı, yakındı!`,
    shot_post: base || `Direkten döndü! ${playerName} çok yaklaştı!`,
    penalty: base || `Penaltı! ${teamName} için 11 metre!`,
    offside: base || `Ofsayt! ${playerName} zamanlama hatası yaptı.`,
    free_kick: base || `Serbest vuruş! ${teamName} tehlikeli bölgede.`,
    save: base || `Kaleci bir again kurtardı! ${playerName} şutunu engelledi.`,
    tackle: base || `Mükemmel müdahale! ${playerName} topu kazandı.`,
    interception: base || `Top kesişti! ${playerName} savunmaya destek oldu.`,
    chance: base || `${playerName} fırsat yarattı! Tehlikeli atak!`,
    var_review: base || `VAR incelemesi! Hakem monitöre gidiyor.`,
    goal_overturned: base || `Gol iptal edildi! VAR kararı.`,
  };
  return texts[ev.type] || base || `${playerName} — ${ev.type}`;
}

function EventRow({ ev, locale, homeTeam, awayTeam }: { ev: MatchEvent; locale: "tr" | "en"; homeTeam?: any; awayTeam?: any }) {
  const side = (ev.team as string) ?? "neutral";
  const sideColor = side === "home" ? "border-l-emerald-500" :
    side === "away" ? "border-l-sky-500" : "border-l-amber-500";
  const text = getEventText(ev, homeTeam, awayTeam);
  return (
    <div className={cn("flex items-start gap-2.5 px-3 py-2 border-l-2 border-b border-border/50 last:border-b-0", sideColor)}>
      <span className="text-[11px] font-bold tabular-nums text-muted-foreground w-8 shrink-0 mt-0.5">
        {ev.minute > 90 ? `90+${ev.minute - 90}'` : `${ev.minute}'`}
      </span>
      <EventIcon type={ev.type} />
      <span className="text-xs flex-1 leading-snug">{text}</span>
    </div>
  );
}

function EventIcon({ type }: { type: MatchEvent["type"] }) {
  const map: Record<string, { emoji: string; cls: string }> = {
    goal: { emoji: "⚽", cls: "" },
    yellow_card: { emoji: "🟨", cls: "" },
    red_card: { emoji: "🟥", cls: "" },
    injury: { emoji: "🤕", cls: "" },
    substitution: { emoji: "🔄", cls: "" },
    foul: { emoji: "⚙️", cls: "" },
    corner: { emoji: "🚩", cls: "" },
    shot_saved: { emoji: "🧤", cls: "" },
    shot_wide: { emoji: "❌", cls: "" },
    shot_post: { emoji: "🎯", cls: "" },
    penalty: { emoji: "⚡", cls: "" },
    offside: { emoji: "🚩", cls: "" },
    free_kick: { emoji: "🎯", cls: "" },
    save: { emoji: "🧤", cls: "" },
    tackle: { emoji: "🛡️", cls: "" },
    interception: { emoji: "✋", cls: "" },
    chance: { emoji: "🔥", cls: "" },
    var_review: { emoji: "📺", cls: "" },
    goal_overturned: { emoji: "❌", cls: "" },
  };
  const { emoji } = map[type] ?? { emoji: "•", cls: "" };
  return <span className="text-sm shrink-0">{emoji}</span>;
}

// ---- Halftime Substitution UI ----
function HalftimeSubs({ team, homeTeam, engine, mySide }: {
  team: any;
  homeTeam: any;
  engine: any;
  mySide: "home" | "away" | "neutral";
}) {
  const [selectOut, setSelectOut] = useState<string | null>(null);
  const [subsDone, setSubsDone] = useState(0);
  const maxSubs = 3;

  // İlk 11 ve yedekleri ayır
  const startingXI = team.players.slice(0, 11);
  const subs = team.players.slice(11, 18);

  const handleSub = (outId: string, inId: string) => {
    if (subsDone >= maxSubs) return;
    haptic("success");

    // Store'da oyuncu değişikliği yap
    const state = useAppStore.getState();
    const clubs = [...state.clubs];
    const myClub = clubs.find((c) => c.id === team.id);
    if (!myClub) return;

    const outIdx = myClub.players.findIndex((p) => p.id === outId);
    const inIdx = myClub.players.findIndex((p) => p.id === inId);
    if (outIdx === -1 || inIdx === -1) return;

    // Swap pozisyonları
    const newPlayers = [...myClub.players];
    [newPlayers[outIdx], newPlayers[inIdx]] = [newPlayers[inIdx], newPlayers[outIdx]];
    myClub.players = newPlayers;
    useAppStore.setState({ clubs });

    setSubsDone(subsDone + 1);
    setSelectOut(null);
  };

  return (
    <div className="bg-muted/30 rounded-lg p-2 space-y-2 text-left">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase text-muted-foreground">🔄 Oyuncu Değişikliği</span>
        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", subsDone >= maxSubs ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300")}>
          {subsDone}/{maxSubs}
        </span>
      </div>

      {subsDone < maxSubs && (
        <>
          {!selectOut ? (
            <div className="space-y-1">
              <div className="text-[9px] text-muted-foreground mb-1">Çıkacak oyuncuyu seç:</div>
              {startingXI.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => { haptic("light"); setSelectOut(p.id); }}
                  className={cn(
                    "tm-tap w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors",
                    p.cond < 30 ? "bg-red-500/10 border border-red-500/30" : "bg-card border border-border hover:bg-accent/50"
                  )}
                >
                  <span className="text-[9px] font-bold w-6 shrink-0">{p.specificPosition}</span>
                  <span className="text-[10px] font-semibold flex-1 truncate">{p.firstName} {p.lastName}</span>
                  <span className="text-[8px] text-amber-400 font-bold tabular-nums">{p.rating} OVR</span>
                  <span className={cn("text-[8px] tabular-nums", p.cond < 30 ? "text-red-400" : "text-muted-foreground")}>
                    {p.cond}❤
                  </span>
                  {(p.goals > 0 || p.assists > 0) && (
                    <span className="text-[8px] text-emerald-400 font-bold tabular-nums">
                      {p.goals}G{p.assists > 0 ? `·${p.assists}A` : ""}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-muted-foreground">Girecek oyuncuyu seç:</span>
                <button onClick={() => setSelectOut(null)} className="text-[9px] text-muted-foreground">← Geri</button>
              </div>
              {subs.map((p: any) => {
                // Çıkacak oyuncunun OVR'ı ile girecek oyuncunun OVR'ı arasındaki fark
                const outPlayer = startingXI.find((sp: any) => sp.id === selectOut);
                const diff = (p.rating ?? 0) - (outPlayer?.rating ?? 0);
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSub(selectOut, p.id)}
                    className="tm-tap w-full flex items-center gap-2 p-1.5 rounded text-left bg-card border border-border hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors"
                  >
                    <span className="text-[9px] font-bold w-6 shrink-0">{p.specificPosition}</span>
                    <span className="text-[10px] font-semibold flex-1 truncate">{p.firstName} {p.lastName}</span>
                    <span className="text-[8px] text-amber-400 font-bold tabular-nums">{p.rating} OVR</span>
                    <span className="text-[8px] text-muted-foreground tabular-nums">{p.cond}❤</span>
                    {diff !== 0 && (
                      <span className={cn(
                        "text-[8px] font-bold tabular-nums px-1 rounded",
                        diff > 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                      )}>
                        {diff > 0 ? "+" : ""}{diff}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {subsDone >= maxSubs && (
        <div className="text-center text-[10px] text-muted-foreground py-1">
          ✓ 3 değişiklik hakkın bitti
        </div>
      )}
    </div>
  );
}

// ---- Live Commentary Banner ----
function LiveCommentaryBanner({ events }: { events: MatchEvent[] }) {
  if (events.length === 0) return null;
  const latest = events[0]; // en yeni event üstte

  // Event tipine göre renk ve ikon
  const config: Record<string, { bg: string; text: string; icon: string; intensity: string }> = {
    goal: { bg: "bg-emerald-500/15 border-emerald-500/40", text: "text-emerald-300", icon: "⚽", intensity: "animate-pulse" },
    yellow_card: { bg: "bg-amber-500/15 border-amber-500/40", text: "text-amber-300", icon: "🟨", intensity: "" },
    red_card: { bg: "bg-red-500/15 border-red-500/40", text: "text-red-300", icon: "🟥", intensity: "" },
    injury: { bg: "bg-orange-500/15 border-orange-500/40", text: "text-orange-300", icon: "🤕", intensity: "" },
    substitution: { bg: "bg-sky-500/15 border-sky-500/40", text: "text-sky-300", icon: "🔄", intensity: "" },
    penalty: { bg: "bg-purple-500/15 border-purple-500/40", text: "text-purple-300", icon: "⚡", intensity: "" },
    var_review: { bg: "bg-indigo-500/15 border-indigo-500/40", text: "text-indigo-300", icon: "📺", intensity: "" },
    chance: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-200", icon: "🔥", intensity: "" },
  };

  const cfg = config[latest.type] ?? { bg: "bg-muted/30 border-border", text: "text-foreground", icon: "📋", intensity: "" };
  const minute = latest.minute > 90 ? `90+${latest.minute - 90}'` : `${latest.minute}'`;

  return (
    <div className={cn("tm-card p-2.5 border-l-4 transition-all", cfg.bg, cfg.intensity)}>
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] font-bold tabular-nums text-muted-foreground">{minute}</span>
            <span className={cn("text-[8px] font-bold uppercase tracking-wide", cfg.text)}>
              {latest.type === "goal" ? "GOL!" : latest.type === "red_card" ? "KIRMIZI KART" : latest.type === "yellow_card" ? "SARI KART" : latest.type === "injury" ? "SAKATLIK" : latest.type === "substitution" ? "DEĞİŞİKLİK" : latest.type === "penalty" ? "PENALTI" : latest.type === "var_review" ? "VAR İNCELEMESİ" : latest.type === "chance" ? "FIRSAT" : "OLAY"}
            </span>
          </div>
          <p className={cn("text-[11px] leading-snug font-medium", cfg.text)}>
            {latest.description || `${latest.playerName ?? ""} — ${latest.type}`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- Stats bar ----
function StatsBar({ state }: { state: MatchState }) {
  const { t } = useI18n();

  // ADDED: Event'lerden ekstra istatistik çıkar — ofsayt, pas yüzdesi, kartlar
  const extraStats = useMemo(() => {
    let homeOffsides = 0, awayOffsides = 0;
    let homeYellow = 0, awayYellow = 0;
    let homeRed = 0, awayRed = 0;
    let homeSaves = 0, awaySaves = 0;
    let homeShotsWide = 0, awayShotsWide = 0;
    for (const ev of state.events) {
      if (ev.type === "offside") {
        if (ev.team === "home") homeOffsides++;
        else awayOffsides++;
      } else if (ev.type === "yellow_card") {
        if (ev.team === "home") homeYellow++;
        else awayYellow++;
      } else if (ev.type === "red_card") {
        if (ev.team === "home") homeRed++;
        else awayRed++;
      } else if (ev.type === "save") {
        // Save olayı savunan takımın kalecisi için — ev team attıysa away kaleci kurtardı
        if (ev.team === "away") homeSaves++; // home şut attı, away kaleci kurtardı → home şut
        else awaySaves++;
      } else if (ev.type === "shot_wide" || ev.type === "shot_post") {
        if (ev.team === "home") homeShotsWide++;
        else awayShotsWide++;
      }
    }
    return { homeOffsides, awayOffsides, homeYellow, awayYellow, homeRed, awayRed, homeSaves, awaySaves, homeShotsWide, awayShotsWide };
  }, [state.events]);

  const rows: { label: string; home: number; away: number; suffix?: string }[] = [
    { label: t("match.stats.possession"), home: state.stats.possession[0], away: state.stats.possession[1], suffix: "%" },
    { label: t("match.stats.shots"), home: state.stats.shotsOnTarget[0], away: state.stats.shotsOnTarget[1] },
    // ADDED: İsabetli şut (kaleci kurtarışları da şut olarak say)
    { label: "İsabetli Şut", home: state.stats.shotsOnTarget[0], away: state.stats.shotsOnTarget[1] },
    { label: "Kaleci Kurtarış", home: extraStats.homeSaves, away: extraStats.awaySaves },
    { label: t("match.stats.corners"), home: state.stats.corners[0], away: state.stats.corners[1] },
    { label: t("match.stats.fouls"), home: state.stats.fouls[0], away: state.stats.fouls[1] },
    // ADDED: Ofsayt
    { label: "Ofsayt", home: extraStats.homeOffsides, away: extraStats.awayOffsides },
    // ADDED: Sarı kart
    { label: "Sarı Kart", home: extraStats.homeYellow, away: extraStats.awayYellow },
    // ADDED: Kırmızı kart
    { label: "Kırmızı Kart", home: extraStats.homeRed, away: extraStats.awayRed },
  ];
  return (
    <div className="tm-card p-3 space-y-2.5">
      {rows.map((r) => (
        <StatBar key={r.label} {...r} />
      ))}
    </div>
  );
}

function StatBar({
  label,
  home,
  away,
  suffix = "",
}: {
  label: string;
  home: number;
  away: number;
  suffix?: string;
}) {
  const total = home + away || 1;
  const homePct = (home / total) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="font-bold tabular-nums">{home}{suffix}</span>
        <span className="text-muted-foreground text-[10px]">{label}</span>
        <span className="font-bold tabular-nums">{away}{suffix}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
        <div className="bg-emerald-500" style={{ width: `${homePct}%` }} />
        <div className="bg-sky-500" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}

// ---- Tactics drawer ----
function TacticsDrawer({
  open,
  onClose,
  engine,
  mySide,
  myTeam,
}: {
  open: boolean;
  onClose: () => void;
  engine: ReturnType<typeof useMatchEngine>;
  mySide: Side;
  myTeam: { players: PlayerT[] };
}) {
  const { t } = useI18n();
  const initial = engine.tactics[mySide];
  const [formation, setFormation] = useState(initial.formation);
  const [sliders, setSliders] = useState({
    pressing: initial.pressing,
    defensiveLine: initial.defensiveLine,
    tempo: initial.tempo,
    width: initial.width,
  });
  const [subOutId, setSubOutId] = useState<string | null>(null);
  const [subInId, setSubInId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!open) return null;

  const lineup = myTeam.players.slice(0, 11);
  const subs = myTeam.players.slice(11);

  const onApply = () => {
    haptic("success");
    const newTactics: MatchTactics = {
      formation,
      pressing: sliders.pressing,
      defensiveLine: sliders.defensiveLine,
      tempo: sliders.tempo,
      width: sliders.width,
    };
    engine.applyTactics(mySide as HomeAway, newTactics);
    setFeedback(`✓ ${t("match.tactics.apply")} · ${engine.state.minute}'`);
    setTimeout(() => setFeedback(null), 2000);
  };

  const onConfirmSub = () => {
    if (!subOutId || !subInId) return;
    const out = myTeam.players.find((p) => p.id === subOutId);
    const inn = myTeam.players.find((p) => p.id === subInId);
    if (!out || !inn) return;
    const ok = engine.makeSub(mySide as HomeAway, out, inn);
    if (ok) {
      haptic("success");
      setSubOutId(null);
      setSubInId(null);
      setFeedback(`✓ ${t("match.event.sub")} · ${engine.state.minute}'`);
      setTimeout(() => setFeedback(null), 2000);
    } else {
      haptic("error");
      setFeedback(t("match.tactics.no_subs_left"));
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const subsLeft = 5 - engine.state.subsUsed[mySide];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="close"
      />
      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold">{t("match.tactics")}</h3>
          <button onClick={onClose} className="tm-tap p-1">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto tm-thin-scrollbar p-4 space-y-4">
          {/* Formation selector */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {t("match.tactics.formation")}
            </label>
            <div className="mt-1.5 relative">
              <select
                value={formation}
                onChange={(e) => setFormation(e.target.value)}
                className="tm-tap w-full bg-card border border-border rounded-md px-3 py-2 text-sm appearance-none pr-8"
              >
                {FORMATION_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3">
            <SliderRow label={t("match.tactics.pressing")} value={sliders.pressing} onChange={(v) => setSliders((s) => ({ ...s, pressing: v }))} />
            <SliderRow label={t("match.tactics.defensive_line")} value={sliders.defensiveLine} onChange={(v) => setSliders((s) => ({ ...s, defensiveLine: v }))} />
            <SliderRow label={t("match.tactics.tempo")} value={sliders.tempo} onChange={(v) => setSliders((s) => ({ ...s, tempo: v }))} />
            <SliderRow label={t("match.tactics.width")} value={sliders.width} onChange={(v) => setSliders((s) => ({ ...s, width: v }))} />
          </div>

          {/* Apply button */}
          <button
            onClick={onApply}
            className="tm-tap w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold"
          >
            {t("match.tactics.apply")}
          </button>

          {/* Substitution section */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold">{t("match.tactics.subs")}</span>
              <span className="text-[10px] text-muted-foreground">
                {subsLeft} {t("match.tactics.subs_left")}
              </span>
            </div>
            {subsLeft <= 0 ? (
              <div className="text-[11px] text-muted-foreground text-center py-3">
                {t("match.tactics.no_subs_left")}
              </div>
            ) : (
              <>
                {/* Step 1: pick out */}
                <div className="text-[10px] text-muted-foreground mb-1.5">
                  {t("match.tactics.subs.pick_out")}
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {lineup.map((p) => (
                    <SubPicker
                      key={p.id}
                      player={p}
                      selected={subOutId === p.id}
                      onClick={() => setSubOutId(subOutId === p.id ? null : p.id)}
                    />
                  ))}
                </div>

                {subOutId && (
                  <>
                    <div className="text-[10px] text-muted-foreground mb-1.5">
                      {t("match.tactics.subs.pick_in")}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      {subs.map((p) => (
                        <SubPicker
                          key={p.id}
                          player={p}
                          selected={subInId === p.id}
                          onClick={() => setSubInId(subInId === p.id ? null : p.id)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {subOutId && subInId && (
                  <button
                    onClick={onConfirmSub}
                    className="tm-tap w-full py-2 rounded-md bg-emerald-600 text-white text-sm font-bold"
                  >
                    {t("match.tactics.subs.confirm")}
                  </button>
                )}
              </>
            )}
          </div>

          {feedback && (
            <div className="tm-card p-2.5 text-center text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
              {feedback}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs font-bold tabular-nums text-primary">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-primary tm-tap"
        style={{ minHeight: 28 }}
      />
    </div>
  );
}

function SubPicker({
  player,
  selected,
  onClick,
}: {
  player: PlayerT;
  selected: boolean;
  onClick: () => void;
}) {
  const team = useMyTeam();
  return (
    <button
      onClick={onClick}
      className={cn(
        "tm-tap flex items-center gap-2 p-2 rounded-md border text-left",
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      )}
    >
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white shrink-0"
        style={{ background: team?.primaryColor ?? "#1a3a2a" }}
      >
        {player.firstName[0]}{player.lastName[0]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold truncate">
          {player.firstName} {player.lastName}
        </div>
        <div className="text-[9px] text-muted-foreground">
          {player.specificPosition} · {player.rating}
        </div>
      </div>
    </button>
  );
}

// ---- Post match ----
function PostMatch({
  state,
  homeTeam,
  awayTeam,
  onReplay,
  onNewMatch,
}: {
  state: MatchState;
  homeTeam: { name: string; shortName: string; primaryColor: string; players: PlayerT[] };
  awayTeam: { name: string; shortName: string; primaryColor: string; players: PlayerT[] };
  onReplay: () => void;
  onNewMatch: () => void;
}) {
  const { t, locale } = useI18n();
  const [profilePlayer, setProfilePlayer] = useState<PlayerT | null>(null);
  // ADDED: Home/Away sekme state — oyuncu puanları ayrı
  const [ratingsTab, setRatingsTab] = useState<"home" | "away">("home");

  const motm = state.motmPlayerId
    ? [...homeTeam.players, ...awayTeam.players].find((p) => p.id === state.motmPlayerId)
    : null;
  const motmSide: Side = motm && homeTeam.players.some((p) => p.id === motm.id) ? "home" : "away";

  // ADDED: Mevki sıralaması — GK → DEF → MID → FWD
  const POSITION_ORDER: Record<string, number> = {
    GK: 0, CB: 1, LB: 2, RB: 3, LWB: 4, RWB: 5,
    CDM: 6, CM: 7, CAM: 8, LM: 9, RM: 10,
    LW: 11, RW: 12, CF: 13, ST: 14,
  };

  // Home ve Away oyuncuları ayrı ayrı, mevki sıralı
  const homeRated = homeTeam.players
    .map((p) => ({
      player: p,
      rating: state.playerRatings[p.id] ?? 6.5,
      stats: state.playerMatchStats[p.id] ?? { goals: 0, assists: 0, yellow: 0, red: 0 },
    }))
    .sort((a, b) => {
      const pa = POSITION_ORDER[a.player.specificPosition] ?? 99;
      const pb = POSITION_ORDER[b.player.specificPosition] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.rating - a.rating;
    })
    .slice(0, 11);

  const awayRated = awayTeam.players
    .map((p) => ({
      player: p,
      rating: state.playerRatings[p.id] ?? 6.5,
      stats: state.playerMatchStats[p.id] ?? { goals: 0, assists: 0, yellow: 0, red: 0 },
    }))
    .sort((a, b) => {
      const pa = POSITION_ORDER[a.player.specificPosition] ?? 99;
      const pb = POSITION_ORDER[b.player.specificPosition] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.rating - a.rating;
    })
    .slice(0, 11);

  const activeRated = ratingsTab === "home" ? homeRated : awayRated;

  return (
    <div className="space-y-3">
      {/* Final score card */}
      <div className="tm-card p-4 text-center">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          {t("match.post.final_score")}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <ClubBadge short={homeTeam.shortName} primaryColor={homeTeam.primaryColor} size={44} />
            <span className="text-[11px] font-semibold truncate max-w-[100px]">{homeTeam.name}</span>
          </div>
          <div className="text-4xl font-bold tabular-nums">
            {state.homeScore}<span className="text-muted-foreground text-2xl mx-1">-</span>{state.awayScore}
          </div>
          <div className="flex flex-col items-center gap-1">
            <ClubBadge short={awayTeam.shortName} primaryColor={awayTeam.primaryColor} size={44} />
            <span className="text-[11px] font-semibold truncate max-w-[100px]">{awayTeam.name}</span>
          </div>
        </div>
      </div>

      {/* MOTM card */}
      {motm && (
        <div className="tm-card p-3 border-amber-300 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">⭐</span>
            <span className="text-xs font-bold">{t("match.post.motm")}</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold text-white"
              style={{ background: motmSide === "home" ? homeTeam.primaryColor : awayTeam.primaryColor }}
            >
              {motm.firstName[0]}{motm.lastName[0]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{motm.firstName} {motm.lastName}</div>
              <div className="text-[11px] text-muted-foreground">
                {motm.specificPosition} · {motmSide === "home" ? homeTeam.name : awayTeam.name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums text-amber-700">
                {(state.playerRatings[motm.id] ?? 6.5).toFixed(1)}
              </div>
              <div className="text-[9px] text-muted-foreground uppercase">{t("match.post.col.rating")}</div>
            </div>
          </div>
        </div>
      )}

      {/* Gol kartları */}
      {state.events.filter((e) => e.type === "goal").length > 0 && (
        <div className="tm-card p-3">
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2">⚽ Goller</div>
          <div className="space-y-1">
            {state.events
              .filter((e) => e.type === "goal")
              .sort((a, b) => a.minute - b.minute)
              .map((ev, i) => {
                const side = (ev.team as string) ?? "neutral";
                const teamName = side === "home" ? homeTeam.shortName : side === "away" ? awayTeam.shortName : "";
                return (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="font-bold tabular-nums w-6">{ev.minute}'</span>
                    <span className="text-[9px] px-1 py-0.5 rounded font-bold"
                      style={{ background: side === "home" ? homeTeam.primaryColor : side === "away" ? awayTeam.primaryColor : "#666", color: "#fff" }}>
                      {teamName}
                    </span>
                    <span className="flex-1 truncate">{ev.description || `${ev.playerName || ""} gol attı`}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Kartlar */}
      {state.events.filter((e) => e.type === "yellow_card" || e.type === "red_card").length > 0 && (
        <div className="tm-card p-3">
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2">🟨🟥 Kartlar</div>
          <div className="space-y-1">
            {state.events
              .filter((e) => e.type === "yellow_card" || e.type === "red_card")
              .sort((a, b) => a.minute - b.minute)
              .map((ev, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span className="font-bold tabular-nums w-6">{ev.minute}'</span>
                  <span>{ev.type === "yellow_card" ? "🟨" : "🟥"}</span>
                  <span className="flex-1 truncate">{ev.description || `${ev.playerName || ""} ${ev.type === "yellow_card" ? "sarı" : "kırmızı"} kart gördü`}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Basın açıklaması */}
      <div className="tm-card p-3 bg-muted/30">
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">📰 Basın</div>
        <div className="text-[11px] leading-relaxed">
          {(() => {
            const diff = state.homeScore - state.awayScore;
            if (diff > 2) return "Etkileyici bir performans! Takım sahadaki üstünlüğünü gole yansıttı ve rakibine nefes aldırmadı.";
            if (diff === 1 || diff === -1) return "Taraftarlar için çekişmeli bir maçtı. İki takım da mücadele etti, fark tek golde kaldı.";
            if (diff === 0) return "Beraberlik her iki takım için de adil bir sonuçtu. Maç boyunca kırılma anı yaşanmadı.";
            if (diff < -2) return "Zor bir gün. Savunma organize olamadı ve rakip bunu acımasızca cezalandırdı. Düşünme zamanı.";
            return "Maç sona erdi, şimdi bir sonraki maça odaklanma zamanı.";
          })()}
        </div>
      </div>

      {/* Player ratings table — Home/Away sekmeli, mevki sıralı */}
      <div className="tm-card">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs font-bold">{t("match.post.ratings")}</span>
        </div>
        {/* ADDED: Home/Away sekme seçici */}
        <div className="flex gap-1 p-2 border-b border-border">
          <button
            onClick={() => { haptic("light"); setRatingsTab("home"); }}
            className={cn("flex-1 py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1.5",
              ratingsTab === "home" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: homeTeam.primaryColor }} />
            {homeTeam.shortName}
          </button>
          <button
            onClick={() => { haptic("light"); setRatingsTab("away"); }}
            className={cn("flex-1 py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1.5",
              ratingsTab === "away" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: awayTeam.primaryColor }} />
            {awayTeam.shortName}
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto tm-thin-scrollbar">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-[10px] text-muted-foreground uppercase">
                <th className="text-left px-2 py-1.5 w-8">{t("match.post.col.pos")}</th>
                <th className="text-left px-2 py-1.5">{t("match.post.col.player")}</th>
                <th className="text-center px-2 py-1.5 w-12">{t("match.post.col.rating")}</th>
                <th className="text-center px-2 py-1.5 w-6">{t("match.post.col.goals")}</th>
                <th className="text-center px-2 py-1.5 w-6">{t("match.post.col.assists")}</th>
                <th className="text-center px-2 py-1.5 w-10">{t("match.post.col.cards")}</th>
              </tr>
            </thead>
            <tbody>
              {activeRated.map((row) => {
                const cards = row.stats.yellow > 0 || row.stats.red > 0;
                return (
                  <tr
                    key={row.player.id}
                    onClick={() => { haptic("light"); setProfilePlayer(row.player); }}
                    className="border-b border-border/50 last:border-b-0 cursor-pointer hover:bg-accent/30 transition-colors tm-tap"
                  >
                    <td className="px-2 py-1.5">
                      <PositionPill label={row.player.specificPosition} group={POSITION_GROUP[row.player.specificPosition]} />
                    </td>
                    <td className="px-2 py-1.5 truncate max-w-[120px]">
                      {row.player.firstName} {row.player.lastName}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <RatingBadge value={row.rating} />
                    </td>
                    <td className="px-2 py-1.5 text-center tabular-nums">{row.stats.goals || "-"}</td>
                    <td className="px-2 py-1.5 text-center tabular-nums">{row.stats.assists || "-"}</td>
                    <td className="px-2 py-1.5 text-center">
                      {cards ? (
                        <span className="inline-flex gap-0.5">
                          {row.stats.yellow > 0 && <span className="text-[10px]">🟨{row.stats.yellow}</span>}
                          {row.stats.red > 0 && <span className="text-[10px]">🟥</span>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Player profile modal — tablo satırına tıklayınca açılır */}
      {profilePlayer && (
        <PlayerProfileModal
          player={profilePlayer}
          teamColor={
            homeTeam.players.some((p) => p.id === profilePlayer.id)
              ? homeTeam.primaryColor
              : awayTeam.primaryColor
          }
          onClose={() => setProfilePlayer(null)}
        />
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onReplay}
          className="tm-tap flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
        >
          <RefreshCw size={14} /> {t("match.post.watch_replay")}
        </button>
        <button
          onClick={onNewMatch}
          className="tm-tap flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-md border border-border text-sm font-semibold"
        >
          <Ban size={14} /> {t("match.post.new_match")}
        </button>
      </div>
    </div>
  );
}
