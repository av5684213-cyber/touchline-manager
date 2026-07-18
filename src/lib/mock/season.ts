import { FORMATIONS, Team, type Formation, type Player } from "./data";

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
 * Transfer penceresi — sezonun son 5 haftası hariç açık.
 * Hafta = (matchday - 1) / 1 + 1 (her matchday = 1 hafta)
 * Sezon 34 hafta → transfer penceresi 1-29. haftalarda açık, 30-34 kapalı.
 */
export function isTransferWindowOpen(_matchday?: number): boolean {
  // P0 FIX: Transfer penceresi HER ZAMAN açık
  return true;
}

export function transferWindowStatus(_matchday?: number): { isOpen: boolean; label: string; week: number; totalWeeks: number } {
  const md = SEASON_INFO.matchday;
  return {
    isOpen: true,
    label: "Transfer penceresi açık",
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

  // Her takım için son 5 maçı al
  for (const row of map.values()) {
    row.form = row.form.slice(-5);
  }

  return Array.from(map.values()).sort((a, b) => {
    // P0 FIX: Önce puan, sonra averaj, sonra atılan gol, sonra isim
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    if (b.won !== a.won) return b.won - a.won; // galibiyet sayısı tiebreaker
    return a.teamName.localeCompare(b.teamName);
  });
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
  formation: Formation
): (Player | null)[] {
  const used = new Set<string>();
  const lineup: (Player | null)[] = [];

  for (const slot of formation.slots) {
    // Slot pozisyonu + ikincil pozisyonlarla eşleşen en iyi oyuncuyu seç
    // P1 FIX: Sakat oyuncuları ele
    const candidate = team.players
      .filter(
        (p) =>
          !used.has(p.id) &&
          !p.is_injured &&
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
          .filter((p) => !used.has(p.id) && !p.is_injured && p.specificPosition === "GK")
          .sort((a, b) => b.rating - a.rating)[0];
      } else {
        // Saha slotu için kaleci HARİÇ en yüksek OVR'li oyuncu
        fallback = team.players
          .filter((p) => !used.has(p.id) && !p.is_injured && p.specificPosition !== "GK")
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

/** Taktik skoru — formasyon + roller + sliderların basit fonksiyonu. */
export function computeTacticScore(
  team: Team,
  formation: Formation,
  lineup: (Player | null)[],
  sliders: { attackingPressure: number; defensiveLine: number; tempo: number; wingPlay: number }
): number {
  // 1) İlk 11 ortalama OVR
  const filled = lineup.filter((p): p is Player => p !== null);
  if (filled.length === 0) return 0;
  const avgOvr = filled.reduce((s, p) => s + p.rating, 0) / filled.length;

  // 2) Slot-pozisyon uyumu
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

  // 3) Slider dengesi — uç değerler ceza
  const sliderBalance =
    100 -
    Math.abs(50 - sliders.attackingPressure) * 0.1 -
    Math.abs(50 - sliders.defensiveLine) * 0.1 -
    Math.abs(50 - sliders.tempo) * 0.1 -
    Math.abs(50 - sliders.wingPlay) * 0.1;

  // 4) Moral ortalaması
  const avgMorale = filled.reduce((s, p) => s + p.morale, 0) / filled.length;

  const score =
    avgOvr * 0.55 + matchScore * 0.25 + sliderBalance * 0.1 + avgMorale * 0.1;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export { FORMATIONS };
