"use client";

import { useState, useEffect } from "react";
import { Trophy, Eye, Calendar, ChevronRight, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
// v2.9.39: Özel Kupa paneli
import { SpecialCupPanel } from "../special-cup-panel";
// v2.9.41: Şampiyonlar Ligi paneli
import { ChampionsLeaguePanel } from "../champions-league-panel";
import { useAppStore, useMyTeam } from "@/lib/store";
import type { Team } from "@/lib/mock/data";
import { ClubBadge } from "../ui-bits";
import { TeamDetailModal } from "../team-detail-modal";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import { formatEuro } from "@/lib/format";
// v2.9.59: Kupa maçları cumartesi 12:00 ve 18:00'da oynanır
import { getCupMatchSchedule, getTimeUntilCupMatch } from "@/lib/cup-schedule";

const ROUND_LABELS: Record<number, string> = {
  1: "cup.round.last16",
  2: "cup.round.quarter",
  3: "cup.round.semi",
  4: "cup.round.final",
};

// P1 FIX: store.ts ile senkronize — tek kaynak
// Round 1 (Son 16): 25K, Round 2 (Çeyrek): 50K, Round 3 (Yarı): 150K, Round 4 (Final): 400K
// Şampiyon: ekstra 1M
const ROUND_REWARD: Record<number, number> = {
  1: 25_000,
  2: 50_000,
  3: 150_000,
  4: 400_000,
};
const CHAMPION_REWARD = 1_000_000;

export function CupScreen() {
  const { t, locale } = useI18n();
  const team = useMyTeam();
  const clubs = useAppStore((s) => s.clubs);
  const cup = useAppStore((s) => s.cup);
  const playCupRound = useAppStore((s) => s.playCupRound);
  const [lastResult, setLastResult] = useState<string | null>(null);
  // v2.9.76: Takım detay modal'ı için
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // v2.9.59: Canlı saat için tick state — her dakika güncelle
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // v2.9.59: Kupa maçının oynanma zamanını hesapla (cumartesi 12:00 veya 18:00)
  // — early return'den önce hesapla ki hook sıralaması korunsun
  // v2.9.66: Locale-aware etiketler için locale parametresi geçilir
  const currentRound = cup.currentRound;
  const cupSchedule = getCupMatchSchedule(currentRound, new Date(), locale);
  const timeUntil = getTimeUntilCupMatch(cupSchedule, new Date(), locale);

  // Manual play handler — sadece "maç saati gelmiş ve kullanıcı maçı varsa" otomatik oyna
  const handleAutoPlay = () => {
    haptic("success");
    const res = playCupRound();
    if (res.myResult) {
      setLastResult(res.myResult);
    } else {
      const championTeam = res.champion ? clubs.find((c) => c.id === res.champion) : null;
      if (res.champion) {
        setLastResult(t("cup.champion_result", { name: championTeam?.name ?? "?" }));
      } else {
        const roundName = t(ROUND_LABELS[currentRound] ?? "cup.round");
        setLastResult(t("cup.round_played", { round: roundName }));
      }
    }
  };

  // v2.9.59: Eğer maç saati geldiyse ve kullanıcı maçı varsa otomatik oyna
  // (Kullanıcı kupa sekmesine girdiğinde maç saati geldiyse otomatik oynanır)
  const myCupMatch = team
    ? cup.matches.find(
        (m) => (m.homeId === team.id || m.awayId === team.id) && !m.played && m.round === currentRound
      )
    : null;

  useEffect(() => {
    if (!myCupMatch) return;
    if (!cupSchedule.isToday) return;
    const matchHour = parseInt(cupSchedule.timeLabel.split(":")[0]);
    if (new Date().getHours() < matchHour) return;
    if (lastResult) return; // Zaten oynandı

    // Maç saati gelmiş — 1 sn sonra otomatik oyna
    const timer = setTimeout(() => {
      handleAutoPlay();
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myCupMatch, cupSchedule.isToday, cupSchedule.timeLabel, lastResult]);

  if (!team) return null;

  const getTeam = (id: string) => clubs.find((c) => c.id === id);
  const cupMatches = cup.matches;

  // Bu turda oynanmamış maç var mı?
  const unplayedInCurrentRound = cupMatches.filter(m => m.round === currentRound && !m.played);

  // Kullanıcı bu turda elendi mi?
  const isSpectator = !myCupMatch && !cup.champion && cupMatches.some(m => m.round === currentRound && !m.played);

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
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

      {/* v2.9.59: Kupa maç saati bilgisi — cumartesi 12:00 veya 18:00 */}
      {!cup.champion && (
        <div className="tm-card p-3 border-sky-500/30 bg-sky-500/5">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock size={14} className="text-sky-400" />
            <span className="text-[10px] text-sky-400 uppercase font-bold">{t("cup.match_time")}</span>
          </div>
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            Kupa maçları <strong className="text-foreground">her cumartesi 12:00 ve 18:00'da</strong> oynanır.
            Tur 1 (Son 16) ve Tur 3 (Yarı) <strong>12:00</strong>, Tur 2 (Çeyrek) ve Tur 4 (Final) <strong>18:00</strong>.
          </div>
        </div>
      )}

      {/* Şampiyon ödülü + tur ödülleri */}
      <div className="tm-card p-3 border-amber-500/30 bg-amber-500/5">
        <div className="text-[10px] text-amber-400 font-bold uppercase mb-2">🏆 {t("cup.awards")}</div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("cup.round.quarter_short")}</span>
            <span className="text-amber-300 font-bold">{formatEuro(ROUND_REWARD[2])}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("cup.round.semi_short")}</span>
            <span className="text-amber-300 font-bold">{formatEuro(ROUND_REWARD[3])}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("cup.round.final_short")}</span>
            <span className="text-amber-300 font-bold">{formatEuro(ROUND_REWARD[4])}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("cup.champion_label")}</span>
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
          <button
            onClick={() => { haptic("light"); const ct = cup.champion ? getTeam(cup.champion) : null; if (ct) setSelectedTeam(ct); }}
            className="text-sm font-bold text-amber-300 tm-tap hover:underline"
          >
            {t("cup.champion_label")} {getTeam(cup.champion)?.name}
          </button>
          {cup.champion === team.id && (
            <div className="text-[10px] text-emerald-400 mt-1">+{formatEuro(CHAMPION_REWARD)} ödül kazandınız!</div>
          )}
        </div>
      )}

      {/* v2.9.59: Kullanıcının maçı varsa — Tarih/Saat göster (Oyna butonu YOK) */}
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
            {t("cup.advance_reward")}{formatEuro(ROUND_REWARD[currentRound] ?? 0)}
          </div>
          {/* v2.9.59: Maç saati + geri sayım (Oyna butonu YERİNE) */}
          <div className="mt-2 p-2.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Clock size={13} className="text-sky-400" />
              <span className="text-xs font-bold text-sky-400">{cupSchedule.fullLabel}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {cupSchedule.isToday
                ? t("cup.match_starting_in", { n: timeUntil })
                : t("cup.match_in", { n: timeUntil })}
            </div>
            <div className="text-[9px] text-muted-foreground/70 mt-0.5">
              {t("cup.match_auto_play")}
            </div>
          </div>
        </div>
      )}

      {/* v2.9.59: İzleyici modu — kullanıcı bu turda değil ama maçlar var
          Oyna butonu YERİNE maç saati göster */}
      {isSpectator && !cup.eliminated && !myCupMatch && (
        <div className="tm-card p-3 border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={14} className="text-blue-400" />
            <span className="text-[10px] text-blue-400 uppercase font-bold">{t("cup.spectator_mode")}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">
            {t("cup.no_match_this_round")}
          </p>
          {/* v2.9.59: Maç saati + geri sayım */}
          <div className="p-2 rounded-md bg-sky-500/10 border border-sky-500/30 text-center mb-2">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Clock size={12} className="text-sky-400" />
              <span className="text-[11px] font-bold text-sky-400">{cupSchedule.fullLabel}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {cupSchedule.isToday
                ? t("cup.matches_starting_in", { n: timeUntil })
                : t("cup.matches_in", { n: timeUntil })}
            </div>
          </div>
          <div className="text-[10px] text-center text-muted-foreground">
            {t("cup.matches_waiting", { n: unplayedInCurrentRound.length })}
          </div>
        </div>
      )}

      {/* Elenen kullanıcı — ama hala bu turde oynanmamış maçlar var */}
      {cup.eliminated && !cup.champion && unplayedInCurrentRound.length > 0 && (
        <div className="tm-card p-3 border-muted/30">
          <p className="text-[11px] text-muted-foreground mb-2 text-center">
            {t("cup.eliminated_wait_results")}
          </p>
          {/* v2.9.59: Maç saati göster */}
          <div className="p-2 rounded-md bg-muted/30 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Clock size={12} className="text-muted-foreground" />
              <span className="text-[11px] font-bold text-muted-foreground">{cupSchedule.fullLabel}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {cupSchedule.isToday
                ? t("cup.matches_starting_in", { n: timeUntil })
                : t("cup.matches_in", { n: timeUntil })}
            </div>
          </div>
        </div>
      )}

      {/* Elenen kullanıcı — bu tur bitti, bekleniyor */}
      {cup.eliminated && !cup.champion && unplayedInCurrentRound.length === 0 && (
        <div className="tm-card p-3 text-center text-xs text-muted-foreground">
          {t("cup.eliminated_wait_next")}
        </div>
      )}

      {/* Tur eşleşmeleri */}
      <div>
        <div className="text-xs font-bold mb-2 flex items-center gap-2">
          <Calendar size={12} className="text-muted-foreground" />
          {t(ROUND_LABELS[currentRound] ?? "cup.round")}
          <span className="text-[10px] text-muted-foreground font-normal">
            ({cupMatches.filter(m => m.round === currentRound && m.played).length}/{cupMatches.filter(m => m.round === currentRound).length} {t("cup.played_label")})
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
                  <button onClick={() => { haptic("light"); setSelectedTeam(home); }} className={cn("text-[10px] truncate tm-tap hover:text-primary hover:underline", isMine && m.homeId === team.id && "font-bold")}>{home.name}</button>
                  <ClubBadge short={home.shortName} primaryColor={home.primaryColor} size={20} />
                </div>
                <span className="text-[10px] text-muted-foreground font-bold px-1">
                  {m.played ? `${m.homeScore} - ${m.awayScore}` : "vs"}
                </span>
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <ClubBadge short={away.shortName} primaryColor={away.primaryColor} size={20} />
                  <button onClick={() => { haptic("light"); setSelectedTeam(away); }} className={cn("text-[10px] truncate tm-tap hover:text-primary hover:underline", isMine && m.awayId === team.id && "font-bold")}>{away.name}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Önceki turlar */}
      {cupMatches.filter(m => m.round < currentRound).length > 0 && (
        <div>
          <div className="text-xs font-bold mb-2 text-muted-foreground">{t("cup.previous_rounds")}</div>
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
                    <button onClick={() => { haptic("light"); setSelectedTeam(home); }} className={cn("text-[10px] truncate tm-tap hover:text-primary hover:underline", homeWon ? "font-bold" : "text-muted-foreground")}>{home.shortName}</button>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold px-1">
                    {m.homeScore} - {m.awayScore}
                  </span>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <button onClick={() => { haptic("light"); setSelectedTeam(away); }} className={cn("text-[10px] truncate tm-tap hover:text-primary hover:underline", !homeWon ? "font-bold" : "text-muted-foreground")}>{away.shortName}</button>
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
          {t("cup.completed")}
        </div>
      )}

      {/* v2.9.41: Şampiyonlar Ligi paneli */}
      <div className="pt-2 border-t border-border">
        <ChampionsLeaguePanel />
      </div>

      {/* v2.9.39: Özel Kupa bölümü */}
      <div className="pt-2 border-t border-border">
        <SpecialCupPanel />
      </div>

      {/* v2.9.76: Takım detay modal'ı — takım ismine tıklayınca açılır */}
      {selectedTeam && (
        <TeamDetailModal
          team={selectedTeam}
          isMyTeam={selectedTeam.id === team?.id}
          onClose={() => setSelectedTeam(null)}
          onMessage={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
}

