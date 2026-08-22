#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch_portfolio.py — Sandy-portfolio 佈署修正

功能：
  1. 把舊網域 (vercel.app) 的 canonical / og:url / og:image / twitter:image 換成主網域
  2. 注入 canonical redirect（舊網址 -> 主網域，保留 query 與 hash）
  3. 注入 analytics snippet
  4. 改完自我驗證，任一項失敗就 exit 1 並列出原因

用法：
  python3 patch_portfolio.py index.html              # 實際修改（會先備份）
  python3 patch_portfolio.py index.html --dry-run    # 只看會改什麼，不寫檔

改設定請改下面 CONFIG 區塊。
"""

import argparse
import datetime
import re
import shutil
import sys
from pathlib import Path

# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────

# 主網域，不要結尾斜線
CANONICAL_DOMAIN = "https://sandyliuportfolio.com"

# 要被取代掉的舊網域（出現在 meta 標籤裡的）
OLD_ORIGINS = [
    "https://sandy-portfolio-red.vercel.app",
]

# 要被 redirect 走的 hostname。只列明確的舊站，
# 這樣 Vercel preview deployment 和 localhost 都不會被誤導走。
REDIRECT_FROM_HOSTS = [
    "sandyliu3056.github.io",
    "sandy-portfolio-red.vercel.app",
]

# analytics 供應商："vercel" | "cloudflare" | "goatcounter" | "umami" | "none"
ANALYTICS = "none"

# 依上面選的供應商填對應那一個就好
CF_BEACON_TOKEN = ""          # cloudflare  Web Analytics token
GOATCOUNTER_CODE = ""         # goatcounter 你的代號（<代號>.goatcounter.com）
UMAMI_WEBSITE_ID = ""         # umami       website id (UUID)

# ─────────────────────────────────────────────────────────────
# 產生要注入的內容
# ─────────────────────────────────────────────────────────────

REDIRECT_MARK = "portfolio-canonical-redirect"
ANALYTICS_MARK = "portfolio-analytics"


def build_redirect_block() -> str:
    hosts = ", ".join(f"'{h}'" for h in REDIRECT_FROM_HOSTS)
    return f"""<!-- {REDIRECT_MARK}:start -->
<script>
(function () {{
  var stale = [{hosts}];
  if (stale.indexOf(location.hostname) !== -1) {{
    location.replace('{CANONICAL_DOMAIN}/' + location.search + location.hash);
  }}
}})();
</script>
<!-- {REDIRECT_MARK}:end -->"""


def build_analytics_block() -> str:
    provider = ANALYTICS.lower().strip()

    if provider == "none":
        return ""

    if provider == "vercel":
        body = '<script defer src="/_vercel/insights/script.js"></script>'

    elif provider == "cloudflare":
        if not CF_BEACON_TOKEN:
            sys.exit("設定錯誤：ANALYTICS='cloudflare' 但 CF_BEACON_TOKEN 是空的")
        body = (
            '<script defer src="https://static.cloudflareinsights.com/beacon.min.js"\n'
            f"        data-cf-beacon='{{\"token\": \"{CF_BEACON_TOKEN}\"}}'></script>"
        )

    elif provider == "goatcounter":
        if not GOATCOUNTER_CODE:
            sys.exit("設定錯誤：ANALYTICS='goatcounter' 但 GOATCOUNTER_CODE 是空的")
        body = (
            f'<script data-goatcounter="https://{GOATCOUNTER_CODE}.goatcounter.com/count"\n'
            '        async src="//gc.zgo.at/count.js"></script>'
        )

    elif provider == "umami":
        if not UMAMI_WEBSITE_ID:
            sys.exit("設定錯誤：ANALYTICS='umami' 但 UMAMI_WEBSITE_ID 是空的")
        body = (
            '<script defer src="https://cloud.umami.is/script.js"\n'
            f'        data-website-id="{UMAMI_WEBSITE_ID}"></script>'
        )

    else:
        sys.exit(f"設定錯誤：不認得的 ANALYTICS 值 '{ANALYTICS}'")

    return f"<!-- {ANALYTICS_MARK}:start -->\n{body}\n<!-- {ANALYTICS_MARK}:end -->"


# ─────────────────────────────────────────────────────────────
# 修改步驟
# ─────────────────────────────────────────────────────────────

def replace_old_origins(html: str, log: list) -> str:
    for origin in OLD_ORIGINS:
        hits = html.count(origin)
        if hits:
            html = html.replace(origin, CANONICAL_DOMAIN)
            log.append(f"取代舊網域 {origin} -> {CANONICAL_DOMAIN}（{hits} 處）")
        else:
            log.append(f"舊網域 {origin} 未出現，略過")
    return html


def inject_after_head(html: str, block: str, mark: str, log: list) -> str:
    if f"{mark}:start" in html:
        log.append(f"{mark} 已存在，略過注入")
        return html

    m_head = re.search(r"<head\b[^>]*>", html, re.IGNORECASE)
    if not m_head:
        sys.exit("找不到 <head> 開頭標籤，中止")

    # charset 必須留在 head 最前面（規範要求在前 1024 bytes），
    # 所以有 charset 就插在它後面，沒有才緊接 <head>。
    m_charset = re.search(r"<meta\b[^>]*charset[^>]*>", html, re.IGNORECASE)
    if m_charset and m_charset.start() > m_head.start():
        idx = m_charset.end()
        where = "<meta charset> 之後"
    else:
        idx = m_head.end()
        where = "<head> 之後"

    log.append(f"注入 {mark}（{where}）")
    return html[:idx] + "\n" + block + "\n" + html[idx:]


def inject_before_head_close(html: str, block: str, mark: str, log: list) -> str:
    if not block:
        log.append(f"{mark}：ANALYTICS='none'，不注入")
        return html

    if f"{mark}:start" in html:
        log.append(f"{mark} 已存在，略過注入")
        return html

    m = re.search(r"</head\s*>", html, re.IGNORECASE)
    if not m:
        sys.exit("找不到 </head> 結尾標籤，中止")

    idx = m.start()
    log.append(f"注入 {mark}（</head> 之前）")
    return html[:idx] + block + "\n" + html[idx:]


# ─────────────────────────────────────────────────────────────
# 驗證
# ─────────────────────────────────────────────────────────────

def verify(html: str) -> list:
    problems = []

    for origin in OLD_ORIGINS:
        if origin in html:
            problems.append(f"舊網域 {origin} 仍殘留在檔案中")

    if html.count(f"{REDIRECT_MARK}:start") != 1:
        problems.append("redirect 區塊不是剛好一份")
    if html.count(f"{REDIRECT_MARK}:end") != 1:
        problems.append("redirect 區塊結尾不是剛好一份")

    if ANALYTICS.lower().strip() != "none":
        if html.count(f"{ANALYTICS_MARK}:start") != 1:
            problems.append("analytics 區塊不是剛好一份")

    # redirect 必須在 </head> 之前
    m_r = html.find(f"{REDIRECT_MARK}:start")
    m_h = re.search(r"</head\s*>", html, re.IGNORECASE)
    if m_h and m_r > m_h.start():
        problems.append("redirect 區塊跑到 </head> 之後")

    for tag, pattern in (
        ("canonical", r'rel=["\']canonical["\']'),
        ("og:url", r'property=["\']og:url["\']'),
    ):
        if not re.search(pattern, html, re.IGNORECASE):
            problems.append(f"警告：找不到 {tag} 標籤（可能原本就沒有）")

    bad = re.findall(r'https?://[^"\'\s<>]*vercel\.app[^"\'\s<>]*', html)
    bad = [b for b in bad if "vercel.app" in b and "_vercel" not in b]
    if bad:
        problems.append(f"仍有 vercel.app 網址：{sorted(set(bad))}")

    return problems


# ─────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", help="index.html 路徑")
    ap.add_argument("--dry-run", action="store_true", help="只顯示，不寫檔")
    args = ap.parse_args()

    src = Path(args.path)
    if not src.is_file():
        sys.exit(f"檔案不存在：{src}")

    original = src.read_text(encoding="utf-8")
    log = []

    html = replace_old_origins(original, log)
    html = inject_after_head(html, build_redirect_block(), REDIRECT_MARK, log)
    html = inject_before_head_close(html, build_analytics_block(), ANALYTICS_MARK, log)

    print("── 動作 ──")
    for line in log:
        print(" ", line)

    problems = verify(html)
    print("\n── 驗證 ──")
    if problems:
        for p in problems:
            print("  [FAIL]", p)
    else:
        print("  全部通過")

    if args.dry_run:
        print("\n--dry-run：未寫檔")
        return 0

    hard_fail = [p for p in problems if not p.startswith("警告")]
    if hard_fail:
        print("\n驗證未通過，不寫檔。")
        return 1

    if html == original:
        print("\n內容無變更，不寫檔、不備份。")
        return 0

    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = src.with_suffix(src.suffix + f".bak.{stamp}")
    shutil.copy2(src, backup)
    src.write_text(html, encoding="utf-8")

    print(f"\n備份：{backup}")
    print(f"已寫入：{src}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
