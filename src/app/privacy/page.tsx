import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası — Touchline Manager",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Gizlilik Politikası</h1>
      <p className="text-xs text-muted-foreground mb-6">Son güncelleme: 29 Haziran 2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
        <section>
          <h2 className="text-base font-bold mb-2">1. Genel Bakış</h2>
          <p className="text-sm text-muted-foreground">
            Touchline Manager ("uygulama"), çok oyunculu bir futbol menajerlik oyunudur.
            Bu gizlilik politikası, uygulamayı kullanırken hangi verilerin toplandığını
            ve nasıl kullanıldığını açıklar.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2">2. Toplanan Veriler</h2>
          <p className="text-sm text-muted-foreground mb-2">Uygulama aşağıdaki veri kategorilerini toplar:</p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li><strong>Hesap bilgileri:</strong> E-posta adresi (Google OAuth veya e-posta/şifre ile giriş için), şifre hash'i (Supabase Auth tarafından yönetilir, düz metin olarak saklanmaz)</li>
            <li><strong>Profil bilgileri:</strong> Ülke kodu (kullanıcının seçtiği lig ülkesi — TR/GB/ES/DE), takım adı, menajer adı</li>
            <li><strong>Oyun verileri:</strong> Takım kadrosu, taktikler, maç sonuçları, transfer geçmişi, tesis seviyeleri, antrenman programı, kart envanteri, kozmetikler</li>
            <li><strong>Forum içeriği:</strong> Açtığınız konular, yazdığınız cevaplar (kalıcı olarak saklanır, hesap silme sonrası "Silinmiş kullanıcı" olarak anonimleştirilir)</li>
            <li><strong>Sohbet mesajları:</strong> Hazırlık maçı sohbet mesajları (24 saat saklanır, sonra otomatik silinir; kötüye kullanım incelemesi için)</li>
            <li><strong>Bildirim token'ı:</strong> Push bildirimleri için FCM token (cihaz bazında, bildirimler kapalıysa toplanmaz)</li>
            <li><strong>Ödeme kayıtları:</strong> Google Play purchase token (replay attack önleme için, yasal yükümlülük gereği saklanır)</li>
            <li><strong>Engelleme/Raporlar:</strong> Engellediğiniz kullanıcı ID'leri, raporladığınız mesajlar (topluluk moderasyonu için)</li>
            <li><strong>Cihaz/oturum bilgisi:</strong> Tarayıcı tipi, ekran boyutu, uygulama sürümü (hata ayıklama ve analitik amaçlı)</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            Tüm bulut verileri Supabase (Frankfurt, EU) bulut sunucularında saklanır.
            Oyun state'i aynı zamanda cihazınızın localStorage'ında da saklanır (offline erişim için).
            Push bildirim token'ları Google Firebase Cloud Messaging (FCM) üzerinden iletilir.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2">3. Verilerin Kullanımı</h2>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Hesap doğrulama ve oturum yönetimi</li>
            <li>Oyun deneyiminin sağlanması (maç simülasyonu, transfer, lig sıralaması)</li>
            <li>Çok oyunculu özelliklerin çalıştırılması (diğer kullanıcılarla aynı lig)</li>
            <li>Hata ayıklama ve uygulama iyileştirme</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2">4. Veri Paylaşımı</h2>
          <p className="text-sm text-muted-foreground">
            Kişisel verileriniz üçüncü taraflarla paylaşılmaz. Oyun içi verileriniz
            (takım adı, oyuncu isimleri, maç sonuçları) diğer kullanıcılar tarafından
            görülebilir çünkü bu çok oyunculu bir oyundur. E-posta adresiniz asla
            diğer kullanıcılara gösterilmez.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2">5. Veri Güvenliği</h2>
          <p className="text-sm text-muted-foreground">
            Veriler Supabase'in güvenli bulut altyapısında saklanır. Row Level Security
            (RLS) politikaları sayesinde her kullanıcı yalnızca kendi verilerini
            değiştirebilir. Tüm iletişim HTTPS üzerinden şifrelidir.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2">6. Çocuk Gizliliği</h2>
          <p className="text-sm text-muted-foreground">
            Uygulama 13 yaş altı çocuklara yönelik değildir. 13 yaş altı çocukların
            kullanması durumunda ebeveyn onayı gereklidir.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2">7. Veri Silme Hakkı</h2>
          <p className="text-sm text-muted-foreground">
            Hesabınızı ve tüm verilerinizi silmek için iki seçeneğiniz vardır:
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong>Uygulama içinden:</strong> Ana Panel → "Hesap" bölümü →
              "Hesabımı Sil" butonu ile anında silme.
            </li>
            <li>
              <strong>Web üzerinden:</strong>{" "}
              <a href="/delete-account" className="text-primary font-bold underline">
                Hesap Silme Talebi sayfasından
              </a>{" "}
              form doldurarak talep gönderme (en geç 30 gün içinde işleme alınır,
              genellikle anında silinir).
            </li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            Forum gönderileriniz "Silinmiş kullanıcı" olarak anonimleştirilir ve
            içeriği korunur. Ödeme kayıtları yasal yükümlülükler gereği saklanır.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2">8. İletişim</h2>
          <p className="text-sm text-muted-foreground">
            Gizlilik politikası hakkında sorularınız için: support@touchline-manager.com
          </p>
        </section>
      </div>

      <div className="mt-8 pt-4 border-t border-border">
        <a href="/" className="text-sm text-primary font-bold">← Ana sayfaya dön</a>
      </div>
    </div>
  );
}
