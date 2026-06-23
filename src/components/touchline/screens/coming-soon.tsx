"use client";

import { useI18n } from "@/lib/i18n/locale-provider";
import { Construction } from "lucide-react";

export function ComingSoonScreen({ title }: { title: string }) {
  const { t } = useI18n();
  return (
    <div className="px-4 py-16 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
        <Construction size={26} className="text-primary" />
      </div>
      <h2 className="text-base font-bold mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-[260px]">
        {t("common.loading")}
      </p>
    </div>
  );
}
