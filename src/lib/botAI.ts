/**
 * ════════════════════════════════════════════════════════════════════════════
 * BotAI — v2.9.18 Bot Zeka Sistemi
 * ════════════════════════════════════════════════════════════════════════════
 * Bot takımlar için akıllı davranışlar:
 * 1. Pozisyon uygunluğu ile ilk 11 seçimi
 * 2. Formasyon çeşitliliği (her bot farklı oynar)
 * 3. Transfer zekası (ihtiyaç pozisyonuna göre alım)
 * 4. Maç simülasyonu (formasyon modifier + taktik)
 */

import type { Player, Team } from "@/lib/mock/data";
import { FORMATIONS, FORMATION_KEYS } from "@/lib/mock/data";
import { isPlayerAvailableAt } from "@/lib/player-availability";
import { FORMATION_MODS } from "@/lib/match/engine/constants";
import { FORMATION_SLOTS } from "@/lib/tactics/types";

// ─── 1. Pozisyon uygunluğu ile ilk 11 seçimi ──────────────────────────────

function getGroup(pos: string): "GK" | "DEF" | "MID" | "FWD" {
  if (pos === "GK") return "GK";
  if (["CB", "LB", "RB", "LWB", "RWB"].includes(pos)) return "DEF";
  if (["CDM", "CM", "CAM", "LM", "RM"].includes(pos)) return "MID";
  return "FWD";
}

/**
 * Pozisyon uygunluğu ile akıllı ilk 11 seçimi.
 * Bot vs bot maçları için kullanılır.
 */
export function pickBotXI(players: Player[], formation: string, matchday: number): Player[] {
  const slots = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-4-2"];
  const used = new Set<string>();
  const lineup: Player[] = [];

  for (const slotPos of slots) {
    // 1. Tam pozisyon eşleşmesi + uygun oyuncu
    let candidate = players
      .filter((p) => !used.has(p.id) && p.specificPosition === slotPos && isPlayerAvailableAt(p, matchday))
      .sort((a, b) => b.rating - a.rating)[0];

    // 2. Aynı gruptan al
    if (!candidate) {
      const group = getGroup(slotPos);
      candidate = players
        .filter((p) => !used.has(p.id) && getGroup(p.specificPosition) === group && isPlayerAvailableAt(p, matchday))
        .sort((a, b) => b.rating - a.rating)[0];
    }

    // 3. Herhangi bir uygun oyuncu
    if (!candidate) {
      candidate = players
        .filter((p) => !used.has(p.id) && isPlayerAvailableAt(p, matchday))
        .sort((a, b) => b.rating - a.rating)[0];
    }

    // 4. Son çare: sakat bile olsa
    if (!candidate) {
      if (slotPos === "GK") {
        candidate = players.filter((p) => !used.has(p.id) && p.specificPosition === "GK").sort((a, b) => b.rating - a.rating)[0] ?? null;
      } else {
        candidate = players.filter((p) => !used.has(p.id) && p.specificPosition !== "GK").sort((a, b) => b.rating - a.rating)[0] ?? null;
      }
    }

    if (candidate) {
      used.add(candidate.id);
      lineup.push(candidate);
    }
  }
  return lineup;
}

// ─── 2. Formasyon çeşitliliği ──────────────────────────────────────────────

/**
 * Her bot takım için sabit (deterministic) formasyon ata.
 * Team ID'ye göre hash → formasyon seç.
 * Böylece her hafta farklı formasyon değil, tutarlı bir stil olur.
 */
const BOT_FORMATIONS: Record<string, string> = {};

export function getBotFormation(teamId: string): string {
  if (BOT_FORMATIONS[teamId]) return BOT_FORMATIONS[teamId];

  // Team ID'yi hash'e çevir → formasyon seç
  let hash = 0;
  for (let i = 0; i < teamId.length; i++) {
    hash = ((hash << 5) - hash) + teamId.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % FORMATION_KEYS.length;
  const formation = FORMATION_KEYS[idx];
  BOT_FORMATIONS[teamId] = formation;
  return formation;
}

/**
 * Bot takımın taktik profilini döndür.
 * Lig tier'ına ve takım gücüne göre ofansif/defansif eğilim.
 */
export function getBotTacticProfile(team: Team): {
  formation: string;
  mentality: number; // 1-5
  pressing: boolean;
  passingStyle: "Karışık" | "Kısa" | "Uzun" | "Direkt";
} {
  const formation = getBotFormation(team.id);
  const avgOvr = team.players.reduce((s, p) => s + p.rating, 0) / team.players.length;

  // Güçlü takım (70+ OVR) → ofansif, zayıf takım (<63) → defansif
  let mentality = 3;
  if (avgOvr >= 72) mentality = 4;
  else if (avgOvr >= 68) mentality = 3;
  else if (avgOvr < 60) mentality = 1;
  else if (avgOvr < 64) mentality = 2;

  // Pressing: güçlü takımlar basar, zayıflar oturur
  const pressing = avgOvr >= 66 && Math.random() < 0.4;

  // Pas stili: rastgele ama tutarlı
  let hash = 0;
  for (let i = 0; i < team.id.length; i++) hash = ((hash << 5) - hash) + team.id.charCodeAt(i);
  const styles: Array<"Karışık" | "Kısa" | "Uzun" | "Direkt"> = ["Karışık", "Kısa", "Uzun", "Direkt"];
  const passingStyle = styles[Math.abs(hash) % 4];

  return { formation, mentality, pressing, passingStyle };
}

// ─── 3. Transfer zekası ───────────────────────────────────────────────────

/**
 * Bot takımın en zayıf pozisyonunu bul.
 * Her pozisyon grubundan en iyi oyuncunun OVR'ını karşılaştır.
 */
export function findWeakestPosition(team: Team): "GK" | "DEF" | "MID" | "FWD" {
  const groups: Record<string, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of team.players) {
    const g = getGroup(p.specificPosition);
    groups[g].push(p);
  }

  const bestByGroup: Record<string, number> = {};
  for (const [g, players] of Object.entries(groups)) {
    if (players.length === 0) {
      bestByGroup[g] = 0; // hiç yok → en zayıf
    } else {
      bestByGroup[g] = Math.max(...players.map(p => p.rating));
    }
  }

  // En düşük en iyi oyuncuya sahip grup → en zayıf pozisyon
  let weakest = "GK";
  let weakestRating = 100;
  for (const [g, rating] of Object.entries(bestByGroup)) {
    if (rating < weakestRating) {
      weakestRating = rating;
      weakest = g;
    }
  }
  return weakest as "GK" | "DEF" | "MID" | "FWD";
}

/**
 * Bot transfer kararı: oyuncu almalı mı?
 * - Kadro < 23 ise al
 * - En zayıf pozisyon grubunda < 3 oyuncu varsa al
 * - Bütçe yeterliyse al
 */
export function shouldBotBuy(
  team: Team,
  askingPrice: number,
  playerPos: string
): boolean {
  if (team.budget < askingPrice) return false;
  if (team.players.length >= 25) return false;

  const playerGroup = getGroup(playerPos);

  // Kaleci sayısı kontrolü
  const gkCount = team.players.filter(p => p.specificPosition === "GK").length;
  if (playerGroup === "GK" && gkCount >= 3) return false;

  // Pozisyon grubunda kaç oyuncu var?
  const groupCount = team.players.filter(p => getGroup(p.specificPosition) === playerGroup).length;
  if (groupCount < 3) return true; // açık pozisyon

  // Yedek havuzu yeterli mi? (her grup en az 4 oyuncu)
  if (groupCount < 4 && askingPrice < team.budget * 0.3) return true;

  return false;
}

/**
 * Bot satış kararı: oyuncu satmalı mı?
 * - 22+ oyuncu varsa ve en zayıf oyuncu 60 OVR altındaysa sat
 */
export function shouldBotSell(team: Team, player: Player): boolean {
  if (team.players.length <= 18) return false; // çok az oyuncu
  if (player.rating < 58 && team.players.length > 20) return true;
  if (player.rating < 62 && team.players.length > 23) return true;
  return false;
}

// ─── 4. Akıllı bot vs bot maç simülasyonu ──────────────────────────────────

/**
 * Akıllı bot vs bot simülasyonu.
 * Pozisyon filtreli XI + formasyon modifier + taktik çeşitliliği.
 */
export function simulateBotMatch(
  homeTeam: Team,
  awayTeam: Team,
  matchday: number
): { homeScore: number; awayScore: number } {
  const homeProfile = getBotTacticProfile(homeTeam);
  const awayProfile = getBotTacticProfile(awayTeam);

  const homeXI = pickBotXI(homeTeam.players, homeProfile.formation, matchday);
  const awayXI = pickBotXI(awayTeam.players, awayProfile.formation, matchday);

  if (homeXI.length === 0 || awayXI.length === 0) {
    return { homeScore: 0, awayScore: 0 };
  }

  // Takım gücü hesapla (formasyon modifier ile)
  const homeStr = calculateBotStrength(homeXI, homeProfile);
  const awayStr = calculateBotStrength(awayXI, awayProfile);

  // Maç sonucu hesapla
  const diff = homeStr - awayStr;
  const homeAdv = diff > 5 ? 0.35 : diff > 2 ? 0.2 : diff < -5 ? -0.35 : diff < -2 ? -0.2 : 0;

  // Taktik etkisi: ofansif takım daha çok gol atar ama daha çok yiyebilir
  const homeAttackBias = homeProfile.mentality >= 4 ? 0.15 : homeProfile.mentality <= 2 ? -0.1 : 0;
  const awayAttackBias = awayProfile.mentality >= 4 ? 0.15 : awayProfile.mentality <= 2 ? -0.1 : 0;

  let hs = Math.max(0, Math.round(Math.random() * 3 + homeAdv * 2 + homeAttackBias));
  let as = Math.max(0, Math.round(Math.random() * 3 - homeAdv * 2 + awayAttackBias));

  // Pressing takım kontrollü oynar — az gol yer
  if (homeProfile.pressing) as = Math.max(0, as - 1);
  if (awayProfile.pressing) hs = Math.max(0, hs - 1);

  // Çok yüksek skorları önle
  hs = Math.min(hs, 5);
  as = Math.min(as, 5);

  return { homeScore: hs, awayScore: as };
}

/**
 * Bot takım gücü hesapla — formasyon modifier + taktik ile.
 */
function calculateBotStrength(
  xi: Player[],
  profile: { formation: string; mentality: number; pressing: boolean }
): number {
  const avgOvr = xi.reduce((s, p) => s + p.rating, 0) / xi.length;
  const fmod = FORMATION_MODS[profile.formation] ?? { attack: 1, midfield: 1, defense: 1 };

  // Formasyon gücü: ortalama modifier
  const formationBoost = (fmod.attack + fmod.midfield + fmod.defense) / 3;

  // Mentalite: ofansif → +güç ama savunma riski
  const mentalityBoost = profile.mentality >= 4 ? 1.03 : profile.mentality <= 2 ? 0.97 : 1.0;

  // Pressing: +güç ama kondisyon tüketir (botlarda kondisyon yok, sadece güç)
  const pressingBoost = profile.pressing ? 1.02 : 1.0;

  return avgOvr * formationBoost * mentalityBoost * pressingBoost;
}
