// ─── Antrenman Programları ─────────────────────────────────────────────────
// allowedPositions: hangi gruplar bu programı kullanabilir
//   'ALL' = hepsi, 'GK' = sadece kaleci, 'FIELD' = kaleci hariç
//   veya spesifik: ['DEF','MID'] vb.
// intensity: 1-100 arası antrenman yoğunluğu (gain çarpanı)
// condCost: antrenman sonrası kondisyon kaybı (negatif = kazanç)
export const TRAINING_PROGRAMS = [
  {
    id: 'fiziksel_yukleme',
    name: 'Fiziksel Yükleme',
    description: 'Dayanıklılık, güç ve hız odaklı kondisyon kampı.',
    targetStats: ['stamina', 'power', 'speed'],
    allowedPositions: 'FIELD' as const,
    intensity: 80,
    condCost: -12,
    color: 'red',
    icon: '💪',
  },
  {
    id: 'teknik_driller',
    name: 'Teknik Driller',
    description: 'Pas kalitesi, top kontrolü ve vizyon geliştirme.',
    targetStats: ['passing', 'control', 'vision'],
    allowedPositions: 'FIELD' as const,
    intensity: 70,
    condCost: -6,
    color: 'blue',
    icon: '🎯',
  },
  {
    id: 'savunma_okulu',
    name: 'Savunma Okulu',
    description: 'Pozisyon alma, markaj disiplini ve savunma.',
    targetStats: ['defending', 'vision', 'power'],
    allowedPositions: ['DEF', 'MID'] as string[],
    intensity: 75,
    condCost: -8,
    color: 'green',
    icon: '🛡️',
  },
  {
    id: 'bitiricilik_kampi',
    name: 'Bitiricilik Kampı',
    description: 'Ceza sahası etkinliği, şut gücü ve hız.',
    targetStats: ['shooting', 'control', 'speed'],
    allowedPositions: ['MID', 'FWD'] as string[],
    intensity: 85,
    condCost: -10,
    color: 'amber',
    icon: '⚽',
  },
  {
    id: 'kaleci_antrenmani',
    name: 'Kaleci Antrenmanı',
    description: 'Kalecilik, refleksler ve konsantrasyon. Sadece kaleciler.',
    targetStats: ['goalkeeping', 'reflexes', 'concentration'],
    allowedPositions: 'GK' as const,
    intensity: 80,
    condCost: -8,
    color: 'cyan',
    icon: '🧤',
  },
  {
    id: 'set_parcasi',
    name: 'Set Parçası Çalışması',
    description: 'Korner, frikik ve penaltı senaryoları. Kafa ve pas isabeti.',
    targetStats: ['vision', 'passing', 'heading'],
    allowedPositions: 'FIELD' as const,
    intensity: 55,
    condCost: -4,
    color: 'purple',
    icon: '📐',
  },
  {
    id: 'zihinsel_hazirlik',
    name: 'Zihinsel Hazırlık',
    description: 'Karar alma, soğukkanlılık ve konsantrasyon. Düşük kondisyon maliyeti.',
    targetStats: ['decisions', 'composure', 'concentration'],
    allowedPositions: 'ALL' as const,
    intensity: 45,
    condCost: -2,
    color: 'indigo',
    icon: '🧠',
  },
  {
    id: 'kondisyon_toparlanma',
    name: 'Kondisyon & Toparlanma',
    description: 'Aktif toparlanma. Sakatlık riski azalır, kondisyon hızla geri gelir.',
    targetStats: ['stamina'],
    allowedPositions: 'ALL' as const,
    intensity: 30,
    condCost: 20,   // kondisyon KAZANIR
    color: 'emerald',
    icon: '🔋',
  },
  {
    id: 'takim_kimyasi',
    name: 'Takım Kimyası',
    description: 'Kombine çalışmalar, iletişim ve takım ruhu. Moral ve kimya artar.',
    targetStats: ['teamwork', 'vision'],
    allowedPositions: 'ALL' as const,
    intensity: 50,
    condCost: -3,
    color: 'orange',
    icon: '🤝',
    specialEffect: 'chemistry_boost' as const,
  },
  {
    id: 'pozisyon_adaptasyonu',
    name: 'Pozisyon Adaptasyonu',
    description: 'Yan pozisyon için özel çalışma. Yeni mevkiye alışma hızı artar.',
    targetStats: ['positioning', 'decisions', 'stamina'],
    allowedPositions: 'FIELD' as const,
    intensity: 60,
    condCost: -7,
    color: 'yellow',
    icon: '🔄',
    specialEffect: 'position_adapt' as const,
  },
] as const;

export type TrainingProgram = typeof TRAINING_PROGRAMS[number];

/**
 * Antrenman programı ID eşlemesi: eski Türkçe ID → yeni İngilizce ID.
 * DB'deki eski verilerle geriye uyumluluk için.
 * Yeni kodlar İngilizce ID'leri kullanmalıdır.
 * NOT: DB migration tamamlandığında eski Türkçe ID'ler kaldırılabilir.
 */
export const TRAINING_ID_ESLEME: Record<string, string> = {
  'fiziksel_yukleme': 'physical_loading',
  'teknik_driller': 'technical_drills',
  'savunma_okulu': 'defensive_school',
  'bitiricilik_kampi': 'finishing_camp',
  'kaleci_antrenmani': 'goalkeeper_training',
  'set_parcasi': 'set_pieces',
  'zihinsel_hazirlik': 'mental_preparation',
  'kondisyon_toparlanma': 'conditioning_recovery',
  'takim_kimyasi': 'team_chemistry',
  'pozisyon_adaptasyonu': 'position_adaptation',
};

/**
 * Antrenman ID'sini standartlaştırır: eski Türkçe ID'leri yeni İngilizce ID'lere çevirir.
 * Zaten İngilizce olan ID'leri olduğu gibi döndürür.
 */
export function antrenmanIdDonustur(id: string): string {
  return TRAINING_ID_ESLEME[id] || id;
}

export const INITIAL_TEAM_NAME = 'Touchline FC';
export const STARTING_MONEY = 10_000_000;

// ═══════════════════════════════════════════════════
//  RASTGELE TAKIM İSİMLERİ BANKI (50+ isim)
//  Gerçek futbolcu isimleri YOK, tamamen kurgusal
// ═══════════════════════════════════════════════════

export const TEAM_NAME_BANK: string[] = [
  // ─── Şehir/Bölge Temalı ─────────────────────
  'Anadolu Gücü', 'Ege Fırtınası', 'Karadeniz Yıldızı', 'Akdeniz Dalga',
  'İç Anadolu Kartalı', 'Marmara Rüzgarı', 'Doğu Anadolu Ateşi',
  'Güneydoğu Güneşi', 'Trakya Birlik', 'Boğaz Korelasi',
  // ─── FC / United / City Format ───────────────
  'FC Random 42', 'Spor Kulübü 17', 'United Anka', 'City Perspektif',
  'FC Volkan', 'United Çelik', 'City Horizon', 'FC Dayanışma',
  // ─── Doğa/Unsur Temalı ──────────────────────
  'Demir Fırtına', 'Altın Ayak', 'Gümüş Kanat', 'Bakır Kale',
  'Volkan Spor', 'Buz Kılıcı', 'Ateş Çemberi', 'Rüzgar Süpürücü',
  'Fırtına Kuşu', 'Güneş Kulesi', 'Yıldırım Ordu', 'Şimşek Gücü',
  // ─── Hayvan Sembol ──────────────────────────
  'Kartal Yuvası', 'Aslan Yüreği', 'Bozkurt FK', 'Çita Hızı',
  'Panter Spor', 'Doğan Akademi', 'Atmaca Birlik', 'Karga Şaşkınlık',
  // ─── Soyut/Kavram ──────────────────────────
  'Zirve Peşinde', 'Ufuk Ötesi', 'Vadi Yıldızı', 'Ova Birliği',
  'Tepe Kuşatı', 'Sahil Güvenliği', 'Liman Feneri', 'Adalet FK',
  // ─── Renk Temalı ───────────────────────────
  'Siyah Şimşek', 'Beyaz Fırtına', 'Kırmızı Kale', 'Yeşilova SK',
  'Mavi Cephane', 'Turuncu Güç', 'Mor Yıldız', 'Gri Duvar',
  // ─── Rakamlı / Retro ───────────────────────
  'Spor 1923', 'FK 57', 'United 38', 'City 74',
  'FC 91', 'Birlik 1905', 'Güç 1961', 'Yıldız 2010',
  // ─── Yedek (genişletilebilir) ──────────────
  'Yeni Ufuklar', 'Işık Yolu', 'Gelecek FK', 'Kömür Madeni',
  'Çelik Fabrikası', 'İpek Yolu SK', 'Bahar Canlılığı', 'Son Kale',
];

// Bank'tan rastgele benzersiz isim seçer (tekrarsız)
export function getRandomTeamNames(count: number, excludeNames: string[] = []): string[] {
  const available = TEAM_NAME_BANK.filter(n => !excludeNames.includes(n));
  const selected: string[] = [];
  const used = new Set<string>(excludeNames);

  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length);
    const name = available[idx];
    if (!used.has(name)) {
      selected.push(name);
      used.add(name);
    }
    available.splice(idx, 1);
  }

  // Havuz yetersizse fallback: "FC Random XXX" formatı
  while (selected.length < count) {
    const fallback = `FC Random ${Math.floor(Math.random() * 900) + 100}`;
    if (!used.has(fallback)) {
      selected.push(fallback);
      used.add(fallback);
    }
  }

  return selected;
}

// ═══════════════════════════════════════════════════
//  LİG TAKIM İSİMLERİ HAVUZU
//  Her lig seviyesi için yeterli isim ( departman başına 18 )
// ═══════════════════════════════════════════════════

export const TIER_TEAM_NAMES: Record<number, string[]> = {
  1: [
    'Anadolu Gücü', 'Kartal Yuvası', 'Aslan Yüreği', 'Demir Fırtına',
    'Altın Ayak', 'Şimşek Gücü', 'Zirve Peşinde', 'Volkan Spor',
    'Bozkurt FK', 'Güneş Kulesi', 'Fırtına Kuşu', 'Siyah Şimşek',
    'Yıldırım Ordu', 'Spor 1923', 'Çelik Fabrikası', 'Mavi Cephane',
    'Sahil Güvenliği', 'Ateş Çemberi',
  ],
  2: [
    'Ege Fırtınası', 'Gümüş Kanat', 'Çita Hızı', 'Bakır Kale',
    'Buz Kılıcı', 'Doğan Akademi', 'Ufuk Ötesi', 'Yeşilova SK',
    'Liman Feneri', 'FK 57', 'İpek Yolu SK', 'Panter Spor',
    'Kırmızı Kale', 'Vadi Yıldızı', 'Atmaca Birlik', 'Rüzgar Süpürücü',
    'Adalet FK', 'Ova Birliği',
  ],
  3: [
    'Karadeniz Yıldızı', 'Akdeniz Dalga', 'İç Anadolu Kartalı', 'Marmara Rüzgarı',
    'Doğu Anadolu Ateşi', 'Güneydoğu Güneşi', 'Trakya Birlik', 'Boğaz Korelasi',
    'FC Random 42', 'Spor Kulübü 17', 'United Anka', 'City Perspektif',
    'Karga Şaşkınlık', 'Turuncu Güç', 'Mor Yıldız', 'Gri Duvar',
    'United 38', 'City 74',
  ],
  4: [
    // Departman 1
    'FC Volkan', 'United Çelik', 'City Horizon', 'FC Dayanışma',
    'Tepe Kuşatı', 'Son Kale', 'Yeni Ufuklar', 'Işık Yolu',
    'Gelecek FK', 'Kömür Madeni', 'Bahar Canlılık', 'FC 91',
    'Birlik 1905', 'Güç 1961', 'Yıldız 2010', 'Beyaz Fırtına',
    'Kale Duvarı', 'Savunma Hattı',
    // Departman 2
    'Savun Kalesi', 'Atak Birlik', 'Kontra FC', 'Pres Gücü',
    'Orta Saha HK', 'Kanat Açılımı', 'Derin Koşu SK', 'Baskı United',
    'Çevik FK', 'Dayanıklı Spor', 'Hızlı Counter', 'Sabit Pozisyon',
    'Geniş Alan', 'Dar Alan City', 'Serbest Vuruş FK', 'Penaltı Ustası',
    'Taç Atışı SK', 'Korner Birliği',
    // Departman 3
    'Akademi 1', 'Akademi 2', 'Akademi 3', 'Akademi 4',
    'Akademi 5', 'Akademi 6', 'Akademi 7', 'Akademi 8',
    'Akademi 9', 'Akademi 10', 'Akademi 11', 'Akademi 12',
    'Akademi 13', 'Akademi 14', 'Akademi 15', 'Akademi 16',
    'Akademi 17', 'Akademi 18',
    // Departman 4
    'Stadyum 1', 'Stadyum 2', 'Stadyum 3', 'Stadyum 4',
    'Stadyum 5', 'Stadyum 6', 'Stadyum 7', 'Stadyum 8',
    'Stadyum 9', 'Stadyum 10', 'Stadyum 11', 'Stadyum 12',
    'Stadyum 13', 'Stadyum 14', 'Stadyum 15', 'Stadyum 16',
    'Stadyum 17', 'Stadyum 18',
    // Departman 5
    'Yedek 1', 'Yedek 2', 'Yedek 3', 'Yedek 4',
    'Yedek 5', 'Yedek 6', 'Yedek 7', 'Yedek 8',
    'Yedek 9', 'Yedek 10', 'Yedek 11', 'Yedek 12',
    'Yedek 13', 'Yedek 14', 'Yedek 15', 'Yedek 16',
    'Yedek 17', 'Yedek 18',
  ],
};

// Verilen lig seviyesi ve departman indeksi için 18 takım ismi döndürür
// Eğer departman havuzu yetersizse TEAM_NAME_BANK'tan rastgele çeker
// NOT: 1-3. ligler TEK GRUP — departmentIndex her zaman 1 olmalı
//      Sadece 4. lig ve üstü birden fazla bölüm alabilir
export function getTeamNamesForDepartment(tier: number, departmentIndex: number): string[] {
  // 1-3. liglerde sadece 1 bölüm var
  if (tier >= 1 && tier <= 3 && departmentIndex > 1) {
    console.warn(`[getTeamNamesForDepartment] ${tier}. Lig tek gruplu — departmentIndex=1 olarak düzeltildi`);
    departmentIndex = 1;
  }
  const pool = TIER_TEAM_NAMES[tier] || TIER_TEAM_NAMES[4] || [];
  const start = (departmentIndex - 1) * 18; // departmentIndex 1-based
  let names = pool.slice(start, start + 18);
  
  // Havuz yetersizse TEAM_NAME_BANK'tan rastgele tamamla
  if (names.length < 18) {
    const existingNames = [...names];
    const randomExtra = getRandomTeamNames(18 - names.length, existingNames);
    names = [...names, ...randomExtra];
  }
  
  return names;
}

// ═══════════════════════════════════════════════════
//  OYUN GENEL SABİTLERİ
//  Tüm API route'ları ve modüller arasında paylaşılan
// ═══════════════════════════════════════════════════

// ─── Kiralama Komisyonu ────────────────────────────────────────────
/** Kiralama teklifi gönderirken kesilen komisyon (Kredi) */
export const RENTAL_COMMISSION_KR = 10;

// ─── Kayıt Başlangıç Değerleri ─────────────────────────────────────
export const BASE_MONEY = 100_000_000;       // 100M €
export const BASE_CREDITS = 250;
export const BASE_REPUTATION = 30;
export const BASE_ACADEMY_LEVEL = 1;

// ─── Felsefe Bonusları ─────────────────────────────────────────────
export const PHILOSOPHY_BONUSES = {
  financial: { moneyBonus: 50_000_000 },     // +50M €
  legend: { creditsBonus: 250 },              // +250 kredi (toplam 500)
  youth: { academyLevel: 3 },                 // Lv.3 akademi
  squad: { qualityMod: 1.1 },                 // +%10 kadro kalitesi
  reputation: { reputationBonus: 20 },        // +20 itibar (toplam 50)
  balanced: {},                               // Bonus yok
} as const;

// ─── Sezon Ayarları ────────────────────────────────────────────────
export const TEAMS_PER_LEAGUE = 18;
export const MAX_WEEKS_PER_SEASON = 34;

// ─── Enflasyon Sistemi ─────────────────────────────────────────────
export const BASE_INFLATION_RATE = 0.08;        // yıllık %8 enflasyon
export const MAX_INFLATION_MULTIPLIER = 3.0;    // maksimum 3x (Sezon 1 fiyatının 3 katı)
export const MIN_INFLATION_MULTIPLIER = 1.0;    // Sezon 1'de çarpan 1.0

// Sezon başı lig baz bütçeleri (enflasyon çarpanı ile çarpılır)
export const TIER_BASE_BUDGETS: Record<number, number> = {
  1: 20_000_000,   // Süper Lig: 20M baz
  2: 10_000_000,   // 1. Lig: 10M
  3: 5_000_000,    // 2. Lig: 5M
  4: 2_000_000,    // 3. Lig: 2M
};

// Tesis yükseltme baz maliyetleri (enflasyon çarpanı ile çarpılır)
export const FACILITY_BASE_COSTS = {
  stadium_capacity: 500_000,
  training_facility: 300_000,
  youth_academy: 200_000,
  scout_slot: 150_000,
  // Var olan sistemdeki genel tesis yükseltme maliyeti
  generic_upgrade: 250_000,
};

// ─── DB Sağlık Kontrolü ────────────────────────────────────────────
/** DB bağlantı kontrolü aralığı (ms) — 5 dakika */
export const DB_HEALTH_CHECK_INTERVAL = 300_000;

// ─── Formasyon Modifikatörleri ──────────────────────────────────────
// Her formasyonun hücum, orta saha ve savunma ağırlık çarpanları.
// enhancedMatchEngine'deki calculateTeamStrength() tarafından kullanılır.
export const FORMATION_MODS: Record<string, { attack: number; midfield: number; defense: number }> = {
  '4-4-2':   { attack: 1.0,  midfield: 1.0,  defense: 1.0  },
  '4-3-3':   { attack: 1.12, midfield: 0.95, defense: 0.97 },
  '4-5-1':   { attack: 0.90, midfield: 1.12, defense: 1.02 },
  '4-2-3-1': { attack: 1.05, midfield: 1.06, defense: 0.96 },
  '3-5-2':   { attack: 1.05, midfield: 1.08, defense: 0.94 },
  '3-4-3':   { attack: 1.15, midfield: 0.96, defense: 0.88 },
  '5-3-2':   { attack: 0.97, midfield: 0.96, defense: 1.14 },
  '5-4-1':   { attack: 0.85, midfield: 1.0,  defense: 1.18 },
  '4-1-4-1': { attack: 0.95, midfield: 1.10, defense: 1.00 },
  '4-4-1-1': { attack: 1.04, midfield: 1.02, defense: 0.98 },
};

// ═══════════════════════════════════════════════════
//  MAÇ MOTORU SABİTLERİ (MATCH ENGINE CONSTANTS)
//  enhancedMatchEngine.ts tarafından kullanılan tüm
//  sabitler burada merkezi olarak yönetilir.
// ═══════════════════════════════════════════════════

// ─── Moral / Form / Kondisyon Ağırlıkları ──────────────────────────────
/** Moral/form/kondisyon modifiyeri: taban = BASE, değişken = VAR */
export const STAT_MOD_BASE = 0.7;
export const STAT_MOD_VAR = 0.3;

// ─── Takım Gücü Ağırlıkları (Overall hesaplama) ────────────────────────
/** Hücum, orta saha, savunma ve kaleci ağırlıkları (3 yerde tekrarlanıyordu) */
export const OVERALL_WEIGHT_ATTACK = 0.3;
export const OVERALL_WEIGHT_MIDFIELD = 0.3;
export const OVERALL_WEIGHT_DEFENSE = 0.25;
export const OVERALL_WEIGHT_GK = 0.15;

// ─── Taktik Modifikatörleri ────────────────────────────────────────────
export const TACTIC_MENTALITY_BONUS = 0.05;      // Mentality >= 4 bonus per point above 3
export const TACTIC_MENTALITY_PENALTY = 0.03;    // Mentality <= 2 penalty per point below 3
export const TACTIC_PRESSING_BONUS = 0.04;        // Pressing bonus
export const TACTIC_HIGH_INTENSITY_BONUS = 0.06;  // High intensity bonus
export const TACTIC_LOW_INTENSITY_PENALTY = 0.04; // Low intensity penalty
export const TACTIC_AGGRESSION_SCALE = 0.0004;    // Aggression scaling factor
export const TACTIC_AGGRESSION_BASELINE = 50;      // Aggression baseline

// ─── Ek Taktik Modifikatörleri (P1: 10 eksik ayar entegrasyonu) ────────────
// Slider'lar 0-100 → merkezi 50 referanslı, ±0.20 max etki
export const TACTIC_WIDTH_SCALE = 0.0030;         // width 100 = +0.30 crossing/wide attack, width 0 = -0.15
export const TACTIC_WIDTH_BASELINE = 50;
export const TACTIC_PASSING_INTENSITY_SCALE = 0.0025;  // passingIntensity 100 = +%25 pas hızı, 0 = -%12
export const TACTIC_PASSING_INTENSITY_BASELINE = 50;
export const TACTIC_LINE_HEIGHT_SCALE = 0.0030;   // lineHeight 100 = +%30 ofsayt tuzağı + risk; 0 = -%15
export const TACTIC_LINE_HEIGHT_BASELINE = 50;

// Toggle sabitleri — tek seferlik bonus/ceza
export const TACTIC_PARK_THE_BUS_DEF_BONUS = 0.18;     // +%18 savunma, -%15 hücum
export const TACTIC_PARK_THE_BUS_ATT_PENALTY = 0.15;
export const TACTIC_OFFSIDE_TRAP_BONUS = 0.10;         // +%10 ofsayt kazanma
export const TACTIC_OFFSIDE_TRAP_RISK = 0.08;          // +%8 yeme riski (through ball)
export const TACTIC_WASTE_TIME_POSSESSION_BONUS = 0.08; // +%8 top tutma, -%5 gol şansı (yavaş tempo)
export const TACTIC_WASTE_TIME_ATT_PENALTY = 0.05;
export const TACTIC_CROSS_GAME_CROSS_BONUS = 0.15;     // +%15 orta şansı
export const TACTIC_LONE_STRIKER_COUNTER_BONUS = 0.20; // +%20 kontra gol şansı
export const TACTIC_SCREEN_KEEPER_GK_BONUS = 0.08;     // +%8 kaleci kurtarış

// Passing style modları
export const TACTIC_PASSING_STYLE_MODS = {
  'Karışık': { passAccMod: 0.0,  longBallMod: 0.0,  counterMod: 0.0 },
  'Kısa':    { passAccMod: 0.06, longBallMod: -0.10, counterMod: -0.05 },
  'Uzun':    { passAccMod: -0.05, longBallMod: 0.15, counterMod: 0.05 },
  'Direkt':  { passAccMod: -0.03, longBallMod: 0.20, counterMod: 0.10 },
} as const;

// ─── Hava Durumu Modifikatörleri ───────────────────────────────────────
export const WEATHER_MODIFIERS: Record<string, { passingMod: number; speedMod: number; shootingMod: number; tacklingMod: number }> = {
  rainy:  { passingMod: 0.95, speedMod: 0.97, shootingMod: 0.96, tacklingMod: 0.98 },
  snowy:  { passingMod: 0.93, speedMod: 0.90, shootingMod: 0.92, tacklingMod: 0.95 },
  windy:  { passingMod: 0.96, speedMod: 0.98, shootingMod: 0.94, tacklingMod: 1.0  },
  sunny:  { passingMod: 1.0,  speedMod: 1.0,  shootingMod: 1.0,  tacklingMod: 1.0  },
};

// ─── Hava Durumu Dağılımı ─────────────────────────────────────────────

/**
 * Mevsimsel hava durumu dağılımı.
 * Kış aylarında kar olasılığı artar, yaz aylarında güneşli olasılığı artar.
 * @param month — Ay (1-12)
 * @returns Hava durumu dağılım dizisi
 */
export function getSeasonalWeatherDistribution(month: number = new Date().getMonth() + 1): string[] {
  // Kış: Aralık-Şubat (12,1,2) → daha çok kar ve yağmur
  // İlkbahar: Mart-Mayıs (3,4,5) → daha çok yağmur ve rüzgar
  // Yaz: Haziran-Ağustos (6,7,8) → daha çok güneşli
  // Sonbahar: Eylül-Kasım (9,10,11) → karışık
  
  if (month === 12 || month <= 2) {
    // Kış: güneşli az, kar ve yağmur artar
    return ['sunny', 'rainy', 'snowy', 'snowy', 'windy'];
  } else if (month >= 3 && month <= 5) {
    // İlkbahar: güneşli ve yağmur dengeli
    return ['sunny', 'sunny', 'rainy', 'rainy', 'windy'];
  } else if (month >= 6 && month <= 8) {
    // Yaz: çoğunlukla güneşli
    return ['sunny', 'sunny', 'sunny', 'sunny', 'rainy'];
  } else {
    // Sonbahar: karışık
    return ['sunny', 'sunny', 'rainy', 'snowy', 'windy'];
  }
}

/** Geriye uyumluluk: eski sabit dağılım (yaz varsayımı) */
export const WEATHER_DISTRIBUTION: string[] = ['sunny', 'sunny', 'sunny', 'rainy', 'snowy', 'windy'];

// ─── Ev Sahibi Avantajı ───────────────────────────────────────────────
// DÜZELTME 9: Deplasman avantajı çok yüksekti, azaltıldı
// Eski: overall 1.07, attack 1.06, midfield 1.05, defense 1.05
// DÜZELTME 10: Ev sahibi avantajı hala çok güçlü, ~20% azaltıldı
// Önceki: overall 1.04, attack 1.03, midfield 1.03, defense 1.02
// DÜZELTME 10 (revize): Ev sahibi avantajı çok zayıftı (~3%), 18%'e çıkarıldı
// Yeni: overall 1.18, attack 1.15, midfield 1.14, defense 1.10
export const HOME_ADVANTAGE = {
  overall: 1.18,
  attack: 1.15,
  midfield: 1.14,
  defense: 1.10,
} as const;

// ─── Atmosfer Bazlı Ev Sahibi Avantajı ────────────────────────────────
// Stadyum atmosfer skoruna göre ev sahibi avantajı dinamik olarak ayarlanır.
// atmosphereScore 0-100 arası, 50 = nötr
// DÜŞÜK atmosfer (0-30):  ev avantajı %10
// ORTA atmosfer (31-60):  ev avantajı %18 (varsayılan)
// YÜKSEK atmosfer (61-80): ev avantajı %22
// AŞIRI atmosfer (81-100): ev avantajı %25
export const ATMOSPHERE_HOME_ADVANTAGE_TIERS = [
  { maxAtmos: 30, advantage: 0.10 },
  { maxAtmos: 60, advantage: 0.18 },
  { maxAtmos: 80, advantage: 0.22 },
  { maxAtmos: 100, advantage: 0.25 },
] as const;

/**
 * Dinamik ev sahibi avantajı hesaplar.
 * Atmosfer skoru ve takım OVR farkına göre ev sahibi avantajını ayarlar.
 * 
 * @param atmosphereScore — Stadyum atmosfer skoru (0-100, 50 = nötr)
 * @param ovrDiff — Ev sahibi OVR - Deplasman OVR (pozitif = ev sahibi güçlü)
 * @returns Her kategori için ev sahibi çarpanı
 */
export function calculateDynamicHomeAdvantage(
  atmosphereScore: number = 50,
  ovrDiff: number = 0
): { overall: number; attack: number; midfield: number; defense: number } {
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  // 1. Atmosfer bazlı baz avantaj
  let baseAdvantage = 0.18; // varsayılan
  for (const tier of ATMOSPHERE_HOME_ADVANTAGE_TIERS) {
    if (atmosphereScore <= tier.maxAtmos) {
      baseAdvantage = tier.advantage;
      break;
    }
  }
  
  // 2. OVR farkı modifikasyonu
  // Ev sahibi güçlüyse (ovrDiff > 0): avantaj hafif artar (max +0.03)
  // Deplasman güçlüyse (ovrDiff < 0): avantaj azalır (min -0.05)
  // Formül: ovrDiff * 0.001 (her 10 OVR farkı = 0.01 değişim)
  const ovrMod = clamp(ovrDiff * 0.001, -0.05, 0.03);
  const adjustedAdvantage = baseAdvantage + ovrMod;
  
  // 3. Kategorilere dağıt (orantısal: attack > midfield > defense)
  const overall = 1 + adjustedAdvantage;
  const attack = 1 + adjustedAdvantage * 0.95;   // Hücum biraz daha fazla
  const midfield = 1 + adjustedAdvantage * 0.90;  // Orta saha
  const defense = 1 + adjustedAdvantage * 0.75;   // Savunma daha az etkilenir
  
  return {
    overall: Math.max(1.0, Math.min(1.35, overall)),
    attack: Math.max(1.0, Math.min(1.35, attack)),
    midfield: Math.max(1.0, Math.min(1.35, midfield)),
    defense: Math.max(1.0, Math.min(1.30, defense)),
  };
}

// ─── Deplasman Baskı Etkisi ──────────────────────────────────────────
// Yüksek atmosferli maçlarda (>70), deneyimsiz deplasman oyuncuları
// baskı altında performans kaybeder.
// Yaş < 24 VE maç sayısı < 30 → effective rating -5%
export const AWAY_PRESSURE_EFFECT = {
  atmosphereThreshold: 70,
  maxAge: 24,
  maxMatchesPlayed: 30,
  ratingPenalty: 0.05, // -5%
} as const;

// ─── Yorgunluk Eşikleri ve Modifiyerleri ───────────────────────────────
export const FATIGUE_COND_THRESHOLDS = { low: 50, mid: 70 } as const;
export const FATIGUE_COND_MODS = { low: 0.6, mid: 0.8, full: 1.0 } as const;
export const FATIGUE_MINUTE_THRESHOLDS = { late: 75, mid: 60 } as const;
export const FATIGUE_MINUTE_MODS = { late: 0.85, mid: 0.92, fresh: 1.0 } as const;

// ─── Olay Olasılıkları — Hücum Evresi ─────────────────────────────────
export const ATTACK_PROBS = {
  FWD: { shotMultiplier: 0.28, shotMin: 0.04, shotMax: 0.35, chanceMultiplier: 0.18, chanceMin: 0.03, chanceMax: 0.25, foul: 0.03 },
  MID: { shotMultiplier: 0.14, shotMin: 0.02, shotMax: 0.18, chanceMultiplier: 0.15, chanceMin: 0.02, chanceMax: 0.20, interceptionMultiplier: 0.10, interceptionMin: 0.01, interceptionMax: 0.14, foul: 0.04 },
  DEF: { tackleMultiplier: 0.10, tackleMin: 0.01, tackleMax: 0.14, interceptionMultiplier: 0.08, interceptionMin: 0.01, interceptionMax: 0.12, foul: 0.05 },
  GK:  { saveMultiplier: 0.06, saveMin: 0.01, saveMax: 0.08 },
} as const;

// ─── Olay Olasılıkları — Savunma Evresi ────────────────────────────────
export const DEFEND_PROBS = {
  DEF: { tackleMultiplier: 0.12, tackleMin: 0.02, tackleMax: 0.18, interceptionMultiplier: 0.09, interceptionMin: 0.01, interceptionMax: 0.14, foul: 0.06 },
  MID: { tackleMultiplier: 0.07, tackleMin: 0.01, tackleMax: 0.11, interceptionMultiplier: 0.08, interceptionMin: 0.01, interceptionMax: 0.12, foul: 0.04 },
  GK:  { saveMultiplier: 0.10, saveMin: 0.02, saveMax: 0.15 },
  FWD: { interceptionMultiplier: 0.04, interceptionMin: 0.01, interceptionMax: 0.06, foul: 0.03 },
} as const;

// ─── Güç Oranı Çarpanları ──────────────────────────────────────────────
export const STRENGTH_RATIO = {
  attackShot: 2.0,      // 1.5→2.0: güçlü takım daha çok şut atar
  attackChance: 1.8,    // 1.3→1.8: güçlü takım daha çok fırsat yaratır
  defendTackle: 1.8,    // 1.3→1.8: güçlü savunma daha çok müdahale yapar
  defendSave: 2.0,      // 1.5→2.0: güçlü kaleci daha çok kurtarır
} as const;

// ─── Olasılık Üst Sınırları ────────────────────────────────────────────
export const PROB_CAPS = {
  shot: 0.35,
  tackle: 0.25,
  interception: 0.20,
  foul: 0.15,
  chance: 0.25,
  save: 0.20,
} as const;

// ─── Gol Olasılığı Sabitleri — v4 Dengeli ───────────────────────────
// Hedef: OVR farkı domine etsin AMA %100 değil, sürpriz olsun
// Gerçekçi hedef (28 OVR farkı): %85-90 galibiyet, 2-3 beraberlik, 0-1 mağlubiyet
//
// Matematik:
// Güçlü (85 OVR): 0.09 × 0.65 × 0.85 = 0.050 → ×1.80 = 0.090 → ×1.16 = 0.104 → ×1.10 = 0.114
//   22 event × 0.114 = 2.5 beklenen gol ✓
// Zayıf (57 OVR): 0.09 × 0.35 × 0.50 = 0.016 → ×0.78 = 0.012 → ×0.84 = 0.010 → ×0.90 = 0.009
//   22 event × 0.012 = 0.26 beklenen gol → bazen 1 gol, sürpriz şansı ✓
export const GOAL_CHANCE = {
  base: 0.10,              // 10% base (0.09→0.10: biraz daha gol)
  gkWeight: 0.25,
  qualityGapBonus: 0.70,   // Güçlü takıma avantaj (0.65→0.70: biraz daha)
  qualityGapPenalty: 0.70, // Zayıf takıma ceza
  mentalityBonus: 0.22,
  mentalityPenalty: 0.18,
  counterTriggerProb: 0.50,
  pressingGoalBoost: 0.50,
  lateGameDesperation: 1.45,
  clampMin: 0.010,         // Min %1.0 (0.012→0.010: zayıf takım biraz daha az gol)
  clampMax: 0.22,          // Max %22 (extreme skorları önle)
} as const;

// ─── Pozisyon Bazlı Nitelik Ağırlıkları ────────────────────────────────
// Her pozisyon için goalChance ve olay hesaplamasında kullanılan
// ağırlıklı nitelik kombinasyonu. Bu ağırlıklar, pozisyon-specific
// yeteneklerin maç motoruna entegre edilmesini sağlar.
export const POSITION_ATTRIBUTE_WEIGHTS: Record<string, Record<string, number>> = {
  // Savunma
  CB:  { tackling: 0.30, marking: 0.25, positioning: 0.20, heading: 0.15, strength: 0.10 },
  LB:  { tackling: 0.20, crossing: 0.20, stamina: 0.20, positioning: 0.20, speed: 0.20 },
  RB:  { tackling: 0.20, crossing: 0.20, stamina: 0.20, positioning: 0.20, speed: 0.20 },
  LWB: { crossing: 0.25, stamina: 0.25, tackling: 0.15, speed: 0.20, positioning: 0.15 },
  RWB: { crossing: 0.25, stamina: 0.25, tackling: 0.15, speed: 0.20, positioning: 0.15 },
  // Orta Saha
  CDM: { tackling: 0.25, marking: 0.20, positioning: 0.20, passing: 0.20, anticipation: 0.15 },
  CM:  { passing: 0.30, vision: 0.20, stamina: 0.20, control: 0.15, technique: 0.15 },
  CAM: { passing: 0.20, vision: 0.25, shooting: 0.20, technique: 0.20, composure: 0.15 },
  LM:  { crossing: 0.25, dribbling: 0.20, speed: 0.20, stamina: 0.20, technique: 0.15 },
  RM:  { crossing: 0.25, dribbling: 0.20, speed: 0.20, stamina: 0.20, technique: 0.15 },
  // Forvet
  ST:  { finishing: 0.35, composure: 0.20, offTheBall: 0.20, heading: 0.15, speed: 0.10 },
  CF:  { finishing: 0.25, passing: 0.20, vision: 0.20, offTheBall: 0.20, composure: 0.15 },
  LW:  { dribbling: 0.25, speed: 0.25, finishing: 0.20, crossing: 0.15, technique: 0.15 },
  RW:  { dribbling: 0.25, speed: 0.25, finishing: 0.20, crossing: 0.15, technique: 0.15 },
  // Kaleci
  GK:  { goalkeeping: 0.35, reflexes: 0.25, positioning: 0.20, composure: 0.10, concentration: 0.10 },
} as const;

// ─── Markov Zinciri Maç Durumları (Gelecek: DÜŞÜK ÖNCELİK) ──────────
// Maç simülasyonunda durum geçişleri için temel sabitler.
// Tam Markov Zinciri implementasyonu gelecekte yapılacak.
export const MATCH_STATES = [
  'neutral',           // Orta saha mücadelesi
  'home_possession',   // Ev sahibi top hakimiyeti
  'away_possession',   // Deplasman top hakimiyeti
  'home_pressing',     // Ev sahibi pres yapıyor
  'away_pressing',     // Deplasman pres yapıyor
  'home_counter',      // Ev sahibi kontra atak
  'away_counter',      // Deplasman kontra atak
  'set_piece',         // Duran top (kazanan belirlenir)
  'home_chance',       // Ev sahibi pozisyon
  'away_chance',       // Deplasman pozisyon
] as const;

export type MatchState = typeof MATCH_STATES[number];

// Geçiş olasılıkları: her durumdan diğer duruma geçiş olasılıkları
// Şimdilik eşit dağılım - gelecekte güncellenecek
export const STATE_TRANSITION_WEIGHTS: Record<MatchState, Partial<Record<MatchState, number>>> = {
  neutral:           { home_possession: 0.30, away_possession: 0.30, home_pressing: 0.10, away_pressing: 0.10, set_piece: 0.10, home_counter: 0.05, away_counter: 0.05 },
  home_possession:   { neutral: 0.15, home_possession: 0.30, home_pressing: 0.05, away_pressing: 0.05, home_chance: 0.20, set_piece: 0.10, home_counter: 0.05, away_counter: 0.10 },
  away_possession:   { neutral: 0.15, away_possession: 0.30, away_pressing: 0.05, home_pressing: 0.05, away_chance: 0.20, set_piece: 0.10, away_counter: 0.05, home_counter: 0.10 },
  home_pressing:     { home_possession: 0.30, home_chance: 0.20, neutral: 0.20, away_counter: 0.10, set_piece: 0.10, home_pressing: 0.10 },
  away_pressing:     { away_possession: 0.30, away_chance: 0.20, neutral: 0.20, home_counter: 0.10, set_piece: 0.10, away_pressing: 0.10 },
  home_counter:      { home_chance: 0.40, home_possession: 0.20, neutral: 0.20, away_possession: 0.10, set_piece: 0.10 },
  away_counter:      { away_chance: 0.40, away_possession: 0.20, neutral: 0.20, home_possession: 0.10, set_piece: 0.10 },
  set_piece:         { neutral: 0.25, home_chance: 0.20, away_chance: 0.20, home_possession: 0.15, away_possession: 0.15, set_piece: 0.05 },
  home_chance:       { neutral: 0.30, home_possession: 0.25, away_possession: 0.15, set_piece: 0.15, home_chance: 0.15 },
  away_chance:       { neutral: 0.30, away_possession: 0.25, home_possession: 0.15, set_piece: 0.15, away_chance: 0.15 },
} as const;

// ─── Asist Olasılığı ──────────────────────────────────────────────────
export const ASSIST_CHANCE = 0.65;

// ─── Gol Türü Olasılıkları ────────────────────────────────────────────
export const GOAL_TYPE = {
  headerChance: 0.15,       // Header goal chance (if ST position)
  longShotChance: 0.10,     // Long shot goal chance
  longShotThreshold: 70,    // Long shots attribute threshold
  lateGoalMinute: 85,       // Minute threshold for late goal classification
} as const;

// ─── Derecelendirme Etki Değerleri ────────────────────────────────────
export const RATING_IMPACT = {
  goal: 1.2,
  assist: 0.7,
  shotSaved: 0.15,
  gkSave: 0.4,
  shotWide: -0.1,
  shotPost: 0.05,
  chanceCreated: 0.05,
  assistOnChance: 0.1,
  tackle: 0.15,
  interception: 0.12,
  foulCommitted: -0.15,
  yellowCard: -0.35,
  redCard: -2.0,
  penalty: 0.3,
  freeKick: 0.1,
  offside: -0.05,
  corner: 0.02,
  gkReactionarySave: 0.3,
} as const;

// ─── Kart / Hakem Olasılıkları ────────────────────────────────────────
export const CARD_RATES = {
  yellow: 0.15,       // Base yellow card probability
  red: 0.03,          // Base red card probability
  penalty: 0.1,       // Base penalty probability
  foulVisibility: 0.4, // Foul visibility threshold
} as const;

// ─── Ofsayt / Korner Olasılıkları ─────────────────────────────────────
export const SET_PIECE_RATES = {
  offside: 0.02,       // Base offside probability
  corner: 0.015,       // Base corner probability
} as const;

// ─── Olay Görünürlük Eşikleri ─────────────────────────────────────────
export const EVENT_VISIBILITY = {
  tackle: 0.55,          // Tackle event visibility probability (0.3→0.55: daha çok tackle görünsün)
  interception: 0.45,   // Interception event visibility probability (0.25→0.45)
  gkSaveScaling: 0.6,   // GK save scaling factor (0.5→0.6)
  gkSave: 0.50,         // GK save event visibility probability (0.35→0.50)
} as const;

// ─── Sakatlık Riski — Dakika + Kondisyon Bazlı Dinamik ────────────────
// Gerçek futbolda: sakatlık riski dakika ilerledikçe ve kondisyon düştükçe artar
// 0-30 dk: baz risk, 30-60 dk: %20 artış, 60-90 dk: %50 artış
// Kondisyon < 50: risk 2x (aşırı yorgunluk)
export const INJURY_RISK = {
  base: 0.001,                    // Baz risk (cond ≥ 60, dk 0-30)
  condThresholdLow: 50,           // Kritik kondisyon eşiği (eski 40 → 50)
  condThresholdMid: 60,           // Orta kondisyon eşiği
  condLowMultiplier: 2.0,         // cond < 50: risk 2x (aşırı yorgunluk)
  condMidMultiplier: 1.5,         // cond 50-60: risk 1.5x
  minuteMultiplier_0_30: 1.0,     // İlk 30 dk: baz risk
  minuteMultiplier_30_60: 1.2,    // 30-60 dk: %20 artış
  minuteMultiplier_60_90: 1.5,    // 60-90 dk: %50 artış
  ratingImpactHeavy: -1.5,
  ratingImpactMedium: -1.0,
  ratingImpactLight: -0.5,
} as const;

// ─── Fizyoterapist Sakatlık Azaltma ──────────────────────────────────
// Her yıldız seviyesinin sakatlık riskini azaltma yüzdesi
// Eski: %8/yıldız (5 yıldız = %40 — çok agresif)
// Yeni: %4/yıldız (5 yıldız = %20 — daha gerçekçi)
export const PHYSIO_INJURY_REDUCTION_PER_STAR = 0.04; // %4 per star

// ─── Kondisyon Tüketimi — Eksponansiyel Drain ─────────────────────────
// cond > 70: az drain (oyuncu taze), cond 50-70: orta drain, cond < 50: ağır drain
// Eksponansiyel: kondisyon düştükçe drain hızı artar
export const CONDITION_DRAIN = {
  base: 0.15,                    // Base condition drain per minute
  staminaDivisor: 1000,          // Stamina drain divisor
  fallbackDrain: 0.2,            // Fallback stamina drain factor
  lateGameMultiplier: 1.5,       // Minute > 75 drain multiplier
  lateGameThreshold: 75,         // Minute threshold for late game
  // Eksponansiyel drain çarpanları (cond bazlı)
  condHighThreshold: 70,         // cond > 70: hafif drain
  condHighDrainMult: 0.8,        // cond > 70: %20 az drain (taze oyuncu)
  condMidThreshold: 50,          // cond 50-70: normal drain
  condMidDrainMult: 1.0,         // cond 50-70: standart drain
  condLowDrainMult: 1.6,         // cond < 50: %60 fazla drain (ağır yorgunluk)
} as const;

// ─── Maç Yapısı ───────────────────────────────────────────────────────
export const MATCH_STRUCTURE = {
  duration: 90,              // Match duration (minutes)
  halftime: 45,              // Halftime minute
  substitutionSlots: 3,      // Substitution slots per team
  autoSubMinutes: [60, 75],  // Auto-substitution check minutes
  tiredPlayerCondThreshold: 50, // Condition threshold for tired player substitution
} as const;

// ─── Momentum Sapmaları ───────────────────────────────────────────────
// Dengeleme notları:
// - earlyHomeBias: 1.15→1.08 (ilk 15 dk ev sahibi çok baskındı)
// - losingTeamPush: 1.2→1.12 (geride kalan takım çok agresif itiyordu)
// - leadSitBack: 0.85→0.90 (önde olan takım çok çabuk çekiliyordu)
// - awayRallyBias: 1.08→1.05 (deplasman toparlanması azaltıldı)
// Toplam etki: maçlar daha dengeli, daha az 5-0 gibi uç sonuçlar
export const MOMENTUM_BIASES = {
  earlyHomeBias: 1.08,       // Ev sahibi ilk 15 dk hafif avantaj (eski: 1.15)
  earlyHomeCutoff: 15,       // İlk ev sahibi avantajı bitiş dakikası
  awayRallyBias: 1.05,       // Deplasman toparlanma sapması 46-60 dk (eski: 1.08)
  awayRallyStart: 45,        // Deplasman toparlanma başlangıç
  awayRallyEnd: 60,          // Deplasman toparlanma bitiş
  leadSitBack: 0.90,         // Önde olan takım geri çekilme çarpanı (eski: 0.85)
  leadSitBackCutoff: 75,     // Geri çekilme başlangıç dakikası
  losingTeamPush: 1.12,      // Geride kalan takım baskı çarpanı (eski: 1.2)
  losingPushCutoff: 60,      // Baskı başlangıç dakikası
  redCardPenalty: 0.75,      // Kırmızı kart momentum cezası
} as const;

// ─── Pas Simülasyonu ──────────────────────────────────────────────────
export const PASS_SIMULATION = {
  minPasses: 1,                // Min passes per minute
  maxPasses: 4,                // Max passes per minute
  keyPassChance: 0.12,         // Key pass chance multiplier
  longBallShortPassPenalty: 0.1, // Long ball short-pass penalty factor
} as const;

// ─── Oyun Tarzı Kombinasyon Ağırlıkları ────────────────────────────────
export const PLAYSTYLE_WEIGHTS = {
  combinationWeight: 0.5,        // Weight for combining paired play style bonuses
  defenseWeight: 0.3,            // Defense weight in position selection for events
  pressingTackleBoost: 0.5,      // Pressing → tackle boost factor
} as const;

// ─── Oyuncu Derecelendirme Ağırlıkları ─────────────────────────────────
export const PLAYER_RATING_WEIGHTS = {
  baseRating: 6.0,
  GK: {
    perSave: 0.15,
    perGoalConceded: -0.3,
  },
  DEF: {
    perTackle: 0.08,
    perInterception: 0.06,
    perAssist: 0.25,
    perGoal: 0.5,
  },
  MID: {
    perKeyPass: 0.12,
    perPass: 0.003,
    perTackle: 0.04,
    perGoal: 0.4,
    perAssist: 0.3,
  },
  FWD: {
    perGoal: 0.5,
    perAssist: 0.3,
    perShotOnTarget: 0.05,
    perMissedShot: -0.02,
  },
  yellowCardPenalty: -0.2,
  redCardPenalty: -1.0,
  foulPenalty: -0.03,
  playingTimeFactors: { full85: 1.0, mid60: 0.9, low30: 0.8, sub30: 0.7 } as const,
  ratingShiftBase: 5.0,
  mentalModifierStrength: 0.5,
  ratingClamp: { min: 3.0, max: 10.0 } as const,
} as const;
