# Sandy Liu — Portfolio 部署包

純靜態網站。**沒有 build 步驟、沒有 node_modules、沒有框架。**
把這個資料夾的內容整包丟上任何靜態主機就會動。

```
index.html               首頁（作品列表 + About Me + 中英切換）
3pl-training.html        作品 03 的實際頁面
sandy.jpg                About Me 的個人照 560x747
favicon.png              分頁圖示 256x256（頭像裁切）
apple-touch-icon.png     iOS 加到主畫面的圖示 180x180
og.png                   分享預覽圖 1200x630
verify.js                上線前自我檢查（可選，需要 node）
README.md                這份文件
```

作品 01 和 02 都連到外部的獨立部署，不需要放在這裡：

- 01 → `https://reprice-demo.vercel.app/`
- 02 → `https://animated-warehouse.vercel.app/`

作品 01 原本在這個包裡有一份副本，已經移除——同一個檔案存在兩個地方，
改了一邊忘記另一邊不會有任何錯誤訊息。現在正本只有 Reprice-Demo 那一份。

---

## ⚠ 子路徑部署（GitHub Pages 必讀）

GitHub Pages 的專案站會放在 **`/<repo 名稱>/`** 底下，例如
`sandyliu3056.github.io/Sandy-Profilo/`，而不是網域根目錄。

因此這個包裡所有路徑都寫成**相對路徑**（`./sandy.jpg`），
在根目錄和子路徑都能運作：

```
./sandy.jpg      →  /Sandy-Profilo/sandy.jpg   ✓
/sandy.jpg       →  /sandy.jpg                 ✗ 會 404
```

**不要把這些路徑改回開頭是 `/` 的寫法**，一改就會在 GitHub Pages 上壞掉，
而且首頁看起來還是正常的——壞的是圖片和另外兩個作品頁。

驗證時可以指定子路徑：

```
BASE=/Sandy-Profilo node verify.js
```

不加 `BASE` 就是用網域根目錄驗（Netlify、Vercel、自訂網域屬於這種）。
兩種都跑一次最保險。

---

## 狀態：可以直接上線

三個作品頁都在包裡或有外部連結，About Me 已填入真實履歷內容（中英雙語），
`verify.js` 全數通過，沒有待辦事項。

分頁圖示改用頭像插畫裁切而成的 `favicon.png`（256x256，128 色，40KB）。
首頁和 3PL 訓練頁共用；`reprice-platform.html` 保留它自己內嵌的產品圖示，
要統一的話把那一行換成和另外兩頁相同即可。

`apple-touch-icon.png` 是 iOS「加入主畫面」時用的圖示，尺寸和格式規定不同，
所以另外放一張，不加也不影響網站。

`og.png` 是依站上配色重做的（原檔是圖片，無法擷取），想換回原本的直接覆蓋
同名檔案即可。

### 換網域時唯一要改的兩行

社群分享預覽圖（貼連結到 LINE、Facebook、Slack 時跳出的那張圖）已經寫成
完整網址，指向目前的 GitHub Pages：

```
第 11 行  <meta property="og:image" content="https://sandyliu3056.github.io/Sandy-Profilo/og.png">
第 18 行  <meta name="twitter:image" content="https://sandyliu3056.github.io/Sandy-Profilo/og.png">
```

**這是整份檔案裡僅有的兩個絕對網址**（另一個 `animated-warehouse.vercel.app`
是作品 02 本來就在外站）。搬到 `sandyliuportfolio.com` 之後把這兩行的網域
換掉即可，其他路徑都是相對的、不用動。

沒換的話網站照常運作，只是分享連結時預覽圖會抓不到——而且不會有任何錯誤
訊息，很容易一直沒發現。

---

## 部署方式（挑一個）

**接續現在的 chatgpt.site**
直接上傳這個資料夾的檔案取代原本的內容即可。自訂網域
`sandyliuportfolio.com` 已經指向該處，換內容不需要重設 DNS。

**Netlify（拖曳即可，最快）**
把整個資料夾拖到 app.netlify.com/drop。不需要帳號也能先看結果。

**Vercel**
```
npx vercel --prod
```
在這個資料夾底下執行。它會自動判定是靜態站，不需要任何設定檔。

**GitHub Pages**
推到 repo，Settings → Pages → Source 選 `main` 分支的根目錄。

**自己的主機**
`scp -r ./* user@host:/var/www/html/` 就結束了，沒有其他步驟。

---

## 上線前自我檢查（可選）

需要 node 和 playwright。它會起一個本機伺服器、用真的瀏覽器開頁面，
檢查每一個連結和資源是否都回 200、有沒有 JS 錯誤。

```
npm install playwright
node verify.js
```

`reprice-platform.html` 還沒補上的話，它會回報那一筆 404 並以非零狀態結束——
這正是它該做的事。

---

## 改內容的地方

全部在 `index.html` 一個檔案裡，沒有其他地方要同步：

| 想改什麼 | 改哪裡 |
|---|---|
| 新增作品 | `<div class="projectList">` 裡複製一個 `<article class="project">`，並在 `TXT` 兩種語言各加一組文字 |
| 作品數量 | `<span data-t="count">`＋`TXT` 裡的 `count`（**兩個語言都要改**） |
| 任何文字 | `TXT.en` / `TXT.zh` 兩份字典，key 必須一一對應 |
| 顏色 | 最上面的 `:root{--bg/--panel/--ink/--gold/--gold2}` |

新增作品時最容易漏掉的就是「數量」那一欄，因為它是寫死的字串，
不是自動算的。`verify.js` 不會抓這個，要自己記得。
