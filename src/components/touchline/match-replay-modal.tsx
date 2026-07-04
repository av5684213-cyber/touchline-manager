"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { X, Trophy, Clock, Play } from "lucide-react";
import type { Team } from "@/lib/mock/data";
import { simulateEnhancedMatch } from "@/lib/match/engine";
import { DEFAULT_TACTIC } from "@/lib/tactics/types";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

type Event = {
  minute: number;
  type: string;
  team: string;
  player?: string;
  side?: string;
};

type MatchResult = {
  homeScore: number;
  awayScore: number;
  events: Event[];
  motmPlayerId?: string;
  playerRatings: Record<string, number>;
  stats: {
    possession: [number, number];
    shotsOnTarget: [number, number];
    corners: [number, number];
    fouls: [number, number];
  };
};

/**
 * Maç tekrar izleme modal'ı — herhangi iki takım arasındaki maçı simüle edip gösterir.
 * Puan tablosu, fikstür, takım detayından skorlara tıklanınca açılır.
 */
export function MatchReplayModal({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  matchday,
  onClose,
}: {
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number;
  awayScore?: number;
  matchday?: number;
  onClose: () => void;
}) {
  const [watching, setWatching] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [currentScore, setCurrentScore] = useState({ home: 0, away: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Maçı simüle et (sadece bir kez)
  const result = useMemo<MatchResult | null>(() => {
    try {
      const homeXI = [...homeTeam.players].sort((a, b) => b.rating - a.rating).slice(0, 11);
      const awayXI = [...awayTeam.players].sort((a, b) => b.rating - a.rating).slice(0, 11);
      const res = simulateEnhancedMatch(
        homeXI as any,
        awayXI as any,
        { ...DEFAULT_TACTIC, formation: "4-4-2" } as any,
        { ...DEFAULT_TACTIC, formation: "4-4-2" } as any,
        { homeTeamName: homeTeam.name, awayTeamName: awayTeam.name } as any
      );
      return {
        homeScore: homeScore ?? res.homeScore,
        awayScore: awayScore ?? res.awayScore,
        events: (res.events || []).sort((a: any, b: any) => a.minute - b.minute),
        motmPlayerId: res.manOfTheMatch,
        playerRatings: {},
        stats: {
          possession: [res.homePossession || 50, res.awayPossession || 50],
          shotsOnTarget: [res.homeStats?.shotsOnTarget || 0, res.awayStats?.shotsOnTarget || 0],
          corners: [res.homeStats?.corners || 0, res.awayStats?.corners || 0],
          fouls: [res.homeStats?.fouls || 0, res.awayStats?.fouls || 0],
        },
      };
    } catch (e) {
      return null;
    }
  }, [homeTeam, awayTeam, homeScore, awayScore]);

  const displayScore = result ?? { homeScore: homeScore ?? 0, awayScore: awayScore ?? 0, events: [], stats: { possession: [50, 50], shotsOnTarget: [0, 0], corners: [0, 0], fouls: [0, 0] }, playerRatings: {} };
  const sortedEvents = [...displayScore.events].sort((a, b) => a.minute - b.minute);

  // MOTM bul
  const motm = displayScore.motmPlayerId
    ? [...homeTeam.players, ...awayTeam.players].find((p) => p.id === displayScore.motmPlayerId)
    : null;

  // "Özeti İzle" — yavaş yavaş olayları göster
  useEffect(() => {
    if (!watching || sortedEvents.length === 0) return;
    setVisibleCount(0);
    setCurrentScore({ home: 0, away: 0 });
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= sortedEvents.length) {
        clearInterval(interval);
        setCurrentScore({ home: displayScore.homeScore, away: displayScore.awayScore });
        return;
      }
      const ev = sortedEvents[idx];
      // Gol varsa skoru güncelle
      if (ev.type === "goal") {
        const isHome = ev.team === "home" || ev.side === "home";
        setCurrentScore((prev) => ({
          home: isHome ? prev.home + 1 : prev.home,
          away: !isHome ? prev.away + 1 : prev.away,
        }));
      }
      setVisibleCount(idx + 1);
      idx++;
      // Auto-scroll
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 800); // 800ms per event
    return () => clearInterval(interval);
  }, [watching]);

  const finalScore = watching ? currentScore : { home: displayScore.homeScore, away: displayScore.awayScore };
  const shownEvents = watching ? sortedEvents.slice(0, visibleCount) : sortedEvents;
  const goals = shownEvents.filter((e) => e.type === "goal");
  const cards = shownEvents.filter((e) => e.type === "yellow_card" || e.type === "red_card" || e.type === "yellow" || e.type === "red");

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border" style={{ background: "var(--primary)" }}>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-white/60" />
            <span className="text-xs font-bold text-white">
              {matchday ? `Hafta ${matchday} · ` : ""}Maç Özeti
            </span>
          </div>
          <button onClick={onClose} className="tm-tap p-1 text-white/80">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto tm-thin-scrollbar p-3 space-y-3" ref={scrollRef}>
          {/* Skor kartı — izlerken canlı güncellenir */}
          <div className="tm-card p-4 text-center">
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 text-right">
                <div className="text-sm font-bold truncate">{homeTeam.name}</div>
                <div className="text-[10px] text-muted-foreground">Ev</div>
              </div>
              <div className="text-4xl font-bold tabular-nums text-amber-300">
                {finalScore.home} - {finalScore.away}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-bold truncate">{awayTeam.name}</div>
                <div className="text-[10px] text-muted-foreground">Dep</div>
              </div>
            </div>

            {/* Özeti İzle butonu */}
            {!watching && sortedEvents.length > 0 && (
              <button
                onClick={() => { haptic("medium"); setWatching(true); }}
                className="mt-3 w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2"
              >
                <Play size={16} /> Özeti İzle
              </button>
            )}
            {watching && visibleCount < sortedEvents.length && (
              <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-amber-400">
                <span className="animate-pulse">▶</span> Maç akıyor... ({visibleCount}/{sortedEvents.length})
              </div>
            )}
            {watching && visibleCount >= sortedEvents.length && (
              <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-emerald-400 font-bold">
                ✓ Maç sona erdi
              </div>
            )}

            {motm && (!watching || visibleCount >= sortedEvents.length) && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="text-[9px] text-muted-foreground uppercase">Maçın Oyuncusu</div>
                <div className="text-xs font-bold text-amber-300">
                  ⭐ {motm.firstName} {motm.lastName}
                </div>
              </div>
            )}
          </div>

          {/* İstatistikler */}
          <div className="tm-card p-3 space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">İstatistikler</div>
            {[
              { label: "Topla Oynama", home: displayScore.stats.possession[0], away: displayScore.stats.possession[1], unit: "%" },
              { label: "İsabetli Şut", home: displayScore.stats.shotsOnTarget[0], away: displayScore.stats.shotsOnTarget[1], unit: "" },
              { label: "Korner", home: displayScore.stats.corners[0], away: displayScore.stats.corners[1], unit: "" },
              { label: "Faul", home: displayScore.stats.fouls[0], away: displayScore.stats.fouls[1], unit: "" },
            ].map((stat) => {
              const total = stat.home + stat.away || 1;
              const homePct = (stat.home / total) * 100;
              return (
                <div key={stat.label}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="font-bold tabular-nums">{stat.home}{stat.unit}</span>
                    <span className="text-muted-foreground">{stat.label}</span>
                    <span className="font-bold tabular-nums">{stat.away}{stat.unit}</span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                    <div className="bg-sky-500" style={{ width: `${homePct}%` }} />
                    <div className="bg-rose-500" style={{ width: `${100 - homePct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Goller */}
          {goals.length > 0 && (
            <div className="tm-card p-3">
              <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">⚽ Goller</div>
              <div className="space-y-1.5">
                {goals.map((g, i) => {
                  const isHome = g.team === "home" || g.side === "home";
                  return (
                    <div key={i} className={cn("flex items-center gap-2 text-[10px]", !isHome && "flex-row-reverse text-right")}>
                      <span className="font-bold tabular-nums text-muted-foreground w-8">{g.minute}'</span>
                      <span className="text-base">⚽</span>
                      <span className="font-semibold flex-1 truncate">{g.player || "Bilinmiyor"}</span>
                      <span className={cn("text-[9px] px-1 py-0.5 rounded font-bold", isHome ? "bg-sky-500/20 text-sky-300" : "bg-rose-500/20 text-rose-300")}>
                        {isHome ? homeTeam.shortName : awayTeam.shortName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kartlar */}
          {cards.length > 0 && (
            <div className="tm-card p-3">
              <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">🟨🟥 Kartlar</div>
              <div className="space-y-1.5">
                {cards.map((c, i) => {
                  const isHome = c.team === "home" || c.side === "home";
                  const isRed = c.type === "red";
                  return (
                    <div key={i} className={cn("flex items-center gap-2 text-[10px]", !isHome && "flex-row-reverse text-right")}>
                      <span className="font-bold tabular-nums text-muted-foreground w-8">{c.minute}'</span>
                      <span className="text-base">{isRed ? "🟥" : "🟨"}</span>
                      <span className="font-semibold flex-1 truncate">{c.player || "Bilinmiyor"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Maç öncesi spiker */}
          {watching && visibleCount === 0 && (
            <div className="tm-card p-3 bg-amber-500/10 border-amber-500/30">
              <div className="text-[10px] font-bold text-amber-300 mb-1">🎙️ Maç Başlıyor!</div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {homeTeam.name} sahasında {awayTeam.name} konuk ediyor. Stadyum dopdolu! Hakem düdüğü çaldı, maç başladı!
              </p>
            </div>
          )}

          {/* Devre arası */}
          {watching && shownEvents.some((e) => e.minute > 45) && !shownEvents.some((e, idx) => idx >= visibleCount - 1 && e.minute <= 45) && shownEvents.some((e) => e.minute <= 45) && shownEvents.filter((e) => e.minute > 45).length > 0 && visibleCount === shownEvents.filter((e) => e.minute <= 45).length && (
            <div className="tm-card p-3 bg-sky-500/10 border-sky-500/30">
              <div className="text-[10px] font-bold text-sky-300 mb-1">⏸️ Devre Arası</div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                İlk yarı sona erdi. {homeTeam.name} {currentScore.home} - {currentScore.away} {awayTeam.name}. {currentScore.home > currentScore.away ? "Ev sahibi üstün." : currentScore.home < currentScore.away ? "Deplasman önde." : "Beraberlik."}
              </p>
            </div>
          )}

          {/* Olay zaman çizelgesi — izlerken yavaş yavaş akar */}
          {shownEvents.length > 0 && (
            <div className="tm-card p-3">
              <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Maç Akışı</div>
              <div className="space-y-1.5">
                {shownEvents.map((e, i) => {
                  const isHome = e.team === "home" || e.side === "home";
                  const teamShort = isHome ? homeTeam.shortName : (e.team === "away" || e.side === "away") ? awayTeam.shortName : "";
                  const teamName = isHome ? homeTeam.name : (e.team === "away" || e.side === "away") ? awayTeam.name : "";
                  const playerName = (e as any).player || (e as any).playerName || "";

                  // Detaylı spiker metni — her tip için zengin açıklama
                  const commentary = getDetailedCommentary(e, playerName, teamShort, teamName, isHome);
                  const icon = getEventIcon(e.type);
                  const isGoal = e.type === "goal";
                  const isCard = e.type === "yellow_card" || e.type === "yellow" || e.type === "red_card" || e.type === "red";
                  const isInjury = e.type === "injury";

                  return (
                    <div key={i} className={cn(
                      "flex items-start gap-2 p-1.5 rounded text-[10px] leading-snug transition-all",
                      isGoal && "bg-emerald-500/10 border-l-2 border-emerald-500",
                      isCard && "bg-amber-500/5 border-l-2 border-amber-500",
                      isInjury && "bg-orange-500/5 border-l-2 border-orange-500",
                      !isGoal && !isCard && !isInjury && "border-l-2 border-transparent"
                    )}>
                      <span className="font-bold tabular-nums text-muted-foreground w-7 shrink-0 mt-0.5">{e.minute > 90 ? `90+${e.minute - 90}'` : `${e.minute}'`}</span>
                      <span className="text-sm shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          "font-semibold",
                          isGoal && "text-emerald-300",
                          isCard && "text-amber-300",
                          isInjury && "text-orange-300",
                          !isGoal && !isCard && !isInjury && "text-muted-foreground"
                        )}>{commentary.title}</span>
                        <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-tight">{commentary.detail}</p>
                      </div>
                      {teamShort && (
                        <span className={cn("text-[8px] px-1 py-0.5 rounded font-bold shrink-0", isHome ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300")}>{teamShort}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Maç sonu spiker */}
          {watching && visibleCount >= sortedEvents.length && sortedEvents.length > 0 && (
            <div className="tm-card p-3 bg-emerald-500/10 border-emerald-500/30">
              <div className="text-[10px] font-bold text-emerald-300 mb-1">🏁 Maç Sona Erdi</div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {(() => {
                  const diff = finalScore.home - finalScore.away;
                  if (diff > 2) return `${homeTeam.name} sahasında ${awayTeam.name} karşısında üstün bir performans sergiledi! ${finalScore.home}-${finalScore.away} skorla sahadan galip ayrıldılar.`;
                  if (diff === 1) return `Çekişmeli maçta ${homeTeam.name} sahasında ${awayTeam.name}'i ${finalScore.home}-${finalScore.away} mağlup etti. Fark tek golde kaldı.`;
                  if (diff === 0) return `Beraberlik her iki takım için de adil bir sonuçtu. ${finalScore.home}-${finalScore.away} ile maç sona erdi.`;
                  if (diff === -1) return `${awayTeam.name} deplasmandan ${finalScore.home}-${finalScore.away} galibiyetle döndü! ${homeTeam.name} sahasında şaşırttı.`;
                  return `${awayTeam.name} deplasmanda ${homeTeam.name}'i ${finalScore.away}-${finalScore.home} gibi net bir skorla mağlup etti. Ev sahibi için zor bir gün.`;
                })()}
              </p>
            </div>
          )}

          {sortedEvents.length === 0 && goals.length === 0 && (
            <div className="tm-card p-4 text-center text-xs text-muted-foreground">
              Bu maç için detaylı olay verisi bulunmuyor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Detaylı spiker metni üretici =====
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getEventIcon(type: string): string {
  const map: Record<string, string> = {
    goal: "⚽",
    yellow_card: "🟨",
    yellow: "🟨",
    red_card: "🟥",
    red: "🟥",
    injury: "🤕",
    substitution: "🔄",
    sub: "🔄",
    foul: "⚠️",
    corner: "🚩",
    shot_saved: "🧤",
    shot_wide: "❌",
    shot_post: "🎯",
    penalty: "⚡",
    offside: "🚩",
    free_kick: "🎯",
    chance: "🔥",
    tackle: "🛡️",
    interception: "✋",
    var_review: "📺",
    goal_overturned: "❌",
  };
  return map[type] ?? "📋";
}

function getDetailedCommentary(
  e: any,
  playerName: string,
  teamShort: string,
  teamName: string,
  isHome: boolean
): { title: string; detail: string } {
  const side = isHome ? "Ev sahibi" : "Deplasman";
  const sideShort = isHome ? "Ev" : "Dep";

  switch (e.type) {
    case "goal":
      return {
        title: pick([
          `GOL! ${playerName} ağları sarstı!`,
          `GOOOL! ${playerName} topu ağlara gönderdi!`,
          `Muhteşem gol! ${playerName} kaleyi buldu!`,
          `${playerName} ceza sahasında soğukkanlı! GOL!`,
        ]),
        detail: pick([
          `${teamName} öne geçti! Stadyum çalkalanıyor!`,
          `${side} takımı gole yaklaşmıştı, fırsatı değerlendirdi!`,
          `Kalecinin yapacak bir şeyi yoktu, çok yerinde bir vuruş.`,
          `Taraftarlar ayakta! ${teamShort} için kritik bir gol!`,
        ]),
      };
    case "yellow_card":
    case "yellow":
      return {
        title: `${playerName} sarı kart gördü`,
        detail: pick([
          `Hakem sert müdahale sonrası kartını çıkardı. ${side} oyuncusu uyarıldı.`,
          `Taktiksel faul diyebiliriz. ${playerName}risk aldı ve kartını aldı.`,
          `Hakem oyunu sıkı tutuyor. Bu kart ${teamShort} için riskli.`,
        ]),
      };
    case "red_card":
    case "red":
      return {
        title: `KIRMIZI KART! ${playerName} gönderildi!`,
        detail: pick([
          `${teamShort} 10 kişi kaldı! Maçın kaderi değişebilir.`,
          `Hakem tereddüt etmedi. ${playerName} doğrudan kırmızı kart.`,
          `${side} takımı için büyük darbe! Kalan dakikalar zor geçecek.`,
        ]),
      };
    case "injury":
      return {
        title: `${playerName} sakatlandı`,
        detail: pick([
          `Sağlık ekibi sahaya girdi. Durum ciddi görünüyor.`,
          `${playerName} yerde kaldı. Değişiklik gerekebilir.`,
          `Üzücü bir sakatlık. ${teamShort} forveti oyuna devam edemeyebilir.`,
        ]),
      };
    case "substitution":
    case "sub":
      return {
        title: `Oyuncu değişikliği: ${playerName}`,
        detail: pick([
          `${side} takımı taze kan istiyor. ${teamShort} oyunun kaderini değiştirmek istiyor.`,
          `Teknik direktör hamlesini yaptı. ${playerName} oyuna dahil oluyor.`,
          `Yorgun bacaklar çıkıyor, dinamik oyuncu giriyor.`,
        ]),
      };
    case "foul":
      return {
        title: `Faul — ${playerName}`,
        detail: pick([
          `Orta saha bölgesinde faul. Oyun kısa süre durdu.`,
          `${playerName} rakibini yere indirdi. Hakem düdük çaldı.`,
          `Savunma faulü. ${teamShort} serbest vuruşla başlayacak.`,
        ]),
      };
    case "corner":
      return {
        title: `Korner — ${teamShort}`,
        detail: pick([
          `${side} takımı köşe vuruşu kazandı. Tehlikeli bölge!`,
          `Kaleci topu kornere çeldi. ${teamShort} atağa kalkıyor.`,
          `Korner başlıyor. Ceza sahası doluyor!`,
        ]),
      };
    case "shot_saved":
      return {
        title: `Kaleci kurtardı! — ${playerName}`,
        detail: pick([
          `Şut çok güzeldi ama kaleci biraz daha iyiydi. Müthiş kurtarış!`,
          `${playerName} şutunu çıkardı. Bu pozisyon gol olabilirdi!`,
          `Kaleci uçtu ve topu kornere gönderdi. Maçın kurtarışı!`,
        ]),
      };
    case "shot_wide":
      return {
        title: `Iska geçti — ${playerName}`,
        detail: pick([
          `${playerName} topu auta gönderdi. Yakındı ama gol değildi.`,
          `Şut yan ağlarda. ${playerName}'in vuruşu biraz düzgün değildi.`,
          `İyi pozisyon ama son vuruş eksikti. Aut.`,
        ]),
      };
    case "shot_post":
      return {
        title: `DİREKTEN DÖNDÜ! — ${playerName}`,
        detail: pick([
          `İnanılmaz! Direk ${teamShort} için yıkıldı! Çok yaklaşmıştı!`,
          `${playerName} direği deldi ama gol olmadı. Şanssız!`,
          `Direk diyecek — bu pozisyonda gol beklenirdi.`,
        ]),
      };
    case "penalty":
      return {
        title: `PENALTI! — ${teamShort}`,
        detail: pick([
          `Hakem penaltı noktasını gösterdi! ${side} takımı için altın fırsat!`,
          `Ceza sahasında elle oynama! Penaltı kararı tartışmasız.`,
          `${teamShort} 11 metreden gol arıyor. Stadyum tutuluyor!`,
        ]),
      };
    case "offside":
      return {
        title: `Ofsayt — ${playerName}`,
        detail: pick([
          `Bayrak havada! ${playerName} bir adım erken başladı.`,
          `Savunma hattı çok iyi. Ofsayt tuzağı çalıştı.`,
          `Gol çizgisinde çok erken. Hakem bayrağını kaldırdı.`,
        ]),
      };
    case "free_kick":
      return {
        title: `Serbest vuruş — ${teamShort}`,
        detail: pick([
          `Tehlikeli bölgeden serbest vuruş. ${teamShort} için fırsat!`,
          `${side} takımı duvar örgüsü kuruyor. Geri sayım başladı.`,
          `Serbest vuruş ${teamShort} için. Kaleci hazır.`,
        ]),
      };
    case "chance":
      return {
        title: `Fırsat! — ${playerName}`,
        detail: pick([
          `${playerName} tehlikeli bir atak başlattı! Savunma geriliyor.`,
          `${side} takımı kaleye yaklaşıyor. Bu pozisyon gol olabilir!`,
          `${teamShort} hızlı hücum! ${playerName} topu taşıyor.`,
        ]),
      };
    case "tackle":
      return {
        title: `Müdahale — ${playerName}`,
        detail: pick([
          `Mükemmel bir müdahale! Topu kazandı ve atağı kesti.`,
          `${playerName} temiz bir tackle yaptı. Savunma direnci.`,
          `Sert ama düzgün müdahale. Oyun devam ediyor.`,
        ]),
      };
    case "interception":
      return {
        title: `Top kesişti — ${playerName}`,
        detail: pick([
          `${playerName} pas arasına girdi. ${teamShort} topu kazandı.`,
          `Savunma dikkatli! Pas kesildi, tehlike önlendi.`,
          `${side} takımı topu kaptı. Hızlı hücum başlayabilir.`,
        ]),
      };
    case "var_review":
      return {
        title: `VAR incelemesi`,
        detail: pick([
          `Hakem monitöre gidiyor. Stadyum bekliyor...`,
          `VAR çağrısı! Olası penaltı/kart durumu inceleniyor.`,
          `Kontroller yapılıyor. Karar bekleniyor.`,
        ]),
      };
    case "goal_overturned":
      return {
        title: `Gol iptal edildi!`,
        detail: pick([
          `VAR incelemesi sonrası gol iptal! Ofsayt tespit edildi.`,
          `İnceleme bitti — gol geçersiz sayıldı. Şanssızlık.`,
          `Hakem kararı verdi: gol yok! ${teamShort} hayal kırıklığı.`,
        ]),
      };
    default:
      return {
        title: (e as any).description || playerName || e.type,
        detail: "",
      };
  }
}
