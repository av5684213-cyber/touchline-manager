"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";

/**
 * Realtime hook — Supabase Realtime ile standings + fixtures
 * değişikliklerini canlı dinler ve store'u günceller.
 *
 * Kullanım: App shell'in içinde bir kez çağır.
 */
export function useRealtimeSync() {
  useEffect(() => {
    const store = useAppStore.getState();
    const myTeamId = store.myTeamId;
    if (!myTeamId) return;

    const myTeam = store.clubs.find((c) => c.id === myTeamId);
    if (!myTeam?.department) return;

    const deptId = myTeam.department;

    // Standings değişikliğini dinle
    const standingsChannel = supabase()
      .channel("standings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "standings",
          filter: `department_id=eq.${deptId}`,
        },
        () => {
          // Standings değişti — yeniden yükle
          reloadStandings(deptId);
        }
      )
      .subscribe();

    // Fixtures değişikliğini dinle (maç oynandı)
    const fixturesChannel = supabase()
      .channel("fixtures-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "fixtures",
        },
        (payload: any) => {
          // Bu departmandaki bir maçsa, fixtures'ı yenile
          const fx = payload.new;
          if (fx && fx.status === "finished") {
            reloadFixtures(deptId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase().removeChannel(standingsChannel);
      supabase().removeChannel(fixturesChannel);
    };
  }, []);
}

async function reloadStandings(deptId: number) {
  try {
    const { data } = await supabase()
      .from("standings")
      .select("*")
      .eq("department_id", deptId)
      .order("points", { ascending: false });

    if (data) {
      // Store'da standings gösterimi client-side, Supabase'den gelen güncel
      // Broadcast event ile sayfa yenilenmesini tetikle
      window.dispatchEvent(new CustomEvent("standings-updated", { detail: data }));
    }
  } catch {
    /* no-op */
  }
}

async function reloadFixtures(deptId: number) {
  try {
    const store = useAppStore.getState();
    const myTeamId = store.myTeamId;
    if (!myTeamId) return;

    const { data } = await supabase()
      .from("fixtures")
      .select("*")
      .or(`home_team_id.eq.${myTeamId},away_team_id.eq.${myTeamId}`)
      .order("matchday");

    if (data) {
      const fixtureRows = data.map((f: any) => ({
        id: f.id,
        matchday: f.matchday,
        homeId: f.home_team_id,
        awayId: f.away_team_id,
        homeScore: f.home_score,
        awayScore: f.away_score,
        played: f.status === "finished",
      }));

      useAppStore.setState({ fixtures: fixtureRows });
    }
  } catch {
    /* no-op */
  }
}
