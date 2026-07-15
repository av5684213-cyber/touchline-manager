"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function SupabaseTestPage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [info, setInfo] = useState<string>("");

  useEffect(() => {
    async function test() {
      if (!isSupabaseConfigured()) {
        setStatus("error");
        setInfo("Supabase yapılandırılmamış (.env.local kontrol et)");
        return;
      }

      try {
        // Basit bağlantı testi
        const { data, error } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true });

        if (error) {
          setStatus("error");
          setInfo(`Bağlantı kuruldu ama tablo henüz yok (migration çalıştır): ${error.message}`);
        } else {
          setStatus("ok");
          setInfo(`Bağlantı başarılı! profiles tablosu erişilebilir.`);
        }
      } catch (e: any) {
        setStatus("error");
        setInfo(`Hata: ${e?.message ?? e}`);
      }
    }
    test();
  }, []);

  return (
    <div className="p-8 min-h-screen bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-4">Supabase Bağlantı Testi</h1>
      <div className="p-4 rounded-lg border border-border bg-card">
        <div className="font-bold mb-2">
          Durum:{" "}
          {status === "loading" ? "⏳ Yükleniyor..." : status === "ok" ? "✅ OK" : "❌ Hata"}
        </div>
        <div className="text-sm text-muted-foreground">{info}</div>
      </div>
      <div className="mt-4 text-xs space-y-1 text-muted-foreground">
        <div>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
        <div>Configured: {isSupabaseConfigured() ? "yes" : "no"}</div>
      </div>
    </div>
  );
}
