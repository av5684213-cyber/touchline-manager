/**
 * Match engine barrel export — uygulamanın geri kalanı bu dosyayı import eder.
 *
 * simulateEnhancedMatch: ana simülasyon fonksiyonu (pure, sync)
 * - Home/away squads (Player[])
 * - Home/away tactics (ActiveTactic)
 * - Options (weather, referee, atmosphere, vb.)
 * - Returns: events array + player ratings + man of the match
 *
 * Eski useMatchEngine hook'u bu motoru çağırır.
 */

export {
  simulateEnhancedMatch,
  runUnifiedMatch,
  matchEngine,
} from "./enhancedMatchEngine";

export type {
  EnhancedMatchResult,
  MatchEvent as EnhancedMatchEvent,
  PlayerMatchRating,
  SimulationOptions,
  UnifiedMatchOptions,
} from "./enhancedMatchEngine";

export type { Player as MatchEnginePlayer, ActiveTactic, MatchResult, GameTactics } from "./types";
export { REFEREE_PERSONALITIES } from "./referee";
export type { RefereePersonality } from "./referee";
