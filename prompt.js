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
  "题目要写清标准与候选，证据放 state，不要发明题面里没有的选项。",
  "probability / confidence 不是\"正确率\"，低于阈值要标 needs_review 并说明。",
  "返回 mode=simulation 时必须如实说明\"这是模拟，不是真 Jev\"。",
  "需要格式细节时调用 jev_reference 查阅，不要凭记忆编参数。",
  "未经用户同意，不要把隐私内容放进 state。"
].join("\n");

exports.DEFAULT_PROMPT = DEFAULT_PROMPT;