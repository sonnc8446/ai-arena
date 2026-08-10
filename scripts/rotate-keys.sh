#!/usr/bin/env bash
# Hỗ trợ xoay API key cho AI Arena.
#   bash scripts/rotate-keys.sh check   # liệt kê key có mặt + kiểm tra gitignore
#   bash scripts/rotate-keys.sh pull    # đồng bộ env từ Vercel về .env.local
# Xem hướng dẫn đầy đủ: docs/rotate-keys.md
set -euo pipefail

cd "$(dirname "$0")/.."

SECRET_KEYS=(
  OPENAI_API_KEY ANTHROPIC_API_KEY GEMINI_API_KEY XAI_API_KEY
  DEEPSEEK_API_KEY MOONSHOT_API_KEY OPENROUTER_API_KEY
  NEXT_PUBLIC_SUPABASE_ANON_KEY VERCEL_OIDC_TOKEN
)

cmd="${1:-check}"

check() {
  echo "== Kiểm tra file .env chứa key =="
  for f in .env .env.local .env.all .env.production; do
    [ -f "$f" ] || continue
    echo "-- $f"
    for k in "${SECRET_KEYS[@]}"; do
      if grep -q "^${k}=" "$f" 2>/dev/null; then
        echo "   [có] $k"
      fi
    done
  done

  echo ""
  echo "== Kiểm tra git KHÔNG track file .env nhạy cảm =="
  tracked=$(git ls-files | grep -E '\.env' | grep -v '\.env\.example' || true)
  if [ -z "$tracked" ]; then
    echo "   OK: chỉ .env.example được track (hoặc không có .env nào)."
  else
    echo "   CẢNH BÁO: các file .env sau đang bị git track (cần gỡ + xoay key):"
    echo "$tracked" | sed 's/^/     - /'
  fi

  echo ""
  echo "== Kiểm tra .gitignore chặn .env.* =="
  for f in .env.all .env.production .env.local; do
    if git check-ignore -q "$f" 2>/dev/null; then
      echo "   [ignored] $f"
    else
      echo "   [KHÔNG ignored] $f  <-- rủi ro!"
    fi
  done

  echo ""
  echo ">> Sau khi xoay key ở dashboard, chạy: bash scripts/rotate-keys.sh pull"
}

pull() {
  command -v vercel >/dev/null || { echo "Cần cài Vercel CLI: npm i -g vercel"; exit 1; }
  echo ">> Kéo env production từ Vercel về .env.local ..."
  vercel env pull .env.local
  echo ">> Xong. Redeploy: vercel --prod"
}

case "$cmd" in
  check) check ;;
  pull) pull ;;
  *) echo "Dùng: $0 [check|pull]"; exit 1 ;;
esac
