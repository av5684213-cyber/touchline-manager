/**
 * Arketip Atama Script'i
 * 
 * Mevcut oyuncuların pozisyon ve rating'ine göre arketip atar.
 * Pozisyon → uygun arketipler havuzundan rating'e göre seçim.
 * 
 * Kullanım: npx tsx scripts/assign-archetypes.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://bhnhmdlyabuachyjwxwe.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Pozisyona göre uygun arketipler
const ARCHETYPES_BY_POSITION: Record<string, string[]> = {
  GK: ["Refleks Canavarı", "Güvenli Eller", "Süpürücü Kaleci", "Penaltı Uzmanı"],
  CB: ["Duvar", "Lider Stoper", "Top Çıkan Stoper", "Hava Hakimi"],
  LB: ["Kanat Beki", "Hücumcu Bek", "Defansif Bek", "Ters Bek"],
  RB: ["Kanat Beki", "Hücumcu Bek", "Defansif Bek", "Ters Bek"],
  LWB: ["Kanat Beki", "Hücumcu Bek", "Ters Bek"],
  RWB: ["Kanat Beki", "Hücumcu Bek", "Ters Bek"],
  CDM: ["Yıkıcı", "Regista", "Duvar Orta Saha"],
  CM: ["Motor", "Truva Atı", "Pas Ustası", "Box-to-Box", "Tempo Kontrolcüsü"],
  CAM: ["Playmaker", "Numara 10", "Yaratıcı", "Oyun Kurucu"],
  LM: ["Hızlı Kanat", "İçeri Dönen", "Dripling Ustası"],
  RM: ["Hızlı Kanat", "İçeri Dönen", "Dripling Ustası"],
  LW: ["Hızlı Kanat", "İçeri Dönen", "Dripling Ustası"],
  RW: ["Hızlı Kanat", "İçeri Dönen", "Dripling Ustası"],
  ST: ["Gol Makinesi", "Bitirici", "Hedef Adam", "Fırsatçı", "Hızlı Forvet"],
  CF: ["İkinci Forvet", "Yaratıcı Forvet", "Hedef Adam"],
};

function pickArchetype(pos: string, rating: number): string {
  const pool = ARCHETYPES_BY_POSITION[pos] ?? ["Dengeli"];
  // Yüksek rating = daha seçkin arketip
  if (rating >= 75 && pool.length >= 2) return pool[Math.floor(Math.random() * 2)];
  return pool[Math.floor(Math.random() * pool.length)];
}

// Oyuncu istatistiklerini pozisyon + arketip bazlı düzenle
function adjustStatsForArchetype(player: any, archetype: string) {
  const pos = player.specific_position;
  const baseRating = player.rating;

  // Arketip bazlı stat vurguları
  const updates: any = {};

  // Kaleci arketipleri
  if (archetype === "Refleks Canavarı") {
    updates.goalkeeping = Math.min(99, baseRating + 5);
    updates.agility = Math.min(99, baseRating + 5);
  } else if (archetype === "Güvenli Eller") {
    updates.goalkeeping = Math.min(99, baseRating + 3);
    updates.concentration = Math.min(99, baseRating + 4);
  } else if (archetype === "Süpürücü Kaleci") {
    updates.goalkeeping = Math.min(99, baseRating + 2);
    updates.speed = Math.min(80, baseRating - 5);
    updates.positioning = Math.min(99, baseRating + 5);
  } else if (archetype === "Penaltı Uzmanı") {
    updates.goalkeeping = Math.min(99, baseRating + 2);
    updates.composure = Math.min(99, baseRating + 5);
  }
  // Defans arketipleri
  else if (archetype === "Duvar") {
    updates.defending = Math.min(99, baseRating + 4);
    updates.strength = Math.min(99, baseRating + 5);
    updates.tackling = Math.min(99, baseRating + 4);
  } else if (archetype === "Lider Stoper") {
    updates.defending = Math.min(99, baseRating + 3);
    updates.leadership = Math.min(99, baseRating + 6);
    updates.positioning = Math.min(99, baseRating + 4);
  } else if (archetype === "Top Çıkan Stoper") {
    updates.defending = Math.min(99, baseRating + 2);
    updates.passing = Math.min(99, baseRating + 5);
    updates.technique = Math.min(99, baseRating + 4);
  } else if (archetype === "Hava Hakimi") {
    updates.heading = Math.min(99, baseRating + 6);
    updates.jumping = Math.min(99, baseRating + 6);
    updates.strength = Math.min(99, baseRating + 3);
  } else if (archetype === "Kanat Beki") {
    updates.crossing = Math.min(99, baseRating + 5);
    updates.stamina = Math.min(99, baseRating + 4);
    updates.speed = Math.min(99, baseRating + 3);
  } else if (archetype === "Hücumcu Bek") {
    updates.crossing = Math.min(99, baseRating + 4);
    updates.dribbling = Math.min(99, baseRating + 3);
    updates.speed = Math.min(99, baseRating + 4);
  } else if (archetype === "Defansif Bek") {
    updates.defending = Math.min(99, baseRating + 4);
    updates.tackling = Math.min(99, baseRating + 4);
    updates.positioning = Math.min(99, baseRating + 3);
  } else if (archetype === "Ters Bek") {
    updates.dribbling = Math.min(99, baseRating + 5);
    updates.crossing = Math.min(99, baseRating + 4);
    updates.speed = Math.min(99, baseRating + 5);
  }
  // Orta saha arketipleri
  else if (archetype === "Yıkıcı") {
    updates.tackling = Math.min(99, baseRating + 5);
    updates.aggression = Math.min(99, baseRating + 6);
    updates.stamina = Math.min(99, baseRating + 4);
  } else if (archetype === "Regista") {
    updates.passing = Math.min(99, baseRating + 6);
    updates.vision = Math.min(99, baseRating + 5);
    updates.technique = Math.min(99, baseRating + 4);
  } else if (archetype === "Duvar Orta Saha") {
    updates.defending = Math.min(99, baseRating + 4);
    updates.stamina = Math.min(99, baseRating + 5);
    updates.tackling = Math.min(99, baseRating + 3);
  } else if (archetype === "Motor") {
    updates.stamina = Math.min(99, baseRating + 6);
    updates.work_rate = Math.min(99, baseRating + 6);
    updates.passing = Math.min(99, baseRating + 2);
  } else if (archetype === "Truva Atı") {
    updates.strength = Math.min(99, baseRating + 5);
    updates.tackling = Math.min(99, baseRating + 4);
    updates.aggression = Math.min(99, baseRating + 4);
  } else if (archetype === "Pas Ustası") {
    updates.passing = Math.min(99, baseRating + 6);
    updates.technique = Math.min(99, baseRating + 5);
    updates.vision = Math.min(99, baseRating + 4);
  } else if (archetype === "Box-to-Box") {
    updates.stamina = Math.min(99, baseRating + 5);
    updates.passing = Math.min(99, baseRating + 3);
    updates.defending = Math.min(99, baseRating + 2);
    updates.shooting = Math.min(99, baseRating + 2);
  } else if (archetype === "Tempo Kontrolcüsü") {
    updates.passing = Math.min(99, baseRating + 4);
    updates.decisions = Math.min(99, baseRating + 5);
    updates.composure = Math.min(99, baseRating + 4);
  } else if (archetype === "Playmaker" || archetype === "Oyun Kurucu") {
    updates.vision = Math.min(99, baseRating + 6);
    updates.passing = Math.min(99, baseRating + 5);
    updates.technique = Math.min(99, baseRating + 4);
  } else if (archetype === "Numara 10" || archetype === "Yaratıcı") {
    updates.vision = Math.min(99, baseRating + 5);
    updates.flair = Math.min(99, baseRating + 6);
    updates.dribbling = Math.min(99, baseRating + 4);
  }
  // Kanat arketipleri
  else if (archetype === "Hızlı Kanat") {
    updates.speed = Math.min(99, baseRating + 6);
    updates.acceleration = Math.min(99, baseRating + 6);
    updates.dribbling = Math.min(99, baseRating + 3);
  } else if (archetype === "İçeri Dönen") {
    updates.dribbling = Math.min(99, baseRating + 5);
    updates.finishing = Math.min(99, baseRating + 4);
    updates.technique = Math.min(99, baseRating + 3);
  } else if (archetype === "Dripling Ustası") {
    updates.dribbling = Math.min(99, baseRating + 7);
    updates.technique = Math.min(99, baseRating + 5);
    updates.flair = Math.min(99, baseRating + 4);
  }
  // Forvet arketipleri
  else if (archetype === "Gol Makinesi") {
    updates.finishing = Math.min(99, baseRating + 6);
    updates.composure = Math.min(99, baseRating + 4);
    updates.positioning = Math.min(99, baseRating + 4);
  } else if (archetype === "Bitirici") {
    updates.finishing = Math.min(99, baseRating + 5);
    updates.shooting = Math.min(99, baseRating + 5);
    updates.long_shots = Math.min(99, baseRating + 3);
  } else if (archetype === "Hedef Adam") {
    updates.heading = Math.min(99, baseRating + 6);
    updates.strength = Math.min(99, baseRating + 5);
    updates.first_touch = Math.min(99, baseRating + 3);
  } else if (archetype === "Fırsatçı") {
    updates.positioning = Math.min(99, baseRating + 6);
    updates.finishing = Math.min(99, baseRating + 4);
    updates.anticipation = Math.min(99, baseRating + 5);
  } else if (archetype === "Hızlı Forvet") {
    updates.speed = Math.min(99, baseRating + 6);
    updates.acceleration = Math.min(99, baseRating + 6);
    updates.finishing = Math.min(99, baseRating + 3);
  } else if (archetype === "İkinci Forvet") {
    updates.vision = Math.min(99, baseRating + 4);
    updates.passing = Math.min(99, baseRating + 4);
    updates.dribbling = Math.min(99, baseRating + 3);
    updates.finishing = Math.min(99, baseRating + 2);
  } else if (archetype === "Yaratıcı Forvet") {
    updates.flair = Math.min(99, baseRating + 5);
    updates.vision = Math.min(99, baseRating + 4);
    updates.dribbling = Math.min(99, baseRating + 4);
  }

  return updates;
}

async function main() {
  console.log("🎯 Arketip atama başlıyor...\n");

  // Tüm oyuncuları getir (sayfalı)
  let allPlayers: any[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("players")
      .select("id, specific_position, rating, archetype")
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("❌ Oyuncu getirme hatası:", error.message);
      return;
    }
    if (!data || data.length === 0) break;

    allPlayers.push(...data);
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  console.log(`✅ ${allPlayers.length} oyuncu bulundu`);

  // Her oyuncuya arketip atayıp stats'larını güncelle
  // Paralel batch update — 50'lik gruplar halinde eş zamanlı
  const BATCH_SIZE = 50;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < allPlayers.length; i += BATCH_SIZE) {
    const batch = allPlayers.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (p) => {
      const archetype = pickArchetype(p.specific_position, p.rating);
      const statUpdates = adjustStatsForArchetype(p, archetype);
      const { error } = await supabase
        .from("players")
        .update({ archetype, ...statUpdates })
        .eq("id", p.id);
      return error ? 0 : 1;
    });

    const results = await Promise.all(promises);
    const success = results.reduce((s, r) => s + r, 0);
    updated += success;
    failed += (BATCH_SIZE - success);

    if ((i + BATCH_SIZE) % 500 === 0) {
      console.log(`  📊 ${updated}/${allPlayers.length} oyuncu güncellendi (${failed} hata)`);
    }
  }

  console.log(`\n🎉 BİTTİ! ${updated} oyuncu güncellendi, ${failed} hata`);
  console.log(`\n📋 Örnek arketip dağılımı:`);

  // Örnek kontrol
  const { data: samples } = await supabase
    .from("players")
    .select("first_name, last_name, specific_position, rating, archetype")
    .limit(5);
  for (const s of samples ?? []) {
    console.log(`  ${s.first_name} ${s.last_name} (${s.specific_position}, ${s.rating}) → ${s.archetype}`);
  }
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
