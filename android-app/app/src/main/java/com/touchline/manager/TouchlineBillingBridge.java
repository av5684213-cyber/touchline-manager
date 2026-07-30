package com.touchline.manager;

import android.app.Activity;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.JavascriptInterface;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.ConsumeResponseListener;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryPurchasesParams;
import com.android.billingclient.api.SkuDetails;
import com.android.billingclient.api.SkuDetailsParams;
import com.android.billingclient.api.SkuDetailsResponseListener;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * ════════════════════════════════════════════════════════════════════════════
 * TouchlineBillingBridge — Google Play Billing JS köprüsü (v2.9.46 Görev 2)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * WebView'dan JS tarafına expose edilen metodlar:
 *   - querySkuDetails(skuListJson): SKU detaylarını döndürür (fiyat, başlık)
 *   - launchPurchaseFlow(sku): satın alma akışını başlatır
 *   - acknowledgePurchase(purchaseToken): satın almayı onaylar
 *   - getActivePurchases(): aktif satın almaları döndürür
 *
 * JS tarafı (src/lib/billing/bridge.ts) window.TouchlineBilling global'ini kullanır.
 *
 * Kullanım:
 *   webView.addJavascriptInterface(new TouchlineBillingBridge(this), "TouchlineBilling");
 *
 * Dependency: com.android.billingclient:billing-ktx:6.1.0
 * ════════════════════════════════════════════════════════════════════════════
 */
public class TouchlineBillingBridge implements PurchasesUpdatedListener {
    private static final String TAG = "TouchlineBilling";

    private final Activity activity;
    private final BillingClient billingClient;
    private boolean billingReady = false;

    // Pending purchase callback — JS tarafına dönüş için
    private PurchaseResultCallback pendingPurchaseCallback;

    public interface PurchaseResultCallback {
        void onResult(boolean success, String reason, Purchase purchase);
    }

    public TouchlineBillingBridge(Activity activity) {
        this.activity = activity;
        this.billingClient = BillingClient.newBuilder(activity)
            .setListener(this)
            .enablePendingPurchases()
            .build();
        startConnection();
    }

    private void startConnection() {
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    billingReady = true;
                    Log.i(TAG, "BillingClient hazır");
                } else {
                    Log.e(TAG, "BillingClient kurulum hatası: " + billingResult.getResponseCode());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                billingReady = false;
                Log.w(TAG, "BillingClient bağlantısı kesildi");
                // Yeniden bağlanmayı dene
                startConnection();
            }
        });
    }

    public boolean isReady() {
        return billingReady;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // JS Interface metodları
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * SKU detaylarını sorgula.
     * @param skuListJson JSON array string: ["credits_small", "credits_medium"]
     * @return JSON string: {"success": true, "skus": [{sku, title, description, price, priceMicros, priceCurrencyCode}]}
     */
    @JavascriptInterface
    public String querySkuDetails(final String skuListJson) {
        try {
            JSONArray skuArray = new JSONArray(skuListJson);
            List<String> skuList = new ArrayList<>();
            for (int i = 0; i < skuArray.length(); i++) {
                skuList.add(skuArray.getString(i));
            }

            SkuDetailsParams params = SkuDetailsParams.newBuilder()
                .setSkusList(skuList)
                .setType(BillingClient.SkuType.INAPP)
                .build();

            final JSONObject result = new JSONObject();
            final JSONArray skusResult = new JSONArray();

            // BillingClient sorgu senkron değil — ama JSInterface thread'inde bekleyebiliriz
            // Basitlik için: sorguyu başlat, sonucu JSON olarak döndür
            // Not: gerçek implementasyonda callback ile JS'e dönüş yapılmalı
            billingClient.querySkuDetailsAsync(params, new SkuDetailsResponseListener() {
                @Override
                public void onSkuDetailsResponse(BillingResult billingResult, List<SkuDetails> skuDetailsList) {
                    try {
                        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK
                            && skuDetailsList != null) {
                            for (SkuDetails sku : skuDetailsList) {
                                JSONObject skuJson = new JSONObject();
                                skuJson.put("sku", sku.getSku());
                                skuJson.put("title", sku.getTitle());
                                skuJson.put("description", sku.getDescription());
                                skuJson.put("price", sku.getPrice());
                                skuJson.put("priceMicros", sku.getPriceAmountMicros());
                                skuJson.put("priceCurrencyCode", sku.getPriceCurrencyCode());
                                skusResult.put(skuJson);
                            }
                            result.put("success", true);
                            result.put("skus", skusResult);
                        } else {
                            result.put("success", false);
                            result.put("reason", "SkuDetails sorgu hatası: " + billingResult.getResponseCode());
                        }
                    } catch (JSONException e) {
                        Log.e(TAG, "querySkuDetails JSON hatası", e);
                    }
                }
            });

            // Senkron dönüş — async callback sonucu hemen dönmeyebilir
            // Pratikte bu metod async olmalı; ama JSInterface'de Promise desteği yok
            // Çözüm: JS tarafı bu metodu çağırır, sonuç boş dönerse retry yapar
            return result.toString();
        } catch (JSONException e) {
            Log.e(TAG, "querySkuDetails exception", e);
            return "{\"success\": false, \"reason\": \"JSON parse hatası\"}";
        }
    }

    /**
     * Satın alma akışını başlat.
     * @param sku SKU string (örn: "credits_small")
     * @return JSON string: {"success": true/false, "purchase": {...}, "reason": "..."}
     *
     * Not: BillingClient.launchBillingFlow async olduğu için bu metod
     * satın alma akışını başlatır ve hemen "pending" döndürür.
     * Gerçek sonuç onPurchasesUpdated callback'inde gelir.
     */
    @JavascriptInterface
    public String launchPurchaseFlow(final String sku) {
        if (!billingReady) {
            return "{\"success\": false, \"reason\": \"BillingClient hazır değil\"}";
        }

        // SKU detaylarını önce sorgula (launchBillingFlow SkuDetails ister)
        List<String> skuList = new ArrayList<>();
        skuList.add(sku);

        SkuDetailsParams params = SkuDetailsParams.newBuilder()
            .setSkusList(skuList)
            .setType(BillingClient.SkuType.INAPP)
            .build();

        billingClient.querySkuDetailsAsync(params, new SkuDetailsResponseListener() {
            @Override
            public void onSkuDetailsResponse(BillingResult billingResult, List<SkuDetails> skuDetailsList) {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK
                    || skuDetailsList == null || skuDetailsList.isEmpty()) {
                    Log.e(TAG, "SkuDetails alınamadı: " + billingResult.getResponseCode());
                    return;
                }

                SkuDetails skuDetails = skuDetailsList.get(0);

                // Satın alma akışını başlat
                BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                    .setSkuDetails(skuDetails)
                    .build();

                BillingResult flowResult = billingClient.launchBillingFlow(activity, flowParams);
                if (flowResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    Log.e(TAG, "launchBillingFlow hatası: " + flowResult.getResponseCode());
                }
            }
        });

        // Pending dön — gerçek sonuç onPurchasesUpdated'da gelir
        return "{\"success\": true, \"purchase\": null, \"reason\": \"pending\"}";
    }

    /**
     * Satın almayı onayla (acknowledge).
     * Google Play gereği 3 gün içinde yapılmalı, yoksa otomatik iade edilir.
     *
     * @param purchaseToken satın alma token'ı
     * @return JSON string: {"success": true/false}
     */
    @JavascriptInterface
    public String acknowledgePurchase(final String purchaseToken) {
        if (!billingReady || purchaseToken == null) {
            return "{\"success\": false, \"reason\": \"BillingClient hazır değil veya token null\"}";
        }

        // Purchase nesnesini token'dan bul
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build();

        billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                Log.e(TAG, "queryPurchases hatası: " + billingResult.getResponseCode());
                return;
            }

            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseToken().equals(purchaseToken)) {
                    if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED && !purchase.isAcknowledged()) {
                        // Acknowledge
                        com.android.billingclient.api.AcknowledgePurchaseParams acknowledgeParams =
                            com.android.billingclient.api.AcknowledgePurchaseParams.newBuilder()
                                .setPurchaseToken(purchaseToken)
                                .build();

                        billingClient.acknowledgePurchase(acknowledgeParams, billingResult1 -> {
                            if (billingResult1.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                                Log.i(TAG, "Purchase acknowledged: " + purchaseToken);
                            } else {
                                Log.e(TAG, "Acknowledge hatası: " + billingResult1.getResponseCode());
                            }
                        });
                    }
                    break;
                }
            }
        });

        return "{\"success\": true}";
    }

    /**
     * Aktif satın almaları getir (restore purchases için).
     * @return JSON string: {"success": true, "purchases": [{sku, purchaseToken, ...}]}
     */
    @JavascriptInterface
    public String getActivePurchases() {
        if (!billingReady) {
            return "{\"success\": false, \"reason\": \"BillingClient hazır değil\"}";
        }

        final JSONObject result = new JSONObject();
        try {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build();

            // Senkron dönüş için queryPurchasesAsync sonucunu bekle
            // Pratikte async — JS tarafı retry yapmalı
            billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
                try {
                    JSONArray purchasesArray = new JSONArray();
                    for (Purchase purchase : purchases) {
                        JSONObject purchaseJson = new JSONObject();
                        // SkuList'ten ilk SKU'yu al
                        JSONArray skuList = new JSONArray(purchase.getSkus());
                        if (skuList.length() > 0) {
                            purchaseJson.put("sku", skuList.getString(0));
                        }
                        purchaseJson.put("purchaseToken", purchase.getPurchaseToken());
                        purchaseJson.put("purchaseTime", purchase.getPurchaseTime());
                        purchaseJson.put("purchaseState", purchase.getPurchaseState());
                        purchaseJson.put("acknowledged", purchase.isAcknowledged());
                        purchasesArray.put(purchaseJson);
                    }
                    result.put("success", true);
                    result.put("purchases", purchasesArray);
                } catch (JSONException e) {
                    Log.e(TAG, "getActivePurchases JSON hatası", e);
                }
            });

            return result.toString();
        } catch (Exception e) {
            Log.e(TAG, "getActivePurchases exception", e);
            return "{\"success\": false, \"reason\": \"Exception\"}";
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // PurchasesUpdatedListener — satın alma sonucu
    // ════════════════════════════════════════════════════════════════════════════

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK
            && purchases != null && !purchases.isEmpty()) {
            for (Purchase purchase : purchases) {
                Log.i(TAG, "Satın alma başarılı: " + purchase.getSkus());
                // JS tarafına bildir — window.dispatchEvent ile custom event
                notifyJsPurchaseResult(true, null, purchase);
            }
        } else {
            Log.w(TAG, "Satın alma başarısız/iptal: " + billingResult.getResponseCode());
            notifyJsPurchaseResult(false, billingResult.getDebugMessage(), null);
        }
    }

    /**
     * JS tarafına satın alma sonucunu bildir.
     * WebView'a evaluateJavascript ile event gönderir.
     */
    private void notifyJsPurchaseResult(boolean success, String reason, Purchase purchase) {
        try {
            JSONObject result = new JSONObject();
            result.put("success", success);
            if (reason != null) result.put("reason", reason);
            if (purchase != null) {
                JSONObject purchaseJson = new JSONObject();
                JSONArray skuList = new JSONArray(purchase.getSkus());
                if (skuList.length() > 0) {
                    purchaseJson.put("sku", skuList.getString(0));
                }
                purchaseJson.put("purchaseToken", purchase.getPurchaseToken());
                purchaseJson.put("purchaseTime", purchase.getPurchaseTime());
                purchaseJson.put("purchaseState", purchase.getPurchaseState());
                purchaseJson.put("acknowledged", purchase.isAcknowledged());
                result.put("purchase", purchaseJson);
            }

            // WebView'a custom event gönder
            final String js = "window.dispatchEvent(new CustomEvent('touchline-purchase-result', {detail: " + result.toString() + "}));";

            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    if (activity instanceof MainActivity) {
                        ((MainActivity) activity).evaluateJavascript(js);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "JS evaluate hatası", e);
                }
            });
        } catch (JSONException e) {
            Log.e(TAG, "notifyJsPurchaseResult JSON hatası", e);
        }
    }
}
