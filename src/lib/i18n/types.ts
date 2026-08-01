/**
 * v2.9.65: Dil desteği daraltıldı — sadece tr + en
 * Eski kod (v2.9.21): 6 dil (tr/en/es/de/fr/pt) iddia ediliyordu ama
 * es/de/fr/pt için sadece %0.6-0.7 çeviri vardı → kullanıcı yanıltılıyordu
 * Yeni: sadece tam çevrilmiş diller (tr + en)
 */

export type Locale = "tr" | "en";

export const LOCALES: Locale[] = ["tr", "en"];
export const DEFAULT_LOCALE: Locale = "tr";

/**
 * Dil adlarını kendi dilinde göster (LocaleSwitcher için).
 */
export const LOCALE_NAMES: Record<Locale, { native: string; flag: string }> = {
  tr: { native: "Türkçe", flag: "🇹🇷" },
  en: { native: "English", flag: "🇬🇧" },
};

/**
 * Sözlük — her anahtar tr + en zorunlu, diğer diller opsiyonel.
 * Eksik anahtar varsa fallback olarak tr, sonra en döner.
 */
export type Dict = Record<string, { tr: string; en: string; es?: string; de?: string; fr?: string; pt?: string }>;

/**
 * navigator.language'den Locale tahmin et.
 * Google Play'den indirildiğinde cihaz dilini kullanır.
 *
 * v2.9.54: Android WebView'de öncelik sırası:
 *   1. AndroidNative.getLanguage() — native Java'dan cihaz dili
 *   2. navigator.language — WebView default
 *   3. navigator.languages[0] — fallback
 *
 * Örnek:
 *   "tr-TR" → "tr"
 *   "en-US" → "en"
 *   "es-ES" → "es"
 *   "de-DE" → "de"
 *   "fr-FR" → "fr"
 *   "pt-BR" → "pt"
 *   "ja-JP" → "en" (desteklenmiyor → İngilizce)
 *   "it-IT" → "en" (desteklenmiyor → İngilizce)
 *   "ru-RU" → "en"
 *   "ar-SA" → "en"
 */
export function detectLocaleFromBrowser(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;

  // v2.9.54: Android native bridge'den dil al (en güvenilir)
  if (typeof window !== "undefined") {
    const androidLang = (window as any).AndroidNative?.getLanguage?.();
    if (typeof androidLang === "string" && androidLang.length > 0) {
      const lang = androidLang.toLowerCase();
      if (lang.startsWith("tr")) return "tr";
      if (lang.startsWith("en")) return "en";
      // v2.9.65: es/de/fr/pt artık desteklenmiyor — en'ye fallback
    }
  }

  // WebView / browser dilini kontrol et
  const lang = (navigator.language || navigator.languages?.[0] || "tr").toLowerCase();
  if (lang.startsWith("tr")) return "tr";
  if (lang.startsWith("en")) return "en";
  // v2.9.65: es/de/fr/pt artık desteklenmiyor — en'ye fallback

  // v2.9.54: Desteklenmeyen diller için en'ye fallback
  // (İtalyanca, Rusça, Arapça, Çince, Japonca, vb.)
  return "en";
}

/**
 * Bir Dict anahtarını verilen dile çevir.
 * Eksik dil varsa sırayla: tr → en → ilk değer.
 */
export function translate(
  dict: Dict,
  key: string,
  locale: Locale,
  params?: Record<string, string | number>
): string {
  const entry = dict[key];
  if (!entry) return key;

  let text: string;
  switch (locale) {
    case "tr": text = entry.tr; break;
    case "en": text = entry.en; break;
    default: text = entry.en;
  }

  // Parametre değiştirme: {name} → "John"
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }

  return text;
}
