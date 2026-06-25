"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  History,
  Loader2,
  Play,
  Search,
  Swords,
  Trophy,
  Zap,
  X,
} from "lucide-react";
import { useAppStore, useMyTeam } from "@/lib/store";
import { simulateEnhancedMatch, type EnhancedMatchEvent } from "@/lib/match/engine";
import { DEFAULT_TACTIC } from "@/lib/tactics/types";
import { ClubBadge } from "../ui-bits";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import type { Team, Player } from "@/lib/mock/data";

function pickXI(players: Player[]): Player[] {
  return [...players].sort((a, b) => b.rating - a.rating).slice(0, 11);
}

type FriendlyResult = {
  id: string;
  opponentId: string;
  opponentName: string;
  opponentShort: string;
  opponentColor: string;
  homeScore: number;
  awayScore: number;
  isHome: boolean;
  playedAt: number;
};

type SearchState = "idle" | "searching" | "matched" | "watching" | "result";

const FRIENDLY_REWARD = 50_000;
const QUEUE_DURATION = 30;
const POLL_INTERVAL = 2000;
const TICK_MS = 1000;

export function FriendlyMatchScreen() {
  const team = useMyTeam();
  const { clubs } = useAppStore();
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [timeLeft, setTimeLeft] = useState(QUEUE_DURATION);
  const [matchedOpponent, setMatchedOpponent] = useState<Team | null>(null);
  const [result, setResult] = useState<FriendlyResult | null>(null);
  const [history, setHistory] = useState<FriendlyResult[]>([]);
  const [activeView, setActiveView] = useState<"search" | "history">("search");
  const [isPriority, setIsPriority] = useState(false);

  // Canlı maç izleme state
  const [liveMinute, setLiveMinute] = useState(0);
  const [liveHomeScore, setLiveHomeScore] = useState(0);
  const [liveAwayScore, setLiveAwayScore] = useState(0);
  const [liveEvents, setLiveEvents] = useState<EnhancedMatchEvent[]>([]);
  const [matchResult, setMatchResult] = useState<ReturnType<typeof simulateEnhancedMatch> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventCursorRef = useRef(0);

  const availableOpponents = useMemo(() => {
    if (!team) return [];
    return clubs.filter((c) => c.id !== team.id);
  }, [clubs, team]);

  // Arama geri sayım
  useEffect(() => {
    if (searchState !== "searching") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleMatchFound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [searchState]);

  // Poll for match — ücretsiz sıra daha yavaş eşleşir
  useEffect(() => {
    if (searchState !== "searching") return;
    if (isPriority) return; // öncelikli zaten hemen başladı
    const poll = setInterval(() => {
      // Ücretsiz: %15 ihtimalle her poll'da eşleşme
      // (ortalama ~13 sn bekleme)
      if (Math.random() < 0.15) {
        handleMatchFound();
      }
    }, POLL_INTERVAL);
    return () => clearInterval(poll);
  }, [searchState, isPriority]);

  // Canlı maç tick
  useEffect(() => {
    if (searchState !== "watching" || !matchResult) return;
    const allEvents = [...matchResult.events].sort((a, b) => a.minute - b.minute);

    tickRef.current = setInterval(() => {
      if (eventCursorRef.current >= allEvents.length) {
        // Maç bitti
        if (tickRef.current) clearInterval(tickRef.current);
        finishMatch();
        return;
      }

      const ev = allEvents[eventCursorRef.current];
      eventCursorRef.current++;

      // Skor güncelle
      if (ev.type === "goal") {
        if (ev.team === "home") setLiveHomeScore((s) => s + 1);
        else setLiveAwayScore((s) => s + 1);
      }

      setLiveMinute(ev.minute);
      setLiveEvents((prev) => [ev, ...prev]);
    }, TICK_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [searchState, matchResult]);

  if (!team) return null;

  const handleStartSearch = (priority: boolean = false) => {
    haptic("medium");
    setIsPriority(priority);

    if (priority) {
      // Öncelikli sıra — 1 kredi, hemen maç başlat
      // Kredi kontrolü (şimdilik credits yok, direkt başlat)
      setTimeLeft(0);
      // Hemen eşleşme — 1 saniye sonra
      setSearchState("searching");
      setTimeout(() => handleMatchFound(), 1000);
    } else {
      // Ücretsiz sıra — beklemeli
      // Öncelikli sıraya giren biriyle eşleşene kadar bekle
      // %30 ihtimalle öncelikli sıradan biriyle, %70 ihtimalle normal
      setTimeLeft(QUEUE_DURATION);
      setSearchState("searching");
    }
  };

  const handleMatchFound = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    const opponent = availableOpponents[Math.floor(Math.random() * availableOpponents.length)];
    if (!opponent) return;
    haptic("success");
    setMatchedOpponent(opponent);
    setSearchState("matched");

    setTimeout(() => {
      startMatch(opponent);
    }, 2000);
  };

  const handleCancelSearch = () => {
    haptic("light");
    setSearchState("idle");
    setTimeLeft(QUEUE_DURATION);
  };

  const startMatch = (opponent: Team) => {
    const isHome = Math.random() < 0.5;
    const home = isHome ? team : opponent;
    const away = isHome ? opponent : team;

    const homeSquad = pickXI(home.players);
    const awaySquad = pickXI(away.players);

    const mResult = simulateEnhancedMatch(
      homeSquad as any,
      awaySquad as any,
      { ...DEFAULT_TACTIC, tactic_type: DEFAULT_TACTIC.formation, playerRoles: {} } as any,
      { ...DEFAULT_TACTIC, tactic_type: "4-4-2", playerRoles: {} } as any,
      {
        homeTeamName: home.name,
        awayTeamName: away.name,
        refereePersonality: "balanced" as any,
        atmosphereScore: 40,
      } as any
    );

    setMatchResult(mResult);
    setLiveMinute(0);
    setLiveHomeScore(0);
    setLiveAwayScore(0);
    setLiveEvents([]);
    eventCursorRef.current = 0;
    setSearchState("watching");
    haptic("medium");
  };

  const finishMatch = () => {
    if (!matchResult || !matchedOpponent) return;
    const isHome = matchResult.homeTeamName === team.name;
    const myScore = isHome ? matchResult.homeScore : matchResult.awayScore;
    const oppScore = isHome ? matchResult.awayScore : matchResult.homeScore;

    const friendlyResult: FriendlyResult = {
      id: `fm_${Date.now()}`,
      opponentId: matchedOpponent.id,
      opponentName: matchedOpponent.name,
      opponentShort: matchedOpponent.shortName,
      opponentColor: matchedOpponent.primaryColor,
      homeScore: matchResult.homeScore,
      awayScore: matchResult.awayScore,
      isHome,
      playedAt: Date.now(),
    };

    setResult(friendlyResult);
    setHistory((prev) => [friendlyResult, ...prev].slice(0, 20));
    setSearchState("result");

    useAppStore.setState({
      clubs: useAppStore.getState().clubs.map((c) =>
        c.id === team.id ? { ...c, budget: c.budget + FRIENDLY_REWARD } : c
      ),
    });
    haptic("success");
  };

  const handleCloseResult = () => {
    haptic("light");
    setResult(null);
    setMatchResult(null);
    setMatchedOpponent(null);
    setSearchState("idle");
  };

  // Event icon
  const eventIcon = (type: string) => {
    const map: Record<string, string> = {
      goal: "⚽", yellow_card: "🟨", red_card: "🟥", injury: "🤕",
      substitution: "🔄", foul: "⚙️", corner: "🚩", save: "🧤",
    };
    return map[type] ?? "•";
  };

  return (
    <div className="px-3 py-3 pb-6 space-y-3">
      {/* Header */}
      <div className="tm-card p-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold flex items-center gap-2">
            <Swords size={18} className="text-primary" />
            Hazırlık Maçı
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Lig puanını etkilemez · +{formatEuro(FRIENDLY_REWARD)}/maç
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveView("search")}
            className={cn(
              "tm-tap px-3 py-1.5 rounded-md text-[11px] font-bold",
              activeView === "search" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
            )}
          >
            Sıra
          </button>
          <button
            onClick={() => setActiveView("history")}
            className={cn(
              "tm-tap px-3 py-1.5 rounded-md text-[11px] font-bold",
              activeView === "history" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
            )}
          >
            Geçmiş
          </button>
        </div>
      </div>

      {activeView === "search" && (
        <>
          {/* IDLE */}
          {searchState === "idle" && (
            <div className="tm-card p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Swords size={28} className="text-primary" />
              </div>
              <h2 className="text-sm font-bold mb-1">Sıraya Gir</h2>
              <p className="text-[11px] text-muted-foreground mb-4">
                Sistem otomatik rakip bulur, maçı canlı izlersin.
              </p>
              <button
                onClick={() => handleStartSearch(false)}
                className="tm-tap tm-grad-primary w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 mb-2"
              >
                <Search size={16} /> Sıraya Gir (Ücretsiz)
              </button>
              <button
                onClick={() => handleStartSearch(true)}
                className="tm-tap w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-center gap-2"
              >
                <Zap size={14} /> Hemen Oyna (1 Kredi)
              </button>
              <p className="text-[9px] text-muted-foreground mt-3">
                💡 Ücretsiz sıra bekler, öncelikli sıraya girenlerle eşleşir.
                <br />⚡ 1 Kredi ile hemen maç başlat.
              </p>
            </div>
          )}

          {/* SEARCHING */}
          {searchState === "searching" && (
            <div className="tm-card p-6 text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Search size={24} className="text-primary" />
                </div>
              </div>
              <h2 className="text-sm font-bold mb-1">
                {isPriority ? "Maç Başlatılıyor..." : "Sırada Bekliyor..."}
              </h2>
              <p className="text-[11px] text-muted-foreground mb-3">
                {isPriority ? "⚡ Öncelikli sıra — hemen başlatılıyor" : "Rakip bekleniyor..."}
              </p>
              {!isPriority && (
                <div className="text-2xl font-bold tabular-nums text-primary mb-3">
                  0:{String(timeLeft).padStart(2, "0")}
                </div>
              )}
              {isPriority && (
                <div className="mb-3">
                  <Loader2 size={24} className="animate-spin text-primary mx-auto" />
                </div>
              )}
              <button
                onClick={handleCancelSearch}
                className="tm-tap px-4 py-2 rounded-md text-xs font-bold border border-border text-muted-foreground"
              >
                Sıradan Çık
              </button>
            </div>
          )}

          {/* MATCHED */}
          {searchState === "matched" && matchedOpponent && (
            <div className="tm-card tm-fade-up p-6 text-center border-primary/40">
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold mb-3">
                ✓ Eşleşme Bulundu!
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-4">
                <div className="flex flex-col items-center gap-1">
                  <ClubBadge short={team.shortName} primaryColor={team.primaryColor} size={44} />
                  <span className="text-[10px] font-bold truncate max-w-[100px]">{team.name}</span>
                </div>
                <span className="text-lg font-bold text-muted-foreground">VS</span>
                <div className="flex flex-col items-center gap-1">
                  <ClubBadge short={matchedOpponent.shortName} primaryColor={matchedOpponent.primaryColor} size={44} />
                  <span className="text-[10px] font-bold truncate max-w-[100px]">{matchedOpponent.name}</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                Maç başlatılıyor...
              </div>
            </div>
          )}

          {/* WATCHING — canlı maç izleme */}
          {searchState === "watching" && matchedOpponent && matchResult && (
            <div className="space-y-3">
              {/* Skor tablosu */}
              <div className="tm-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    CANLI · Hazırlık Maçı
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {liveMinute > 90 ? `90+${liveMinute - 90}'` : `${liveMinute}'`}
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <ClubBadge short={matchResult.homeTeamName === team.name ? team.shortName : matchedOpponent.shortName} primaryColor={matchResult.homeTeamName === team.name ? team.primaryColor : matchedOpponent.primaryColor} size={36} />
                    <span className="text-[9px] font-bold truncate max-w-[80px]">
                      {matchResult.homeTeamName === team.name ? team.name : matchedOpponent.name}
                    </span>
                  </div>
                  <div className="text-2xl font-bold tabular-nums">
                    {liveHomeScore}<span className="text-muted-foreground mx-1">-</span>{liveAwayScore}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <ClubBadge short={matchResult.awayTeamName === team.name ? team.shortName : matchedOpponent.shortName} primaryColor={matchResult.awayTeamName === team.name ? team.primaryColor : matchedOpponent.primaryColor} size={36} />
                    <span className="text-[9px] font-bold truncate max-w-[80px]">
                      {matchResult.awayTeamName === team.name ? team.name : matchedOpponent.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Canlı olaylar */}
              <div className="tm-card">
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-bold">Olaylar</span>
                  <span className="text-[10px] text-muted-foreground">{liveEvents.length}</span>
                </div>
                <div className="max-h-60 overflow-y-auto tm-thin-scrollbar">
                  {liveEvents.length === 0 && (
                    <div className="p-4 text-center text-[11px] text-muted-foreground">
                      Maç başladı, olaylar gelecek...
                    </div>
                  )}
                  {liveEvents.map((ev, i) => (
                    <div key={i} className={cn(
                      "flex items-start gap-2 px-3 py-1.5 border-b border-border/30",
                      ev.team === "home" ? "border-l-2 border-l-emerald-500" : "border-l-2 border-l-sky-500"
                    )}>
                      <span className="text-[10px] font-bold tabular-nums text-muted-foreground w-7 shrink-0">
                        {ev.minute > 90 ? `90+${ev.minute - 90}'` : `${ev.minute}'`}
                      </span>
                      <span className="text-sm shrink-0">{eventIcon(ev.type)}</span>
                      <div className="flex-1 min-w-0">
                        {ev.playerName && (
                          <div className="text-[10px] font-bold truncate">{ev.playerName}</div>
                        )}
                        <div className="text-[10px] text-muted-foreground truncate">{ev.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RESULT */}
          {searchState === "result" && result && (
            <div className="tm-card tm-fade-up p-4 text-center border-primary/40">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">
                Maç Sonucu
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-3">
                <div className="flex flex-col items-center gap-1">
                  <ClubBadge
                    short={result.isHome ? team.shortName : result.opponentShort}
                    primaryColor={result.isHome ? team.primaryColor : result.opponentColor}
                    size={44}
                  />
                  <span className="text-[10px] font-bold truncate max-w-[100px]">
                    {result.isHome ? team.name : result.opponentName}
                  </span>
                </div>
                <div className="text-3xl font-bold tabular-nums">
                  {result.isHome ? result.homeScore : result.awayScore}
                  <span className="text-muted-foreground mx-1">-</span>
                  {result.isHome ? result.awayScore : result.homeScore}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ClubBadge
                    short={!result.isHome ? team.shortName : result.opponentShort}
                    primaryColor={!result.isHome ? team.primaryColor : result.opponentColor}
                    size={44}
                  />
                  <span className="text-[10px] font-bold truncate max-w-[100px]">
                    {!result.isHome ? team.name : result.opponentName}
                  </span>
                </div>
              </div>
              {(() => {
                const myScore = result.isHome ? result.homeScore : result.awayScore;
                const oppScore = result.isHome ? result.awayScore : result.homeScore;
                if (myScore > oppScore) return <div className="text-sm font-bold text-emerald-400 mb-2">🎉 Galibiyet! +{formatEuro(FRIENDLY_REWARD)}</div>;
                if (myScore < oppScore) return <div className="text-sm font-bold text-red-400 mb-2">Mağlubiyet</div>;
                return <div className="text-sm font-bold text-amber-400 mb-2">Beraberlik</div>;
              })()}
              <button
                onClick={handleCloseResult}
                className="tm-tap tm-grad-primary w-full py-2.5 rounded-xl text-sm font-bold text-white"
              >
                Tamam
              </button>
            </div>
          )}
        </>
      )}

      {/* History */}
      {activeView === "history" && (
        <div>
          {history.length === 0 ? (
            <div className="tm-card p-8 text-center">
              <History size={28} className="text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs font-bold mb-1">Henüz maç oynanmadı</p>
              <p className="text-[10px] text-muted-foreground">"Sıra" sekmesinden sıraya gir.</p>
            </div>
          ) : (
            <div className="tm-card divide-y divide-border">
              {history.map((h) => {
                const myScore = h.isHome ? h.homeScore : h.awayScore;
                const oppScore = h.isHome ? h.awayScore : h.homeScore;
                const won = myScore > oppScore;
                const lost = myScore < oppScore;
                return (
                  <div key={h.id} className="flex items-center gap-2.5 p-2.5">
                    <span className={cn(
                      "w-1.5 h-8 rounded-full shrink-0",
                      won ? "bg-emerald-500" : lost ? "bg-red-500" : "bg-amber-500"
                    )} />
                    <ClubBadge short={h.opponentShort} primaryColor={h.opponentColor} size={24} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold truncate">
                        {h.isHome ? "vs" : "@"} {h.opponentName}
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {new Date(h.playedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                    <div className={cn(
                      "text-xs font-bold tabular-nums",
                      won ? "text-emerald-400" : lost ? "text-red-400" : "text-amber-400"
                    )}>
                      {myScore}-{oppScore}
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold",
                      won ? "text-emerald-400" : lost ? "text-red-400" : "text-amber-400"
                    )}>
                      {won ? "G" : lost ? "M" : "B"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
