"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase"; // v2.9.72: tek client (eski: @/lib/supabase/client)

/**
 * Realtime hook — Supabase Realtime ile standings + fixtures
 * değişikliklerini canlı dinler ve store'u günceller.
 *
 * Kullanım: App shell'in içinde bir kez çağır.
 */
export function useRealtimeSync() {
  // v2.9.70 FIX: Reaktif myTeamId — mount anında null ise, login sonrası değişince yeniden çalış
  const myTeamId = useAppStore((s) => s.myTeamId);
  const clubs = useAppStore((s) => s.clubs);

  useEffect(() => {
    if (!myTeamId) return;

    const myTeam = clubs.find((c) => c.id === myTeamId);
    if (!myTeam?.department) return;

    const deptId = myTeam.department;

    // Standings değişikliğini dinle
    const standingsChannel = supabase
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
    const fixturesChannel = supabase
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
      supabase.removeChannel(standingsChannel);
      supabase.removeChannel(fixturesChannel);
    };
  }, [myTeamId, clubs]); // v2.9.70: deps eklendi — login sonrası yeniden çalış
}

async function reloadStandings(deptId: number) {
  try {
    const { data } = await supabase
      .from("standings")
      .select("*")
      .eq("department_id", deptId)
      .order("points", { ascending: false });

    if (data) {
      // Store'da standings gösterimi client-side, Supabase'den gelen güncel
      // Broadcast event ile sayfa yenilenmesini tetikle
      window.dispatchEvent(new CustomEvent("standings-updated", { detail: data }));
    }
  } catch (e) {
    // v2.9.73: Eski kod sessizce hata yutuyordu — log eklendi
    console.warn("[realtime-sync] reloadStandings error:", e);
  }
}

async function reloadFixtures(deptId: number) {
  try {
    const store = useAppStore.getState();
    const myTeamId = store.myTeamId;
    if (!myTeamId) return;

    const { data } = await supabase
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
        // v2.9.72: FixtureRow requires date; DB'de kickoff/match_date kolonu
        // yoksa boş string fallback (sadece oynanmamış maçlar için sıralama)
        date: f.match_date ?? f.kickoff ?? f.date ?? "",
        played: f.status === "finished",
      }));

      useAppStore.setState({ fixtures: fixtureRows });
    }
  } catch (e) {
    // v2.9.73: Eski kod sessizce hata yutuyordu — log eklendi
    console.warn("[realtime-sync] reloadFixtures error:", e);
  }
}
