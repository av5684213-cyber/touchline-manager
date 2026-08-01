/**
 * v2.9.20 GÖREV 5 — Küfür, reklam ve isim validasyonu.
 *
 * Kayıt sırasında kullanıcı takım adı girerken:
 *  1. Küfür/reklam filtresi
 *  2. URL/reklam tespiti
 *  3. Türkçe + İngilizce karakter normalizasyonu (küfür varyantları için)
 *  4. Minimum/maksimum uzunluk
 *  5. Reserve edilmiş isimler (lig adları, bot takım adları)
 */

/**
 * Türkçe + İngilizce küfür/reklam kara listesi.
 * Küçük harf + Türkçe karakterler normalize edilerek karşılaştırma yapılır.
 *
 * NOT: Bu liste kapsamlı değildir — kullanıcı yöneticisi tarafından genişletilebilir.
 * Amaç: rahatsız edici isimleri kayıt sırasında engellemek.
 */
const PROFANITY_PATTERNS: string[] = [
  // Türkçe küfürler (varyantlarıyla)
  "amcik", "amciklar", "amini", "amina", "amini", "aminoglu", "amina", "amq", "amcikh",
  "orospu", "orospucocugu", "oruspu", "oruspu", "orosbu", "orosbucocugu",
  "pezevenk", "pezo", "pezevengin",
  "yarrak", "yarragi", "yarragim", "yarramina", "yarram",
  "sikik", "sikimi", "sikine", "sikmek", "sikerim", "sik",
  "göt", "gotunu", "götünü", "gotun", "gotumuz", "gotum",
  "bok", "bokunu", "bokum", "boklar", "boklu",
  "salak", "aptal", "gerizekali", "gerizekalı", "mal", "aptal",
  "puşt", "pust", "şerefsiz", "serefsiz",
  "ibne", "ibnedir", "ibneler",
  "pipi", "pepe", "kukuduk",
  "sie", "sia", "sikeyim", "sikerler", "sikerim",
  "aq", "amk", "oç", "oc",
  // İngilizce küfürler
  "fuck", "fucker", "fucking", "fucked", "motherfucker", "motherfuck",
  "shit", "shitty", "shithole",
  "bitch", "bitchy", "sonofabitch",
  "asshole", "assholes",
  "bastard", "bitch",
  "dick", "dickhead", "dickish",
  "pussy", "cunt", "whore", "slut",
  "nigger", "nigga", "nazi", "fascist",
  // Reklam/ticari marka desenleri
  "fifa", "ea", "konami", "playstation", "xbox", "nintendo",
];

/**
 * Reklam desenleri — URL, e-posta, sosyal medya hesabı.
 */
const AD_PATTERNS: RegExp[] = [
  /\bhttps?:\/\/\S+/i,        // http:// veya https://
  /\bwww\.\S+/i,              // www.
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,  // e-posta
  /\b\d{5,}\b/,               // 5+ haneli sayı (telefon/ID)
  /\b@\w{3,}\b/i,            // @username (Twitter/Insta)
  /\bfacebook\.com\b/i,
  /\binstagram\.com\b/i,
  /\btwitter\.com\b/i,
  /\bx\.com\b/i,
  /\btiktok\.com\b/i,
  /\byoutube\.com\b/i,
  /\bdiscord\.gg\b/i,
  /\btelegram\b/i,
  /\bt\.me\b/i,
];

/**
 * Reserve edilmiş isimler — lig adları, sistem takım adları.
 */
const RESERVED_NAMES: string[] = [
  "super lig", "superlig", "super-lig",
  "1 lig", "1. lig", "1lig",
  "2 lig", "2. lig", "2lig",
  "3 lig", "3. lig", "3lig",
  "4 lig", "4. lig", "4lig",
  "premier lig", "premierlig", "premier-lig",
  "la liga", "laliga", "la-liga",
  "serie a", "seriea", "serie-a",
  "bundesliga", "bundes-liga",
  "ligue 1", "ligue1", "ligue-1",
  "primeira liga", "primeira",
  "eredivisie",
  "serie a", "primera division",
  "touchline", "touchline-manager", "tm",
  "admin", "administrator", "moderator", "mod",
  "system", "official", "staff",
];

/**
 * Türkçe karakterleri İngilizce karşılıklarına normalize eder.
 * Küfür varyantlarını yakalamak için (örn. "_amcık_" → "amcik").
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9 ]/g, "") // sadece a-z, 0-9, space
    .replace(/\s+/g, " ")
    .trim();
}

export type NameValidationResult = {
  valid: boolean;
  reason?: "too_short" | "too_long" | "empty" | "profanity" | "ad" | "reserved" | "invalid_chars";
  cleaned?: string;
  message?: string;
};

/**
 * Takım adı validasyonu — kayıt sırasında çağrılır.
 *
 * Kurallar:
 *  - 3-60 karakter (trim sonrası)
 *  - Boş olamaz
 *  - Sadece harf, rakam, boşluk, tire, nokta, apostrof
 *  - Küfür/reklam/reserve isim içeremez
 */
export function validateTeamName(raw: string): NameValidationResult {
  // 1) Trim
  const trimmed = (raw ?? "").trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: "empty", message: "Takım adı boş olamaz." };
  }

  // 2) Uzunluk
  if (trimmed.length < 3) {
    return { valid: false, reason: "too_short", message: "Takım adı en az 3 karakter olmalı." };
  }
  if (trimmed.length > 60) {
    return { valid: false, reason: "too_long", message: "Takım adı en fazla 60 karakter olmalı." };
  }

  // 3) Karakter kontrolü — harf, rakam, boşluk, tire, nokta, apostrof
  if (!/^[A-Za-z0-9ÇĞİÖŞÜçğıöşü \-'.]+$/.test(trimmed)) {
    return { valid: false, reason: "invalid_chars", message: "Takım adı sadece harf, rakam, boşluk, tire, nokta ve apostrof içerebilir." };
  }

  // 4) Normalize et (küfür varyantları için)
  const normalized = normalize(trimmed);

  // 5) Küfür kontrolü
  for (const bad of PROFANITY_PATTERNS) {
    if (normalized.includes(bad)) {
      return { valid: false, reason: "profanity", message: "Takım adı uygunsuz içerik içeriyor." };
    }
  }

  // 6) Reklam kontrolü
  for (const pattern of AD_PATTERNS) {
    if (pattern.test(trimmed) || pattern.test(normalized)) {
      return { valid: false, reason: "ad", message: "Takım adında reklam, URL, e-posta veya sosyal medya hesabı olamaz." };
    }
  }

  // 7) Reserve isim kontrolü
  if (RESERVED_NAMES.includes(normalized)) {
    return { valid: false, reason: "reserved", message: "Bu isim reserve edilmiş. Lütfen başka bir isim seçin." };
  }

  return { valid: true, cleaned: trimmed };
}

/**
 * Yönetici adı validasyonu (managerName).
 * Takım adından daha sade — 2-40 karakter, sadece harf + boşluk.
 */
export function validateManagerName(raw: string): NameValidationResult {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: "empty", message: "Yönetici adı boş olamaz." };
  }
  if (trimmed.length < 2) {
    return { valid: false, reason: "too_short", message: "Yönetici adı en az 2 karakter olmalı." };
  }
  if (trimmed.length > 40) {
    return { valid: false, reason: "too_long", message: "Yönetici adı en fazla 40 karakter olmalı." };
  }
  if (!/^[A-Za-zÇĞİÖŞÜçğıöşü ]+$/.test(trimmed)) {
    return { valid: false, reason: "invalid_chars", message: "Yönetici adı sadece harf ve boşluk içerebilir." };
  }

  const normalized = normalize(trimmed);
  for (const bad of PROFANITY_PATTERNS) {
    if (normalized.includes(bad)) {
      return { valid: false, reason: "profanity", message: "Yönetici adı uygunsuz içerik içeriyor." };
    }
  }

  return { valid: true, cleaned: trimmed };
}

/**
 * v2.9.65: Forum gönderileri için içerik filtresi.
 * Küfür, reklam, URL, e-posta, sosyal medya hesabı tespiti.
 */
export function validateForumContent(raw: string): { valid: boolean; reason?: string; message?: string } {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: "empty", message: "Boş içerik." };
  }
  if (trimmed.length > 500) {
    return { valid: false, reason: "too-long", message: "Maksimum 500 karakter." };
  }

  const normalized = normalize(trimmed);

  for (const bad of PROFANITY_PATTERNS) {
    if (normalized.includes(bad)) {
      return { valid: false, reason: "profanity", message: "İçerik uygunsuz kelime içeriyor." };
    }
  }

  for (const pattern of AD_PATTERNS) {
    if (pattern.test(trimmed) || pattern.test(normalized)) {
      return { valid: false, reason: "ad", message: "İçerikte reklam, URL, e-posta veya sosyal medya hesabı olamaz." };
    }
  }

  return { valid: true };
}
export function validateCountryCode(code: string): boolean {
  if (!code) return false;
  const upper = code.toUpperCase();
  const validCodes = ["TR", "GB", "ES", "IT", "DE", "FR", "PT", "NL", "BR", "AR"];
  return validCodes.includes(upper);
}
