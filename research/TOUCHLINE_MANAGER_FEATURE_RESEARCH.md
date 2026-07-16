# Touchline Manager — Yeni Özellik Araştırma Raporu

**Araştırma kaynağı:** 24 web sorgusu, 26 kaynak (FM official, Top Eleven/Nordeus, Invincibles Studio, EA, GameRefinery, Unity, Deconstructor of Fun, GameAnalytics, BBC, SI Community, ESPN, NYTimes vb.)
**Tarih:** 2025
**Not:** Sports Interactive, FM25'i Şubat 2025'te **iptal etti** ve FM26'ya kaydırdı (NYTimes/ESPN). Bu, "uzun vadeli devrim" yerine "sık güncellenen, oynanabilir feature'lar" stratejisinin neden doğru olduğunu doğruluyor — Touchline Manager için fırsat penceresi açık.

---

## HIZLI KAZANÇLAR (1–2 hafta, kolay uygulanabilir)

### 1. Günlük Görevler (Daily Quests) Sistemi
- **Nasıl çalışır:** Her gün resetlenen 3–5 küçük görev (örn. "1 hazırlık maçı oyna", "1 oyuncu antrenmanı tammla", "1 transfer teklifi yap", "1 kozmetik eşya aç"). Tamamlama → kredi + XP + bazen kozmetik chest.
- **Uygulanabilirlik:** Kolay (Supabase'de `daily_quests` tablosu + cron reset; mevcut event'lerle zaten connection var)
- **Kullanıcı değeri:** Yüksek — Deconstructor of Fun'a göre "structured daily missions" retention'u D1/D7'de belirgin artırır; Facebook research'te en çok talep edilen 3 özellikten biri.
- **Rakip analizi:** Top Eleven'da günlük token/aktiviteler var; EA FC Mobile UCL event'inde "watch ad 5 pts, 3x/day" günlük limit mantığı.
- **Gelir potansiyeli:** Dolaylı — günlük giriş = reklam/watch ödül fırsatı.
- **⭐⭐⭐⭐⭐ Öncelik**

### 2. Haftalık Zorluklar (Weekly Challenges)
- **Nasıl çalışır:** 7 günlük milestone zinciri (örn. "Bu hafta 3 maç kazan", "Toplam 10 gol at"). Aşama bazlı ödüller.
- **Uygulanabilirlik:** Kolay (daily quest tablosunun genişletilmiş hali)
- **Kullanıcı değeri:** Yüksek — Unity 2024 raporu: haftalık objective'ler D14/D30 retention'u artırır.
- **Rakip analizi:** Top Eleven Special Sponsor'da haftalık tier görevleri; EA FC Mobile Team of the Week.
- **⭐⭐⭐⭐⭐ Öncelik**

### 3. Watch Ad → Ödül (Rewarded Video)
- **Nasıl çalışır:** Maç öncesi "Reklam izle → +10 kondisyon boost", "Reklam izle → bedava chest", "Reklam izle → transfer pazarı yenile".
- **Uygulanabilirlik:** Kolay (AdMob/ironSource entegrasyonu + mevcut kredi/chest sistemine hook)
- **Kullanıcı değeri:** Yüksek — AppSamurai verisi: ödül reklamı izleyenler 4x daha çok IAP yapar; %60 top-grossing oyun kullanır.
- **Rakip analizi:** EA FC Mobile (günde 3x reklam=UCL puanı); Top Eleven (token için reklam).
- **Gelir potansiyeli:** YÜKSEK — golden rule: sabırlı F2P oyuncu ödeyenin %60–70'i hızında ilerlemeli (Adreact).
- **⭐⭐⭐⭐⭐ Öncelik**

### 4. Maç Öncesi / Sonrası Animasyon & Gol Kutlaması
- **Nasıl çalışır:** Tünel çıkışı, taraftar tezahürat, golde özel kutlama (forma/rakip bazlı), son düdükte kupa/trofiya animasyonu.
- **Uygulanabilirlik:** Kolay–Orta (Lottie/Rive animasyon + mevcut maç motoruna hook)
- **Kullanıcı değeri:** Yüksek — Top Eleven 2025'in en öne çıkan "community-requested" feature'ları: "All-new match intro/outro scenes, in-match replays, trophy celebration" (Top Eleven official).
- **Rakip analizi:** Top Eleven 2025 (3D intro/outro/replay/trophy); EA FC Mobile UCL match intro.
- **⭐⭐⭐⭐⭐ Öncelik**

### 5. Liderlik Tablosu (Leaderboard) — Global + Arkadaş
- **Nasıl çalışır:** Haftalık/sezonsal puan tablosu: toplam kupa puanı, gol averajı, en uzun galibiyet serisi. Arkadaş leaderboard'u ve global.
- **Uygulanabilirlik:** Kolay (Supabase + mevcut presence altyapısı)
- **Kullanıcı değeri:** Yüksek — DevelopEx: "arkadaşları olan oyuncular 3–5x daha sık geri döner".
- **Rakip analizi:** EA FC Mobile Divisions/Rivals; Top Eleven league sıralaması.
- **⭐⭐⭐⭐⭐ Öncelik**

### 6. Sezon Pass (Battle Pass) — "Menajer Pass"
- **Nasıl çalışır:** 30–40 tier'lık paralel track (free + premium). XP: maçlar, görevler, transfer. Premium tier → kozmetik bundle + premium oyuncu paketi.
- **Uygulanabilirlik:** Orta (yeni tablolar + UI; mantık daily questlerle ortak)
- **Kullanıcı değeri:** Yüksek — GameAnalytics/GameRefinery: battle pass hem retention hem ARPU'yu yükseltir.
- **Rakip analizi:** Top Eleven "Special Sponsor" ($5.99→$7.99); EA FC season pass.
- **Gelir potansiyeli:** ÇOK YÜKSEK — tek başına ARPU'yu %30+ artırabilir.
- **⭐⭐⭐⭐⭐ Öncelik**

### 7. Push Notifications (CanlıOps)
- **Nasıl çalışır:** "Maçın başlıyor", "Transfer teklifin yanıtlandı", "Sezon pass'ın %80 doldu", "Derbi bu akşam 21:00". Firebase Cloud Messaging.
- **Uygulanabilirlik:** Kolay (FCM + Supabase trigger)
- **Kullanıcı değeri:** Yüksek — Adjust/Stash: push + in-app offer year-round engagement'ın temeli.
- **Rakip analizi:** Top Eleven, EA FC Mobile hepsi aktif kullanıyor.
- **⭐⭐⭐⭐ Öncelik**

---

## ORTA VADELİ (1–2 ay)

### 8. Asenkron Multiplayer Lig ("Şampiyonlar Ligi")
- **Nasıl çalışır:** Kullanıcıların takımı AI tarafından oynanır (diğer menajerlerin taktik snapshot'ı + kadrosu). 18 gerçek kullanıcının takımı bir ligde. Sonuçlar her matchday'de hesaplanır. "Ghost" rakipler (Steam Community tanımı: "fighting ghosts of real players").
- **Uygulanabilirlik:** Orta (mevcut AI maç motoru + Supabase'de takım snapshot'ı + presence'dan genişletme)
- **Kullanıcı değeri:** Çok Yüksek — gerçek multiplayer hissi, senkron zaman derdi yok.
- **Rakip analizi:** Top Eleven (32-grup lig → 2025'te 36 takımlık tek lig, 4 ev/4 deplasman); OSM (Online Soccer Manager).
- **Gelir potansiyoli:** Yüksek — lig sonu ödül + pass ile bağlanır.
- **⭐⭐⭐⭐⭐ Öncelik**

### 9. Turnuva Sistemi (Cup / Knockout)
- **Nasıl çalışır:** Hafta sonu 32 kişilik tek maç eleme. EA FC Mobile UCL tarzı "match intro scenes" + trophy.
- **Uygulanabilirlik:** Orta (lig altyapısının yeniden kullanımı)
- **Kullanıcı değeri:** Yüksek — zamanlı rekabet = tekrar giriş.
- **Rakip analizi:** EA FC Mobile UEFA Champions League mode (deep dive duyurusu).
- **⭐⭐⭐⭐⭐ Öncelik**

### 10. Basın / Media Yönetimi
- **Nasıl çalışır:** Maç öncesi/sonrası 2–3 soru (basın toplantısı). Cevaplar → oyuncu moral, taraftar beklentisi, rakip menajer ilişkisi, transfer pazarlığı kolaylığı. SI Community: "cevabın player/fan morale + manager relationship'u garantili etkiler".
- **Uygulanabilirlik:** Orta (UI + moral modifiyerleri)
- **Kullanıcı değeri:** Yüksek — FM'de en çok tartışılan derinlik kaynaklarından biri.
- **Rakip analizi:** Football Manager (press conferences); FM24'te bazen tekrarcı eleştirisi var → biz daha az tekrarla.
- **⭐⭐⭐⭐ Öncelik**

### 11. Oyuncu Moral & Kimya (Chemistry) Sistemi
- **Nasıl çalışır:** EA FC Ultimate Team tarzı kimya: aynı ülkul/lig/takım oyuncular together → bonus. Kaptan seçimi moral etkiler (Reddit/FM: "kaptan kişiliği iyiyse takım maçta sinirlenmiyor").
- **Uygulanabilirlik:** Orta (oyuncu verisine ülke/lig + kaptan flag ekle)
- **Kullanıcı değeri:** Yüksek — kadro mühendisliğine derinlik.
- **Rakip analizi:** EA FC Mobile (chemistry boosts); FM (captain, morale).
- **⭐⭐⭐⭐ Öncelik**

### 12. Stadyum Genişletme & Campus
- **Nasıl çalışır:** Top Eleven 2025 "Campus" modeli: stadyum + altyapı tesisleri tek ekranda; kapasite/genişletme kararları geliri etkiler. Mevcut tesis sistemini genişlet.
- **Uygulanabilirlik:** Orta (mevcut tesis sistemini UI ve ekonomik etkiyle derinleştir)
- **Kullanıcı değeri:** Orta–Yüksek.
- **Rakip analizi:** Top Eleven 2025 Campus; Dream League Soccer 2026 facilities revamp; FM stadium expansion.
- **⭐⭐⭐⭐ Öncelik**

### 13. Dinamik Transfer Pazarı (Supply–Demand)
- **Nasıl çalışır:** Oyuncu fiyatı arz/talep ve form bazlı değişir. Formu yüksek oyuncu %30–50 zam. Transfer deadline günü premiums fiyat.
- **Uygulanabilirlik:** Orta (mevcut transfer + yeni fiyat algoritması)
- **Kullanıcı değeri:** Yüksek.
- **Rakip analizi:** FM25 vaadi: "improved scouting and transfer system with personalized reports" (sortitoutsi).
- **⭐⭐⭐⭐ Öncelik**

### 14. Achievement / Rozet Sistemi
- **Nasıl çalışır:** 50–100 rozet: "İlk derbi galibiyeti", "Üst üste 10 maç yenilmeyen", "Akademi oyuncusundan yıldız", "3. Lig'den Süper Lig'e yüksel". Rozetler profilde görünür.
- **Uygulanabilirlik:** Orta (event-driven)
- **Kullanıcı değeri:** Orta–Yüksek — uzun vadeli hedefler.
- **Rakip analizi:** EA FC Mobile (achievements), DLS (classic players unlock).
- **⭐⭐⭐⭐ Öncelik**

### 15. Scout Ağı & Dünya Haritası
- **Nasıl çalışır:** Bölge bazlı scout ataması (Güney Amerika, Afrika, Avrupa). Bölge + scout kalitesi → keşif raporları. FM: "scouting assignments + youth recruitment network".
- **Uygulanabilirlik:** Orta (mevcut personel sistemine scout bölgesi ekle)
- **Kullanıcı değeri:** Yüksek — keşif derinliği.
- **Rakip analizi:** FM (scouting network); DLS (scout).
- **⭐⭐⭐⭐ Öncelik**

### 16. Canlı / Zamanlı Eventler (Live Ops)
- **Nasıl çalışır:** 2–7 günlük tematik eventler: "Derbi Haftası", "Transfer Penceresi", "Türkiye Kupası Sprinti". Event para birimi + milestone ödülleri.
- **Uygulanabilirlik:** Orta (config-driven event engine)
- **Kullanıcı değeri:** Yüksek — SplitMetrics/UserWise: LiveOps'lar ARPU ve retention'ın temel motoru.
- **Rakip analizi:** EA FC Mobile (UCL, TOTS, Globetrotters); Top Eleven (Legends Assemble).
- **⭐⭐⭐⭐⭐ Öncelik**

### 17. Klüp / Lonca (Guild) Sistemi
- **Nasıl çalışır:** 20 kişilik "Kulüpler"; ortak hedef (örn. "Kulüp olarak 100 maç kazan"), kulüp chest'i, kulüpler arası lig.
- **Uygulanabilirlik:** Orta (yeni tablo + chat basit)
- **Kullanıcı değeri:** Yüksek — DevelopEx: guild'ler retention'ı 3–5x artırır.
- **Rakip analizi:** FM'de yok; EA FC Clubs'ta var; mobil futbol menajerde nadir → fark yaratma fırsatı.
- **⭐⭐⭐⭐ Öncelik**

---

## UZUN VADELİ (3+ ay)

### 18. Gerçek Multiplayer Lig (Senkron)
- **Nasıl çalışır:** Gerçek kullanıcılar aynı ligde, maçlar eş zamanlı veya turn-based simülasyon. Planlama karmaşık.
- **Uygulanabilirlik:** Zor (real-time sync, disconnect handling, mismatch)
- **Kullanıcı değeri:** Çok Yüksek ama operational risk yüksek.
- **Rakip analizi:** Top Eleven (canlı lig); OSM.
- **⭐⭐⭐ Öncelik**

### 19. Taktik Geliştirme Ağacı (Research Tree)
- **Nasıl çalışır:** Antrenman/araştırma puanıyla yeni taktik modülleri (gegenpress, false 9, 3-4-3 diamond) açılır.
- **Uygulanabilirlik:** Zor (yeni progression sistemi + maç motoru entegrasyonu)
- **Kullanıcı değeri:** Orta–Yüksek.
- **Rakip analizi:** Nadir (FM'de sertifikasyon); mobilde yok → fark.
- **⭐⭐⭐ Öncelik**

### 20. Oyuncu Kariyer Hikayesi (Narrative)
- **Nasıl çalışır:** Her oyuncunun "story arc" — genç yetenek → kiralık → ilk 11 → kaptan → efsane. Event'ler, diyaloglar, basın.
- **Uygulanabilirlik:** Zor (narrative engine + çok sayıda event)
- **Kullanıcı değeri:** Yüksek — emotional bond retention'u artırır.
- **Rakip analizi:** FM'de sınırlı; EA FC Player Career; mobilde nadir.
- **⭐⭐⭐ Öncelik**

### 21. Antrenör Sertifikasyon Sistemi
- **Nasıl çalışır:** Personel (antrenör, fizyo, scout, analist) seviye atlar, sertifika alır, uzmanlık kazanır.
- **Uygulanabilirlik:** Orta–Zor.
- **Kullanıcı değeri:** Orta.
- **Rakip analizi:** FM (staff badges); mobilde nadir.
- **⭐⭐⭐ Öncelik**

### 22. Altyapı Akademisi Detaylandırma
- **Nasıl çalışır:** FM-style "youth intake" — yıllık yeni yetenek dalgası, junior coaching & youth recruitment network (FM official guide).
- **Uygulanabilirlik:** Orta (akademi tesisine annual youth event)
- **Kullanıcı değeri:** Yüksek — uzun vadeli bağ.
- **Rakip analizi:** FM (youth development guide); FM26 youth intakes.
- **⭐⭐⭐⭐ Öncelik**

### 23. Offline Mod + Cloud Save
- **Nasıl çalışır:** Maç motoru ve tek oyunculu mod offline; bulut sync online geri dönünce. 
- **Uygulanabilirlik:** Zor (state merge, conflict resolution)
- **Kullanıcı değeri:** Yüksek — metro/uygulama içi kullanım.
- **Rakip analizi:** Ultimate Football Club Manager (offline); DLS (offline).
- **⭐⭐⭐ Öncelik**

### 24. Oyuncu Karşılaştırma Aracı & İstatistik Grafikleri
- **Nasıl çalışır:** İki oyuncuyu yan yana radar/bar chart ile karşılaştır. Sezon istatistik görselleştirme.
- **Uygulanabilirlik:** Orta (chart kütüphanesi)
- **Kullanıcı değeri:** Orta.
- **Rakip analizi:** FM (player comparison); Soccer Manager 2025 (UI vurgusu).
- **⭐⭐⭐ Öncelik**

### 25. Widget (Ana Ekran) + Siri/Assistant
- **Nasıl çalışır:** iOS/Android widget: bir sonraki maç, skor, pass progress. Sesli "menajerim kim?"
- **Uygulanabilirlik:** Orta (platform özel)
- **Kullanıcı değeri:** Orta.
- **Rakip analizi:** EA FC Mobile widget; futbol menajerde nadir.
- **⭐⭐⭐ Öncelik**

---

## TREND ÖZELLİKLER (2024–2025)

### T1. 3D Maç Motoru Animasyonları (Match Motion)
- Top Eleven 2025: "3D match engine, all-new match intro/outro, in-match replays, trophy celebration". Soccer Manager 2025: "Match Motion, 300+ new animations". 
- Touchline Manager için: mevcut maç motoruna replay + intro/outro eklemek (öncelik #4).
- **⭐⭐⭐⭐⭐**

### T2. "Tiles & Cards" UI (FM25 vaadi)
- FM25: "tiles and cards system" ile modern UI, "Portal" (email sayfasının yerine). FM25 iptal oldu ama UI trend'i devam ediyor.
- Touchline Manager için: kart-tabanlı dashboard (oyuncu kartı, maç kartı).
- **⭐⭐⭐⭐**

### T3. Kadın Futbolu
- FM5'in en büyük vaadi "Introducing Women's Football" (FM Scout). Trend büyüyor.
- Touchline Manager için: opsiyonel kadın lig modu (Türkiye Kadınlar Süper Ligi).
- **⭐⭐⭐**

### T4. Resmi Lisans / Premier League
- FM25'in en büyük hammlesi: Premier League resmi lisans (logolar, forma, oyuncu foto). 
- Touchline Manager için: lisans pahalı; jenerik + Türk lig gerçekçiliği ile telafi.
- **⭐⭐⭐**

### T5. Rush / 5v5 Mini Modu
- EA FC 25: "Rush 5v5" — hızlı, küçük kadro modu.
- Touchline Manager için: hızlı 5dk'lık mini maç modu (engagement booster).
- **⭐⭐⭐⭐**

### T6. UTOTS / Team of the Season Canlı Event
- EA FC Mobile 2025 ilk kez "Ultimate Team of the Season" mobilde. Zamanlı, sezon sonu, meta-shifting kartlar.
- Touchline Manager için: sezon sonu "Sezonun 11'i" özel kozmetik + oyuncu kartları.
- **⭐⭐⭐⭐⭐**

### T7. Header Bidding & Yeni Reklam Teknolojisi
- GameRefinery 2024: Header Bidding (Google Ads) en hızlı büyüyen reklam trendi → eCPM artışı.
- Touchline Manager için: ileride rewarded ad altyapısını header bidding'e taşı.
- **⭐⭐⭐⭐**

---

## TÜRKİYE PAZARI ÖZEL

### TR1. Derbi Sistemi & Taraftar Atmosferi
- "Intercontinental Derby" (Galatasaray–Beşiktaş/Fenerbahçe) — dünyanın en ateşli derbilerinden (LaLiga/Reddit). 
- Nasıl: Derbi maçlarında özel atmosfer, boosted home advantage, özel tezahürat, derbi sonrası taraftar mutluluk/kızgınlık modifier.
- **⭐⭐⭐⭐⭐ Öncelik**

### TR2. Türk Lig Yapısı Detayları
- 4 kademeli sistem (Süper Lig → 1. Lig → 2. Lig → 3. Lig) zaten var. Eklenebilir: play-off (1. Lig'den Süper Lig'e 3-6. sıra play-off), küme düşme kuralları, TFF kuralları.
- **⭐⭐⭐⭐ Öncelik**

### TR3. Türk Oyuncu İsim Jeneratörü (Newgen)
- Reedsy ve SCM'de Türk isim üretici var. FM'de newgen isimleri default DB'den çekilir.
- Nasıl: ilk ad + soyad havuzu (örn. Ahmet, Mehmet, Burak; Yılmaz, Demir, Şahin) + bölgesel dağılım.
- **⭐⭐⭐⭐ Öncelik**

### TR4. Yerel Liderlik Tablosu & Türkçe Topluluk Ligleri
- Türkiye'ye özel leaderboard + "İstanbul Ligi", "Anadolu Ligi" gibi coğrafi ligler.
- **⭐⭐⭐⭐ Öncelik**

### TR5. Passolig / Bilet Sistemi Entegrasyonu (Kozmetik)
- Gerçek hayatta Passolig bilet sistemi var → oyunda "sezonluk koltuk" kozmetiği (VIP loca tema).
- **⭐⭐⭐ Öncelik**

### TR6. Türkçe Spiker / Yorumcu
- DLS 2025'in öne çıkan özelliklerinden "Portuguese commentary" — yerel dile spiker büyük differentiation.
- **⭐⭐⭐⭐ Öncelik**

### TR7. Sezon Sonu Ödül Töreni (Türk stili)
- Kupa töreni + Türkçe tebrik mesajları + bayrak animasyonu.
- **⭐⭐⭐ Öncelik**

---

## GELİR ODAKLI FİKİRLER

### $1. Sezon Pass — "Menajer Pass" (premium tier)
- $4.99–$7.99 (Top Eleven Special Sponsor benchmark). 30 tier, kozmetik + premium oyuncu + token.
- Tahmini ARPU artışı: +%25–40.
- **⭐⭐⭐⭐⭐**

### $2. Rewarded Video (watch ad → ödül)
- AppSamurai: 4x IAP artışı, %60 top-grossing kullanır. Yango: %71 daha yüksek ROAS.
- **⭐⭐⭐⭐⭐**

### $3. Premium Oyuncu Paketleri (Gacha)
- EA FC Ultimate Team modeli: paket açma (4 rarity zaten var: common/rare/epic/legendary). "Legend oyuncu" düşük drop rate.
- **⭐⭐⭐⭐⭐**

### $4. Kozmetik Bundle'lar
- Derbi özel forma + stadyum tema + top set (bundle %20 indirim).
- **⭐⭐⭐⭐**

### $5. Sponsorlu Eventler (Brand Partnerships)
- Marka sponsorluğunda özel kozmetik (örn. "X marka stadyum tabelası"). Gelecekte marka anlaşmaları için altyapı.
- **⭐⭐⭐ Öncelik** (uzun vade)

### $6. İsim Değiştirme / Klüp Adı Premium
- Klüp adını değiştirme, özel forma tasarımı — küçük ama yüksek marj IAP.
- **⭐⭐⭐⭐**

### $7. Reklamsız (Remove Ads) Tek Seferlik
- $3.99–$9.99 one-time. Rewarded ad yerine token'a çevrilebilir (hibrit).
- **⭐⭐⭐ Öncelik**

### $8. Token / Kredi Çoklu Paketleri
- Mevcut kredi sistemi + tiered bundle (küçük/orta/büyük + first-purchase bonus).
- **⭐⭐⭐⭐**

---

## ÖNERİLEN ROADMAP (İlk 15 Özellik)

| Sıra | Özellik | Efor | Değer | Gelir | Öncelik |
|------|---------|------|-------|-------|---------|
| 1 | Günlük Görevler | Kolay | Yüksek | Dolaylı | ⭐⭐⭐⭐⭐ |
| 2 | Haftalık Zorluklar | Kolay | Yüksek | Dolaylı | ⭐⭐⭐⭐⭐ |
| 3 | Rewarded Video (watch ad) | Kolay | Yüksek | **Yüksek** | ⭐⭐⭐⭐⭐ |
| 4 | Push Notifications | Kolay | Yüksek | Dolaylı | ⭐⭐⭐⭐ |
| 5 | Maç Öncesi/Sonrası Animasyon + Gol Kutlaması | Kolay–Orta | Yüksek | Dolaylı | ⭐⭐⭐⭐⭐ |
| 6 | Liderlik Tablosu (global+arkadaş) | Kolay | Yüksek | Dolaylı | ⭐⭐⭐⭐⭐ |
| 7 | Sezon Pass (Menajer Pass) | Orta | Yüksek | **Çok Yüksek** | ⭐⭐⭐⭐⭐ |
| 8 | Derbi Sistemi & Taraftar Atmosferi | Orta | Yüksek | Dolaylı | ⭐⭐⭐⭐⭐ |
| 9 | Asenkron Multiplayer Lig | Orta | Çok Yüksek | Yüksek | ⭐⭐⭐⭐⭐ |
| 10 | Canlı/Zamanlı Eventler (Live Ops) | Orta | Yüksek | Yüksek | ⭐⭐⭐⭐⭐ |
| 11 | Premium Oyuncu Paketleri (gacha) | Orta | Yüksek | **Çok Yüksek** | ⭐⭐⭐⭐⭐ |
| 12 | Turnuva Sistemi (Cup/Knockout) | Orta | Yüksek | Yüksek | ⭐⭐⭐⭐ |
| 13 | Basın/Media Yönetimi | Orta | Yüksek | — | ⭐⭐⭐⭐ |
| 14 | Moral & Kimya (Chemistry) + Kaptan | Orta | Yüksek | — | ⭐⭐⭐⭐ |
| 15 | Klüp/Lonca (Guild) Sistemi | Orta | Yüksek | Yüksek | ⭐⭐⭐⭐ |

---

## KAYNAKLAR (doğrulanmış web verileri)

**Futbol menajer rakip analiz:**
- footballmanager.com — FM25 iptal duyurusu (Şubat 2025)
- onefootball.com, fmscout.com, indy100.com — FM25 features (Portal, Premier League lisans, women's football, tiles/cards UI)
- sortitoutsi.net — FM25 improved scouting/transfer system
- nytimes.com, espn.com — FM25 iptal nedenleri
- topeleven.com, bleedingcool.com, espn.com — Top Eleven 2025 (3D intro/outro, replay, trophy, Grounds+Campus stadium revamp, 36-team league)
- forum.topeleven.com, top-eleven.fandom.com — Top Eleven Special Sponsor ($5.99→$7.99), TV sponsor token
- invinciblesstudio.com, cryptorank.io, bluestacks.com — Soccer Manager 2025 (Match Motion 300+ animations, UI overhaul)
- ea.com, wikipedia.org, fifamobileguide.com — EA FC Mobile (Rush 5v5, UCL mode intro scenes, watch ad 5pts 3x/day, UTOTS 2025, chemistry boosts)
- pocketgamer.com, play.google.com — Dream League Soccer 2025 (Classic players, bigger squads, Portuguese commentary, facilities revamp)

**Mobil engagement/monetizasyon:**
- gameanalytics.com, gamedeveloper.com, gamerefinery.com, deconstructoroffun.com — Battle pass design
- gamerefinery.com — 2024 header bidding trend
- unity.com — 2024 Mobile Growth & Monetization Report (rewarded video, weekly objectives)
- appsamurai.com, yango-ads.com, adreact.com, tenjin.com — Rewarded ads (4x IAP, 60% top games, 60-70% pace rule, 71% higher ROAS)
- developex.com, sdlccorp.com, featureupvote.com, maf.ad — Social/guild retention (3-5x return)
- adjust.com, splitmetrics.com, userwise.io, stash.gg — LiveOps & push notifications
- bgaming.com, livelike.com — Daily quests retention
- investgame.net, asomobile.net, linkedin.com — $150B IAP 2024, subscriptions rising

**Realizm/içerik:**
- fminside.net, givemesport.com, fmscout.com, sortitoutsi.net, reddit.com — FM Medical Centre, injury rehab, ACL, head physio, captain impact on team nervousness
- footballmanager.com, passion4fm.com, footballgpt.co, community.sports-interactive.com — FM youth development, scouting network, youth recruitment
- bbc.com, gamestudies.org, designthegame.com — Dynamic weather effects on gameplay
- fccadoni.medium.com, sortitoutsi.net, fm-base.co.uk, footballgpt.co — Press conferences, morale, man management
- reddit.com/r/footballmanagergames — captain effect, newgen names
- reedsy.com, soccerclubmanager.com, lingobrights.com — Turkish/player name generators
- footballgpt.co, reddit.com/r/footballmanager — Club finances, wage budget (wages <60% of income), board expectations

**Türkiye pazarı:**
- laliga.com, soccerflick.com, reddit.com/r/superlig — Turkish Super Lig passion, Intercontinental/Istanbul Derby
- play.google.com, apps.apple.com — Mevcut Süper Lig oyunları
- istanbultours.com — Passolig ticket system
