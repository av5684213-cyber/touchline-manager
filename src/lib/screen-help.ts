/**
 * v2.9.75: Ekran bazlı yardım içeriği — her sekme için açıklamalar.
 *
 * Yapı: { screenKey: [{ title, desc }, ...] }
 * ScreenHelpButton component'i bu veriyi okuyup modal'da gösterir.
 *
 * Ekranda olmayan bir key verilirse buton gosterilmez (Partial Record).
 */

import type { TabKey } from "@/components/touchline/bottom-nav";

export interface HelpSection {
  title: string;
  desc: string;
}

export const SCREEN_HELP: Partial<Record<TabKey, HelpSection[]>> = {
  // ═══════════════════════════════════════════════════════════════
  // ANA NAVİGASYON (5)
  // ═══════════════════════════════════════════════════════════════

  dashboard: [
    { title: "📊 Takım Özeti", desc: "Kadro sayısı, ortalama OVR ve sezon haftası. OVR ne kadar yüksekse takım o kadar güçlü." },
    { title: "🔔 Bildirimler", desc: "Maç sonuçları, sakatlıklar, transfer teklifleri ve antrenman raporları. Okumadığın bildirimler mavi nokta ile işaretlenir." },
    { title: "✉️ Mesajlar", desc: "Transfer mesajları ve sistem bildirimleri. 'Mesajlar' sekmesinden tümünü görebilirsin." },
    { title: "⚽ Sonraki Maç", desc: "Bir sonraki lig maçının rakibi ve tarihi. 'Maçı İzle' ile canlı izle, 'Turu İlerlet' ile hızlı simüle et." },
    { title: "📋 Son Maçlar", desc: "Son 4 maçın sonucu. Galibiyet=yeşil, beraberlik=sarı, mağlubiyet=kırmızı." },
    { title: "🛡️ Geliştirici Modu", desc: "Supabase bağlantısı yokken yerel oynama. Veriler cihazında kalır, cloud senkronizasyonu kapalı." },
  ],

  tactics: [
    { title: "⚽ Diziliş", desc: "4-4-2, 4-3-3 gibi formasyonlar. 'Değiştir' ile farklı formasyon seç. Her formasyonun saldırı/savunma/orta saha modifier'ı var." },
    { title: "👥 İlk 11", desc: "Saha üzerindeki oyuncular. Boş slota tıkla → listeden oyuncu seç. Sakat/cezalı oyuncular listede kırmızı işaretli." },
    { title: "🪑 Yedek Kulübesi", desc: "Yedek oyuncular. Maç sırasında değişiklik yapabilirsin (canlı maçta 3 değişiklik hakkı)." },
    { title: "🎭 Roller", desc: "Her pozisyona özel rol (örn: 'Bitirici Forvet', 'Libero Stoper'). Rol, oyuncunun maç motoruna etkisini belirler." },
    { title: "📋 Talimatlar", desc: "Çok yüksek baskı, dar alan savunması gibi takım talimatları. Maç motoruna direkt etki eder." },
    { title: "🔄 Karşılaştır", desc: "İki oyuncuyu yan yana karşılaştır. Kadro listesinden 2 oyuncu seç." },
    { title: "🏋️ Antrenman", desc: "Günlük antrenman seansı. Her gün 1 kez. Oyuncu stat'larını kalıcı olarak artırır." },
  ],

  match: [
    { title: "📺 Canlı Maç", desc: "Maçı anlık olarak izle. Olaylar (gol, kart, sakatlık) canlı gelir. 5 saniyede bir güncellenir." },
    { title: "📊 Skor & Süre", desc: "Üstte canlı skor ve maç süresi. 90 dakika = ~3 dakika gerçek zaman." },
    { title: "🌤️ Hava Durumu", desc: "Maç günü hava durumu. Yağmurlu/karlı hava şut doğruluğunu düşürür." },
    { title: "⏭️ Maçı Oynat", desc: "Maçı başlat. Canlı event'leri izlemek istemiyorsan 'Turu İlerlet' ile hızlı simüle et." },
    { title: "⏭️ Turu İlerlet", desc: "Maçı anında simüle et, sonucu göster. Kupa maçları cumartesi 12:00 ve 18:00'da oynanır." },
  ],

  transfer: [
    { title: "💰 Bütçe", desc: "Transfer için kullanılabilir para. Gelirler (TV, sponsor, bilet) ve giderler (maaş, tesis) her hafta güncellenir." },
    { title: "📋 Pazar", desc: "Tüm liglerden satılık oyuncular. Pozisyon filtresi (GK/DEF/MID/FWD) ve sıralama (OVR/Yaş/Fiyat) kullan." },
    { title: "🆓 Serbest Oyuncular", desc: "Takımsız oyuncular. Bedelsiz imzalanır — sadece maaş ödenir." },
    { title: "🔄 Kiralık Listesi", desc: "Diğer takımlardan kiralanabilecek oyuncular. Kiralama ücreti + haftalık maaş ödenir." },
    { title: "⭐ İzleme Listesi", desc: "Takip ettiğin oyuncular. Favorilerini burada topla." },
    { title: "📥 Gelen Teklifler", desc: "Senin oyuncularına gelen teklifler. Kabul/reddet/karşı teklif yap." },
    { title: "📤 Satılık Oyuncularım", desc: "Satışa çıkardığın oyuncular. Fiyat belirle, bot teklifler gelsin." },
    { title: "🔒 Transfer Penceresi", desc: "Son 5 hafta kapalıdır (sezon sonu). Bu sürede teklif gönderilemez." },
    { title: "💸 Vergi", desc: "Satışta %2.5 vergi, alımda %5 agent + %3 imza bonusu. Toplam maliyeti hesaba kat." },
  ],

  finance: [
    { title: "💵 Bütçe", desc: "Mevcut nakit. Negatife düşemez — iflas riski varsa otomatik oyuncu satışa çıkarılır." },
    { title: "📈 Gelirler", desc: "Bilet (doluluk × fiyat), sponsor (tier bazlı), TV (tier bazlı), merch (stadyum level'ına bağlı)." },
    { title: "📉 Giderler", desc: "Oyuncu maaşları (en büyük gider), personel maaşları, tesis bakım maliyeti." },
    { title: "🎫 Bilet Fiyatı", desc: "0-250₺ arası. Yüksek fiyat = daha çok gelir ama doluluk düşer. Optimum ~60₺." },
    { title: "🤝 Sponsor", desc: "Sezon başı sponsor anlaşması. Stadyum level'ı yüksekse daha çok sponsor geliri." },
  ],

  // ═══════════════════════════════════════════════════════════════
  // DİĞER MENÜ (9)
  // ═══════════════════════════════════════════════════════════════

  leaderboard: [
    { title: "🏆 Liderlik Tablosu", desc: "Tüm menajerlerin sıralaması. Puan = takım OVR × 10 + bütçe(M) + sezon bonusu." },
    { title: "🌍 Global", desc: "Tüm liglerin (4 ülke × 4 tier) bot takımları dahil sıralaması." },
    { title: "📍 Yerel", desc: "Sadece gerçek kullanıcı menajerlerin sıralaması." },
  ],

  forum: [
    { title: "💬 Forum", desc: "Diğer menajerlerle sohbet et, başlık aç, cevap ver. 30 saniyede max 1 başlık, 10 saniyede max 1 cevap." },
    { title: "📁 Kategoriler", desc: "Genel, Transfer, Taktik, Maç, Yardım. İlgilendiğin kategoriye göre filtrele." },
    { title: "✏️ Düzenle", desc: "Kendi başlığını 10 dakika içinde düzenleyebilirsin. Daha sonra silip yeniden açman gerekir." },
    { title: "🚩 Bildir", desc: "Uygunsuz içeriği bildir. Moderatörler inceleyecek." },
    { title: "🔒 Rate Limit", desc: "Spam önlemek için sunucu tarafında rate-limit var. Hata alırsan biraz bekle." },
  ],

  shop: [
    { title: "📦 Paketler", desc: "Bronze/Silver/Gold/Platinum. Her paketten 3 oyuncu çıkar, kadroya doğrudan eklenir. Olasılıklar her zaman görünür." },
    { title: "🃏 Kartlar", desc: "Trait (pozitif/negatif giderme), Arketip, Stat Boost kartları. Envantere eklenir, oyuncuya 'basılır'." },
    { title: "🎭 Kozmetikler", desc: "Tema renkleri, forma desenleri. Sadece görsel — oyuna etkisi yok." },
    { title: "💰 Kredi", desc: "Gerçek para ile satın alınır. Google Play üzerinden güvenli ödeme. Sunucu tarafında doğrulanır." },
    { title: "🎒 Envanter", desc: "Aldığın kartlar burada birikir. Bir karta tıkla → oyuncu seç → kartı bas." },
    { title: "⚠️ Kart Limiti", desc: "Her oyuncuya max 2 kart (trait_positive + stat_boost). Negatif giderme ve arketip değişimi sayılmaz." },
  ],

  youth: [
    { title: "🎓 Altyapı Akademisi", desc: "Genç oyuncular yetiştir. Her sezon birkaç yeni yetenek çıkar. Kalite, tesis level'ına bağlı." },
    { title: "⬆️ Terfi Et", desc: "Hazır olan oyuncuyu A takıma çağır. Ücretsizdir, kadroya eklenir." },
    { title: "📊 Potansiyel", desc: "Oyuncunun gelecekte ulaşabileceği max OVR. Yüksek potansiyel = yıldız adayı." },
  ],

  topscorers: [
    { title: "👑 Gol Kralı", desc: "Tüm liglerin gol kralları sıralaması. Sadece lig maçları sayılır (kupa hariç)." },
    { title: "📊 Sıralama", desc: "Gol, asist veya rating'e göre sırala. Global sekmede tüm ülkeler." },
    { title: "🌍 Global", desc: "4 ülkenin (TR/GB/ES/DE) tüm liglerinden oyuncular." },
  ],

  awards: [
    { title: "🏆 Sezon Ödülleri", desc: "Lig şampiyonu, gol kralı, en iyi oyuncu gibi sezon sonu ödülleri." },
    { title: "🎖️ Kariyer Ödülleri", desc: "Tüm kariyer boyunca kazanılan ödüller. Şampiyonluk sayısı, gol rekorları." },
  ],

  reports: [
    { title: "📋 Haftalık Rapor", desc: "Son haftanın özeti: maç sonuçları, finansal durum, sakatlıklar, gelişim." },
    { title: "📊 Maç Raporu", desc: "Son maçın detaylı analizi: şut istatistikleri, poset, rating'ler." },
    { title: "💰 Finansal Rapor", desc: "Gelir/gider dökümü, bütçe trendi, maaş analizi." },
  ],

  news: [
    { title: "📰 Haberler", desc: "Transfer söylentileri, sakatlık haberleri, menajerlik fırsatları. Kategoriye göre filtrele." },
    { title: "🏷️ Kategoriler", desc: "Transfer, Söylenti, Sakatlık, Dönüş, Genel. İlgilendiğin türü seç." },
    { title: "✓ Okundu", desc: "Okunan haberler gri işaretlenir. Okunmayanlar vurgulu." },
  ],

  messages: [
    { title: "✉️ Mesajlar", desc: "Transfer teklif sonuçları, bot kulüp mesajları, sistem bildirimleri." },
    { title: "📥 Gelen", desc: "Sana gelen tüm mesajlar. Okunmamışlar mavi işaretli." },
    { title: "📤 Giden", desc: "Gönderdiğin tekliflerin durumunu buradan takip et." },
  ],

  // ═══════════════════════════════════════════════════════════════
  // KULÜP/LİG ALT SEKMELERİ (6)
  // ═══════════════════════════════════════════════════════════════

  standings: [
    { title: "📊 Puan Durumu", desc: "Lig sıralaması. O=Oynanan, G=Galibiyet, B=Beraberlik, M=Mağlubiyet, AG=Atılan Gol, YG=Yenen Gol, AV=Averaj, P=Puan." },
    { title: "🟢 Yükselme", desc: "İlk 2 sıra bir üst lige yükselir. Yeşil işaretli." },
    { title: "🔴 Küme Düşme", desc: "Son 3 sıra bir alt lige düşer. Kırmızı işaretli." },
    { title: "📊 Form", desc: "Son 5 maçın sonucu (G/B/M). İyi form = yeşil, kötü form = kırmızı." },
  ],

  scouting: [
    { title: "🔍 Scout Slotları", desc: "Aynı anda max 3 scout çalıştır. Her slot bir bölgeyi tarar. Tarama süresi level'a bağlı." },
    { title: "🌍 Bölgeler", desc: "Farklı ülkelerden oyuncu keşfet. Yüksek level slot = daha iyi oyuncular." },
    { title: "📋 Sonuçlar", desc: "Tarama bitince oyuncu listesi gelir. Beğenmediğini reddet, beğendiğini transfer teklifi gönder." },
  ],

  fixture: [
    { title: "📅 Fikstür", desc: "Lig maçlarının takvimi. 34 hafta boyunca her cumartesi oynanır." },
    { title: "✓ Oynanan", desc: "Tamamlanan maçların skorları. Yeşil=galibiyet, sarı=beraberlik, kırmızı=mağlubiyet." },
    { title: "⏳ Yaklaşan", desc: "Gelecek maçların tarihi ve rakibi. 'Maçı İzle' ile canlı oyna." },
  ],

  friendly: [
    { title: "🤝 Hazırlık Maçı", desc: "Online veya bot ile dostluk maçı. Sezon ortasında form kazanmak için." },
    { title: "💬 Sohbet", desc: "Maç sırasında rakiple sohbet et. Küfür filtresi aktif, rate-limit 60sn/10 mesaj." },
    { title: "🤖 Bot Maçı", desc: "Online rakip yoksa bot ile oyna. Sonuç kadro formuna etki eder." },
  ],

  facilities: [
    { title: "🏟️ Stadyum", desc: "Kapasite artır = daha çok bilet geliri. Her level maliyet 2.2x artar." },
    { title: "⚽ Saha", desc: "Saha kalitesi = antrenman verimi. Yüksek level = daha hızlı stat gelişimi." },
    { title: "🎓 Akademi", desc: "Genç oyuncu kalitesi. Yüksek level = daha yüksek potansiyelli yetenekler." },
    { title: "🏋️ Spor Salonu", desc: "Fiziksel gelişim (güç, dayanıklılık). Sakatlık riskini azaltır." },
    { title: "🏥 Medikal", desc: "Sakatlık iyileşme süresini kısaltır. Yüksek level = %50'ye kadar hızlı iyileşme." },
    { title: "📊 Analiz", desc: "Rakip analizi ve taktik insight. Maç motoruna küçük bonus." },
    { title: "👨‍⚕️ Personel", desc: "Doktor, antrenör, analist. Her biri farklı bonus verir. Maaş gideri ekler." },
  ],

  cup: [
    { title: "🏆 Kupa", desc: "Ulusal kupa turnuvası. Son 16'dan başlar, tek maç eleme usulü." },
    { title: "📅 Maç Saatleri", desc: "Kupa maçları cumartesi 12:00 ve 18:00'da oynanır. Lig maçından farklı saat." },
    { title: "🎁 Ödüller", desc: "Her tur geçtikçe para ödülü. Şampiyon = büyük bonus + kupa." },
    { title: "👁️ İzleyici Modu", desc: "Diğer takımların kupa maçlarını izle. Sonuçları takip et." },
  ],
};
