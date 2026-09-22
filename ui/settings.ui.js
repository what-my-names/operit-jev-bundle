/*
 * ui/settings.ui.js — 「Jev 设置」侧边栏面板
 * 遵循 COMPOSE_DSL_RULES.md：渲染期纯净（仅同步 getEnv），副作用只在事件回调里。
 * 组件写法取自 moodlet v1.3.0 实测：ctx.useState / ctx.UI.* / ctx.MaterialTheme.colorScheme
 */
"use strict";

var constants = require("../constants.js");
var promptMod = require("../prompt.js");

function readEnv(key) {
  try {
    if (typeof getEnv !== "function") return "";
    var v = getEnv(key);
    return (v === null || v === undefined) ? "" : String(v);
  } catch (e) {
    return "";
  }
}

function Screen(ctx) {
  var UI = ctx.UI;
  var C = ctx.MaterialTheme.colorScheme;

  var s1 = ctx.useState("jev_mode", readEnv(constants.ENV_KEYS.enabled).trim() === "1");
  var modeOn = s1[0], setModeOn = s1[1];

  var s2 = ctx.useState("jev_provider", readEnv(constants.ENV_KEYS.provider) || "auto");
  var provider = s2[0], setProvider = s2[1];

  var s3 = ctx.useState("jev_prompt", readEnv(constants.ENV_KEYS.customPrompt) || promptMod.DEFAULT_PROMPT);
  var promptText = s3[0], setPromptText = s3[1];

  var s4 = ctx.useState("jev_status", "");
  var status = s4[0], setStatus = s4[1];

  function put(key, value) {
    try {
      var p = Tools.SoftwareSettings.writeEnvironmentVariable(key, value);
      if (p && typeof p.catch === "function") p.catch(function () {});
      setStatus("已保存");
    } catch (e) {
      setStatus("保存失败：" + String((e && e.message) || e));
    }
  }

  function savePrompt(text) {
    return (async function () {
      try {
        try { await Tools.Files.mkdir(constants.BASE_DIR, true, "android"); } catch (e) {}
        await Tools.Files.write(constants.PROMPT_PATH, text);
        await Tools.SoftwareSettings.writeEnvironmentVariable(constants.ENV_KEYS.customPrompt, text);
        setStatus("提示词已保存");
      } catch (e) {
        try {
          await Tools.SoftwareSettings.writeEnvironmentVariable(constants.ENV_KEYS.customPrompt, text);
          setStatus("已保存（仅环境变量）");
        } catch (e2) {
          setStatus("保存失败：" + String((e2 && e2.message) || e2));
        }
      }
    })();
  }

  var s5 = ctx.useState("jev_or_key", "");
  var orKey = s5[0], setOrKey = s5[1];
  var s6 = ctx.useState("jev_ts_key", "");
  var tsKey = s6[0], setTsKey = s6[1];

  var hasOR = readEnv(constants.ENV_KEYS.openrouterKey).trim().length > 0;
  var hasTS = readEnv(constants.ENV_KEYS.typesafeKey).trim().length > 0;

  return UI.Column({ padding: { horizontal: 16, vertical: 12 }, spacing: 10 }, [
    UI.Row({ verticalAlignment: "center", spacing: 8 }, [
      UI.Icon({ name: "tune", tint: "primary", size: 22 }),
      UI.Text({ text: "Jev 设置", style: "titleMedium", fontWeight: "bold" })
    ]),
    UI.Text({
      text: "Jev 负责选择 / 分类 / 评分；没有密钥时降级为如实标注的模拟模式，绝不编造概率。",
      style: "bodySmall",
      color: C.onSurfaceVariant.copy({ alpha: 0.85 })
    }),
    UI.Card({ containerColor: C.surfaceVariant.copy({ alpha: 0.45 }), shape: { cornerRadius: 12 }, elevation: 0 }, [
      UI.Row({ padding: { horizontal: 14, vertical: 12 }, verticalAlignment: "center", horizontalArrangement: "spaceBetween" }, [
        UI.Column({ weight: 1, spacing: 4 }, [
          UI.Text({ text: "Jev 模式", style: "bodyMedium", fontWeight: "semibold" }),
          UI.Text({
            text: modeOn ? "已开启 · 系统提示词会追加 Jev 指引" : "已关闭 · 不追加任何内容（零开销）",
            style: "bodySmall",
            color: C.onSurfaceVariant.copy({ alpha: 0.75 })
          })
        ]),
        UI.Switch({ checked: modeOn, onCheckedChange: function (v) { setModeOn(v); put(constants.ENV_KEYS.enabled, v ? "1" : "0"); } })
      ])
    ]),
    UI.Card({ containerColor: C.surfaceVariant.copy({ alpha: 0.35 }), shape: { cornerRadius: 12 }, elevation: 0 }, [
      UI.Column({ padding: { horizontal: 14, vertical: 12 }, spacing: 8 }, [
        UI.Text({ text: "通道与密钥", style: "bodyMedium", fontWeight: "semibold" }),
        UI.TextField({ value: provider, onValueChange: function (v) { setProvider(v); }, label: "通道：auto / openrouter / typesafe / simulation", singleLine: true }),
        UI.TextButton({ text: "保存通道", onClick: function () { put(constants.ENV_KEYS.provider, provider.trim() || "auto"); } }),
        UI.TextField({ value: orKey, onValueChange: function (v) { setOrKey(v); }, label: "OpenRouter Key（粘贴后点下方保存）", singleLine: true }),
        UI.TextField({ value: tsKey, onValueChange: function (v) { setTsKey(v); }, label: "TypeSafe Key（粘贴后点下方保存）", singleLine: true }),
        UI.Row({ horizontalArrangement: "end" }, [
          UI.TextButton({
            text: "保存密钥",
            onClick: function () {
              if (orKey.trim()) put(constants.ENV_KEYS.openrouterKey, orKey.trim());
              if (tsKey.trim()) put(constants.ENV_KEYS.typesafeKey, tsKey.trim());
              setOrKey("");
              setTsKey("");
            }
          })
        ]),
        UI.Text({ text: "密钥状态：" + (hasOR ? "OpenRouter 已配置" : "OpenRouter 未配置") + " · " + (hasTS ? "TypeSafe 已配置" : "TypeSafe 未配置"), style: "bodySmall", color: C.onSurfaceVariant.copy({ alpha: 0.85 }) }),
        UI.Text({ text: "密钥只写入本机环境变量，面板不回显、留空点保存不改动；也可在 Operit 的「环境配置」界面里填。", style: "bodySmall", color: C.onSurfaceVariant.copy({ alpha: 0.7 }) })
      ])
    ]),
    UI.Card({ containerColor: C.surfaceVariant.copy({ alpha: 0.35 }), shape: { cornerRadius: 12 }, elevation: 0 }, [
      UI.Column({ padding: { horizontal: 14, vertical: 12 }, spacing: 8 }, [
        UI.Text({ text: "系统提示词（可改）", style: "bodyMedium", fontWeight: "semibold" }),
        UI.TextField({ value: promptText, onValueChange: function (v) { setPromptText(v); }, label: "开启 Jev 模式时追加到系统提示词末尾的内容", minLines: 4, maxLines: 10 }),
        UI.Row({ horizontalArrangement: "end" }, [
          UI.TextButton({ text: "恢复默认", onClick: function () { setPromptText(promptMod.DEFAULT_PROMPT); setStatus("已填回默认，记得保存"); } }),
          UI.TextButton({ text: "保存", onClick: function () { return savePrompt(promptText); } })
        ])
      ])
    ]),
    UI.Text({ text: status || " ", style: "bodySmall", color: C.primary }),
    UI.Text({
      text: "用法：让 AI 调用 jev_decide 做判断；输出 <jev>…</jev> 会渲染成一行决策。",
      style: "bodySmall",
      color: C.onSurfaceVariant.copy({ alpha: 0.7 })
    })
  ]);
}

exports.default = Screen;
exports.Screen = Screen;