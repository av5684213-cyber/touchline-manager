"use client";

import { useState } from "react";
import {
  X,
  Trophy,
  Users,
  Settings,
  Calendar,
  ArrowLeftRight,
  Building2,
  Wallet,
  Search,
  GraduationCap,
  Medal,
  Shield,
  Megaphone,
  ShoppingBag,
  Award,
  Sparkles,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useBodyScrollLock, useEscapeToClose, haptic } from "@/hooks/touchline";
import { cn } from "@/lib/utils";

/**
 * v2.9.58: Yardım modal'ı — oyunun amacı + sekmeler + arketip açıklaması
 *
 * Dashboard'taki "Nasıl Oynanır?" butonuna basınca açılır.
 * 4 sekme:
 *   1. Oyunun Amacı
 *   2. Sekmeler Ne İşe Yarar
 *   3. Oyuncu Özellikleri (mor arketip dahil)
 *   4. Sıkça Sorulan Sorular
 */
type HelpSection = "purpose" | "tabs" | "players" | "faq";

export function HelpModal() {
  const open = useAppStore((s) => s.helpModalOpen);
  const setOpen = useAppStore((s) => s.setHelpModalOpen);
  const [section, setSection] = useState<HelpSection>("purpose");

  useBodyScrollLock(open);
  useEscapeToClose(() => open && setOpen(false));

  if (!open) return null;

  const close = () => {
    haptic("light");
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={close} />

      <div className="relative w-full max-w-[440px] bg-background h-dvh flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2.5 border-b border-border"
          style={{ background: "var(--primary)" }}
        >
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-white" />
            <span className="text-sm font-bold text-white">Nasıl Oynanır?</span>
          </div>
          <button onClick={close} className="tm-tap p-1 text-white/80 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Sekme seçici */}
        <div className="flex gap-1 p-2 bg-muted/30 border-b border-border">
          {([
            { key: "purpose" as const, label: "Amaç", icon: Trophy },
            { key: "tabs" as const, label: "Sekmeler", icon: Settings },
            { key: "players" as const, label: "Oyuncular", icon: Users },
            { key: "faq" as const, label: "SSS", icon: HelpCircle },
          ]).map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => { haptic("light"); setSection(s.key); }}
                className={cn(
                  "tm-tap flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded text-[10px] font-bold transition-colors",
                  section === s.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon size={14} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto tm-thin-scrollbar p-4 space-y-3">
          {section === "purpose" && <PurposeSection />}
          {section === "tabs" && <TabsSection />}
          {section === "players" && <PlayersSection />}
          {section === "faq" && <FaqSection />}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-muted/20">
          <button
            onClick={close}
            className="tm-tap w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold"
          >
            Anladım, kapat
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== 1. Oyunun Amacı =====
function PurposeSection() {
  return (
    <div className="space-y-3">
      <div className="tm-card p-4 bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border-amber-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={20} className="text-amber-500" />
          <h2 className="text-sm font-bold">Oyunun Amacı</h2>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Touchline Manager</strong>'da bir futbol kulübünün teknik direktörüsün.
          Amacın, takımını küçük bir ligden başlatıp <strong className="text-amber-400">1. Lig şampiyonluğuna</strong>,
          ardından <strong className="text-amber-400">Şampiyonlar Ligi kupasına</strong> taşımak.
        </p>
      </div>

      <div className="tm-card p-3 space-y-2">
        <div className="text-[10px] font-bold uppercase text-muted-foreground">Sezon Hedeflerin</div>
        <div className="space-y-2 text-[11px]">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold mt-0.5">1.</span>
            <div>
              <strong>Lig şampiyonu ol</strong> — 34 haftalık sezonda en çok puan topla. İlk 3 sıraya girersen bir üst lige yükselirsin.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold mt-0.5">2.</span>
            <div>
              <strong>Ulusal Kupa kazan</strong> — Ligdeki en iyi 12 takımın katıldığı eleme turnuvası. Finali kazanarak kupa müzesine gider.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold mt-0.5">3.</span>
            <div>
              <strong>Şampiyonlar Ligi</strong> — 1. Lig'de şampiyon olursan Avrupa'nın en büyük kulüp turnuvasında mücadele et.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold mt-0.5">4.</span>
            <div>
              <strong>Altyapıdan yıldız yetiştir</strong> — Genç oyuncuları keşfet, geliştir, dünya yıldızı yap.
            </div>
          </div>
        </div>
      </div>

      <div className="tm-card p-3">
        <div className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Nasıl İlerlersin?</div>
        <div className="text-[11px] text-muted-foreground leading-relaxed space-y-2">
          <p>
            Her hafta bir maç oynanır. Maç sonucu <strong className="text-foreground">taktik ayarlarına</strong>,
            <strong className="text-foreground"> oyuncu kondisyonuna</strong> ve
            <strong className="text-foreground"> rakibin gücüne</strong> göre belirlenir.
          </p>
          <p>
            Maçları kazandıkça <strong className="text-emerald-400">bütçe</strong> ve
            <strong className="text-emerald-400"> sponsor geliri</strong> artar.
            Bu parayla yeni oyuncu alır, tesislerini yükseltir, altyapına yatırım yaparsın.
          </p>
          <p>
            Sezon sonunda ilk 3'teysen bir üst lige çıkarsın. Son 3'teysen bir alt lige düşersin.
            Hedef: <strong className="text-amber-400">1. Lig'de kalıcı ol</strong> ve Avrupa'da başarı kazan.
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== 2. Sekmeler Ne İşe Yarar =====
function TabsSection() {
  const tabs = [
    {
      icon: Trophy,
      name: "Panel",
      color: "text-amber-400",
      desc: "Takım özeti, son maçlar, sıralama, finansal durum. Oyunun ana kontrol paneli.",
    },
    {
      icon: Settings,
      name: "Taktik",
      color: "text-sky-400",
      desc: "Formasyon (4-4-2, 4-3-3, vb.), ilk 11, yedekler, mentalite ve slider'lar (pres, defans hattı, tempo). Maçtan önce burayı ayarla.",
    },
    {
      icon: Calendar,
      name: "Maç",
      color: "text-emerald-400",
      desc: "Bu haftaki maçını oyna. Canlı simülasyon, olaylar, istatistikler. Maç bittiğinde otomatik hafta ilerler.",
    },
    {
      icon: ArrowLeftRight,
      name: "Transfer",
      color: "text-violet-400",
      desc: "Oyuncu al-sat. Serbest oyuncular, bot kulüplerden teklif, kiralık transfer. Bütçeni dikkatli yönet.",
    },
    {
      icon: Shield,
      name: "Puan Tablosu",
      color: "text-blue-400",
      desc: "Lig sıralaması, form durumu, küme düşme/terfi hattı. Diğer takımlara tıklayıp detaylarına bak.",
    },
    {
      icon: Calendar,
      name: "Fikstür",
      color: "text-orange-400",
      desc: "Sezonun tüm maçları. Geçmiş maçları 'İzle' butonuyla tekrar izleyebilirsin. Yaklaşan maçları gör.",
    },
    {
      icon: Search,
      name: "İzci",
      color: "text-cyan-400",
      desc: "Dünya genelinde oyuncu ara. İzci gönder, rapor al, gelecek vaadeden gençleri keşfet.",
    },
    {
      icon: GraduationCap,
      name: "Altyapı",
      color: "text-green-400",
      desc: "Genç oyuncular yetiştir. Altyapı tesisini yükselt, daha kaliteli regen'ler üret.",
    },
    {
      icon: Building2,
      name: "Tesisler",
      color: "text-yellow-400",
      desc: "Stadyum, antrenman sahası, tıbbi merkez gibi tesisleri yükselt. Gelir ve oyuncu gelişimini etkiler.",
    },
    {
      icon: Wallet,
      name: "Finans",
      color: "text-emerald-500",
      desc: "Bütçe, gelir-gider, sponsor, maaşlar. Ekonomik sağlığını buradan takip et.",
    },
    {
      icon: Megaphone,
      name: "Forum",
      color: "text-pink-400",
      desc: "Diğer menajerlerle sohbet et. Strateji paylaş, transfer öner, ligi tartış.",
    },
    {
      icon: ShoppingBag,
      name: "Mağaza",
      color: "text-purple-400",
      desc: "Kredi ile kart, kozmetik, özel özellikler al. Oyuncularına kart basarak onları güçlendir.",
    },
    {
      icon: Award,
      name: "Ödüller",
      color: "text-amber-500",
      desc: "Başarımlar, sezon ödülleri, kupa müzesi. Kariyerindeki tüm başarıları burada gör.",
    },
    {
      icon: Sparkles,
      name: "Hazırlık Maçı",
      color: "text-amber-300",
      desc: "Online rakiplerle dostluk maçı. Lig puanını etkilemez ama oyuncu formunu artırır.",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1 px-1">
        Alt menüden (≡) tüm sekmelere ulaşabilirsin
      </div>
      {tabs.map((tab, i) => {
        const Icon = tab.icon;
        return (
          <div key={i} className="tm-card p-2.5 flex items-start gap-2.5">
            <div className={cn("shrink-0 mt-0.5", tab.color)}>
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold mb-0.5">{tab.name}</div>
              <div className="text-[10px] text-muted-foreground leading-relaxed">{tab.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== 3. Oyuncu Özellikleri =====
function PlayersSection() {
  return (
    <div className="space-y-3">
      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Users size={16} className="text-sky-400" />
          <h3 className="text-sm font-bold">Oyuncu Özellikleri</h3>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Her oyuncunun profilinde bir dizi renkli etiket görürsün. İşte anlamları:
        </p>
      </div>

      {/* Yeşil - Form */}
      <div className="tm-card p-3 border-l-4 border-emerald-500">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs font-bold text-emerald-500">Yeşil — Form</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Oyuncunun son maçlardaki performansı. Yüksek form = daha iyi oynar. Maç oynadıkça form değişir.
        </p>
      </div>

      {/* Mavi - Kondisyon */}
      <div className="tm-card p-3 border-l-4 border-sky-500">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-sky-500" />
          <span className="text-xs font-bold text-sky-500">Mavi — Kondisyon</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Fiziksel durum. Maçta düşer, dinlenirken yükselir. Düşük kondisyon = sakatlık riski + kötü performans.
        </p>
      </div>

      {/* Kırmızı - Moral */}
      <div className="tm-card p-3 border-l-4 border-red-500">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs font-bold text-red-500">Kırmızı — Moral</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Oyuncunun ruh hali. Galibiyet yükseltir, mağlubiyet düşürür. Yüksek moral = daha iyi mücadele.
        </p>
      </div>

      {/* Mor - Arketip (KULLANICININ SORDUĞU) */}
      <div className="tm-card p-3 border-l-4 border-purple-500 bg-purple-500/5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-xs font-bold text-purple-500">Mor — Arketip (Oyuncu Tipi)</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
          Oyuncunun uzmanlaştığı oyun tarzı. Örnek: <strong>"Gol Makinesi"</strong>, <strong>"Playmaker"</strong>,
          <strong> "Duvar Stoper"</strong>. Maç motorunda özel bonuslar verir (gol şansı, pas isabeti, vb.).
        </p>
        <div className="bg-purple-500/10 rounded p-2 text-[10px] text-purple-300 leading-relaxed">
          <strong>⚠️ DİKKAT:</strong> Arketip her oyuncuda YOKTUR. Sadece
          <strong className="text-foreground"> yüksek yetenekli (OVR 70+)</strong> oyuncuların ~%55'inde,
          <strong className="text-foreground"> düşük yetenekli oyuncuların</strong> ise ~%15'inde bulunur.
          Çoğu oyuncu "sıradan"dır — sadece yıldızların arketipi olur.
        </div>
      </div>

      {/* Turuncu - Trait */}
      <div className="tm-card p-3 border-l-4 border-orange-500">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-xs font-bold text-orange-500">Turuncu — Trait (Özel Yetenek)</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Nadir özel yetenekler. Örnek: <strong>"Penaltı ustası"</strong>, <strong>"Kapitan"</strong>,
          <strong> "Penaltı durdurucu"</strong>. Oyuncuların ~%25'inde bulunur. Negatif trait'ler de var (~%8).
        </p>
      </div>

      {/* Sarı - Pozisyon */}
      <div className="tm-card p-3 border-l-4 border-yellow-500">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-xs font-bold text-yellow-500">Sarı — Pozisyon</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Oyuncunun uzmanlık mevkii: <strong>GK</strong> (kaleci), <strong>CB</strong> (stoper),
          <strong> CM</strong> (orta saha), <strong>ST</strong> (forvet) vb. Yanlış pozisyonda oynatınca performans düşer.
        </p>
      </div>

      <div className="tm-card p-3 bg-muted/30">
        <div className="text-[10px] text-muted-foreground leading-relaxed">
          💡 <strong>İpucu:</strong> Bir oyuncunun tüm etiketlerini görmek için kadrodan oyuncuya tıkla.
          Mor arketip etiketine tıklarsan o arketipin etkilerini detaylı görebilirsin.
        </div>
      </div>
    </div>
  );
}

// ===== 4. Sıkça Sorulan Sorular =====
function FaqSection() {
  const faqs = [
    {
      q: "Maç nasıl kazanılır?",
      a: "Maçtan önce Taktik sekmesinden formasyon ve mentalite ayarla. İlk 11'de en yüksek rated oyuncuları oynat. Kondisyonu düşük oyuncuları dinlendir. Slider'ları rakibe göre ayarla (güçlü rakibe karşı defansif, zayıf rakibe karşı hücumcu).",
    },
    {
      q: "Para nasıl kazanılır?",
      a: "Maç kazandıkça sponsor geliri ve TV geliri artar. Sezon sonunda lig sıralamasına göre ödül alırsın. Tesisleri (özellikle stadyum) yükselterek gelirini kalıcı olarak artırabilirsin. Oyuncu satarak da nakit sağlayabilirsin.",
    },
    {
      q: "Takım nasıl güçlenir?",
      a: "Üç yol: 1) Transfer — pazardan kaliteli oyuncu al. 2) Altyapı — genç oyuncu yetiştir (uzun vadede en kârlı). 3) Antrenman — mevcut oyuncuların stat'larını kart ile artır. Sezon sonu pending stat'lar kalıcı olur.",
    },
    {
      q: "Ligden küme düşmemek için?",
      a: "Sezon sonunda son 3 sırada olursan bir alt lige düşersin. Güvende kalmak için en az 17. sırayı hedefle. Zorlu haftalarda (kondisyon düşük) slider'ları defansif yap, beraberliği kabul et.",
    },
    {
      q: "Şampiyonlar Ligi'ne nasıl katılırım?",
      a: "Sadece 1. Lig'de şampiyon olursan otomatik katılırsın. 2-4. Lig'deyken CL yok. 1. Lig'de ilk 4'e girersen bir sonraki sezon Avrupa'da oynarsın.",
    },
    {
      q: "Hazırlık maçı ne işe yarar?",
      a: "Online rakiplerle dostluk maçıdır. Lig puanını ETKİLEMEZ ama oyuncularının formunu ve moralini pozitif yönde artırır. Antrenman niteliğinde — resmi maç öncesi takım ısınması olarak kullan.",
    },
    {
      q: "Arketip nedir, neden bazı oyuncularda yok?",
      a: "Arketip = oyuncunun uzmanlaştığı tarz (Gol Makinesi, Playmaker, vb.). Sadece yıldız oyuncularda bulunur — her oyuncuda olması gerçekçi değildir. Sıradan oyuncular arketipsizdir, yıldızlar arketiplidir.",
    },
    {
      q: "Kart sistemi nasıl çalışır?",
      a: "Mağazadan kredi ile kart alırsın. Her oyuncuya maksimum 2 kart basabilirsin. Kart, oyuncunun belirli stat'larını (şut, pas, hız vb.) kalıcı olarak artırır. Nadir kartlar daha büyük bonus verir.",
    },
    {
      q: "Geçmiş maçları tekrar izleyebilir miyim?",
      a: "Evet! Fikstür sekmesinde geçmiş bir maça tıkla veya 'İzle' butonuna bas. Maç oynandığı andaki spiker yorumları ve olay akışı birebir gösterilir (re-simülasyon yapılmaz).",
    },
    {
      q: "Bulunduğum ligden nasıl yükselirim?",
      a: "Sezon sonunda ilk 3 sıraya girersen bir üst lige terfi edersin. 34 haftalık sezon boyunca istikrarlı puan topla. Zor deplasmanlarda beraberlik yeterli olabilir.",
    },
  ];

  return (
    <div className="space-y-2">
      {faqs.map((faq, i) => (
        <details key={i} className="tm-card p-3 group">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold flex-1">{faq.q}</span>
            <ChevronRight size={14} className="text-muted-foreground group-open:rotate-90 transition-transform shrink-0" />
          </summary>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-2 pt-2 border-t border-border">
            {faq.a}
          </p>
        </details>
      ))}
    </div>
  );
}
