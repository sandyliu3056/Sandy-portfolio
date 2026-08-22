#!/usr/bin/env bash
# 判斷主網域目前由誰服務，決定 analytics 要選哪一個。
set -u

DOMAIN="${1:-sandyliuportfolio.com}"
echo "檢查 https://${DOMAIN}"
echo

HEADERS="$(curl -sIL --max-time 15 "https://${DOMAIN}" 2>/dev/null)"

if [ -z "$HEADERS" ]; then
  echo "取不到回應，確認網域是否已生效。"
  exit 1
fi

echo "$HEADERS" | grep -iE '^(HTTP/|server:|x-vercel-id:|x-github-request-id:|x-served-by:|cf-ray:)'
echo

if echo "$HEADERS" | grep -qiE 'x-vercel-id|server: *Vercel'; then
  echo "=> Vercel。ANALYTICS = \"vercel\"，記得先在 Project → Analytics 按 Enable。"
elif echo "$HEADERS" | grep -qi 'server: *GitHub.com'; then
  echo "=> GitHub Pages。ANALYTICS 選 \"goatcounter\" 或 \"umami\"。"
  echo "   （Cloudflare Web Analytics 也可以，但有取樣，低流量會失真。）"
elif echo "$HEADERS" | grep -qi 'cf-ray'; then
  echo "=> 經過 Cloudflare。後面實際是誰要再看 origin。"
else
  echo "=> 認不出來，把上面的 header 貼給我。"
fi

echo
echo "og.png 檢查："
curl -sI --max-time 15 "https://${DOMAIN}/og.png" 2>/dev/null | head -1
