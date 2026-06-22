
export type TraitLevel = 'MOR' | 'ALTIN' | 'LACIVERT' | 'BEYAZ';

export interface TraitDef {
  name: string;
  level: TraitLevel;
  description: string;
  bonus?: Record<string, number>;
  penalty?: Record<string, number>;
  counterFor?: string; // Bu özelliğin hangi pozitif özelliği karşıladığını belirtir
  engineEffect?: {
    successRate: number; // e.g. 0.38 for 38%
    engineWeight: number; // e.g. 0.03 for 3% match engine impact
  };
}

export const TRAITS_DATA = {
  defans: {
    pozitif: [
      { name: "Kale gibi", level: "MOR", description: "Geçilemez bir duvar." },
      { name: "Top kapma uzmanı", level: "ALTIN", description: "Müdahaleleri çok net." },
      { name: "Pozisyon ustası", level: "ALTIN", description: "Her zaman doğru yerde." },
      { name: "Hava hakimiyeti", level: "LACIVERT", description: "Hava toplarını toplar." },
      { name: "Markajcı", level: "LACIVERT", description: "Rakibi gölge gibi izler." },
      { name: "Oyun okuyan", level: "BEYAZ", description: "Rakibin hamlesini önceden sezer." },
      { name: "Lider stoper", level: "MOR", description: "Defansı organize eder." },
      { name: "Ofsayt ustası", level: "LACIVERT", description: "Ofsayt tuzağını %85 başarıyla kurar. (Motor Etkisi: %5)", counterFor: "Ofsayta düşer", engineEffect: { successRate: 0.85, engineWeight: 0.05 } },
      { name: "Soğukkanlı", level: "BEYAZ", description: "Baskı altında %35 daha az hata yapar. (Motor Etkisi: %3)", counterFor: "Panik yapar", engineEffect: { successRate: 0.35, engineWeight: 0.03 } },
      { name: "Risk hesaplayıcı", level: "BEYAZ", description: "Gereksiz riske girmez." },
      { name: "Hızlı stoper", level: "ALTIN", description: "Hızlı forvetlerin ataklarını %45 daha fazla keser. (Motor Etkisi: %3.5)", counterFor: "Hızlı forvet", engineEffect: { successRate: 0.45, engineWeight: 0.035 } },
      { name: "Dayanıklı", level: "BEYAZ", description: "Yorgun rakiplere karşı %20 daha avantajlıdır. (Motor Etkisi: %2)", counterFor: "Tembel", engineEffect: { successRate: 0.20, engineWeight: 0.02 } },
      { name: "Agresif", level: "LACIVERT", description: "Rakipten korkmaz." },
      { name: "Denge ustası", level: "BEYAZ", description: "İkili mücadelelerde yıkılmaz." },
      { name: "Topla çıkan stoper", level: "ALTIN", description: "Atak başlatma becerisi." },
      { name: "Uzun pas ustası", level: "LACIVERT", description: "Adrese teslim toplar." },
      { name: "Kanat bekçisi", level: "BEYAZ", description: "Kanatları güvene alır.", counterFor: "Hızlı kanat" },
      { name: "Çakılı savunmacı", level: "BEYAZ", description: "Yerini asla terk etmez.", counterFor: "Boşluk avcısı" },
      { name: "Süpürücü (libero)", level: "ALTIN", description: "Tüm gedikleri kapatır.", counterFor: "Kontra canavarı" },
      
      // Yeni Karşı (Counter) Traitler
      { name: "Gölge Markajcı", level: "ALTIN", description: "Bitirici forvetleri %42 daha sıkı tutar. (Motor Etkisi: %4)", counterFor: "Bitirici", engineEffect: { successRate: 0.42, engineWeight: 0.04 } },
      { name: "Şut Engelleyici", level: "LACIVERT", description: "Uzaktan şutları %38 oranında bloke eder. (Motor Etkisi: %3.5)", counterFor: "Uzaktan şutçu", engineEffect: { successRate: 0.38, engineWeight: 0.035 } },
      { name: "Alan Kapatıcı", level: "BEYAZ", description: "Boşluk bulucuların alanını %33 daha fazla daraltır. (Motor Etkisi: %3)", counterFor: "Boşluk bulucu", engineEffect: { successRate: 0.33, engineWeight: 0.03 } },
      { name: "Pas Duvarı", level: "LACIVERT", description: "Ara pascı oyuncunun paslarını %38 oranında keser. (Motor Etkisi: %3)", counterFor: "Ara pascı", engineEffect: { successRate: 0.38, engineWeight: 0.03 } },
      { name: "Tazı Defans", level: "ALTIN", description: "Sprinterlerin hızını %45 etkisiz hale getirir. (Motor Etkisi: %4)", counterFor: "Sprinter", engineEffect: { successRate: 0.45, engineWeight: 0.04 } },
      { name: "Oyun Bozan", level: "ALTIN", description: "Oyun kurucuları %40 oranında baskılar. (Motor Etkisi: %3.5)", counterFor: "Oyun kurucu", engineEffect: { successRate: 0.40, engineWeight: 0.035 } },
      { name: "Asla Pes Etmez", level: "BEYAZ", description: "Maç sonu konsantrasyonunu %30 korur. (Motor Etkisi: %2.5)", counterFor: "Konsantrasyon düşüklüğü", engineEffect: { successRate: 0.30, engineWeight: 0.025 } },
      { name: "Pozisyon Bekçisi", level: "LACIVERT", description: "Fırsatçıları %36 oranında engeller. (Motor Etkisi: %3)", counterFor: "Fırsatçı", engineEffect: { successRate: 0.36, engineWeight: 0.03 } },
      { name: "Top Hırsızı", level: "ALTIN", description: "Top saklayanlardan %39 oranında top çalar. (Motor Etkisi: %3.5)", counterFor: "Top saklayan", engineEffect: { successRate: 0.39, engineWeight: 0.035 } },
      { name: "Gölge Takipçi", level: "ALTIN", description: "10 numaraların etkinliğini %44 azaltır. (Motor Etkisi: %4)", counterFor: "10 numara", engineEffect: { successRate: 0.44, engineWeight: 0.04 } },
      { name: "Mücadeleci Stoper", level: "LACIVERT", description: "Fiziksel santraforları %40 oranında durdurur. (Motor Etkisi: %3.5)", counterFor: "Fiziksel santrafor", engineEffect: { successRate: 0.40, engineWeight: 0.035 } }
    ],
    negatif: [
      { name: "Ağır kalır", description: "Hızı rakiplerine göre oldukça düşüktür.", penalty: { speed: -10 } },
      { name: "Zamanlama hatası", description: "Müdahale zamanlamasını sıkça kaçırır.", penalty: { defending: -5 } },
      { name: "Zayıf markaj", description: "Rakibini adam markajında kaçırabilir.", penalty: { defending: -7 } },
      { name: "Hava zaafı", description: "Hava toplarında etkisizdir.", penalty: { heading: -15 } },
      { name: "Top kontrolü kötü", description: "Topu ayağında tutmakta zorlanır.", penalty: { control: -10 } },
      { name: "Konsantrasyon düşüklüğü", description: "Maçın kritik anlarında oyundan kopabilir.", penalty: { awareness: -15 } },
      { name: "Panik yapar", description: "Baskı altında acele kararlar verir.", penalty: { coolness: -20 } },
      { name: "Yanlış karar verir", description: "Pas tercihlerinde sık sık hata yapar.", penalty: { vision: -10 } },
      { name: "Kart manyağı", description: "Gereksiz sertlikte müdahalelerle kart görür.", penalty: { disciplin: -25 } }
    ]
  },
  orta_saha: {
    pozitif: [
      { name: "Oyun kurucu", level: "MOR", description: "Maestro." },
      { name: "Top dağıtıcı", level: "ALTIN", description: "Merkez istasyonu." },
      { name: "Box-to-box", level: "MOR", description: "Her iki ceza sahası arasında." },
      { name: "Pres ustası", level: "ALTIN", description: "Rakipten topu söker alır." },
      { name: "Top saklayan", level: "LACIVERT", description: "Mıknatıs gibi." },
      { name: "Oyun görüşü yüksek", level: "MOR", description: "Sahayı yukarıdan izler gibi." },
      { name: "Boşluk bulucu", level: "ALTIN", description: "Savunma arasına sızar." },
      { name: "Tempo kontrolcüsü", level: "ALTIN", description: "Maçın hızını o belirler." },
      { name: "Pas arası ustası", level: "LACIVERT", description: "Rakip pasları keser." },
      { name: "Regista", level: "MOR", description: "Derinden oyun kurma dehası." },
      { name: "10 numara", level: "MOR", description: "Saf yetenek." },
      { name: "Uzaktan şutçu", level: "ALTIN", description: "Füzeleriyle meşhur." }
    ],
    negatif: [
      { name: "Top kaybı yapar", description: "Merkezde tehlikeli top kayıplarına meyillidir.", penalty: { control: -10 } },
      { name: "Yavaş karar verir", description: "Pas opsiyonlarını görmekte geç kalır.", penalty: { vision: -15 } },
      { name: "Savunmaya yardım etmez", description: "Defansif görevlerinden sık sık kaçar.", penalty: { workrate: -20 } },
      { name: "Pas hatası yapar", description: "Basit paslarda bile isabet oranı düşüktür.", penalty: { passing: -12 } }
    ]
  },
  forvet: {
    pozitif: [
      { name: "Bitirici", level: "MOR", description: "Fırsat tanımaz." },
      { name: "Pozisyoncu", level: "ALTIN", description: "Topun nereye geleceğini bilir." },
      { name: "Hızlı forvet", level: "ALTIN", description: "Rüzgarın oğlu." },
      { name: "Fiziksel santrafor", level: "LACIVERT", description: "Stoperleri hırpalar." },
      { name: "Fırsatçı", level: "ALTIN", description: "Dönen topları kaçırmaz." },
      { name: "Boşluk avcısı", level: "LACIVERT", description: "Defansı deler geçer." },
      { name: "Ofsayt ustası", level: "LACIVERT", description: "Çizgide dans eder." },
      { name: "Gol makinesi", level: "MOR", description: "Her maç tabela yapar." },
      { name: "Sahte 9", level: "MOR", description: "Modern futbolun zekası." },
      { name: "Kontra canavarı", level: "ALTIN", description: "Hızlı hücumların lideri." },
      { name: "Büyük maç oyuncusu", level: "MOR", description: "Final anlarını sever." }
    ],
    negatif: [
      { name: "Beceriksiz bitirici", description: "Net fırsatları cömertçe harcar.", penalty: { shooting: -15 } },
      { name: "Ofsayta düşer", description: "Hücum hattında yerini ayarlayamaz.", penalty: { awareness: -10 } },
      { name: "Bencil", description: "Müsait arkadaşına pas vermez.", penalty: { passing: -20 } },
      { name: "Kararsız", description: "Son vuruş veya pas arasında kalır.", penalty: { decision: -15 } }
    ]
  },
  kaleci: {
    pozitif: [
      { name: "Refleks canavarı", level: "MOR", description: "İnanılmaz kurtarışlar." },
      { name: "Güvenli eller", level: "ALTIN", description: "Hataya yer yok." },
      { name: "1v1 ustası", level: "ALTIN", description: "Forvetin kabusu." },
      { name: "Hava hakimiyeti", level: "LACIVERT", description: "Yan toplarda rakipsiz." },
      { name: "Lider kaleci", level: "ALTIN", description: "Defansın kumandanı." },
      { name: "Sweeper keeper", level: "MOR", description: "Kalesinden çıkıp süpürür." },
      { name: "Penaltı ustası", level: "ALTIN", description: "Atışlarda çok şanslı." },
      { name: "Büyük maç kalecisi", level: "MOR", description: "Basınç altında devleşir." }
    ],
    negatif: [
      { name: "Sektirir", description: "Topları tutmak yerine rakibin önüne çeler.", penalty: { catching: -20 } },
      { name: "Yavaş refleks", description: "Yakın mesafeden gelen şutlarda ağır kalır.", penalty: { reflexes: -15 } },
      { name: "Çıkış hatası", description: "Kalesini yanlış zamanlarda terk eder.", penalty: { decision: -20 } }
    ]
  }
};

export const PERSONALITY_TRAITS = {
  karakter: {
    pozitif: [
      { name: "Profesyonel", description: "Antrenmanda hızlı gelişir", impact: { training: 1.2 } },
      { name: "Disiplinli", description: "Form düşüşü az olur", impact: { form_stability: 1.2 } },
      { name: "Çalışkan", description: "Ekstra gelişim bonusu", impact: { growth: 1.15 } },
      { name: "Hırslı", description: "Büyük maçlarda motive olur", impact: { big_match_bonus: 1.1 } },
      { name: "Kazanan karakter", description: "Takımı yukarı çeker", impact: { team_morale_boost: 0.05 } }
    ],
    negatif: [
      { name: "Tembel", description: "Yavaş gelişir", impact: { training: 0.8 } },
      { name: "Disiplinsiz", description: "Moral düşüşü yaşar", impact: { morale_stability: 0.8 } },
      { name: "Gece hayatı düşkünü", description: "Form dalgalı olur", impact: { form_volatility: 1.5 } },
      { name: "Rahatına düşkün", description: "Baskı altında düşer", impact: { pressure_handling: 0.7 } },
      { name: "İsteksiz", description: "Düşük tempoda oynar", impact: { match_intensity: 0.8 } }
    ]
  },
  takim: {
    pozitif: [
      { name: "Takım oyuncusu", description: "Kimya bonusu", impact: { chemistry: 1.2 } },
      { name: "Sessiz lider", description: "Moral artırır", impact: { team_morale: 0.03 } },
      { name: "Mentor", description: "Genç oyuncuları geliştirir", impact: { academy_boost: 1.1 } },
      { name: "Sadık", description: "Transfer istemez", impact: { loyalty: 1.5 } },
      { name: "Soyunma odası lideri", description: "Krizleri azaltır", impact: { crisis_management: 1.3 } }
    ],
    negatif: [
      { name: "Egoist", description: "Takım uyumunu bozar", impact: { chemistry: 0.7 } },
      { name: "Problem çıkaran", description: "Moral düşürür", impact: { team_morale: -0.05 } },
      { name: "Tartışmacı", description: "Teknik direktörle sorun yaşar", impact: { manager_relation: 0.6 } },
      { name: "Gruplaşan", description: "Takım bölünmesine neden olur", impact: { cohesion: 0.7 } },
      { name: "Kibirli", description: "Yedek kalınca sorun çıkarır", impact: { bench_morale: 0.5 } }
    ]
  },
  kariyer: {
    pozitif: [
      { name: "Kulüp bağlılığı yüksek", description: "Uzun süre kalır", impact: { contract_renewal: 1.3 } },
      { name: "Fedakar", description: "Maaş konusunda esnek", impact: { wage_flexibility: 1.2 } },
      { name: "Gençlere destek olur", description: "Akademi bonusu", impact: { youth_growth: 1.1 } }
    ],
    negatif: [
      { name: "Para odaklı", description: "Sürekli zam ister", impact: { wage_demand: 1.4 } },
      { name: "Fırsatçı", description: "Büyük kulüp görünce gitmek ister", impact: { transfer_desire: 1.5 } },
      { name: "Menajer kuklası", description: "Transfer dedikodusu çıkarır", impact: { market_noise: 1.5 } },
      { name: "Aidiyet sorunu", description: "Takıma bağlanmaz", impact: { loyalty: 0.5 } }
    ]
  },
  mental: {
    pozitif: [
      { name: "Büyük maç oyuncusu", description: "Derbilerde coşar", impact: { big_match_rating: 1.25 } },
      { name: "Soğukkanlı", description: "Kritik anlarda sakin", impact: { composure: 1.3 } },
      { name: "Geri dönüş lideri", description: "Takım gerideyken motive olur", impact: { comeback_odds: 1.2 } },
      { name: "Baskı sever", description: "Taraftar önünde daha iyi oynar", impact: { away_pressure: 1.2 } }
    ],
    negatif: [
      { name: "Panikçi", description: "Kritik maçlarda düşer", impact: { composure: 0.6 } },
      { name: "Kırılgan mental", description: "Hata sonrası çöker", impact: { recovery_speed: 0.6 } },
      { name: "Taraftar baskısından etkilenir", description: "İç saha stres yaşar", impact: { home_performance: 0.7 } },
      { name: "Özgüven sorunu", description: "Formsuzluk uzar", impact: { slump_duration: 1.5 } }
    ]
  },
  nadir: [
    { name: "Derbi canavarı", description: "Ezeli rekabetlerde durdurulamaz", impact: { derby_boost: 1.5 } },
    { name: "Kupacı", description: "Eliminasyon maçlarının uzmanı", impact: { cup_boost: 1.4 } },
    { name: "Antrenman yıldızı", description: "Hafta içi muazzam çalışır", impact: { training_peak: 1.5 } },
    { name: "Sosyal medya bağımlısı", description: "Popülerliği artırır ama odak dağıtabilir", impact: { fan_growth: 1.2, focus: 0.9 } },
    { name: "Sessiz suikastçı", description: "Beklenmedik anlarda sahneye çıkar", impact: { surprise_goal: 1.3 } },
    { name: "Kaos adamı", description: "Maçı karıştırır, rakibi bozar", impact: { opponent_mistake: 1.2 } },
    { name: "Fan favorisi", description: "Bilet ve forma satışlarını artırır", impact: { commercial: 1.4 } },
    { name: "Kulüp efsanesi", description: "Camianın sevgilisi", impact: { reputation_boost: 1.5 } },
    { name: "Gezgin futbolcu", description: "Çabuk uyum sağlar", impact: { adaptation: 2.0 } },
    { name: "Tek sezonluk yıldız", description: "Kısa süreli patlama yapar", impact: { temporary_peak: 2.0, fall_off: 0.5 } }
  ]
};

export const TRAIT_LEVELS = {
  BEYAZ: { label: 'Standart', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', icon: '⚪' },
  LACIVERT: { label: 'Elit', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: '🔵' },
  ALTIN: { label: 'Efsanevi', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: '🟠' },
  MOR: { label: 'Üstat', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: '🟣' }
};

export const PERSONALITY_LABELS = {
  "Profesyonel": "Antrenmanda çok hızlı gelişir, disiplini elden bırakmaz.",
  "Egoist": "Takım uyumunu bozar, pas vermeyi sevmez.",
  "Sadık": "Transfer tekliflerini reddeder, kulübüne bağlıdır.",
  "Hırslı": "Kaybetmeye tahammülü yoktur, büyük maçlarda vites artırır.",
  "Tembel": "Kondisyonu yavaş toparlanır, antrenmanı sevmez.",
  "Panikçi": "Skor darlarıldığında hata yapma riski çok yüksektir.",
  "Mentor": "Yanındaki gençlerin gelişim hızını %25 artırır.",
  "Problem çıkaran": "Kötü sonuçlarda soyunma odasında huzursuzluk yaratır."
};

export const PLAY_STYLES = {
  defans: [
    { name: "Kafacı (defans)", bonus: { heading: 0.3 } },
    { name: "Uzun pasçı", bonus: { passing: 0.2 } },
    { name: "Yerinde müdahale", bonus: { defending: 0.15 } },
    { name: "Blokçu", bonus: { defending: 0.2 } }
  ],
  orta_saha: [
    { name: "Ara pasçı", bonus: { assist_rate: 0.25 } },
    { name: "Plaseci", bonus: { shooting: 0.15 } },
    { name: "Power shot", bonus: { long_shot: 0.2 } },
    { name: "Uzaktan şutçu", bonus: { long_shot: 0.2 } }
  ],
  forvet: [
    { name: "Plaseci", bonus: { shooting: 0.15 } },
    { name: "Power shot", bonus: { shooting: 0.2 } },
    { name: "Kafacı (forvet)", bonus: { heading: 0.3 } },
    { name: "Koşu ustası", bonus: { speed: 0.2 } },
    { name: "Kontra bitiricisi", bonus: { goal_rate: 0.2 } }
  ],
  kaleci: [
    { name: "Penaltı kurtarıcı", bonus: { penalty_save: 0.3 } },
    { name: "Uzun degajcı", bonus: { passing: 0.2 } },
    { name: "Libero kaleci", bonus: { control: 0.2 } }
  ]
};
