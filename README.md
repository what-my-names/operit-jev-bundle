# Jev 决策（jev_bundle）

把「选择 / 分类 / 评分」交给 Jev 的类型化判断：**一个插件装完即可用**，不依赖任何前置包。

## 安装后你会看到什么

| 位置 | 是什么 |
|---|---|
| 输入框旁的菜单 | **「Jev 模式」开关**（开启后 AI 遇到判类任务会优先调用 Jev） |
| 侧边栏 | **「Jev 设置」面板**：开关、通道、系统提示词编辑 |
| AI 的工具列表 | **`jev_decide`**（做判断）、**`jev_reference`**（离线查手册） |
| 输出渲染 | AI 写的 `<jev>…</jev>` 会渲染成一行决策 |

## 三分钟上手

1. **装上就能用**：不配密钥时插件走「模拟模式」，会如实标注 `jev_called=false`、概率为空——**那不是 Jev 的答案**，插件绝不编造概率。
2. **想用真 Jev**：在 Operit 的环境变量里填一枚密钥（任选其一）：
   - `OPENROUTER_API_KEY` —— 去 openrouter.ai/settings/keys 拿
   - `TYPESAFE_API_KEY` —— 去 console.typesafe.ai 拿
3. 然后在侧边栏「Jev 设置」里打开 **Jev 模式** 开关。
4. 对 AI 说：「用 Jev 判断这条反馈该归哪一类」——它会调用 `jev_decide`。

## 关于密钥（请务必知道）

- **要花钱吗**：本插件免费；真实判断由官方 Jev 服务按 token 计费，扣你的密钥账户。
- **放哪里**：Operit 的环境变量设置。**不要**发在聊天里、不要贴进 issue、不要提交到公开仓库。
- **面板不回显密钥**：只显示「已配置 / 未配置」。
- **会发送什么**：你写进 `state` 的证据原文会发给所选服务商，隐私内容请先确认再发。

## 系统提示词可以改

「Jev 模式」开启时，插件会往系统提示词末尾追加一段默认指引（约 100 字）。**你可以整段替换它**：

- 面板里的「系统提示词（可改）」多行框 → 改完点保存
- 或直接编辑文件：`/sdcard/Download/Operit/plugins/jev_bundle/prompt.txt`
- 点「恢复默认」可随时填回内置文案
- 关掉开关就完全不追加，**零 token 开销**

## 想更深入？可选装 Skill

本插件自带 `jev_reference` 手册，够日常用。如果你想要**完整的方法论**（问题设计、场景库、批量分类技巧、失败排查等），可以另外安装同源的 **Skill 技能包**：

- `jev`（决策设计）、`jev-act`（动作选择）、`jev-documents`（证据定位）、`jev-eval`（输出评判）、`jev-triage`（批量分类）
- 效果：AI 在设计题面、批量任务、复杂判断时会有更细的规范可依
- **注意：Skill 是可选增强，不装也能正常使用本插件**

（其它 AI 客户端如 Claude Code / Cursor 没有 ToolPkg 体系，请装 Skill 版。）

## 已知限制

- 概率与置信度**不是正确率**，请按自己的任务实测校准。
- 上游接口为 alpha 阶段，路径或模型名可能变动。
- `Tools.Network.httpPost` 的参数形状在官方 types 缺失情况下来自推断，**真实调用尚未验证**（需带密钥实测）；如遇请求失败，插件会返回 `mode=error` 与状态码，不会猜答案。
- 选择不等于授权：Jev 只给建议，执行与否由你决定。

## 来源与许可

决策协议与题型规范来自 `wuyoscar/jev-skill`（MIT）与 TypeSafe / OpenRouter 公开接口文档。本插件为独立实现。

## 五档通道（面板里点选，点一下即存）

| 档位 | 行为 |
|---|---|
| 🔄 自动 | 有 key 走真 Jev；没 key 自动转本机作答 |
| 🌐 OpenRouter / 🛡 TypeSafe | 只走指定通道 |
| 🤖 本机作答（`mode=host`） | **零成本**：把规范化题目交回当前模型作答，强制标注「不是真 Jev」 |
| 🚫 仅模拟 | 只回格式骨架，不产出答案 |

**没密钥也有产出**：默认档位是「自动」，没 key 时自动转本机作答（`mode=host`），不再是一堆空字段。将来填上 key，代码不用改就升级为真 Jev。

## 仓库与下载

- 插件源码 / Release：https://github.com/what-my-names/operit-jev-bundle
- 配套技能包（5 个 skill）：https://github.com/what-my-names/operit-jev-skills
- 市场安装：本插件；或取 Release 里的 `.toolpkg` 导入

## 副作用（装前请知道）

- 开启「Jev 模式」会向**系统提示词末尾追加约 20 行** Jev 规范（占少量 token）；**关掉开关则完全不追加**，且文案可在面板整段替换
- 新增输入菜单开关与侧边栏入口（可在包管理停用整个插件）
- 真实模式会把 `state` 原样发给所选服务商；`--dry-run`、本机作答、模拟模式不联网
- 面板保存通道 / 密钥 / 提示词会写入本机环境变量（不上传）

## 变更记录

- **v0.1.5**：新增 `mode=host` 零成本兜底；通道改 5 档点选（带当前说明）；提示词扩充至 20 行；修复外部审查 7 条
- **v0.1.4**：密钥改抽屉式收纳 + 掩码移除；提示词面板保存后下一轮即生效
- **v0.1.3**：通道改点选标签
- **v0.1.2**：设置面板与提示词可改
- **v0.1.1**：面板内直接填写 API Key
- **v0.1.0**：首版（提示词注入 + 输入菜单开关 + jev_decide / jev_reference）

### 配套 Skill（可选增强，建议一起装）
- 5 个技能（决策设计 / 动作选择 / 证据定位 / 输出评判 / 批量分类）：https://github.com/what-my-names/operit-jev-skills
- 仓库布局为 skills/<名>/SKILL.md，也适用于 Claude Code / Cursor / Codex CLI 等支持 skill 的客户端
- 装了之后插件会**自动检测**，并在系统提示词里写明「先按对应 skill 的规范走，判断仍走 jev_decide」

### Jev API 与实现（想自己接的看这里）
- 官方文档：https://docs.typesafe.ai （入门 /introduction、快速开始、三种题型、Confidence、Patterns；给 AI 读的全站索引 https://docs.typesafe.ai/llms.txt）
- 拿 key：https://console.typesafe.ai
- 两个端点（二选一）：
  - TypeSafe 官方：POST https://api.typesafe.ai/v1/systemone ，模型 jev-1.13.0，头 Authorization: Bearer $TYPESAFE_API_KEY
  - OpenRouter：POST https://openrouter.ai/api/alpha/decisions ，模型 typesafe/jev-1.13，头 Authorization: Bearer $OPENROUTER_API_KEY
- 请求体只有三个顶层字段：{"model": "…", "state": "证据或上下文", "questions": {"q1": {"type": "choice", "instructions": "…", "criteria": {"A": "…", "B": "…"}}}}
- 响应：{"model": "…", "answers": {"q1": {"choice": "A", "probabilities": {"A": 0.8, "B": 0.2}, "confidence": 0.7}}, "usage": {"input_tokens": …, "output_tokens": …, "cost": …}}
- 题型字段：Choice → choice / probabilities / confidence；Score → score / probabilities / confidence；Noul → noul（0–1，无 confidence）
- 实现要点（官方建议）：一题只做一件事，多因子请拆题后在代码里自己加权；独立题在同一请求里并行评估、互不影响，加题几乎不增耗时；用 confidence 做门控（高置信自动执行，低置信转人工复核）
- 本插件的实现：manifest.json + main.js（系统提示词钩子 / 输入菜单开关 / <jev> 渲染 / 侧边栏面板）+ packages/jev_decide.js（校验 + Tools.Network.httpPost + needs_review + host 兜底）+ packages/jev_reference.js（离线手册）；源码 https://github.com/what-my-names/operit-jev-bundle
