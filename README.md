# Sandy Liu — Portfolio 佈署包

## 檔案
- `index.html` — 工作作品集,單一檔案,無外部依賴
- `apple-touch-icon.png` — iOS 加到主畫面的圖示,180×180
- `og.png` — 分享預覽卡,1200×630

三個檔案平放在網站根目錄即可,不需要建置步驟。
生活版已獨立成 Off-The-Clock repo,不在這個包裡。

## 佈署
Vercel:整個資料夾拖進專案,或 `vercel --prod`。
GitHub Pages:三個檔案放進 repo 根目錄,Settings → Pages 選該分支。

## 換網域要改的地方
`index.html` 開頭有三處寫死 `https://sandyliuportfolio.com`:
`<link rel="canonical">`、`og:url`、`og:image`。換網域時一併改掉,
否則分享預覽會抓到舊站的圖。

## 這一版的內容
- 加州暖色:粉奶油底、紅鶴與棕櫚、暖灰棕文字
- 只有英文,名字只留 Sandy Liu
- 頁尾有柯基與雙色布偶貓在散步
- 頁首右上連到生活版 https://off-the-clock-blush.vercel.app/
