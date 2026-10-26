/* 授權版顯示：頁首授權標籤、頁尾授權說明、到期或網域不符提醒。
 * 公開版（COURSE_LICENSE = null）時不做任何事。app.js 另用 window.LICENSE 在首頁與結業證書顯示授權單位。 */
(function () {
  "use strict";
  var L = window.COURSE_LICENSE;
  var LIC = L && L.company ? L : null;
  window.LICENSE = LIC;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  window.licenseText = function () {
    if (!LIC) return "";
    var who = LIC.company + (LIC.dept ? " " + LIC.dept : "");
    var period = LIC.start || LIC.end ? "授權期間 " + (LIC.start || "") + (LIC.end ? " ～ " + LIC.end : " 起") : "";
    var meta = [LIC.no ? "授權編號 " + LIC.no : "", period].filter(Boolean).join("，");
    return "本教材經授權供「" + who + "」" + (LIC.note || "內部教育訓練使用") + (meta ? "（" + meta + "）" : "") + "。未經授權，請勿轉載、複製或對外公開。";
  };
  if (!LIC) return;

  function warnings() {
    var w = [], d = new Date(), today = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    if (LIC.end && today > LIC.end) w.push("本教材授權已於 " + LIC.end + " 到期，請洽 Allan Lo 顧問（www.123hi.org）續約。");
    var host = location.hostname;
    if (LIC.domains && LIC.domains.length && host && !/^(localhost|127\.|\[::1\])/.test(host) &&
        !LIC.domains.some(function (x) { return host === x || host.slice(-(x.length + 1)) === "." + x; }))
      w.push("此網站（" + host + "）不在授權網域內，請洽 Allan Lo 顧問（www.123hi.org）。");
    return w;
  }

  function apply() {
    var bar = document.querySelector(".topbar");
    if (bar && !bar.querySelector(".lic-badge")) {
      var b = document.createElement("span");
      b.className = "lic-badge"; b.title = window.licenseText();
      b.textContent = "授權：" + LIC.company;
      var brand = bar.querySelector(".brand");
      brand && brand.nextSibling ? bar.insertBefore(b, brand.nextSibling) : bar.appendChild(b);
    }
    var w = warnings();
    if (w.length && !document.querySelector(".lic-warn")) {
      var div = document.createElement("div");
      div.className = "lic-warn"; div.setAttribute("role", "alert"); div.textContent = w.join(" ");
      document.body.insertBefore(div, document.body.firstChild);
    }
    var foot = document.querySelector(".site-foot");
    if (foot && !foot.querySelector(".lic-line")) {
      var p = document.createElement("p");
      p.className = "lic-line"; p.textContent = window.licenseText();
      foot.insertBefore(p, foot.firstChild);
    }
    var title = document.title;
    if (title.indexOf(LIC.company) < 0) document.title = title + "｜" + LIC.company;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply); else apply();
})();
