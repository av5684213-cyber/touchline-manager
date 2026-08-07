/**
 * v2.9.96: Simülasyon Scripti — 100 sezonu saniyeler içinde koştur
 *
 * Kullanım: npx tsx scripts/sim-100-seasons.ts
 *
 * Çıktı: Sezon bazında lig şampiyonu, kupa şampiyonu, CL şampiyonu,
 * ortalama bütçe, ortalama OVR, en yüksek oyuncu değeri, toplam trophy sayısı.
 */

import { useAppStore } from "@/lib/store";
import { computeStandings } from "@/lib/mock/season";

interface SeasonResult {
  season: number;
  leagueChampion: string;
  cupChampion: string | undefined;
  clChampion: string | undefined;
  avgBudget: number;
  avgOvr: number;
  maxPlayerValue: number;
  totalTrophies: number;
  userPosition: number;
  userBudget: number;
}

function runSimulation(numSeasons: number = 100): SeasonResult[] {
  useAppStore.getState().loginDemo();
  const results: SeasonResult[] = [];
  const myTeamId = useAppStore.getState().myTeamId!;

  for (let s = 1; s <= numSeasons; s++) {
    // Sezonu oyna
    let lastSn = useAppStore.getState().seasonNumber;
    let weeks = 0;
    while (useAppStore.getState().seasonNumber === lastSn) {
      useAppStore.getState().advanceMatchday();
      weeks++;
      if (weeks > 50) break; // güvenlik
    }

    const state = useAppStore.getState();
    const clubs = state.clubs;
    const myTeam = clubs.find(c => c.id === myTeamId);
    const standings = computeStandings(clubs, state.fixtures);
    const champion = standings[0];

    // İstatistikler
    let totalBudget = 0;
    let totalOvr = 0;
    let playerCount = 0;
    let maxValue = 0;
    for (const club of clubs) {
      totalBudget += club.budget;
      for (const p of club.players) {
        totalOvr += p.rating;
        playerCount++;
        const val = (p as any).marketValue ?? (p as any).market_value ?? 0;
        if (val > maxValue) maxValue = val;
      }
    }

    // Trophy sayısı
    let totalTrophies = 0;
    for (const club of clubs) {
      totalTrophies += (club as any).trophies?.length ?? 0;
    }
    for (const key of Object.keys(state.allLeagues ?? {})) {
      const league = (state.allLeagues as any)[key];
      if (league?.clubs) {
        for (const c of league.clubs) {
          totalTrophies += (c as any).trophies?.length ?? 0;
        }
      }
    }

    results.push({
      season: s,
      leagueChampion: champion?.teamName ?? "—",
      cupChampion: state.cup.champion
        ? clubs.find(c => c.id === state.cup.champion)?.name ?? "—"
        : undefined,
      clChampion: state.championsLeague?.champion
        ? state.championsLeague.participants.find(p => p.teamId === state.championsLeague?.champion)?.teamName ?? "—"
        : undefined,
      avgBudget: Math.round(totalBudget / clubs.length),
      avgOvr: Math.round(totalOvr / Math.max(1, playerCount)),
      maxPlayerValue: maxValue,
      totalTrophies,
      userPosition: standings.findIndex(s => s.teamId === myTeamId) + 1,
      userBudget: myTeam?.budget ?? 0,
    });

    if (s % 10 === 0) {
      console.log(`[sim] ${s}/${numSeasons} sezon tamamlandı...`);
    }
  }

  return results;
}

// Çalıştır
console.log("=== 100 SEZON HIZLI SİMÜLASYON ===\n");
const results = runSimulation(100);

// Özet tablo
console.log("\n=== SEZON BAZINDA SONUÇLAR ===");
console.log("Szn | Şampiyon | Kupa | CL | OrtBütçe | OrtOVR | MaxDeğer | Trophy | UserPos | UserBütçe");
console.log("----|----------|------|----|--------- | -------|----------|--------|---------|----------");

for (const r of results) {
  console.log(
    `${String(r.season).padStart(3)} | ` +
    `${r.leagueChampion.slice(0, 10).padEnd(10)} | ` +
    `${(r.cupChampion ?? "—").slice(0, 6).padEnd(6)} | ` +
    `${(r.clChampion ?? "—").slice(0, 6).padEnd(6)} | ` +
    `${(r.avgBudget / 1_000_000).toFixed(1).padStart(7)}M | ` +
    `${String(r.avgOvr).padStart(5)} | ` +
    `${(r.maxPlayerValue / 1_000_000).toFixed(1).padStart(7)}M | ` +
    `${String(r.totalTrophies).padStart(6)} | ` +
    `${String(r.userPosition).padStart(7)} | ` +
    `${(r.userBudget / 1_000_000).toFixed(1).padStart(7)}M`
  );
}

// Ekonomi analizi
console.log("\n=== EKONOMİ ANALİZİ ===");
const firstAvg = results[0].avgBudget;
const lastAvg = results[results.length - 1].avgBudget;
const growth = ((lastAvg - firstAvg) / firstAvg * 100).toFixed(0);
console.log(`Ortalama bütçe: Sezon 1 = ${(firstAvg / 1_000_000).toFixed(1)}M → Sezon 100 = ${(lastAvg / 1_000_000).toFixed(1)}M (%${growth} büyüme)`);
console.log(`Ortalama OVR: Sezon 1 = ${results[0].avgOvr} → Sezon 100 = ${results[results.length - 1].avgOvr}`);
console.log(`Max oyuncu değeri: Sezon 1 = ${(results[0].maxPlayerValue / 1_000_000).toFixed(1)}M → Sezon 100 = ${(results[results.length - 1].maxPlayerValue / 1_000_000).toFixed(1)}M`);
console.log(`Toplam trophy: Sezon 1 = ${results[0].totalTrophies} → Sezon 100 = ${results[results.length - 1].totalTrophies}`);

// Enflasyon oranı (yıllık)
const inflationRates: number[] = [];
for (let i = 1; i < results.length; i++) {
  const rate = (results[i].avgBudget - results[i - 1].avgBudget) / results[i - 1].avgBudget * 100;
  inflationRates.push(rate);
}
const avgInflation = inflationRates.reduce((s, r) => s + r, 0) / inflationRates.length;
console.log(`\nYıllık ortalama enflasyon: %${avgInflation.toFixed(1)}`);

// Lig şampiyonları dağılımı
const champCounts: Record<string, number> = {};
for (const r of results) {
  champCounts[r.leagueChampion] = (champCounts[r.leagueChampion] ?? 0) + 1;
}
console.log("\n=== LİG ŞAMPİYONU DAĞILIMI ===");
for (const [name, count] of Object.entries(champCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name}: ${count}x`);
}

// Bug tespiti
console.log("\n=== BUG TESPİTİ ===");
let bugs = 0;
for (const r of results) {
  if (r.avgBudget < 0) { console.log(`❌ Sezon ${r.season}: Negatif ortalama bütçe!`); bugs++; }
  if (r.avgOvr > 99 || r.avgOvr < 0) { console.log(`❌ Sezon ${r.season}: OOR ortalama OVR!`); bugs++; }
  if (r.userPosition < 1 || r.userPosition > 18) { console.log(`❌ Sezon ${r.season}: OOR kullanıcı pozisyonu!`); bugs++; }
  if (r.totalTrophies < 0) { console.log(`❌ Sezon ${r.season}: Negatif trophy!`); bugs++; }
}
if (bugs === 0) console.log("✅ Bug bulunamadı");
