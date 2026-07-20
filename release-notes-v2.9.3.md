Touchline Manager v2.9.3 — 27 bug fix, 4 kritik alan düzeltmesi

## 🔴 Kritik Düzeltmeler

### Kırmızı Kart Cezası Artık Çalışıyor
- **Önceki:** Maç N'de kırmızı kart → `suspended_until = N+1` → `advanceMatchday` N+1 olur → filter `N+1 <= N+1` = true → **oyuncu oynuyordu** (ceza hiç uygulanmıyordu!)
- **Şimdi:** `suspended_until = N+2` → ceza maçı N+1'de oynanamaz, N+2'de dönüş.

### Cezalı Oyuncular Artık İlk 11'e Seçilmiyor
- **4 yerde** `!p.is_injured` kontrolü → `isPlayerAvailableAt(p, matchday)` helper'ı:
  - `autoFillLineup` (kullanıcı formasyon değiştirince)
  - `pickXIByFormation` (rakip ilk 11)
  - `pickBestXI` (haltime fallback)
  - Kupa maç appearances
- Cezalı oyuncu artık otomatik dizilişe, rakip 11'ine, kupa maçına seçilmiyor.

### "Turu İlerlet" Stat Dağıtımı Düzeltildi
- **Önceki:** `silentlySimulateMatch` + `advanceMatchday` kombinasyonu kullanıcının gol/asist/kondisyon güncellemesini atlıyordu (fixture.played=true yapıp userMatch=null kalıyordu).
- **Şimdi:** Sadece `advanceMatchday` çağrılıyor — enhanced motor kullanıcının maçını simüle ediyor, stat'lar dağıtılıyor.

### Sohbet Moderasyonu (Google Play UGC Uyumlu)
- Küfür filtresi (TR + EN)
- Rate limiting (10 mesaj/dakika, max 200 karakter)
- Report butonu → `chat_reports` tablosuna yazılır
- Block butonu → `blocked_users` tablosuna yazılır, engellenen kullanıcıyla bir daha eşleşilmez
- `managerName` presence verisinde sanitize edilir

## 📋 Tüm Düzeltmeler (v2.9.0 → v2.9.3)

### v2.9.0 (5 ana bug + 2 bonus)
- BUG #11: suspended_until UI — kadroda engelle + 4 yerde rozet
- BUG #12: online maç dürüst etiketleme ("Online Sohbet + Maç")
- BUG #13: sahte global leaderboard → "Yakında"
- BUG #14: sohbet moderasyonu (yukarıda)
- BUG #15: cosmetics cloud-save'e taşındı
- Bonus #4: Kaptan butonu (ActionsTab)
- Bonus #9: computeTacticScore entegrasyonu (Deha başarımı)
- Cloud-save blacklist refactor

### v2.9.1 (10 bulgu)
- suspended_until +1 → +2
- silentlySimulateMatch kaldırıldı
- matchId/userId stabilize (chat kanalı re-subscribe döngüsü)
- Guest FK ihlali önlendi
- blockedUsers bağımlılık + race condition
- Reactive seasonMatchday
- Captain null/undefined tutarlı

### v2.9.2 (4 bulgu)
- isPlayerAvailable helper (18 yerde pattern temizlendi)
- cloud-save "_" prefix convention (transient alanlar)
- safeTimeout cleanup (friendly.tsx)
- youthAcademy store'a taşındı (cihazlar arası senkron)

### v2.9.3 (6 bulgu)
- isPlayerAvailable 4 yerde kullanılmıyordu — yukarıda
- auth-context setTimeout cleanup
- SSR/client mismatch (friendly.tsx Date.now)
- loadMultiplayerState youthAcademy/cosmetics/blockedUsers yükle
- Dead code: silentlySimulateMatch tanımı silindi
- Engelli mesajlar state'te birikmiyor

## ⚠️ Kurulum Talimatları

### Mevcut kullanıcılar:
Mevcut kayıtlı kullanıcılar için ek bir işlem gerekmez — uygulamayı güncelleyin, veriler korunur.

### Yeni Supabase Migration (Gerekli):
Sohbet moderasyonu (Report/Block) çalışması için Supabase dashboard'da şu migration'ı çalıştırın:
```
supabase/migrations/012_chat_moderation.sql
```
Bu migration `chat_reports` ve `blocked_users` tablolarını oluşturur (RLS dahil).

Migration çalışmazsa sohbet özelliği yine de çalışır, ama report/block butonları Supabase'e kaydetmez (sadece yerel state).

## 📦 APK Bilgileri
- **Boyut:** 6.3 MB
- **Version Code:** 293
- **Version Name:** 2.9.3
- **Min SDK:** 24 (Android 7.0+)
- **Target SDK:** 34 (Android 14)

## 🧪 Test Senaryoları
1. **Kırmızı kart:** Bir maçta kırmızı kart gördür → sonraki maç kadro seçiminde o oyuncu seçilemez + "CEZALI" rozeti görünür
2. **Turu İlerlet:** Maç yapmadan "Turu İlerlet" → oyuncuların gol/asist/maç sayısı güncellenir
3. **Sohbet moderasyon:** Maç sırasında küfür yaz → yıldızlanır, bir mesajı bildir → uyarı görürsün, kullanıcıyı engelle → bir daha eşleşilmez
4. **Cihaz değişimi:** Bir cihazda kozmetik satın al → başka cihazda aynı hesaba gir → ürün korunur

---
Toplam: 27 düzeltme, 0 kritik açık bulgu
Build: TypeScript + Next.js temiz
