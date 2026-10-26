#!/usr/bin/env python3
"""產生客戶授權版（放在企業內部網站使用）。

公開版（GitHub）的 js/license.js 為 null，網頁不顯示任何授權資訊；
本工具會複製一份課程網站，寫入該客戶的授權資訊後打包成 zip，原始專案不會被修改。

用法（在專案根目錄執行）：
  python tools/make_license_package.py --company "○○股份有限公司" --no L-2026-001 \
      --start 2026-11-01 --end 2027-10-31 --domains elearning.example.com,intranet.example.com

參數：
  --company  授權公司名稱（必填）       --dept     授權單位（選填）
  --no       授權編號（預設 L-今天日期）  --start/--end  授權期間（YYYY-MM-DD；不填 end = 永久）
  --domains  授權網域，逗號分隔（選填；網站放在其他網域時頁面會顯示提醒）
  --note     授權用途（預設：內部教育訓練使用）
  --tools    一併附上語音重製工具（tools/build-script.js、gen_audio.py；預設不附）
  --out      輸出資料夾（預設：專案根目錄的 dist/）

網頁顯示位置：頁首授權標籤、首頁「○○ 內部教育訓練專用」、每頁頁尾授權說明、
結業證書「授權單位」、題目解答下載檔與列印版。授權到期或網域不符時，頁面頂端會顯示提醒。
"""
import argparse, datetime, json, os, re, shutil, tempfile, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 授權版要包含的網站檔案
SITE = ["index.html", "play.html", "css", "js", "assets", "audio"]
AUDIO_TOOLS = ["build-script.js", "gen_audio.py"]

CUSTOMER_README = """# ISMS 標準簡介線上課（ISO/IEC 27001:2022）授權版

授權公司：{company}{dept}
授權編號：{no}
授權期間：{period}
授權用途：{note}
{domains}
## 架設方式
1. **先將 zip 檔「全部解壓縮」**（在 zip 檔上按右鍵 →「全部解壓縮…」）。
   請勿直接在壓縮檔中點開 index.html，否則樣式、圖片、語音與程式不會一起載入，畫面會變成純文字。
2. 把解壓縮後資料夾內的全部內容上傳到企業內部網站（IIS、Nginx、Apache 或任何靜態網站空間皆可），
   以瀏覽器開啟 `index.html` 即可；也可以直接在電腦上雙擊解壓縮後的 `index.html` 使用
   （直接開檔時，動畫互動版若無法載入語音，會改用瀏覽器內建語音）。

- 閱讀版（含課後測驗與結業證書）：`index.html`
- 動畫互動版（講師與助教語音導讀）：`play.html`
- 課程文字內容：`js/content-1.js`～`js/content-3.js`；測驗題目：`js/quiz.js`
{tools_note}
## 授權說明
本教材經授權供上述公司{note}。授權資訊記載於 `js/license.js`，請勿修改或移除；
未經授權，請勿轉載、複製或對外公開。授權續約或擴充請洽 Allan Lo 顧問（http://www.123hi.org）。

---
教材規劃製作：Allan Lo 顧問（http://www.123hi.org）
Copyright © 2026 Allan Lo. All rights reserved.
"""

TOOLS_NOTE = """- 修改課程文字後要重新產生語音：`node tools/build-script.js > tools/script.json`，
  再執行 `python3 tools/gen_audio.py`（需 `pip install edge-tts` 與 ffmpeg）
"""


def valid_date(s):
    if not s:
        return ""
    datetime.date.fromisoformat(s)
    return s


def main():
    ap = argparse.ArgumentParser(description="產生客戶授權版")
    ap.add_argument("--company", required=True)
    ap.add_argument("--dept", default="")
    ap.add_argument("--no", default="")
    ap.add_argument("--start", default=datetime.date.today().isoformat(), type=valid_date)
    ap.add_argument("--end", default="", type=valid_date)
    ap.add_argument("--domains", default="")
    ap.add_argument("--note", default="內部教育訓練使用")
    ap.add_argument("--tools", action="store_true")
    ap.add_argument("--out", default=os.path.join(ROOT, "dist"))
    a = ap.parse_args()

    no = a.no or "L-" + datetime.date.today().strftime("%Y%m%d")
    lic = {"company": a.company.strip(), "dept": a.dept.strip(), "no": no, "start": a.start, "end": a.end,
           "domains": [d.strip().lower() for d in a.domains.split(",") if d.strip()], "note": a.note.strip()}
    if a.end and a.start and a.end < a.start:
        ap.error("--end 不能早於 --start")
    safe = re.sub(r'[\\/:*?"<>|\s]+', "_", lic["company"])
    name = f"ISO27001_ISMS_授權版_{safe}_{no}"
    os.makedirs(a.out, exist_ok=True)

    with tempfile.TemporaryDirectory() as td:
        dst = os.path.join(td, name)
        os.makedirs(dst)
        for item in SITE:
            src = os.path.join(ROOT, item)
            if os.path.isdir(src):
                shutil.copytree(src, os.path.join(dst, item))
            else:
                shutil.copy2(src, dst)
        if a.tools:
            os.makedirs(os.path.join(dst, "tools"))
            for f in AUDIO_TOOLS:
                shutil.copy2(os.path.join(ROOT, "tools", f), os.path.join(dst, "tools", f))
        with open(os.path.join(dst, "js", "license.js"), "w", encoding="utf-8") as f:
            f.write("/* 授權資訊：請勿修改或移除。授權續約請洽 Allan Lo 顧問（http://www.123hi.org） */\n")
            f.write("window.COURSE_LICENSE = " + json.dumps(lic, ensure_ascii=False, indent=1) + ";\n")
        period = f"{lic['start']} ～ {lic['end']}" if lic["end"] else f"{lic['start']} 起"
        with open(os.path.join(dst, "README_授權版.md"), "w", encoding="utf-8") as f:
            f.write(CUSTOMER_README.format(
                company=lic["company"], dept=("　" + lic["dept"]) if lic["dept"] else "", no=no, period=period,
                note=lic["note"], tools_note=TOOLS_NOTE if a.tools else "",
                domains=("授權網域：" + "、".join(lic["domains"]) + "\n") if lic["domains"] else ""))
        zpath = os.path.join(a.out, name + ".zip")
        with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
            for base, _, files in os.walk(dst):
                for fn in files:
                    full = os.path.join(base, fn)
                    z.write(full, os.path.relpath(full, td))
    size = os.path.getsize(zpath) / 1e6
    print(f"已產生授權版：{zpath}（{size:.1f} MB）")
    print(f"授權公司：{lic['company']}｜編號：{no}｜期間：{period}" +
          (f"｜網域：{', '.join(lic['domains'])}" if lic["domains"] else ""))


if __name__ == "__main__":
    main()
