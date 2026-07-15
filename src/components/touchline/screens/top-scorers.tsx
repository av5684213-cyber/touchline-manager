"use client";

import { useMemo, useState } from "react";
import { Crown, TrendingUp, TrendingDown } from "lucide-react";
import { useAppStore, useMyTeam } from "@/lib/store";
import { PlayerAvatar } from "../ui-bits";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import { PlayerProfileModal } from "../player-profile-modal";
import type { Player } from "@/lib/mock/data";

type SortKey = "goals" | "assists" | "rating" | "motm" | "appearances";

export function TopScorersScreen() {
  const clubs = useAppStore((s) => s.clubs);
  const myTeam = useMyTeam();
  const [sortKey, setSortKey] = useState<SortKey>("goals");
  const [tier, setTier] = useState<"all" | "mine">("all");
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);

  const allPlayers = useMemo(() => {
    const list: Array<{ player: any; team: any; isMyPlayer: boolean }> = [];
    for (const club of clubs) {
      for (const p of club.players) {
        // ADDED: Sadece maça çıkmış oyuncuları listele (appearances > 0)
        if ((p.appearances ?? 0) > 0) {
          list.push({ player: p, team: club, isMyPlayer: club.id === myTeam?.id });
        }
      }
    }
    return list;
  }, [clubs, myTeam]);

  const ranked = useMemo(() => {
    let filtered = allPlayers;
    if (tier === "mine") filtered = allPlayers.filter((x) => x.isMyPlayer);
    return [...filtered].sort((a, b) => {
      const pa = a.player, pb = b.player;
      switch (sortKey) {
        case "goals": return (pb.goals ?? 0) - (pa.goals ?? 0) || (pb.assists ?? 0) - (pa.assists ?? 0) || (pb.rating ?? 0) - (pa.rating ?? 0);
        case "assists": return (pb.assists ?? 0) - (pa.assists ?? 0) || (pb.goals ?? 0) - (pa.goals ?? 0) || (pb.rating ?? 0) - (pa.rating ?? 0);
        case "rating": return (pb.formRating ?? 0) - (pa.formRating ?? 0) || (pb.goals ?? 0) - (pa.goals ?? 0);
        case "motm": return (pb.motmAwards ?? 0) - (pa.motmAwards ?? 0) || (pb.rating ?? 0) - (pa.rating ?? 0);
        case "appearances": return (pb.appearances ?? 0) - (pa.appearances ?? 0) || (pb.rating ?? 0) - (pa.rating ?? 0);
        default: return 0;
      }
    });
  }, [allPlayers, sortKey, tier]);

  const top20 = ranked.slice(0, 20);
  const totalGoals = allPlayers.reduce((s, x) => s + (x.player.goals ?? 0), 0);
  const myTopPlayer = ranked.find((x) => x.isMyPlayer);
  const myRank = myTopPlayer ? ranked.indexOf(myTopPlayer) + 1 : null;

  const sortLabels: Record<SortKey, string> = {
    goals: "⚽ Gol", assists: "🅰 Asist", rating: "⭐ Rating", motm: "🏆 MOTM", appearances: "📋 Maç",
  };

  return (
    <div className="space-y-3 pb-4">
      {/* Başlık + podium */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Crown size={16} className="text-amber-400" />
          <span className="text-sm font-bold">
            {sortKey === "goals" ? "Gol Kralı Yarışı" :
             sortKey === "assists" ? "Asist Kralı Yarışı" :
             sortKey === "rating" ? "Form Sıralaması" :
             sortKey === "motm" ? "Maçın Adamı Sıralaması" :
             "Oynama Süresi Sıralaması"}
          </span>
        </div>
        {ranked.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <PodiumItem rank={2} entry={ranked[1]} onClick={() => { haptic("light"); setProfilePlayer(ranked[1].player); }} />
            <PodiumItem rank={1} entry={ranked[0]} onClick={() => { haptic("light"); setProfilePlayer(ranked[0].player); }} />
            <PodiumItem rank={3} entry={ranked[2]} onClick={() => { haptic("light"); setProfilePlayer(ranked[2].player); }} />
          </div>
        )}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-1.5 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Toplam Gol</div>
            <div className="text-sm font-bold text-emerald-400 tabular-nums">{totalGoals}</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-1.5 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">En İyi Benim</div>
            <div className="text-sm font-bold text-amber-400 tabular-nums">{myRank ? `#${myRank}` : "—"}</div>
          </div>
          <div className="bg-sky-500/10 border border-sky-500/20 rounded p-1.5 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Oyuncu</div>
            <div className="text-sm font-bold text-sky-400 tabular-nums">{allPlayers.length}</div>
          </div>
        </div>
      </div>

      {/* Sıralama filtreleri */}
      <div className="flex gap-1.5">
        {(Object.keys(sortLabels) as SortKey[]).map((k) => (
          <button key={k} onClick={() => { haptic("light"); setSortKey(k); }}
            className={cn("tm-tap flex-1 py-1.5 rounded text-[10px] font-bold border",
              sortKey === k ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground")}>
            {sortLabels[k]}
          </button>
        ))}
      </div>

      {/* Lig filtresi */}
      <div className="flex gap-1.5">
        <button onClick={() => { haptic("light"); setTier("all"); }}
          className={cn("tm-tap flex-1 py-1.5 rounded text-[10px] font-bold border",
            tier === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground")}>
          Tüm Lig
        </button>
        <button onClick={() => { haptic("light"); setTier("mine"); }}
          className={cn("tm-tap flex-1 py-1.5 rounded text-[10px] font-bold border",
            tier === "mine" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground")}>
          Benim Takımım
        </button>
      </div>

      {/* Sıralama listesi */}
      <div className="space-y-1.5">
        {top20.map((entry, idx) => {
          const rank = idx + 1;
          const isMyPlayer = entry.isMyPlayer;
          const p = entry.player;
          const trend = idx < 3 ? "up" : idx > 10 ? "down" : "same";
          return (
            <button
              key={p.id}
              onClick={() => { haptic("light"); setProfilePlayer(p); }}
              className={cn("tm-tap w-full text-left tm-card py-1.5 px-2.5 flex items-center gap-2",
                isMyPlayer && "border-primary bg-primary/5", rank === 1 && "border-amber-500/40 bg-amber-500/5")}
            >
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                rank === 1 ? "bg-amber-500 text-black" : rank === 2 ? "bg-slate-400 text-black" :
                rank === 3 ? "bg-orange-700 text-white" : "bg-muted text-muted-foreground")}>
                {rank}
              </div>
              <PlayerAvatar initials={p.specificPosition} color={entry.team.primaryColor} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate flex items-center gap-1.5">
                  {p.firstName} {p.lastName}
                  {isMyPlayer && <span className="text-[10px] px-1 py-0.5 rounded bg-primary text-primary-foreground font-bold">SENİN</span>}
                  {p.form_streak === "hot" && <span className="text-[10px] px-1 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold">🔥</span>}
                  {p.form_streak === "cold" && <span className="text-[10px] px-1 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">❄️</span>}
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <span className="font-semibold" style={{ color: entry.team.primaryColor }}>{entry.team.shortName}</span>
                  <span>· {p.specificPosition}</span>
                  <span>· {p.age} yaş</span>
                </div>
              </div>
              <div className="shrink-0">
                {trend === "up" && <TrendingUp size={12} className="text-emerald-400" />}
                {trend === "down" && <TrendingDown size={12} className="text-red-400" />}
              </div>
              <div className="text-right shrink-0 min-w-[50px]">
                <div className="text-base font-bold tabular-nums">
                  {sortKey === "goals" ? p.goals : sortKey === "assists" ? p.assists :
                   sortKey === "rating" ? (p.formRating ?? 0).toFixed(1) :
                   sortKey === "motm" ? (p.motmAwards ?? 0) : (p.appearances ?? 0)}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">
                  {sortKey === "goals" ? "Gol" : sortKey === "assists" ? "Asist" :
                   sortKey === "rating" ? "Rating" : sortKey === "motm" ? "MOTM" : "Maç"}
                </div>
              </div>
            </button>
          );
        })}
        {top20.length === 0 && (
          <div className="tm-card p-6 text-center text-xs text-muted-foreground">
            Bu kriterde oyuncu bulunamadı.
          </div>
        )}
      </div>

      {myTopPlayer && myRank && myRank > 20 && (
        <div className="tm-card p-3 border-primary/30 bg-primary/5">
          <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5">
            Senin En İyi Oyuncun (#{myRank})
          </div>
          <div className="flex items-center gap-2">
            <PlayerAvatar initials={myTopPlayer.player.specificPosition} color={myTopPlayer.team.primaryColor} size={32} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{myTopPlayer.player.firstName} {myTopPlayer.player.lastName}</div>
              <div className="text-[10px] text-muted-foreground">
                {myTopPlayer.player.goals}G · {myTopPlayer.player.assists}A · {(myTopPlayer.player.formRating ?? 0).toFixed(1)} rating
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground text-center px-4">
        💡 Sıralama haftalık güncellenir. Gol kralı sezon sonu ödül alır.
      </div>

      {/* Profile modal — tıklayınca açılır */}
      {profilePlayer && (
        <PlayerProfileModal
          player={profilePlayer}
          teamColor={myTeam?.primaryColor ?? "#1a3a2a"}
          onClose={() => setProfilePlayer(null)}
        />
      )}
    </div>
  );
}

function PodiumItem({ rank, entry, onClick }: { rank: number; entry: any; onClick?: () => void }) {
  const p = entry?.player, t = entry?.team;
  if (!p || !t) return <div />;
  const bgClass = rank === 1 ? "bg-amber-500/15 border-amber-500/40" :
                  rank === 2 ? "bg-slate-400/15 border-slate-400/40" : "bg-orange-700/15 border-orange-700/40";
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  return (
    <button
      onClick={onClick}
      className={cn("tm-tap rounded-lg p-2 border text-center w-full hover:scale-105 transition-transform", bgClass)}
    >
      <div className="text-xl mb-1">{medal}</div>
      <PlayerAvatar initials={p.specificPosition} color={t.primaryColor} size={36} />
      <div className="text-[10px] font-bold mt-1 truncate">{p.lastName}</div>
      <div className="text-[9px] text-muted-foreground truncate">{t.shortName}</div>
      <div className="text-sm font-bold text-foreground tabular-nums mt-0.5">{p.goals}⚽</div>
    </button>
  );
}
