"use client";

import { useI18n } from "@/lib/i18n/locale-provider";

export function FacilitiesScreen() {
  const { t } = useI18n();
  return (
    <div className="px-4 py-4">
      <h1 className="text-base font-bold">{t("nav.facilities")}</h1>
      <p className="text-sm text-muted-foreground mt-2">Yapım aşamasında…</p>
    </div>
  );
}
