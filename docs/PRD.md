# PRD — HuddleX
> 你的Experts辅助决策团队· Boston Tech Week Hackathon 2026

---

## 1. 问题陈述

brainstorming的过程中，我们总会希望听到更多视角的内容。用户希望能召集各行业专家。
深度理解并"对话"自己关注的创作者/博主的思维方式，但创作者内容分散（X 帖子、Wikipedia、播客等），且我们无法直接沟通。

## 2. 解决方案

构建一个多人格 AI 伴侣，将最多 5 个博主/创作者的公开知识（X 帖子 + Wikipedia）提炼为独立 AI 人格，用户可随时通过语音或 UI 切换，并维持跨人格的持续对话记忆。
input：
1️⃣agent聊天者setting：读取关注的名人专家的X、维基百科。
2️⃣用户希望agent知道的关于自己的信息、偏好
output流程：
1️⃣用户创建新的名人专家档案，启动蒸馏技能（ Phase 1 (6个并行Agent)
    01-writings.md     ← 著作/文章/newsletter
    02-conversations.md ← 播客/访谈 + download_subtitles + srt_to_transcript
    03-expression-dna.md ← X风格/金句
    04-external-views.md ← 他人评价/批评
    05-decisions.md    ← 重大决策案例
    06-timeline.md     ← 人生轨迹时间线
  Phase 1.5: merge_research 
  Phase 2-3: 提炼心智模型、反模式、诚实边界
  Phase 4: quality_check）
2️⃣AGENT有多个人格，每个人格对应一个人物的资料，用户用prompt切换人格。agent会实时读取的记忆包括：切换到的人格的知识储备、该对话框之前别的人格和用户的交流记录、用户的系统prompt
*用户用voice/手动介绍切换


---

## 3. 目标用户

- 重度内容消费者，关注科技/商业/创意领域博主
- 希望测试想法、获取特定视角的创业者/学生
- 想用 AI 陪伴但对单一人格感到无聊的用户

---

## 4. 核心功能

### 4.1 人格系统

| 功能 | 描述 |
|------|------|
| 人格配置 | 管理员预先配置 5 个博主人格，每个人格绑定 X 账号 + Wikipedia 条目等 |
| 人格知识库 | 每个人格有独立 Chroma 向量集合，存储该博主的 X 帖子 + Wikipedia 摘要的 embedding |
| 人格声音 | 每个人格绑定独立 Rime TTS voice profile |
| 人格切换 | 用户通过 UI 按钮或语音命令（"切换到 XXX 模式"）切换，CALM flow 处理切换逻辑 |

### 4.2 对话记忆

| 功能 | 描述 |
|------|------|
| 跨人格共享历史 | 所有人格共享同一对话线程，切换后新人格能看到之前对话 |
| 用户画像 | 用户可通过语音/文字告诉系统关于自己的信息和偏好，存入 system prompt |
| 会话持久化 | 对话历史持久化到 JSON，重启后保留 |

### 4.3 语音交互

| 功能 | 描述 |
|------|------|
| 语音输入 | Speechmatics ASR 实时识别用户语音 |
| 语音输出 | Rime TTS 合成当前人格的回复 |
| 语音切换 | 用户说"切换到 [人格名]"触发 CALM 切换 flow |

### 4.4 Always-On # PRD — HuddleX

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


| 功能 | 描述 |
|------|------|
| 知识刷新 | APScheduler 定时（默认每 6 小时）读取预存 JSON，更新各人格 Chroma 集合 |
| Briefing 生成 | 每次刷新后，用 LLM 为每个人格生成当日 briefing（近期关注话题摘要） |
| 健康检查 | Worker 提供 `/worker/health` 端点，记录最后一次成功运行时间 |

---

## 5. 用户流程

```
1. 用户打开 Web App
   └─▶ ①看到专家人才库 人格卡片（头像、姓名、今日 briefing等）②开过的对话框

2. 用户开启一个新的对话主题
在这条对话记录里能
点击/说出选择某个人格
   └─▶ CALM flow 激活 switch_persona
       └─▶ Action server 加载该人格的 Chroma 集合 + briefing + 此对话框用户和其他人格的对话记录
           └─▶ 对话框激活，system prompt 注入：
               [人格知识] + [用户偏好] + [跨人格历史]

3. 用户开始对话（文字 / 语音）
   └─▶ Speechmatics ASR 转文字（语音路径）
       └─▶ Rasa CALM 处理意图
           └─▶ Nebius LLM 生成回复（RAG 检索该人格知识）
               └─▶ Rime TTS 合成语音 + 文字回复展示

4. 用户切换人格
   └─▶ 新人格接收完整历史 + 新 system prompt
       └─▶ 新人格可以说："我看到你之前和 [前人格] 讨论了 XXX..."

5. 用户说“把这个主题我们的讨论的聊天记录及summary发到我的邮箱”，调用mail的agent+ 读用户profile里的邮箱。发两份附件。
```

---

## 6. 非功能需求

| 指标 | 目标 |
|------|------|
| 语音延迟 | ASR → TTS 全链路 < 3s |
| 人格切换延迟 | < 500ms（Chroma 集合切换） |
| 知识刷新周期 | 可配置，默认 6 小时 |
| 并发用户 | Hackathon demo 阶段：1-5 用户 |

---

## 7. Hackathon 范围外（v1 不做）

- 实时 X API 抓取（用预存 JSON 替代）
- 用户自定义添加博主
- 多语言支持（默认中/英双语）
- 用户账号系统
- 移动端 App

---

## 8. 成功指标（Hackathon）

- [ ] 5 个人格可正常切换且对话
- [ ] 跨人格历史正确传递
- [ ] 语音输入/输出正常工作
- [ ] Always-On Worker 可演示知识刷新
- [ ] Demo 时间 ≤ 3 分钟内完整展示核心流程
