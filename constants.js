/*
 * constants.js — 常量集中地（hook id / env key / 路径 / 标签名）
 * 改动这里会影响 main.js 与子包，务必保持一致。
 */
"use strict";

var HOOK_IDS = {
  systemPrompt: "jev_system_prompt",
  inputToggle: "jev_input_toggle",
  xmlRender: "jev_xml",
  settingsRoute: "jev_settings",
  settingsNav: "jev_settings_entry"
};

var ENV_KEYS = {
  enabled: "JEV_ENABLED",
  provider: "JEV_PROVIDER",
  model: "JEV_MODEL",
  minProbability: "JEV_MIN_PROBABILITY",
  openrouterKey: "OPENROUTER_API_KEY",
  typesafeKey: "TYPESAFE_API_KEY",
  customPrompt: "JEV_CUSTOM_PROMPT"
};

var ENDPOINTS = {
  openrouter: "https://openrouter.ai/api/alpha/decisions",
  typesafe: "https://api.typesafe.ai/v1/systemone"
};

var DEFAULT_MODELS = {
  openrouter: "typesafe/jev-1.13",
  typesafe: "jev-1.13.0"
};

var TAG = "jev";
var BASE_DIR = "/sdcard/Download/Operit/plugins/jev_bundle/";
var PROMPT_PATH = BASE_DIR + "prompt.txt";
var USAGE_PATH = BASE_DIR + "usage.json";

exports.HOOK_IDS = HOOK_IDS;
exports.ENV_KEYS = ENV_KEYS;
exports.ENDPOINTS = ENDPOINTS;
exports.DEFAULT_MODELS = DEFAULT_MODELS;
exports.TAG = TAG;
exports.BASE_DIR = BASE_DIR;
exports.PROMPT_PATH = PROMPT_PATH;
exports.USAGE_PATH = USAGE_PATH;