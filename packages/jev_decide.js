/* METADATA
{
    "name": "Jev 判断",
    "description": {
        "zh": "向 Jev 提交类型化判断题（choice / noul / score），返回答案与用量；未配密钥时返回如实标注的模拟结果。",
        "en": "Submit typed questions to Jev (choice / noul / score); returns answers and usage, or a labelled simulation when no key is set."
    },
    "category": "Other",
    "env": [
        { "name": "OPENROUTER_API_KEY", "description": { "zh": "OpenRouter 密钥（可选）", "en": "OpenRouter key (optional)" }, "required": false },
        { "name": "TYPESAFE_API_KEY", "description": { "zh": "TypeSafe 官方密钥（可选）", "en": "TypeSafe key (optional)" }, "required": false },
        { "name": "JEV_PROVIDER", "description": { "zh": "auto / openrouter / typesafe / simulation", "en": "auto / openrouter / typesafe / simulation" }, "required": false, "defaultValue": "auto" },
        { "name": "JEV_MODEL", "description": { "zh": "模型名，留空用通道默认", "en": "Model name; channel default when empty" }, "required": false },
        { "name": "JEV_MIN_PROBABILITY", "description": { "zh": "低于该值标记 needs_review", "en": "Mark needs_review below this value" }, "required": false, "defaultValue": "0.7" }
    ],
    "tools": [
        {
            "name": "jev_decide",
            "description": {
                "zh": "把一组类型化判断题交给 Jev。questions 是题ID到题目的对象或 JSON 字符串，每题含 type(choice/noul/score)、instructions、criteria。无密钥时返回 mode=simulation 并如实标注。",
                "en": "Hand a set of typed questions to Jev. questions maps question IDs to {type, instructions, criteria}. Returns a labelled simulation when no key is configured."
            },
            "parameters": [
                { "name": "state", "description": { "zh": "证据或上下文（会发给服务商）", "en": "Evidence or context sent to the provider" }, "type": "string", "required": true },
                { "name": "questions", "description": { "zh": "题目对象或 JSON 字符串", "en": "Questions object or JSON string" }, "type": "string", "required": true },
                { "name": "mode", "description": { "zh": "auto / real / host / simulation，默认 auto", "en": "auto / real / host / simulation, default auto" }, "type": "string", "required": false }
            ]
        }
    ]
}
*/

var ENDPOINTS = {
  openrouter: "https://openrouter.ai/api/alpha/decisions",
  typesafe: "https://api.typesafe.ai/v1/systemone"
};
var MODELS = { openrouter: "typesafe/jev-1.13", typesafe: "jev-1.13.0" };
var USAGE_PATH = "/sdcard/Download/Operit/plugins/jev_bundle/usage.json";

function env(key) {
  try {
    if (typeof getEnv !== "function") return "";
    var v = getEnv(key);
    return (v === null || v === undefined) ? "" : String(v).trim();
  } catch (e) { return ""; }
}

function validate(questions) {
  var ids = Object.keys(questions || {});
  if (ids.length === 0) throw new Error("questions 不能为空");
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i], q = questions[id];
    if (!q || typeof q !== "object") throw new Error(id + ": 题目必须是对象");
    var t = String(q.type || "");
    if (t !== "choice" && t !== "noul" && t !== "score") throw new Error(id + ": type 必须是 choice / noul / score");
    if (!q.instructions) throw new Error(id + ": 缺少 instructions");
    if (t === "choice") {
      var keys = Object.keys(q.criteria || {});
      if (keys.length < 2 || keys.length > 255) throw new Error(id + ": choice 需要 2–255 个选项");
    } else if (t === "score") {
      if (!Array.isArray(q.criteria) || q.criteria.length < 2 || q.criteria.length > 10) throw new Error(id + ": score 需要 2–10 个有序档位");
    } else {
      if (q.criteria && (typeof q.criteria !== "object" || !("true" in q.criteria) || !("false" in q.criteria))) throw new Error(id + ": noul 的 criteria 若给出必须同时含 true 与 false");
    }
  }
  return questions;
}

function simulationAnswers(questions, reasonText) {
  /* 字段形态与真返回对齐：choice→choice/probabilities/confidence；noul→noul（无 confidence）；score→score/legend/probabilities/confidence */
  var out = {};
  var ids = Object.keys(questions);
  var why = reasonText || "未配置 API 密钥：这是模拟占位，不是 Jev 的答案";
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i], t = questions[id].type;
    if (t === "choice") {
      out[id] = { type: t, choice: null, probabilities: null, confidence: null, needs_review: true, reason: why };
    } else if (t === "noul") {
      out[id] = { type: t, noul: null, needs_review: true, reason: why };
    } else {
      out[id] = { type: t, score: null, legend: null, probabilities: null, confidence: null, needs_review: true, reason: why };
    }
  }
  return out;
}

/* 通道解析：host = 本机模型自行作答（零成本，如实标注不是 Jev） */
function resolveProvider(mode) {
  var want = String(mode || "").toLowerCase();
  var configured = env("JEV_PROVIDER").toLowerCase() || "auto";
  var pick = (want === "real" || want === "auto") ? configured : want;
  var hasOR = env("OPENROUTER_API_KEY").length > 0;
  var hasTS = env("TYPESAFE_API_KEY").length > 0;
  if (pick === "simulation") return { kind: "simulation" };
  if (pick === "host") return { kind: "host" };
  if (pick === "openrouter") return hasOR ? { kind: "real", provider: "openrouter", key: env("OPENROUTER_API_KEY") } : { kind: "host" };
  if (pick === "typesafe") return hasTS ? { kind: "real", provider: "typesafe", key: env("TYPESAFE_API_KEY") } : { kind: "host" };
  if (hasOR) return { kind: "real", provider: "openrouter", key: env("OPENROUTER_API_KEY") };
  if (hasTS) return { kind: "real", provider: "typesafe", key: env("TYPESAFE_API_KEY") };
  return { kind: "host" };
}

async function httpJson(url, headers, body) {
  var candidates = [
    function () { return Tools.Network.httpPost(url, body, headers); },
    function () { return Tools.Network.httpPost(url, headers, body); }
  ];
  var lastErr = null;
  for (var i = 0; i < candidates.length; i++) {
    try {
      var res = await candidates[i]();
      return { res: res, shape: i };
    } catch (e) {
      lastErr = e;
      var msg = String((e && e.message) || e);
      /* 只有错误看起来是「参数/签名不对」时才换形状重试；
         网络超时等错误直接报错，避免重复发出计费请求 */
      if (!/argument|parameter|arity|typecast|参数|类型/i.test(msg)) break;
    }
  }
  throw new Error("httpPost 调用失败：" + String((lastErr && lastErr.message) || lastErr));
}

function normalize(res) {
  if (res === null || res === undefined) return { status: 0, text: "" };
  if (typeof res === "string") return { status: 200, text: res };
  var status = Number(res.status || res.statusCode || res.code || 0);
  var text = res.body || res.content || res.data || res.text || "";
  if (typeof text !== "string") text = JSON.stringify(text);
  return { status: status, text: text };
}

async function logUsage(row) {
  try {
    await Tools.Files.mkdir("/sdcard/Download/Operit/plugins/jev_bundle/", true, "android");
    var raw = "";
    try { raw = await Tools.Files.read(USAGE_PATH); } catch (e) {}
    if (typeof raw !== "string") raw = (raw && (raw.content || (raw.data && raw.data.content))) || "";
    var arr = [];
    try { arr = JSON.parse(String(raw || "[]")); } catch (e) { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    arr.push(row);
    if (arr.length > 500) arr = arr.slice(arr.length - 500);
    await Tools.Files.write(USAGE_PATH, JSON.stringify(arr));
  } catch (e) {}
}

async function jev_decide(params) {
  var state = String((params && params.state) || "");
  var rawQuestions = (params && params.questions) || "{}";
  var mode = String((params && params.mode) || "auto");
  var questions = rawQuestions;
  if (typeof questions === "string") questions = JSON.parse(questions);
  validate(questions);

  var route = resolveProvider(mode);
  if (route.kind === "simulation") {
    await logUsage({ time: new Date().toISOString().replace("T", " ").slice(0, 19), mode: "simulation", provider: "none", cost: 0 });
    return {
      mode: "simulation",
      jev_called: false,
      provider: "none",
      model: null,
      note: "未配置 OPENROUTER_API_KEY / TYPESAFE_API_KEY，本次不是真 Jev。请让用户手动判断，或配置密钥后重试。",
      answers: simulationAnswers(questions),
      usage: null
    };
  }

  /* host：没密钥也能用 —— 把规范化题目交回宿主 AI 自己按题型作答，如实标注不是 Jev */
  if (route.kind === "host") {
    await logUsage({ time: new Date().toISOString().replace("T", " ").slice(0, 19), mode: "host", provider: "host", cost: 0 });
    return {
      mode: "host",
      jev_called: false,
      provider: "host",
      model: null,
      note: "未配置 API 密钥：本次由本机模型按 Jev 的题型规范自行作答（mode=host）。这不是真 Jev，没有校准概率，必须在回复里如实标注。",
      request: { state: state, questions: questions },
      how_to_answer: [
        "choice：填 choice（选中项名）、probabilities（选项→概率，和为 1）、confidence（0–1）",
        "noul：填 noul（「是」的概率 0–1），没有 confidence 字段",
        "score：填 score（概率加权档位序号，可为小数）、legend（档位数组）、probabilities、confidence",
        "每题都给 needs_review：把握不足或证据不足时为 true，并说明理由",
        "在回复里写明：本次是 mode=host（本机作答），不是真 Jev"
      ],
      answers: simulationAnswers(questions, "本机作答：请由宿主模型填写，字段格式见 how_to_answer"),
      usage: null
    };
  }

  var model = env("JEV_MODEL") || MODELS[route.provider];
  var body = JSON.stringify({ model: model, state: state, questions: questions });
  var headers = { "Authorization": "Bearer " + route.key, "Content-Type": "application/json" };
  var resp;
  try {
    resp = await httpJson(ENDPOINTS[route.provider], headers, body);
  } catch (e) {
    return { mode: "error", jev_called: false, provider: route.provider, model: model, error: String((e && e.message) || e), note: "请求未完成，不猜测答案。" };
  }
  var n = normalize(resp.res);
  if (n.status && (n.status < 200 || n.status >= 300)) {
    return { mode: "error", jev_called: true, provider: route.provider, model: model, http_status: n.status, error: String(n.text).slice(0, 500) };
  }
  var data;
  try { data = (typeof n.text === "string" && n.text) ? JSON.parse(n.text) : n.text; } catch (e) { return { mode: "error", jev_called: true, provider: route.provider, error: "响应不是合法 JSON", raw: String(n.text).slice(0, 300) }; }
  if (!data || !data.answers) return { mode: "error", jev_called: true, provider: route.provider, error: "响应缺少 answers 字段", raw: JSON.stringify(data).slice(0, 300) };

  var minP = Number(env("JEV_MIN_PROBABILITY") || "0.7");
  var needsReview = false;
  var ids = Object.keys(data.answers);
  for (var i = 0; i < ids.length; i++) {
    var a = data.answers[ids[i]] || {};
    if (a.type === "choice" && a.probabilities && a.choice && Number(a.probabilities[a.choice]) < minP) needsReview = true;
    if (a.type === "noul" && Number(a.noul) < minP) needsReview = true;
  }
  var cost = (data.usage && Number(data.usage.cost)) || 0;
  await logUsage({ time: new Date().toISOString().replace("T", " ").slice(0, 19), mode: "real", provider: route.provider, cost: cost });
  return { mode: "real", jev_called: true, provider: route.provider, model: data.model || model, answers: data.answers, usage: data.usage || null, needs_review: needsReview };
}

async function wrap(fn, params) {
  try {
    complete(await fn(params));
  } catch (error) {
    complete({ mode: "error", success: false, message: String((error && error.message) || error) });
  }
}

exports.jev_decide = function (params) { return wrap(jev_decide, params); };