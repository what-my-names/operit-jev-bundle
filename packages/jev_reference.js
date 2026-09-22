/* METADATA
{
    "name": "Jev 手册",
    "description": {
        "zh": "离线查阅 Jev 的请求格式、题型、返回字段与边界，不联网不花钱。",
        "en": "Offline reference for the Jev request format, question types, response fields and limits."
    },
    "category": "Other",
    "tools": [
        {
            "name": "jev_reference",
            "description": {
                "zh": "读取 Jev 手册某一节，不联网。章节：overview / request / types / response / errors / env / limits",
                "en": "Read one section of the Jev manual offline: overview / request / types / response / errors / env / limits"
            },
            "parameters": [
                { "name": "section", "description": { "zh": "章节名，默认 overview", "en": "Section name, default overview" }, "type": "string", "required": false }
            ]
        }
    ]
}
*/

var SECTIONS = {
  overview: [
    "Jev 做三件事：从给定选项里挑（choice）、判断是非（noul）、按档位打分（score）。它不生成自由文本。",
    "通道（均需自备密钥）：",
    "- OpenRouter：https://openrouter.ai/api/alpha/decisions ，模型 typesafe/jev-1.13，密钥 OPENROUTER_API_KEY",
    "- TypeSafe 官方：https://api.typesafe.ai/v1/systemone ，模型 jev-1.13.0，密钥 TYPESAFE_API_KEY",
    "没有密钥时本插件返回 mode=simulation，并标注 jev_called=false、probability=null。"
  ].join("\n"),

  request: [
    "POST，Bearer 认证，JSON 体只有三个顶层字段：",
    '{ "model": "...", "state": 文本或对象或证据数组, "questions": { "题ID": { ... } } }',
    "questions 非空；每题只支持 type / instructions / criteria。",
    "一道题只做一件事；相互独立的题放进同一个请求；题目之间不能互相读答案。"
  ].join("\n"),

  types: [
    "choice：criteria 是 {选项名: 说明}，2–255 项；返回 choice / probabilities / confidence。",
    "noul：是非题；criteria 若给，必须同时含 true 与 false；返回 noul（是概率 0–1），没有 confidence 字段。",
    "score：criteria 是 2–10 个有序档位描述数组（下标从 0 开始）；返回 score / legend / probabilities / confidence。",
    "instructions 必填，写清这道题要判断什么。"
  ].join("\n"),

  response: [
    '信封：{ "model": …, "answers": { "题ID": … }, "usage": { "input_tokens", "output_tokens", "cost" } }',
    "choice：probabilities[选中项] 是该选项概率；confidence 描述整个分布形状，不是最大概率、更不是正确率。",
    "noul：字段本身就是「是」的概率。",
    "score：概率加权后的档位序号，出现小数是正常的。"
  ].join("\n"),

  errors: [
    "401/403：密钥缺失或无效（两个端点实测：无密钥分别返回 401 / 403）。",
    "400：请求体不合法（题型、criteria 数量、非有限数值等）。",
    "响应缺 answers、类型与题目不匹配、概率不在 [0,1]：都属于错误，不能当成通过。",
    "本插件遇到错误时返回 mode=error 并附 http_status 与响应片段，不猜答案。"
  ].join("\n"),

  env: [
    "OPENROUTER_API_KEY：OpenRouter 通道密钥（可选）。",
    "TYPESAFE_API_KEY：TypeSafe 官方通道密钥（可选）。",
    "JEV_PROVIDER：auto / openrouter / typesafe / simulation，默认 auto（有哪把钥匙用哪把，都没有则模拟）。",
    "JEV_MODEL：模型名，留空用通道默认。",
    "JEV_MIN_PROBABILITY：低于该值标记 needs_review，默认 0.7。",
    "JEV_ENABLED：1 表示「Jev 模式」开启（会向系统提示词追加指引）。",
    "JEV_CUSTOM_PROMPT：自定义系统提示词（优先级高于 plugins/jev_bundle/prompt.txt）。"
  ].join("\n"),

  limits: [
    "概率与置信度需要按你自己的任务实测校准，不能直接当成正确率。",
    "state 会原样发送给服务商，隐私内容请先确认。",
    "模拟模式下没有概率，标记为 needs_review，必须向用户说明这不是真 Jev。",
    "选择不等于授权：Jev 只给建议，执行与否由宿主和人决定。"
  ].join("\n")
};

async function jev_reference(params) {
  var name = String((params && params.section) || "overview").trim().toLowerCase();
  if (name === "all") {
    var keys = Object.keys(SECTIONS);
    var out = [];
    for (var i = 0; i < keys.length; i++) out.push("## " + keys[i] + "\n" + SECTIONS[keys[i]]);
    return { section: "all", content: out.join("\n\n") };
  }
  if (!SECTIONS[name]) {
    return { section: name, error: "未知章节", available: Object.keys(SECTIONS) };
  }
  return { section: name, content: SECTIONS[name] };
}

async function wrap(fn, params) {
  try {
    complete(await fn(params));
  } catch (error) {
    complete({ success: false, message: String((error && error.message) || error) });
  }
}

exports.jev_reference = function (params) { return wrap(jev_reference, params); };