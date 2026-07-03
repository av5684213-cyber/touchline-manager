import type { Team, Player } from "@/lib/mock/data";

/**
 * Haber üretim sistemi — eski oyundaki mediaSystem.ts mantığından uyarlandı.
 * Maç sonuçları, transferler, lig pozisyonu, sakatlık vb. olaylardan
 * otomatik gazete haberi üretir.
 */

export type NewsCategory =
  | "headline"
  | "match"
  | "transfer"
  | "rumor"
  | "injury"
  | "milestone";

export type NewsArticle = {
  id: string;
  category: NewsCategory;
  headline: string;
  body: string;
  importance: 1 | 2 | 3 | 4 | 5;
  timestamp: number;
  teamName?: string;
  teamId?: string;
  read: boolean;
};

function uid(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36).slice(-4);
}

export type MatchResultForNews = {
  result: "win" | "draw" | "loss";
  opponentName: string;
  goalsFor: number;
  goalsAgainst: number;
  isHome: boolean;
  matchday: number;
};

export type TransferForNews = {
  type: "in" | "out";
  playerName: string;
  club: string;
  fee?: number;
};

/**
 * Maç sonucundan haber üretir.
 */
export function generateMatchNews(team: Team, result: MatchResultForNews): NewsArticle {
  const { result: r, opponentName, goalsFor, goalsAgainst, isHome } = result;
  const teamName = team.name;
  const venue = isHome ? "ev sahibi" : "deplasman";
  const now = Date.now();

  if (r === "win") {
    const diff = goalsFor - goalsAgainst;
    const headlines = diff >= 3
      ? [
          `${teamName.toUpperCase()} ${opponentName.toUpperCase()}'I EZDİ GEÇTİ! ${goalsFor}-${goalsAgainst}`,
          `FIRTINA GİBİ ESTİ! ${teamName} ${goalsFor} GOLLÜ GALİBİYET`,
          `GOL YAĞMURU! ${teamName} ${opponentName}'I DAĞITTI`,
        ]
      : [
          `${teamName.toUpperCase()} SAHADAN GALİP AYRILDI! ${goalsFor}-${goalsAgainst}`,
          `ZAFER! ${teamName} ${venue === "ev sahibi" ? "TARAFTARINI" : "DEPLASMANDA"} MUTLU ETTİ`,
          `${goalsFor}-${goalsAgainst}: ${teamName} KAZANDI`,
        ];
    return {
      id: uid(),
      category: "match",
      headline: headlines[Math.floor(Math.random() * headlines.length)],
      body: `${teamName}, ${opponentName} karşısında ${venue} ${goalsFor}-${goalsAgainst}'lık galibiyet elde etti. Takım, sahada gösterdiği üstün performansla üç puanı cebine koydu.`,
      importance: diff >= 3 ? 4 : 3,
      timestamp: now,
      teamName,
      teamId: team.id,
      read: false,
    };
  }

  if (r === "loss") {
    const diff = goalsAgainst - goalsFor;
    const headlines = diff >= 3
      ? [
          `${teamName.toUpperCase()} ${opponentName} KARŞISINDA YIKILDI! ${goalsFor}-${goalsAgainst}`,
          `ACI MAĞLUBİYET: ${teamName} DAĞILDI!`,
          `FELAKET! ${teamName} ${goalsFor}-${goalsAgainst} YENİLDİ`,
        ]
      : [
          `${teamName} ${opponentName} KARŞISINDA MAĞLUP: ${goalsFor}-${goalsAgainst}`,
          `PUAN KAYBI: ${teamName} ${venue} YENİLDİ`,
          `${opponentName}, ${teamName}'I YENDİ: ${goalsFor}-${goalsAgainst}`,
        ];
    return {
      id: uid(),
      category: "match",
      headline: headlines[Math.floor(Math.random() * headlines.length)],
      body: `${teamName}, ${opponentName} ${venue === "ev sahibi" ? "deplasmanında" : "karşısında"} ${goalsFor}-${goalsAgainst} mağlup oldu. Performans eleştirilerin odağında.`,
      importance: diff >= 3 ? 4 : 3,
      timestamp: now,
      teamName,
      teamId: team.id,
      read: false,
    };
  }

  // Beraberlik
  const headlines = [
    `${teamName} – ${opponentName}: ${goalsFor}-${goalsAgainst} BERABERLİK`,
    `PUANLAR PAYLAŞILDI! ${teamName} KAZANAMADI`,
    `${goalsFor}-${goalsAgainst}: ${teamName} BERBERELİKTE KALDI`,
  ];
  return {
    id: uid(),
    category: "match",
    headline: headlines[Math.floor(Math.random() * headlines.length)],
    body: `${teamName} ile ${opponentName} arasındaki maç ${goalsFor}-${goalsAgainst} berabere bitti. Her iki takım da bir puana razı oldu.`,
    importance: 2,
    timestamp: now,
    teamName,
    teamId: team.id,
    read: false,
  };
}

/**
 * Transferden haber üretir.
 */
export function generateTransferNews(
  team: Team,
  transfer: TransferForNews
): NewsArticle {
  const teamName = team.name;
  const now = Date.now();

  if (transfer.type === "in") {
    const headlines = [
      `${teamName.toUpperCase()}'A BÜYÜK TRANSFER!`,
      `YILDIZ OYUNCU ${teamName}'DA!`,
      `${transfer.playerName.toUpperCase()} RESMEN İMZALADI!`,
      `TRANSFER ŞOKU: ${transfer.playerName} ${teamName}'A!`,
    ];
    return {
      id: uid(),
      category: "transfer",
      headline: headlines[Math.floor(Math.random() * headlines.length)],
      body: `${teamName}, ${transfer.club} kulübünden ${transfer.playerName}'ı kadrosuna kattı${transfer.fee ? ` (${transfer.fee.toLocaleString("tr-TR")} €)` : ""}. Taraftarlar transferden memnun.`,
      importance: 4,
      timestamp: now,
      teamName,
      teamId: team.id,
      read: false,
    };
  }

  const headlines = [
    `${transfer.playerName.toUpperCase()} ${teamName}'DAN AYRILDI!`,
    `VEDALAŞMA: ${transfer.playerName} GİDİYOR`,
    `${teamName}, ${transfer.playerName}'I ${transfer.club}'E SATTI!`,
  ];
  return {
    id: uid(),
    category: "transfer",
    headline: headlines[Math.floor(Math.random() * headlines.length)],
    body: `${teamName}, ${transfer.playerName} ile yollarını ayırdı. Oyuncu ${transfer.club} kulübüne${transfer.fee ? ` ${transfer.fee.toLocaleString("tr-TR")} € karşılığında` : ""} transfer oldu.`,
    importance: 3,
    timestamp: now,
    teamName,
    teamId: team.id,
    read: false,
  };
}

/**
 * Lig pozisyonuna göre haber üretir.
 */
export function generateLeagueNews(
  team: Team,
  leaguePosition: number,
  tier: number = 2
): NewsArticle | null {
  const teamName = team.name;
  const now = Date.now();

  if (leaguePosition === 1) {
    return {
      id: uid(),
      category: "headline",
      headline: `ŞAMPİYONLUK KOŞUSU! ${teamName.toUpperCase()} ZİRVEDE!`,
      body: `${teamName}, ligde lider koltuğunda oturuyor. Şampiyonluk yarışının en güçlü adayı konumunda.`,
      importance: 5,
      timestamp: now,
      teamName,
      teamId: team.id,
      read: false,
    };
  }
  if (leaguePosition <= 3) {
    const posLabel = leaguePosition === 2 ? "İKİNCİ SIRADA" : "ÜÇÜNCÜ SIRADA";
    return {
      id: uid(),
      category: "headline",
      headline: `${teamName.toUpperCase()} ${posLabel}!`,
      body: `${teamName}, ligde ${leaguePosition}. sırada yer alıyor. Şampiyonluk yarışında iddialı konumda.`,
      importance: 3,
      timestamp: now,
      teamName,
      teamId: team.id,
      read: false,
    };
  }
  if (leaguePosition >= 16) {
    return {
      id: uid(),
      category: "headline",
      headline: `${teamName.toUpperCase()} DÜŞME HATTINDA!`,
      body: `${teamName}, ligde ${leaguePosition}. sırada yer alıyor. Küme düşme potasında tehlike çanları çalıyor.`,
      importance: 4,
      timestamp: now,
      teamName,
      teamId: team.id,
      read: false,
    };
  }
  return null;
}

/**
 * En iyi oyuncudan haber üretir (golcü).
 */
export function generateTopScorerNews(
  team: Team,
  player: Player
): NewsArticle | null {
  const teamName = team.name;
  const now = Date.now();
  const playerName = `${player.firstName} ${player.lastName}`;

  if (player.goals >= 2 && player.goals % 5 === 0) {
    return {
      id: uid(),
      category: "milestone",
      headline: `${playerName.toUpperCase()} ŞOV YAPIYOR! ${player.goals} GOL!`,
      body: `${teamName}'in yıldızı ${playerName}, bu sezon ${player.goals} gol sayısına ulaştı. Gol krallığı yarışında iddialı konumda.`,
      importance: 4,
      timestamp: now,
      teamName,
      teamId: team.id,
      read: false,
    };
  }
  return null;
}

/**
 * Sakatlıktan haber üretir.
 */
export function generateInjuryNews(
  team: Team,
  player: Player,
  daysOut: number
): NewsArticle {
  const teamName = team.name;
  const playerName = `${player.firstName} ${player.lastName}`;
  const now = Date.now();

  return {
    id: uid(),
    category: "injury",
    headline: `${teamName.toUpperCase()}'DA SAKATLIK ŞOKU! ${playerName.toUpperCase()} ${daysOut} GÜN YOK`,
    body: `${teamName}'in ${player.specificPosition} mevkiindeki oyuncusu ${playerName}, antrenmanda yaşadığı sakatlık nedeniyle ${daysOut} gün sahalardan uzak kalacak. Teknik heyet alternatif arayışında.`,
    importance: daysOut > 14 ? 4 : 2,
    timestamp: now,
    teamName,
    teamId: team.id,
    read: false,
  };
}

/**
 * Rastgele söylenti haberleri üretir (flavor).
 */
export function generateRumorNews(team: Team): NewsArticle | null {
  const teamName = team.name;
  const now = Date.now();

  if (Math.random() < 0.3) {
    const rumors = [
      {
        h: `${teamName.toUpperCase()} TRANSFER PAZARINDA HAREKETLİ!`,
        b: "Kulüp kaynakları, transfer piyasasında hareketli olduklarını doğruladı. Hangi oyuncularla ilgilendikleri henüz bilinmiyor.",
      },
      {
        h: `${teamName}'DA ANTRENÖR BASKISI ARTIYOR!`,
        b: "Son haftalardaki sonuçların ardından teknik direktörün geleceği sorgulanmaya başlandı.",
      },
      {
        h: `${teamName.toUpperCase()} ALTYAPIDAN YILDIZ ÇIKIYOR!`,
        b: "Altyapı akademisinden yetişen genç bir oyuncunun A takıma terfi etmesi gündemde.",
      },
    ];
    const rumor = rumors[Math.floor(Math.random() * rumors.length)];
    return {
      id: uid(),
      category: "rumor",
      headline: rumor.h,
      body: rumor.b,
      importance: 2,
      timestamp: now,
      teamName,
      teamId: team.id,
      read: false,
    };
  }
  return null;
}

/**
 * Haftalık haber özeti — tüm haberleri birleştirir.
 */
export function generateWeeklySummary(
  team: Team,
  options: {
    lastMatch?: MatchResultForNews;
    transfers?: TransferForNews[];
    leaguePosition?: number;
    tier?: number;
    injuredPlayer?: { player: Player; daysOut: number };
  } = {}
): NewsArticle[] {
  const news: NewsArticle[] = [];

  if (options.lastMatch) {
    news.push(generateMatchNews(team, options.lastMatch));
  }

  if (options.transfers) {
    for (const tr of options.transfers) {
      news.push(generateTransferNews(team, tr));
    }
  }

  if (options.leaguePosition) {
    const leagueNews = generateLeagueNews(team, options.leaguePosition, options.tier);
    if (leagueNews) news.push(leagueNews);
  }

  if (options.injuredPlayer) {
    news.push(generateInjuryNews(team, options.injuredPlayer.player, options.injuredPlayer.daysOut));
  }

  // Top scorer
  const topScorer = [...team.players].sort((a, b) => b.goals - a.goals)[0];
  if (topScorer && topScorer.goals > 0) {
    const scorerNews = generateTopScorerNews(team, topScorer);
    if (scorerNews) news.push(scorerNews);
  }

  // Rastgele söylenti
  const rumor = generateRumorNews(team);
  if (rumor) news.push(rumor);

  // Min 3 haber
  if (news.length < 3) {
    const fillers = [
      {
        h: `${team.name.toUpperCase()} HAFTA SONU HAZIRLIKLARINA BAŞLADI`,
        b: `${team.name} yeni haftanın hazırlıklarına start verdi. Teknik ekip, taktik çalışmalarıyla saha hazır.`,
      },
      {
        h: `LİGDE HAFTANIN ANALİZİ: ${team.name.toUpperCase()} NEREDE?`,
        b: `${team.name} bu haftaki performansıyla dikkat çekti. Ligdeki yeri ve son durumu derledik.`,
      },
      {
        h: `ALTYAPI HABERLERİ: GENÇ YILDIZLAR YOLUNDA`,
        b: `${team.name} altyapısında yetişen genç yetenekler A takıma göz kırpıyor.`,
      },
    ];
    const needed = 3 - news.length;
    for (let i = 0; i < needed; i++) {
      const f = fillers[i % fillers.length];
      news.push({
        id: uid(),
        category: "headline",
        headline: f.h,
        body: f.b,
        importance: 1,
        timestamp: Date.now(),
        teamName: team.name,
        teamId: team.id,
        read: false,
      });
    }
  }

  return news.sort((a, b) => b.importance - a.importance);
}
