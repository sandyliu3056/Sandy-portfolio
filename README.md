# Sandy Liu — Portfolio 佈署包

## 檔案
- `index.html` — 整站,單一檔案,無外部依賴(字型、圖示、照片皆已內嵌)
- `apple-touch-icon.png` — iOS 加到主畫面的圖示,180×180
- `og.png` — 分享預覽卡,1200×630

三個檔案平放在網站根目錄即可,不需要建置步驟。

## 佈署
Vercel:整個資料夾拖進專案,或 `vercel --prod`。
GitHub Pages:三個檔案放進 repo 根目錄,Settings → Pages 選該分支。

## 換網域要改的地方
`index.html` 開頭有三處寫死 `https://sandyliuportfolio.com`:
`<link rel="canonical">`、`og:url`、`og:image`。換網域時一併改掉,
否則分享預覽會抓到舊站的圖。

## 這一版的內容
- 熱帶海洋版(漸層底色、紅鶴、棕櫚、海浪、寵物散步條)
- 中文版本與語言切換鈕已移除,只留英文
- 作品卡副標與「3 items」計數已移除
- About Me 用原本的證件照,奶油白內框 + 粉色外框
- 分頁圖示 favicon、apple-touch-icon 與分享卡 og.png 都用卡通半身版
