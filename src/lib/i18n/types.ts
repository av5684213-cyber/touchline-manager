export type Locale = "tr" | "en";

export const LOCALES: Locale[] = ["tr", "en"];
export const DEFAULT_LOCALE: Locale = "tr";

/**
 * Sözlük — her anahtar hem tr hem en değeri içermeli.
 * Eksik anahtar varsa fallback olarak tr döner.
 */
export type Dict = Record<string, { tr: string; en: string }>;
