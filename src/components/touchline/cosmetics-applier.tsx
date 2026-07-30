"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { SEED_COSMETICS } from "@/lib/cosmetics";

/**
 * v2.9.47: Kozmetik görünümlerini uygular.
 *
 * - Theme kozmetikleri: CSS değişkenlerini document root'a yazar
 *   (bg, card, border renkleri değişir)
 * - Kit kozmetikleri: Takım renklerini CSS değişkeni olarak yazar
 *   (--team-primary, --team-secondary)
 *
 * Bu bileşen hiçbir UI render etmez — yalnızca side effect (CSS var injection).
 * app/page.tsx'in en üstüne yerleştirilir.
 */
export function CosmeticsApplier() {
  const equipped = useAppStore((s) => s.cosmetics.equipped);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;

    // Tüm kozmetik kategorilerini işle
    for (const [category, cosmeticId] of Object.entries(equipped)) {
      const item = SEED_COSMETICS.find(c => c.id === cosmeticId);
      if (!item?.cssVars) continue;

      // CSS değişkenlerini uygula
      for (const [key, value] of Object.entries(item.cssVars)) {
        // Theme: bg → --background, card → --card, border → --border
        // Kit: primary → --team-primary, secondary → --team-secondary
        const cssVarName = category === "theme"
          ? `--${key === "bg" ? "background" : key === "card" ? "card" : "border"}`
          : category === "kit"
            ? `--team-${key}`
            : `--cosmetic-${key}`;
        root.style.setProperty(cssVarName, value);
      }
    }
  }, [equipped]);

  return null;
}
