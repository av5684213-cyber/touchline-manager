"use client";

import { useState, useEffect } from "react";
import { Trophy, Crown, Medal, Users } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

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
};

/**
 * Liderlik Tablosu — global + lokal sıralama.
 * Supabase'ten tüm kullanıcıların sezon sonu puanlarını çeker.
 * Supabase yoksa lokal (bot) sıralama gösterir.
 */
export function LeaderboardScreen() {
  const { clubs, myTeamId, managerName, seasonNumber } = useAppStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"global" | "local">("local");

  useEffect(() => {
    // Lokal liderlik — bot takımlarla kullanıcının ligi
    if (tab === "local") {
      if (!clubs.length) return;
      const myTeam = clubs.find(c => c.id === myTeamId);
      if (!myTeam) return;
      // Puan hesapla — basit: takım OVR + sezon numarası + bütçe
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
        };
      });
      localEntries.sort((a, b) => b.points - a.points);
      localEntries.forEach((e, i) => e.rank = i + 1);
      setEntries(localEntries.slice(0, 50));
      setLoading(false);
    } else {
      // P0 FIX BUG #13: Global sekme — sahte veri yerine "Yakında" göster
      // Gerçek Supabase leaderboard tablosu hazır olana kadar global sekme devre dışı
      setLoading(true);
      setTimeout(() => {
        setEntries([]);
        setLoading(false);
      }, 300);
    }
  }, [tab, clubs, myTeamId, managerName, seasonNumber]);

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
      {/* Header */}
      <div className="tm-card p-3 bg-gradient-to-br from-amber-900/20 to-yellow-900/10 border-amber-500/30">
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={18} className="text-amber-400" />
          <h1 className="text-base font-bold">Liderlik Tablosu</h1>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Menajerlerin sıralaması — puan = takım OVR × 10 + bütçe(M) + sezon bonusu
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
            tab === "global" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
          )}
        >
          <Crown size={14} />
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
          <PodiumCard entry={entries[1]} place={2} />
          {/* 1st */}
          <PodiumCard entry={entries[0]} place={1} />
          {/* 3rd */}
          <PodiumCard entry={entries[2]} place={3} />
        </div>
      )}

      {/* List */}
      {!loading && entries.length > 0 && (
        <div className="tm-card divide-y divide-border">
          {entries.slice(3).map((entry) => (
            <div
              key={`${entry.managerName}-${entry.rank}`}
              className={cn(
                "flex items-center gap-2 p-2.5",
                entry.isMe && "bg-primary/10 border-l-4 border-primary"
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
                <div className="text-xs font-semibold truncate">
                  {entry.managerName}
                  {entry.isMe && <span className="text-primary ml-1">(Sen)</span>}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{entry.teamName}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold tabular-nums">{entry.points.toLocaleString("tr-TR")}</div>
                <div className="text-[9px] text-muted-foreground">puan</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && entries.length === 0 && (
        <div className="tm-card p-8 text-center space-y-2">
          <Crown size={32} className="text-muted-foreground mx-auto mb-2" />
          <div className="text-sm font-bold text-muted-foreground">
            {tab === "global" ? "Global Sıralama Yakında" : "Henüz sıralama yok."}
          </div>
          {tab === "global" && (
            <div className="text-[11px] text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
              Gerçek oyuncularla global sıralama sistemi yakında gelecek. Şimdilik kendi ligini sıralamasını takip edebilirsin.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PodiumCard({ entry, place }: { entry: LeaderboardEntry; place: number }) {
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
      <div className={cn("rounded-lg border-2 p-2 w-full flex flex-col items-center gap-1", colors[place], heights[place])}>
        <Icon size={place === 1 ? 20 : 16} className={cn(place === 1 ? "text-amber-400" : "text-slate-400")} />
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-[9px] font-bold text-white"
          style={{ background: entry.teamColor }}
        >
          {entry.teamShort.slice(0, 3)}
        </div>
        <div className="text-[10px] font-bold truncate w-full text-center">{entry.managerName}</div>
        <div className="text-xs font-bold tabular-nums">{entry.points.toLocaleString("tr-TR")}</div>
      </div>
    </div>
  );
}
