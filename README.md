# Sandy-portfolio 佈署修正包

修正三件事：meta 標籤還指向舊的 vercel.app 網址、三個網址同時上線導致流量分散、沒有 analytics。

## 順序

**1. 確認主網域由誰服務**

```bash
bash check_host.sh sandyliuportfolio.com
```

結果決定下一步 analytics 選哪一個。Vercel 才能用 `/_vercel/insights/script.js`，GitHub Pages 上那個路徑不存在。

**2. 設定**

打開 `patch_portfolio.py`，改 CONFIG 區塊：

| 變數 | 說明 |
|---|---|
| `CANONICAL_DOMAIN` | 主網域，不加結尾斜線 |
| `OLD_ORIGINS` | 要被取代掉的舊網域 |
| `REDIRECT_FROM_HOSTS` | 要被導走的 hostname。只列明確舊站，preview 與 localhost 才不會被誤導 |
| `ANALYTICS` | `vercel` / `cloudflare` / `goatcounter` / `umami` / `none` |
| `CF_BEACON_TOKEN` 等 | 依上面選的填對應那一個 |

**3. 先空跑**

```bash
python3 patch_portfolio.py index.html --dry-run
```

**4. 實跑**

```bash
python3 patch_portfolio.py index.html
```

會先備份成 `index.html.bak.<時間戳>` 再寫入。驗證未過就不寫檔。重複執行不會重複注入。

**5. 驗證**

```bash
npm install jsdom
node verify_redirect.js index.html
```

**6. 推上去**

推完清 CDN 快取，用無痕視窗開舊網址確認會跳轉。

## 驗證涵蓋

- 舊 host 進來會導航；主網域、localhost、Vercel preview 不會
- 導向目標保留 query 與 hash
- canonical / og:url / og:image / twitter:image 都指向主網域
- 全檔沒有殘留 vercel.app 網址

`verify_redirect.js` 讀的是檔案裡的腳本原文，不是另外寫一份複製品，所以不會和上線內容脫節。

## 檔案

| 檔案 | 用途 |
|---|---|
| `patch_portfolio.py` | 主程式 |
| `verify_redirect.js` | jsdom 驗證 |
| `check_host.sh` | 判斷 host |
| `snippets.html` | 不想跑 script 時手動貼的三段 |

## 注意

改完確認 `https://sandyliuportfolio.com/og.png` 開得起來，否則社群預覽圖會空白。

redirect 是 client-side JS，搜尋引擎權重轉移不如 301 完整。GitHub Pages 沒有 server-side redirect，這是可行範圍內最好的做法；`canonical` 已經指向主網域，兩者搭配足夠。若舊網址那份改放 Vercel，可以改用 `vercel.json` 的 301。

`REDIRECT_FROM_HOSTS` 採白名單而非黑名單，新增舊網址時要自己加進去。
