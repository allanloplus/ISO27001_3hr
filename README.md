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

## 使用方式
純靜態網站，無需後端。
- 本機：`python3 -m http.server`，開啟 http://localhost:8000
- 上線：GitHub Pages（Settings → Pages → Deploy from branch，根目錄）

閱讀進度與證書資料只存在學員自己的瀏覽器（localStorage），不會上傳。

## 檔案結構
- `index.html`、`css/style.css`、`js/app.js`：介面與功能
- `js/content-1.js`～`js/content-3.js`：課程內容（可直接編修文字）
- `js/quiz.js`：課後測驗題目、正解、解說與通過分數
- `assets/`：講師、助教半身像（由原始插畫裁切）
- `play.html`、`css/play.css`、`js/play.js`、`js/play-script.js`：動畫互動版
- `audio/`：各章語音 MP3 與時間軸 `cues.js`；`tools/`：語音產生工具
