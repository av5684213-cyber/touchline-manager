import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hesap Silme — Touchline Manager",
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Hesap Silme Talebi</h1>
      <p className="text-xs text-muted-foreground mb-6">Son güncelleme: 29 Haziran 2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
        <section>
          <h2 className="text-base font-bold mb-2">Hesabınızı Nasıl Silebilirsiniz?</h2>
          <p className="text-sm text-muted-foreground">
            Touchline Manager hesabınızı ve ilişkili tüm verilerinizi silmek için
            iki yöntem vardır:
          </p>

          <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <h3 className="text-sm font-bold text-emerald-400 mb-1">
              Yöntem 1: Uygulama İçinden (Önerilir)
            </h3>
            <p className="text-sm text-muted-foreground">
              Uygulamayı açın → Ana Panel (Dashboard) → en altta "Hesap" bölümü →
              "Hesabımı Sil" butonuna tıklayın. Onayladıktan sonra hesabınız
              anında silinir.
            </p>
          </div>

          <div className="mt-3 p-3 rounded-lg bg-sky-500/10 border border-sky-500/30">
            <h3 className="text-sm font-bold text-sky-400 mb-1">
              Yöntem 2: Bu Sayfadan Talep Gönderme
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Uygulamaya erişemiyorsanız, aşağıdaki formu doldurarak hesap silme
              talebinde bulunabilirsiniz. Talebiniz 30 gün içinde işleme alınacaktır.
            </p>

            <form
              action="mailto:support@touchline-manager.com"
              method="post"
              encType="text/plain"
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Hesabınızla ilişkili e-posta adresi:
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="ornek@email.com"
                  className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Talebiniz (opsiyonel):
                </label>
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Hesabımı silmek istiyorum."
                  className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold"
              >
                Silme Talebi Gönder
              </button>
            </form>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2">Silinen Veriler</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Hesabınız silindiğinde aşağıdaki veriler kalıcı olarak silinir:
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Hesap bilgileri (e-posta, şifre)</li>
            <li>Oyun verileri (takım, taktikler, oyuncular, bütçe)</li>
            <li>Aktif taktikler ve antrenman kayıtları</li>
            <li>Bildirimler ve push token'ları</li>
            <li>Özel kupa kayıtları</li>
            <li>Engellenen kullanıcılar listesi</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            <strong>Forum gönderileriniz silinmez</strong> — "Silinmiş kullanıcı"
            olarak anonimleştirilir ve içeriği korunur.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <strong>Ödeme kayıtları</strong> yasal yükümlülükler gereği
            kimlik bilgisinden bağımsız olarak saklanır.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2">İşlem Süresi</h2>
          <p className="text-sm text-muted-foreground">
            Uygulama içi silme: anında. Talep formu ile silme: 30 gün içinde.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold mb-2">İletişim</h2>
          <p className="text-sm text-muted-foreground">
            Sorularınız için: support@touchline-manager.com
          </p>
        </section>
      </div>

      <div className="mt-8 pt-4 border-t border-border">
        <a href="/" className="text-sm text-primary font-bold">← Ana sayfaya dön</a>
        <span className="mx-2 text-muted-foreground">·</span>
        <a href="/privacy" className="text-sm text-primary font-bold">Gizlilik Politikası</a>
      </div>
    </div>
  );
}
