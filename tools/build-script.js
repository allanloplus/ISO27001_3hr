// 由課程內容產生動畫版語音腳本：node tools/build-script.js > tools/script.json
const vm = require("vm"), fs = require("fs"), path = require("path");
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ["content-1.js", "content-2.js", "content-3.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "../js", f), "utf8"), ctx);
const PS = require("../js/play-script.js");
const out = { common: PS.COMMON, chapters: ctx.window.COURSE.map(c => ({ id: c.id, steps: PS.build(c).map(s => ({ who: s.who, speak: s.speak })) })) };
process.stdout.write(JSON.stringify(out));
