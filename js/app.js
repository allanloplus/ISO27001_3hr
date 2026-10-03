/* ISMS 線上課程主程式：路由、章節渲染、進度、課後測驗、證書 */
(function () {
  "use strict";

  var COURSE = window.COURSE;
  var QUIZ = window.QUIZ;
  var NEW = window.NEW_CONTROLS || [];
  var IMG = { A: "assets/allan.webp", R: "assets/arale.webp", duo: "assets/duo.webp" };
  var NAME = { A: "Allan 講師", R: "阿拉蕾助教" };
  var TIP = { consult: "顧問實務", audit: "稽核員視角", ng: "常見缺失", key: "重點" };
  var COURSE_TITLE = "ISMS 標準簡介：ISO/IEC 27001:2022 線上課程";
  var STORE = "isms27001-course-v1";

  var $main = document.getElementById("main");
  var $side = document.getElementById("side");

  /* ---------- 儲存（瀏覽器本機，失敗時不影響使用） ---------- */
  var state = { done: {}, passed: null };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved) state = Object.assign(state, saved);
  } catch (e) { /* 無法讀取時使用預設 */ }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { } }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function chapterIndex(id) { for (var i = 0; i < COURSE.length; i++) if (COURSE[i].id === id) return i; return -1; }
  function totalMins() { return COURSE.reduce(function (s, c) { return s + c.mins; }, 0); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- 側欄與進度 ---------- */
  function renderSide(current) {
    var html = "", lastPart = "";
    COURSE.forEach(function (c, i) {
      if (c.part !== lastPart) { html += "<h4>" + esc(c.part) + "</h4>"; lastPart = c.part; }
      html += '<button class="nav-item' + (state.done[c.id] ? " done" : "") + '" data-go="c-' + c.id + '" aria-current="' + (current === c.id) + '">' +
        '<span class="dot">' + (state.done[c.id] ? "✓" : "") + "</span><span>" + esc(c.title) + "</span><small>" + c.mins + "′</small></button>";
    });
    html += '<button class="nav-item nav-quiz" data-go="quiz" aria-current="' + (current === "quiz") + '"><span class="dot">' + (state.passed ? "✓" : "?") + "</span><span>課後測驗與結業證書</span><small>10 題</small></button>";
    $side.innerHTML = html;
    var n = Object.keys(state.done).filter(function (k) { return chapterIndex(k) >= 0; }).length;
    document.getElementById("progressText").textContent = n + " / " + COURSE.length + " 章";
    document.getElementById("progressBar").style.width = (n / COURSE.length * 100) + "%";
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-go]");
    if (t) { e.preventDefault(); go(t.getAttribute("data-go")); }
  });
  var $menu = document.getElementById("menuBtn");
  $menu.addEventListener("click", function () {
    var open = document.body.classList.toggle("nav-open");
    $menu.setAttribute("aria-expanded", open);
  });

  function go(route) {
    document.body.classList.remove("nav-open");
    $menu.setAttribute("aria-expanded", "false");
    if (location.hash !== "#" + route) { location.hash = route; } else { route_(); }
  }
  function route_() {
    var h = (location.hash || "#home").slice(1);
    if (h.indexOf("c-") === 0 && chapterIndex(h.slice(2)) >= 0) renderChapter(h.slice(2));
    else if (h === "quiz") renderQuiz();
    else renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route_);

  /* ---------- 首頁 ---------- */
  function renderHome() {
    renderSide("home");
    var next = COURSE.filter(function (c) { return !state.done[c.id]; })[0] || COURSE[0];
    var cards = COURSE.map(function (c, i) {
      return '<button class="card' + (state.done[c.id] ? " done" : "") + '" data-go="c-' + c.id + '">' +
        '<div class="meta"><span class="tag">' + esc(c.part) + '</span><span class="mono">' + c.mins + " 分鐘</span></div>" +
        "<h3>" + esc(c.title) + "</h3><p>" + esc(c.sub) + "</p></button>";
    }).join("");
    $main.innerHTML =
      '<div class="wrap">' +
      '<section class="hero">' +
      '<figure class="who" style="margin:0"><figcaption>助教 阿拉蕾</figcaption><img src="' + IMG.R + '" alt="助教阿拉蕾半身像" width="170"></figure>' +
      '<div class="copy"><div class="eyebrow">ISO/IEC 27001:2022 · CNS 27001:2023</div>' +
      "<h1>資訊安全管理系統<br>標準簡介線上課</h1>" +
      "<p>從條文要求到輔導與驗證現場，Allan 講師帶你讀懂 ISO 27001 的每一章，助教阿拉蕾幫你把重點問清楚。</p>" +
      '<div class="stats"><span><b>' + COURSE.length + "</b> 章</span><span><b>93</b> 項控制措施</span><span>約 <b>" + Math.round(totalMins() / 60 * 10) / 10 + "</b> 小時</span><span><b>10</b> 題課後測驗</span></div>" +
      '<div class="row"><button class="btn primary" data-go="c-' + next.id + '">' + (Object.keys(state.done).length ? "繼續上課：" + esc(next.title) : "開始上課") + '</button><button class="btn" data-go="quiz">課後測驗</button></div></div>' +
      '<figure class="who" style="margin:0"><figcaption>講師 Allan Lo 羅宇倫</figcaption><img src="' + IMG.A + '" alt="Allan 講師半身像" width="220"></figure>' +
      "</section>" +
      '<div class="section-title"><h2>選擇章節</h2><span class="note">可依需要跳讀，看完每章請按「標記本章已讀」。</span></div>' +
      '<div class="grid-cards">' + cards + "</div></div>";
  }

  /* ---------- 章節 ---------- */
  function block(b, key) {
    switch (b[0]) {
      case "A": case "R":
        return '<div class="say ' + b[0] + '"><div class="face"><img src="' + IMG[b[0]] + '" alt=""><b>' + (b[0] === "A" ? "Allan" : "阿拉蕾") + '</b></div><div class="bubble" aria-label="' + NAME[b[0]] + '">' + b[1] + "</div></div>";
      case "p": return '<p class="p">' + b[1] + "</p>";
      case "list": return '<ul class="list">' + b[1].map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
      case "std":
        return '<div class="std"><header><span class="lbl">標準要求</span>' + b[1] + "</header><ol>" + b[2].map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ol></div>";
      case "tip":
        var face = b[1] === "consult" || b[1] === "audit" ? '<img src="' + IMG.A + '" alt="">' : "";
        return '<div class="tip ' + b[1] + '"><div class="t">' + face + '<span class="lbl">' + TIP[b[1]] + "</span>" + b[2] + '</div><div class="body">' + b[3] + "</div></div>";
      case "table":
        return '<div class="tbl"><table><thead><tr>' + b[1].map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr></thead><tbody>" +
          b[2].map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
      case "ctrl":
        return '<div class="tbl ctrl"><table><thead><tr><th>編號</th><th>控制措施</th><th>要求</th></tr></thead><tbody>' +
          b[1].map(function (r) {
            return "<tr><td>A." + r[0] + "</td><td><b>" + r[1] + "</b>" + (NEW.indexOf(r[0]) >= 0 ? '<span class="chip">2022 新增</span>' : "") + "</td><td>" + r[2] + "</td></tr>";
          }).join("") + "</tbody></table></div>";
      case "check":
        return '<div class="check" data-check="' + key + '"><div class="q"><span class="lbl">隨堂測驗</span><span>' + b[1] + '</span></div><div class="opts">' +
          b[2].map(function (o, i) { return '<button class="opt" data-ans="' + i + '"><span class="k">' + "ABCD"[i] + "</span><span>" + o + "</span></button>"; }).join("") +
          '</div><div class="exp" hidden></div></div>';
    }
    return "";
  }

  var checks = {};
  function renderChapter(id) {
    var i = chapterIndex(id), c = COURSE[i];
    renderSide(id);
    checks = {};
    var toc = c.sections.map(function (s, k) { return '<a href="#c-' + id + '" data-sec="s' + k + '">' + esc(s.h) + "</a>"; }).join("");
    var body = c.sections.map(function (s, k) {
      return '<section class="sec" id="s' + k + '"><h2><span class="no">' + (k + 1) + "</span>" + esc(s.h) + "</h2>" +
        s.b.map(function (b, j) {
          var key = id + "-" + k + "-" + j;
          if (b[0] === "check") checks[key] = b;
          return block(b, key);
        }).join("") + "</section>";
    }).join("");
    var prev = COURSE[i - 1], nxt = COURSE[i + 1];
    $main.innerHTML = '<article class="wrap">' +
      '<header class="chapter-head"><div class="eyebrow">' + esc(c.part) + " · 單元 " + (i + 1) + " / " + COURSE.length + " · 約 " + c.mins + " 分鐘</div><h1>" + esc(c.title) + "</h1><p>" + esc(c.sub) + '</p><nav class="toc" aria-label="本章小節">' + toc + "</nav></header>" +
      body +
      '<div class="row"><button class="btn ' + (state.done[id] ? "" : "primary") + '" id="markDone">' + (state.done[id] ? "✓ 本章已讀（點擊取消）" : "標記本章已讀") + "</button></div>" +
      '<nav class="pager">' +
      (prev ? '<button class="btn small" data-go="c-' + prev.id + '">← ' + esc(prev.title) + "</button>" : '<button class="btn small" data-go="home">← 課程首頁</button>') +
      (nxt ? '<button class="btn small primary" data-go="c-' + nxt.id + '">' + esc(nxt.title) + " →</button>" : '<button class="btn small primary" data-go="quiz">前往課後測驗 →</button>') +
      "</nav></article>";

    document.getElementById("markDone").addEventListener("click", function () {
      if (state.done[id]) delete state.done[id]; else state.done[id] = Date.now();
      save(); renderChapter(id);
    });
    $main.querySelectorAll("[data-sec]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        document.getElementById(a.getAttribute("data-sec")).scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    $main.querySelectorAll(".check").forEach(function (box) {
      var b = checks[box.getAttribute("data-check")];
      box.querySelectorAll(".opt").forEach(function (o) {
        o.addEventListener("click", function () {
          var pick = +o.getAttribute("data-ans");
          box.querySelectorAll(".opt").forEach(function (x) {
            var k = +x.getAttribute("data-ans");
            x.classList.remove("right", "wrong");
            if (k === b[3]) x.classList.add("right");
            else if (k === pick) x.classList.add("wrong");
          });
          var ex = box.querySelector(".exp");
          ex.hidden = false;
          ex.innerHTML = (pick === b[3] ? '<b class="ok">答對了！</b> ' : '<b class="no">再想想～正解是 ' + "ABCD"[b[3]] + "。</b> ") + b[4];
        });
      });
    });
  }

  /* ---------- 課後測驗 ---------- */
  var attempt = null; // { order:[{qi, opts:[原始索引...]}], picks:{} }

  function newAttempt() {
    attempt = {
      order: shuffle(QUIZ.questions.map(function (_, i) { return i; })).map(function (qi) {
        return { qi: qi, opts: shuffle([0, 1, 2, 3]) };
      }),
      picks: {}
    };
  }

  function renderQuiz() {
    renderSide("quiz");
    if (state.pending) return renderInfoForm();
    if (state.passed && !attempt) return renderPassed();
    if (!attempt || attempt.result) newAttempt();
    var unread = COURSE.filter(function (c) { return !state.done[c.id]; });
    var qs = attempt.order.map(function (o, n) {
      var Q = QUIZ.questions[o.qi];
      return '<div class="qcard" data-n="' + n + '"><div class="qn">第 ' + (n + 1) + " 題 / 共 10 題</div><div class=\"qq\">" + Q.q + '</div><div class="opts">' +
        o.opts.map(function (oi, k) {
          return '<button class="opt' + (attempt.picks[n] === oi ? " sel" : "") + '" data-n="' + n + '" data-o="' + oi + '"><span class="k">' + "ABCD"[k] + "</span><span>" + Q.opts[oi] + "</span></button>";
        }).join("") + "</div></div>";
    }).join("");
    $main.innerHTML = '<div class="wrap">' +
      '<section class="quiz-intro"><img src="' + IMG.R + '" alt="助教阿拉蕾" width="120"><div><div class="eyebrow">課後測驗</div><h1 style="font-size:1.6rem">ISO 27001:2022 課後測驗</h1>' +
      '<p class="p">共 10 題單選，答對 <b>8 題（80 分）</b>以上即通過，可填寫資料並下載結業證書與題目解答。未通過可重新閱讀課程後再測驗，每次題目與選項順序會重新排列。</p>' +
      (unread.length ? '<p class="note">提醒：你還有 ' + unread.length + " 章未標記已讀，建議先讀完再作答。</p>" : "") +
      "</div></section>" +
      '<div class="say R"><div class="face"><img src="' + IMG.R + '" alt=""><b>阿拉蕾</b></div><div class="bubble">加油加油！仔細看題目喔，「不是」、「新增」這種字眼最容易看錯～</div></div>' +
      qs +
      '<div class="row"><button class="btn primary" id="submitQuiz">交卷</button><span class="note" id="quizHint">已作答 0 / 10 題</span></div></div>';

    function updateHint() {
      var n = Object.keys(attempt.picks).length;
      document.getElementById("quizHint").textContent = "已作答 " + n + " / 10 題" + (n < 10 ? "，請完成所有題目後交卷" : "");
    }
    updateHint();
    $main.querySelectorAll(".qcard .opt").forEach(function (b) {
      b.addEventListener("click", function () {
        var n = +b.getAttribute("data-n");
        attempt.picks[n] = +b.getAttribute("data-o");
        b.parentNode.querySelectorAll(".opt").forEach(function (x) { x.classList.toggle("sel", x === b); });
        updateHint();
      });
    });
    document.getElementById("submitQuiz").addEventListener("click", function () {
      var missing = attempt.order.map(function (_, n) { return n; }).filter(function (n) { return !(n in attempt.picks); });
      if (missing.length) {
        var card = $main.querySelector('.qcard[data-n="' + missing[0] + '"]');
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById("quizHint").textContent = "還有 " + missing.length + " 題未作答（第 " + missing.map(function (n) { return n + 1; }).join("、") + " 題）";
        return;
      }
      grade();
    });
  }

  function grade() {
    var correct = 0, wrongRefs = {};
    attempt.order.forEach(function (o, n) {
      var Q = QUIZ.questions[o.qi];
      if (attempt.picks[n] === Q.a) correct++; else wrongRefs[Q.ref] = true;
    });
    var score = correct * 10;
    attempt.result = { score: score, correct: correct };
    if (score >= QUIZ.passScore) {
      state.pending = { score: score, picks: attempt.order.map(function (o, n) { return [o.qi, attempt.picks[n]]; }), at: Date.now() };
      save();
      renderInfoForm();
    } else {
      renderFail(score, Object.keys(wrongRefs));
    }
    window.scrollTo(0, 0);
  }

  function renderFail(score, refs) {
    var links = refs.map(function (r) { var c = COURSE[chapterIndex(r)]; return c ? '<button class="btn small" data-go="c-' + c.id + '">' + esc(c.title) + "</button>" : ""; }).join("");
    $main.innerHTML = '<div class="wrap">' +
      '<section class="result fail"><img src="' + IMG.R + '" alt="助教阿拉蕾" width="110"><div><div class="eyebrow">測驗結果</div><h2>未通過，再挑戰一次！</h2>' +
      '<div class="row" style="margin-top:6px"><span class="score">' + score + '</span><span class="note">分（通過標準 ' + QUIZ.passScore + " 分，答對 " + attempt.result.correct + " / 10 題）</span></div></div></section>" +
      '<div class="say R"><div class="face"><img src="' + IMG.R + '" alt=""><b>阿拉蕾</b></div><div class="bubble">哎呀～差一點點！我們先回去把下面這幾章再讀一遍，再來重新測驗吧！</div></div>' +
      '<div class="say A"><div class="face"><img src="' + IMG.A + '" alt=""><b>Allan</b></div><div class="bubble">稽核員也不是一次就考過 LA 的。為了讓測驗有意義，未通過時不公布正解，<b>請先重新閱讀建議章節</b>，再回來重新測驗。</div></div>' +
      '<section class="form"><h2 style="font-size:1.15rem">建議重新閱讀的章節</h2><div class="review-list">' + links + "</div></section>" +
      '<div class="row"><button class="btn" data-go="c-' + (refs[0] || COURSE[0].id) + '">重新閱讀課程</button><button class="btn primary" id="retake">重新測驗</button></div></div>';
    document.getElementById("retake").addEventListener("click", function () { attempt = null; renderQuiz(); window.scrollTo(0, 0); });
  }

  /* ---------- 通過：填寫資料 ---------- */
  var FIELDS = [
    ["company", "公司名稱", "organization", "例：〇〇科技股份有限公司"],
    ["dept", "單位", "organization-title", "例：資訊處 資安課"],
    ["name", "姓名", "name", "例：王小明"],
    ["title", "職稱", "organization-title", "例：資安工程師"],
    ["email", "E-mail", "email", "例：name@company.com.tw"]
  ];

  function renderInfoForm() {
    var p = state.pending;
    var prev = (state.passed && state.passed.info) || {};
    $main.innerHTML = '<div class="wrap">' +
      '<section class="result pass"><img src="' + IMG.A + '" alt="Allan 講師" width="110"><div><div class="eyebrow">測驗結果</div><h2>恭喜通過！</h2>' +
      '<div class="row" style="margin-top:6px"><span class="score">' + p.score + '</span><span class="note">分（答對 ' + (p.score / 10) + " / 10 題）</span></div></div></section>" +
      '<div class="say A"><div class="face"><img src="' + IMG.A + '" alt=""><b>Allan</b></div><div class="bubble">做得好！請填寫下面的資料，系統會產生你的<b>結業證書</b>，並附上測驗題目與解答。</div></div>' +
      '<form class="form" id="infoForm" novalidate><h2 style="font-size:1.15rem">通過人員資料（皆為必填）</h2><div class="fgrid">' +
      FIELDS.map(function (f) {
        return '<div class="field"><label for="f-' + f[0] + '">' + f[1] + " <i>*</i></label>" +
          '<input id="f-' + f[0] + '" name="' + f[0] + '" type="' + (f[0] === "email" ? "email" : "text") + '" autocomplete="' + f[2] + '" placeholder="' + f[3] + '" value="' + esc(prev[f[0]] || "") + '" maxlength="60" required>' +
          '<div class="err" id="e-' + f[0] + '"></div></div>';
      }).join("") +
      '</div><p class="note">資料僅用於產生證書，儲存在你自己的瀏覽器中，不會上傳到任何伺服器。</p><div class="row"><button class="btn primary" type="submit">產生結業證書</button></div></form></div>';

    document.getElementById("infoForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var info = {}, ok = true;
      FIELDS.forEach(function (f) {
        var inp = document.getElementById("f-" + f[0]);
        var v = inp.value.trim(), msg = "";
        if (!v) msg = "請填寫" + f[1];
        else if (f[0] === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = "E-mail 格式不正確，例如 name@company.com";
        document.getElementById("e-" + f[0]).textContent = msg;
        inp.setAttribute("aria-invalid", msg ? "true" : "false");
        if (msg && ok) { inp.focus(); ok = false; }
        info[f[0]] = v;
      });
      if (!ok) return;
      var d = new Date(p.at);
      var no = "ISMS-" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
      state.passed = { info: info, score: p.score, picks: p.picks, at: p.at, no: no };
      delete state.pending;
      save();
      attempt = null;
      renderPassed();
      window.scrollTo(0, 0);
    });
  }

  /* ---------- 證書與題解 ---------- */
  function fmtDate(t) { var d = new Date(t); return d.getFullYear() + " 年 " + (d.getMonth() + 1) + " 月 " + d.getDate() + " 日"; }

  function loadImg(src) {
    return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; });
  }

  function drawCertificate(P) {
    var W = 1754, H = 1240;
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var g = cv.getContext("2d");
    var info = P.info;
    var text = "結業證書CertificateofCompletion茲證明貴單位職稱完成課程並通過課後測驗特此證明講師顧問證書編號日期成績分" + COURSE_TITLE + info.company + info.dept + info.name + info.title + "0123456789年月日AllanLo羅宇倫ISMS資訊安全管理系統通過";
    var fontsReady = document.fonts && document.fonts.load ? Promise.all([
      document.fonts.load('900 60px "Noto Serif TC"', text),
      document.fonts.load('700 30px "Noto Sans TC"', text),
      document.fonts.load('400 30px "Noto Sans TC"', text),
      document.fonts.load('400 40px "LXGW WenKai TC"', text)
    ]).catch(function () { }) : Promise.resolve();

    return Promise.all([fontsReady, loadImg(IMG.A), loadImg(IMG.R)]).then(function (r) {
      var imA = r[1], imR = r[2];
      var SERIF = '"Noto Serif TC", "Songti TC", serif', SANS = '"Noto Sans TC", "Microsoft JhengHei", sans-serif', HAND = '"LXGW WenKai TC", "Noto Sans TC", sans-serif';
      var RED = "#c8102e", INK = "#16181d";
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
      // 網點底紋
      g.fillStyle = "rgba(22,24,29,0.05)";
      for (var y = 0; y < H; y += 16) for (var x = (y / 16) % 2 ? 8 : 0; x < W; x += 16) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
      // 外框
      g.fillStyle = "#ffffff"; g.fillRect(60, 60, W - 120, H - 120);
      g.strokeStyle = INK; g.lineWidth = 8; g.strokeRect(50, 50, W - 100, H - 100);
      g.lineWidth = 2; g.strokeRect(72, 72, W - 144, H - 144);
      g.fillStyle = RED; g.fillRect(72, 72, W - 144, 14);

      // 人物（左：阿拉蕾，右：Allan），半身
      function portrait(im, x, y, w, h) {
        if (!im) return;
        g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
        var s = Math.max(w / im.width, h / im.height);
        g.drawImage(im, x + (w - im.width * s) / 2, y, im.width * s, im.height * s);
        g.restore();
        g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(x, y, w, h);
      }
      portrait(imR, 110, H - 470, 250, 360);
      portrait(imA, W - 360, H - 470, 250, 360);
      g.fillStyle = INK; g.font = "26px " + HAND; g.textAlign = "center";
      g.fillText("助教 阿拉蕾", 235, H - 488);
      g.fillText("講師 Allan Lo", W - 235, H - 488);

      g.textAlign = "center";
      g.fillStyle = RED; g.font = "700 28px " + SANS;
      g.fillText("C E R T I F I C A T E   O F   C O M P L E T I O N", W / 2, 175);
      g.fillStyle = INK; g.font = "900 96px " + SERIF;
      g.fillText("結 業 證 書", W / 2, 290);

      g.font = "400 32px " + SANS; g.fillStyle = "#5a6170";
      g.fillText("茲證明", W / 2, 375);

      function fit(txt, font, size, maxW) { var s = size; do { g.font = font.replace("{s}", s); s -= 2; } while (g.measureText(txt).width > maxW && s > 18); }
      g.fillStyle = INK;
      fit(info.name, "900 {s}px " + SERIF, 84, 900);
      g.fillText(info.name, W / 2, 475);
      g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 330, 500); g.lineTo(W / 2 + 330, 500); g.stroke();

      var line2 = info.company + "　" + info.dept + "　" + info.title;
      g.fillStyle = "#3a3f4a"; fit(line2, "500 {s}px " + SANS, 34, 1000);
      g.fillText(line2, W / 2, 560);

      g.fillStyle = INK; g.font = "400 32px " + SANS;
      g.fillText("已完成線上課程", W / 2, 640);
      g.font = "700 40px " + SERIF; fit("「" + COURSE_TITLE + "」", "700 {s}px " + SERIF, 40, 1000);
      g.fillText("「" + COURSE_TITLE + "」", W / 2, 700);
      g.font = "400 32px " + SANS;
      g.fillText("並通過課後測驗（成績 " + P.score + " 分），特此證明。", W / 2, 760);

      // 簽名欄
      g.textAlign = "left"; g.font = "400 24px " + SANS; g.fillStyle = "#5a6170";
      var bx = 430;
      g.fillText("證書編號", bx, 880); g.fillText("發證日期", bx, 935);
      g.fillStyle = INK; g.font = "700 26px " + '"JetBrains Mono", monospace';
      g.fillText(P.no, bx + 130, 880);
      g.font = "500 26px " + SANS; g.fillText(fmtDate(P.at), bx + 130, 935);
      g.textAlign = "center";
      g.font = "400 46px " + HAND; g.fillStyle = INK; g.fillText("Allan Lo 羅宇倫", 1090, 900);
      g.lineWidth = 1.5; g.beginPath(); g.moveTo(950, 915); g.lineTo(1230, 915); g.stroke();
      g.font = "400 22px " + SANS; g.fillStyle = "#5a6170"; g.fillText("授課講師 / ISMS 輔導顧問", 1090, 948);

      // 印章
      g.save(); g.translate(1290, 1010); g.rotate(-0.18);
      g.strokeStyle = RED; g.fillStyle = RED; g.globalAlpha = 0.85;
      g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 62, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 52, 0, Math.PI * 2); g.stroke();
      g.font = "900 24px " + SERIF; g.fillText("ISMS", 0, -8);
      g.font = "900 28px " + SERIF; g.fillText("通 過", 0, 26);
      g.restore();

      g.textAlign = "center"; g.font = "400 20px " + SANS; g.fillStyle = "#8a909c";
      g.fillText("本證書依 ISO/IEC 27001:2022（含 Amd 1:2024）課程內容核發，僅證明完成課程訓練，非 ISMS 驗證證書。", W / 2, H - 100);
      return cv.toDataURL("image/png");
    });
  }

  function answerRows(P) {
    return P.picks.map(function (pk, n) {
      var Q = QUIZ.questions[pk[0]];
      return { n: n + 1, q: Q.q, opts: Q.opts, a: Q.a, mine: pk[1], exp: Q.exp };
    });
  }

  function answerSheetHTML(P, certURL) {
    var rows = answerRows(P);
    var info = P.info;
    var body = rows.map(function (r) {
      return '<div class="q"><p><b>' + r.n + ". " + esc(r.q) + "</b></p><ol>" + r.opts.map(function (o, i) {
        var cls = i === r.a ? "c" : (i === r.mine ? "w" : "");
        return '<li class="' + cls + '">' + esc(o) + (i === r.a ? "　✔ 正解" : "") + (i === r.mine && i !== r.a ? "　✘ 您的作答" : "") + "</li>";
      }).join("") + "</ol><p class=\"e\">解說：" + esc(r.exp) + "</p></div>";
    }).join("");
    return '<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><title>課後測驗題目與解答－' + esc(info.name) + "</title>" +
      "<style>body{font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;max-width:880px;margin:24px auto;padding:0 16px;color:#16181d;line-height:1.7}" +
      "img{width:100%;border:1px solid #ccc}h1{font-size:22px}table{border-collapse:collapse;margin:12px 0}td{border:1px solid #ccc;padding:4px 10px}" +
      ".q{border-top:1px solid #ddd;padding-top:8px;page-break-inside:avoid}ol{list-style:upper-alpha}.c{color:#157a3c;font-weight:700}.w{color:#c8102e}.e{background:#f4f5f7;padding:6px 10px;border-radius:6px}</style></head><body>" +
      (certURL ? '<img src="' + certURL + '" alt="結業證書">' : "") +
      "<h1>" + esc(COURSE_TITLE) + "－課後測驗題目與解答</h1><table>" +
      "<tr><td>公司名稱</td><td>" + esc(info.company) + "</td></tr><tr><td>單位</td><td>" + esc(info.dept) + "</td></tr><tr><td>姓名</td><td>" + esc(info.name) + "</td></tr>" +
      "<tr><td>職稱</td><td>" + esc(info.title) + "</td></tr><tr><td>E-mail</td><td>" + esc(info.email) + "</td></tr><tr><td>成績</td><td>" + P.score + " 分</td></tr>" +
      "<tr><td>證書編號</td><td>" + esc(P.no) + "</td></tr><tr><td>日期</td><td>" + fmtDate(P.at) + "</td></tr></table>" + body + "</body></html>";
  }

  function download(name, url) {
    var a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); }, 0);
  }

  function renderPassed() {
    var P = state.passed, info = P.info;
    renderSide("quiz");
    var rows = answerRows(P);
    $main.innerHTML = '<div class="wrap">' +
      '<section class="result pass"><img src="' + IMG.A + '" alt="Allan 講師" width="110"><div><div class="eyebrow">已通過課後測驗</div><h2>恭喜 ' + esc(info.name) + "，完成課程！</h2>" +
      '<div class="row" style="margin-top:6px"><span class="score">' + P.score + '</span><span class="note">分 · 證書編號 <span class="mono">' + esc(P.no) + "</span></span></div></div></section>" +
      '<div class="say R"><div class="face"><img src="' + IMG.R + '" alt=""><b>阿拉蕾</b></div><div class="bubble">んちゃ！證書做好了～記得下載保存喔！題目和解答也附在下面了！</div></div>' +
      '<section class="cert-box"><div class="section-title"><h2>結業證書</h2><span class="note">' + esc(info.company) + " · " + esc(info.dept) + " · " + esc(info.title) + " · " + esc(info.email) + "</span></div>" +
      '<img id="certImg" alt="結業證書（產生中…）">' +
      '<div class="row"><button class="btn primary" id="dlCert" disabled>下載證書（PNG）</button><button class="btn" id="dlSheet" disabled>下載證書＋題目解答（HTML）</button><button class="btn" id="printBtn" disabled>列印 / 另存 PDF</button></div>' +
      '<p class="note" id="dlNote">若下載按鈕在你的瀏覽環境無反應，可在證書圖片上按右鍵（手機長按）另存圖片。</p></section>' +
      '<section class="answers"><h2 style="font-size:1.3rem">測驗題目與解答</h2>' +
      rows.map(function (r) {
        return '<div class="ans"><div class="qq">' + r.n + ". " + r.q + "</div><ol>" + r.opts.map(function (o, i) {
          return '<li class="' + (i === r.a ? "correct " : "") + (i === r.mine ? "mine" : "") + '">' + o + (i === r.a ? "　✔" : "") + "</li>";
        }).join("") + '</ol><div class="exp">' + r.exp + "</div></div>";
      }).join("") + "</section>" +
      '<div class="row"><button class="btn" id="redo">重新測驗（更換證書資料）</button><button class="btn" data-go="home">回課程首頁</button></div></div>';

    var certURL = null;
    drawCertificate(P).then(function (url) {
      certURL = url;
      var img = document.getElementById("certImg");
      if (!img) return;
      img.src = url; img.alt = "結業證書：" + info.name;
      ["dlCert", "dlSheet", "printBtn"].forEach(function (id) { document.getElementById(id).disabled = false; });
      var pa = document.getElementById("printArea");
      pa.innerHTML = '<img src="' + url + '" alt="">' + "<h2>" + esc(COURSE_TITLE) + "－課後測驗題目與解答（" + esc(info.name) + "）</h2>" +
        rows.map(function (r) {
          return '<div class="pq"><b>' + r.n + ". " + r.q + "</b><br>" + r.opts.map(function (o, i) { return "ABCD"[i] + ". " + o + (i === r.a ? " ✔" : ""); }).join("<br>") + "<br><i>解說：" + r.exp + "</i></div>";
        }).join("");
    });
    document.getElementById("dlCert").addEventListener("click", function () {
      if (certURL) download("ISMS結業證書_" + info.name + ".png", certURL);
    });
    document.getElementById("dlSheet").addEventListener("click", function () {
      var blob = new Blob([answerSheetHTML(P, certURL)], { type: "text/html;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      download("ISMS課後測驗_題目與解答_" + info.name + ".html", url);
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    });
    document.getElementById("printBtn").addEventListener("click", function () { window.print(); });
    document.getElementById("redo").addEventListener("click", function () { attempt = null; state.passed = null; save(); renderQuiz(); window.scrollTo(0, 0); });
  }

  route_();
})();
