/* 角色設定：講師 Allan、AI 小助手 阿拉蕾 的圖檔與表情判斷（閱讀版與動畫版共用） */
(function (root) {
  "use strict";

  var CHAR = {
    A: {
      name: "Allan 講師", short: "Allan",
      pose: "assets/allan.webp",          // 半身：手持平板、伸手介紹
      full: "assets/allan-full.webp",
      base: "smile",
      moods: ["smile", "laugh", "think", "confused", "surprised", "point", "wink", "worried"]
    },
    R: {
      name: "阿拉蕾助教", short: "阿拉蕾",
      pose: "assets/arale.webp",          // 半身：拿著全息平板、伸手介紹
      tablet: "assets/arale-tablet.webp",
      full: "assets/arale-full.webp",
      base: "explain",
      moods: ["laugh", "think", "surprised", "confused", "explain", "sad", "thumb", "fight"]
    }
  };

  function face(who, mood) { return "assets/" + (who === "A" ? "allan-" : "arale-") + (mood || CHAR[who].base) + ".webp"; }

  /* 依台詞內容挑表情 */
  function mood(who, text, kind) {
    var t = String(text || "").replace(/<[^>]+>/g, "");
    if (kind === "audit" || kind === "key") return "point";
    if (kind === "ng") return "worried";
    if (kind === "consult") return "smile";
    if (kind === "right") return "thumb";
    if (kind === "wrong") return "sad";
    if (who === "R") {
      if (/哇|耶！|好厲害|原來/.test(t)) return "surprised";
      if (/哎呀|糟糕|好辛苦|好硬/.test(t)) return "sad";
      if (/^(了解|好！|我全部|出發|加油)|出發吧|開始囉|下一段/.test(t)) return "fight";
      if (/[？?]/.test(t)) return /怎麼|什麼|嗎/.test(t) && /一樣|抽象|不一樣/.test(t) ? "confused" : "think";
      if (/哈|～！|嗨|喲/.test(t)) return "laugh";
      if (/記得|做好了|完成|結束/.test(t)) return "thumb";
      return "explain";
    }
    if (/哈哈/.test(t)) return "laugh";
    if (/皺眉|最怕|經典的缺失|垮了|救得回來|不行/.test(t)) return "worried";
    if (/超常考|好問題|很好考/.test(t)) return "surprised";
    if (/沒錯|完全正確|比喻得很好|很厲害|做得好|謝謝/.test(t)) return "wink";
    if (/重點|最重要|一定要|記住|強調|不能|不是/.test(t)) return "point";
    if (/[？?]/.test(t)) return "think";
    return "smile";
  }

  var api = { CHAR: CHAR, face: face, mood: mood };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Characters = api;
})(this);
