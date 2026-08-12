"use client";

import { useState, useEffect, useMemo } from "react";
import { Trophy, Crown, Medal, Users, Globe } from "lucide-react";
import { useAppStore, useMyTeam } from "@/lib/store";
import { generateClubsForLeague, LEAGUE_NAMES, type LeagueTier, type Department, type Team } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import { TeamDetailModal } from "../team-detail-modal";

type LeaderboardEntry = {
  rank: number;
  managerName: string;
  teamName: string;
  teamShort: string;
  teamColor: string;
  points: number;
  seasonNumber: number;
  leagueTier: number;
  isMe?: boolean;
  isBot?: boolean;
};

const TIER_DEPTS: Record<LeagueTier, number> = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 4 }; // v2.9.82: tier 5 (Amatör) 4 departman

/**
 * Liderlik Tablosu — global + lokal sıralama.
 *
 * v2.9.27 G3: Global sekme artık TAMAMLANDI — tüm liglerin (4 tier × N departman)
 * bot takımlarını overall rating bazlı sıralar. Kullanıcının takımı da dahil.
 * Puan = takım OVR × 10 + bütçe(M) + sezon bonusu
 */
export function LeaderboardScreen() {
  // v2.9.74 FIX Y11: Selektorsuz useAppStore() re-render fırtınası yaratıyordu.
  // Her state değişiminde (tactics, transfer, news, matchday) re-render olurdu.
  // Ayrı selector'lara bölündü.
  const clubs = useAppStore((s) => s.clubs);
  const myTeamId = useAppStore((s) => s.myTeamId);
  const managerName = useAppStore((s) => s.managerName);
  const seasonNumber = useAppStore((s) => s.seasonNumber);
  const myTeam = useMyTeam();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"local" | "global">("local");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // v2.9.27 G3: Global modda tüm liglerin bot takımlarını üret
  const globalClubs = useMemo(() => {
    if (tab !== "global") return [];
    const result: any[] = [];
    for (let t = 1; t <= 4; t++) {
      const deptCount = TIER_DEPTS[t as LeagueTier];
      for (let d = 1; d <= deptCount; d++) {
        const generated = generateClubsForLeague(t as LeagueTier, d as Department);
        result.push(...generated);
      }
    }
    // Kullanıcının kendi takımını ekle (bot takımla aynı isim varsa değiştir)
    if (myTeam) {
      result.push({ ...myTeam, isMe: true });
    }
    return result;
  }, [tab, myTeam]);

  useEffect(() => {
    if (tab === "local") {
      // Lokal liderlik — kullanıcının ligindeki 18 takım
      if (!clubs.length) return;
      const myTeam = clubs.find(c => c.id === myTeamId);
      if (!myTeam) return;
      const localEntries: LeaderboardEntry[] = clubs.map((c, i) => {
        const avgOvr = Math.round(c.players.reduce((s, p) => s + p.rating, 0) / c.players.length);
        const points = avgOvr * 10 + Math.round(c.budget / 1_000_000) + (c.id === myTeamId ? seasonNumber * 50 : 0);
        return {
          rank: 0,
          managerName: c.id === myTeamId ? (managerName || "Sen") : `Bot ${i + 1}`,
          teamName: c.name,
          teamShort: c.shortName,
          teamColor: c.primaryColor,
          points,
          seasonNumber,
          leagueTier: c.leagueTier ?? 2,
          isMe: c.id === myTeamId,
          isBot: c.id !== myTeamId,
        };
      });
      localEntries.sort((a, b) => b.points - a.points);
      localEntries.forEach((e, i) => e.rank = i + 1);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntries(localEntries.slice(0, 50));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
    } else {
      // v2.9.27 G3: Global — tüm liglerin bot takımları + kullanıcının takımı
      setLoading(true);
      setTimeout(() => {
        const globalEntries: LeaderboardEntry[] = globalClubs.map((c: any, i: number) => {
          const avgOvr = Math.round(c.players.reduce((s: number, p: any) => s + p.rating, 0) / c.players.length);
          const points = avgOvr * 10 + Math.round((c.budget ?? 200_000_000) / 1_000_000) + (c.isMe ? seasonNumber * 50 : 0);
          return {
            rank: 0,
            managerName: c.isMe ? (managerName || "Sen") : `Bot ${i + 1}`,
            teamName: c.name,
            teamShort: c.shortName,
            teamColor: c.primaryColor,
            points,
            seasonNumber,
            leagueTier: c.leagueTier ?? 2,
            isMe: c.isMe ?? false,
            isBot: !c.isMe,
          };
        });
        globalEntries.sort((a, b) => b.points - a.points);
        globalEntries.forEach((e, i) => e.rank = i + 1);
        // Top 50 göster
        setEntries(globalEntries.slice(0, 50));
        // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      }, 400);
    }
  }, [tab, clubs, myTeamId, managerName, seasonNumber, globalClubs]);

  // Kullanıcının global sıralamadaki yeri (top 50 dışındaysa göster)
  const myGlobalRank = useMemo(() => {
    if (tab !== "global") return null;
    const allEntries: LeaderboardEntry[] = globalClubs.map((c: any, i: number) => {
      const avgOvr = Math.round(c.players.reduce((s: number, p: any) => s + p.rating, 0) / c.players.length);
      const points = avgOvr * 10 + Math.round((c.budget ?? 200_000_000) / 1_000_000) + (c.isMe ? seasonNumber * 50 : 0);
      return { rank: 0, managerName: c.isMe ? "Sen" : `Bot ${i + 1}`, teamName: c.name, teamShort: c.shortName, teamColor: c.primaryColor, points, seasonNumber, leagueTier: c.leagueTier ?? 2, isMe: c.isMe ?? false };
    });
    allEntries.sort((a, b) => b.points - a.points);
    const myIdx = allEntries.findIndex(e => e.isMe);
    return myIdx >= 0 ? myIdx + 1 : null;
  }, [tab, globalClubs, seasonNumber]);

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
      {/* Header */}
      <div className="tm-card p-3 bg-gradient-to-br from-amber-900/20 to-yellow-900/10 border-amber-500/30">
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={18} className="text-amber-400" />
          <h1 className="text-base font-bold">Liderlik Tablosu</h1>
        </div>
        {/* v2.9.145 m2 FIX: text-[10px] → text-[11px]; tm-name-2line ile taşarsa 2 satıra iner */}
        <p className="text-[11px] text-muted-foreground tm-name-2line leading-relaxed">
          {tab === "global"
            ? "🌍 Tüm liglerin takım gücü sıralaması — puan = OVR × 10 + bütçe(M)"
            : "Menajerlerin sıralaması — puan = takım OVR × 10 + bütçe(M) + sezon bonusu"}
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1.5">
        <button
          onClick={() => { haptic("light"); setTab("local"); }}
          className={cn(
            "tm-tap flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
            tab === "local" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          )}
        >
          <Users size={14} />
          Ligim
        </button>
        <button
          onClick={() => { haptic("light"); setTab("global"); }}
          className={cn(
            "tm-tap flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors",
            tab === "global" ? "bg-sky-600 text-white" : "bg-card border border-border text-muted-foreground"
          )}
        >
          <Globe size={14} />
          Global
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="tm-card p-8 text-center text-xs text-muted-foreground">
          Yükleniyor...
        </div>
      )}

      {/* Podium — ilk 3 */}
      {!loading && entries.length >= 3 && (
        <div className="flex items-end justify-center gap-2 mb-2">
          {/* 2nd */}
          <PodiumCard entry={entries[1]} place={2} onClick={() => {
            const t = clubs.find((c) => c.name === entries[1].teamName);
            if (t) { haptic("light"); setSelectedTeam(t); }
          }} />
          {/* 1st */}
          <PodiumCard entry={entries[0]} place={1} onClick={() => {
            const t = clubs.find((c) => c.name === entries[0].teamName);
            if (t) { haptic("light"); setSelectedTeam(t); }
          }} />
          {/* 3rd */}
          <PodiumCard entry={entries[2]} place={3} onClick={() => {
            const t = clubs.find((c) => c.name === entries[2].teamName);
            if (t) { haptic("light"); setSelectedTeam(t); }
          }} />
        </div>
      )}

      {/* List */}
      {!loading && entries.length > 0 && (
        <div className="tm-card divide-y divide-border">
          {entries.slice(3).map((entry) => {
            // v2.9.67: Takım bul — isme tıklayınca TeamDetailModal aç
            const teamData = clubs.find((c) => c.name === entry.teamName) ?? null;
            return (
            <button
              key={`${entry.managerName}-${entry.rank}-${entry.teamName}`}
              onClick={() => {
                if (teamData) { haptic("light"); setSelectedTeam(teamData); }
              }}
              className={cn(
                "tm-tap w-full flex items-center gap-2 p-2.5 text-left transition-colors",
                entry.isMe && "bg-primary/10 border-l-4 border-primary",
                teamData && "hover:bg-accent/30"
              )}
            >
              <div className="w-7 text-center text-xs font-bold tabular-nums text-muted-foreground">
                {entry.rank}
              </div>
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: entry.teamColor }}
              >
                {entry.teamShort.slice(0, 3)}
              </div>
              <div className="flex-1 min-w-0">
                {/* v2.9.145 m2 FIX: truncate → tm-name-2line */}
                <div className="text-xs font-semibold tm-name-2line flex items-center gap-1">
                  {entry.managerName}
                  {entry.isMe && <span className="text-primary shrink-0">(Sen)</span>}
                  {entry.isBot && !entry.isMe && (
                    <span className="text-[9px] text-muted-foreground px-1 rounded bg-muted shrink-0">T{entry.leagueTier}</span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground tm-name-2line">{entry.teamName}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold tabular-nums">{entry.points.toLocaleString("tr-TR")}</div>
                <div className="text-[9px] text-muted-foreground">puan</div>
              </div>
            </button>
            );
          })}
        </div>
      )}

      {/* v2.9.27 G3: Global modda kullanıcının sırası (top 50 dışındaysa) */}
      {!loading && tab === "global" && myGlobalRank && myGlobalRank > 50 && myTeam && (
        <div className="tm-card p-3 border-primary/30 bg-primary/5">
          <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5">
            Senin Sıran (Global #{myGlobalRank})
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: myTeam.primaryColor }}
            >
              {myTeam.shortName.slice(0, 3)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{myTeam.name}</div>
              <div className="text-[10px] text-muted-foreground">
                {LEAGUE_NAMES[(myTeam.leagueTier ?? 2) as LeagueTier]?.tr ?? "Lig"} · T{myTeam.leagueTier ?? 2}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && entries.length === 0 && (
        <div className="tm-card p-8 text-center space-y-2">
          <Crown size={32} className="text-muted-foreground mx-auto mb-2" />
          <div className="text-sm font-bold text-muted-foreground">
            Henüz sıralama yok.
          </div>
        </div>
      )}

      {/* v2.9.27 G3: Global modda bilgi notu */}
      {!loading && tab === "global" && entries.length > 0 && (
        <div className="text-[10px] text-muted-foreground text-center px-4 leading-relaxed">
          💡 Global sıralama tüm liglerin (Süper Lig, 1. Lig, 2. Lig, 3. Lig) takımlarını OVR bazlı sıralar.
          Bot takımlar T1-T4 rozetiyle gösterilir.
        </div>
      )}
      {/* v2.9.67: Takım detay modal'ı — isme tıklayınca açılır */}
      {selectedTeam && myTeam && (
        <TeamDetailModal
          team={selectedTeam}
          isMyTeam={selectedTeam.id === myTeam.id}
          onClose={() => setSelectedTeam(null)}
          onMessage={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
}

function PodiumCard({ entry, place, onClick }: { entry: LeaderboardEntry; place: number; onClick?: () => void }) {
  const heights = { 1: "h-28", 2: "h-20", 3: "h-16" };
  const colors = {
    1: "bg-amber-500/20 border-amber-400",
    2: "bg-slate-400/20 border-slate-300",
    3: "bg-orange-700/20 border-orange-600",
  };
  const icons = { 1: Crown, 2: Medal, 3: Medal };
  const Icon = icons[place];

  return (
    <div className={cn("flex-1 flex flex-col items-center", place === 1 ? "order-2" : place === 2 ? "order-1" : "order-3")}>
      <button
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          "rounded-lg border-2 p-2 w-full flex flex-col items-center gap-1 tm-tap transition-colors",
          colors[place], heights[place],
          onClick && "hover:bg-accent/30 cursor-pointer"
        )}
      >
        <Icon size={place === 1 ? 20 : 16} className={cn(place === 1 ? "text-amber-400" : "text-slate-400")} />
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-[9px] font-bold text-white"
          style={{ background: entry.teamColor }}
        >
          {entry.teamShort.slice(0, 3)}
        </div>
        <div className="text-[10px] font-bold truncate w-full text-center">{entry.managerName}</div>
        <div className="text-xs font-bold tabular-nums">{entry.points.toLocaleString("tr-TR")}</div>
      </button>
    </div>
  );
}
