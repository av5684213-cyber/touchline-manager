#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════
# v2.9.149: Supabase .env setup helper
# ════════════════════════════════════════════════════════════════════════════
# Bu script, kullanıcıdan Supabase anon key alır ve .env dosyasına yazar.
# Android APK'da "bağlı değil" hatasının çözümü budur.
#
# Kullanım:
#   bash scripts/setup-supabase-env.sh
#
# Adımlar:
#   1. Supabase Dashboard'a git: https://supabase.com/dashboard
#   2. Projeni seç (jmxbyaamwbpnvgbnjbmo)
#   3. Settings → API → "anon public" key'i kopyala
#   4. Bu script'i çalıştır, key'i yapıştır
#   5. npm run build && bash scripts/build-apk.sh
# ════════════════════════════════════════════════════════════════════════════
set -e

ENV_FILE="/home/z/my-project/.env"
URL="https://jmxbyaamwbpnvgbnjbmo.supabase.co"

echo "═══════════════════════════════════════════════════════════════"
echo "  Touchline Manager — Supabase .env Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Supabase URL: $URL"
echo ""
echo "Anon public key'i al:"
echo "  1. https://supabase.com/dashboard → projeni aç"
echo "  2. Settings (sol alt) → API"
echo "  3. 'Project API keys' → 'anon public' satırını kopyala (eyJ... ile başlar)"
echo ""
read -p "anon public key (paste): " ANON_KEY

if [ -z "$ANON_KEY" ]; then
  echo "❌ Key boş. Çıkış."
  exit 1
fi

# Validate
if [[ ! "$ANON_KEY" =~ ^eyJ ]]; then
  echo "⚠️  Key 'eyJ' ile başlamıyor — yanlış kopyalamış olabilirsin."
  echo "  Devam edilsin mi? (y/N)"
  read -r confirm
  [ "$confirm" != "y" ] && exit 1
fi

# Service role key (opsiyonel, sadece server-side)
echo ""
echo "Service role key (opsiyonel — server-side RPC'ler için):"
echo "  Aynı sayfada 'service_role' key'i kopyala"
read -p "service role key (boş geçilebilir): " SERVICE_KEY

# Write .env
cat > "$ENV_FILE" << EOF
# Touchline Manager — Environment Variables
# Bu dosya .gitignore'da — GitHub'a gitmez.
# v2.9.149 setup-supabase-env.sh tarafından oluşturuldu: $(date)

# Supabase — public (client-side)
NEXT_PUBLIC_SUPABASE_URL=$URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
EOF

if [ -n "$SERVICE_KEY" ]; then
  echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY" >> "$ENV_FILE"
fi

# Sentry + App version (from .env.example)
cat >> "$ENV_FILE" << 'EOF'

# Sentry — Crash & Error Reporting (opsiyonel)
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_APP_VERSION=2.9.149
EOF

echo ""
echo "✅ $ENV_FILE oluşturuldu."
echo ""
echo "İçerik (kullanıcı verisi hariç):"
grep -v "ANON_KEY\|SERVICE_ROLE" "$ENV_FILE"
echo ""
echo "Sonraki adım:"
echo "  npm run build && bash scripts/build-apk.sh"
