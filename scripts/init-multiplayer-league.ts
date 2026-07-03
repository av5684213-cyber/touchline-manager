/**
 * Multiplayer League Initializer
 * 
 * 4 Lig × 3 Departman × 18 Takım = 216 takım
 * Her takıma 23 oyuncu (3 GK, 7 DEF, 8 MID, 5 FWD)
 * Round-robin fikstür (34 hafta, çift devreli)
 * 
 * Supabase REST API ile bulk insert yapar.
 * 
 * Kullanım:
 *   npx tsx scripts/init-multiplayer-league.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://bhnhmdlyabuachyjwxwe.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// 18 kurgusal takım ismi
const FICTIONAL_CLUB_NAMES = [
  { name: "Yeşilvadispor", short: "YVS", c1: "#1a3a2a", c2: "#f5f5f0" },
  { name: "Yıldıztepespor", short: "YTP", c1: "#1f2937", c2: "#fbbf24" },
  { name: "Maviderespor", short: "MDR", c1: "#1e3a8a", c2: "#ffffff" },
  { name: "Defnespor", short: "DEF", c1: "#7c2d12", c2: "#fef3c7" },
  { name: "Çamlıkspor", short: "CLK", c1: "#065f46", c2: "#d1fae5" },
  { name: "Pınarbaşıspor", short: "PNB", c1: "#0e7490", c2: "#cffafe" },
  { name: "Hisarspor", short: "HIS", c1: "#4c1d95", c2: "#ede9fe" },
  { name: "Toroslarspor", short: "TRS", c1: "#92400e", c2: "#fff7ed" },
  { name: "Yeditepespor", short: "YTP", c1: "#14532d", c2: "#bbf7d0" },
  { name: "Çınarspor", short: "CNR", c1: "#7f1d1d", c2: "#fee2e2" },
  { name: "Halispor", short: "HAL", c1: "#0c4a6e", c2: "#e0f2fe" },
  { name: "Şehzadespor", short: "SHZ", c1: "#581c87", c2: "#f3e8ff" },
  { name: "Boğazspor", short: "BGZ", c1: "#134e4a", c2: "#ccfbf1" },
  { name: "Efespor", short: "EFS", c1: "#854d0e", c2: "#fef9c3" },
  { name: "Zaferpınarspor", short: "ZFP", c1: "#9f1239", c2: "#ffe4e6" },
  { name: "Berrakspor", short: "BRK", c1: "#155e75", c2: "#ecfeff" },
  { name: "Kaynarspor", short: "KYN", c1: "#9a3412", c2: "#fff7ed" },
  { name: "Anadolu Yıldızları", short: "ANY", c1: "#1a3a2a", c2: "#fbbf24" },
];

// Türkçe isim havuzları
const FIRST_NAMES_TR = [
  "Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "Hasan", "İbrahim", "Murat",
  "Emre", "Burak", "Okan", "Cem", "Caner", "Selçuk", "Volkan", "Serkan",
  "Kerem", "Deniz", "Eren", "Yusuf", "Ozan", "Berkay", "Emir", "Barış",
  "Onur", "Tolga", "Uğur", "Fatih", "Adem", "Cengiz", "Görkem", "Kağan",
  "Sinan", "Tahir", "Yiğit", "Berke", "Doğukan", "Hamza", "Kaan", "Mert",
  "Ömer", "Sefa", "Taha", "Umut", "Yunus", "Batu", "Efe", "Ekin",
  "Furkan", "Kerim", "Onur", "Polat", "Rıza", "Sami", "Tarık", "Yavuz",
  "Alper", "Asım", "Bedir", "Cavit", "Doruk", "Egemen", "Fikret", "Gaffar",
];

const LAST_NAMES_TR = [
  "Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Yıldırım", "Öztürk",
  "Aydın", "Özdemir", "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin", "Kara",
  "Koç", "Kurt", "Özkan", "Şimşek", "Polat", "Korkmaz", "Çakır", "Erdoğan",
  "Güneş", "Aksoy", "Bulut", "Turan", "Aktaş", "Kaplan", "Avcı", "Demirci",
  "Şen", "Aydemir", "Tan", "Taş", "Erdem", "Akın", "Köse", "Toprak",
  "Acar", "Bilgin", "Karaca", "Öz", "Yalçın", "Çoban", "Akdoğan", "Erol",
  "Yavuz", "Tunç", "Bal", "Keskin", "Uçar", "Soylu", "Tekin", "Güler",
  "Yüksel", "Sezer", "Saygın", "Çınar", "Yağmur", "Ateş", "Bayram", "Karaman",
];

const POSITIONS_BY_GROUP = {
  GK: ["GK", "GK", "GK"],
  DEF: ["CB", "CB", "CB", "LB", "RB", "LWB", "RWB"],
  MID: ["CDM", "CM", "CM", "CAM", "LM", "RM", "LW", "RW"],
  FWD: ["ST", "CF", "ST", "LW", "RW"],
};

const FOOT_OPTIONS = ["Right", "Left", "Right", "Right", "Right"]; // çoğunluk sağak

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStats(pos: string, baseRating: number) {
  // Tüm stat'ler base rating etrafında ±15 oynar
  const spread = (n: number, lo = 5, hi = 18) =>
    Math.max(28, Math.min(99, n + randomInt(-hi, -lo)));
  const boost = (n: number, lo = 3, hi = 15) =>
    Math.max(30, Math.min(99, n + randomInt(lo, hi)));

  const isGK = pos === "GK";
  const isDEF = ["CB", "LB", "RB", "LWB", "RWB"].includes(pos);
  const isMID = ["CDM", "CM", "CAM", "LM", "RM", "LW", "RW"].includes(pos);
  const isFWD = ["ST", "CF"].includes(pos);

  return {
    defending: isGK ? 30 : isDEF ? boost(baseRating) : spread(baseRating),
    passing: isGK ? spread(baseRating) : boost(baseRating, 0, 12),
    shooting: isGK ? 25 : isFWD ? boost(baseRating) : spread(baseRating),
    speed: isGK ? 30 : isFWD ? boost(baseRating, 5, 18) : spread(baseRating),
    power: isGK ? 40 : spread(baseRating, 0, 15),
    vision: isMID ? boost(baseRating) : spread(baseRating),
    control: isMID ? boost(baseRating) : spread(baseRating),
    stamina: boost(baseRating, 5, 15),
    heading: isGK ? 30 : isDEF || isFWD ? boost(baseRating) : spread(baseRating),
    goalkeeping: isGK ? boost(baseRating, 10, 20) : 25,

    finishing: isGK ? 20 : isFWD ? boost(baseRating, 10, 20) : spread(baseRating),
    dribbling: isGK ? 20 : isMID || isFWD ? boost(baseRating) : spread(baseRating),
    first_touch: isGK ? 30 : boost(baseRating, 0, 10),
    crossing: isGK ? 20 : ["LB", "RB", "LWB", "RWB", "LM", "RM", "LW", "RW"].includes(pos) ? boost(baseRating) : spread(baseRating),
    marking: isGK ? 20 : isDEF ? boost(baseRating) : spread(baseRating),
    tackling: isGK ? 20 : isDEF ? boost(baseRating, 5, 15) : spread(baseRating),
    technique: isGK ? 30 : boost(baseRating, 0, 10),
    long_shots: isGK ? 20 : isMID ? boost(baseRating) : spread(baseRating),
    off_the_ball: isGK ? 25 : boost(baseRating),

    aggression: spread(baseRating, 0, 18),
    bravery: spread(baseRating, 0, 15),
    work_rate: spread(baseRating, 0, 12),
    decisions: spread(baseRating, 0, 10),
    determination: spread(baseRating, 0, 12),
    concentration: spread(baseRating, 0, 10),
    leadership: spread(baseRating, 5, 20),
    anticipation: spread(baseRating, 0, 10),
    flair: isMID || isFWD ? boost(baseRating) : spread(baseRating),
    positioning: isGK ? boost(baseRating, 10, 20) : spread(baseRating, 0, 8),
    composure: spread(baseRating, 0, 8),
    teamwork: spread(baseRating, 0, 8),

    agility: isGK ? boost(baseRating) : spread(baseRating),
    balance: spread(baseRating, 0, 12),
    strength: isGK ? 40 : spread(baseRating, 0, 15),
    acceleration: isGK ? 30 : boost(baseRating, 5, 18),
    jumping: isGK ? boost(baseRating) : spread(baseRating, 0, 12),
    left_foot: 50 + randomInt(0, 30),
    right_foot: 50 + randomInt(0, 30),

    cond: 100,
    form: 70 + randomInt(-5, 5),
    morale: 70,
    confidence: 70,
    chemistry: 70,
  };
}

function generatePlayer(teamId: string, pos: string, ratingRange: { min: number; max: number }) {
  const ovr = randomInt(ratingRange.min, ratingRange.max);
  const isForeign = Math.random() < 0.15;
  const first = pick(FIRST_NAMES_TR);
  const last = pick(LAST_NAMES_TR);
  const age = randomInt(17, 36);
  const stats = generateStats(pos, ovr);
  const marketValue = Math.floor((ovr - 40) ** 3 * 10000) + randomInt(0, 500000);

  return {
    team_id: teamId,
    first_name: first,
    last_name: last,
    name: `${first} ${last}`,
    position: pos === "GK" ? "GK" : ["CB","LB","RB","LWB","RWB"].includes(pos) ? "DEF" : ["CDM","CM","CAM","LM","RM","LW","RW"].includes(pos) ? "MID" : "FWD",
    specific_position: pos,
    age,
    potential: ovr + randomInt(0, 10),
    hidden_potential: ovr + randomInt(0, 10),
    rating: ovr,
    nationality: "TR",
    nation: "Türkiye",
    preferred_foot: pick(FOOT_OPTIONS),
    height: randomInt(170, 195),
    weight: randomInt(65, 90),
    market_value: marketValue,
    salary: Math.floor(marketValue / 200),

    goals: 0,
    assists: 0,
    saves: pos === "GK" ? randomInt(10, 50) : 0,
    appearances: 0,

    ...stats,
  };
}

function generateSquad(teamId: string, leagueTier: number) {
  const players: any[] = [];
  // Rating dağılımı lige göre
  const ratingMin = leagueTier === 1 ? 65 : leagueTier === 2 ? 55 : leagueTier === 3 ? 48 : 40;
  const ratingMax = leagueTier === 1 ? 88 : leagueTier === 2 ? 78 : leagueTier === 3 ? 68 : 60;

  for (const pos of POSITIONS_BY_GROUP.GK) {
    players.push(generatePlayer(teamId, pos, { min: ratingMin, max: ratingMax - 5 }));
  }
  for (const pos of POSITIONS_BY_GROUP.DEF) {
    players.push(generatePlayer(teamId, pos, { min: ratingMin, max: ratingMax }));
  }
  for (const pos of POSITIONS_BY_GROUP.MID) {
    players.push(generatePlayer(teamId, pos, { min: ratingMin, max: ratingMax }));
  }
  for (const pos of POSITIONS_BY_GROUP.FWD) {
    players.push(generatePlayer(teamId, pos, { min: ratingMin, max: ratingMax }));
  }
  return players; // 23 oyuncu
}

// Round-robin fikstür üret — 18 takım, 34 hafta, çift devreli
function generateFixtures(teamIds: string[], departmentId: number, seasonId: string) {
  const n = teamIds.length; // 18
  const fixtures: any[] = [];

  // Round-robin algoritması (circle method)
  const teams = [...teamIds];
  if (n % 2 !== 0) teams.push("BYE"); // 18 çift olduğu gerek yok

  const rounds = n - 1; // 17 round (ilk yarı)
  const half = teams.length / 2;

  let arr = [...teams];

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[arr.length - 1 - i];
      if (home !== "BYE" && away !== "BYE") {
        // Tek devre
        fixtures.push({
          season_id: seasonId,
          home_team_id: home,
          away_team_id: away,
          matchday: round + 1,
          status: "scheduled",
        });
      }
    }
    // Rotate (ilk eleman sabit, diğerleri döner)
    arr = [arr[0], arr[arr.length - 1], ...arr.slice(1, arr.length - 1)];
  }

  // İkinci yarı — deplasman değişimi
  const firstHalf = [...fixtures];
  for (const fx of firstHalf) {
    fixtures.push({
      season_id: seasonId,
      home_team_id: fx.away_team_id,
      away_team_id: fx.home_team_id,
      matchday: fx.matchday + rounds,
      status: "scheduled",
    });
  }

  return fixtures; // 17*9*2 = 306 maç
}

async function main() {
  console.log("🚀 Multiplayer Lig Başlatılıyor...\n");

  // 1. Departmanları getir
  const { data: departments, error: deptErr } = await supabase
    .from("departments")
    .select("id, league_id, department_number, name_tr, leagues(tier)")
    .order("league_id, department_number");

  if (deptErr) {
    console.error("❌ Departmanlar alınamadı:", deptErr.message);
    return;
  }
  console.log(`✅ ${departments.length} departman bulundu`);

  // 2. Mevcut teams + players + fixtures temizle
  console.log("\n🧹 Eski veriler temizleniyor...");
  await supabase.from("standings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("match_results").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("fixtures").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("players").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("teams").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("✅ Temizlik tamam");

  // 3. Sezon oluştur (veya getir) — mevcut seasons tablosuna uydur
  const { data: existingSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("status", "active")
    .maybeSingle();

  let seasonId: string | undefined = existingSeason?.id;
  if (!seasonId) {
    const { data: season, error: seasonErr } = await supabase
      .from("seasons")
      .insert({ season_number: 1, year: "2026", league_tier: "1_lig", current_matchday: 1, total_matchdays: 34, status: "active" })
      .select()
      .single();
    seasonId = season?.id;
    if (seasonErr) {
      console.error("❌ Sezon oluşturulamadı:", seasonErr.message);
      return;
    }
  }
  console.log(`✅ Sezon: ${seasonId}`);

  // 4. Her departman için 18 takım + 23 oyuncu oluştur
  let totalTeams = 0;
  let totalPlayers = 0;
  let totalFixtures = 0;

  for (const dept of departments) {
    const tier = (dept.leagues as any).tier;
    const teamIds: string[] = [];

    // 18 takım oluştur
    const teamsToInsert = FICTIONAL_CLUB_NAMES.map((c) => ({
      name: c.name,
      short_name: c.short,
      primary_color: c.c1,
      secondary_color: c.c2,
      league_tier: tier === 1 ? "super_lig" : tier === 2 ? "1_lig" : tier === 3 ? "2_lig" : "3_lig",
      department_id: dept.id,
      budget: 200000000, // 200M €
      stadium_capacity: randomInt(5000, 30000),
      stadium_name: `${c.name} Stadyumu`,
      is_bot: true,
      is_user_team: false,
    }));

    const { data: createdTeams, error: teamErr } = await supabase
      .from("teams")
      .insert(teamsToInsert)
      .select("id, name");

    if (teamErr) {
      console.error(`❌ Departman ${dept.name_tr} takım hatası:`, teamErr.message);
      continue;
    }

    teamIds.push(...createdTeams.map((t: any) => t.id));
    totalTeams += createdTeams.length;
    console.log(`  📋 ${dept.name_tr}: ${createdTeams.length} takım oluşturuldu`);

    // Her takım için 23 oyuncu
    for (const team of createdTeams) {
      const squad = generateSquad(team.id, tier);
      const { error: playerErr } = await supabase
        .from("players")
        .insert(squad);
      if (playerErr) {
        console.error(`    ❌ ${team.name} oyuncu hatası:`, playerErr.message);
      } else {
        totalPlayers += squad.length;
      }
    }

    // Standings başlat
    const standingsToInsert = createdTeams.map((t: any) => {
      const meta = FICTIONAL_CLUB_NAMES.find((c) => c.name === t.name)!;
      return {
        department_id: dept.id,
        team_id: t.id,
        team_name: t.name,
        short_name: meta.short,
        primary_color: meta.c1,
        played: 0, won: 0, drawn: 0, lost: 0,
        goals_for: 0, goals_against: 0, points: 0,
        is_user_team: false,
      };
    });
    await supabase.from("standings").insert(standingsToInsert);

    // Fikstür üret
    const fixtures = generateFixtures(teamIds, dept.id, seasonId!);
    const { error: fxErr } = await supabase
      .from("fixtures")
      .insert(fixtures);
    if (fxErr) {
      console.error(`    ❌ ${dept.name_tr} fikstür hatası:`, fxErr.message);
    } else {
      totalFixtures += fixtures.length;
    }
  }

  console.log("\n🎉 BİTTİ!");
  console.log(`  📊 Toplam takım: ${totalTeams}`);
  console.log(`  👥 Toplam oyuncu: ${totalPlayers}`);
  console.log(`  ⚽ Toplam maç (fikstür): ${totalFixtures}`);
  console.log(`\n🔗 Supabase: https://supabase.com/dashboard/project/bhnhmdlyabuachyjwxwe/editor/table/teams`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
