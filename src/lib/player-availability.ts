/**
 * BULGU #1 DÜZELTME (v2.9.3): Oyuncu uygunluk kontrolü — matchday parametreli saf fonksiyon.
 *
 * Bu modül store.ts'e bağımlı DEĞİL — circular dependency yok.
 * store.ts kendi içindeki isPlayerAvailable (useAppStore.getState() kullanır)
 * ile uyumlu çalışır. Bu export versiyonu, matchday parametresi verilen yerlerde
 * kullanılır (mock/season.ts, pre-match-screen.tsx, match.tsx).
 *
 * "Oynayabilir" mantığı:
 * - Sakat DEĞİL (is_injured !== true)
 * - Cezalı DEĞİL: suspended_until YOK veya suspended_until <= matchday
 */
import type { Player } from "./mock/data";

/**
 * Oyuncu müsait mi? Sakat veya cezalı ise false.
 *
 * @param p — Player objesi
 * @param matchday — Mevcut sezon maç günü. Zorunlu — çağıran yer store'dan alır.
 *                   store.ts içindeki isPlayerAvailable (matchday opsiyonel) ile
 *                   uyumlu — bu export versiyonu explicit matchday ister.
 */
export function isPlayerAvailableAt(p: Player, matchday: number): boolean {
  if (p.is_injured) return false;
  if (!p.suspended_until) return true;
  return Number(p.suspended_until) <= matchday;
}
