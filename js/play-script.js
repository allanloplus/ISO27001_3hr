/* 動畫互動版：由 COURSE 內容產生逐步播放腳本（瀏覽器與 Node 共用）
 * step = { who: "A"|"R", type, show: 字幕(html), speak: 語音文字, sec, block, row }
 * type：title 小節標題 / say 對話 / board 白板講解 / row 表格逐列 / check 隨堂測驗 / exp 測驗解說 / end 章節結尾
 */
(function (root) {
  "use strict";

  var CN = "零一二三四五六七八九";
  function int2cn(n) {
    n = +n;
    if (n < 10) return CN[n];
    if (n < 20) return "十" + (n % 10 ? CN[n % 10] : "");
    if (n < 100) return CN[Math.floor(n / 10)] + "十" + (n % 10 ? CN[n % 10] : "");
    return digits(String(n));
  }
  function digits(s) { return s.replace(/\d/g, function (d) { return CN[+d]; }); }

  function stripHtml(h) {
    return String(h)
      .replace(/<li[^>]*>/g, "。").replace(/<br\s*\/?>/g, "，")
      .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "和")
      .replace(/&lt;/g, "小於").replace(/&gt;/g, "大於").replace(/&quot;|&#39;/g, "");
  }

  /* 文字轉語音前的發音正規化（避免 27001 被念成「兩萬七千零一」） */
  function speakify(h) {
    var s = stripHtml(h);
    s = s.replace(/んちゃ/g, "嗯恰").replace(/キーン/g, "咻").replace(/哦嗨喲/g, "哦嗨唷");
    s = s.replace(/Amd\s*1/g, "第一號增修");
    s = s.replace(/ISO\/IEC/g, "ISO ").replace(/SEMI E187/g, "SEMI E 一八七");
    s = s.replace(/3-2-1-1-0/g, "三二一一零").replace(/3-2-1/g, "三二一");
    // 標準編號與年份：逐位念
    s = s.replace(/(\d{4,5})(-\d)?(:\d{4})?/g, function (m, a, part, yr) {
      var out = digits(a);
      if (part) out += "之" + digits(part.slice(1));
      if (yr) out += "，" + digits(yr.slice(1)) + "年版";
      return out;
    });
    // 條文編號 A.5.7、6.1.2、9.3.2
    s = s.replace(/A\.(\d+)(?:\.(\d+))?/g, function (m, a, b) { return "A " + int2cn(a) + (b ? "點" + int2cn(b) : ""); });
    s = s.replace(/(\d+)\.(\d+)(?:\.(\d+))?\s*([a-g]\))?/g, function (m, a, b, c, d) {
      if (+a > 20 || (b.length > 1 && b[0] === "0")) return m; // 小數（99.5）照常念
      return int2cn(a) + "點" + int2cn(b) + (c ? "點" + int2cn(c) : "") + (d ? " " + d[0] : "");
    });
    s = s.replace(/(\d)\s*[~～]\s*(\d)/g, "$1到$2");
    s = s.replace(/≥/g, "大於等於").replace(/≤/g, "小於等於").replace(/→/g, "，接著").replace(/×/g, "乘以")
      .replace(/≠/g, "不等於").replace(/✓|✔/g, "").replace(/[「」『』]/g, "").replace(/\s*\/\s*/g, "、")
      .replace(/\bSoA\b/g, "S O A").replace(/\bISMS\b/g, "I S M S").replace(/\bPIMS\b/g, "P I M S")
      .replace(/～/g, "～").replace(/\s+/g, " ").trim();
    return s;
  }

  function plain(h) { return stripHtml(h).replace(/\s+/g, " ").trim(); }

  function build(ch) {
    var steps = [];
    function add(o) { steps.push(o); }
    ch.sections.forEach(function (sec, si) {
      add({ who: "R", type: "title", sec: si, block: -1, show: sec.h, speak: (si === 0 ? "我們開始囉！" : "下一段！") + "主題是：" + sec.h });
      sec.b.forEach(function (b, bi) {
        var base = { sec: si, block: bi };
        function put(o) { var x = Object.assign({}, base, o); x.speak = speakify(x.speak); add(x); }
        switch (b[0]) {
          case "A": case "R":
            put({ who: b[0], type: "say", show: b[1], speak: b[1] }); break;
          case "p":
            put({ who: "A", type: "board", show: b[1], speak: b[1] }); break;
          case "std":
            put({ who: "A", type: "board", show: "標準要求：" + b[1], speak: "我們先看標準要求，" + b[1] + "。" });
            b[2].forEach(function (it, ri) { put({ who: "A", type: "row", row: ri, show: it, speak: it }); });
            break;
          case "list":
            b[1].forEach(function (it, ri) { put({ who: "A", type: "row", row: ri, show: it, speak: it }); });
            break;
          case "tip":
            var lead = { consult: "顧問實務分享，", audit: "從稽核員的角度來看，", ng: "常見缺失，", key: "重點，" }[b[1]];
            put({ who: "A", type: "board", show: b[2], speak: lead + b[2] + "。" + b[3] });
            break;
          case "table":
            b[2].forEach(function (r, ri) {
              var t = r.map(function (c, ci) {
                var h = plain(b[1][ci] || "");
                return ci === 0 || !h || r.length <= 2 ? c : h + "，" + c;
              }).join("。");
              put({ who: "A", type: "row", row: ri, show: r.map(plain).join("｜"), speak: t });
            });
            break;
          case "ctrl":
            b[1].forEach(function (r, ri) {
              put({ who: "A", type: "row", row: ri, show: "A." + r[0] + " " + r[1], speak: "A." + r[0] + "，" + r[1] + "。" + r[2] });
            });
            break;
          case "check":
            put({ who: "R", type: "check", show: b[1], speak: "隨堂小測驗！" + b[1] + "請選出答案！" });
            put({ who: "A", type: "exp", show: b[4], speak: "正確答案是 " + "ABCD"[b[3]] + "。" + b[4] });
            break;
        }
      });
    });
    add({ who: "R", type: "end", sec: ch.sections.length - 1, block: -1, show: "本章結束", speak: "這一章結束囉！要繼續下一章，還是去挑戰課後測驗呢？" });
    return steps;
  }

  /* 共用語音：測驗回饋 */
  var COMMON = [
    { key: "right", who: "R", speak: "答對了！好厲害喔！" },
    { key: "wrong", who: "R", speak: "哎呀，答錯了，聽老師解說一下吧！" }
  ];

  var api = { build: build, speakify: speakify, plain: plain, COMMON: COMMON };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PlayScript = api;
})(this);
