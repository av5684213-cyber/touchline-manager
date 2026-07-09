/**
 * Haftalık ekonomi hesaplama — TEK KAYNAK
 *
 * Bu fonksiyon store.advanceMatchday, finance.tsx ve weekly-report.tsx
 * tarafından ortak kullanılır. Farklı hesaplama tutarsızlığını giderir.
 *
 * Gelirler:
 *  - Bilet geliri: capacity × fill_rate × ticket_price × stadium_mult
 *  - Sponsor geliri: base_sponsor × media_mult
 *  - TV geliri: tier_base × analysis_mult
 *  - VIP geliri: vip_level × 50_000 × 7 (haftalık)
 *  - Store geliri: store_level × 20_000 × 7 (haftalık)
 *  - Merch geliri: attendance × 5
 *
 * Giderler:
 *  - Toplam maaş: sum(player.weeklyWage)
 *  - Stadyum bakım: capacity × 50 (haftalık)
 *  - Tesis bakım: sum(level × 5_000)
 */

import type { Team, Player } from "@/lib/mock/data";
import { getStadiumCapacity, getStadiumFillRate } from "@/lib/stadiumMatrix";

export type FacilityLevels = {
  stadium: number;
  pitch: number;
  academy: number;
  gym: number;
  medical: number;
  analysis: number;
  lighting: number;
  scoreboards: number;
  vip: number;
  store: number;
};

export type WeeklyEconomyResult = {
  // Gelirler
  ticketRevenue: number;
  sponsorRevenue: number;
  tvRevenue: number;
  vipRevenue: number;
  storeRevenue: number;
  merchRevenue: number;
  totalRevenue: number;
  // Giderler
  wageBill: number;
  stadiumMaintenance: number;
  facilityMaintenance: number;
  totalExpenses: number;
  // Net
  net: number;
  // Detaylar (UI için)
  attendance: number;
  fillRate: number;
  capacity: number;
};

/**
 * Haftalık ekonomi hesapla — tüm uygulama bunu kullanır
 */
export function computeWeeklyEconomy(
  team: Team,
  facilityLevels: FacilityLevels,
  ticketPrice: number = 60,
  seasonNumber: number = 1
): WeeklyEconomyResult {
  const capacity = getStadiumCapacity(facilityLevels.stadium);
  const fillRate = getStadiumFillRate(facilityLevels.stadium, team.leagueTier ?? 2);

  // Stadyum doluluk çarpanı — yüksek level stadyum daha fazla gelir
  const stadiumMult = 1 + facilityLevels.stadium * 0.05;

  // Bilet geliri (haftalık 1 maç varsayımı)
  const attendance = Math.floor(capacity * fillRate);
  const ticketRevenue = Math.round(attendance * ticketPrice * stadiumMult);

  // Sponsor geliri — base × media çarpanı
  const baseSponsor = 200_000 + (team.leagueTier ? (5 - team.leagueTier) * 100_000 : 0);
  const mediaMult = 1 + facilityLevels.analysis * 0.03;
  const sponsorRevenue = Math.round(baseSponsor * mediaMult);

  // TV geliri — tier baz × analysis çarpanı
  const tvBase = (team.leagueTier === 1 ? 500_000 : team.leagueTier === 2 ? 200_000 : team.leagueTier === 3 ? 50_000 : 10_000);
  const tvRevenue = Math.round(tvBase * mediaMult);

  // VIP geliri (haftalık)
  const vipRevenue = facilityLevels.vip * 50_000 * 7;

  // Store geliri (haftalık)
  const storeRevenue = facilityLevels.store * 20_000 * 7;

  // Merch geliri — attendance × 5
  const merchRevenue = Math.round(attendance * 5);

  const totalRevenue = ticketRevenue + sponsorRevenue + tvRevenue + vipRevenue + storeRevenue + merchRevenue;

  // Maaş gideri
  const wageBill = (team.players ?? []).reduce((sum: number, p: Player) => sum + (p.weeklyWage ?? p.salary ?? 0), 0);

  // Stadyum bakım (haftalık)
  const stadiumMaintenance = Math.round(capacity * 50);

  // Tesis bakım — her level için 5K
  const facilityMaintenance = (
    facilityLevels.stadium + facilityLevels.pitch + facilityLevels.academy +
    facilityLevels.gym + facilityLevels.medical + facilityLevels.analysis +
    facilityLevels.lighting + facilityLevels.scoreboards + facilityLevels.vip + facilityLevels.store
  ) * 5_000;

  const totalExpenses = wageBill + stadiumMaintenance + facilityMaintenance;

  return {
    ticketRevenue,
    sponsorRevenue,
    tvRevenue,
    vipRevenue,
    storeRevenue,
    merchRevenue,
    totalRevenue,
    wageBill,
    stadiumMaintenance,
    facilityMaintenance,
    totalExpenses,
    net: totalRevenue - totalExpenses,
    attendance,
    fillRate,
    capacity,
  };
}
