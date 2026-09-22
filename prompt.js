/*
 * prompt.js — 系统提示词的「默认文案」
 *
 * 取值顺序（见设计方案第六节）：
 *   1) 用户自定义（JEV_CUSTOM_PROMPT 环境变量，或 plugins/jev_bundle/prompt.txt）
 *   2) 本文件的 DEFAULT_PROMPT
 * 全空白视为「用默认」。
 * 用户可整段替换，无需改本文件。
 */
"use strict";

var DEFAULT_PROMPT = [
  "[Jev 决策]",
  "遇到选择、分类、排序、评分类任务，优先调用 jev_decide，不要用自由生成替代。",
  "",
  "题目怎么写：",
  "1. 一题只做一件事；相互独立的题放进同一次调用（题与题之间不能互相读答案）。",
  "2. choice：criteria 是「选项名 → 说明」对象，2–255 项；返回 choice / probabilities / confidence。",
  "3. noul：是非题；criteria 若给必须同时含 true 与 false；返回的 noul 字段本身就是「是」的概率，没有 confidence。",
  "4. score：criteria 是 2–10 个有序档位描述数组（下标从 0 开始）；返回概率加权后的档位序号，出小数正常。",
  "5. state 放证据原文，别放隐私；不要发明题面里没有的选项。",
  "",
  "怎么读结果：",
  "- probability / confidence 不是「正确率」；confidence 只描述整个分布的形状。",
  "- 低于 JEV_MIN_PROBABILITY（默认 0.7）要标 needs_review，并向用户说明。",
  "- 返回 mode=simulation 时，必须原样告诉用户「这是模拟，不是真 Jev」，不得给出任何像结论的答案。",
  "- 返回 mode=error 时如实转述状态码与错误原文，不猜测、不补答案。",
  "- 格式细节不确定就调 jev_reference 查，不要凭记忆编参数。",
  "",
  "边界：选择不等于授权。Jev 只给建议，执行与否由用户决定。"
].join("\n");

var SKILL_ADDENDUM = [
  "[Jev 技能联动] 本机已检测到这些 Jev Skill：{list}",
  "- 设计题面、批量分类、证据定位、产物评判时，先按对应技能的规范走（jev / jev-triage / jev-documents / jev-eval / jev-act）。",
  "- skill 提供方法论与场景索引，真正下判断仍然走 jev_decide；两者配合使用，不要只挑一个。"
].join("\n");

function buildPrompt(base, skillNames) {
  var text = String(base || "").trim();
  if (!text) text = DEFAULT_PROMPT;
  var list = (skillNames || []).join(" / ");
  if (list) text = text + "\n\n" + SKILL_ADDENDUM.replace("{list}", list);
  return text;
}

exports.DEFAULT_PROMPT = DEFAULT_PROMPT;
exports.SKILL_ADDENDUM = SKILL_ADDENDUM;
exports.buildPrompt = buildPrompt;