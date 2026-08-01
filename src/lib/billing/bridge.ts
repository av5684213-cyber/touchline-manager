/**
 * v2.9.46 Görev 2 — Google Play Billing bridge (client-side).
 *
 * Bu modül, Android native tarafındaki BillingClient ile JS arasında köprü kurar.
 * Capacitor benzeri native shell'de `window.TouchlineBilling` global objesi
 * native MainActivity.java tarafından expose edilir.
 *
 * Web/dev ortamında `window.TouchlineBilling` undefined olur — tüm fonksiyonlar
 * zarif şekilde "Geliştirici Modu" davranışı sergiler (no-op veya fake success).
 *
 * Native tarafın implementasyonu (MainActivity.java):
 *   - BillingClient başlat (skuDetails, launchBillingFlow, acknowledgePurchase)
 *   - @JavascriptInterface ile expose edilen metodlar:
 *     * querySkuDetails(skuList): SKU detaylarını döndürür (fiyat, başlık)
 *     * launchPurchaseFlow(sku): satın alma akışını başlatır
 *     * acknowledgePurchase(purchaseToken): satın almayı onaylar
 *     * getActivePurchases(): aktif satın almaları döndürür
 *
 * Android dependency: com.android.billingclient:billing-ktx:6.1.0
 */

export type BillingSku = {
  sku: string;
  title: string;
  description: string;
  price: string;          // "1,99 ₺" gibi lokalize edilmiş
  priceMicros: number;    // 1990000 (mikro birim)
  priceCurrencyCode: string; // "TRY"
};

export type BillingPurchase = {
  sku: string;
  purchaseToken: string;
  purchaseTime: number;
  purchaseState: "purchased" | "pending" | "unspecified";
  acknowledged: boolean;
};

export type BillingResult = {
  success: boolean;
  reason?: string;
  purchase?: BillingPurchase;
};

/**
 * Native bridge mevcut mı kontrol et.
 * Web/dev ortamında her zaman false döner.
 */
export function isBillingAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return typeof (window as any).TouchlineBilling !== "undefined";
}

/**
 * SKU detaylarını sorgula — native'den fiyat/başlık al.
 * Native yoksa fake veri döndürür (Geliştirici Modu).
 */
export async function querySkuDetails(skus: string[]): Promise<BillingSku[]> {
  if (!isBillingAvailable()) {
    // Geliştirici Modu — fake SKU detayları
    return skus.map(sku => ({
      sku,
      title: `${sku} (Dev)`,
      description: "Geliştirici Modu — gerçek satın alma değil",
      price: "0,00 ₺",
      priceMicros: 0,
      priceCurrencyCode: "TRY",
    }));
  }

  try {
    const bridge = (window as any).TouchlineBilling;
    const result = await bridge.querySkuDetails(JSON.stringify(skus));
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    if (!parsed.success) {
      console.warn("[billing] querySkuDetails failed:", parsed.reason);
      return [];
    }
    return parsed.skus as BillingSku[];
  } catch (e) {
    console.error("[billing] querySkuDetails exception:", e);
    return [];
  }
}

/**
 * v2.9.52: Dev mode flag — sadece local dev/staging'de true.
 * Production build'inde (Play Store APK) bu flag tanımsız/false olmalı.
 * .env.production'da NEXT_PUBLIC_BILLING_DEV_MODE tanımlı OLMAMALI.
 */
const BILLING_DEV_MODE = process.env.NEXT_PUBLIC_BILLING_DEV_MODE === "true";

/**
 * Satın alma akışını başlat.
 *
 * v2.9.65 FIX: Native bridge async olduğu için `touchline-purchase-result` event'ini bekler.
 * Eski kod: bridge.launchPurchaseFlow() hemen {success:true, purchase:null} dönüyordu
 * → shop.tsx "Dev mode" branch'ine düşüp kredileri verify etmeden ekliyordu.
 *
 * v2.9.52: Dev mode flag — sadece local dev/staging'de true.
 */
export async function launchPurchaseFlow(sku: string): Promise<BillingResult> {
  if (!isBillingAvailable()) {
    // v2.9.52: Production'da sahte satın alma YASAK
    if (BILLING_DEV_MODE) {
      console.log("[billing] Dev mode — simulating purchase for", sku);
      return {
        success: true,
        purchase: {
          sku,
          purchaseToken: `dev_token_${Date.now()}`,
          purchaseTime: Date.now(),
          purchaseState: "purchased",
          acknowledged: true,
        },
      };
    }
    // Production: native billing yok → satın alma başarısız
    console.warn("[billing] Native billing unavailable — purchase rejected");
    return {
      success: false,
      reason: "billing_unavailable",
    };
  }

  try {
    const bridge = (window as any).TouchlineBilling;

    // v2.9.65: Native bridge'i çağır — ama sonucu bekleme (async callback)
    // v2.9.67: Dönüş değerini kontrol et — BillingClient hazır değilse hemen reject
    const launchResult = bridge.launchPurchaseFlow(sku);
    if (typeof launchResult === "string") {
      try {
        const parsed = JSON.parse(launchResult);
        if (!parsed.success) {
          return { success: false, reason: parsed.reason ?? "billing_not_ready" };
        }
      } catch { /* JSON parse hatası — devam et, event bekle */ }
    }

    // v2.9.65: `touchline-purchase-result` event'ini bekle (timeout 60 sn)
    // Native Java tarafı satın alma tamamlandığında bu event'i dispatch ediyor
    const purchaseResult = await new Promise<BillingResult>((resolve) => {
      const timeout = setTimeout(() => {
        window.removeEventListener("touchline-purchase-result", handler);
        resolve({ success: false, reason: "timeout" });
      }, 60_000);

      const handler = (event: any) => {
        const detail = event.detail ?? event;
        // Sadece bu SKU için olan event'i işle
        if (detail?.sku && detail.sku !== sku) return;

        clearTimeout(timeout);
        window.removeEventListener("touchline-purchase-result", handler);

        if (detail.success && detail.purchaseToken) {
          resolve({
            success: true,
            purchase: {
              sku,
              purchaseToken: detail.purchaseToken,
              purchaseTime: detail.purchaseTime ?? Date.now(),
              purchaseState: "purchased",
              acknowledged: false,
            },
          });
        } else {
          resolve({
            success: false,
            reason: detail.reason ?? "user_canceled",
          });
        }
      };

      window.addEventListener("touchline-purchase-result", handler);
    });

    return purchaseResult;
  } catch (e: any) {
    return { success: false, reason: e?.message ?? "Billing exception" };
  }
}

/**
 * Satın almayı onayla (Google Play gereği 3 gün içinde yapılmalı).
 */
export async function acknowledgePurchase(purchaseToken: string): Promise<boolean> {
  if (!isBillingAvailable()) {
    return true; // dev mode — otomatik onaylı
  }

  try {
    const bridge = (window as any).TouchlineBilling;
    const result = await bridge.acknowledgePurchase(purchaseToken);
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    return parsed.success === true;
  } catch (e) {
    console.error("[billing] acknowledgePurchase exception:", e);
    return false;
  }
}

/**
 * Aktif satın almaları getir (restore purchases için).
 */
export async function getActivePurchases(): Promise<BillingPurchase[]> {
  if (!isBillingAvailable()) {
    return [];
  }

  try {
    const bridge = (window as any).TouchlineBilling;
    const result = await bridge.getActivePurchases();
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    if (!parsed.success) return [];
    return parsed.purchases as BillingPurchase[];
  } catch (e) {
    console.error("[billing] getActivePurchases exception:", e);
    return [];
  }
}

// =============================================================================
// Kredi paketleri — SKU tanımları
// =============================================================================

export type CreditPack = {
  sku: string;
  credits: number;
  bonusCredits: number; // promosyon
  priceCents: number;   // sent cinsinden (199 = $1.99)
  popular?: boolean;
  bestValue?: boolean;
};

/**
 * Google Play Console'da tanımlanacak SKU'lar.
 * Tüm paketler `credits_*` öneki ile başlar.
 */
export const CREDIT_PACKS: CreditPack[] = [
  {
    sku: "credits_small",
    credits: 100,
    bonusCredits: 0,
    priceCents: 199,    // $1.99 / ~65 TL
  },
  {
    sku: "credits_medium",
    credits: 300,
    bonusCredits: 30,   // %10 bonus
    priceCents: 499,    // $4.99 / ~165 TL
    popular: true,
  },
  {
    sku: "credits_large",
    credits: 700,
    bonusCredits: 100,  // ~%14 bonus
    priceCents: 999,    // $9.99 / ~330 TL
  },
  {
    sku: "credits_mega",
    credits: 2000,
    bonusCredits: 400,  // %20 bonus
    priceCents: 1999,   // $19.99 / ~660 TL
    bestValue: true,
  },
];

/**
 * SKU'dan CreditPack bul.
 */
export function getCreditPackBySku(sku: string): CreditPack | undefined {
  return CREDIT_PACKS.find(p => p.sku === sku);
}
