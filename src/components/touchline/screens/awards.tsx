"use client";

import { useMemo, useState } from "react";
import { Award, Crown, Star, Trophy, Shield, Goal, TrendingUp, TrendingDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { computeStandings, SEASON_INFO } from "@/lib/mock/season";
import { cn } from "@/lib/utils";
// ADDED: Profil modalı için import
import { PlayerProfileModal } from "../player-profile-modal";
import type { Player } from "@/lib/mock/data";

export function AwardsScreen() {
  const { t, locale } = useI18n();
  const team = useMyTeam();
  const clubs = useAppStore((s) => s.clubs);
  const fixtures = useAppStore((s) => s.fixtures);
  const cup = useAppStore((s) => s.cup);
  const seasonNumber = useAppStore((s) => s.seasonNumber);
  // ADDED: Seçili oyuncu profili state
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);

  const awards = useMemo(() => {
    if (!team) return null;
    const standings = computeStandings(clubs, fixtures);
    const myStat = standings.find((s) => s.teamId === team.id);
    if (!myStat) return null;
    const myPos = standings.findIndex((s) => s.teamId === team.id) + 1;
    const totalTeams = standings.length;

    // Tüm oyuncuları topla
    const allPlayers: Array<{ player: any; club: any }> = [];
    for (const club of clubs) {
      for (const p of club.players) {
        allPlayers.push({ player: p, club });
      }
    }

    // Gol kralı
    const topScorer = [...allPlayers].sort((a, b) => (b.player.goals ?? 0) - (a.player.goals ?? 0))[0];
    // Asist kralı
    const topAssist = [...allPlayers].sort((a, b) => (b.player.assists ?? 0) - (a.player.assists ?? 0))[0];
    // MVP — en yüksek form rating
    const mvp = [...allPlayers].sort((a, b) => (b.player.formRating ?? 0) - (a.player.formRating ?? 0))[0];
    // En iyi kaleci — en çok kurtarış
    const goalkeepers = allPlayers.filter(x => x.player.specificPosition === "GK");
    const topGK = goalkeepers.length > 0
      ? [...goalkeepers].sort((a, b) => (b.player.saves ?? 0) - (a.player.saves ?? 0))[0]
      : null;
    // En çok MOTM — P2 FIX: motmAwards 0 ise son maç rating'ine göre seç
    const playersWithMotm = allPlayers.filter(x => (x.player.motmAwards ?? 0) > 0);
    const topMotm = playersWithMotm.length > 0
      ? [...playersWithMotm].sort((a, b) => (b.player.motmAwards ?? 0) - (a.player.motmAwards ?? 0))[0]
      : [...allPlayers].sort((a, b) => (b.player.last_match_rating ?? 0) - (a.player.last_match_rating ?? 0))[0];
    // En çok oynayan
    const topApps = [...allPlayers].sort((a, b) => (b.player.appearances ?? 0) - (a.player.appearances ?? 0))[0];

    // Kupa şampiyonu
    const cupChampion = cup.champion ? clubs.find(c => c.id === cup.champion) : null;

    // Lig durumu
    const isChampion = myPos === 1;
    const isPromotion = myPos <= 3 && (team.leagueTier ?? 2) > 1;
    const isRelegation = myPos >= totalTeams - 2;

    // Ayın oyuncusu — en son maçın en yüksek rating'li oyuncusu (kullanıcı takımından)
    const myRecentMatches = fixtures
      .filter(f => f.played && (f.homeId === team.id || f.awayId === team.id))
      .sort((a, b) => b.matchday - a.matchday);
    const lastMatch = myRecentMatches[0];
    let motm: { player: any; club: any } | null = null;
    if (lastMatch) {
      const isHome = lastMatch.homeId === team.id;
      const myScore = isHome ? lastMatch.homeScore : lastMatch.awayScore;
      const oppScore = isHome ? lastMatch.awayScore : lastMatch.homeScore;
      // En yüksek rating'li oyuncu — son maç rating'lerinden
      const ratedPlayers = team.players
        .filter(p => p.last_match_rating !== undefined && p.last_match_rating !== null)
        .sort((a, b) => (b.last_match_rating ?? 0) - (a.last_match_rating ?? 0));
      if (ratedPlayers.length > 0) {
        motm = { player: ratedPlayers[0], club: team };
      }
    }

    return {
      myPos, myStat, totalTeams,
      topScorer, topAssist, mvp, topGK, topMotm, topApps,
      cupChampion,
      isChampion, isPromotion, isRelegation,
      motm,
      champion: standings[0],
    };
  }, [clubs, fixtures, team, cup]);

  if (!team || !awards) return null;

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      <h1 className="text-base font-bold">Ödüller</h1>

      {/* Lig Durumu */}
      <div className="tm-card p-3 text-center">
        <div className="text-[10px] uppercase text-muted-foreground mb-1">Sezon {seasonNumber} · Lig Durumun</div>
        <div className="text-3xl font-bold tabular-nums">{awards.myPos}</div>
        <div className="text-[10px] text-muted-foreground">/ {awards.totalTeams} takım</div>
        <div className="text-[11px] mt-1">
          {awards.myStat.won}G · {awards.myStat.drawn}B · {awards.myStat.lost}M · {awards.myStat.points}P
        </div>
        {/* Durum rozeti */}
        <div className="mt-2 flex justify-center gap-1.5">
          {awards.isChampion && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              👑 ŞAMPİYON
            </span>
          )}
          {awards.isPromotion && !awards.isChampion && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              ⬆ ÜST LİGE ÇIKTI
            </span>
          )}
          {awards.isRelegation && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30">
              ⬇ KÜME DÜŞTÜ
            </span>
          )}
        </div>
      </div>

      {/* Sezon Ödülleri */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={14} className="text-amber-400" />
          <span className="text-xs font-bold">Sezon {seasonNumber} Ödülleri</span>
        </div>
        <div className="space-y-1.5">
          <AwardRow
            icon={<Crown size={16} className="text-amber-400" />}
            label="Lig Şampiyonu"
            name={awards.champion?.teamName ?? "—"}
            sub={`${awards.champion?.points ?? 0} puan`}
            highlight={awards.isChampion}
          />
          <AwardRow
            icon={<Goal size={16} className="text-emerald-400" />}
            label="Gol Kralı"
            name={awards.topScorer ? `${awards.topScorer.player.firstName} ${awards.topScorer.player.lastName}` : "—"}
            sub={`${awards.topScorer?.player.goals ?? 0} gol · ${awards.topScorer?.club.shortName ?? ""}`}
            onClickPlayer={awards.topScorer ? () => setProfilePlayer(awards.topScorer!.player) : undefined}
          />
          <AwardRow
            icon={<Star size={16} className="text-sky-400" />}
            label="Asist Kralı"
            name={awards.topAssist ? `${awards.topAssist.player.firstName} ${awards.topAssist.player.lastName}` : "—"}
            sub={`${awards.topAssist?.player.assists ?? 0} asist · ${awards.topAssist?.club.shortName ?? ""}`}
            onClickPlayer={awards.topAssist ? () => setProfilePlayer(awards.topAssist!.player) : undefined}
          />
          <AwardRow
            icon={<Award size={16} className="text-purple-400" />}
            label="Sezonun Oyuncusu"
            name={awards.mvp ? `${awards.mvp.player.firstName} ${awards.mvp.player.lastName}` : "—"}
            sub={`${(awards.mvp?.player.formRating ?? 0).toFixed(1)} form · ${awards.mvp?.club.shortName ?? ""}`}
            onClickPlayer={awards.mvp ? () => setProfilePlayer(awards.mvp!.player) : undefined}
          />
          {awards.topGK && (
            <AwardRow
              icon={<Shield size={16} className="text-cyan-400" />}
              label="En İyi Kaleci"
              name={`${awards.topGK.player.firstName} ${awards.topGK.player.lastName}`}
              sub={`${awards.topGK.player.saves ?? 0} kurtarış · ${awards.topGK.club.shortName}`}
              onClickPlayer={() => setProfilePlayer(awards.topGK!.player)}
            />
          )}
          <AwardRow
            icon={<Trophy size={16} className="text-amber-300" />}
            label="En Çok Maç Adamı"
            name={awards.topMotm ? `${awards.topMotm.player.firstName} ${awards.topMotm.player.lastName}` : "—"}
            sub={
              awards.topMotm
                ? (awards.topMotm.player.motmAwards ?? 0) > 0
                  ? `${awards.topMotm.player.motmAwards} MOTM · ${awards.topMotm?.club.shortName ?? ""}`
                  : `Son maç ${(awards.topMotm.player.last_match_rating ?? 0).toFixed(1)} puan · ${awards.topMotm?.club.shortName ?? ""}`
                : "—"
            }
            onClickPlayer={awards.topMotm ? () => setProfilePlayer(awards.topMotm!.player) : undefined}
          />
          <AwardRow
            icon={<TrendingUp size={16} className="text-indigo-400" />}
            label="En Çok Maç Oynayan"
            name={awards.topApps ? `${awards.topApps.player.firstName} ${awards.topApps.player.lastName}` : "—"}
            sub={`${awards.topApps?.player.appearances ?? 0} maç · ${awards.topApps?.club.shortName ?? ""}`}
            onClickPlayer={awards.topApps ? () => setProfilePlayer(awards.topApps!.player) : undefined}
          />
        </div>
      </div>

      {/* Kupa Şampiyonu */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={14} className="text-amber-400" />
          <span className="text-xs font-bold">Kupa</span>
        </div>
        {awards.cupChampion ? (
          <div className={cn(
            "flex items-center gap-2.5 p-2 rounded-md",
            awards.cupChampion.id === team.id ? "bg-amber-500/10 border border-amber-500/30" : "bg-muted/30"
          )}>
            <div className="shrink-0">🏆</div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted-foreground">Kupa Şampiyonu</div>
              <div className="text-xs font-bold truncate">{awards.cupChampion.name}</div>
            </div>
            {awards.cupChampion.id === team.id && (
              <div className="text-[11px] text-emerald-400 font-bold">+1M €</div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground text-center py-2">
            Kupa devam ediyor veya henüz şampiyon belirlenmedi.
          </div>
        )}
      </div>

      {/* Ayın Oyuncusu */}
      {awards.motm && (
        <div className="tm-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <Star size={14} className="text-amber-400" />
            <span className="text-xs font-bold">Son Maçın Oyuncusu</span>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: team.primaryColor }}>
              {awards.motm.player.specificPosition}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{awards.motm.player.firstName} {awards.motm.player.lastName}</div>
              <div className="text-[11px] text-muted-foreground">
                {awards.motm.player.specificPosition} · {(awards.motm.player.last_match_rating ?? 0).toFixed(1)} rating
              </div>
            </div>
            <div className="text-lg">⭐</div>
          </div>
        </div>
      )}

      {/* ADDED: Profil modalı — ödül kazanan oyuncuya tıklayınca açılır */}
      {profilePlayer && (
        <PlayerProfileModal
          player={profilePlayer}
          teamColor={team?.primaryColor ?? "#1a3a2a"}
          onClose={() => setProfilePlayer(null)}
        />
      )}
    </div>
  );
}

function AwardRow({
  icon,
  label,
  name,
  sub,
  highlight,
  onClickPlayer,
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  sub: string;
  highlight?: boolean;
  onClickPlayer?: () => void;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 p-1.5 rounded-md",
      highlight ? "bg-amber-500/10 border border-amber-500/30" : "bg-muted/30"
    )}>
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        {/* ADDED: Oyuncu adına tıklayınca profil kartı aç */}
        {onClickPlayer ? (
          <button
            onClick={onClickPlayer}
            className="text-xs font-bold truncate text-left hover:text-primary hover:underline transition-colors tm-tap"
          >
            {name}
          </button>
        ) : (
          <div className="text-xs font-bold truncate">{name}</div>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground text-right shrink-0">{sub}</div>
    </div>
  );
}
