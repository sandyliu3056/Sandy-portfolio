# Sandy Liu — Portfolio 佈署包

## 檔案
- `index.html` — 整站,單一檔案,無外部依賴(字型、圖示、頭像皆已內嵌)
- `apple-touch-icon.png` — iOS 加到主畫面時的圖示,180×180
- `og.png` — 分享預覽卡,1200×630

三個檔案平放在網站根目錄即可,不需要建置步驟。

## 佈署
Vercel:整個資料夾拖進 Vercel 專案,或 `vercel --prod`。
GitHub Pages:三個檔案放進 repo 根目錄,Settings → Pages 選該分支。

## 換網域要改的地方
`index.html` 開頭有三處寫死 `https://sandy-portfolio-red.vercel.app`:
`<link rel="canonical">`、`og:url`、`og:image`。換網域時一併改掉,否則
分享預覽會抓到舊站的圖。

## 版本內容
- 作品卡副標(Freight billing…等三行)已移除
- 「3 items」計數已移除
- CALIFORNIA NOTES 浮水印已移除,改為熱帶元素
- 頭像換成插畫版,上衣白色,圓形外框
- 頁面底色與寵物散步條之間改為漸層銜接,無接縫
