"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  History,
  Loader2,
  Search,
  Swords,
  Trophy,
  Zap,
  X,
} from "lucide-react";
import { useAppStore, useMyTeam } from "@/lib/store";
import { simulateEnhancedMatch } from "@/lib/match/engine";
import { DEFAULT_TACTIC } from "@/lib/tactics/types";
import { ClubBadge } from "../ui-bits";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import type { Team, Player } from "@/lib/mock/data";

// Inline pickStartingXI — en yüksek OVR'li 11 oyuncu
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

type SearchState = "idle" | "searching" | "matched" | "playing" | "result";

const FRIENDLY_REWARD = 50_000;
const QUEUE_DURATION = 30; // 30 saniye arama (eski oyun 5dk ama bizde bot)
const POLL_INTERVAL = 2000;

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

  // Sıradaki sırada suitable opponents
  const availableOpponents = useMemo(() => {
    if (!team) return [];
    return clubs.filter((c) => c.id !== team.id);
  }, [clubs, team]);

  useEffect(() => {
    if (searchState !== "searching") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Süre doldu — rastgele rakip bul
          handleMatchFound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [searchState]);

  // Daha hızlı eşleşme için poll
  useEffect(() => {
    if (searchState !== "searching") return;
    const poll = setInterval(() => {
      // %50 ihtimalle erken eşleşme (öncelikli ise %70)
      const chance = isPriority ? 0.7 : 0.5;
      if (Math.random() < chance) {
        handleMatchFound();
      }
    }, POLL_INTERVAL);
    return () => clearInterval(poll);
  }, [searchState, isPriority]);

  if (!team) return null;

  const handleStartSearch = (priority: boolean = false) => {
    haptic("medium");
    setIsPriority(priority);
    setTimeLeft(QUEUE_DURATION);
    setSearchState("searching");
  };

  const handleMatchFound = () => {
    // Rastgele rakip seç
    const opponent = availableOpponents[Math.floor(Math.random() * availableOpponents.length)];
    if (!opponent) return;
    haptic("success");
    setMatchedOpponent(opponent);
    setSearchState("matched");

    // 2 saniye sonra maçı başlat
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
    setSearchState("playing");

    const home = team;
    const away = opponent;
    const isHome = Math.random() < 0.5;

    const homeSquad = pickXI(home.players);
    const awaySquad = pickXI(away.players);

    setTimeout(() => {
      const matchResult = simulateEnhancedMatch(
        (isHome ? homeSquad : awaySquad) as any,
        (isHome ? awaySquad : homeSquad) as any,
        { ...DEFAULT_TACTIC, tactic_type: DEFAULT_TACTIC.formation, playerRoles: {} } as any,
        { ...DEFAULT_TACTIC, tactic_type: "4-4-2", playerRoles: {} } as any,
        {
          homeTeamName: isHome ? home.name : away.name,
          awayTeamName: isHome ? away.name : home.name,
          refereePersonality: "balanced" as any,
          atmosphereScore: 40,
        } as any
      );

      const myScore = isHome ? matchResult.homeScore : matchResult.awayScore;
      const oppScore = isHome ? matchResult.awayScore : matchResult.homeScore;

      const friendlyResult: FriendlyResult = {
        id: `fm_${Date.now()}`,
        opponentId: opponent.id,
        opponentName: opponent.name,
        opponentShort: opponent.shortName,
        opponentColor: opponent.primaryColor,
        homeScore: matchResult.homeScore,
        awayScore: matchResult.awayScore,
        isHome,
        playedAt: Date.now(),
      };

      setResult(friendlyResult);
      setHistory((prev) => [friendlyResult, ...prev].slice(0, 20));
      setSearchState("result");

      // Ödül
      useAppStore.setState({
        clubs: useAppStore.getState().clubs.map((c) =>
          c.id === team.id ? { ...c, budget: c.budget + FRIENDLY_REWARD } : c
        ),
      });

      haptic("success");
    }, 800);
  };

  const handleCloseResult = () => {
    haptic("light");
    setResult(null);
    setSearchState("idle");
    setMatchedOpponent(null);
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
            Lig puanını etkilemez · Maç başına +{formatEuro(FRIENDLY_REWARD)}
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
            Ara
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

      {/* Search View */}
      {activeView === "search" && (
        <>
          {/* IDLE — arama butonları */}
          {searchState === "idle" && (
            <div className="space-y-3">
              <div className="tm-card p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Swords size={28} className="text-primary" />
                </div>
                <h2 className="text-sm font-bold mb-1">Rakip Ara</h2>
                <p className="text-[11px] text-muted-foreground mb-4">
                  Sistem otomatik olarak uygun bir rakip bulur ve maçı başlatır.
                </p>
                <button
                  onClick={() => handleStartSearch(false)}
                  className="tm-tap tm-grad-primary w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 mb-2"
                >
                  <Search size={16} /> Rakip Ara (Ücretsiz)
                </button>
                <button
                  onClick={() => handleStartSearch(true)}
                  className="tm-tap w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-center gap-2"
                >
                  <Zap size={14} /> Öncelikli Ara (1 Kredi)
                </button>
              </div>
            </div>
          )}

          {/* SEARCHING — arama animasyonu */}
          {searchState === "searching" && (
            <div className="tm-card p-6 text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Search size={24} className="text-primary" />
                </div>
              </div>
              <h2 className="text-sm font-bold mb-1">Rakip Aranıyor...</h2>
              <p className="text-[11px] text-muted-foreground mb-3">
                {isPriority ? "⚡ Öncelikli arama" : "Uygun rakip bekleniyor"}
              </p>
              <div className="text-2xl font-bold tabular-nums text-primary mb-3">
                0:{String(timeLeft).padStart(2, "0")}
              </div>
              <button
                onClick={handleCancelSearch}
                className="tm-tap px-4 py-2 rounded-md text-xs font-bold border border-border text-muted-foreground"
              >
                İptal Et
              </button>
            </div>
          )}

          {/* MATCHED — eşleşme bulundu */}
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

          {/* PLAYING — maç simüle ediliyor */}
          {searchState === "playing" && (
            <div className="tm-card p-8 text-center">
              <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm font-bold">Maç Oynanıyor...</p>
              <p className="text-[11px] text-muted-foreground">Simülasyon sürüyor</p>
            </div>
          )}

          {/* RESULT — maç sonucu */}
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

      {/* History View */}
      {activeView === "history" && (
        <div>
          {history.length === 0 ? (
            <div className="tm-card p-8 text-center">
              <History size={28} className="text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs font-bold mb-1">Henüz maç oynanmadı</p>
              <p className="text-[10px] text-muted-foreground">"Ara" sekmesinden rakip bul ve oyna.</p>
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
                    <span
                      className={cn(
                        "w-1.5 h-8 rounded-full shrink-0",
                        won ? "bg-emerald-500" : lost ? "bg-red-500" : "bg-amber-500"
                      )}
                    />
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
