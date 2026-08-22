/**
 * verify_redirect.js — 用 jsdom 載入真的 index.html 做驗證
 *
 *   node verify_redirect.js index.html
 *
 * 三段檢查：
 *   A. 真頁面丟進 jsdom，用各種 hostname 開，看有沒有真的觸發導航。
 *      jsdom 的 location 是 unforgeable，覆寫不了 replace，
 *      所以改成攔 jsdomError（"navigation to another Document"）判斷。
 *   B. 從檔案裡撈出 redirect script 原文，套 stub location 執行，
 *      驗導向目標是否正確（query / hash 有沒有保留）。
 *      腳本原文直接讀檔，不會和實際上線的內容脫節。
 *   C. meta 標籤與殘留網址檢查。
 */

const fs = require('fs');
const vm = require('vm');
const { JSDOM, VirtualConsole } = require('jsdom');

const CANONICAL = 'https://sandyliuportfolio.com';
const MARK = 'portfolio-canonical-redirect';

const path = process.argv[2];
if (!path) {
  console.error('用法：node verify_redirect.js <index.html>');
  process.exit(1);
}
const html = fs.readFileSync(path, 'utf8');

let failed = 0;
const pass = (m) => console.log('  [PASS] ' + m);
const fail = (m) => { console.log('  [FAIL] ' + m); failed++; };

// ── A. 真頁面在 jsdom 裡跑，看導航有沒有觸發 ──────────────────

const NAV_CASES = [
  ['https://sandyliu3056.github.io/Sandy-portfolio/', true],
  ['https://sandy-portfolio-red.vercel.app/', true],
  ['https://sandyliuportfolio.com/', false],
  ['https://sandyliuportfolio.com/#about', false],
  ['http://localhost:8000/', false],
  ['https://sandy-portfolio-git-preview-sandy.vercel.app/', false],
];

console.log('── A. 導航是否觸發（真頁面）──');

for (const [url, shouldNavigate] of NAV_CASES) {
  let navigated = false;
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (/navigation/i.test(e.message)) navigated = true; });

  const dom = new JSDOM(html, { url, runScripts: 'dangerously', virtualConsole: vc });
  dom.window.close();

  if (navigated === shouldNavigate) {
    pass(`${url} ${navigated ? '有導航' : '不導航'}`);
  } else {
    fail(`${url} 預期 ${shouldNavigate ? '導航' : '不導航'}，實際 ${navigated ? '導航' : '不導航'}`);
  }
}

// ── B. 導向目標是否正確（讀檔案裡的腳本原文）─────────────────

console.log('\n── B. 導向目標（腳本原文 + stub location）──');

const block = html.match(
  new RegExp(`<!--\\s*${MARK}:start\\s*-->([\\s\\S]*?)<!--\\s*${MARK}:end\\s*-->`)
);
if (!block) {
  fail(`找不到 ${MARK} 區塊`);
} else {
  const code = (block[1].match(/<script[^>]*>([\s\S]*?)<\/script>/) || [])[1];
  if (!code) {
    fail('redirect 區塊裡沒有 <script>');
  } else {
    const TARGET_CASES = [
      ['sandyliu3056.github.io', '', '', CANONICAL + '/'],
      ['sandyliu3056.github.io', '', '#projects', CANONICAL + '/#projects'],
      ['sandy-portfolio-red.vercel.app', '?utm_source=line', '', CANONICAL + '/?utm_source=line'],
      ['sandy-portfolio-red.vercel.app', '?a=1', '#about', CANONICAL + '/?a=1#about'],
    ];

    for (const [hostname, search, hash, expected] of TARGET_CASES) {
      let got = null;
      const sandbox = {
        location: {
          hostname, search, hash,
          replace: (u) => { got = u; },
          assign: (u) => { got = u; },
        },
      };
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox);

      const label = hostname + search + hash;
      if (got === expected) pass(`${label} → ${got}`);
      else fail(`${label} 預期 ${expected}，實際 ${got}`);
    }
  }
}

// ── C. meta 標籤與殘留 ──────────────────────────────────────

console.log('\n── C. meta 標籤 ──');

const doc = new JSDOM(html, { url: CANONICAL + '/' }).window.document;

const META = [
  ['canonical', 'link[rel="canonical"]', 'href'],
  ['og:url', 'meta[property="og:url"]', 'content'],
  ['og:image', 'meta[property="og:image"]', 'content'],
  ['twitter:image', 'meta[name="twitter:image"]', 'content'],
];

for (const [name, selector, attr] of META) {
  const el = doc.querySelector(selector);
  if (!el) { fail(`${name} 標籤不存在`); continue; }
  const val = el.getAttribute(attr) || '';
  if (val.startsWith(CANONICAL)) pass(`${name} = ${val}`);
  else fail(`${name} 未指向主網域：${val}`);
}

console.log('\n── 殘留檢查 ──');

const stale = (html.match(/https?:\/\/[^"'\s<>]*vercel\.app[^"'\s<>]*/g) || [])
  .filter((u) => !u.includes('/_vercel/'));
if (stale.length === 0) pass('沒有殘留的 vercel.app 網址');
else fail('仍有 vercel.app 網址：' + [...new Set(stale)].join(', '));

console.log('\n' + (failed === 0 ? '全部通過。' : `${failed} 項失敗。`));
process.exit(failed === 0 ? 0 : 1);
