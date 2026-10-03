/* 動畫互動版播放器：語音（預錄 MP3，或瀏覽器語音備援）、黑板動畫、角色動作、隨堂測驗 */
(function () {
  "use strict";

  var COURSE = window.COURSE, PS = window.PlayScript, CUES = window.AUDIO_CUES || {};
  var NEW = window.NEW_CONTROLS || [];
  var STORE = "isms27001-course-v1", PSTORE = "isms27001-play-v1";
  var TIPNAME = { consult: "顧問實務", audit: "稽核員視角", ng: "常見缺失", key: "重點" };
  var $ = function (id) { return document.getElementById(id); };

  function load(k, d) { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  var pref = load(PSTORE, { ch: null, step: 0, speed: 1, sub: true, auto: true });

  function fnv(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(t) { t = Math.max(0, Math.floor(t || 0)); var m = Math.floor(t / 60), s = t % 60; return m + ":" + (s < 10 ? "0" : "") + s; }

  var audio = new Audio(); audio.preload = "auto";
  var sfx = new Audio(); sfx.preload = "auto";
  var S = { ch: 0, steps: [], vis: [], cur: 0, mode: "audio", cues: null, playing: false, waiting: false, answered: {}, boardKey: "", stepStart: 0, stepDur: 1, token: 0, loadTok: 0, ready: false, started: false, sfxEnd: null, sfxCb: null };

  /* ---------- 章節載入 ---------- */
  function loadChapter(i, step, autoplay) {
    stopAll();
    var ch = COURSE[i];
    S.ch = i; S.steps = PS.build(ch); S.cur = 0; S.waiting = false; S.answered = {}; S.boardKey = "";
    var c = CUES[ch.id];
    var ok = c && c.cues.length === S.steps.length && c.cues.every(function (q, k) { return q[2] === fnv(S.steps[k].speak); });
    S.cues = ok ? c.cues : null;
    S.duration = ok ? c.duration : 0;
    S.mode = ok ? "audio" : ("speechSynthesis" in window ? "tts" : "silent");
    if (ok) setAudio("audio/" + ch.id + ".mp3");
    else { S.ready = false; audio.removeAttribute("src"); }

    // 每一步要在黑板上顯示的內容
    var last = null;
    S.vis = S.steps.map(function (s) {
      var v;
      if (s.type === "title") v = { key: "t" + s.sec, kind: "title", sec: s.sec, row: -1 };
      else if (s.type === "end") v = { key: "end", kind: "end", sec: s.sec, row: -1 };
      else if (s.type === "say") v = last && last.sec === s.sec ? Object.assign({}, last, { row: 999 }) : { key: "t" + s.sec, kind: "title", sec: s.sec, row: -1 };
      else v = { key: "b" + s.sec + "-" + s.block, kind: "block", sec: s.sec, block: s.block, row: s.type === "row" ? s.row : (s.type === "board" ? -1 : 999) };
      if (v.kind !== "end") last = v;
      return v;
    });

    $("chapEyebrow").textContent = ch.part + " · 單元 " + (i + 1) + " / " + COURSE.length;
    $("chapTitle").textContent = ch.title;
    $("chapSub").textContent = ch.sub;
    $("modeNote").textContent = {
      audio: "語音：講師為台灣男聲、助教為台灣小女生（預先合成之神經網路語音）。鍵盤：空白鍵播放／暫停，← → 上一句／下一句。",
      tts: "此單元使用瀏覽器內建中文語音播放，音色依裝置而異。",
      silent: "此裝置不支援語音，將以字幕動畫播放。"
    }[S.mode];
    renderTranscript(); renderTicks(); renderChapters();
    pref.ch = ch.id; store(PSTORE, pref);
    if (location.hash.slice(1) !== ch.id) history.replaceState(null, "", "#" + ch.id);
    setStep(Math.min(step || 0, S.steps.length - 1), true);
    if (autoplay) play();
  }

  /* 整檔下載成 blob 再播放：不論主機是否支援 Range 都能精準跳轉 */
  var blobURL = null;
  function setAudio(url) {
    var tok = ++S.loadTok;
    S.ready = false;
    $("timeText").textContent = "語音載入中…";
    fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(function (b) {
      if (tok !== S.loadTok) return;
      if (blobURL) URL.revokeObjectURL(blobURL);
      blobURL = URL.createObjectURL(b);
      audioReady(blobURL);
    }).catch(function () { if (tok === S.loadTok) audioReady(url); });
  }
  function audioReady(src) {
    audio.src = src; audio.playbackRate = pref.speed;
    S.ready = true; lastP = -1;
    try { audio.currentTime = S.stepStart + 0.01; } catch (e) { }
    if (S.playing && !S.waiting) { var p = audio.play(); if (p && p.catch) p.catch(function () { }); }
  }

  /* ---------- 黑板 ---------- */
  function rowsHTML(items, tag) { return "<" + tag + ' class="rows">' + items.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</" + tag + ">"; }
  function boardHTML(v) {
    var ch = COURSE[S.ch];
    if (v.kind === "title") {
      return '<div class="title-card"><div class="chap">單元 ' + (S.ch + 1) + " · " + esc(ch.title) + "</div><h2>" + esc(ch.sections[v.sec].h) + '</h2><div class="b-tag">第 ' + (v.sec + 1) + " / " + ch.sections.length + " 段</div></div>";
    }
    if (v.kind === "end") {
      var nxt = COURSE[S.ch + 1];
      return '<div class="end-card"><div class="b-tag">本章結束</div><h2>「' + esc(ch.title) + "」完成！</h2>" +
        '<div class="row">' + (nxt ? '<button class="btn small primary" data-act="next">下一章：' + esc(nxt.title) + "</button>" : "") +
        '<a class="btn small" href="index.html#quiz">前往課後測驗</a><button class="btn small" data-act="replay">重播本章</button></div></div>';
    }
    var b = ch.sections[v.sec].b[v.block];
    switch (b[0]) {
      case "p": return "<p>" + b[1] + "</p>";
      case "std": return '<div class="b-tag">標準要求</div><h3>' + b[1] + "</h3>" + rowsHTML(b[2], "ol");
      case "list": return '<div class="b-tag">重點整理</div>' + rowsHTML(b[1], "ul");
      case "tip":
        return '<div class="btip ' + b[1] + '"><div class="bt">' + TIPNAME[b[1]] + "｜" + b[2] + "</div><div>" + b[3] + "</div></div>" +
          (b[1] === "audit" ? '<div class="seal">稽核員<br>視角</div>' : "");
      case "table":
        return '<table class="btable"><thead><tr>' + b[1].map(function (h) { return "<th>" + h + "</th>"; }).join("") + '</tr></thead><tbody class="rows">' +
          b[2].map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
      case "ctrl":
        return '<div class="b-tag">附錄 A 控制措施</div><table class="btable"><thead><tr><th>編號</th><th>控制措施</th><th>要求</th></tr></thead><tbody class="rows">' +
          b[1].map(function (r) { return '<tr><td class="id">A.' + r[0] + "</td><td>" + r[1] + (NEW.indexOf(r[0]) >= 0 ? '<span class="new-chip">新增</span>' : "") + "</td><td>" + r[2] + "</td></tr>"; }).join("") + "</tbody></table>";
      case "check":
        var key = v.sec + "-" + v.block;
        return '<div class="bq"><div class="b-tag">隨堂測驗</div><h3>' + b[1] + '</h3><div class="opts">' +
          b[2].map(function (o, i) { return '<button class="opt" data-pick="' + i + '"><span class="k">' + "ABCD"[i] + "</span><span>" + o + "</span></button>"; }).join("") +
          '</div><div class="hint" id="qHint">' + (S.answered[key] != null ? "" : "請點選答案") + "</div></div>";
    }
    return "";
  }

  function renderBoard() {
    var v = S.vis[S.cur], board = $("board");
    if (v.key !== S.boardKey) {
      S.boardKey = v.key;
      board.innerHTML = '<div class="board-inner">' + boardHTML(v) + "</div>";
      board.scrollTop = 0;
    }
    var rows = board.querySelector(".rows");
    if (rows) {
      var now = null;
      Array.prototype.forEach.call(rows.children, function (el, i) {
        el.classList.toggle("now", i === v.row);
        el.classList.toggle("future", i > v.row);
        if (i === v.row) now = el;
      });
      if (now) {
        var top = now.getBoundingClientRect().top - board.getBoundingClientRect().top + board.scrollTop;
        if (top < board.scrollTop + 30 || top + now.offsetHeight > board.scrollTop + board.clientHeight - 20) board.scrollTo({ top: Math.max(0, top - 60), behavior: "smooth" });
      }
    }
    var q = board.querySelector(".bq");
    if (q) {
      var key = v.sec + "-" + v.block, b = COURSE[S.ch].sections[v.sec].b[v.block];
      var revealed = S.answered[key] != null || S.steps[S.cur].type === "exp";
      if (revealed) showAnswer(q, b, S.answered[key]);
    }
  }

  function showAnswer(q, b, pick) {
    q.querySelectorAll(".opt").forEach(function (o) {
      var i = +o.getAttribute("data-pick");
      o.disabled = true;
      o.classList.toggle("right", i === b[3]);
      o.classList.toggle("wrong", pick != null && i === pick && i !== b[3]);
    });
    var h = q.querySelector(".hint");
    if (h) h.textContent = pick == null ? "正確答案：" + "ABCD"[b[3]] : (pick === b[3] ? "答對了！" : "正確答案：" + "ABCD"[b[3]]);
  }

  /* ---------- 角色與泡泡 ---------- */
  function actors() {
    var st = S.steps[S.cur], talking = S.playing && !S.waiting && !S.sfxCb;
    ["A", "R"].forEach(function (w) {
      var el = $("actor" + w);
      el.classList.toggle("talk", talking && st.who === w);
      el.classList.toggle("quiet", st.who !== w && !(S.sfxCb && w === "R"));
    });
    if (S.sfxCb) { $("actorR").classList.add("talk"); $("actorR").classList.remove("quiet"); }
  }
  function oneShot(w, cls) {
    var el = $("actor" + w);
    el.classList.remove("hop", "shake", "nod"); void el.offsetWidth; el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, 900);
  }

  var typed = { html: "", plain: "", n: -1 };
  function setSpeech(who, html) {
    var sp = $("speech");
    sp.className = "speech " + who + (pref.sub ? "" : " nosub");
    $("speechWho").textContent = who === "A" ? "Allan 講師" : "阿拉蕾助教";
    typed = { html: html, plain: PS.plain(html), n: -1 };
    $("speechTxt").textContent = "";
  }
  function typeTo(p) {
    var n = p >= 1 ? typed.plain.length : Math.floor(typed.plain.length * Math.min(1, p * 1.12));
    if (n === typed.n) return;
    typed.n = n;
    if (n >= typed.plain.length) $("speechTxt").innerHTML = typed.html;
    else $("speechTxt").innerHTML = esc(typed.plain.slice(0, n)) + '<span class="caret"></span>';
  }

  /* ---------- 步驟控制 ---------- */
  function setStep(k, seek) {
    k = Math.max(0, Math.min(S.steps.length - 1, k));
    S.cur = k; S.waiting = false; S.token++;
    var st = S.steps[k];
    renderBoard();
    setSpeech(st.who, st.type === "row" ? st.show : (st.type === "title" ? "接下來的主題：<b>" + esc(st.show) + "</b>" : (st.type === "check" ? "隨堂小測驗！" + st.show : st.show)));
    if (st.type === "title") oneShot("R", "hop");
    if (st.type === "board" && S.vis[k].kind === "block") {
      var b = COURSE[S.ch].sections[st.sec].b[st.block];
      if (b[0] === "tip") oneShot("A", "nod");
    }
    if (S.mode === "audio") {
      S.stepStart = S.cues[k][0]; S.stepDur = S.cues[k][1] - S.cues[k][0];
      if (seek && S.ready) { try { audio.currentTime = S.stepStart + 0.01; } catch (e) { } }
    } else {
      S.stepDur = Math.max(1.2, st.speak.length * 0.24 / pref.speed);
      S.stepStart = performance.now() / 1000;
      if (S.playing) speakStep();
    }
    document.querySelectorAll(".tline.cur").forEach(function (e) { e.classList.remove("cur"); });
    var tl = document.querySelector('.tline[data-k="' + k + '"]');
    if (tl) {
      tl.classList.add("cur");
      var box = $("transcript");
      if (tl.offsetTop < box.scrollTop || tl.offsetTop > box.scrollTop + box.clientHeight - 40) box.scrollTop = tl.offsetTop - 80;
    }
    pref.step = k; store(PSTORE, pref);
    actors(); updateTime();
  }

  function stepEnded() {
    var st = S.steps[S.cur];
    typeTo(1);
    if (st.type === "check") {
      var key = st.sec + "-" + st.block;
      if (S.answered[key] == null) { S.waiting = true; pauseMedia(); var h = $("qHint"); if (h) h.textContent = "↑ 請點選答案，作答後繼續播放"; actors(); return; }
    }
    if (st.type === "end" || S.cur >= S.steps.length - 1) { chapterEnd(); return; }
    setStep(S.cur + 1, S.mode === "audio" ? false : false);
  }

  function chapterEnd() {
    pauseMedia(); S.playing = false; setPlayBtn();
    var done = load(STORE, { done: {} }); done.done = done.done || {}; done.done[COURSE[S.ch].id] = Date.now(); store(STORE, done);
    renderChapters(); actors();
    if (pref.auto && COURSE[S.ch + 1]) {
      var tok = ++S.token;
      setTimeout(function () { if (tok === S.token) loadChapter(S.ch + 1, 0, true); }, 3500);
    }
  }

  /* ---------- 媒體 ---------- */
  function pauseMedia() {
    if (S.mode === "audio") audio.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
  function stopAll() { S.token++; pauseMedia(); sfx.pause(); S.sfxCb = null; }

  function play() {
    if (S.waiting) { var h = $("qHint"); if (h) h.textContent = "↑ 請先點選答案"; return; }
    $("cover").hidden = true;
    if (!S.started) { S.started = true; setStep(S.cur, true); }
    if (S.vis[S.cur].kind === "end") { setStep(0, true); }
    S.playing = true; setPlayBtn();
    if (S.mode === "audio") {
      if (!S.ready) { actors(); return; }
      var p = audio.play();
      if (p && p.catch) p.catch(function (e) {
        if (e && e.name === "NotAllowedError") { S.playing = false; setPlayBtn(); $("cover").hidden = false; }
        else fallbackTTS();
      });
    } else speakStep();
    actors();
  }
  function pause() { S.playing = false; pauseMedia(); setPlayBtn(); actors(); }
  function setPlayBtn() { var b = $("btnPlay"); b.textContent = S.playing ? "❚❚" : "▶"; b.setAttribute("aria-label", S.playing ? "暫停" : "播放"); }

  audio.addEventListener("error", function () { if (audio.getAttribute("src") && S.ready) fallbackTTS(); });
  function fallbackTTS() {
    if (S.mode !== "audio") return;
    S.mode = "speechSynthesis" in window ? "tts" : "silent";
    audio.removeAttribute("src");
    $("modeNote").textContent = "語音檔無法載入，改用瀏覽器內建中文語音播放（音色依裝置而異）。";
    renderTicks(); setStep(S.cur, false);
    if (S.playing) speakStep();
  }

  /* 瀏覽器語音備援：盡量挑台灣中文男聲 / 女聲，助教提高音調 */
  var voices = [];
  function pickVoices() {
    if (!("speechSynthesis" in window)) return;
    var all = window.speechSynthesis.getVoices();
    var tw = all.filter(function (v) { return /zh[-_]TW/i.test(v.lang); });
    var zh = tw.length ? tw : all.filter(function (v) { return /^zh/i.test(v.lang); });
    voices = {
      A: zh.filter(function (v) { return /YunJhe|Zhiwei|male|男/i.test(v.name) && !/female/i.test(v.name); })[0] || zh[0],
      R: zh.filter(function (v) { return /HsiaoYu|HsiaoChen|Hanhan|Yating|Mei|female|女/i.test(v.name); })[0] || zh[0]
    };
  }
  if ("speechSynthesis" in window) { pickVoices(); window.speechSynthesis.onvoiceschanged = pickVoices; }

  function speakStep() {
    var tok = ++S.token, st = S.steps[S.cur];
    S.stepStart = performance.now() / 1000;
    S.stepDur = Math.max(1.2, st.speak.length * 0.24 / pref.speed);
    if (S.mode === "tts") {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(st.speak);
      u.lang = "zh-TW"; if (voices[st.who]) u.voice = voices[st.who];
      u.rate = pref.speed; u.pitch = st.who === "R" ? 1.6 : 0.85;
      u.onend = function () { if (tok === S.token && S.playing) stepEnded(); };
      u.onerror = function () { if (tok === S.token && S.playing) setTimeout(function () { if (tok === S.token) stepEnded(); }, S.stepDur * 1000); };
      window.speechSynthesis.speak(u);
    } else {
      setTimeout(function () { if (tok === S.token && S.playing) stepEnded(); }, S.stepDur * 1000);
    }
  }

  /* 測驗回饋音效（阿拉蕾） */
  var sfxURL = null;
  fetch("audio/common.mp3").then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) { if (b) sfxURL = URL.createObjectURL(b); }).catch(function () { });
  function playSfx(key, cb) {
    var c = CUES.common && CUES.common.cues[key === "right" ? 0 : 1];
    S.sfxCb = cb; actors();
    function done() { S.sfxCb = null; sfx.pause(); actors(); cb(); }
    if (!c || S.mode !== "audio") {
      if (S.mode === "tts") {
        var u = new SpeechSynthesisUtterance(key === "right" ? "答對了！好厲害喔！" : "哎呀，答錯了，聽老師解說一下吧！");
        u.lang = "zh-TW"; if (voices.R) u.voice = voices.R; u.pitch = 1.6; u.rate = pref.speed; u.onend = done; u.onerror = done;
        window.speechSynthesis.speak(u);
      } else setTimeout(done, 1200);
      return;
    }
    if (!sfx.getAttribute("src")) sfx.src = sfxURL || "audio/common.mp3";
    sfx.playbackRate = pref.speed;
    S.sfxEnd = c[1];
    try { sfx.currentTime = c[0]; } catch (e) { }
    var p = sfx.play(); if (p && p.catch) p.catch(done);
    var iv = setInterval(function () {
      if (!S.sfxCb) { clearInterval(iv); return; }
      if (sfx.currentTime >= S.sfxEnd || sfx.ended) { clearInterval(iv); done(); }
    }, 60);
  }

  function answer(pick) {
    var v = S.vis[S.cur];
    if (v.kind !== "block") return;
    var key = v.sec + "-" + v.block;
    if (S.answered[key] != null) return;
    var b = COURSE[S.ch].sections[v.sec].b[v.block];
    S.answered[key] = pick;
    showAnswer($("board").querySelector(".bq"), b, pick);
    var right = pick === b[3];
    oneShot("R", right ? "hop" : "shake");
    if (right) confetti();
    pauseMedia(); S.waiting = false;
    var tok = ++S.token;
    playSfx(right ? "right" : "wrong", function () {
      if (tok !== S.token) return;
      S.playing = true; setPlayBtn();
      setStep(S.cur + 1, true);
      if (S.mode === "audio") { var p = audio.play(); if (p && p.catch) p.catch(function () { }); }
      actors();
    });
  }

  /* 撒彩紙 */
  function confetti() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var stage = $("stage"), cv = document.createElement("canvas");
    cv.width = stage.clientWidth; cv.height = stage.clientHeight;
    cv.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:5";
    stage.appendChild(cv);
    var g = cv.getContext("2d"), cols = ["#c8102e", "#ffe27a", "#8fe3d6", "#ff9db0", "#16181d"];
    var ps = []; for (var i = 0; i < 90; i++) ps.push({ x: cv.width * .2, y: cv.height * .7, vx: Math.random() * 9 + 2, vy: -Math.random() * 12 - 6, r: Math.random() * 6.28, c: cols[i % 5], s: Math.random() * 6 + 4 });
    var t0 = performance.now();
    (function f(now) {
      g.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vy += .45; p.r += .2; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); });
      if (now - t0 < 1800) requestAnimationFrame(f); else cv.remove();
    })(t0);
  }

  /* ---------- 主迴圈（音訊模式同步） ---------- */
  function tick() {
    if (S.mode === "audio" && S.cues && S.ready) {
      var t = audio.currentTime, c = S.cues[S.cur];
      if (S.playing && !S.waiting && !S.sfxCb && !audio.paused) {
        if (t < c[0] - 0.3 || t > c[1] + 1.5) { // 外部跳轉
          var k = findStep(t); if (k !== S.cur) setStep(k, false);
        } else if (t >= c[1] - 0.03) {
          var st = S.steps[S.cur];
          if (st.type === "check" || st.type === "end" || S.cur >= S.steps.length - 1) stepEnded();
          else if (t >= S.cues[S.cur + 1][0] - 0.03) setStep(S.cur + 1, false);
          else typeTo(1);
        }
      }
      if (audio.ended && S.playing) chapterEnd();
      typeTo(S.stepDur > 0 ? (audio.currentTime - S.stepStart) / S.stepDur : 1);
    } else {
      typeTo(S.playing ? (performance.now() / 1000 - S.stepStart) * pref.speed / (S.stepDur * pref.speed) : (S.started ? 1 : 0));
    }
    updateTime();
    requestAnimationFrame(tick);
  }
  function findStep(t) { var k = 0; for (var i = 0; i < S.cues.length; i++) if (S.cues[i][0] <= t + 0.02) k = i; return k; }

  function progress() {
    if (S.mode === "audio" && S.duration) return Math.min(1, audio.currentTime / S.duration);
    return S.steps.length > 1 ? S.cur / (S.steps.length - 1) : 0;
  }
  var lastP = -1;
  function updateTime() {
    var p = progress();
    if (Math.abs(p - lastP) < 0.0005) return; lastP = p;
    $("tlFill").style.width = (p * 100) + "%";
    $("tlKnob").style.left = (p * 100) + "%";
    $("timeline").setAttribute("aria-valuenow", Math.round(p * 100));
    if (S.mode === "audio" && !S.ready) return;
    $("timeText").textContent = S.mode === "audio" ? fmt(audio.currentTime) + " / " + fmt(S.duration) : "第 " + (S.cur + 1) + " / " + S.steps.length + " 句";
  }
  function renderTicks() {
    var html = "";
    S.steps.forEach(function (s, k) {
      if (s.type !== "title" || k === 0) return;
      var p = S.mode === "audio" ? S.cues[k][0] / S.duration : k / (S.steps.length - 1);
      html += '<span class="tick" style="left:' + (p * 100) + '%" title="' + esc(s.show) + '"></span>';
    });
    $("tlTicks").innerHTML = html; lastP = -1;
  }
  function seekRatio(r) {
    r = Math.max(0, Math.min(1, r));
    var k = S.mode === "audio" ? findStep(r * S.duration) : Math.round(r * (S.steps.length - 1));
    jump(k);
  }
  function jump(k) {
    S.sfxCb = null; sfx.pause();
    var wasPlaying = S.playing || !S.started;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setStep(k, true);
    if (wasPlaying) play();
  }

  /* ---------- 字幕稿、章節列表 ---------- */
  function renderTranscript() {
    $("transcript").innerHTML = S.steps.map(function (s, k) {
      if (s.type === "title") return '<button class="tline sec R" data-k="' + k + '"><span class="tw">§' + (s.sec + 1) + "</span><span>" + esc(s.show) + "</span></button>";
      var txt = s.type === "check" ? "【隨堂測驗】" + PS.plain(s.show) : PS.plain(s.show);
      return '<button class="tline ' + s.who + '" data-k="' + k + '"><span class="tw">' + (s.who === "A" ? "Allan" : "阿拉蕾") + "</span><span>" + esc(txt) + "</span></button>";
    }).join("");
  }
  function renderChapters() {
    var done = (load(STORE, { done: {} }).done) || {};
    $("chapList").innerHTML = COURSE.map(function (c, i) {
      return '<button class="nav-item' + (done[c.id] ? " done" : "") + '" data-ch="' + i + '" aria-current="' + (i === S.ch) + '"><span class="dot">' + (done[c.id] ? "✓" : "") + "</span><span>" + esc(c.title) + "</span><small>" + (i + 1) + "</small></button>";
    }).join("");
  }

  /* ---------- 事件 ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-k],[data-ch],[data-pick],[data-act]");
    if (!t) return;
    if (t.hasAttribute("data-k")) jump(+t.getAttribute("data-k"));
    else if (t.hasAttribute("data-ch")) { loadChapter(+t.getAttribute("data-ch"), 0, S.started); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else if (t.hasAttribute("data-pick")) answer(+t.getAttribute("data-pick"));
    else if (t.getAttribute("data-act") === "next") loadChapter(S.ch + 1, 0, true);
    else if (t.getAttribute("data-act") === "replay") { loadChapter(S.ch, 0, true); }
  });
  $("coverPlay").addEventListener("click", play);
  $("btnPlay").addEventListener("click", function () { S.playing ? pause() : play(); });
  $("btnPrev").addEventListener("click", function () { jump(S.cur - 1); });
  $("btnNext").addEventListener("click", function () {
    if (S.cur >= S.steps.length - 1) { if (COURSE[S.ch + 1]) loadChapter(S.ch + 1, 0, S.playing); return; }
    jump(S.cur + 1);
  });
  $("speed").value = String(pref.speed);
  $("speed").addEventListener("change", function () {
    pref.speed = +this.value; store(PSTORE, pref);
    audio.playbackRate = pref.speed; sfx.playbackRate = pref.speed;
    if (S.mode !== "audio" && S.playing) speakStep();
  });
  function toggleBtn(id, key) {
    var b = $(id);
    function sync() { b.classList.toggle("on", pref[key]); b.setAttribute("aria-pressed", pref[key]); }
    sync();
    b.addEventListener("click", function () { pref[key] = !pref[key]; store(PSTORE, pref); sync(); if (key === "sub") $("speech").classList.toggle("nosub", !pref.sub); });
  }
  toggleBtn("btnSub", "sub"); toggleBtn("btnAuto", "auto");

  var tl = $("timeline"), dragging = false;
  function tlPos(e) { var r = tl.getBoundingClientRect(); return (e.clientX - r.left) / r.width; }
  tl.addEventListener("pointerdown", function (e) { dragging = true; tl.setPointerCapture(e.pointerId); });
  tl.addEventListener("pointerup", function (e) { if (dragging) { dragging = false; seekRatio(tlPos(e)); } });
  tl.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); jump(S.cur + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); jump(S.cur - 1); }
  });
  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea" || tag === "button" || e.target === tl) return;
    if (e.key === " ") { e.preventDefault(); S.playing ? pause() : play(); }
    else if (e.key === "ArrowRight") jump(S.cur + 1);
    else if (e.key === "ArrowLeft") jump(S.cur - 1);
  });
  window.addEventListener("hashchange", function () {
    var i = COURSE.findIndex(function (c) { return c.id === location.hash.slice(1); });
    if (i >= 0 && i !== S.ch) loadChapter(i, 0, S.started);
  });

  /* ---------- 啟動 ---------- */
  var start = COURSE.findIndex(function (c) { return c.id === location.hash.slice(1); });
  var resume = start < 0 ? COURSE.findIndex(function (c) { return c.id === pref.ch; }) : -1;
  if (start < 0) start = resume >= 0 ? resume : 0;
  loadChapter(start, resume === start ? pref.step : 0, false);
  if (resume === start && pref.step > 0) {
    $("coverTitle").textContent = "歡迎回來！";
    $("coverText").textContent = "上次看到「" + COURSE[start].title + "」第 " + (pref.step + 1) + " 句，按下播放繼續上課。也可以從下方選擇其他章節。";
  }
  setSpeech("R", "哦嗨喲～我是助教阿拉蕾！按下播放鍵，我們就開始上課囉！");
  typeTo(1);
  requestAnimationFrame(tick);
})();
