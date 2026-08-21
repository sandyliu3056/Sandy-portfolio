# Sandy Liu — Portfolio 部署包

純靜態網站。**沒有 build 步驟、沒有 node_modules、沒有框架。**
把這個資料夾的內容整包丟上任何靜態主機就會動。

```
index.html               首頁（作品列表 + About Me + 中英切換）
reprice-platform.html    作品 01 的實際頁面
3pl-training.html        作品 03 的實際頁面
sandy.jpg                About Me 的個人照 560x747
favicon.svg              瀏覽器分頁圖示
og.png                   分享預覽圖 1200x630
verify.js                上線前自我檢查（可選，需要 node）
README.md                這份文件
```

作品 02 連到外部的 `animated-warehouse.vercel.app`，不需要放在這裡。

---

## 狀態：可以直接上線

三個作品頁都在包裡或有外部連結，About Me 已填入真實履歷內容（中英雙語），
`verify.js` 全數通過，沒有待辦事項。

`favicon.svg` 和 `og.png` 是依站上配色重做的（原檔是圖片，無法擷取）。
想換回原本的，直接覆蓋同名檔案即可。

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
