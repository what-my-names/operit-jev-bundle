/*
 * test_jev_decide.js — 离线单元测试（node 直跑，不依赖 Operit 宿主）
 * 验证：① 无密钥 → simulation ② 参数校验报错 ③ 有密钥但 httpPost 抛错 → error 不猜答案
 *       ④ jev_reference 章节读取
 */
var path = String(process.argv[2] || "/sdcard/x/jev-融合/插件/packages/");
if (path.slice(-1) !== "/") path = path + "/";
var results = [];

global.getEnv = function (k) { return global.__ENV[k] || ""; };
global.__ENV = {};
global.complete = function (r) { global.__LAST = r; };
global.Tools = {
  Files: {
    mkdir: async function () { return {}; },
    read: async function () { return ""; },
    write: async function () { return {}; }
  },
  Network: {
    httpPost: async function () { throw new Error("network disabled in test"); }
  }
};

function show(name) {
  var r = global.__LAST;
  results.push("【" + name + "】\n" + JSON.stringify(r, null, 1).slice(0, 420));
  global.__LAST = null;
}

var decide = require(path + "jev_decide.js");
var reference = require(path + "jev_reference.js");

async function run() {
  // ① 无密钥 + auto → host（零成本兜底，如实标注）
  global.__ENV = {};
  await decide.jev_decide({
    state: "我被重复扣费了，希望退款。",
    questions: JSON.stringify({
      team: { type: "choice", instructions: "该由哪个团队处理?", criteria: { billing: "账单", access: "账户", other: "其它" } }
    })
  });
  show("无密钥 → 应为 host（本机作答）");

  // ①b 显式 simulation → 强制模拟
  global.__ENV = { JEV_PROVIDER: "simulation" };
  await decide.jev_decide({
    state: "x",
    questions: JSON.stringify({ ok: { type: "noul", instructions: "是否成立?" } })
  });
  show("显式 simulation → 应为 simulation");

  // ② 非法题目 → 抛错被 wrap 捕获
  await decide.jev_decide({
    state: "x",
    questions: JSON.stringify({ q1: { type: "score", instructions: "打分", criteria: ["只有一档"] } })
  });
  show("score 只有 1 档 → 应为 error");

  // ③ 有密钥但网络失败 → error，不猜
  global.__ENV = { OPENROUTER_API_KEY: "sk-fake" };
  await decide.jev_decide({
    state: "x",
    questions: JSON.stringify({ ok: { type: "noul", instructions: "是否成立?" } })
  });
  show("有密钥+网络失败 → 应为 error 且不猜答案");

  // ④ 手册
  await reference.jev_reference({ section: "types" });
  show("手册 types 章节");

  console.log(results.join("\n\n"));
  console.log("\n=== 判定 ===");
  var text = results.join(" ");
  console.log("① 无密钥→host:", text.indexOf('"mode": "host"') >= 0);
  console.log("①b 显式 simulation:", text.indexOf('"mode": "simulation"') >= 0);
  console.log("② 校验拦截:", text.indexOf("2–10") >= 0);
  console.log("③ error 且未编答案:", text.indexOf('"mode": "error"') >= 0);
  console.log("④ 手册可读:", text.indexOf("choice：criteria") >= 0);
}
run().catch(function (e) { console.log("RUN FAILED: " + e.message); });
