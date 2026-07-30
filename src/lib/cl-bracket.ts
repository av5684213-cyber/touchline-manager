/**
 * v2.9.46 GÖREV 2 — Şampiyonlar Ligi bracket üretici.
 *
 * Tek maçlı eliminasyon (single-match knockout) bracket üretir.
 * Katılımcı sayısı 2'nin kuvveti değilse, en yakın 2'nin kuvvetine bye ile tamamlar.
 *
 * Örnekler:
 *   - 8 takım → 8 takımda 4 maç (tur 1), 4 kazanan → 2 maç (tur 2), 2 → 1 final (tur 3)
 *   - 24 takım → 32'ye bye ile tamamla: 16 bye + 8 maç (tur 1, 16 takım oynar),
 *                                          8 kazanan + 16 bye = 24 → 12 maç (tur 2)...
 *   - 45 takım → 64'e bye ile tamamla
 *
 * "Boşluk Çarşambası" kuralı: Her sezon döngüsünün boşluk Çarşambasında
 * sadece 1 tur oynanır. Birden fazla sezon sürebilir.
 */

export type CLParticipant = {
  teamId: string;
  teamName: string;
  teamShort: string;
  teamColor: string;
  country: string;
  tier: number;
  finalPosition: number;
  isUser: boolean;
};

export type CLMatch = {
  round: number;
  homeId: string;
  awayId: string;
  homeName: string;
  awayName: string;
  homeShort: string;
  awayShort: string;
  homeColor: string;
  awayColor: string;
  homeScore?: number;
  awayScore?: number;
  winnerId?: string;
  played: boolean;
  /** Bye maçı mı (karşı taraf yok, otomatik tur atlatır) */
  isBye?: boolean;
};

/**
 * En yakın 2'nin kuvvetini bul (≥ n).
 *
 * @param n katılımcı sayısı
 * @returns n'den büyük veya eşit en küçük 2'nin kuvveti
 */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Log₂ hesapla (tamsayı).
 */
export function log2int(n: number): number {
  if (n <= 1) return 0;
  let r = 0;
  let v = n;
  while (v > 1) {
    v = Math.floor(v / 2);
    r++;
  }
  return r;
}

/**
 * Toplam tur sayısı = log₂(bracketSize).
 *
 * Örn: 8 → 3 tur, 16 → 4 tur, 32 → 5 tur, 64 → 6 tur
 */
export function getTotalRounds(bracketSize: number): number {
  return log2int(bracketSize);
}

/**
 * Tur adını sayısal sıraya göre ver (1 = ilk tur, son = final).
 *
 * Tur sayısı → Kalan takım sayısı → Tur adı:
 *   - 6 tur (64 takım): 64→32→16→8→4→2 → Son 64, Son 32, Son 16, Son 8, Yarı, Final
 *   - 5 tur (32 takım): 32→16→8→4→2 → Son 32, Son 16, Son 8, Yarı, Final
 *   - 4 tur (16 takım): 16→8→4→2 → Son 16, Çeyrek, Yarı, Final
 *   - 3 tur (8 takım): 8→4→2 → Çeyrek, Yarı, Final
 *   - 2 tur (4 takım): 4→2 → Yarı, Final
 *   - 1 tur (2 takım): 2 → Final
 *
 * @param round 1'den başlayan tur numarası
 * @param totalRounds toplam tur sayısı
 */
export function getRoundName(round: number, totalRounds: number): string {
  if (round >= totalRounds) return "Final";
  if (round === totalRounds - 1) return "Yarı Final";
  if (round === totalRounds - 2) return "Çeyrek Final";
  // Geri kalan turlar "Son N" formatında (N = bu turdaki takım sayısı)
  // Bu turdaki takım sayısı = 2^(totalRounds - round + 1)
  const teamsInRound = Math.pow(2, totalRounds - round + 1);
  if (teamsInRound >= 16) return `Son ${teamsInRound}`;
  // 8 takım = Son 8 ama bazı liglerde "Çeyrek Final" kullanılıyor
  // Yukarıda totalRounds-2 zaten Çeyrek Final döndüğü için buraya 8 gelmez
  return `Tur ${round}`;
}

/**
 * İlk tur eşleşmelerini üret — bye'lar dahil.
 *
 * Standart bracket seeding algoritması:
 *   1. Katılımcıları seed sırasına göre diz (1, 2, 3, ..., n)
 *   2. Bracket boyutuna bye ile tamamla (sonlara bye ver)
 *   3. Standart seeding pozisyonlarını hesapla (1 vs son, 2 vs son-1, ...)
 *   4. Her pozisyon çifti için bir maç üret
 *      - Eğer iki taraf da gerçek katılımcıysa → normal maç
 *      - Eğer biri bye ise → bye maçı (otomatik tur atlatır)
 *
 * @param participants katılımcı listesi (finalPosition'a göre sıralı önerilir)
 * @returns { matches, bracketSize, totalRounds }
 */
export function generateFirstRoundMatches(
  participants: CLParticipant[]
): { matches: CLMatch[]; bracketSize: number; totalRounds: number } {
  if (participants.length < 2) {
    return { matches: [], bracketSize: 0, totalRounds: 0 };
  }

  // 1. Katılımcıları seed sırasına göre sırala (finalPosition 1 = en yüksek seed)
  const sorted = [...participants].sort((a, b) => a.finalPosition - b.finalPosition);

  // 2. En yakın 2'nin kuvvetine tamamla
  const bracketSize = nextPowerOfTwo(sorted.length);
  const totalRounds = getTotalRounds(bracketSize);

  // 3. Bye'ları ekle — bye = "BYE_{i}" sentinel değeri
  const slots: (CLParticipant | null)[] = [...sorted];
  while (slots.length < bracketSize) slots.push(null);

  // 4. Standart seeding pozisyonları — 1 vs bracketSize, 2 vs bracketSize-1, ...
  //    Bu sayede en iyi seed'ler finale kadar birbirinden kaçınır
  //    Pozisyon dizisi: [1, 16, 8, 9, 5, 12, 4, 13, ...] (8 takım için)
  //    Generic algoritma: recursive split
  const seedPositions = generateSeedPositions(bracketSize);

  // 5. Pozisyonlara göre slotları yeniden düzenle
  const arrangedSlots: (CLParticipant | null)[] = seedPositions.map(pos => slots[pos - 1]);

  // 6. Komşu çiftler için maç üret (0-1, 2-3, 4-5, ...)
  const matches: CLMatch[] = [];
  for (let i = 0; i < arrangedSlots.length; i += 2) {
    const home = arrangedSlots[i];
    const away = arrangedSlots[i + 1];

    // İki taraf da bye ise atla (olmaz ama güvenlik)
    if (!home && !away) continue;

    // Bir taraf bye ise — bye maçı, kazanan otomatik
    if (!home || !away) {
      const winner = home ?? away;
      matches.push({
        round: 1,
        homeId: home?.teamId ?? "",
        awayId: away?.teamId ?? "",
        homeName: home?.teamName ?? "BYE",
        awayName: away?.teamName ?? "BYE",
        homeShort: home?.teamShort ?? "—",
        awayShort: away?.teamShort ?? "—",
        homeColor: home?.teamColor ?? "#666",
        awayColor: away?.teamColor ?? "#666",
        played: true,
        winnerId: winner!.teamId,
        homeScore: home ? 1 : 0,
        awayScore: away ? 1 : 0,
        isBye: true,
      });
      continue;
    }

    // İki taraf da gerçek — normal maç
    matches.push({
      round: 1,
      homeId: home.teamId,
      awayId: away.teamId,
      homeName: home.teamName,
      awayName: away.teamName,
      homeShort: home.teamShort,
      awayShort: away.teamShort,
      homeColor: home.teamColor,
      awayColor: away.teamColor,
      played: false,
    });
  }

  return { matches, bracketSize, totalRounds };
}

/**
 * Standart bracket seeding pozisyonlarını üret.
 *
 * 8 takım için: [1, 8, 4, 5, 2, 7, 3, 6]
 *   Maçlar: (1 vs 8), (4 vs 5), (2 vs 7), (3 vs 6)
 *   Üst yarı: 1/8 kazananı vs 4/5 kazananı
 *   Alt yarı: 2/7 kazananı vs 3/6 kazananı
 *
 * Algoritma: Recursive — her turda çiftlerin pozisyonlarını ikiye böl.
 */
function generateSeedPositions(size: number): number[] {
  if (size === 1) return [1];
  if (size === 2) return [1, 2];

  // Önceki turun pozisyonları (size/2)
  const prev = generateSeedPositions(size / 2);

  // Bu turda her pozisyon iki yeni pozisyona genişler:
  //   seed s → (s, size + 1 - s)
  //   Yani: 1 → (1, size), 2 → (2, size-1), ...
  const result: number[] = [];
  for (const s of prev) {
    result.push(s);
    result.push(size + 1 - s);
  }
  return result;
}

/**
 * Bir turdaki kazananlardan sonraki tur eşleşmelerini üret.
 *
 * @param winners bu turun kazanan teamId'leri (maç sırasına göre)
 * @param participants tüm katılımcılar (teamId → participant lookup için)
 * @param nextRound sonraki tur numarası
 * @returns sonraki tur maçları (boş olabilir eğer kazanan sayısı 1 ise)
 */
export function generateNextRoundMatches(
  winners: string[],
  participants: CLParticipant[],
  nextRound: number
): CLMatch[] {
  const matches: CLMatch[] = [];
  for (let i = 0; i < winners.length - 1; i += 2) {
    const home = participants.find(p => p.teamId === winners[i]);
    const away = participants.find(p => p.teamId === winners[i + 1]);
    if (!home || !away) continue;
    matches.push({
      round: nextRound,
      homeId: home.teamId,
      awayId: away.teamId,
      homeName: home.teamName,
      awayName: away.teamName,
      homeShort: home.teamShort,
      awayShort: away.teamShort,
      homeColor: home.teamColor,
      awayColor: away.teamColor,
      played: false,
    });
  }
  return matches;
}
