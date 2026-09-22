/*
 * main.js — ToolPkg 入口：只做「注册」，不承载业务逻辑。
 *
 * 依据 operit-plugin-dev-pro/SKILL.md：registerToolPkg() 只用于声明注册项。
 * 参考实证：moodlet v1.3.0 dist/main.js（registerSystemPromptComposeHook /
 * registerPromptInputHook / registerXmlRenderPlugin / registerInputMenuTogglePlugin）
 * 与 gentle_guardian main.js（registerUiRoute + registerNavigationEntry）。
 */
"use strict";

var constants = require("./constants.js");
var promptMod = require("./prompt.js");
var settingsUi = require("./ui/settings.ui.js");
var SettingsScreen = (settingsUi && settingsUi.default) ? settingsUi.default : settingsUi;

/* 模块级缓存：主上下文常驻，避免「每轮组装提示词」都读盘 */
var cachedPrompt = "";

function readEnv(key) {
  try {
    if (typeof getEnv !== "function") return "";
    var v = getEnv(key);
    return (v === null || v === undefined) ? "" : String(v);
  } catch (e) {
    return "";
  }
}

function jevEnabled() {
  return readEnv(constants.ENV_KEYS.enabled).trim() === "1";
}

async function writeEnv(key, value) {
  await Tools.SoftwareSettings.writeEnvironmentVariable(key, value);
}

async function readFileText(path) {
  try {
    var raw = await Tools.Files.read(path);
    var text = typeof raw === "string" ? raw : (raw && (raw.content || (raw.data && raw.data.content))) || "";
    if (typeof text === "string" && text.trim().startsWith("[")) {
      try {
        var arr = JSON.parse(text);
        if (Array.isArray(arr) && typeof arr[0] === "string") text = arr[0];
      } catch (e) {}
    }
    return String(text || "");
  } catch (e) {
    return "";
  }
}

/* 技能检测：装了对应 Skill 就写进提示词，实现 skill ↔ toolpkg 联动 */
var cachedSkills = [];
var SKILLS_DIR = "/sdcard/Download/Operit/skills/";
var SKILLS_TO_DETECT = ["jev", "jev-act", "jev-documents", "jev-eval", "jev-triage"];

async function detectSkills() {
  var found = [];
  for (var i = 0; i < SKILLS_TO_DETECT.length; i++) {
    var name = SKILLS_TO_DETECT[i];
    try {
      var info = await Tools.Files.exists(SKILLS_DIR + name + "/SKILL.md", "android");
      if (info && info.exists) found.push(name);
    } catch (e) {}
  }
  cachedSkills = found;
  try {
    await writeEnv("JEV_SKILLS_FOUND", found.join(","));
  } catch (e) {}
  return found;
}

/* 取值顺序：环境变量 > prompt.txt > prompt.js 默认值；末尾按需追加技能联动段 */
async function refreshPrompt() {
  var fromEnv = readEnv(constants.ENV_KEYS.customPrompt).trim();
  if (fromEnv) { cachedPrompt = fromEnv; }
  else { cachedPrompt = (await readFileText(constants.PROMPT_PATH)).trim(); }
  detectSkills().catch(function () {});
  return cachedPrompt;
}

function currentPromptText() {
  return promptMod.buildPrompt(cachedPrompt, cachedSkills);
}

/* ── 1) 系统提示词注入：只在开关开启时追加，关闭则原样返回（零 token 开销） ── */
function onSystemPromptCompose(params) {
  try {
    if (!params || params.eventName !== "after_compose_system_prompt") return undefined;
    if (!jevEnabled()) return undefined;
    var payload = params.eventPayload || {};
    var base = String(payload.systemPrompt || "");
    return base + "\n\n" + currentPromptText();
  } catch (e) {
    return undefined;
  }
}

/* ── 2) 输入菜单开关：「Jev 模式」 ── */
async function onInputMenuToggle(params) {
  try {
    var p = (params && params.eventPayload) ? params.eventPayload : (params || {});
    var action = String(p.action || "");
    if (action === "create") {
      return {
        toggles: [{
          id: "jev_mode",
          title: "Jev 模式",
          description: "开启后 AI 遇到选择/分类/评分会优先调用 jev_decide",
          isChecked: jevEnabled()
        }]
      };
    }
    if (action === "toggle" && String(p.toggleId || "") === "jev_mode") {
      await writeEnv(constants.ENV_KEYS.enabled, p.isChecked ? "1" : "0");
      await refreshPrompt();
      return { ok: true };
    }
    return { ok: false };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

/* ── 3) <jev> 标签渲染 ── */
function onXmlRender(params) {
  try {
    var p = (params && params.eventPayload) ? params.eventPayload : (params || {});
    if (String(p.tagName || "") !== constants.TAG) return { handled: false };
    var inner = String(p.xmlContent || "");
    var m = inner.match(/^<jev[^>]*>([\s\S]*?)<\/jev>$/i);
    var text = m ? m[1].trim() : inner.trim();
    return { handled: true, text: "🧭 " + text };
  } catch (e) {
    return { handled: false };
  }
}

/* ── 4) 生命周期：启动时预热提示词缓存 ── */
function onApplicationCreate() {
  refreshPrompt().catch(function () {});
  return { ok: true };
}

function registerToolPkg() {
  ToolPkg.registerSystemPromptComposeHook({
    id: constants.HOOK_IDS.systemPrompt,
    function: onSystemPromptCompose
  });

  ToolPkg.registerInputMenuTogglePlugin({
    id: constants.HOOK_IDS.inputToggle,
    function: onInputMenuToggle
  });

  ToolPkg.registerXmlRenderPlugin({
    id: constants.HOOK_IDS.xmlRender,
    tag: constants.TAG,
    function: onXmlRender
  });

  ToolPkg.registerAppLifecycleHook({
    id: "jev_app_create",
    event: "application_on_create",
    function: onApplicationCreate
  });

  ToolPkg.registerUiRoute({
    id: constants.HOOK_IDS.settingsRoute,
    route: "toolpkg:com.whatmynames.jev_bundle:ui:" + constants.HOOK_IDS.settingsRoute,
    runtime: "compose_dsl",
    screen: SettingsScreen,
    params: {},
    title: { zh: "Jev 设置", en: "Jev Settings" }
  });

  ToolPkg.registerNavigationEntry({
    id: constants.HOOK_IDS.settingsNav,
    route: "toolpkg:com.whatmynames.jev_bundle:ui:" + constants.HOOK_IDS.settingsRoute,
    surface: "main_sidebar_plugins",
    title: { zh: "Jev 设置", en: "Jev Settings" },
    order: 20
  });

  return true;
}

exports.registerToolPkg = registerToolPkg;
exports.onSystemPromptCompose = onSystemPromptCompose;
exports.onInputMenuToggle = onInputMenuToggle;
exports.onXmlRender = onXmlRender;
exports.onApplicationCreate = onApplicationCreate;