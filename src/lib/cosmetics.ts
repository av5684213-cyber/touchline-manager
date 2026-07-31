/**
 * v2.9.46 Görev 1 — Kozmetik katalog (client-side cache + Supabase fallback).
 *
 * Kullanım:
 *   - Shop/Market sekmesi `getAllCosmetics()` ile kataloğu gösterir
 *   - Supabase bağlıysa `cosmetic_items` tablosundan okur
 *   - Bağlı değilse hardcoded seed listesini kullanır (Geliştirici Modu)
 *
 * Kategoriler: kit (forma), badge (rozet), theme (tema), stadium (stadyum),
 *              ball (top), manager (menajer)
 */

export type CosmeticCategory = "kit" | "badge" | "theme" | "stadium" | "ball" | "manager";
export type CosmeticRarity = "common" | "rare" | "epic" | "legendary";

export type CosmeticItem = {
  id: string;          // UUID (Supabase) veya SKU (fallback)
  sku: string;         // Stok kodu (Google Play Billing ile eşleştirme)
  nameTr: string;
  nameEn: string;
  descTr?: string;
  descEn?: string;
  category: CosmeticCategory;
  subcategory?: string;
  creditPrice: number;
  realMoneyPriceCents?: number;  // Google Play Billing (sent cinsinden)
  imageUrl?: string;
  cssVars?: Record<string, string>;
  rarity: CosmeticRarity;
  isActive: boolean;
  sortOrder: number;
};

/**
 * Hardcoded seed katalog — Supabase bağlı değilse kullanılır.
 * Migration 024'teki seed ile birebir aynı.
 */
export const SEED_COSMETICS: CosmeticItem[] = [
  // Formalar (kit)
  {
    id: "kit_classic_home", sku: "kit_classic_home",
    nameTr: "Klasik Forma (Ev)", nameEn: "Classic Kit (Home)",
    category: "kit", creditPrice: 25, rarity: "common", sortOrder: 1,
    cssVars: { primary: "#1a3a2a", secondary: "#f5f5f0" },
    isActive: true,
  },
  {
    id: "kit_emerald_away", sku: "kit_emerald_away",
    nameTr: "Zümrüt Forma (Deplasman)", nameEn: "Emerald Kit (Away)",
    category: "kit", creditPrice: 35, rarity: "rare", sortOrder: 2,
    cssVars: { primary: "#0e7490", secondary: "#cffafe" },
    isActive: true,
  },
  {
    id: "kit_gold_legend", sku: "kit_gold_legend",
    nameTr: "Altın Forma (Efsane)", nameEn: "Gold Kit (Legend)",
    category: "kit", creditPrice: 80, rarity: "legendary", sortOrder: 3,
    cssVars: { primary: "#fbbf24", secondary: "#1f2937" },
    isActive: true,
  },
  // Rozetler (badge)
  {
    id: "badge_rookie", sku: "badge_rookie",
    nameTr: "Çaylak Rozeti", nameEn: "Rookie Badge",
    category: "badge", creditPrice: 15, rarity: "common", sortOrder: 10,
    isActive: true,
  },
  {
    id: "badge_veteran", sku: "badge_veteran",
    nameTr: "Gazi Rozeti", nameEn: "Veteran Badge",
    category: "badge", creditPrice: 40, rarity: "rare", sortOrder: 11,
    isActive: true,
  },
  {
    id: "badge_champion", sku: "badge_champion",
    nameTr: "Şampiyon Rozeti", nameEn: "Champion Badge",
    category: "badge", creditPrice: 100, rarity: "legendary", sortOrder: 12,
    isActive: true,
  },
  // Temalar (theme)
  {
    id: "theme_dark_pro", sku: "theme_dark_pro",
    nameTr: "Koyu Pro Tema", nameEn: "Dark Pro Theme",
    category: "theme", creditPrice: 30, rarity: "rare", sortOrder: 20,
    cssVars: { bg: "#0f172a", card: "#1e293b", border: "#334155" },
    isActive: true,
  },
  {
    id: "theme_emerald_night", sku: "theme_emerald_night",
    nameTr: "Zümrüt Gece Teması", nameEn: "Emerald Night Theme",
    category: "theme", creditPrice: 50, rarity: "epic", sortOrder: 21,
    cssVars: { bg: "#022c22", card: "#064e3b", border: "#10b981" },
    isActive: true,
  },
  // Stadyum dekorları (stadium)
  {
    id: "stadium_classic", sku: "stadium_classic",
    nameTr: "Klasik Stadyum", nameEn: "Classic Stadium",
    category: "stadium", creditPrice: 40, rarity: "common", sortOrder: 30,
    isActive: true,
  },
  {
    id: "stadium_modern", sku: "stadium_modern",
    nameTr: "Modern Arena", nameEn: "Modern Arena",
    category: "stadium", creditPrice: 70, rarity: "rare", sortOrder: 31,
    isActive: true,
  },
  // Toplar (ball)
  {
    id: "ball_classic", sku: "ball_classic",
    nameTr: "Klasik Top", nameEn: "Classic Ball",
    category: "ball", creditPrice: 20, rarity: "common", sortOrder: 40,
    isActive: true,
  },
  {
    id: "ball_champions", sku: "ball_champions",
    nameTr: "Şampiyonlar Topu", nameEn: "Champions Ball",
    category: "ball", creditPrice: 60, rarity: "epic", sortOrder: 41,
    isActive: true,
  },
];

/**
 * Kategori metadata — UI etiketleri ve ikonları.
 */
export const COSMETIC_CATEGORY_META: Record<
  CosmeticCategory,
  { labelTr: string; labelEn: string; icon: string; descTr: string; descEn: string }
> = {
  kit: {
    labelTr: "Forma", labelEn: "Kit",
    icon: "👕", descTr: "Takımının formasını değiştir", descEn: "Change your team's kit",
  },
  badge: {
    labelTr: "Rozet", labelEn: "Badge",
    icon: "🎖️", descTr: "Profil rozeti ekle", descEn: "Add profile badge",
  },
  theme: {
    labelTr: "Tema", labelEn: "Theme",
    icon: "🎨", descTr: "Uygulama temasını değiştir", descEn: "Change app theme",
  },
  stadium: {
    labelTr: "Stadyum", labelEn: "Stadium",
    icon: "🏟️", descTr: "Stadyum dekoru", descEn: "Stadium decoration",
  },
  ball: {
    labelTr: "Top", labelEn: "Ball",
    icon: "⚽", descTr: "Maç topunu değiştir", descEn: "Change match ball",
  },
  manager: {
    labelTr: "Menajer", labelEn: "Manager",
    icon: "🧑‍💼", descTr: "Menajer avatarı", descEn: "Manager avatar",
  },
};

/**
 * Nadirlik renkleri — UI'da kullanılır.
 */
export const RARITY_COLORS: Record<CosmeticRarity, string> = {
  common: "border-slate-500/50 bg-slate-700/30",
  rare: "border-sky-500/50 bg-sky-700/30",
  epic: "border-purple-500/50 bg-purple-700/30",
  legendary: "border-amber-500/50 bg-amber-700/30",
};

export const RARITY_LABELS: Record<CosmeticRarity, { tr: string; en: string }> = {
  common: { tr: "Yaygın", en: "Common" },
  rare: { tr: "Nadir", en: "Rare" },
  epic: { tr: "Epik", en: "Epic" },
  legendary: { tr: "Efsane", en: "Legendary" },
};

/**
 * Kataloğu getir — Supabase bağlıysa tablodan, değilse seed'den.
 * Supabase sorgusu başarısız olursa seed'e fallback.
 */
export async function fetchCosmeticsCatalog(): Promise<CosmeticItem[]> {
  try {
    const { supabase, isSupabaseConfigured } = await import("@/lib/supabase");
    if (!isSupabaseConfigured()) {
      return SEED_COSMETICS;
    }
    const { data, error } = await supabase
      .from("cosmetic_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) {
      return SEED_COSMETICS;
    }
    // DB satırını CosmeticItem'a map'le
    return data.map((row: any) => ({
      id: row.id,
      sku: row.sku,
      nameTr: row.name_tr,
      nameEn: row.name_en,
      descTr: row.desc_tr,
      descEn: row.desc_en,
      category: row.category as CosmeticCategory,
      subcategory: row.subcategory,
      creditPrice: row.credit_price,
      realMoneyPriceCents: row.real_money_price_cents,
      imageUrl: row.image_url,
      cssVars: row.css_vars,
      rarity: row.rarity as CosmeticRarity,
      isActive: row.is_active,
      sortOrder: row.sort_order,
    }));
  } catch (e) {
    console.warn("[cosmetics] fetch error, using seed:", e);
    return SEED_COSMETICS;
  }
}
