# ISMS 標準簡介線上課（ISO/IEC 27001:2022）

由 Allan Lo 羅宇倫顧問的 3 小時實體課講義改編的線上課程，講師 Allan 與助教阿拉蕾以對話方式帶讀條文，並補充輔導與驗證稽核實務。

## 內容
- 17 個單元，可自由選擇章節：開場、標準沿革、架構、第 4~10 章、附錄 A（A.5~A.8 全部 93 項）、驗證實務、結語
- 每章包含：標準要求、顧問實務、稽核員視角、常見缺失、隨堂小測驗
- 課後測驗 10 題（題目與選項順序隨機），80 分通過
  - 通過：填寫公司名稱、單位、姓名、職稱、E-mail → 產生結業證書（PNG 下載）、題目解答（HTML 下載）、列印 / 另存 PDF
  - 未通過：不公布正解，列出建議重讀章節，可重新閱讀或重新測驗

## 動畫互動版（play.html）
- 教室舞台：黑板逐列浮現重點、講師／助教說話時有動作與聲波，稽核員視角會蓋上印章
- 語音：講師為台灣男聲（zh-TW-YunJheNeural），助教為台灣小女生（zh-TW-HsiaoYuNeural 提高音調），預先合成於 `audio/`
- 播放控制：播放／暫停、上一句／下一句、時間軸跳轉、語速 0.8～1.75×、字幕開關、自動連播下一章
- 隨堂測驗會暫停等待作答，阿拉蕾即時回饋後由講師解說
- 字幕稿可點選跳轉；閱讀進度與閱讀版共用

### 修改課程內容後重新產生語音
```bash
pip install edge-tts   # 另需 ffmpeg
node tools/build-script.js > tools/script.json
python3 tools/gen_audio.py   # 只會重新合成有變動的句子
```
若內容有改但未重新產生語音，播放器會自動改用瀏覽器內建語音（音色依裝置而異）。

## 客戶授權版（企業內部網站）

GitHub 上的公開版不顯示任何授權資訊（`js/license.js` 為 `null`）。要提供給客戶放在企業內部網站時，在專案根目錄執行：

```bash
python3 tools/make_license_package.py --company "○○股份有限公司" --dept "資訊處" \
    --no L-2026-001 --start 2026-11-01 --end 2027-10-31 --domains elearning.example.com
```

會在 `dist/` 產生 `ISO27001_ISMS_授權版_○○股份有限公司_L-2026-001.zip`（原始專案不會被修改），內含：
- 完整網站（閱讀版、動畫互動版與語音、課後測驗），`js/license.js` 已寫入該客戶的授權資訊
- 給客戶的 `README_授權版.md`（架設方式與授權說明）
- 預設不含語音重製工具；要附上請加 `--tools`

網頁會顯示：頁首「授權：○○股份有限公司」、首頁「○○股份有限公司　內部教育訓練專用」、每頁頁尾授權說明（公司、編號、期間）、結業證書「授權單位」，以及題目解答下載檔與列印版的授權說明。
授權到期，或網站不在 `--domains` 指定的網域時，頁面頂端會出現紅色提醒（`--end`、`--domains` 不填則不檢查；在 localhost 或直接開檔時不檢查網域）。
若客戶直接在 zip 壓縮檔裡點開網頁，頁面會提示先「全部解壓縮」。

> 注意：授權資訊是寫在網頁檔案裡的，取得原始檔的人在技術上仍可自行修改；此機制用於標示與提醒，正式的使用範圍請以授權合約約定。

## 使用方式
純靜態網站，無需後端。
- 本機：`python3 -m http.server`，開啟 http://localhost:8000
- 上線：GitHub Pages（Settings → Pages → Deploy from branch，根目錄）

閱讀進度與證書資料只存在學員自己的瀏覽器（localStorage），不會上傳。

## 檔案結構
- `index.html`、`css/style.css`、`js/app.js`：介面與功能
- `js/content-1.js`～`js/content-3.js`：課程內容（可直接編修文字）
- `js/quiz.js`：課後測驗題目、正解、解說與通過分數
- `assets/`：講師 Allan 與 AI 小助手阿拉蕾的半身像、全身像及 8 種表情（由角色設定圖裁切）
- `js/characters.js`：角色圖檔與依台詞自動選表情的規則
- `js/license.js`、`js/license-ui.js`、`tools/make_license_package.py`：客戶授權版機制
- `play.html`、`css/play.css`、`js/play.js`、`js/play-script.js`：動畫互動版
- `audio/`：各章語音 MP3 與時間軸 `cues.js`；`tools/`：語音產生工具

---
教材規劃製作：Allan Lo 顧問（http://www.123hi.org）

Copyright © 2026 Allan Lo. All rights reserved.
