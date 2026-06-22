"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applySub,
  applyTacticChange,
  createMatchState,
  tick,
  type MatchEvent,
  type MatchState,
  type MatchTactics,
  type Player,
  type Side,
  type Team,
} from "@/lib/match/engine";

const TICK_MS = 800;

const DEFAULT_HOME_TACTICS: MatchTactics = {
  formation: "4-4-2",
  pressing: 60,
  defensiveLine: 50,
  tempo: 60,
  width: 60,
};
const DEFAULT_AWAY_TACTICS: MatchTactics = {
  formation: "4-4-2",
  pressing: 55,
  defensiveLine: 55,
  tempo: 55,
  width: 55,
};

/**
 * Match engine hook — 800ms = 1 oyun dakikası.
 *
 * Tasarım: engine context'i bir ref'te tutulur (mutasyon performansı),
 * her tick sonunda state'in shallow copy'sini React state'ine atarak
 * yeniden render tetiklenir.
 */
export function useMatchEngine(home: Team, away: Team, locale: "tr" | "en") {
  // Initial state'leri eager oluştur (ref initializer değil)
  const ctxRef = useRef({
    state: createMatchState(home, away),
    home,
    away,
    tactics: {
      home: { ...DEFAULT_HOME_TACTICS },
      away: { ...DEFAULT_AWAY_TACTICS },
    },
    locale,
  });

  // React state — sync edilen snapshot'lar
  const [snapshot, setSnapshot] = useState<MatchState>(() =>
    createMatchState(home, away)
  );
  const [tactics, setTactics] = useState({
    home: { ...DEFAULT_HOME_TACTICS },
    away: { ...DEFAULT_AWAY_TACTICS },
  });
  const [replayEvents, setReplayEvents] = useState<MatchEvent[]>([]);
  const [replayIdx, setReplayIdx] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);

  const sync = useCallback(() => {
    setSnapshot({ ...ctxRef.current.state });
    setTactics({
      home: { ...ctxRef.current.tactics.home },
      away: { ...ctxRef.current.tactics.away },
    });
  }, []);

  const start = useCallback(() => {
    if (ctxRef.current.state.status === "finished") return;
    ctxRef.current.state.status = "live";
    if (!ctxRef.current.state.startedAt) {
      ctxRef.current.state.startedAt = Date.now();
    }
    sync();
  }, [sync]);

  const pause = useCallback(() => {
    if (ctxRef.current.state.status !== "live") return;
    ctxRef.current.state.status = "paused";
    sync();
  }, [sync]);

  const reset = useCallback(() => {
    ctxRef.current.state = createMatchState(home, away);
    ctxRef.current.tactics = {
      home: { ...DEFAULT_HOME_TACTICS },
      away: { ...DEFAULT_AWAY_TACTICS },
    };
    setReplayEvents([]);
    setReplayIdx(0);
    setIsReplaying(false);
    sync();
  }, [home, away, sync]);

  // Tick interval
  useEffect(() => {
    if (snapshot.status !== "live") return;
    const id = setInterval(() => {
      const newEvents = tick(ctxRef.current);
      if (newEvents.length > 0) {
        ctxRef.current.state.events = [
          ...newEvents.reverse(),
          ...ctxRef.current.state.events,
        ];
      }
      sync();
      if (ctxRef.current.state.status === "finished") {
        clearInterval(id);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [snapshot.status, sync]);

  const applyTactics = useCallback(
    (side: Side, newTactics: MatchTactics) => {
      const ev = applyTacticChange(ctxRef.current, side, newTactics);
      ctxRef.current.state.events = [ev, ...ctxRef.current.state.events];
      sync();
    },
    [sync]
  );

  const makeSub = useCallback(
    (side: Side, outPlayer: Player, inPlayer: Player): boolean => {
      const ev = applySub(ctxRef.current, side, outPlayer, inPlayer);
      if (!ev) return false;
      ctxRef.current.state.events = [ev, ...ctxRef.current.state.events];
      sync();
      return true;
    },
    [sync]
  );

  const startReplay = useCallback(() => {
    if (ctxRef.current.state.events.length === 0) return;
    setReplayEvents([...ctxRef.current.state.events].reverse());
    setReplayIdx(0);
    setIsReplaying(true);
  }, []);

  useEffect(() => {
    if (!isReplaying) return;
    if (replayIdx >= replayEvents.length) {
      // Replay bitti — setTimeout ile state'i temizle (cascading render önlemi)
      const stopId = setTimeout(() => {
        setIsReplaying(false);
        setReplayIdx(0);
      }, TICK_MS / 3);
      return () => clearTimeout(stopId);
    }
    const id = setTimeout(() => {
      setReplayIdx((i) => i + 1);
    }, TICK_MS / 3);
    return () => clearTimeout(id);
  }, [isReplaying, replayIdx, replayEvents.length]);

  const stopReplay = useCallback(() => {
    setIsReplaying(false);
    setReplayIdx(0);
  }, []);

  return {
    state: snapshot,
    home,
    away,
    tactics,
    start,
    pause,
    reset,
    applyTactics,
    makeSub,
    replay: {
      active: isReplaying,
      events: replayEvents.slice(0, replayIdx),
      start: startReplay,
      stop: stopReplay,
      progress: replayEvents.length > 0 ? replayIdx / replayEvents.length : 0,
    },
  };
}
