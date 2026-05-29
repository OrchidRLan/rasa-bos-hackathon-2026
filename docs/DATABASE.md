# DATABASE — EchoSphere

> 所有数据存储均为本地文件（hackathon 阶段），无需外部数据库服务。

---

## 1. 文件目录结构

```
.data/
├── personas/                    # 人格原始数据 (JSON)
│   ├── elon_musk.json
│   ├── sam_altman.json
│   ├── paul_graham.json
│   ├── persona_d.json
│   └── persona_e.json
├── threads/                     # 对话线程历史，按 thread_id 分文件
│   ├── {thread_id}.json         # 线程内跨人格完整消息记录
│   └── ...
├── users/                       # 用户画像 + 全局历史索引
│   └── {user_id}.json           # user_context + 所有线程索引 + 全局摘要
├── chroma_db/                   # Chroma 向量库（自动生成）
│   ├── persona_elon_musk/
│   ├── persona_sam_altman/
│   └── ...
└── worker_state.json            # Always-On Worker 状态记录
```

---

## 2. 人格数据 Schema

**文件**: `.data/personas/{persona_id}.json`

```json
{
  "id": "elon_musk",
  "display_name": "Elon Musk",
  "handle": "@elonmusk",
  "description": "Tech entrepreneur, CEO of Tesla, SpaceX, and xAI",
  "wikipedia_url": "https://en.wikipedia.org/wiki/Elon_Musk",
  "rime_voice_id": "voice_elon_001",
  "avatar_path": "assets/personas/elon.jpg",
  "personality_traits": ["direct", "first-principles", "provocative", "visionary"],
  "speaking_style": "Talks in short punchy sentences. Uses memes. References physics and engineering.",

  "wikipedia": {
    "summary": "Elon Reeve Musk is a businessman known for...",
    "key_facts": [
      "Born June 28, 1971, in Pretoria, South Africa",
      "Founded SpaceX in 2002",
      "Acquired Twitter (now X) in 2022"
    ],
    "last_fetched": "2026-05-01T00:00:00Z"
  },

  "x_posts": [
    {
      "id": "tweet_001",
      "text": "The thing I find most surprising about AI progress is...",
      "date": "2026-05-10T14:32:00Z",
      "likes": 82000,
      "reposts": 14000,
      "topics": ["AI", "technology"]
    },
    {
      "id": "tweet_002",
      "text": "Manufacturing is the hardest part of any hardware startup",
      "date": "2026-05-08T09:15:00Z",
      "likes": 45000,
      "reposts": 8000,
      "topics": ["manufacturing", "startups"]
    }
  ],

  "briefing": {
    "text": "近期 Elon 主要关注：xAI Grok 3 发布后的市场反应，特斯拉 FSD v14 进展，以及对 AI 监管的看法。",
    "generated_at": "2026-05-29T06:00:00Z",
    "source_post_count": 342
  }
}
```

**字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，用于 Chroma collection 命名和 slot |
| `display_name` | string | 展示名 |
| `handle` | string | X 账号 |
| `rime_voice_id` | string | Rime TTS voice profile ID |
| `personality_traits` | string[] | 用于 system prompt 注入 |
| `speaking_style` | string | 风格描述，注入 system prompt |
| `wikipedia.summary` | string | Wikipedia 摘要全文 |
| `x_posts` | object[] | 预存 X 帖子列表 |
| `x_posts[].topics` | string[] | 帖子主题标签（用于检索过滤） |
| `briefing.text` | string | Always-On Worker 生成的今日摘要 |
| `briefing.generated_at` | ISO8601 | 最后生成时间 |

---

## 3. 记忆两层模型

记忆分两层独立统计，人格每次回复时两层都注入 system prompt：

| 层级 | 范围 | 存储 | 注入方式 |
|------|------|------|---------|
| **线程历史** | 当前对话线程内所有消息（跨人格） | `.data/threads/{thread_id}.json` | 最近 N 条原文 |
| **全局历史** | 用户所有线程的压缩摘要 | `.data/users/{user_id}.json` | LLM 生成摘要（~100字） |

---

### 3a. 线程数据 Schema

**文件**: `.data/threads/{thread_id}.json`

> 每个对话线程一个文件。线程内历史跨人格共享——切换人格后新人格能看到本线程完整记录。

```json
{
  "thread_id": "thread_abc123",
  "user_id": "user_001",
  "title": "AGI 安全与创业",
  "created_at": "2026-05-29T10:00:00Z",
  "last_active": "2026-05-29T11:30:00Z",
  "active_persona_id": "sam_altman",
  "personas_involved": ["elon_musk", "sam_altman"],

  "thread_history": [
    {
      "id": "msg_001",
      "timestamp": "2026-05-29T10:01:00Z",
      "persona_id": "elon_musk",
      "role": "user",
      "content": "你觉得 AI 安全最大的挑战是什么？",
      "voice_input": true
    },
    {
      "id": "msg_002",
      "timestamp": "2026-05-29T10:01:05Z",
      "persona_id": "elon_musk",
      "role": "assistant",
      "content": "对齐问题比大多数人想象的要难得多...",
      "retrieved_chunks": ["chunk_id_042", "chunk_id_107"]
    },
    {
      "id": "msg_003",
      "timestamp": "2026-05-29T10:15:00Z",
      "persona_id": "sam_altman",
      "role": "system_event",
      "content": "[PERSONA_SWITCH: elon_musk → sam_altman]"
    },
    {
      "id": "msg_004",
      "timestamp": "2026-05-29T10:15:30Z",
      "persona_id": "sam_altman",
      "role": "assistant",
      "content": "我看到你之前和 Elon 聊了对齐问题，从 OpenAI 的角度来看...",
      "retrieved_chunks": ["chunk_id_218"]
    }
  ]
}
```

**字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| `thread_id` | string | 唯一线程 ID，与 Rasa `sender_id` 对应 |
| `title` | string | 线程标题（首条消息后 LLM 自动生成，或用户命名） |
| `active_persona_id` | string | 当前激活人格 |
| `personas_involved` | string[] | 本线程出现过的人格列表 |
| `thread_history[].persona_id` | string | 该消息发生时的激活人格 |
| `thread_history[].role` | enum | `user` / `assistant` / `system_event` |
| `thread_history[].retrieved_chunks` | string[] | RAG 命中的 chunk ID（调试用） |
| `thread_history[].voice_input` | bool | 是否来自语音输入 |

---

### 3b. 用户画像 Schema（全局）

**文件**: `.data/users/{user_id}.json`

> 跨所有线程的用户信息。`global_summary` 由 Always-On Worker 或线程结束时触发 LLM 压缩生成，避免 token 爆炸。

```json
{
  "user_id": "user_001",
  "created_at": "2026-05-29T10:00:00Z",

  "user_context": {
    "name": "Alex",
    "role": "AI startup founder",
    "interests": ["AGI", "product design", "fundraising"],
    "raw_description": "我是做 AI SaaS 的创业者，最近在融 A 轮...",
    "updated_at": "2026-05-29T10:05:00Z"
  },

  "threads": [
    {
      "thread_id": "thread_abc123",
      "title": "AGI 安全与创业",
      "created_at": "2026-05-29T10:00:00Z",
      "last_active": "2026-05-29T11:30:00Z",
      "personas_involved": ["elon_musk", "sam_altman"],
      "message_count": 18
    },
    {
      "thread_id": "thread_xyz456",
      "title": "如何做 A 轮 pitch",
      "created_at": "2026-05-28T15:00:00Z",
      "last_active": "2026-05-28T16:20:00Z",
      "personas_involved": ["paul_graham"],
      "message_count": 32
    }
  ],

  "global_summary": {
    "text": "Alex 是 AI SaaS 创业者，正在融 A 轮。过去与 Elon 深入讨论了 AGI 对齐问题，与 Sam 探讨了 OpenAI 的安全策略，与 PG 反复打磨了 pitch 叙事。核心关注：技术路线选择、投资人沟通、产品 PMF。",
    "generated_at": "2026-05-29T06:00:00Z",
    "thread_count": 2,
    "total_messages": 50
  }
}
```

**字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| `user_context` | object | 用户自我描述，所有线程共享 |
| `threads` | object[] | 所有线程的轻量索引（不含消息体） |
| `global_summary.text` | string | LLM 压缩的跨线程摘要，注入 system prompt |
| `global_summary.generated_at` | ISO8601 | 最后压缩时间 |

---

## 4. Chroma 向量库结构

每个人格对应一个独立 Chroma collection：

**Collection 命名**: `persona_{persona_id}`（例：`persona_elon_musk`）

**Document 结构**（每条 X 帖子 / Wikipedia 段落是一个 doc）：

```python
collection.add(
    ids=["tweet_001", "tweet_002", "wiki_001"],
    documents=[
        "The thing I find most surprising about AI progress is...",
        "Manufacturing is the hardest part of any hardware startup",
        "Elon Musk was born on June 28, 1971..."
    ],
    metadatas=[
        {"type": "tweet", "date": "2026-05-10", "topics": "AI,technology", "likes": 82000},
        {"type": "tweet", "date": "2026-05-08", "topics": "manufacturing,startups", "likes": 45000},
        {"type": "wikipedia", "section": "Early life"}
    ]
)
```

**检索示例**

```python
results = collection.query(
    query_texts=["AI safety challenges"],
    n_results=5,
    where={"type": "tweet"}   # 可选：只检索帖子
)
```

---

## 5. Worker 状态 Schema

**文件**: `.data/worker_state.json`

```json
{
  "last_full_run": "2026-05-29T06:00:00Z",
  "next_scheduled_run": "2026-05-29T12:00:00Z",
  "interval_hours": 6,
  "personas": {
    "elon_musk": {
      "embed_status": "ok",
      "last_embed_at": "2026-05-29T06:00:00Z",
      "doc_count": 342,
      "last_briefing_at": "2026-05-29T06:01:30Z"
    },
    "sam_altman": {
      "embed_status": "ok",
      "last_embed_at": "2026-05-29T06:00:00Z",
      "doc_count": 218,
      "last_briefing_at": "2026-05-29T06:02:10Z"
    }
  }
}
```

---

## 6. System Prompt 拼装逻辑

`ActionPersonaChat` 在每次对话时动态拼装以下 5 个 block，两层记忆均注入：

```
[PERSONA DEFINITION]
你是 {display_name}（{handle}）。
你的性格特点：{personality_traits}。
你的说话风格：{speaking_style}。
今日你关注的话题（briefing）：{briefing.text}

[USER CONTEXT]
你正在和 {user_context.name} 对话，他/她是 {user_context.role}。
他/她的兴趣：{user_context.interests}。
背景：{user_context.raw_description}

[GLOBAL HISTORY]                          ← 全局层：跨所有线程的压缩摘要
以下是这位用户过去与各人格对话的总体情况：
{global_summary.text}                     // ~100 字，Always-On Worker 维护

[THREAD HISTORY]                          ← 线程层：当前线程完整消息（原文）
以下是本次对话线程的记录（包含你和其他人格与用户的交流）：
{thread_history[-12:]}                    // 最近 12 条，保证当前线程连贯性

[RETRIEVED KNOWLEDGE]
以下是与当前问题最相关的你的观点/背景（来自 X 帖子和 Wikipedia）：
{top_k_chunks}                            // top-5，Chroma 检索

[INSTRUCTION]
请以 {display_name} 的身份回答用户问题。保持一致的人格特征。
如果 [THREAD HISTORY] 中有其他人格的发言，你可以自然地引用或接续。
回答用中文或英文，与用户语言一致。不要虚构具体事实。
```

**两层记忆的 token 预算参考**

| Block | 预估 token | 说明 |
|-------|-----------|------|
| Persona Definition | ~150 | 固定，每人格不同 |
| User Context | ~100 | 用户自我描述 |
| Global History | ~150 | LLM 压缩摘要，控制在 100 字内 |
| Thread History (12条) | ~800 | 最大变量，可按模型上限调整 |
| Retrieved Knowledge (top-5) | ~600 | 5 条 tweet/wiki 段落 |
| **合计** | **~1800** | 留足空间给回复生成 |
