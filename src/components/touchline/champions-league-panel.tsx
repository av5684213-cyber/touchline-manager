"use client";

import { useState } from "react";
import { Trophy, Loader2, Play, Eye } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import { TeamDetailModal } from "./team-detail-modal";
// v2.9.91 (Madde 29): CL maçı replay için MatchReplayModal
import { MatchReplayModal } from "./match-replay-modal";
import type { Team } from "@/lib/mock/data";

/**
 * v2.9.41: Şampiyonlar Ligi Paneli.
 *
 * Sezon sonu lig bitiminde otomatik başlar.
 * 10 ülke × 4 tier × N departman × ilk 3 takım = ~30+ takım.
 * Tek maç eleme sistemi, günde 2 maç.
 * Kupa sekmesi altında gösterilir.
 */
export function ChampionsLeaguePanel() {
  const cl = useAppStore((s) => s.championsLeague);
  const playChampionsLeagueRound = useAppStore((s) => s.playChampionsLeagueRound);
  const myTeamId = useAppStore((s) => s.myTeamId);
  const clubs = useAppStore((s) => s.clubs);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  // v2.9.91 (Madde 29): CL maçı replay state
  const [replayMatch, setReplayMatch] = useState<any>(null);

  // v2.9.93: CL katılımcısı takım ID'sinden gerçek Team objesi bul
  const findTeam = (teamId: string): Team | null => {
    // Önce kullanıcın clubs'ında ara
    const fromClubs = clubs.find(c => c.id === teamId);
    if (fromClubs) return fromClubs;
    // CL participant'tan takım üret (bot takımlar için minimal info)
    const p = cl.participants.find(pp => pp.teamId === teamId);
    if (p) {
      return {
        id: p.teamId,
        name: p.teamName,
        shortName: p.teamShort,
        primaryColor: p.teamColor,
        secondaryColor: "#ffffff",
        leagueTier: (p.tier ?? 1) as any,
        department: 1 as any,
        players: [],
        budget: 0,
        stadiumCapacity: 0,
        stadiumName: "",
      } as any;
    }
    return null;
  };

  if (!cl.active && !cl.champion) {
    return (
      <div className="tm-card p-3 text-center">
        <Trophy size={24} className="text-muted-foreground/50 mx-auto mb-1" />
        <p className="text-[11px] font-bold text-muted-foreground">Şampiyonlar Ligi</p>
        <p className="text-[9px] text-muted-foreground">
          Sezon sonu lig ilk 3'ü ile başlar. Pazartesi 12:00'de.
        </p>
      </div>
    );
  }

  // Şampiyon
  if (cl.champion) {
    const champ = cl.participants.find(p => p.teamId === cl.champion);
    const champTeam = findTeam(cl.champion);
    return (
      <>
      <div className="tm-card p-4 text-center bg-amber-500/10 border-amber-500/30">
        <Trophy size={32} className="text-amber-400 mx-auto mb-2" />
        <p className="text-sm font-bold text-amber-300">🏆 Şampiyonlar Ligi Şampiyonu</p>
        <button
          onClick={() => { haptic("light"); if (champTeam) setSelectedTeam(champTeam); }}
          className="tm-tap text-base font-bold mt-1 hover:text-primary hover:underline"
        >
          {champ?.teamName ?? "Bilinmiyor"}
        </button>
        <div className="flex items-center justify-center gap-1 mt-1">
          {champ && <div className="w-4 h-4 rounded-sm" style={{ background: champ.teamColor }} />}
          <span className="text-[10px] text-muted-foreground">{champ?.teamShort}</span>
        </div>
      </div>
      {selectedTeam && (
        <TeamDetailModal
          team={selectedTeam}
          isMyTeam={selectedTeam.id === myTeamId}
          onClose={() => setSelectedTeam(null)}
          onMessage={() => setSelectedTeam(null)}
        />
      )}
      </>
    );
  }

  // Aktif — bracket
  const currentRoundMatches = cl.matches.filter(m => m.round === cl.currentRound);
  const playedMatches = cl.matches.filter(m => m.played);
  const pendingMatches = currentRoundMatches.filter(m => !m.played);
  const totalRounds = Math.ceil(Math.log2(cl.participants.length));

  const roundNames: Record<number, string> = {
    1: "1. Tur",
    2: "Son 16",
    3: "Son 8",
    4: "Çeyrek Final",
    5: "Yarı Final",
    6: "Final",
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="tm-card p-3 bg-gradient-to-br from-blue-900/20 to-indigo-900/10 border-blue-500/30">
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={16} className="text-blue-400" />
          <h2 className="text-sm font-bold">🌍 Şampiyonlar Ligi</h2>
          <span className="text-[9px] text-muted-foreground ml-auto">
            {cl.participants.length} takım · {roundNames[cl.currentRound] ?? `Tur ${cl.currentRound}`}
          </span>
        </div>
        {cl.eliminated && (
          <p className="text-[10px] text-red-400">Elendin. Kalan maçları izleyebilirsin.</p>
        )}
      </div>

      {/* Tur oyna butonu */}
      {pendingMatches.length > 0 && (
        <button
          onClick={() => {
            haptic("medium");
            const result = playChampionsLeagueRound();
            if (result?.champion) {
              haptic("success");
            }
          }}
          className="tm-tap w-full py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <Play size={14} /> {roundNames[cl.currentRound] ?? `Tur ${cl.currentRound}`} Oyna ({pendingMatches.length} maç)
        </button>
      )}

      {/* Sonraki tur butonu */}
      {pendingMatches.length === 0 && !cl.champion && (
        <button
          onClick={() => {
            haptic("medium");
            playChampionsLeagueRound(); // sonraki tur eşleşmelerini oluştur
          }}
          className="tm-tap w-full py-2.5 rounded-lg bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <Play size={14} /> Sonraki Tur → {roundNames[cl.currentRound + 1] ?? `Tur ${cl.currentRound + 1}`}
        </button>
      )}

      {/* Eşleşmeler */}
      <div>
        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5">
          {roundNames[cl.currentRound] ?? `Tur ${cl.currentRound}`}
        </div>
        <div className="space-y-1">
          {currentRoundMatches.map((m, i) => {
            const isMyMatch = m.homeId === myTeamId || m.awayId === myTeamId;
            const isByeMatch = (m as any).isBye === true;
            return (
              <div
                key={i}
                className={cn(
                  "tm-card p-2 flex items-center gap-2",
                  isMyMatch && "border-primary/50 bg-primary/5",
                  isByeMatch && "opacity-60"
                )}
              >
                {/* Home — tıklanabilir */}
                <div className="flex-1 flex items-center gap-1.5 justify-end">
                  <button
                    onClick={() => { haptic("light"); const t = findTeam(m.homeId); if (t) setSelectedTeam(t); }}
                    className={cn("text-[11px] font-semibold truncate tm-tap hover:text-primary hover:underline", m.winnerId === m.homeId && "text-emerald-400 font-bold")}
                  >
                    {m.homeShort}
                  </button>
                  {m.homeColor && <div className="w-4 h-4 rounded-sm shrink-0" style={{ background: m.homeColor }} />}
                </div>
                {/* Score — tıklanabilir (kullanıcı maçı + event'ler varsa replay aç) */}
                <div className="text-[11px] font-bold tabular-nums px-2 flex items-center gap-1">
                  {isByeMatch ? (
                    <span className="text-[9px] text-muted-foreground">BAY</span>
                  ) : m.played ? (
                    <>
                      <span>{m.homeScore} - {m.awayScore}</span>
                      {/* v2.9.91 (Madde 29): Kullanıcının CL maçı event'leri varsa izleme butonu */}
                      {isMyMatch && (m as any).events && (
                        <button
                          onClick={() => {
                            haptic("light");
                            setReplayMatch({
                              homeId: m.homeId,
                              awayId: m.awayId,
                              homeScore: m.homeScore,
                              awayScore: m.awayScore,
                              events: (m as any).events,
                              motmId: (m as any).motmId,
                              stats: (m as any).stats,
                            });
                          }}
                          className="tm-tap p-0.5 rounded hover:bg-accent/50 transition-colors"
                          aria-label="Maçı izle"
                          title="Maçı izle"
                        >
                          <Eye size={11} className="text-emerald-400" />
                        </button>
                      )}
                    </>
                  ) : "- : -"}
                </div>
                {/* Away — tıklanabilir */}
                <div className="flex-1 flex items-center gap-1.5">
                  {m.awayColor && <div className="w-4 h-4 rounded-sm shrink-0" style={{ background: m.awayColor }} />}
                  <button
                    onClick={() => { haptic("light"); const t = findTeam(m.awayId); if (t) setSelectedTeam(t); }}
                    className={cn("text-[11px] font-semibold truncate tm-tap hover:text-primary hover:underline", m.winnerId === m.awayId && "text-emerald-400 font-bold")}
                  >
                    {m.awayShort}
                  </button>
                </div>
                {isMyMatch && (
                  <span className="text-[8px] px-1 py-0.5 rounded bg-primary text-primary-foreground font-bold shrink-0">
                    SEN
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Önceki turlar */}
      {playedMatches.length > 0 && cl.currentRound > 1 && (
        <details className="tm-card p-2">
          <summary className="text-[10px] text-muted-foreground cursor-pointer">
            Önceki Turlar ({playedMatches.filter(m => m.round < cl.currentRound).length} maç)
          </summary>
          <div className="mt-2 space-y-1">
            {playedMatches.filter(m => m.round < cl.currentRound).map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
                <span className="text-muted-foreground w-12 shrink-0">{roundNames[m.round] ?? `T${m.round}`}</span>
                <span className={cn("flex-1 text-right truncate", m.winnerId === m.homeId && "text-emerald-400 font-bold")}>{m.homeShort}</span>
                <span className="font-bold tabular-nums">{m.homeScore} - {m.awayScore}</span>
                <span className={cn("flex-1 truncate", m.winnerId === m.awayId && "text-emerald-400 font-bold")}>{m.awayShort}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* v2.9.93: Takım detay modal'ı — CL takımlarına tıklanınca açılır */}
      {selectedTeam && (
        <TeamDetailModal
          team={selectedTeam}
          isMyTeam={selectedTeam.id === myTeamId}
          onClose={() => setSelectedTeam(null)}
          onMessage={() => setSelectedTeam(null)}
        />
      )}

      {/* v2.9.91 (Madde 29): CL maçı replay modal'ı */}
      {replayMatch && (() => {
        const home = findTeam(replayMatch.homeId);
        const away = findTeam(replayMatch.awayId);
        if (!home || !away) return null;
        return (
          <MatchReplayModal
            homeTeam={home}
            awayTeam={away}
            homeScore={replayMatch.homeScore ?? 0}
            awayScore={replayMatch.awayScore ?? 0}
            matchday={0}
            storedEvents={replayMatch.events}
            storedMotmId={replayMatch.motmId}
            storedStats={replayMatch.stats}
            onClose={() => setReplayMatch(null)}
          />
        );
      })()}
    </div>
  );
}
