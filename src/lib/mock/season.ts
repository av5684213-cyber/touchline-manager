import { FORMATIONS, Team, type Formation, type Player } from "./data";
import { isPlayerAvailableAt } from "@/lib/player-availability";

/**
 * Sezon + fikstür + tablo + bildirim üretimi.
 * Hepsi sahte veri; Supabase bağlanana kadar ön yüz bunu kullanır.
 */

export const SEASON_INFO = {
  year: "2025–26",
  league: "1lig" as const,
  matchday: 1, // P0 FIX: Sezon başından başla — sahte geçmiş üretme
  totalMatchdays: 34,
  startedAt: new Date("2025-08-15T00:00:00+03:00"),
};

/**
 * v2.9.62 FIX: Transfer penceresi — sezonun son 5 haftası hariç açık.
 * Eski kod (v2.9.x): HER ZAMAN true döndürüyordu — UI yanlış bilgi gösteriyordu.
 * Yeni: 1-29. hafta açık, 30-34 kapalı (sezon sonu koruması).
 */
export function isTransferWindowOpen(matchday?: number): boolean {
  const md = matchday ?? SEASON_INFO.matchday;
  // v2.9.62: Son 5 hafta (30-34) transfer kapalı — sezon sonu kuralı
  return md <= 29;
}

export function transferWindowStatus(matchday?: number): { isOpen: boolean; label: string; week: number; totalWeeks: number } {
  const md = matchday ?? SEASON_INFO.matchday;
  const isOpen = md <= 29;
  return {
    isOpen,
    label: isOpen ? "Transfer penceresi açık" : "Transfer penceresi kapalı (son 5 hafta)",
    week: md,
    totalWeeks: SEASON_INFO.totalMatchdays,
  };
}

export type FixtureRow = {
  id: string;
  matchday: number;
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
  date: string; // ISO
  played: boolean;
  // v2.9.57: Maç tekrar izleme (replay) — kayıtlı event'ler
  // Maç oynandığında event'ler burada saklanır, böylece sonradan izlendiğinde
  // aynı spiker yorumları ve olay akışı tekrar üretilebilir (re-simülasyon YOK).
  events?: any[];
  motmId?: string;
  stats?: {
    possession: [number, number];
    shotsOnTarget: [number, number];
    corners: [number, number];
    fouls: [number, number];
  };
};

export type FormResult = "W" | "D" | "L";

export type StandingRow = {
  teamId: string;
  teamName: string;
  shortName: string;
  primaryColor: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goal_diff: number;  // v2.9.21 GÖREV 2: Kanonik alan adı "goal_diff" (gd değil)
  points: number;
  form: FormResult[]; // en yeni son sırada, en fazla 5
};

export type Notification = {
  id: string;
  kind: "injury" | "result" | "transfer" | "training";
  title: { tr: string; en: string };
  body: { tr: string; en: string };
  at: string; // ISO
  read: boolean;
  teamId?: string; // bildirimde geçen takım
  playerId?: string; // bildirimde geçen oyuncu
};

/** Double round-robin (34 matchday) — 18 takım için Barry Whittle algoritması. */
export function generateFixtures(teams: Team[]): FixtureRow[] {
  const ids = teams.map((t) => t.id);
  if (ids.length % 2 !== 0) ids.push("BYE");
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;

  const fixtures: FixtureRow[] = [];
  const arr = [...ids];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home === "BYE" || away === "BYE") continue;
      // İlk yarı: r çift → home away, r tek → away home
      const flip = r % 2 === 1;
      fixtures.push({
        id: `f_${r + 1}_${i}`,
        matchday: r + 1,
        homeId: flip ? away : home,
        awayId: flip ? home : away,
        homeScore: null,
        awayScore: null,
        date: new Date(
          SEASON_INFO.startedAt.getTime() + r * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        played: false,
      });
    }
    // Rotate (first fixed)
    const last = arr.pop()!;
    arr.splice(1, 0, last);
  }

  // İkinci yarı — ev/deplasman ters
  const firstHalf = [...fixtures];
  for (const f of firstHalf) {
    fixtures.push({
      id: f.id + "_r",
      matchday: f.matchday + rounds,
      homeId: f.awayId,
      awayId: f.homeId,
      homeScore: null,
      awayScore: null,
      date: new Date(
        new Date(f.date).getTime() + rounds * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      played: false,
    });
  }

  return fixtures;
}

/** Geçmiş maçları oyna + takım güçlerine göre ağırlıklı skor üret. currentMatchday'e kadar. */
export function playFixturesUpTo(
  fixtures: FixtureRow[],
  currentMatchday: number,
  teams?: Team[]
): FixtureRow[] {
  // P0 FIX: Takım güçleri varsa rating bazlı skor üret, yoksa rastgele (eski davranış)
  const teamMap = teams ? new Map(teams.map(t => [t.id, t])) : null;
  return fixtures.map((f) => {
    if (f.matchday >= currentMatchday || f.played) return f;
    let hs: number, as: number;
    if (teamMap) {
      const home = teamMap.get(f.homeId);
      const away = teamMap.get(f.awayId);
      if (home && away) {
        const homeStr = home.players.slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11;
        const awayStr = away.players.slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11;
        const diff = homeStr - awayStr;
        const homeAdv = diff > 5 ? 0.3 : diff < -5 ? -0.3 : 0;
        hs = Math.max(0, Math.floor(Math.random() * 4 + homeAdv * 2));
        as = Math.max(0, Math.floor(Math.random() * 3 - homeAdv * 2));
      } else {
        hs = Math.floor(Math.random() * 5);
        as = Math.floor(Math.random() * 4);
      }
    } else {
      hs = Math.floor(Math.random() * 5);
      as = Math.floor(Math.random() * 4);
    }
    return { ...f, homeScore: hs, awayScore: as, played: true };
  });
}

export function computeStandings(
  teams: Team[],
  fixtures: FixtureRow[]
): StandingRow[] {
  const map = new Map<string, StandingRow>();
  for (const t of teams) {
    map.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      shortName: t.shortName,
      primaryColor: t.primaryColor,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goal_diff: 0,  // v2.9.21 GÖREV 2: goal_diff başlangıçta 0
      points: 0,
      form: [],
    });
  }

  // Maçları matchday sırasına göre işle, form takibi için
  const sortedFixtures = [...fixtures]
    .filter((f) => f.played && f.homeScore !== null && f.awayScore !== null)
    .sort((a, b) => a.matchday - b.matchday);

  for (const f of sortedFixtures) {
    const h = map.get(f.homeId);
    const a = map.get(f.awayId);
    if (!h || !a) continue;
    h.played++;
    a.played++;
    h.goalsFor += f.homeScore!;
    h.goalsAgainst += f.awayScore!;
    a.goalsFor += f.awayScore!;
    a.goalsAgainst += f.homeScore!;
    if (f.homeScore! > f.awayScore!) {
      h.won++;
      h.points += 3;
      a.lost++;
      h.form.push("W");
      a.form.push("L");
    } else if (f.homeScore! < f.awayScore!) {
      a.won++;
      a.points += 3;
      h.lost++;
      h.form.push("L");
      a.form.push("W");
    } else {
      h.drawn++;
      a.drawn++;
      h.points++;
      a.points++;
      h.form.push("D");
      a.form.push("D");
    }
  }

  // Her takım için son 5 maçı al + goal_diff hesapla
  for (const row of map.values()) {
    row.form = row.form.slice(-5);
    // v2.9.21 GÖREV 2: goal_diff kanonik olarak hesaplanır
    row.goal_diff = row.goalsFor - row.goalsAgainst;
  }

  // v2.9.49: Head-to-head hesaplama — eşit puanda ilk kriter
  // İki takım arasındaki maçların puanı + gol averajı
  const h2hCache = new Map<string, { points: number; gd: number }>();
  function getH2H(teamAId: string, teamBId: string): { points: number; gd: number } {
    const key = teamAId < teamBId ? `${teamAId}_${teamBId}` : `${teamBId}_${teamAId}`;
    if (h2hCache.has(key)) return h2hCache.get(key)!;

    // Bu iki takım arasındaki maçları bul
    const h2hMatches = sortedFixtures.filter(f =>
      (f.homeId === teamAId && f.awayId === teamBId) ||
      (f.homeId === teamBId && f.awayId === teamAId)
    );

    let aPoints = 0;
    let aGd = 0;
    for (const f of h2hMatches) {
      const isAHome = f.homeId === teamAId;
      const aScore = isAHome ? f.homeScore! : f.awayScore!;
      const bScore = isAHome ? f.awayScore! : f.homeScore!;
      aGd += aScore - bScore;
      if (aScore > bScore) aPoints += 3;
      else if (aScore === bScore) aPoints += 1;
    }

    const result = { points: aPoints, gd: aGd };
    h2hCache.set(key, result);
    return result;
  }

  return Array.from(map.values()).sort((a, b) => {
    // v2.9.49: Sıralama kriterleri:
    // 1. Puan
    // 2. Head-to-head puanı (eşit puanda aralarındaki maçlar)
    // 3. Head-to-head gol averajı
    // 4. Genel gol averajı
    // 5. Atılan gol
    // 6. Galibiyet sayısı
    if (b.points !== a.points) return b.points - a.points;

    // Eşit puan → head-to-head
    if (a.points === b.points && a.teamId !== b.teamId) {
      const h2h_a = getH2H(a.teamId, b.teamId);
      if (h2h_a.points !== 0) {
        // teamA'nın head-to-head puanı (pozitif = A önde, negatif = B önde)
        const aH2HPoints = h2h_a.points;
        const bH2HPoints = 0; // getH2H A'nın perspektifinden hesaplar
        // Eğer aPoints > 0 ise A önde, < 0 ise B önde
        // Aslında: toplam h2h puanı = aH2HPoints + bH2HPoints
        // A'nın puanı = aH2HPoints, B'nin puanı = (toplam maç puanı) - aH2HPoints
        // Basit: aH2HPoints > (toplam/2) ise A önde
        const totalH2HPts = h2hMatches_count(a.teamId, b.teamId, sortedFixtures) * 3;
        const bH2H = totalH2HPts - aH2HPoints;
        if (aH2HPoints !== bH2H) return bH2H - aH2HPoints;
        if (h2h_a.gd !== 0) return -h2h_a.gd; // A'nın GD'si pozitifse A önde
      }
    }

    // Genel gol averajı
    if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    if (b.won !== a.won) return b.won - a.won;
    return a.teamName.localeCompare(b.teamName);
  });
}

// v2.9.49: Helper — iki takım arasındaki maç sayısı
function h2hMatches_count(teamAId: string, teamBId: string, fixtures: FixtureRow[]): number {
  return fixtures.filter(f =>
    (f.homeId === teamAId && f.awayId === teamBId) ||
    (f.homeId === teamBId && f.awayId === teamAId)
  ).length;
}

export function myRecentMatches(
  fixtures: FixtureRow[],
  myTeamId: string,
  limit = 4
): FixtureRow[] {
  return fixtures
    .filter(
      (f) => f.played && (f.homeId === myTeamId || f.awayId === myTeamId)
    )
    .sort((a, b) => b.matchday - a.matchday)
    .slice(0, limit);
}

export function myNextMatch(
  fixtures: FixtureRow[],
  myTeamId: string
): FixtureRow | null {
  return (
    fixtures
      .filter(
        (f) => !f.played && (f.homeId === myTeamId || f.awayId === myTeamId)
      )
      .sort((a, b) => a.matchday - b.matchday)[0] ?? null
  );
}

export function myStanding(rows: StandingRow[], myTeamId: string) {
  const idx = rows.findIndex((r) => r.teamId === myTeamId);
  if (idx < 0) return null;
  return { ...rows[idx], position: idx + 1 };
}

/** Sonraki maç için geri sayım hedefi: bugün + 2 gün 18:00 (TR). */
export function nextMatchTarget(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(18, 0, 0, 0);
  return d;
}

/** Bildirim havuzu — statik örnekler. */
export function seedNotifications(clubs: Team[], myTeamId: string): Notification[] {
  // Kullanıcının takımından bir oyuncu bul (sakatlık için)
  const myTeam = clubs.find((c) => c.id === myTeamId);
  const myPlayer = myTeam?.players.find((p) => p.position === "DEF") ?? myTeam?.players[0];
  // Rakip takımlar (kullanıcının takımı hariç)
  const opp1 = clubs.find((c) => c.id !== myTeamId);
  const opp2 = clubs.find((c) => c.id !== myTeamId && c.id !== opp1?.id);
  // Kullanıcının orta saha oyuncusu (transfer teklifi için)
  const myMid = myTeam?.players.find((p) => p.position === "MID");

  return [
    {
      id: "n1",
      kind: "result",
      title: { tr: "Maç Sonucu", en: "Match Result" },
      body: {
        tr: `${opp1?.name ?? "Rakip"} 2-1 ${opp2?.name ?? "Rakip"} — 3 puan aldı!`,
        en: `${opp1?.name ?? "Opp"} 2-1 ${opp2?.name ?? "Opp"} — picked up 3 points!`,
      },
      at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      read: false,
      teamId: opp1?.id,
    },
    {
      id: "n2",
      kind: "injury",
      title: { tr: "Sakatlık", en: "Injury" },
      body: {
        tr: `Defans ${myPlayer?.firstName ?? ""} ${myPlayer?.lastName ?? ""} antrenmanda sol uylukta kasık ağrısı yaşadı (7 gün).`,
        en: `Defender ${myPlayer?.firstName ?? ""} ${myPlayer?.lastName ?? ""} picked up a left groin strain in training (7 days).`,
      },
      at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      read: false,
      playerId: myPlayer?.id,
    },
    {
      id: "n3",
      kind: "transfer",
      title: { tr: "Transfer Teklifi", en: "Transfer Offer" },
      body: {
        tr: `${opp2?.name ?? "Rakip"}, orta saha ${myMid?.firstName ?? ""} ${myMid?.lastName ?? ""} için €450K teklif verdi.`,
        en: `${opp2?.name ?? "Opp"} bid €450K for midfielder ${myMid?.firstName ?? ""} ${myMid?.lastName ?? ""}.`,
      },
      at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
      read: true,
      teamId: opp2?.id,
      playerId: myMid?.id,
    },
    {
      id: "n4",
      kind: "training",
      title: { tr: "Antrenman Raporu", en: "Training Report" },
      body: {
        tr: "Ofansif antrenman tamamlandı — Kanat oyuncuları +1 pas kazandı.",
        en: "Attacking session complete — wingers gained +1 passing.",
      },
      at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
  ];
}

/** Takımın ilk 11'i (formasyonu OTOMATİK doldur, en yüksek OVR'li oyuncuları seç). */
export function autoFillLineup(
  team: Team,
  formation: Formation,
  matchday: number = 0
): (Player | null)[] {
  const used = new Set<string>();
  const lineup: (Player | null)[] = [];

  for (const slot of formation.slots) {
    // Slot pozisyonu + ikincil pozisyonlarla eşleşen en iyi oyuncuyu seç
    // P1 FIX: Sakat oyuncuları ele
    // BULGU #1 DÜZELTME (v2.9.3): isPlayerAvailableAt ile cezalı oyuncuları da ele
    const candidate = team.players
      .filter(
        (p) =>
          !used.has(p.id) &&
          isPlayerAvailableAt(p, matchday) &&
          (p.position === slot.pos ||
            p.secondaryPositions?.includes(slot.pos))
      )
      .sort((a, b) => b.rating - a.rating)[0];

    // P0 FIX: Aynı gruptan en iyi oyuncu (kaleci hariç saha slotları için)
    let fallback = candidate;
    if (!fallback) {
      if (slot.pos === "GK") {
        // GK slotu için kaleci al
        fallback = team.players
          .filter((p) => !used.has(p.id) && isPlayerAvailableAt(p, matchday) && p.specificPosition === "GK")
          .sort((a, b) => b.rating - a.rating)[0];
      } else {
        // Saha slotu için kaleci HARİÇ en yüksek OVR'li oyuncu
        fallback = team.players
          .filter((p) => !used.has(p.id) && isPlayerAvailableAt(p, matchday) && p.specificPosition !== "GK")
          .sort((a, b) => b.rating - a.rating)[0];
      }
    }
    // Son çare: sakat bile olsa birini koy (ama kaleciyi saha slotuna koyma)
    if (!fallback) {
      if (slot.pos === "GK") {
        fallback = team.players
          .filter((p) => !used.has(p.id) && p.specificPosition === "GK")
          .sort((a, b) => b.rating - a.rating)[0] ?? null;
      } else {
        fallback = team.players
          .filter((p) => !used.has(p.id) && p.specificPosition !== "GK")
          .sort((a, b) => b.rating - a.rating)[0] ?? null;
      }
    }

    if (fallback) used.add(fallback.id);
    lineup.push(fallback ?? null);
  }

  return lineup;
}

/** v2.9.51: Taktik skoru — formasyon + roller + sliderların OYUNCU UYUMU bazlı fonksiyonu.
 *
 * Eski kod: slider 50'den uzaklaştıkça ceza veriyordu → Gegenpressing (90+) ve
 * Catenaccio (20-) gibi geçerli stratejiler cezalandırılıyordu.
 *
 * Yeni sistem: Ekstrem slider'lar cezalandırılmaz, bunun yerine OYUNCU KALİTESİ
 * ile uyumu kontrol edilir:
 *   - Yüksek pres (80+) → yüksek kondisyon gerekir (ort. cond > 60)
 *   - Düşük pres (20-) → yüksek defansif rating gerekir (ort. defending > 65)
 *   - Yüksek tempo (80+) → yüksek pace gerekir (ort. pace > 65)
 *   - Düşük tempo (20-) → yüksek passing gerekir (ort. passing > 65)
 *   - Yüksek kanat (80+) → yüksek pace kanat oyuncuları gerekir
 *   - Düşük kanat (20-) → yüksek passing orta saha gerekir
 *
 * Uyum varsa BONUS, uyum yoksa HAFİF ceza (ağır değil).
 */
export function computeTacticScore(
  team: Team,
  formation: Formation,
  lineup: (Player | null)[],
  sliders: { attackingPressure: number; defensiveLine: number; tempo: number; wingPlay: number }
): number {
  const filled = lineup.filter((p): p is Player => p !== null);
  if (filled.length === 0) return 0;
  const avgOvr = filled.reduce((s, p) => s + p.rating, 0) / filled.length;

  // Slot-pozisyon uyumu
  let matchScore = 0;
  for (let i = 0; i < lineup.length; i++) {
    const p = lineup[i];
    const slot = formation.slots[i];
    if (!p) continue;
    if (p.position === slot.pos) matchScore += 100 / lineup.length;
    else if (p.secondaryPositions?.includes(slot.pos))
      matchScore += 70 / lineup.length;
    else matchScore += 40 / lineup.length;
  }

  // v2.9.51: Slider-oyuncu uyumu — ceza yerine bonus/uyum kontrolü
  const avgCond = filled.reduce((s, p) => s + (p.cond ?? 100), 0) / filled.length;
  const avgDefending = filled.reduce((s, p) => s + (p.defending ?? 50), 0) / filled.length;
  const avgPace = filled.reduce((s, p) => s + (p.stats?.pace ?? p.speed ?? 50), 0) / filled.length;
  const avgPassing = filled.reduce((s, p) => s + (p.passing ?? 50), 0) / filled.length;

  let sliderScore = 50; // başlangıç — ekstrem olmayan taktikler için 50

  // Yüksek pres (80+): kondisyon yüksek mi?
  if (sliders.attackingPressure >= 80) {
    sliderScore += avgCond >= 65 ? 20 : -10; // uyum varsa +20, yoksa -10
  } else if (sliders.attackingPressure <= 20) {
    // Düşük pres: defansif kalite yüksek mi?
    sliderScore += avgDefending >= 65 ? 15 : -5;
  } else {
    sliderScore += 10; // dengeli pres = +10
  }

  // Yüksek tempo (80+): pace yüksek mi?
  if (sliders.tempo >= 80) {
    sliderScore += avgPace >= 65 ? 15 : -8;
  } else if (sliders.tempo <= 20) {
    // Düşük tempo: passing yüksek mi? (possession oyunu)
    sliderScore += avgPassing >= 65 ? 15 : -5;
  } else {
    sliderScore += 10;
  }

  // Kanat oyunu — orta seviye nötr
  if (sliders.wingPlay >= 80) {
    sliderScore += avgPace >= 60 ? 10 : -5;
  } else if (sliders.wingPlay <= 20) {
    sliderScore += avgPassing >= 60 ? 10 : -3;
  } else {
    sliderScore += 10;
  }

  // Defansif hat — yüksek hat riskli ama ofansif bonus
  if (sliders.defensiveLine >= 80) {
    sliderScore += avgDefending >= 70 ? 10 : -8; // iyi defans varsa yüksek hat çalışır
  } else if (sliders.defensiveLine <= 20) {
    sliderScore += 10; // düşük hat her zaman güvenli
  } else {
    sliderScore += 10;
  }

  // Clamp 0-100
  sliderScore = Math.max(0, Math.min(100, sliderScore));

  // Moral ortalaması
  const avgMorale = filled.reduce((s, p) => s + p.morale, 0) / filled.length;

  const score =
    avgOvr * 0.50 + matchScore * 0.25 + sliderScore * 0.15 + avgMorale * 0.10;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export { FORMATIONS };
