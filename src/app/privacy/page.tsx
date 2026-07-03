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
          <p className="text-sm text-muted-foreground mb-2">Uygulama aşağıdaki verileri toplar:</p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li><strong>E-posta adresi:</strong> Hesap oluşturma ve giriş için (Google OAuth veya e-posta/şifre)</li>
            <li><strong>Oyun verileri:</strong> Takım adı, taktikler, oyuncu kadrosu, maç sonuçları, transferler</li>
            <li><strong>Cihaz bilgisi:</strong> Tarayıcı tipi, ekran boyutu (analitik amaçlı)</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            Tüm oyun verileri Supabase (Frankfurt, EU) bulut sunucularında saklanır.
            Veriler cihazda kalıcı olarak saklanmaz.
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
            Hesabınızı ve tüm verilerinizi silmek isterseniz, uygulamadan çıkış yapın
            ve bizimle iletişime geçin. Verileriniz 30 gün içinde kalıcı olarak silinir.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2">8. İletişim</h2>
          <p className="text-sm text-muted-foreground">
            Gizlilik politikası hakkında sorularınız için: touchline-manager@example.com
          </p>
        </section>
      </div>

      <div className="mt-8 pt-4 border-t border-border">
        <a href="/" className="text-sm text-primary font-bold">← Ana sayfaya dön</a>
      </div>
    </div>
  );
}
