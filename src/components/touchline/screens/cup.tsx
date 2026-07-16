"use client";

import { useState } from "react";
import { Trophy, Eye, Calendar, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { ClubBadge } from "../ui-bits";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import { formatEuro } from "@/lib/format";

const ROUND_LABELS: Record<number, string> = {
  1: "cup.round.last16",
  2: "cup.round.quarter",
  3: "cup.round.semi",
  4: "cup.round.final",
};

// P1 FIX: store.ts ile senkronize — tek kaynak
// Round 2 (Çeyrek): 50K, Round 3 (Yarı): 150K, Round 4 (Final): 400K
// Şampiyon: ekstra 1M
const ROUND_REWARD: Record<number, number> = {
  2: 50_000,
  3: 150_000,
  4: 400_000,
};
const CHAMPION_REWARD = 1_000_000;

export function CupScreen() {
  const { t } = useI18n();
  const team = useMyTeam();
  const clubs = useAppStore((s) => s.clubs);
  const cup = useAppStore((s) => s.cup);
  const playCupRound = useAppStore((s) => s.playCupRound);
  const [lastResult, setLastResult] = useState<string | null>(null);

  if (!team) return null;

  const getTeam = (id: string) => clubs.find((c) => c.id === id);
  const cupMatches = cup.matches;
  const currentRound = cup.currentRound;

  // Kullanıcının maçı var mı?
  const myCupMatch = cupMatches.find(
    (m) => (m.homeId === team.id || m.awayId === team.id) && !m.played && m.round === currentRound
  );

  // Bu turda oynanmamış maç var mı?
  const unplayedInCurrentRound = cupMatches.filter(m => m.round === currentRound && !m.played);

  // Kullanıcı bu turda elendi mi? (eliminated flag true ve currentRound'da kullanıcının maçı yok)
  const isSpectator = !myCupMatch && !cup.champion && cupMatches.some(m => m.round === currentRound && !m.played);

  const handlePlay = () => {
    haptic("success");
    const res = playCupRound();
    if (res.myResult) {
      setLastResult(res.myResult);
    } else {
      // Kullanıcı kupada değilse ya da elendiyse, geneil durum mesajı göster
      const championTeam = res.champion ? getTeam(res.champion) : null;
      if (res.champion) {
        setLastResult(`🏆 Şampiyon: ${championTeam?.name}`);
      } else {
        const roundName = t(ROUND_LABELS[currentRound] ?? "cup.round");
        setLastResult(`✓ ${roundName} oynandı`);
      }
    }
  };

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      {/* Header */}
      <div className="tm-card p-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">{t("cup.title")}</h1>
          <p className="text-[11px] text-muted-foreground">{t("cup.weekend")}</p>
        </div>
        <div className="w-10 h-10 rounded-md bg-amber-500/20 flex items-center justify-center">
          <Trophy size={20} className="text-amber-400" />
        </div>
      </div>

      {/* Şampiyon ödülü + tur ödülleri */}
      <div className="tm-card p-3 border-amber-500/30 bg-amber-500/5">
        <div className="text-[10px] text-amber-400 font-bold uppercase mb-2">🏆 Kupa Ödülleri</div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Çeyrek:</span>
            <span className="text-amber-300 font-bold">{formatEuro(ROUND_REWARD[2])}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Yarı:</span>
            <span className="text-amber-300 font-bold">{formatEuro(ROUND_REWARD[3])}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Final:</span>
            <span className="text-amber-300 font-bold">{formatEuro(ROUND_REWARD[4])}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Şampiyon:</span>
            <span className="text-amber-300 font-bold">+{formatEuro(CHAMPION_REWARD)}</span>
          </div>
        </div>
      </div>

      {/* Sonuç mesajı */}
      {lastResult && (
        <div className="tm-card p-2 text-center text-xs font-bold bg-amber-500/10 border-amber-500/30 text-amber-300">
          {lastResult}
        </div>
      )}

      {/* Şampiyon */}
      {cup.champion && (
        <div className="tm-card p-3 text-center bg-amber-500/15 border-amber-500/40">
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-sm font-bold text-amber-300">Şampiyon: {getTeam(cup.champion)?.name}</div>
          {cup.champion === team.id && (
            <div className="text-[10px] text-emerald-400 mt-1">+{formatEuro(CHAMPION_REWARD)} ödül kazandınız!</div>
          )}
        </div>
      )}

      {/* Kullanıcının maçı varsa — Play card */}
      {myCupMatch && !cup.champion && (
        <div className="tm-card p-3 border-primary/40">
          <div className="text-[10px] text-primary uppercase font-bold mb-2 text-center">
            {t(ROUND_LABELS[currentRound] ?? "cup.round")} · {t("cup.your_match")}
          </div>
          <div className="flex items-center justify-center gap-3 py-2">
            {(() => {
              const home = getTeam(myCupMatch.homeId);
              const away = getTeam(myCupMatch.awayId);
              return (
                <>
                  <div className="flex flex-col items-center gap-1">
                    {home && <ClubBadge short={home.shortName} primaryColor={home.primaryColor} size={36} />}
                    <span className="text-[11px] font-bold">{home?.shortName}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold">{t("dash.vs")}</span>
                  <div className="flex flex-col items-center gap-1">
                    {away && <ClubBadge short={away.shortName} primaryColor={away.primaryColor} size={36} />}
                    <span className="text-[11px] font-bold">{away?.shortName}</span>
                  </div>
                </>
              );
            })()}
          </div>
          {/* Tur ödülü göster */}
          <div className="text-[11px] text-center text-amber-400 mb-2">
            Tur atlarsan: +{formatEuro(ROUND_REWARD[currentRound] ?? 0)}
          </div>
          <button
            onClick={handlePlay}
            className="tm-tap w-full mt-1 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold"
          >
            {t("cup.play")}
          </button>
        </div>
      )}

      {/* İzleyici modu — kullanıcı bu turda değil ama maçlar var */}
      {isSpectator && !cup.eliminated && !myCupMatch && (
        <div className="tm-card p-3 border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={14} className="text-blue-400" />
            <span className="text-[10px] text-blue-400 uppercase font-bold">İzleyici Modu</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">
            Bu turda maçı yok. Diğer takımların maçlarını izleyebilirsin.
          </p>
          <button
            onClick={handlePlay}
            className="tm-tap w-full py-2 rounded-md bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/40"
          >
            Bu Turu Oyna ({unplayedInCurrentRound.length} maç)
          </button>
        </div>
      )}

      {/* Elenen kullanıcı — ama hala bu turde oynanmamış maçlar var */}
      {cup.eliminated && !cup.champion && unplayedInCurrentRound.length > 0 && (
        <div className="tm-card p-3 border-muted/30">
          <p className="text-[11px] text-muted-foreground mb-2 text-center">
            Kupadan elendin. Diğer maçları izle:
          </p>
          <button
            onClick={handlePlay}
            className="tm-tap w-full py-2 rounded-md bg-muted/30 text-muted-foreground text-xs font-bold"
          >
            Bu Turu Oyna ({unplayedInCurrentRound.length} maç)
          </button>
        </div>
      )}

      {/* Elenen kullanıcı — bu tur bitti, bekleniyor */}
      {cup.eliminated && !cup.champion && unplayedInCurrentRound.length === 0 && (
        <div className="tm-card p-3 text-center text-xs text-muted-foreground">
          Kupadan elendin. Sonraki turu bekliyorsun (otomatik oynanır).
        </div>
      )}

      {/* Tur eşleşmeleri */}
      <div>
        <div className="text-xs font-bold mb-2 flex items-center gap-2">
          <Calendar size={12} className="text-muted-foreground" />
          {t(ROUND_LABELS[currentRound] ?? "cup.round")}
          <span className="text-[10px] text-muted-foreground font-normal">
            ({cupMatches.filter(m => m.round === currentRound && m.played).length}/{cupMatches.filter(m => m.round === currentRound).length} oynandı)
          </span>
        </div>
        <div className="space-y-1">
          {cupMatches.filter(m => m.round === currentRound).length === 0 && (
            <div className="tm-card p-4 text-center text-xs text-muted-foreground">
              {t("cup.no_matches")}
            </div>
          )}
          {cupMatches.filter(m => m.round === currentRound).map((m, i) => {
            const home = getTeam(m.homeId);
            const away = getTeam(m.awayId);
            if (!home || !away) return null;
            const isMine = m.homeId === team.id || m.awayId === team.id;
            return (
              <div
                key={i}
                className={cn(
                  "tm-card py-1.5 px-2.5 flex items-center gap-2",
                  isMine && "border-primary/50 bg-primary/5",
                  !m.played && "opacity-90"
                )}
              >
                <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
                  <span className={cn("text-[10px] truncate", isMine && m.homeId === team.id && "font-bold")}>{home.name}</span>
                  <ClubBadge short={home.shortName} primaryColor={home.primaryColor} size={20} />
                </div>
                <span className="text-[10px] text-muted-foreground font-bold px-1">
                  {m.played ? `${m.homeScore} - ${m.awayScore}` : "vs"}
                </span>
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <ClubBadge short={away.shortName} primaryColor={away.primaryColor} size={20} />
                  <span className={cn("text-[10px] truncate", isMine && m.awayId === team.id && "font-bold")}>{away.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Önceki turlar */}
      {cupMatches.filter(m => m.round < currentRound).length > 0 && (
        <div>
          <div className="text-xs font-bold mb-2 text-muted-foreground">Önceki Turlar</div>
          <div className="space-y-1">
            {cupMatches.filter(m => m.round < currentRound).sort((a,b) => b.round - a.round).map((m, i) => {
              const home = getTeam(m.homeId);
              const away = getTeam(m.awayId);
              if (!home || !away) return null;
              const isMine = m.homeId === team.id || m.awayId === team.id;
              const homeWon = (m.homeScore ?? 0) > (m.awayScore ?? 0);
              return (
                <div
                  key={i}
                  className={cn(
                    "tm-card py-1 px-2.5 flex items-center gap-2 opacity-60",
                    isMine && "border-primary/30"
                  )}
                >
                  <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
                    <span className={cn("text-[10px] truncate", homeWon ? "font-bold" : "text-muted-foreground")}>{home.shortName}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold px-1">
                    {m.homeScore} - {m.awayScore}
                  </span>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className={cn("text-[10px] truncate", !homeWon ? "font-bold" : "text-muted-foreground")}>{away.shortName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kupa tamamlandıysa — bilgi kartı */}
      {cup.champion && (
        <div className="tm-card p-3 text-center text-[11px] text-muted-foreground">
          Kupa bu sezon tamamlandı. Yeni sezonda yeniden başlayacak.
        </div>
      )}
    </div>
  );
}
