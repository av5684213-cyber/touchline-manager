#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════
# v2.9.146: Pre-build Guard — supabase-test route'unun geri gelmesini önler
# ════════════════════════════════════════════════════════════════════════════
# Sorun (kullanıcı raporu): v2.9.143'te silinen supabase-test route'u v2.9.145'te
# GERİ GELDİ. Kök neden: önceki "silme" sadece derlenmiş out/ dosyalarını silmişti,
# kaynak dosyayı (src/app/supabase-test/page.tsx) değil. Bir sonraki build tekrar
# üretti.
#
# Çözüm: Bu script build-apk.sh başında çalışır. Kaynakta supabase-test varsa
# build'i durdurur ve kullanıcıya hatırlatır.
# ════════════════════════════════════════════════════════════════════════════
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }
ok()   { echo -e "${GREEN}✅ $1${NC}"; }

echo "═══════════════════════════════════════════════════"
echo "v2.9.146 Pre-build Guard: supabase-test kontrolü"
echo "═══════════════════════════════════════════════════"

# 1. Kaynakta supabase-test route dosyası var mı?
ROUTE_DIR="$ROOT/src/app/supabase-test"
if [ -d "$ROUTE_DIR" ]; then
  fail "src/app/supabase-test/ KLASÖRÜ MEVCUT — bu route kalıcı olarak silinmiş olmalı!
   Kök neden: önceki 'silme' sadece out/ dosyalarını silmiş, kaynak dosyayı değil.
   Çözüm:
     rm -rf src/app/supabase-test
   sonra tekrar build al."
fi

# 2. Başka yasaklı route'lar var mı?
FORBIDDEN_ROUTES=("supabase-test" "supabase_test" "debug-supabase" "test-supabase")
for route in "${FORBIDDEN_ROUTES[@]}"; do
  if [ -d "$ROOT/src/app/$route" ]; then
    fail "src/app/$route/ mevcut — yasaklı debug route"
  fi
done

# 3. .env veya config'de NEXT_PUBLIC_BUILD_ENV=development varsa uyar
if [ -f "$ROOT/.env" ]; then
  if grep -q "NEXT_PUBLIC_BUILD_ENV.*development" "$ROOT/.env" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  .env dosyasında NEXT_PUBLIC_BUILD_ENV=development var.${NC}"
    echo -e "${YELLOW}    Production build'de bu 'development' olmalı ya da satır olmamalı.${NC}"
  fi
fi

ok "supabase-test route kaynakta YOK — build güvenli devam edebilir."

# 4. signingConfig credentials kontrolü
LOCAL_PROPS="$ROOT/android-app/local.properties"
if [ -f "$LOCAL_PROPS" ]; then
  if grep -q "touchline.keystore.path" "$LOCAL_PROPS" 2>/dev/null; then
    ok "local.properties'te signing credentials bulundu — release APK production keystore ile imzalanacak."
  else
    echo -e "${YELLOW}⚠️  local.properties'te touchline.keystore.path yok.${NC}"
    echo -e "${YELLOW}    Release APK debug keystore ile imzalanacak (lokal test için sorun değil).${NC}"
    echo -e "${YELLOW}    Production release için: cp android-app/gradle.properties.example android-app/local.properties${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  local.properties yok — release APK debug keystore ile imzalanacak.${NC}"
  echo -e "${YELLOW}    Production release için: cp android-app/gradle.properties.example android-app/local.properties${NC}"
fi

echo ""
ok "Pre-build guard PASSED"
echo "═══════════════════════════════════════════════════"
