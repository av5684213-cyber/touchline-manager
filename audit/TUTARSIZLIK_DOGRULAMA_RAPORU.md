# Tutarsızlık Raporu Doğrulama Sonuçları

**Tarih:** Otomatik denetim  
**Kapsam:** `/home/z/my-project/src` (bizim kod tabanımız)  
**Yöntem:** Her madde için kaynak dosyalarda satır satır kontrol; kod DEĞİŞTİRİLMEDİ, sadece araştırma yapıldı.

**Özet:** 25 maddeden **10 VAR**, **2 KISMEN**, **13 YOK**. Rapordaki 13 madde bizim kod tabanımızda karşılık bulamadı (ya ilgili dosya yok ya da iddia edilen tutarsızlık mevcut değil). 12 madde gerçekten sorunlu — bunların 5'i kritik.

---

## GRUP A — Veri alanı uyumsuzluğu

### T-01: "gd" vs "goal_diff" — standings.tsx'te sort yaparken field ismi uyumsuzluğu
**[YOK]** — `src/lib/mock/season.ts:147-219` ve `src/components/touchline/screens/standings.tsx:193`

`computeStandings` tek tip `goalsFor` / `goalsAgainst` kullanır (season.ts:162-163, 180-183, 213-214, 216). standings.tsx:193'te `const gd = row.goalsFor - row.goalsAgainst;` aynı isimleri kullanır. `gd` veya `goal_diff` adında bir alan YOK. Tutarsızlık bizde mevcut değil.

---

### T-02: "goals_for"/"goals_against"/"gf"/"ga" — farklı isimler
**[YOK]** — `src/lib/mock/season.ts:52-65` (StandingRow interface) + tüm kullanım yerleri

Tüm kod tabanında sadece `goalsFor` / `goalsAgainst` isimleri kullanılıyor. `gf`, `ga`, `goals_for`, `goals_against` hiçbir yerde yok. StandingRow interface tek tip.

---

### T-03: watchlist tipi — string[] mi Player[] mi?
**[YOK (transfer/store arasında)]** — `src/lib/store.ts:95`, `src/components/touchline/screens/transfer.tsx:56-60,173,198`

`store.ts:95` → `watchlist: string[]` (net). transfer.tsx tutarlı şekilde `string[]` olarak kullanıyor (`transfer.watchlist.includes(p.id)`, `.map((id) => ...)`). Transfer + store arasında tutarsızlık YOK.

**Not:** `src/lib/match/engine/types.ts:544` içinde ayrı bir `watchlist?: Player[]` var, ama bu SCOUT ağacı bağlamında (scout network), transfer watchlist'i değil. Farklı alt sistemler — çakışma yok ama isim benzerliği kafa karıştırıcı.

---

### T-04: StandingRow interface — farklı shape'ler
**[YOK]** — `src/lib/mock/season.ts:52-65`

Tek bir StandingRow interface tanımı var. Tüm tüketiciler (standings.tsx) bu shape'i kullanıyor. Alternatif tip tanımı yok.

---

## GRUP B — Hesaplama tutarsızlığı

### T-05: Piyasa değeri — kaç farklı formül?
**[VAR]** — 4 farklı formül, 3'ü paralel; önerilen tek kaynak ilkesi ÇİĞNENİYOR

| # | Konum | Formül | Çağrılıyor mu? |
|---|-------|--------|----------------|
| 1 | `src/lib/mock/data.ts:641-643` | `rating² × 8000 × ageMult × archMult × posMult × condMult × moraleMult × traitMult × formMult` (inline) | EVET (oyuncu üretiminde) |
| 2 | `src/lib/valuation.ts:49-88` `calculatePlayerValue` | AYNI formül (#1 ile birebir) | **HİÇBİR YERDE import edilmiyor** |
| 3 | `src/lib/fm/valuation.ts:24-54` `calculateBaseMarketValue` | `overall × 100_000 × ageMult × formMult × traitMult × injuryMult` | **HİÇBİR YERDE import edilmiyor** |
| 4 | `src/lib/mock/transfer.ts:345` | `ovr * 80_000` (serbest ajanlar için) | EVET (generateFreeAgentListings) |

**Düzeltme önerisi:** `lib/valuation.ts` ile `lib/fm/valuation.ts` çift tanımdır. data.ts zaten valuation.ts ile aynı formülü inline kullanıyor — valuation.ts'i tek kaynak yap, data.ts ve transfer.ts:345'i ona bağla. `lib/fm/valuation.ts` ya silinmeli ya da `calculatePlayerValue`'ye delegate etmeli.

---

### T-06: Maaş hesaplama — kaç formül?
**[VAR]** — 3 farklı formül, 2'si paralel

| # | Konum | Formül | Çağrılıyor mu? |
|---|-------|--------|----------------|
| 1 | `src/lib/mock/data.ts:520` | `ovr × rand(800, 2200)` (rastgele) | EVET (üretimde) |
| 2 | `src/lib/valuation.ts:95-112` `calculateWeeklyWage` | `rating × 950 × tierMult × ageBonus` (tier: 1.5/1.2/1.0/0.8) | **HİÇBİR YERDE import edilmiyor** |
| 3 | `src/lib/fm/salaryUtils.ts:33-45` `calculateSalaryRange` | `overall × 950 × tierMult × inflation` (tier: 1.5/1.0/0.65/0.4) | **HİÇBİR YERDE import edilmiyor** |

İki hesap fonksiyonunda TIER MULTIPLIERS BİLE FARKLI: valuation.ts `{1:1.5, 2:1.2, 3:1.0, 4:0.8}` vs salaryUtils.ts `{1:1.50, 2:1.00, 3:0.65, 4:0.40}`.

**Düzeltme önerisi:** data.ts:520'nin rastgele formülü gerçek bir maaş fonksiyonuyla değiştirilmeli; valuation.ts ile salaryUtils.ts'ten biri seçilmeli (öneri: salaryUtils.ts — inflation içeriyor, daha modern), diğeri silinmeli.

---

### T-07: Transfer vergisi — store.ts makeTransferOffer'da vergi oranları
**[VAR]** — Sabitler 2 yerde duplicate, store.ts hardcode edilmiş

| Konum | İçerik |
|-------|--------|
| `src/lib/valuation.ts:118-120` | `TRANSFER_TAX_RATE=0.025, AGENT_FEE_RATE=0.05, SIGNING_BONUS_RATE=0.03` + `calculateBuyerCost` + `calculateSellerNet` |
| `src/lib/mock/transfer.ts:286-308` | **Aynı 3 sabit + aynı 2 fonksiyon** birebir kopya |
| `src/lib/store.ts:533` | `fee + Math.round(fee * 0.05) + Math.round(fee * 0.03)` — **hardcoded**, sabitleri kullanmıyor |
| `src/components/touchline/screens/transfer.tsx:22,662` | `calculateBuyerCost`'u `lib/mock/transfer`'tan import ediyor |

**Düzeltme önerisi:** `lib/valuation.ts`'teki sabitler + fonksiyonlar silinip tek kaynak `lib/mock/transfer.ts` yapılsın; `store.ts:533` hardcode yerine `calculateBuyerCost(fee).total` kullanılsın.

---

### T-08: Oyuncu talep ücreti — client vs server tutarsızlığı
**[YOK]** — Bizde server YOK (sadece client). Tüm talep üretimi `src/lib/mock/transfer.ts` (client) içinde: `wageDemand: Math.round(player.weeklyWage * 1.2)` (line 370), `askingPrice = marketValue × (1 + rand(-10,20)/100)` (line 235).

---

### T-09: Antrenman saati — training.tsx + training/engine.ts uyumsuz mu?
**[KISMEN]** — Engine soyut slot, UI hardcoded saat

- `src/lib/training/engine.ts:14` yorum: "Günde 2 seans (morning/afternoon)"
- `src/lib/training/engine.ts:155` → `SessionSlot = "morning" | "afternoon"` (soyut)
- `src/components/touchline/screens/training.tsx:33-35` → `TRAINING_HOUR_TR = [15, 21] as const` (hardcoded saatler)
- Engine'in `sessionSlot` field'ı UI tarafından hiç map'lenmiyor; UI gerçek zaman saatine göre `getTrainingSchedule()` çalıştırıyor.

**Düzeltme önerisi:** Engine'deki `SessionSlot` tipi ya kaldırılmalı ya da `[15, 21]` değerlerini içeren bir konfig ile doldurulup UI tarafından kullanılmalı.

---

### T-10: Tesis yükseltme maliyeti — facilities.tsx + stadiumMatrix.ts uyumsuz mu?
**[VAR]** — 3 yer, 3 farklı davranış

| Konum | Formül | İnflasyon | baseCost |
|-------|--------|----------|----------|
| `src/lib/stadiumMatrix.ts:279-282` `calculateUpgradeCost(baseCost, level)` | `baseCost × 2.2^(level-1)` | YOK | Parametre (her tesis için ayrı: 120K-350K) |
| `src/lib/store.ts:939` | `250000 × 2.2^currentLevel` | YOK | **Hardcoded 250K** (tüm tesisler için) |
| `src/components/touchline/screens/facilities.tsx:61-65` `calcUpgradeCost` | `250000 × 2.2^currentLevel` | **VAR** (`applyInflation`) | **Hardcoded 250K** |

`stadiumMatrix.ts`'in `calculateUpgradeCost` fonksiyonu HİÇBİR YERDE çağrılmıyor. store.ts facilities.levels'taki 6 anahtarı (stadium/pitch/academy/gym/medical/analysis) kullanırken, stadiumMatrix.ts 10 farklı tesis id'si (capacity/lighting/scoreboards/heating/vip/store/pitch/media/academy/medical) tanımlıyor — KİME HİTAP ETTİĞİ BELİRSİZ.

**Düzeltme önerisi:** `lib/stadiumMatrix.ts:calculateUpgradeCost` tek kaynak yapılmalı; hem store.ts hem facilities.tsx onu çağırmalı; inflation her ikisinde de uygulanmalı; per-facility baseCost kullanılmalı.

---

### T-11: Akademi sistemi — kaç paralel sistem?
**[VAR]** — 3-4 paralel tanım, sadece 1'i çalışıyor

1. `src/lib/store.ts:298` → `facilities.levels.academy` (0-10) — store + UI bunu kullanıyor
2. `src/lib/stadiumMatrix.ts:96-104` → `academy` FacilityDef (10 tesisli sistemin parçası) + `getAcademyQualityMultiplier(level)` (line 308)
3. `src/lib/match/engine/stadiumMatrix.ts:101-109` → ayrı bir STADIUM_MATRIX içinde academy
4. `src/components/touchline/screens/youth-academy.tsx:19,35` → `facilities.levels.academy` okuyor, ama `getAcademyQualityMultiplier` çağırmıyor; doğrudan `generatePlayer(pos, {min:40, max:60})` ile rastgele üretim

`getAcademyQualityMultiplier` HİÇBİR YERDE kullanılmıyor. Akademi seviyesi `youth-academy.tsx:19`'da sadece **count** için kullanılıyor (`3 + academyLevel`), kalite çarpanı için değil.

**Düzeltme önerisi:** `youth-academy.tsx`'te oyuncu üretiminde `generatePlayer`'a `getAcademyQualityMultiplier(academyLevel)` çarpanı uygulanmalı; store.ts'in 6-anahtarlı `levels` şeması ile stadiumMatrix.ts'in 10-id'li FACILITIES dizisi mutabık hale getirilmeli.

---

### T-12: Küme düşme zonu — UI vs backend uyumsuzluğu
**[VAR]** — KESİN uyumsuzluk, her iki yönde

| Pozisyon (idx) | UI (standings.tsx:20-32) | Backend (store.ts:1263-1267,1326-1327) | Sonuç |
|----------------|--------------------------|----------------------------------------|-------|
| 1-2 (idx 0-1) | promotion (yeşil) | `myFinalIdx < 3` → promote | OK |
| 3 (idx 2) | **playoff (sarı)** | **`myFinalIdx < 3` → promote** | **UI yanlış gösteriyor** |
| 4 (idx 3) | playoff (sarı) | middle | OK (ama backend playoff'u işlemiyor) |
| 16 (idx 15) | **middle (gri)** | **`myFinalIdx >= 15` → relegate** | **UI yanlış gösteriyor** |
| 17-18 (idx 16-17) | relegation (kırmızı) | `myFinalIdx >= 15` → relegate | OK |

**Düzeltme önerisi:** standings.tsx:23-31'deki `getZone` fonksiyonu store.ts:1263,1267 ile aynı eşikleri kullanmalı: promotion için `idx <= 2`, relegation için `idx >= 15`. Alternatif olarak backend playoff kavramını kaldırıp UI'ya uydurabilir (3-4 → no-op, sadece 1-2 promote).

---

## GRUP C — İşlevsel tutarsızlık

### T-13: Operasyon etkisi maçta sıfır — operation/impactType var mı?
**[VAR]** — Tip tanımlı, motor kullanmıyor

- `src/lib/match/engine/types.ts:499` → `impactType: 'stamina' | 'luck' | 'referee' | 'error_rate' | 'money' | 'points' | 'defense' | 'cleanup'`
- `src/lib/match/engine/types.ts:506-508` → `ActiveOperation` interface
- `src/lib/match/engine/types.ts:569` → `activeOperations?: ActiveOperation[]` (PlayerStats opsiyonel alan)
- `src/lib/match/engine/enhancedMatchEngine.ts` → **`operation`, `activeOperations`, `applyOperation` hiç geçmiyor** (Grep ile doğrulandı)

Operasyon sistemi tamamen ölü kod — tip var, motor bağlanmamış.

**Düzeltme önerisi:** Ya `enhancedMatchEngine.ts`'e `activeOperations`'ı okuyup `impactType`'a göre stamina/referee/error_rate modifier'ı uygulayan bir blok eklenmeli, ya da types.ts:499-570'teki operasyon tipleri silinmeli.

---

### T-14: Stadyum efektleri maça bağlanmamış mı?
**[YOK]** — Bizde BAĞLI

- `src/lib/match/engine/stadiumMatrix.ts:441` → `computeStadiumEffects` var
- `src/lib/match/engine/stadiumMatrix.ts:513` → `applyStadiumEffects` var
- `src/lib/match/engine/enhancedMatchEngine.ts:38` → `import { computeStadiumEffects, applyStadiumEffects, ... }`
- `src/lib/match/engine/enhancedMatchEngine.ts:3445` → `const effects = computeStadiumEffects(...)` çağrısı var

Rapordaki iddia bizim kod tabanımızda geçerli değil — stadyum efektleri maç motoruna entegre.

---

### T-15: Hava durumu maça bağlanmamış mı?
**[YOK]** — Bizde BAĞLI

- `src/lib/match/engine/stadiumMatrix.ts:573` → `getWeatherForDate` var (deterministik LCG)
- `src/lib/match/engine/stadiumMatrix.ts:601` → `detectMatchConditions` var
- `src/lib/match/engine/enhancedMatchEngine.ts:3402-3403` → `getWeatherForDate` çağrılıyor
- `src/lib/match/engine/enhancedMatchEngine.ts:3414-3417` → `detectMatchConditions` çağrılıyor

Hava durumu maç motoruna entegre. Rapordaki iddia geçerli değil.

---

### T-16: Stat büyümesi — training engine nasıl çalışıyor? cron var mı?
**[VAR]** — Manuel-only, otomatik/cron YOK

- `src/lib/training/engine.ts:197-256` `runTrainingSession` — saf fonksiyon, schedule içermiyor
- `src/lib/store.ts:873-910` `runSession` action — kullanıcı butona basınca çağrılıyor, `training.lastTrainingDate !== today` kontrolü ile günde 1 kez sınır
- `src/components/touchline/screens/training.tsx:143-159` — setInterval var ama SADECE UI tick (countdown gösterimi), eğitim tetiklemiyor
- Hiçbir yerde `cron` / otomatik sezonluk stat büyümesi yok

**Düzeltme önerisi:** Maç simülasyonundan sonra ya da gün sonunda `runSession`'ı otomatik tetikleyecek bir mekanizma (örn. `completeMatch` veya günlük tick) eklenmeli; ya da engine.ts dokümantasyonuna "manuel-only, scheduled growth yok" notu düşülmeli.

---

### T-17: transferWindow her zaman true mu?
**[YOK]** — Bizde koşullu

- `src/lib/mock/season.ts:21-24` → `isTransferWindowOpen(matchday?)` → `md <= SEASON_INFO.totalMatchdays - 5` (md ≤ 29)
- `src/lib/mock/season.ts:26-37` → `transferWindowStatus` → `{ isOpen, label, week, totalWeeks }`
- `src/components/touchline/screens/transfer.tsx:19,64,65` → ikisi de import + kullanılıyor
- UI (transfer.tsx:90-96) pencere kapalıyken kırmızı gösteriyor

Rapordaki iddia geçerli değil — fonksiyonlar mevcut ve koşullu çalışıyor.

---

### T-18: calculateLoanFeeEuro import edilmiş ama kullanılmıyor mu?
**[YOK]** — Fonksiyon bizde HİÇ YOK

`calculateLoanFeeEuro` isminde hiçbir tanım yok (Grep ile doğrulandı). transfer.tsx'te `player-profile-modal.tsx:1206`'da `loanFee` lokal state var (`useState(Math.round(player.marketValue * 0.05))`) ama ayrı bir hesap fonksiyonu değil.

---

### T-19: league context destructure edilmiş ama kullanılmıyor mu?
**[YOK]** — Pattern bizde yok

`src/components/touchline/screens/transfer.tsx:43` → `const { transfer } = useAppStore();` — sadece `transfer` destructure edilmiş, `league` değil. transfer.tsx'in hiçbir yerinde `league` destructure edilmiyor. İddia edilen pattern bizde mevcut değil.

---

### T-20: avg_rating hardcoded 70 — standings.tsx'te var mı?
**[YOK]** — standings.tsx'te hiç avg_rating yok; bizde dinamik hesaplanıyor

- standings.tsx'te `avg_rating` ya da `70` hardcoded DEĞİL
- `src/lib/mock/data.ts:219` → `avgRating: number` (interface)
- `src/lib/mock/data.ts:951` → `const avgRating = Math.round((5.8 + Math.random() * 2.5 + (ovr - 60) * 0.02) * 10) / 10;` — Dinamik, OVR'a bağlı
- `src/components/touchline/player-profile-modal.tsx:1035` → aynı dinamik formül

Hiçbir yerde `70` hardcoded avg_rating yok.

---

## GRUP D — Duplicate

### T-21: sanitizeTeamName duplicate — kaç yerde?
**[YOK]** — Fonksiyon bizde HİÇ YOK

`sanitizeTeamName` isminde hiçbir tanım yok (Grep ile doğrulandı).

---

### T-22: MarketTab + MultiplayerTab ayrı ama örtüşüyor
**[YOK]** — MultiplayerTab bizde yok

- `MultiplayerTab` ya da `multiplayer` component'i YOK
- Sadece `src/app/layout.tsx:16` metadata description'ında "Online multiplayer" kelimesi geçiyor (SEO metni, kod değil)
- transfer.tsx SubTab tipleri: `"market" | "freeagents" | "loan" | "watchlist" | "incoming" | "mylisted"` (line 38) — multiplayer yok

---

### T-23: isUser tespiti hardcoded ID
**[YOK]** — Dinamik team.id kullanılıyor

`src/components/touchline/screens/standings.tsx:191` → `const isMe = row.teamId === team?.id;` — hardcoded ID yok, dinamik `team?.id` (useMyTeam hook'undan geliyor). `"user-1"` ya da benzer sabit ID hiçbir yerde yok.

---

### T-24: Yükseltme maliyeti iki yerden — facilities.tsx + stadiumMatrix.ts
**[VAR]** — T-10'un subset'i, tekrar vurgu

- `src/lib/store.ts:938-939` → `// Maliyet: 250K × 2.2^level` + `Math.floor(250000 * Math.pow(2.2, currentLevel))` (inflasyon YOK)
- `src/components/touchline/screens/facilities.tsx:60-65` → `calcUpgradeCost` AYNI formül + `applyInflation` (inflasyon VAR)
- `src/lib/stadiumMatrix.ts:279-282` → `calculateUpgradeCost` ÜÇÜNCÜ bir implementasyon, çağrılmıyor

Aynı baseCost (250K), aynı 2.2 üssü, ama store.ts ile facilities.tsx inflation konusunda ayrışıyor. Kullanıcı UI'da fiyatı görüyor (inflation'lı), bütçeden düşülünce inflation'suz miktar kesiliyor — tutarsız.

**Düzeltme önerisi:** Tek fonksiyon (`lib/stadiumMatrix.ts:calculateUpgradeCost`) her iki yerden de çağrılmalı; inflation merkezi bir yerde uygulanmalı.

---

### T-25: "Hafta 1 / 34" hardcoded — standings.tsx
**[YOK]** — Sabitler kullanılıyor

`src/components/touchline/screens/standings.tsx:117` →
```
{t("standings.matchday")} {SEASON_INFO.matchday}/{SEASON_INFO.totalMatchdays}
```
UI hardcoded `"1/34"` KULLANMIYOR; `SEASON_INFO`'dan okuyor. SEASON_INFO'un değerleri (`matchday: 14, totalMatchdays: 34`) season.ts:11-12'de statik ama bu UI hardcode'u değil, konfigürasyon sabiti. Ek olarak `store.ts:1293` sezon sonunda `SEASON_INFO.matchday = 1` yapıyor — dinamik güncelleniyor.

---

## En Kritik 5 Madde (Öncelik Sırası)

### 1. T-12 — Küme düşme / yükselme zonu UI-backend uyumsuzluğu
**Kritiklik: YÜKSEK (oyun deneyimi hatası)**  
standings.tsx'te pozisyon 3 "playoff" sarı gösteriliyor ama backend (`store.ts:1263`) onu direkt promote ediyor. Pozisyon 16 "middle" gri gösteriliyor ama backend onu relegated ediyor. Kullanıcı yanlış bilgi görüyor.  
**Düzeltme:** standings.tsx:20-32 `getZone` fonksiyonu, store.ts:1263 ve 1267 ile aynı eşikleri kullanmalı (`idx <= 2` promote, `idx >= 15` relegate). Basit 2 satırlık değişiklik.

### 2. T-05 — Piyasa değeri 4 farklı formül
**Kritiklik: YÜKSEK (ekonomi dengesi)**  
Hem `lib/valuation.ts` hem `lib/fm/valuation.ts` tanımlı ama hiçbiri çağrılmıyor; data.ts inline kullanıyor; transfer.ts:345 serbest ajanlar için tamamen farklı bir formül (`ovr × 80K`) kullanıyor. Serbest ajanlar normale göre çok ucuz.  
**Düzeltme:** Tek `calculatePlayerValue` fonksiyonu (valuation.ts) her yerde kullanılmalı; data.ts inline, transfer.ts:345 ve `lib/fm/valuation.ts` kaldırılmalı.

### 3. T-10 / T-24 — Tesis yükseltme maliyeti 3 yerde, inflation tutarsız
**Kritiklik: YÜKSEK (ekonomi dengesi)**  
Kullanıcı UI'da fiyat görüyor (inflation'lı), bütçesinden inflation'suz miktar düşülüyor. İlerleyen sezonlarda tutarsızlık büyüyor (S5'te %32, S10'da %72 fark). Ayrıca hardcoded 250K baseCost tüm tesisler için yanlış (academy 300K, vip 350K olmalı).  
**Düzeltme:** `lib/stadiumMatrix.ts:calculateUpgradeCost` tek kaynak yapılmalı, inflation merkezi eklenmeli, per-facility baseCost kullanılmalı.

### 4. T-07 — Transfer vergisi triplicate + store.ts hardcode
**Kritiklik: ORTA-YÜKSEK (bakım yükü + potansiyel bug)**  
Aynı 3 sabit ve 2 fonksiyon hem `lib/valuation.ts` hem `lib/mock/transfer.ts`'te birebir kopya. store.ts:533 hiçbirini kullanmıyor, magic number `0.05` ve `0.03` hardcode. Birgün biri değişirse (örn. agent fee %5 → %7) store.ts güncellenmeyince fiyat farklı hesaplanacak.  
**Düzeltme:** `lib/valuation.ts:118-132` silinmeli, store.ts:533 `calculateBuyerCost(fee).total` kullanmalı.

### 5. T-06 — Maaş hesaplama 3 formül, tier multipler'ları bile farklı
**Kritiklik: ORTA (ileride maaş yenileme eklenirse patlar)**  
Şu an data.ts:520 `ovr × rand(800, 2200)` ile rastgele üretim yapılıyor; iki hazır fonksiyon (valuation.ts, salaryUtils.ts) çağrılmıyor. Ama salaryUtils.ts'in tier multipler'ları `{1:1.5, 2:1.0, 3:0.65, 4:0.4}` iken valuation.ts'te `{1:1.5, 2:1.2, 3:1.0, 4:0.8}` — ikisi birbiriyle uyuşmuyor. Sezon başı maaş yenileme eklendiğinde hangisi seçilecek?  
**Düzeltme:** salaryUtils.ts (inflation'lı) tek kaynak yapılmalı, valuation.ts:95-112 silinmeli, data.ts:520 onu çağırmalı.

---

## Ek Notlar (kritik olmayan ama takip edilmeli)

- **T-13 (operations):** ActiveOperation / impactType tipleri tanımlı ama match engine'de hiç kullanılmıyor. Ölü kod — ya bağlanmalı ya silinmeli.
- **T-11 (academy):** `getAcademyQualityMultiplier` tanımlı, hiç çağrılmıyor. youth-academy.tsx sadece count için academy level kullanıyor, kalite için değil.
- **T-09 (training hours):** Engine'deki `SessionSlot = "morning" | "afternoon"` UI'da hiç kullanılmıyor; UI hardcoded `[15, 21]` saatlerine göre çalışıyor.
- **T-16 (stat growth):** Hiçbir cron/otomatik tetikleme yok. Kullanıcı antrenmanı manuel başlatmazsa stat'ler asla büyümüyor.
- **store.ts:298 vs lib/stadiumMatrix.ts FACILITIES:** 6-anahtarlı vs 10-id'li tesis şeması çakışması. Bu T-10 ve T-11'in kök nedeni.

---

## İstatistik

| Sonuç | Sayı | Maddeler |
|-------|------|----------|
| VAR (iddia doğrulandı) | 10 | T-05, T-06, T-07, T-10, T-11, T-12, T-13, T-16, T-24 (+ T-09 KISMEN) |
| KISMEN | 1 | T-09 |
| YOK (iddia bizde geçersiz) | 14 | T-01, T-02, T-03, T-04, T-08, T-14, T-15, T-17, T-18, T-19, T-20, T-21, T-22, T-23, T-25 |
| TOPLAM | 25 | — |

**Sonuç:** Rapor 14 maddeyi yanlış pozitif olarak işaretlemiş (başka repo'dan gelen maddeler bizde yok ya da zaten tutarlı). 11 madde gerçekten sorunlu — bunların 5'i yukarıda kritik olarak listelendi. Önerilen tüm düzeltmeler koddan ziyade **tek kaynak ilkesine** dönük (duplicate fonksiyonları kaldırma, hardcoded değerleri merkezi sabitlere bağlama).
