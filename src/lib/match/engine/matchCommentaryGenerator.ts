/**
 * matchCommentaryGenerator.ts
 *
 * Trait tabanlı, bağlama duyarlı maç yorumu üretim motoru.
 *
 * Olay tipi, dakika, skor durumu, maç önemi (derbi/kupa/hazırlık),
 * oyuncu trait'leri ve diğer bağlamsal faktörlere göre zengin,
 * çeşitli, hikaye anlatımı tarzında yorum metinleri üretir.
 *
 * Her çağrıda rastgele varyasyon seçer; böylece aynı olay bile
 * farklı anlatımlarla sunulabilir.
 */

// ═══════════════════════════════════════════════════════════════════
// TİPLER
// ═══════════════════════════════════════════════════════════════════

export type MatchType = 'normal' | 'derby' | 'cup' | 'friendly' | 'cup_final';

export type CommentaryEventType =
  | 'GOAL'
  | 'YELLOW'
  | 'RED'
  | 'INJURY'
  | 'SUB'
  | 'HALFTIME'
  | 'FULLTIME'
  | 'OFFSIDE'
  | 'CORNER'
  | 'COMMENTARY'
  | 'PENALTY_GOAL'
  | 'OWN_GOAL'
  | 'SECOND_YELLOW';

export type GoalType =
  | 'plase'
  | 'header'
  | 'one_touch'
  | 'long_shot'
  | 'sprint_finish'
  | 'postup_turn'
  | 'penalty'
  | 'freekick'
  | 'own_goal'
  | 'unknown';

export interface CommentaryContext {
  /** Olay tipi */
  eventType: CommentaryEventType;
  /** Oyuncu adı */
  playerName?: string;
  /** Takım (HOME/AWAY) */
  team?: 'HOME' | 'AWAY';
  /** Dakika (0-120) */
  minute: number;
  /** Ev sahibi skor (olay sonrası) */
  homeScore?: number;
  /** Deplasman skor (olay sonrası) */
  awayScore?: number;
  /** Maç türü */
  matchType?: MatchType;
  /** Oyuncu pozitif trait'leri */
  playerTraits?: string[];
  /** Oyuncu negatif trait'leri */
  playerNegTraits?: string[];
  /** Oyuncu kişilik trait'leri */
  playerPersonality?: string[];
  /** Gol tipi (sadece GOAL olaylarında) */
  goalType?: GoalType;
  /** Eski takımına karşı mı oynuyor? */
  isFormerPlayer?: boolean;
  /** Ev sahibi takım adı */
  homeTeamName?: string;
  /** Deplasman takım adı */
  awayTeamName?: string;
  /** Oyuncunun maçtaki gol sayısı (hat-trick vs. için) */
  playerGoalCount?: number;
  /** Takım arkadaşının adı (asist, verkaç için) */
  assistPlayerName?: string;
  /** Maç öncesi yorum (maç başlamadan) */
  isPreMatch?: boolean;
  /** Uzatma dakikası mı? */
  isExtraTime?: boolean;
  /** Penaltı atışları mı? */
  isPenaltyShootout?: boolean;
  /** Detay metni (kart nedeni, sakatlık tipi vs.) */
  detail?: string;
}

export interface GeneratedCommentary {
  /** Üretilen yorum metni */
  text: string;
  /** Heyecan seviyesi (1-5, UI animasyonunu etkiler) */
  intensity: 1 | 2 | 3 | 4 | 5;
  /** Olay kategorisi (renk ve ikon için) */
  category: 'goal' | 'card' | 'injury' | 'sub' | 'halftime' | 'fulltime' | 'commentary' | 'special';
}

// ═══════════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════════

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hasTrait(traits: string[] | undefined, trait: string): boolean {
  if (!traits) return false;
  return traits.some(t => t.toLowerCase().replace(/\s+/g, '_') === trait.toLowerCase().replace(/\s+/g, '_'));
}

function hasAnyTrait(traits: string[] | undefined, ...traitNames: string[]): boolean {
  if (!traits) return false;
  return traitNames.some(tn => hasTrait(traits, tn));
}

/** Skor farkını hesapla (pozitif = ev sahibi önde) */
function scoreDiff(ctx: CommentaryContext): number {
  return (ctx.homeScore ?? 0) - (ctx.awayScore ?? 0);
}

/** Eşitlik mi? */
function isDraw(ctx: CommentaryContext): boolean {
  return (ctx.homeScore ?? 0) === (ctx.awayScore ?? 0);
}

/** Takım önde mi? */
function isLeading(ctx: CommentaryContext, team?: 'HOME' | 'AWAY'): boolean {
  const diff = scoreDiff(ctx);
  if (team === 'HOME') return diff > 0;
  if (team === 'AWAY') return diff < 0;
  return diff !== 0;
}

/** Son dakika mı? (80+) */
function isLate(ctx: CommentaryContext): boolean {
  return ctx.minute >= 80;
}

/** Çok geç mi? (88+) */
function isVeryLate(ctx: CommentaryContext): boolean {
  return ctx.minute >= 88;
}

/** Erken dakika mı? (0-20) */
function isEarly(ctx: CommentaryContext): boolean {
  return ctx.minute <= 20;
}

/** Maçın kritik anı mı? */
function isCrunchTime(ctx: CommentaryContext): boolean {
  if (ctx.matchType === 'cup_final' || ctx.matchType === 'derby') return ctx.minute >= 70;
  return ctx.minute >= 80;
}

/** Derbi mi? */
function isDerby(ctx: CommentaryContext): boolean {
  return ctx.matchType === 'derby';
}

/** Kupa maçı mı? */
function isCup(ctx: CommentaryContext): boolean {
  return ctx.matchType === 'cup' || ctx.matchType === 'cup_final';
}

/** Kupa finali mi? */
function isCupFinal(ctx: CommentaryContext): boolean {
  return ctx.matchType === 'cup_final';
}

/** Hat-trick yapıldı mı? */
function isHatTrick(ctx: CommentaryContext): boolean {
  return (ctx.playerGoalCount ?? 0) >= 3;
}

/** Skor farkı büyük mü? (3+) */
function isBigWinMargin(ctx: CommentaryContext): boolean {
  return Math.abs(scoreDiff(ctx)) >= 3;
}

/** Takım adını al */
function teamName(ctx: CommentaryContext): string {
  if (ctx.team === 'HOME') return ctx.homeTeamName || 'Ev Sahibi';
  if (ctx.team === 'AWAY') return ctx.awayTeamName || 'Deplasman';
  return '';
}

/** Rakip takım adını al */
function opponentName(ctx: CommentaryContext): string {
  if (ctx.team === 'HOME') return ctx.awayTeamName || 'Rakip';
  if (ctx.team === 'AWAY') return ctx.homeTeamName || 'Rakip';
  return '';
}

// ═══════════════════════════════════════════════════════════════════
// GOL YORUM HAVUZLARI
// ═══════════════════════════════════════════════════════════════════

const GOAL_NORMAL: string[] = [
  '{player}, {minute}. dakikada harika bir vuruşla takımını öne geçirdi!',
  'GOOOL! {player} kalecinin yapacağı hiçbir şey yoktu!',
  'Ne bir vuruş! {player} topu adeta ağlara yapıştırdı!',
  '{player} yine yaptı yapacağını! Klas bir bitiriş!',
  'Rakip savunma çaresiz! {player} kendine güvenle vurdu ve gol!',
  'Harika bir gol! {player} {teamName} adına skoru değiştirdi!',
  'Mükemmel bir bitiriş! {player} topu ağlara gönderdi, {opponent} savunması izledi!',
  '{player} soğukkanlılıkla topu ağlara yolladı. Profesyonel bir bitiriş!',
  'Uzun süredir gelen baskı sonunda gol oldu! {player} cezayı kesti!',
  '{player} için bu gol çok kolaydı, neredeyse antrenman çalışması!',
  'Top ağlarla buluştu! {player} takımını sevindirdi!',
  '{player} bu pozisyonda hata yapmazdı ve yapmadı da! Gol!',
];

const GOAL_LATE: string[] = [
  'SON DAKİKA GOLÜ! {player} tribünleri yıktı! İnanılmaz bir an!',
  'Dakikalar azalıyordu ki {player} patladı! Muhteşem bir son dakika golü!',
  'Bu filmi yazamazsın! {player} {minute}. dakikada her şeyi değiştirdi!',
  'İNANILMAZ! {player} son saniyede golü attı! Tribünler çıldırdı!',
  'Maç bitmek üzereydi ama {player} farklı bir şey söyledi! GOL!',
  'Tribünlerdekiler ayağa kalktı! {player} {minute}. dakikada takımına hayat verdi!',
  'Ne bir dram! {player} maçın son anında patladı ve skoru değiştirdi!',
  'Süre doluyordu... Ama {player} var ya, o asla pes etmez! GOL!',
];

const GOAL_DERBY: string[] = [
  'DERBİ GOLÜ! {player} rakip taraftarları susturdu! Muhteşem!',
  'Ezeli rekabette {player} sahneye çıktı! Bu gol taraftarlara unutulmaz bir an!',
  'Derbinin kaderini {player} belirliyor! Rakip tribünleri sessiz!',
  '{player} derbi golünü attı! Şehrin hakimi kim, belli oluyor!',
  'Bu gol sadece 3 puan değil, gurur golü! {player} tarihe geçti!',
  'Derbiler unutulmaz anlar doğurur ve {player} tam da bunu yaptı! GOL!',
  'Taraftarlar bu golü yıllarca konuşacak! {player} derbinin adamı!',
];

const GOAL_CUP_FINAL: string[] = [
  'FİNAL GOLÜ! {player} tarihe altın harflerle adını yazdırıyor!',
  'Kupa finalinde {player} sahneye çıktı! Bu gol şampiyonluk getirebilir!',
  'Finalin adamı {player}! Top ağlara gitti, kupaya bir adım daha yaklaştılar!',
  '{player} final gecesinin yıldızı oluyor! Bu gol kaderi belirleyebilir!',
  'Kupa için mücadele eden {player} en kritik anda golü attı! Muhteşem!',
  'Final maçında {player} soğukkanlılığını korudu ve topu ağlara gönderdi!',
];

const GOAL_HEADER: string[] = [
  'KAFAYLA GOL! {player} havada rakibinden yüksekti! Mükemmel bir kafa!',
  'Ne bir kafa vuruşu! {player} topu havadan ağlara yönlendirdi!',
  '{player} hava topunu değerlendirdi! Kalecinin müdahale şansı yoktu!',
  'Mükemmel ortayı kafa ile tamamlayan {player}, skoru değiştirdi!',
  'Hava hakimiyeti {player}\'den yana! Kafayı koydu ve gol!',
];

const GOAL_LONG_SHOT: string[] = [
  'UZAKTAN FUZE! {player} ceza sahası dışından müthiş bir şut çıkardı!',
  'Ne bir şut! {player}\'nin uzaktan vuruşu topu ağlara yapıştırdı!',
  'Kaleci uçtu ama yetmedi! {player}\'nin şutu yılın golü adayı!',
  '30 metreden {player} vurdu ve top mermi gibi ağlara gitti!',
  '{player} uzaktan şutunu kullanmayı bildi! Kalecinin yapacağı hiçbir şey yok!',
];

const GOAL_PLASE: string[] = [
  'ŞIK BİR PLASE! {player} kalecinin sağına usulca yerleştirdi!',
  '{player} plaseyle topu ağlara yolladı! Ne bir zarafet!',
  'Plase vuruşunda {player} mükemmel bir açı yakaladı! Gol!',
  'Kalecinin yanından {player} topu usulca içeri sürdü! Klas!',
];

const GOAL_ONE_TOUCH: string[] = [
  'TEK VURUŞTA GOL! {player} topu ilk dokunuşta ağlara gönderdi!',
  '{player} topu kontrol etmeye bile gerek görmedi! Tek vuruş, gol!',
  'Ne bir refleks! {player} topu ilk temasla değerlendirdi!',
  'Tek vuruşla bitiren {player}, savunmayı dondurdu!',
];

const GOAL_SPRINT_FINISH: string[] = [
  'Hızlı hücumda {player} koşusunu tamamladı ve topu ağlara yolladı!',
  'Kontra atakta {player} rakiplere fark attı! Bitiriş kusursuz!',
  '{player}\'nin hızına kim yetişebilir? Koştu, vurdu, gol!',
  'Rüzgar gibi koşan {player}, kalecinin üstünden topu geçirdi!',
];

const GOAL_PENALTY: string[] = [
  'PENALTI GOLÜ! {player} topu soğukkanlılıkla ağlara gönderdi!',
  'Beyaz noktadan {player} golü attı! Kaleci doğru köşeye gitmedi!',
  'Penaltıda {player} asla ısırır mı? Isırmadı! Gol!',
  '{player} penaltıyı gole çevirdi! Soğukkanlı bir uygulama!',
];

const GOAL_FREEKICK: string[] = [
  'FRİKİK GOLÜ! {player} topu duvarın üzerinden aşırttı! Sanat!',
  'Ne bir frikik! {player} topu mermi gibi ağlara gönderdi!',
  '{player} frikik konusunda uzmanlığını gösterdi! Muhteşem bir vuruş!',
  'Frikikten gol! {player} duvarı aşarak kalecinin ulaşamayacağı köşeye vurdu!',
];

const GOAL_OWN: string[] = [
  'KENDİ KALESİNE! {player} topu yanlışlığla ağlara gönderdi! Facia!',
  'Ne bir talihsizlik! {player} kendi kalesine gol attı! Yüzü ellerinde!',
  'Olmaz olmaz! {player}\'nin müdahalesi topu kendi ağlarına yolladı!',
  'Kendi kalesine gol! {player} bu anı silmek ister! Acı bir an!',
];

const GOAL_HAT_TRICK: string[] = [
  'HAT-TRICK! {player} üçüncü golü attı! Tribünler onu ayakta alkışlıyor!',
  'İNANILMAZ! {player} maçtaki 3. golünü attı! Bu bir hat-trick!',
  '{player} üç kelebeği masaya koydu! Hat-trick yaparak maça damga vurdu!',
  'Maçın yıldızı tartışmasız {player}! Hat-trick ile tarihe geçti!',
  'Üç gol, bir efsane! {player} bu maçta unutulmaz bir performans sergiledi!',
];

// Trait bazlı gol yorumları
const GOAL_TRAIT_BIG_MATCH: string[] = [
  'İşte büyük oyuncu farkı! {player} sahneye çıktı ve takımına galibiyeti getirdi!',
  'Büyük maçların adamı {player} yine iş başında! Kritik anlarda soğukkanlı!',
  '{player} büyük sahnede parlıyor! Bu gol, bu oyuncunun kalitesini kanıtlıyor!',
  'Kalite konuşur! {player} büyük maçta büyük gol attı!',
  'Baskı mı? Ne baskısı? {player} için böyle anlar çerez!',
];

const GOAL_TRAIT_DERBY_BEAST: string[] = [
  'DERBİ CANAVARI UYANDI! {player} ezeli rekabette yine fark yarattı!',
  '{player} derbilerde başka bir yaratığa dönüşüyor! Bu gol tarihe geçecek!',
  'Derbinin adamı belli! {player} rakip taraftarları susturdu!',
  '{player} için derbi demek, sahne demek! Yine golünü attı!',
];

const GOAL_TRAIT_FINISHER: string[] = [
  'Bitirici forvet fırsatı kaçırmaz! {player} ağları titretti!',
  '{player}\'nin bitiriciliği konuşuyor! Bu pozisyonda hata yapmaz!',
  'Soğukkanlı bitirici {player} topu usulca ağlara yerleştirdi!',
  '{player} için bu pozisyon sınav değil, sadece formalite!',
];

const GOAL_TRAIT_GOAL_MACHINE: string[] = [
  'GOL MAKİNESİ çalışıyor! {player} yine tabela yaptı!',
  '{player} gol atmaya doymuyor! Bu sezonki gol sayısı artıyor!',
  'Gol makinesi durdurulamaz! {player} bir kez daha ağları buldu!',
  'Ne bir istikrar! {player} her maç gol atıyor, bu da bir diğeri!',
];

const GOAL_TRAIT_SILENT_ASSASSIN: string[] = [
  'Sessiz suikastçı sahneye çıktı! {player} kimse beklemezken golü attı!',
  'Gölgeden gelen gol! {player} fark edilmeden pozisyon aldı ve bitirdi!',
  '{player} sessizce pozisyonunu aldı ve soğukkanlılıkla vurdu! Gol!',
  'Kimse {player}\'i görmedi ama top ağlardaydı! Sessiz suikast!',
];

const GOAL_TRAIT_OPPORTUNIST: string[] = [
  'Fırsatçı {player} dönen topu kaçırmadı! Aç gözlü bir bitiriş!',
  '{player} için top nerede, gol orada! Fırsatı değerlendirdi!',
  'Dönen topu takip eden {player}, ağları bulmakta gecikmedi!',
  'Fırsatçı forvet iş başında! {player} boş topu gole çevirdi!',
];

const GOAL_TRAIT_COUNTER_BEAST: string[] = [
  'KONTRA CANAVARI! {player} hızlı hücumu soğukkanlılıkla tamamladı!',
  'Kontra atakta {player} rakibe yetişilmez bir hızla koştu ve bitirdi!',
  '{player} kontra atağın adamı! Savunma arkasına sızdı ve golü attı!',
  'Hızlı hücum, {player}\'nin bitiriciliği, gol! Kontra canavarı!',
];

const GOAL_TRAIT_COMEBACK: string[] = [
  'Geri dönüş lideri {player}! Takım gerideyken o sorumluluğu aldı!',
  '{player} geri dönüşün simgesi! Takım zor durumdayken o golü attı!',
  'Takım zor anında {player}\'ye ihtiyaç duydu ve o cevap verdi!',
  '{player} zor anlarda yüklenir! Bu gol takıma yeni bir nefes verdi!',
];

// DÜZELTME 6: Lider ve Soğukkanlı trait gol yorumları
const GOAL_TRAIT_LEADER: string[] = [
  'Takım kaptanı {player} omuzladı yükü! Attığı her gol ayrı anlam taşıyor!',
  'Lider gol atınca takım da inançla doluyor! {player} öncülük ediyor!',
  '{player} liderliğini golle kanıtlıyor! Takımı için her şeyi yapıyor!',
  'Kaptan {player} kritik anlarda ortaya çıkıyor! Bu gol takıma moral verdi!',
];

const GOAL_TRAIT_COMPOSED: string[] = [
  'Baskı altında bile mükemmel soğukkanlılık! {player} sinirlerini kontrol etti!',
  'Soğukkanlı {player} kalabalığın gürültüsünü duyamıyor bile! Sadece kale!',
  '{player} buz gibi soğukkanlılıkla topu ağlara gönderdi! Telaş yok!',
  'Panik yok, {player} var! Soğukkanlı bitiriş, profesyonelce bir gol!',
];

const MISS_TRAIT_STUBBORN: string[] = [
  'Pes etmeyecek! {player} bir sonraki fırsatı bekliyor, inatçı oyuncu!',
  '{player} bu kaçırmayı kabullenemeyecek! İnatçı yapısı onu tekrar denemeye itiyor!',
  'İnatçı forvet {player} bu pozisyonu unutup yenisini arayacak!',
  '{player} pes etmiyor! İnatçı yapısıyla tekrar deneyecek, emin olun!',
];

const GOAL_FORMER_PLAYER: string[] = [
  '{player}, eski takımına karşı suskunluğunu bozdu! Golünü kutlamıyor, büyük saygı.',
  'Eski takımına karşı gol! {player} duygusal anlar yaşıyor, kutlama yapmıyor.',
  '{player} eski renklere karşı gol attı! Yüzünde buruk bir gülümseme...',
  'Ne bir hikaye! {player} eski takımına karşı skoru değiştirdi! Duygusal bir an!',
  '{player} için bu gol özel! Eski takımına karşı skor tabelasını değiştirdi!',
];

// ═══════════════════════════════════════════════════════════════════
// KART YORUM HAVUZLARI
// ═══════════════════════════════════════════════════════════════════

const YELLOW_NORMAL: string[] = [
  'Hakem sarı kartı gösterdi! {player} uyarılıyor.',
  'Sert bir müdahale ve hakem cezayı kesiyor. {player} sarı kart görüyor.',
  '{player} sarı kart gördü. Bu faulun bedeli ağır olabilir.',
  'Taktiksel bir faul ve hakem sarı kartını çıkarıyor. {player} uyarıldı.',
  'Hakemin sabrı taştı! {player} sarı kartla cezalandırılıyor.',
  'Hakem cezayı kesti! {player} sarı kart görüyor, bir sonraki faulda riskli!',
  '{player} bu müdahale için sarı kartını hak etti. Hakem kararlı.',
  'Şiddetli bir giriş! {player} sarı kartla cezalandırıldı.',
];

const YELLOW_AGGRESSIVE: string[] = [
  '{player} yine sert oynadı! Agresif müdahalesi sarı kartla sonuçlandı.',
  'Agresif {player} sınırları aştı! Sarı kart hakemin elinde.',
  '{player}\'nin agresif tarzı bu kez bedel ödetiyor. Sarı kart!',
  'Sertliğin bedeli! {player} sarı kart görüyor, oyuna dikkatli devam etmeli.',
];

const YELLOW_CARD_MAGGOT: string[] = [
  '{player} yine kart gördü! Bu sezonki kart sayısı artıyor, disiplin sorunu var.',
  'Kart manyağı {player} bir kez daha sarı kartla cezalandırıldı!',
  '{player} kart görmeye devam ediyor! Teknik direktör bu duruma ne diyecek?',
];

const YELLOW_TACTICAL: string[] = [
  'Taktiksel faul! {player} rakibin hızını kesmek için faul yaptı, sarı kart.',
  '{player} bilinçli bir faul yaparak tehlikeyi önledi ama sarı kartı da aldı.',
  'Akıllı ama cesur! {player} taktik faul yaptı, sarı kart görüyor.',
];

const RED_NORMAL: string[] = [
  'KIRMIZI KART! {player} oyundan atıldı! Takım 10 kişi kaldı!',
  'Hakem kırmızı kartı gösterdi! {player} soyunma odasına yolcu!',
  'Maçın kaderi değişti! {player} kırmızı kart gördü ve takım eksik kaldı!',
  'Şok eden bir an! {player} kırmızı kartla sahayı terk ediyor!',
  'Kırmızı kart! {player} hakemin sabrını taşırdı! Takım çok zor durumda!',
  '{player} için maç bitti! Kırmızı kart ve takım 10 kişi!',
];

const RED_AGGRESSIVE: string[] = [
  '{player} yine sert bir müdahale yaptı ve doğrudan kırmızı kart gördü! Takımını 10 kişi bıraktı!',
  'Agresif {player} sınırı aştı! Doğrudan kırmızı kart, takım perişan!',
  'Sert giriş, kırmızı kart! {player} takımını 10 kişi bırakarak sahayı terk etti!',
];

const RED_SECOND_YELLOW: string[] = [
  'İKİNCİ SARI KARTTAN KIRMIZI! {player} maçı tamamladı!',
  '{player} ikinci sarı kartını gördü ve kırmızı kartla sahayı terk ediyor!',
  'Bir sarı daha ve kırmızı! {player} için maç bitti!',
  'İkinci sarı kart! {player} hakeme itiraz ediyor ama karar kesin!',
];

const RED_PANICKER: string[] = [
  'Panik anında felaket! {player} kritik pozisyonda hata yaptı ve kırmızı kart gördü!',
  '{player} baskı altında çöktü! Panik halinde yaptığı müdahale kırmızı kartla sonuçlandı!',
  'Panikçi oyuncu felaketi! {player} stres altında yanlış karar verdi, kırmızı kart!',
];

// ═══════════════════════════════════════════════════════════════════
// SAKATLIK YORUM HAVUZLARI
// ═══════════════════════════════════════════════════════════════════

const INJURY_NORMAL: string[] = [
  'Kötü bir görüntü! {player} yerde kaldı. Sağlık ekibi sahaya giriyor.',
  '{player} sakatlandı! Bu takım için büyük bir kayıp olabilir.',
  'Endişelendiren bir sahne... {player} tedavi ediliyor.',
  'Maçın gidişatı değişebilir! {player} sakatlık geçirdi.',
  'Umutlar kırıldı! {player} oyuna devam edemeyecek gibi görünüyor.',
  '{player} yerde acı içinde kıvranıyor... Sağlık ekibi koşarak geliyor.',
  'Sakatlık! {player} topu bıraktı ve yere düştü. Bu kötü görünüyor.',
];

const INJURY_SERIOUS: string[] = [
  '{player} yerde acı içinde kıvranıyor... Bu ciddi görünüyor. Maçtan çıkıyor.',
  'Acı verici bir sahne! {player}\'nin yüzü acıdan çarpıldı. Sedye bekleniyor.',
  'Bu sakatlık sezonu bitirebilir! {player} göz yaşları içinde sahayı terk ediyor.',
  'Ciddi bir sakatlık! {player}\'nin sezonu tehlikede. Sedye sahaya giriyor.',
  'Felaket bir an! {player} ağır bir şekilde sakatlandı. Sağlık ekibi müdahale ediyor.',
];

const INJURY_FRAGILE: string[] = [
  'Yine {player}! Bu oyuncu sakatlıklara çok meyilli. Kırılgan yapısı işte burada ortaya çıkıyor.',
  'Kırılgan mental ve kırılgan fizik! {player} yine sakatlandı.',
  '{player} bir kez daha sakatlık geçiriyor! Bu oyuncunun dayanıklılığı sorgulanır.',
];

// ═══════════════════════════════════════════════════════════════════
// DEĞİŞİKLİK YORUM HAVUZLARI
// ═══════════════════════════════════════════════════════════════════

const SUB_NORMAL: string[] = [
  'Teknik direktör değişikliğe gidiyor. {player} oyuna giriyor.',
  'Taktik bir hamle! {player} sahaya giriyor, takıma yeni bir nefes!',
  'Değişiklik zamanı! {player} oyuna dahil oluyor.',
  '{player} oyuna giriyor! Teknik direktör taktiksel bir hamle yapıyor.',
  'Yeni bir kan! {player} sahanın içine adım atıyor.',
  'Değişiklik geldi! {player} kenar çizgisinde hazır, oyuna girecek.',
];

const SUB_INJURY: string[] = [
  'Sakatlık nedeniyle zorunlu değişiklik! {player} oyuna giriyor.',
  '{player} sakatlanan takım arkadaşının yerine oyuna dahil oluyor.',
  'Zorunlu değişiklik! Sakatlık sonrası {player} devreye giriyor.',
];

const SUB_TACTICAL_LATE: string[] = [
  'Son dakika taktik değişikliği! {player} oyuna giriyor, zaman kazanmak istiyorlar.',
  '{player} devreye giriyor! Teknik direktör zamanı yönetmek istiyor.',
  'Kritik dakikalarda değişiklik! {player} taze kan olarak sahaya giriyor.',
];

// ═══════════════════════════════════════════════════════════════════
// DEVRE ARASI / MAÇ SONU YORUM HAVUZLARI
// ═══════════════════════════════════════════════════════════════════

const HALFTIME_NORMAL: string[] = [
  'İlk yarı sona erdi! Her iki takım da soyunma odasına dönüyor.',
  'Hakem ilk yarıyı bitirdi. İki teknik direktör için kritik bir ara!',
  'İlk 45 dakika geride kaldı. Şimdi taktik değişiklikleri zamanı!',
  'İlk yarı bitti! Taraftarlar ikinci yarıyı sabırsızlıkla bekliyor.',
  'Devre arası! Teknik direktörler taktik tahtasının başında.',
];

const HALFTIME_DERBY: string[] = [
  'Derbinin ilk yarısı bitti! İki takım da soyunma odasında şarj oluyor!',
  'Heyecanlı bir derbi ilk yarısı geride kaldı! İkinci yarı daha da çetin geçecek!',
  'Derbinin ilk 45 dakikası nefes kesti! Devre arası, ama heyecan devam edecek!',
];

const HALFTIME_CUP_FINAL: string[] = [
  'Kupa finalinin ilk yarısı bitti! Tarihi bir maçın ikinci yarısı başlamak üzere!',
  'Finalin ilk yarısı geride! Kupa için savaş devam edecek!',
  'İlk yarıda kupayı kimin alacağı belli değil! İkinci yarı kader anı!',
];

const FULLTIME_NORMAL: string[] = [
  'MAÇ BİTTİ! Hakem son düdüğü çaldı!',
  'Son dakika geride kaldı! Hakem maçı bitirdi.',
  '90 dakika dolu dolu geçti! Karşılaşma sona erdi.',
  'Maç sona erdi! Hakem düdüğünü çaldı ve oyuncular sahayı terk ediyor.',
  'Karşılaşma tamamlandı! Her iki takım da emeklerini verdi.',
];

const FULLTIME_DERBY: string[] = [
  'DERBİ BİTTİ! Şehirde bu gece sessizlik yok! Kazanan belli!',
  'Ezeli rekabetin bu bölümü sona erdi! Kazanan taraftar neşeyle kutluyor!',
  'Derbi tamamlandı! Bu akşam şehrin hakimi kim, artık belli!',
  'Derbinin son düdüğü! Kazanan mutlu, kaybeden daha çok çalışacak!',
];

const FULLTIME_CUP_FINAL: string[] = [
  'FİNAL BİTTİ! Yeni şampiyon belli! Kupayı kaldıran takım tarihe geçiyor!',
  'Kupa finali sona erdi! Zafer çığlıkları stadyumu inletiyor!',
  'Tarihi an! Maç bitti ve kupanın sahibi belli oldu!',
  'Şampiyonluk düdüğü! Bu akşam bir efsane daha doğuyor!',
];

const FULLTIME_DRAW: string[] = [
  'MAÇ BİTTİ! Beraberlikle sona eren bir karşılaşma! İki takım da puan paylaştı.',
  'Son düdük ve beraberlik! İki takım da kazanamadı ama kaybetmedi de.',
  'Karşılaşma berabere bitti! Puanlar bölündü, kimse tam mutlu değil.',
];

// ═══════════════════════════════════════════════════════════════════
// OFSAYT / KORNER YORUM HAVUZLARI
// ═══════════════════════════════════════════════════════════════════

const OFFSIDE_NORMAL: string[] = [
  'Ofsayt! Hakem bayrağını kaldırdı.',
  'Savunma hattı tuzağı çalıştı! Ofsayt kararı.',
  'Hakem ofsayt bayrağını gösterdi. Pozisyon golle sonuçlanmadı.',
  'Çizgide bir adım önde! Ofsayt kararı, pozisyon iptal.',
  'Ofsayt! {player} savunma hattını aşamadı.',
];

const OFFSIDE_TRAP_MASTER: string[] = [
  'Ofsayt ustası savunma yine iş başında! Tuzak kusursuz çalıştı!',
  'Savunma hattı {player}\'nin ofsayt tuzağıyla rakip forveti tuzağa düşürdü!',
  'Kusursuz ofsayt tuzağı! Savunma bir vücut gibi hareket etti!',
];

const CORNER_NORMAL: string[] = [
  'Korner atışı! Tehlikeli bir pozisyon olabilir.',
  'Kaleci topu kornere çevirdi! Kalabalık ceza sahası...',
  'Korner vuruşu kullanılacak. Takım hücum için pozisyon alıyor.',
  'Korner! {teamName} için set piece fırsatı.',
  'Top köşe bayrağının yanında. Korner atışı gelecek!',
];

// ═══════════════════════════════════════════════════════════════════
// GENEL YORUM HAVUZLARI (Maç akışı)
// ═══════════════════════════════════════════════════════════════════

const COMMENTARY_EARLY: string[] = [
  'Maçın temposu henüz düşük. İki takım da birbirini tartıyor.',
  'İlk dakikalarında pas hataları göze çarpıyor. Henüz ısınmadılar.',
  'Taraftarlar heyecanla bekliyor, ama oyun daha orta sahada geçiyor.',
  '{teamName} maça konsantre başlamış görünüyor.',
  'Maç başladı! Her iki takım da ilk fırsatı arıyor.',
  'İlk 20 dakika genellikle temkinli geçer. Bugün de farklı değil.',
];

const COMMENTARY_MID: string[] = [
  'Orta sahada kıran kırana bir mücadele izliyoruz.',
  'Top bir o kalede bir bu kalede, tempo iyice yükseldi.',
  'Müthiş bir pres var sahada! Oyuncular nefes almıyor.',
  'Fiziksel güç bugün maçın belirleyici faktörü olabilir.',
  'Kanatlardan gelen bindirmeler etkili olmaya başladı.',
  'Oyunun kontrolü tamamen orta sahadaki mücadeleye bağlı.',
  'Pas trafiği çok akıcı, {teamName} top paylaşımında etkili.',
  'Savunma oyuncuları birbirlerine çok yakın oynuyor, geçit vermiyor.',
];

const COMMENTARY_LATE: string[] = [
  'Oyuncuların yorgunluk belirtileri göstermeye başladığını görüyoruz.',
  'Maçın bitimine yaklaştıkça heyecan daha da artıyor.',
  'Maçın en kritik dakikalarına giriyoruz.',
  'Yorgunluktan dolayı pas hataları artmaya başladı.',
  'Teknik direktörler her topun can alıcı olduğunun farkında.',
  'Konsantrasyon kaybı yaşanabilir, bu hatalar golle sonuçlanabilir!',
  'Sonsuz bir enerjiyle koşmaya devam ediyorlar, ama bacaklar ağırlaşıyor.',
];

const COMMENTARY_DERBY: string[] = [
  'Derbinin heyecanı sahada hissediliyor! Her top için kıran kırana mücadele!',
  'Ezeli rekabetin ağırlığı oyuncuların üzerinde! Her hata bedel ödetecek!',
  'Taraftarlar çıldırmış durumda! Derbinin atmosferi farklı!',
  'Bu maçta kimse geri adım atmıyor! Derbiler için oynanır!',
  'Sahada dostluk yok, sadece rekabet! Derbinin ateşi yüksek!',
];

const COMMENTARY_CUP: string[] = [
  'Kupa maçı demek, her maç final demek! Kaybetmeye tahammül yok!',
  'Eliminasyon maçlarında hata affedilmez! Her top altın değerinde!',
  'Kupa için oynanan maçlarda yürekler ağza gelir!',
  'Bu maçta kaybeden gider! Oyuncular bunun bilincinde!',
];

// ═══════════════════════════════════════════════════════════════════
// ANA GENERATÖR FONKSİYONU
// ═══════════════════════════════════════════════════════════════════

/**
 * Bağlama ve trait'lere duyarlı maç yorumu üretir.
 *
 * @param ctx Yorum bağlamı (olay tipi, oyuncu, skor, trait'ler vb.)
 * @returns Üretilen yorum metni ve meta verisi
 */
export function generateCommentary(ctx: CommentaryContext): GeneratedCommentary {
  try {
    const player = ctx.playerName || 'Bilinmeyen';
    const minute = ctx.minute;
    const team = ctx.team;
    const traits = ctx.playerTraits || [];
    const negTraits = ctx.playerNegTraits || [];
    const personality = ctx.playerPersonality || [];

    // Template yer değiştirme fonksiyonu
    const fill = (tpl: string): string =>
      tpl
        .replace(/\{player\}/g, player)
        .replace(/\{minute\}/g, String(minute))
        .replace(/\{team\}/g, team === 'HOME' ? 'ev sahibi' : team === 'AWAY' ? 'deplasman' : '')
        .replace(/\{teamName\}/g, teamName(ctx))
        .replace(/\{opponent\}/g, opponentName(ctx))
        .replace(/\{homeTeam\}/g, ctx.homeTeamName || 'Ev Sahibi')
        .replace(/\{awayTeam\}/g, ctx.awayTeamName || 'Deplasman');

    // ─── GOL ───────────────────────────────────────────────────
    if (ctx.eventType === 'GOAL' || ctx.eventType === 'PENALTY_GOAL') {
      let pool: string[] = [];

      // 1. Trait bazlı yorumlar (en yüksek öncelik)
      if (isHatTrick(ctx) && GOAL_HAT_TRICK.length > 0) {
        pool = [...GOAL_HAT_TRICK];
      }
      else if (hasAnyTrait(traits, 'derbi_canavari', 'Derbi canavarı') && isDerby(ctx)) {
        pool = [...GOAL_TRAIT_DERBY_BEAST];
      }
      else if (hasAnyTrait(traits, 'buyuk_mac_oyuncusu', 'Büyük maç oyuncusu') && (isDerby(ctx) || isCup(ctx) || isCrunchTime(ctx))) {
        pool = [...GOAL_TRAIT_BIG_MATCH];
      }
      else if (hasAnyTrait(traits, 'bitirici', 'Bitirici')) {
        pool = [...GOAL_TRAIT_FINISHER];
      }
      else if (hasAnyTrait(traits, 'gol_makinesi', 'Gol makinesi')) {
        pool = [...GOAL_TRAIT_GOAL_MACHINE];
      }
      else if (hasAnyTrait(traits, 'sessiz_suikastci', 'Sessiz suikastçı')) {
        pool = [...GOAL_TRAIT_SILENT_ASSASSIN];
      }
      else if (hasAnyTrait(traits, 'firsatci', 'Fırsatçı')) {
        pool = [...GOAL_TRAIT_OPPORTUNIST];
      }
      else if (hasAnyTrait(traits, 'kontra_canavari', 'Kontra canavarı') && ctx.goalType === 'sprint_finish') {
        pool = [...GOAL_TRAIT_COUNTER_BEAST];
      }
      else if (hasAnyTrait(personality, 'geri_donus_lideri', 'Geri dönüş lideri') && isDraw(ctx) === false && !isLeading(ctx, team)) {
        pool = [...GOAL_TRAIT_COMEBACK];
      }
      // DÜZELTME 6: Lider ve Soğukkanlı trait yorumları
      else if (hasAnyTrait(personality, 'lider', 'Lider')) {
        pool = [...GOAL_TRAIT_LEADER];
      }
      else if (hasAnyTrait(personality, 'sogukkanli', 'Soğukkanlı')) {
        pool = [...GOAL_TRAIT_COMPOSED];
      }
      // 2. Eski takımına gol
      else if (ctx.isFormerPlayer) {
        pool = [...GOAL_FORMER_PLAYER];
      }
      // 3. Gol tipi bazlı
      else if (ctx.goalType === 'header') {
        pool = [...GOAL_HEADER];
      }
      else if (ctx.goalType === 'long_shot') {
        pool = [...GOAL_LONG_SHOT];
      }
      else if (ctx.goalType === 'plase') {
        pool = [...GOAL_PLASE];
      }
      else if (ctx.goalType === 'one_touch') {
        pool = [...GOAL_ONE_TOUCH];
      }
      else if (ctx.goalType === 'sprint_finish') {
        pool = [...GOAL_SPRINT_FINISH];
      }
      else if (ctx.goalType === 'penalty' || ctx.eventType === 'PENALTY_GOAL') {
        pool = [...GOAL_PENALTY];
      }
      else if (ctx.goalType === 'freekick') {
        pool = [...GOAL_FREEKICK];
      }
      else if (ctx.goalType === 'own_goal') {
        pool = [...GOAL_OWN];
      }
      // 4. Maç türü bazlı
      else if (isCupFinal(ctx)) {
        pool = [...GOAL_CUP_FINAL];
      }
      else if (isDerby(ctx)) {
        pool = [...GOAL_DERBY];
      }
      // 5. Zaman bazlı
      else if (isVeryLate(ctx)) {
        pool = [...GOAL_LATE];
      }
      else if (isLate(ctx)) {
        pool = [...GOAL_LATE, ...GOAL_NORMAL];
      }
      // 6. Normal gol
      else {
        pool = [...GOAL_NORMAL];
      }

      // Ekstra: Büyük maç oyuncusu + derbi/kupa → trait yorumu ile birleştir
      if (hasAnyTrait(traits, 'buyuk_mac_oyuncusu', 'Büyük maç oyuncusu') && (isDerby(ctx) || isCup(ctx)) && pool !== GOAL_TRAIT_BIG_MATCH) {
        // %40 ihtimalle trait vurgusunu ekle
        if (Math.random() < 0.4) {
          const traitSuffix = pick(GOAL_TRAIT_BIG_MATCH);
          return {
            text: fill(pick(pool)) + ' ' + fill(traitSuffix).replace(/^.*?!\s*/, '').toLowerCase(),
            intensity: isVeryLate(ctx) ? 5 : isLate(ctx) ? 4 : isDerby(ctx) || isCupFinal(ctx) ? 4 : 3,
            category: 'goal',
          };
        }
      }

      return {
        text: fill(pick(pool)),
        intensity: isVeryLate(ctx) ? 5 : isLate(ctx) ? 4 : isDerby(ctx) || isCupFinal(ctx) ? 4 : isHatTrick(ctx) ? 5 : 3,
        category: 'goal',
      };
    }

    // ─── KENDİ KALESİNE GOL ────────────────────────────────────
    if (ctx.eventType === 'OWN_GOAL') {
      return {
        text: fill(pick(GOAL_OWN)),
        intensity: 4,
        category: 'goal',
      };
    }

    // ─── SARI KART ─────────────────────────────────────────────
    if (ctx.eventType === 'YELLOW') {
      let pool: string[] = [];

      if (hasAnyTrait(negTraits, 'kart_manyagi', 'Kart manyağı')) {
        pool = [...YELLOW_CARD_MAGGOT];
      }
      else if (hasAnyTrait(traits, 'agresif', 'Agresif')) {
        pool = [...YELLOW_AGGRESSIVE, ...YELLOW_NORMAL];
      }
      else if (ctx.detail?.toLowerCase().includes('taktik') || ctx.detail?.toLowerCase().includes('tactical')) {
        pool = [...YELLOW_TACTICAL, ...YELLOW_NORMAL];
      }
      else {
        pool = [...YELLOW_NORMAL];
      }

      return {
        text: fill(pick(pool)),
        intensity: 2,
        category: 'card',
      };
    }

    // ─── KIRMIZI KART ──────────────────────────────────────────
    if (ctx.eventType === 'RED') {
      let pool: string[] = [];

      if (hasAnyTrait(personality, 'panikci', 'Panikçi')) {
        pool = [...RED_PANICKER, ...RED_NORMAL];
      }
      else if (hasAnyTrait(traits, 'agresif', 'Agresif')) {
        pool = [...RED_AGGRESSIVE, ...RED_NORMAL];
      }
      else {
        pool = [...RED_NORMAL];
      }

      return {
        text: fill(pick(pool)),
        intensity: 5,
        category: 'card',
      };
    }

    // ─── İKİNCİ SARI → KIRMIZI ────────────────────────────────
    if (ctx.eventType === 'SECOND_YELLOW') {
      return {
        text: fill(pick(RED_SECOND_YELLOW)),
        intensity: 4,
        category: 'card',
      };
    }

    // ─── SAKATLIK ──────────────────────────────────────────────
    if (ctx.eventType === 'INJURY') {
      let pool: string[] = [];

      if (hasAnyTrait(personality, 'kirilgan_mental', 'Kırılgan mental') || hasAnyTrait(negTraits, 'kirilgan', 'Kırılgan')) {
        pool = [...INJURY_FRAGILE, ...INJURY_NORMAL];
      }
      else if (ctx.detail?.toLowerCase().includes('ciddi') || ctx.detail?.toLowerCase().includes('serious')) {
        pool = [...INJURY_SERIOUS, ...INJURY_NORMAL];
      }
      else {
        pool = [...INJURY_NORMAL];
      }

      return {
        text: fill(pick(pool)),
        intensity: 3,
        category: 'injury',
      };
    }

    // ─── DEĞİŞİKLİK ────────────────────────────────────────────
    if (ctx.eventType === 'SUB') {
      let pool: string[] = [];

      if (ctx.detail?.toLowerCase().includes('sakat') || ctx.detail?.toLowerCase().includes('injury')) {
        pool = [...SUB_INJURY, ...SUB_NORMAL];
      }
      else if (isLate(ctx)) {
        pool = [...SUB_TACTICAL_LATE, ...SUB_NORMAL];
      }
      else {
        pool = [...SUB_NORMAL];
      }

      return {
        text: fill(pick(pool)),
        intensity: 1,
        category: 'sub',
      };
    }

    // ─── DEVRE ARASI ───────────────────────────────────────────
    if (ctx.eventType === 'HALFTIME') {
      let pool: string[] = [];

      if (isCupFinal(ctx)) {
        pool = [...HALFTIME_CUP_FINAL, ...HALFTIME_NORMAL];
      }
      else if (isDerby(ctx)) {
        pool = [...HALFTIME_DERBY, ...HALFTIME_NORMAL];
      }
      else {
        pool = [...HALFTIME_NORMAL];
      }

      return {
        text: fill(pick(pool)),
        intensity: 2,
        category: 'halftime',
      };
    }

    // ─── MAÇ SONU ──────────────────────────────────────────────
    if (ctx.eventType === 'FULLTIME') {
      let pool: string[] = [];

      if (isCupFinal(ctx)) {
        pool = [...FULLTIME_CUP_FINAL, ...FULLTIME_NORMAL];
      }
      else if (isDerby(ctx)) {
        pool = [...FULLTIME_DERBY, ...FULLTIME_NORMAL];
      }
      else if (isDraw(ctx)) {
        pool = [...FULLTIME_DRAW, ...FULLTIME_NORMAL];
      }
      else {
        pool = [...FULLTIME_NORMAL];
      }

      return {
        text: fill(pick(pool)),
        intensity: isCupFinal(ctx) ? 5 : isDerby(ctx) ? 4 : 2,
        category: 'fulltime',
      };
    }

    // ─── OFSAYT ────────────────────────────────────────────────
    if (ctx.eventType === 'OFFSIDE') {
      let pool: string[] = [];

      if (hasAnyTrait(traits, 'ofsayt_ustasi', 'Ofsayt ustası')) {
        pool = [...OFFSIDE_TRAP_MASTER, ...OFFSIDE_NORMAL];
      }
      else {
        pool = [...OFFSIDE_NORMAL];
      }

      return {
        text: fill(pick(pool)),
        intensity: 1,
        category: 'commentary',
      };
    }

    // ─── KORNER ────────────────────────────────────────────────
    if (ctx.eventType === 'CORNER') {
      return {
        text: fill(pick(CORNER_NORMAL)),
        intensity: 1,
        category: 'commentary',
      };
    }

    // ─── GENEL YORUM (COMMENTARY) ──────────────────────────────
    if (ctx.eventType === 'COMMENTARY') {
      let pool: string[] = [];

      if (isDerby(ctx)) {
        pool = [...COMMENTARY_DERBY];
      }
      else if (isCup(ctx)) {
        pool = [...COMMENTARY_CUP];
      }

      // Zaman bazlı
      if (isEarly(ctx)) {
        pool = [...pool, ...COMMENTARY_EARLY];
      }
      else if (isLate(ctx)) {
        pool = [...pool, ...COMMENTARY_LATE];
      }
      else {
        pool = [...pool, ...COMMENTARY_MID];
      }

      // Eğer motor tarafından metin geldiyse, onu zenginleştir
      if (ctx.detail && ctx.detail.trim().length > 10) {
        // Motor yorumunu olduğu gibi döndür ama matchType vurgusu ekle
        if (isDerby(ctx) && Math.random() < 0.3) {
          return {
            text: fill(pick(COMMENTARY_DERBY)) + ' ' + ctx.detail,
            intensity: 2,
            category: 'commentary',
          };
        }
        return {
          text: ctx.detail,
          intensity: 1,
          category: 'commentary',
        };
      }

      return {
        text: fill(pick(pool.length > 0 ? pool : COMMENTARY_MID)),
        intensity: 1,
        category: 'commentary',
      };
    }

    // ─── FALLBACK ──────────────────────────────────────────────
    return {
      text: ctx.detail || fill('{minute}. dakika - maç devam ediyor.'),
      intensity: 1,
      category: 'commentary',
    };
  } catch (err) {
    console.error('[matchCommentaryGenerator] generateCommentary error:', err);
    return {
      text: ctx.detail || `${ctx.minute}' - maç devam ediyor.`,
      intensity: 1,
      category: 'commentary',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAÇ ÖNCESİ / SONRASI YORUM ÜRETİCİLERİ
// ═══════════════════════════════════════════════════════════════════

const PRE_MATCH_DERBY: string[] = [
  'Derbi günü geldi! Şehir ikiye bölündü, taraftarlar saatlerdir stadyumda!',
  'Ezeli rekabetin yeni bölümü! Bugün kimin şehri olduğunu göreceğiz!',
  'Derbi heyecanı dorukta! Formalar, bayraklar, çalgılar... Atmosfer muazzam!',
  'Derbinin ağırlığı oyuncuların omuzlarında! Bu maç sadece 3 puan değil!',
];

const PRE_MATCH_CUP: string[] = [
  'Kupa maçı! Kaybeden gider, kazanan yürür! Oyuncular bunun bilincinde!',
  'Eliminasyon gecesi! Her top altın değerinde, her hata bedel ödetecek!',
  'Kupa için mücadele başlıyor! Bu maçta geri dönüş yok!',
];

const PRE_MATCH_CUP_FINAL: string[] = [
  'FİNAL GÜNÜ! Kupa için son adım! Tarihi bir akşam bizi bekliyor!',
  'Şampiyonluk maçı! 90 dakika ya da uzatmalar sonunda kupayı kaldıran belli olacak!',
  'Final heyecanı! Tüm sezon bu maç için! Oyuncular tarihe yazılmak için sahaya çıkıyor!',
  'Bütün sezonun emeği bu 90 dakikaya sığdı! Kupa finali başlıyor!',
];

const PRE_MATCH_NORMAL: string[] = [
  'Maç başlamak üzere! Taraftarlar tribünlerde yerini aldı.',
  'İki takım da sahaya çıkıyor! Heyecanlı bir 90 dakika bizi bekliyor.',
  'Hakem düdüğü çalmak üzere! Maçın temposu nasıl olacak, göreceğiz.',
  'Saha hazır, oyuncular hazır! Maç başlıyor!',
];

/**
 * Maç öncesi yorum üretir.
 */
export function generatePreMatchCommentary(ctx: CommentaryContext): GeneratedCommentary {
  const fill = (tpl: string): string =>
    tpl
      .replace(/\{homeTeam\}/g, ctx.homeTeamName || 'Ev Sahibi')
      .replace(/\{awayTeam\}/g, ctx.awayTeamName || 'Deplasman');

  let pool: string[] = PRE_MATCH_NORMAL;

  if (isCupFinal(ctx)) pool = [...PRE_MATCH_CUP_FINAL, ...PRE_MATCH_NORMAL];
  else if (isDerby(ctx)) pool = [...PRE_MATCH_DERBY, ...PRE_MATCH_NORMAL];
  else if (isCup(ctx)) pool = [...PRE_MATCH_CUP, ...PRE_MATCH_NORMAL];

  return {
    text: fill(pick(pool)),
    intensity: isCupFinal(ctx) ? 3 : isDerby(ctx) ? 3 : 2,
    category: 'special',
  };
}

/**
 * Skor durumuna göre ara yorum üretir (maç akışında periyodik).
 */
export function generateScoreContextCommentary(
  homeScore: number,
  awayScore: number,
  minute: number,
  matchType?: MatchType,
  homeTeamName?: string,
  awayTeamName?: string
): GeneratedCommentary {
  const diff = homeScore - awayScore;
  const isDerbyMatch = matchType === 'derby';
  const isCupMatch = matchType === 'cup' || matchType === 'cup_final';

  const home = homeTeamName || 'Ev Sahibi';
  const away = awayTeamName || 'Deplasman';

  if (Math.abs(diff) >= 3) {
    const leading = diff > 0 ? home : away;
    const templates = [
      `Fark gittikçe açılıyor! ${leading} rahat bir avantajla önde.`,
      `Skor tablosu ${leading} lehine döndü! Rakip çaresiz görünüyor.`,
      `${leading} adeta maçtan kopmuş durumda! Bu fark kapanır mı?`,
      `Taraftarlar sevinçten çıldırıyor! ${leading} maçın hakimi!`,
    ];
    return { text: pick(templates), intensity: 3, category: 'commentary' };
  }

  if (Math.abs(diff) === 2 && minute >= 70) {
    const leading = diff > 0 ? home : away;
    const trailing = diff > 0 ? away : home;
    const templates = [
      `${leading} iki gol önde ama ${trailing} pes etmiyor! Hâlâ şans var.`,
      `İki gol fark var! ${trailing} geri dönüş için mücadele ediyor.`,
      `${leading} rahat değil, ${trailing} gol arıyor! Maç bitmedi daha!`,
    ];
    return { text: pick(templates), intensity: 2, category: 'commentary' };
  }

  if (diff === 0 && minute >= 60) {
    const templates = [
      'Beraberlik! İki takım da galibiyet golünü arıyor.',
      'Skor eşit! Kim önce atarsa maçı alabilir!',
      isDerbyMatch ? 'Derbide beraberlik! Her an bir gol gelebilir!' : '',
      isCupMatch ? 'Kupada beraberlik! Uzatma ihtimali gündemde!' : '',
    ].filter(Boolean) as string[];
    return { text: pick(templates), intensity: 2, category: 'commentary' };
  }

  if (Math.abs(diff) === 1 && minute >= 75) {
    const leading = diff > 0 ? home : away;
    const templates = [
      `Tek gol fark! ${leading} maçı korumaya çalışıyor.`,
      'Bir gol farkla oynanıyor! Her pozisyon altın değerinde!',
      isDerbyMatch ? 'Derbide tek gol fark! Her şey olabilir!' : '',
    ].filter(Boolean) as string[];
    return { text: pick(templates), intensity: 2, category: 'commentary' };
  }

  return {
    text: pick(COMMENTARY_MID),
    intensity: 1,
    category: 'commentary',
  };
}

/**
 * Maçın önem derecesini metin olarak döndürür.
 */
export function getMatchTypeLabel(matchType?: MatchType): string {
  switch (matchType) {
    case 'derby': return 'Derbi';
    case 'cup': return 'Kupa Maçı';
    case 'cup_final': return 'Kupa Finali';
    case 'friendly': return 'Hazırlık Maçı';
    case 'normal': return 'Lig Maçı';
    default: return 'Maç';
  }
}

/**
 * Intensity'ye göre animasyon süresi döndürür.
 */
export function getAnimationDuration(intensity: number): number {
  switch (intensity) {
    case 5: return 0.6;
    case 4: return 0.5;
    case 3: return 0.4;
    case 2: return 0.3;
    default: return 0.25;
  }
}

/**
 * Intensity'ye göre CSS scale efekti döndürür.
 */
export function getIntensityScale(intensity: number): number {
  switch (intensity) {
    case 5: return 1.02;
    case 4: return 1.01;
    default: return 1.0;
  }
}
