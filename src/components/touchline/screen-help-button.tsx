"use client";

/**
 * v2.9.75: ScreenHelpButton — her ekranın köşesinde floating "i" butonu.
 *
 * Tıklayınca modal açılır, o ekrandaki tüm elementlerin açıklamasını gösterir.
 * İçerik SCREEN_HELP dictionary'sinden gelir (screen-help.ts).
 *
 * Ekran key'i SCREEN_HELP'te yoksa buton render edilmez.
 *
 * Kullanım:
 *   <ScreenHelpButton screen="dashboard" />
 *   <ScreenHelpButton screen={tab} />
 */

import { useState } from "react";
import { Info, X } from "lucide-react";
import { SCREEN_HELP } from "@/lib/screen-help";
import type { TabKey } from "@/components/touchline/bottom-nav";
import { haptic } from "@/hooks/touchline";

export function ScreenHelpButton({ screen }: { screen: TabKey }) {
  const [open, setOpen] = useState(false);
  const sections = SCREEN_HELP[screen];

  // Bu ekran için yardım içeriği yoksa buton gösterme
  if (!sections || sections.length === 0) return null;

  return (
    <>
      {/* Floating "i" button — bottom-right (above bottom nav), z-40
          Mobile FAB pattern: doesn't overlap with top bar or content */}
      <button
        onClick={() => { haptic("light"); setOpen(true); }}
        className="tm-tap absolute bottom-16 right-3 z-40 w-8 h-8 rounded-full bg-sky-500/30 border border-sky-500/50 text-sky-300 flex items-center justify-center hover:bg-sky-500/40 transition-colors shadow-lg backdrop-blur-sm"
        aria-label="Bu ekran hakkında yardım"
        title="Yardım"
      >
        <Info size={14} />
      </button>

      {/* Help modal */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="tm-card w-full max-w-[400px] max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-sky-400" />
                <span className="text-sm font-bold">Ekran Yardımı</span>
              </div>
              <button
                onClick={() => { haptic("light"); setOpen(false); }}
                className="tm-tap p-1 text-muted-foreground hover:text-foreground"
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content — scrollable */}
            <div className="flex-1 overflow-y-auto tm-thin-scrollbar p-3 space-y-3">
              {sections.map((section, i) => (
                <div key={i}>
                  <div className="text-xs font-bold text-sky-400 mb-0.5">{section.title}</div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">{section.desc}</div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-border text-center">
              <button
                onClick={() => { haptic("light"); setOpen(false); }}
                className="tm-tap w-full py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
