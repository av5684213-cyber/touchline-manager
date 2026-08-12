#!/bin/bash
# =============================================================================
# Touchline Manager — Versiyon Tutarlılık Kontrolü (v2.9.145+)
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG_JSON="$ROOT/package.json"
GRADLE="$ROOT/android-app/app/build.gradle"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

fail() { echo -e "${RED}❌ TUTARSIZLIK: $1${NC}"; exit 1; }
ok()   { echo -e "${GREEN}✅ $1${NC}"; }

echo "═══════════════════════════════════════════════════"
echo "Versiyon Tutarlılık Kontrolü"
echo "═══════════════════════════════════════════════════"

PKG_VER=$(python3 -c "import json; print(json.load(open('$PKG_JSON'))['version'])")
echo "📦 package.json      → version = $PKG_VER"

GRADLE_NAME=$(grep -E '^\s*versionName\s+"' "$GRADLE" | head -1 | sed -E 's/.*versionName\s+"([^"]+)".*/\1/')
GRADLE_CODE=$(grep -E '^\s*versionCode\s+[0-9]+' "$GRADLE" | head -1 | sed -E 's/.*versionCode\s+([0-9]+).*/\1/')
echo "📦 build.gradle      → versionName = $GRADLE_NAME, versionCode = $GRADLE_CODE"

if [ "$PKG_VER" != "$GRADLE_NAME" ]; then
  fail "package.json ($PKG_VER) != build.gradle versionName ($GRADLE_NAME)"
fi
ok "package.json version === build.gradle versionName === $PKG_VER"

# Kural: patch × 10 (v2.9.100+)
PATCH=$(echo "$GRADLE_NAME" | awk -F. '{print $3}')
if [ "$PATCH" -ge 100 ]; then
  EXPECTED_CODE=$((PATCH * 10))
else
  EXPECTED_CODE=$((900 + PATCH))
fi
if [ "$GRADLE_CODE" != "$EXPECTED_CODE" ]; then
  fail "build.gradle versionCode ($GRADLE_CODE) != beklenen ($EXPECTED_CODE)"
fi
ok "versionCode $GRADLE_CODE, versionName $GRADLE_NAME ile tutarlı"

# APK kontrolü (opsiyonel)
APK="${1:-}"
if [ -n "$APK" ]; then
  if [ ! -f "$APK" ]; then
    fail "APK dosyası bulunamadı: $APK"
  fi
  echo ""
  echo "📦 APK kontrol ediliyor: $APK"

  AAPT2=""
  for cand in \
    /home/z/android-sdk/build-tools/*/aapt2 \
    /home/z/android-sdk/cmdline-tools/latest/bin/aapt2 \
    $(command -v aapt2 2>/dev/null || true); do
    if [ -x "$cand" ]; then AAPT2="$cand"; break; fi
  done

  if [ -z "$AAPT2" ]; then
    echo -e "${YELLOW}⚠️  aapt2 bulunamadı — APK içeriği doğrulanamıyor.${NC}"
  else
    BADGING=$("$AAPT2" dump badging "$APK" 2>/dev/null)
    APK_NAME=$(echo "$BADGING" | grep -oE "versionName='[^']+'" | head -1 | sed -E "s/versionName='([^']+)'/\1/")
    APK_CODE=$(echo "$BADGING" | grep -oE "versionCode='[0-9]+'" | head -1 | sed -E "s/versionCode='([0-9]+)'/\1/")

    if [ -z "$APK_NAME" ] || [ -z "$APK_CODE" ]; then
      fail "APK'dan versionName/versionCode çıkarılamadı"
    fi

    echo "📦 APK manifest      → versionName = $APK_NAME, versionCode = $APK_CODE"

    if [ "$APK_NAME" != "$GRADLE_NAME" ]; then
      fail "APK versionName ($APK_NAME) != build.gradle versionName ($GRADLE_NAME)"
    fi
    if [ "$APK_CODE" != "$GRADLE_CODE" ]; then
      fail "APK versionCode ($APK_CODE) != build.gradle versionCode ($GRADLE_CODE)"
    fi
    ok "APK manifest versionName/versionCode build.gradle ile birebir eşleşiyor"
  fi
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════"
echo "✅ TÜM VERSİYON KONTROLLERİ GEÇTİ — tek kaynak: package.json ($PKG_VER)"
echo -e "═══════════════════════════════════════════════════${NC}"
