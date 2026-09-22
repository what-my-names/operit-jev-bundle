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

  var s7 = ctx.useState("jev_or_open", false);
  var orOpen = s7[0], setOrOpen = s7[1];
  var s8 = ctx.useState("jev_ts_open", false);
  var tsOpen = s8[0], setTsOpen = s8[1];
  var s9 = ctx.useState("jev_or_show", false);
  var orShow = s9[0], setOrShow = s9[1];
  var s10 = ctx.useState("jev_ts_show", false);
  var tsShow = s10[0], setTsShow = s10[1];

  var orVal = readEnv(constants.ENV_KEYS.openrouterKey).trim();
  var tsVal = readEnv(constants.ENV_KEYS.typesafeKey).trim();
  var hasOR = orVal.length > 0;
  var hasTS = tsVal.length > 0;
  var mask = function (v) {
    if (!v) return "";
    if (v.length <= 8) return "••••••";
    return v.slice(0, 4) + "••••••" + v.slice(-4);
  };
  var skills = readEnv("JEV_SKILLS_FOUND").trim();

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
        UI.Text({ text: "通道（点一个就切换，立即保存）", style: "bodySmall", color: C.onSurfaceVariant.copy({ alpha: 0.85 }) }),
        UI.LazyRow({ spacing: 6 }, [
          { id: "auto", label: "auto 自动" },
          { id: "openrouter", label: "OpenRouter" },
          { id: "typesafe", label: "TypeSafe" },
          { id: "simulation", label: "仅模拟" }
        ].map(function (opt) {
          var on = (provider === opt.id);
          return UI.FilterChip({
            selected: on,
            onClick: function () { setProvider(opt.id); put(constants.ENV_KEYS.provider, opt.id); },
            label: UI.Text({ text: opt.label, style: "labelSmall", color: on ? C.onPrimary : C.onSurface }),
            leadingIcon: on ? UI.Icon({ name: "check", size: 14, tint: C.onPrimary }) : null
          });
        })),
        UI.Text({ text: "通道说明：auto = 有哪把钥匙就用哪条；openrouter / typesafe = 只用指定的那条；simulation = 只跑模拟、绝不联网。", style: "bodySmall", color: C.onSurfaceVariant.copy({ alpha: 0.75 }) }),
        UI.Row({ verticalAlignment: "center", horizontalArrangement: "spaceBetween" }, [
          UI.TextButton({
            text: (hasOR ? "OpenRouter 已配置" : "OpenRouter 未配置") + (orOpen ? " ︿" : " ﹀"),
            onClick: function () { setOrOpen(!orOpen); }
          }),
          UI.Text({ text: hasOR ? (orShow ? orVal : mask(orVal)) : "", style: "bodySmall", color: C.onSurfaceVariant.copy({ alpha: 0.85 }) })
        ]),
        orOpen ? UI.TextField({ value: orKey, onValueChange: function (v) { setOrKey(v); }, label: "粘贴 OpenRouter Key（sk-or-v1-…）", singleLine: true }) : UI.Text({ text: "", style: "bodySmall" }),
        orOpen ? UI.Row({ horizontalArrangement: "end" }, [
          UI.TextButton({
            text: "保存",
            onClick: function () {
              if (!orKey.trim()) { setStatus("请先粘贴内容再保存"); return; }
              put(constants.ENV_KEYS.openrouterKey, orKey.trim());
              setOrKey(""); setOrOpen(false); setOrShow(false);
            }
          }),
          UI.TextButton({ text: "取消", onClick: function () { setOrKey(""); setOrOpen(false); } })
        ]) : UI.Text({ text: "", style: "bodySmall" }),
        hasOR ? UI.Row({ horizontalArrangement: "end" }, [
          UI.TextButton({ text: orShow ? "隐藏" : "显示", onClick: function () { setOrShow(!orShow); } })
        ]) : UI.Text({ text: "", style: "bodySmall" }),
        UI.Row({ verticalAlignment: "center", horizontalArrangement: "spaceBetween" }, [
          UI.TextButton({
            text: (hasTS ? "TypeSafe 已配置" : "TypeSafe 未配置") + (tsOpen ? " ︿" : " ﹀"),
            onClick: function () { setTsOpen(!tsOpen); }
          }),
          UI.Text({ text: hasTS ? (tsShow ? tsVal : mask(tsVal)) : "", style: "bodySmall", color: C.onSurfaceVariant.copy({ alpha: 0.85 }) })
        ]),
        tsOpen ? UI.TextField({ value: tsKey, onValueChange: function (v) { setTsKey(v); }, label: "粘贴 TypeSafe Key", singleLine: true }) : UI.Text({ text: "", style: "bodySmall" }),
        tsOpen ? UI.Row({ horizontalArrangement: "end" }, [
          UI.TextButton({
            text: "保存",
            onClick: function () {
              if (!tsKey.trim()) { setStatus("请先粘贴内容再保存"); return; }
              put(constants.ENV_KEYS.typesafeKey, tsKey.trim());
              setTsKey(""); setTsOpen(false); setTsShow(false);
            }
          }),
          UI.TextButton({ text: "取消", onClick: function () { setTsKey(""); setTsOpen(false); } })
        ]) : UI.Text({ text: "", style: "bodySmall" }),
        hasTS ? UI.Row({ horizontalArrangement: "end" }, [
          UI.TextButton({ text: tsShow ? "隐藏" : "显示", onClick: function () { setTsShow(!tsShow); } })
        ]) : UI.Text({ text: "", style: "bodySmall" }),
        UI.Text({ text: "技能联动：" + (skills ? "已检测到 " + skills + "，提示词里已写明配合用法" : "未检测到 Jev skill（仅用内置提示词，另装 skill 可增强）"), style: "bodySmall", color: C.onSurfaceVariant.copy({ alpha: 0.85 }) }),
        UI.Text({ text: "密钥只写入本机环境变量；面板平时不显示明文，点「显示」才看得见，留空保存不改动。", style: "bodySmall", color: C.onSurfaceVariant.copy({ alpha: 0.7 }) })
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