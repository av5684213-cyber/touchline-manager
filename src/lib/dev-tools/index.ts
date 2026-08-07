/**
 * v2.9.96: Dev Tools — Admin/Geliştirici Modu
 *
 * Sadece belirli kullanıcı ID'leri için aktif.
 * Production'da normal kullanıcılara görünmez.
 * Ana oyun mantığına DOKUNMAZ — ayrı modül.
 */

// Admin kullanıcı ID'leri (Supabase auth UID veya email)
const ADMIN_EMAILS = [
  "admin@touchline.gg",
];

/**
 * Kullanıcı admin mi?
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Dev mode aktif mi? (env flag + admin check)
 */
export function isDevMode(): boolean {
  if (typeof window === "undefined") return false;
  // localStorage'dan oku (admin paneli açınca set edilir)
  return localStorage.getItem("tm_dev_mode") === "true";
}

export function setDevMode(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("tm_dev_mode", on ? "true" : "false");
}

/**
 * Dev tools menüsü — admin kullanıcılar için
 */
export const DEV_TOOLS = {
  // Maç zamanlayıcı
  advanceMatchday: "Maçı İlerle (1 tur)",
  advanceToSeasonEnd: "Sezon Sonuna Atla",
  skipSeason: "Sezonu Atla (endSeason)",
  // Zaman manipülasyonu
  setSeasonMatchday: "Haftayı Ayarla",
  // Test verisi
  generateTestTeam: "Test Takımı Üret",
  resetState: "State'i Sıfırla (danger)",
  // Ekonomi
  addCredits: "+100 Kredi",
  addBudget: "+50M Bütçe",
  // Simülasyon
  runSimSeasons: "5 Sezon Hızlı Sim",
} as const;

export type DevTool = keyof typeof DEV_TOOLS;
