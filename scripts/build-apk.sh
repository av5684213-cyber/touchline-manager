#!/bin/bash
# =============================================================================
# Touchline Manager — APK Build Script (v2.9.74)
# =============================================================================
# Bu script lokal makında çalıştırılmalı (Android SDK gerekli).
# Sandbox'ta Android SDK olmadığı için buradan build alınamıyor.
#
# GEREKSİNİMLER:
#   1. Android Studio veya Android SDK (cmdline-tools)
#   2. JDK 17+ (gradle 8.2 için)
#   3. Node.js 20+ (Next.js build için)
#
# KULLANIM:
#   cd touchline-manager
#   bash scripts/build-apk.sh
#
# ÇIKTI:
#   android-app/app/build/outputs/apk/debug/app-debug.apk
# =============================================================================

set -e  # hata olursa dur

echo "🚀 Touchline Manager APK Build — v2.9.74"
echo "=========================================="

# ─── 1. Next.js static export ─────────────────────────────────────────────────
echo ""
echo "📦 1/4: Next.js build alınıyor..."
npm run build

if [ ! -d "out" ]; then
  echo "❌ Next.js build başarısız — out/ dizini yok"
  exit 1
fi

echo "✅ out/ dizini hazır: $(du -sh out/ | cut -f1)"

# ─── 2. Android assets'e kopyala ─────────────────────────────────────────────
echo ""
echo "📦 2/4: Android assets'e kopyalanıyor..."
# v2.9.145 KRİTİK FIX: TÜM out/ klasörünü kopyala + web/ alt klasörüne koy.
#
# ÖNCEKİ HATA: Sadece out/_next kopyalanıyordu → awards/trophies/backgrounds
# eksik → 3.1 MB'lık bozuk APK.
#
# BU SÜRÜMDE EKLENEN ÖNEMLİ DÜZELTME: MainActivity.java sabit yolu
# "file:///android_asset/web/index.html" bekliyor. Yani tüm out/ içeriği
# android-app/app/src/main/assets/web/ altına kopyalanmalı.
# Önceki "tüm out/ kopyala" fix'i assets/'in köküne kopyaladı → WebView 404.
#
# Doğru boyut ~20 MB olmalı (önceki release'lerle uyumlu).
mkdir -p android-app/app/src/main/assets/web
rm -rf android-app/app/src/main/assets/web/*
cp -r out/* android-app/app/src/main/assets/web/

echo "✅ assets/web hazır: $(du -sh android-app/app/src/main/assets/web/ | cut -f1)"
echo "   Awards: $(ls android-app/app/src/main/assets/web/awards/ 2>/dev/null | wc -l) dosya"
echo "   Trophies: $(ls android-app/app/src/main/assets/web/trophies/ 2>/dev/null | wc -l) dosya"
echo "   Backgrounds: $(ls android-app/app/src/main/assets/web/backgrounds/ 2>/dev/null | wc -l) dosya"
echo "   _next chunks: $(ls android-app/app/src/main/assets/web/_next/static/chunks/ 2>/dev/null | wc -l) dosya"
echo "   index.html: $([ -f android-app/app/src/main/assets/web/index.html ] && echo '✅ var' || echo '❌ YOK - BUILD BOZUK')"

# ─── 3. local.properties kontrol ─────────────────────────────────────────────
echo ""
echo "📦 3/4: Android SDK kontrol ediliyor..."

if [ ! -f "android-app/local.properties" ]; then
  echo "⚠️  local.properties yok — SDK yolu yazılacak"
  if [ -n "$ANDROID_HOME" ]; then
    echo "sdk.dir=$ANDROID_HOME" > android-app/local.properties
    echo "✅ ANDROID_HOME kullanıldı: $ANDROID_HOME"
  elif [ -n "$ANDROID_SDK_ROOT" ]; then
    echo "sdk.dir=$ANDROID_SDK_ROOT" > android-app/local.properties
    echo "✅ ANDROID_SDK_ROOT kullanıldı: $ANDROID_SDK_ROOT"
  else
    echo "❌ ANDROID_HOME veya ANDROID_SDK_ROOT env var yok"
    echo "   Çözüm: android-app/local.properties dosyasına SDK yolunu yaz:"
    echo "   sdk.dir=/Users/SENIN_KULLANICI_ADIN/Library/Android/sdk  (macOS)"
    echo "   sdk.dir=/home/SENIN_KULLANICI_ADIN/Android/Sdk  (Linux)"
    echo "   sdk.dir=C:\\\\Users\\\\SENIN_KULLANICI_ADIN\\\\AppData\\\\Local\\\\Android\\\\Sdk  (Windows)"
    exit 1
  fi
else
  echo "✅ local.properties mevcut: $(cat android-app/local.properties)"
fi

# ─── 4. Gradle build ──────────────────────────────────────────────────────────
echo ""
echo "📦 4/4: Gradle APK build..."
cd android-app
chmod +x gradlew

echo ""
echo "🔧 Debug APK derleniyor..."
./gradlew assembleDebug --no-daemon

cd ..

# ─── Sonuç ────────────────────────────────────────────────────────────────────
APK_PATH="android-app/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
  echo ""
  echo "🎉 APK HAZIR!"
  echo "=========================================="
  echo "📄 Dosya: $APK_PATH"
  echo "📊 Boyut: $(du -h $APK_PATH | cut -f1)"
  echo "🏷️  Versiyon: 2.9.74 (versionCode 974)"
  echo ""
  echo "📲 Kurulum (Android cihazda):"
  echo "   adb install $APK_PATH"
  echo ""
  echo "📁 Dosyayı telefona kopyalamak için:"
  echo "   Mac:     open android-app/app/build/outputs/apk/debug/"
  echo "   Linux:   xdg-open android-app/app/build/outputs/apk/debug/"
  echo "   Windows: explorer android-app\\\\app\\\\build\\\\outputs\\\\apk\\\\debug\\\\"
else
  echo "❌ APK build başarısız — çıktı bulunamadı"
  exit 1
fi
