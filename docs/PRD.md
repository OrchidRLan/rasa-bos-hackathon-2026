# PRD — HuddleX
> 你的 AI 专家决策团队 · Boston Tech Week Hackathon 2026

---

## 1. 问题陈述

Brainstorming 和决策过程中，用户希望获得不同领域、不同认知框架的反馈。但现实存在三个问题：

1. **优质创作者内容分散** — 观点散落在 X、Wikipedia、播客、newsletter 中，难以系统整理
2. **无法直接互动** — 用户只能被动阅读，不能围绕自己的具体问题与这些专家对话
3. **跨视角讨论缺少连续记忆** — 在不同 AI 角色间切换时需要反复交代背景

---

## 2. 解决方案

HuddleX 构建一个多人格 AI 专家团队。每个专家人格基于公开资料构建，包含：

- 独立知识库（X 帖子 + Wikipedia embedding 进 Chroma）
- **认知框架**（心智模型 / 决策启发式 / 表达 DNA / 反模式 / 诚实边界）
- 独立 Rime TTS 声音

### 2.1 专家来源

#### 预置专家
系统预置 5 位专家（通过 `seed_personas.py` 初始化）：Elon Musk、Sam Altman、Paul Graham、Naval Ravikant、Jensen Huang

#### 用户蒸馏（女娲蒸馏技术）
用户可自行添加任意公众人物。蒸馏流程分 4 个阶段：

| Phase | 内容 | 实现 |
|-------|------|------|
| Phase 1 | 抓取 Wikipedia 原文 | `_fetch_wikipedia()` |
| Phase 1.5 | 6 维度并行 LLM 调研（著作 / 对话 / 表达DNA / 他者视角 / 决策 / 时间线） | `_run_all_dimensions()` — ThreadPoolExecutor(max_workers=6) |
| Phase 2-3 | LLM 合成 → `cognitive_framework` JSON（心智模型 / 启发式 / 反模式 / 诚实边界） | `_synthesize_framework()` |
| Phase 4 | 质量检查 + Chroma embedding + 写入 config.yml | `_quality_check()` + `_embed()` |

### 2.2 对话记忆

| 层级 | 范围 | 存储 | 注入方式 |
|------|------|------|---------|
| 线程历史 | 当前线程内所有消息（跨人格共享） | `.data/threads/{thread_id}.json` | 最近 12 条原文 |
| 全局历史 | 用户所有线程的压缩摘要 | `.data/users/{user_id}.json` | LLM 生成摘要（~100字） |

---

## 3. 目标用户

- **主要用户**：重度内容消费者、科技/商业领域创业者、做 hackathon/side project 的 builder
- **次要用户**：产品经理、投资人、自媒体创作者、研究者

---

## 4. 核心功能

### 4.1 专家人格系统

| 功能 | 描述 |
|------|------|
| Expert Library | 展示所有专家卡片：头像、姓名、briefing、X handle、Wikipedia 链接 |
| 女娲蒸馏 | 用户通过 "+" 按钮输入姓名/X handle/Wikipedia URL，触发完整 4-Phase 蒸馏流程，30-45 秒完成 |
| 认知框架注入 | 蒸馏生成的 `cognitive_framework` 作为 `[COGNITIVE FRAMEWORK]` block 注入 system prompt |
| 人格切换 | UI 按钮 或 语音命令"切换到 XXX"，CALM flow 处理切换 |
| 独立 Chroma 集合 | 每个专家（含用户蒸馏的）有独立向量库，蒸馏完成后立即可对话 |

### 4.2 对话与记忆

| 功能 | 描述 |
|------|------|
| 跨人格共享历史 | 同一线程内所有专家共享消息记录，新专家接续时可引用前一个专家的发言 |
| 用户画像 | 用户可通过语音/文字介绍自己，存入 `user_context` |
| 全局摘要 | Always-On Worker 压缩跨线程记忆（~100字）注入 system prompt |
| 持久化 | 对话历史 JSON 持久化，重启后保留 |

### 4.3 语音交互

| 功能 | 描述 |
|------|------|
| 语音输入 | Speechmatics ASR（WebSocket）实时识别 |
| 语音输出 | Rime TTS 合成当前专家声音 |
| 语音切换 | 用户说"切换到 [专家名]"触发 CALM switch_persona flow |

### 4.4 Always-On 后台层

| 功能 | 描述 |
|------|------|
| 定时刷新 | APScheduler 每 6 小时重新 embed 各专家最新内容 |
| Briefing 生成 | 每次刷新后 LLM 生成今日 briefing（~100字摘要） |
| Health Check | `/worker/health` 端点记录最后运行时间和各专家 embed 状态 |

### 4.5 邮件导出

用户说"把这次讨论发到我的邮箱"，系统生成结构化 summary + 完整聊天记录，通过 SMTP 发送两份附件。

---

## 5. 用户流程

```
1. 打开 Web App
   → 看到专家库（5 个预置 + 用户已蒸馏的专家）
   → 看到最近对话线程

2. [可选] 蒸馏新专家
   → 点击 "+"
   → 填写姓名、X handle（可选）、Wikipedia URL（自动建议）
   → 30-45 秒蒸馏完成
   → 新专家立即出现在列表，可开始对话

3. 开启对话
   → 选择专家 → CALM 激活 switch_persona flow
   → system prompt 注入：[人格定义] + [认知框架] + [用户画像] + [线程历史] + [RAG 检索]

4. 对话（文字 / 语音）
   → Speechmatics ASR → Rasa CALM → action_persona_chat → Chroma RAG → Nebius LLM → Rime TTS

5. 切换专家
   → 新专家继承完整线程历史
   → 新专家可引用前一个专家的发言

6. 邮件导出
   → "把这次讨论发到我的邮箱" → LLM 生成 summary → SMTP 发送
```

---

## 6. 系统架构概览

```
Browser (Next.js 15)
  ├── ExpertsLibrary  → GET /api/experts  → FastAPI :8080
  ├── AddExpertModal  → POST /api/experts → distillation.py (4-phase)
  ├── VoiceCenter     → POST /webhooks/rest/webhook → Rasa CALM :5005
  ├── UserInfoPanel   → GET/PUT /api/user/{id}
  ├── TasksPanel      → GET /api/threads
  └── ChatPreview     → GET /api/threads/{id}

FastAPI :8080 (api_server.py)
  ├── persona_store.py  ← config.yml + .data/personas/*.json
  ├── distillation.py   ← 女娲蒸馏引擎
  ├── store.py          ← .data/threads/*.json + .data/users/*.json
  └── worker/scheduler.py ← APScheduler（Always-On）

Rasa CALM :5005
  └── action_persona_chat.py ← ChromaDB RAG + Nebius LLM

ChromaDB (.data/chroma_db/)
  └── persona_{id}/  ← tweets + wiki_summary + framework_summary
```

---

## 7. 非功能需求

| 指标 | 目标 |
|------|------|
| ASR → LLM → TTS 全链路 | < 3 秒 |
| 人格切换延迟 | < 500ms |
| 女娲蒸馏时间 | 30-45 秒（6 并行 LLM calls + synthesis） |
| 知识刷新周期 | 可配置，默认 6 小时 |
| Demo 并发用户 | 1-5 人 |
| 文字模式 | 语音不可用时必须完全可用 |

---

## 8. Hackathon 范围

### In Scope

- 预置 5 个专家人格
- 用户自定义蒸馏新专家（女娲蒸馏，Method B）
- Expert Library 页面
- 语音输入 + 语音输出
- 人格切换（UI + 语音）
- 跨人格共享线程记忆
- 用户画像记忆
- Chroma RAG 检索
- 认知框架注入 system prompt
- Always-On Worker 知识刷新 + briefing 演示
- 邮件导出

### Out of Scope (v1)

- 实时 X API 抓取（预存 JSON 替代）
- 用户账号系统
- 移动端原生 App
- 多用户实时协作
- 生产级语音克隆
- 云端长期存储 / 付费系统

---

## 9. 成功指标

### Hackathon

- [ ] 5 个预置专家正常切换对话
- [ ] 用户可蒸馏新专家并立即对话
- [ ] 跨人格线程历史正确传递
- [ ] 语音输入输出正常工作
- [ ] Always-On Worker 可演示
- [ ] 邮件导出完整聊天记录
- [ ] 完整 Demo 流程 ≤ 3 分钟

### 产品质量

- [ ] 不同专家回复风格有明显差异（认知框架生效）
- [ ] 专家能引用前一个专家的发言
- [ ] 系统不伪造具体事实
- [ ] 文字模式在语音失败时完全可用

---

## 10. 核心产品原则

HuddleX 不是在冒充真实人物。它基于公开信息模拟"受专家启发的视角"，帮助用户从多个认知框架对比分析问题。

每个专家人格都是 AI 生成的视角模型，不代表真实人物的实际观点。



# EN
# PRD — HuddleX

> Your AI Expert Council for Better Decisions
> Boston Tech Week Hackathon 2026

---

## 1. Product Overview

HuddleX 是一个面向 brainstorm、创业决策、产品判断和学习研究场景的 **AI 专家辅助决策团队**。

用户可以在一个对话主题中召集多个“专家人格”，这些人格基于公开资料构建，包括 X 帖子、Wikipedia、文章、访谈、播客字幕、新闻报道和外部评价等。每个专家人格都有独立的知识库、表达风格、思维模型和观点边界。

用户可以通过文字或语音与不同专家对话，也可以在同一条对话线程中随时切换专家。新切换的专家会继承当前主题的上下文，并基于自己的知识背景和思维方式继续参与讨论。

---

## 2. Problem Statement

在 brainstorming 和决策过程中，用户往往希望获得不同领域、不同风格、不同认知框架下的反馈。

但现实中存在几个问题：

1. **优质创作者和专家的内容分散**
   他们的观点可能散落在 X、Wikipedia、文章、播客、访谈、newsletter 和新闻中，用户难以系统整理。

2. **用户无法直接与这些专家对话**
   即使用户长期关注某位创作者，也只能被动阅读内容，不能围绕自己的具体问题进行互动式讨论。

3. **单一 AI 人格容易缺少视角差异**
   通用 AI 可以回答问题，但很难稳定模拟多个不同专家的思考方式、表达风格和判断偏好。

4. **跨视角讨论缺少连续记忆**
   用户在不同 AI 角色之间切换时，往往需要重复背景信息，讨论缺少连续性。

---

## 3. Solution

HuddleX 构建一个多人格 AI 专家团队。每个人格都对应一位公开人物、创作者、企业家、研究者或行业专家。

每个专家人格由两部分组成：

1. **专家知识与思维模型**

   * X / Twitter 内容
   * Wikipedia 条目
   * 文章、著作、newsletter
   * 播客、访谈字幕
   * 外部评价与批评
   * 重大决策案例
   * 人生轨迹与时间线
   * 个人表达风格和金句模式

2. **用户个人上下文**

   * 用户当前讨论主题
   * 用户提供的背景信息
   * 用户偏好、目标、限制条件
   * 当前对话中其他专家已经说过的内容

最终体验是：用户可以像召集一个小型专家圆桌一样，让不同专家人格围绕同一个问题轮流给出观点、反驳、补充和建议。

---

## 4. Core Use Case

用户正在思考一个产品、创业方向、内容选题或职业决策。

用户打开 HuddleX，选择一个对话主题，例如：

> “我想做一个 always-on AI coworker 产品，应该怎么定位？”

用户可以先选择一个专家人格，例如 “Elon-style Builder”，获得激进产品视角；随后切换到 “Paul Graham-style Startup Advisor”，获得创业和用户需求视角；再切换到 “Naval-style Thinker”，获得长期价值和个人杠杆视角。

每个专家都知道前面讨论过什么，但会从自己的角度继续回应。

---

## 5. Target Users

### 5.1 Primary Users

* 重度内容消费者
* 科技、商业、创意领域的创作者关注者
* 正在做产品、创业、hackathon 或 side project 的学生 / builder
* 希望用 AI 辅助 brainstorm 和决策的人

### 5.2 Secondary Users

* 创业者
* 投资人
* 产品经理
* 自媒体创作者
* 研究者和学生

---

## 6. Product Goals

### 6.1 Hackathon Goals

* 在 3 分钟 demo 内展示完整核心体验
* 支持多个专家人格切换
* 支持跨人格共享上下文
* 支持语音输入与语音输出
* 支持 Always-On briefing 更新
* 支持将当前讨论总结发送到用户邮箱

### 6.2 Long-term Goals

* 成为用户的 AI 专家决策委员会
* 支持用户自定义添加专家
* 支持多专家同时讨论和辩论
* 支持长期记忆和个人决策档案
* 支持从用户关注内容中自动生成专家人格

---

## 7. Key Concepts

### 7.1 Expert Persona

Expert Persona 指一个基于公开资料构建的 AI 人格。每个人格拥有：

* 独立知识库
* 独立表达风格
* 独立声音
* 独立思维模型
* 明确的能力边界和诚实边界

### 7.2 Shared Conversation Thread

用户的每一个讨论主题都是一个独立 conversation thread。多个专家人格可以在同一个 thread 中轮流发言。

切换人格时，新人格可以读取：

* 当前主题
* 用户背景
* 之前的完整对话
* 其他专家已经给出的观点
* 当前专家自己的知识库和 briefing

### 7.3 Always-On Layer

Always-On Layer 是后台持续运行的专家知识刷新和 briefing 生成层。

在 hackathon v1 中，它主要用于演示：

* 定时读取预存专家资料 JSON
* 更新各专家的 Chroma 向量集合
* 为每位专家生成今日 briefing
* 提供 worker health check

---

## 8. Input and Output

### 8.1 Inputs

#### Expert Data Inputs

每个专家人格可以绑定以下数据源：

* X / Twitter posts
* Wikipedia page
* Articles / writings / newsletters
* Podcast transcripts
* Interview transcripts
* Public talks
* News coverage
* External reviews and criticism
* Decision case studies
* Timeline data

Hackathon v1 中，数据源使用预存 JSON 或 markdown 文件，不实时抓取 X API。

#### User Inputs

用户可以输入：

* 当前讨论主题
* 个人背景
* 目标
* 偏好
* 限制条件
* 想切换到的专家人格
* 是否需要导出总结

输入方式包括：

* 文字输入
* 语音输入
* UI 点击选择专家人格

---

### 8.2 Outputs

系统输出包括：

* 当前专家人格的文字回复
* 当前专家人格的语音回复
* 专家切换后的上下文承接回复
* 每位专家的今日 briefing
* 当前讨论主题的 summary
* 邮件导出的聊天记录和总结附件

---

## 9. Persona Distillation Pipeline

专家人格生成流程分为四个阶段。

### Phase 1 — Parallel Research Agents

系统为每个专家运行 6 个并行 research agents，分别提取不同维度的信息。

```text
01-writings.md
→ 著作、文章、newsletter、公开长文

02-conversations.md
→ 播客、访谈、公开对话
→ 包括 download_subtitles 和 srt_to_transcript

03-expression-dna.md
→ X 风格、表达习惯、常用句式、金句模式

04-external-views.md
→ 他人评价、批评、争议和外部观察

05-decisions.md
→ 重大决策案例、关键判断、成功与失败案例

06-timeline.md
→ 人生轨迹、职业路径、关键转折点
```

### Phase 1.5 — Merge Research

将 6 个 research agents 的结果合并成统一专家资料。

输出内容包括：

* 事实背景
* 观点主题
* 表达风格
* 决策案例
* 外部评价
* 时间线
* 可引用素材

### Phase 2 — Mind Model Extraction

从专家资料中提炼心智模型。

输出内容包括：

* 这个专家如何判断机会
* 这个专家如何看待风险
* 这个专家如何做取舍
* 这个专家如何定义成功
* 这个专家经常使用的思考框架
* 这个专家倾向支持或反对什么

### Phase 3 — Anti-patterns and Honesty Boundaries

提炼人格边界，避免过度幻觉或过度拟人化。

输出内容包括：

* 这个专家不应该回答什么
* 哪些内容缺少公开依据
* 哪些观点只是推测
* 哪些语气或表达不应该模仿
* 哪些领域必须明确“不确定”

### Phase 4 — Quality Check

对专家人格进行质量检查。

检查维度包括：

* 是否忠于公开资料
* 是否有稳定表达风格
* 是否能承接用户上下文
* 是否避免伪造具体事实
* 是否清晰区分事实、推测和建议
* 是否适合 3 分钟 demo 展示

---

## 10. Core Features

### 10.1 Expert Persona System

| Feature                | Description                               |
| ---------------------- | ----------------------------------------- |
| Expert Library         | 首页展示预置专家人格卡片，包括头像、姓名、标签和今日 briefing       |
| Persona Profile        | 每个专家绑定独立资料，包括 X、Wikipedia、文章、访谈和 timeline |
| Persona Knowledge Base | 每个专家拥有独立 Chroma collection，用于 RAG 检索      |
| Persona Voice          | 每个专家绑定独立 Rime TTS voice profile           |
| Persona Switching      | 用户可以通过 UI 或语音命令切换专家                       |
| Persona Boundary       | 每个专家有诚实边界，避免无依据模仿或伪造事实                    |

---

### 10.2 Conversation Memory

| Feature                 | Description                      |
| ----------------------- | -------------------------------- |
| Shared Thread History   | 同一个讨论主题下，所有专家共享完整对话历史            |
| User Profile Memory     | 用户可以告诉系统自己的背景、目标、偏好和限制条件         |
| System Prompt Injection | 切换专家时，动态注入专家知识、用户偏好和当前 thread 历史 |
| Persistent Storage      | Hackathon v1 使用 JSON 持久化对话历史     |
| Context Handoff         | 新专家可以引用前一个专家的观点并继续讨论             |

---

### 10.3 Voice Interaction

| Feature              | Description                                   |
| -------------------- | --------------------------------------------- |
| Voice Input          | 使用 Speechmatics ASR 将用户语音转为文本                 |
| Voice Output         | 使用 Rime TTS 生成当前专家人格的语音回复                     |
| Voice Persona Switch | 用户说 “Switch to [persona]” 或 “切换到 [专家名]” 后触发切换 |
| Text + Voice Sync    | 页面同时展示文字回复和语音播放                               |
| Manual Fallback      | 语音不可用时，用户仍可通过文字和按钮完成所有核心流程                    |

---

### 10.4 Always-On Background Layer

| Feature             | Description                                     |
| ------------------- | ----------------------------------------------- |
| Scheduled Refresh   | 使用 APScheduler 定时读取预存 JSON / markdown           |
| Knowledge Update    | 更新每个专家对应的 Chroma collection                     |
| Daily Briefing      | 每次刷新后，为每个专家生成今日 briefing                        |
| Worker Health Check | Worker 暴露 `/worker/health` 端点                   |
| Last Run Status     | 记录最近一次成功刷新时间                                    |
| Demo Mode           | Hackathon demo 中可手动触发一次 refresh，展示 Always-On 能力 |

---

### 10.5 Email Export

| Feature            | Description                         |
| ------------------ | ----------------------------------- |
| Summary Generation | 用户可以要求系统总结当前讨论主题                    |
| Chat Log Export    | 系统导出完整聊天记录                          |
| Email Agent        | 系统读取用户 profile 中的邮箱地址               |
| Attachment Export  | 邮件附带两份附件：完整聊天记录和 summary            |
| Demo Command       | 用户可以说：“把这个主题的讨论记录和 summary 发到我的邮箱。” |

---

## 11. User Flow

### 11.1 Home Page

用户打开 Web App 后，看到两个核心区域：

1. **Expert Library**

   * 专家头像
   * 专家姓名
   * 专家标签
   * 今日 briefing
   * 当前是否在线 / 可用

2. **Conversation Threads**

   * 最近打开的讨论主题
   * 每个主题的标题、最近发言专家、更新时间

---

### 11.2 Start a New Conversation

```text
User opens Web App
  ↓
Clicks “New Huddle”
  ↓
Enters a discussion topic
  ↓
Selects first expert persona
  ↓
Conversation thread is created
```

系统初始化该 conversation thread，并加载：

```text
[Selected Expert Knowledge]
+ [Expert Daily Briefing]
+ [User Profile]
+ [Current Topic]
+ [Thread History]
```

---

### 11.3 Text / Voice Conversation

```text
User speaks or types a question
  ↓
Speechmatics ASR converts voice to text
  ↓
Rasa CALM handles intent and flow
  ↓
Action Server retrieves relevant expert knowledge from Chroma
  ↓
Nebius LLM generates response
  ↓
Rime TTS generates expert voice
  ↓
Text and audio response are shown in UI
```

---

### 11.4 Switch Expert Persona

```text
User clicks an expert card
or says “Switch to [Expert Name]”
  ↓
Rasa CALM triggers switch_persona flow
  ↓
Action Server loads new expert profile
  ↓
System prompt is rebuilt
  ↓
New expert receives:
  - user topic
  - user profile
  - previous expert discussion
  - own knowledge base
  - own briefing
  ↓
New expert continues the discussion
```

Example response:

> “I saw that you just discussed market positioning with the previous expert. I’ll approach this from a product strategy perspective…”

---

### 11.5 Export Discussion to Email

```text
User says:
“Send this discussion and summary to my email.”
  ↓
System identifies current thread
  ↓
LLM generates structured summary
  ↓
System exports:
  - full chat log
  - concise summary
  ↓
Email agent reads user email from profile
  ↓
Email is sent with two attachments
```

---

## 12. System Architecture

### 12.1 Frontend

* React
* Responsive H5 Web App
* Expert cards
* Conversation interface
* Voice input button
* Persona switch UI
* Briefing display
* Export button

### 12.2 Conversation Orchestration

* Rasa CALM
* Flow-based persona switching
* Intent handling
* Tool / action routing

### 12.3 LLM Layer

* Nebius LLM
* Expert response generation
* Summary generation
* Briefing generation
* Persona reasoning

### 12.4 RAG Layer

* Chroma
* One collection per expert persona
* Stores expert documents, posts, timeline, decision cases and briefing data

### 12.5 Voice Layer

* Speechmatics for ASR
* Rime for TTS
* One TTS voice profile per expert persona

### 12.6 Background Worker

* APScheduler
* Periodic knowledge refresh
* Briefing generation
* Worker health check endpoint

### 12.7 Storage

Hackathon v1 uses lightweight local storage:

* `personas/*.json`
* `personas/*.md`
* `threads/*.json`
* `user_profile.json`
* Chroma local persistence

---

## 13. Non-functional Requirements

| Metric                    | Target                                                     |
| ------------------------- | ---------------------------------------------------------- |
| ASR → LLM → TTS latency   | < 3 seconds                                                |
| Persona switching latency | < 500ms                                                    |
| Knowledge refresh cycle   | Configurable, default every 6 hours                        |
| Demo concurrency          | 1–5 users                                                  |
| Data persistence          | Local JSON + Chroma                                        |
| Failure fallback          | Text mode must work even if voice fails                    |
| Demo reliability          | Core flow should work without live external API dependency |

---

## 14. Hackathon Scope

### 14.1 In Scope

* Preconfigured expert personas
* Expert library page
* Conversation thread page
* Manual persona switching
* Voice-based persona switching
* Text conversation
* Voice input and output
* Chroma-based RAG
* Shared thread memory
* User profile memory
* Always-On worker demo
* Daily briefing generation
* Email export demo

### 14.2 Out of Scope for v1

* End-user custom expert creation
* Real-time X API fetching
* Full user account system
* Mobile native app
* Long-term cloud storage
* Payment system
* Real-time multi-user collaboration
* Fully automated podcast crawling
* Production-grade voice cloning
* Legal impersonation handling beyond demo disclaimer

---

## 15. Demo Script

Target demo length: under 3 minutes.

### Step 1 — Open HuddleX

Show the home page with expert cards and today’s briefing.

Narration:

> “HuddleX lets you build an AI expert council from the thinkers and creators you follow.”

### Step 2 — Start a New Huddle

User creates a new topic:

> “Should I build an always-on AI coworker product for marketers?”

Select the first expert persona.

### Step 3 — Talk to Expert 1

Expert 1 gives a response based on its knowledge base and style.

Show:

* RAG-backed answer
* Expert voice output
* Text response

### Step 4 — Switch to Expert 2

User says:

> “Switch to [Expert 2].”

Expert 2 responds while referencing the previous discussion.

### Step 5 — Show Always-On Briefing

Open expert card and show refreshed briefing.

Explain:

> “The background worker periodically refreshes each expert’s knowledge and generates daily briefing.”

### Step 6 — Export to Email

User says:

> “Send this discussion and summary to my email.”

System sends:

* Full chat log
* Structured summary

---

## 16. Success Metrics

### Hackathon Success Criteria

* [ ] At least 5 expert personas are available
* [ ] User can switch personas through UI
* [ ] User can switch personas through voice
* [ ] Each persona retrieves from its own Chroma collection
* [ ] Cross-persona thread history works correctly
* [ ] Voice input and voice output work
* [ ] Always-On worker can refresh briefing
* [ ] Email export sends chat log and summary
* [ ] Full demo can be completed within 3 minutes

### Product Quality Criteria

* [ ] Expert responses feel meaningfully different
* [ ] Experts can reference prior discussion
* [ ] System avoids pretending to be the real person
* [ ] System clearly separates facts, opinions and speculative advice
* [ ] Text fallback works when voice fails
* [ ] Demo does not depend on unstable live scraping

---

## 17. Key Product Principle

HuddleX is not trying to impersonate real people.

It is designed to simulate expert-inspired perspectives based on public information, so users can make better decisions by comparing multiple viewpoints.

The product should always make clear that each expert persona is an AI-generated perspective model, not the actual person.

