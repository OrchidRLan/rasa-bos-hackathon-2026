# DATABASE — HuddleX

> 所有数据存储均为本地文件（hackathon 阶段），无需外部数据库服务。

---

## 1. 文件目录结构

```
data/
└── personas/
    ├── config.yml                    # 专家配置（id, x_handle, wikipedia_url, avatar_color…）
    └── raw/
        └── {id}_tweets.json          # 预抓取的 X 帖子（mock 模式使用）

.data/
├── personas/                         # 蒸馏后的完整专家数据
│   ├── elon_musk.json
│   ├── sam_altman.json
│   ├── richard_feynman.json          # 用户蒸馏后自动生成
│   └── ...
├── threads/                          # 对话线程历史，按 thread_id 分文件
│   └── {thread_id}.json
├── users/                            # 用户画像 + 全局摘要索引
│   └── {user_id}.json
├── chroma_db/                        # Chroma 向量库（自动生成）
│   ├── persona_elon_musk/
│   ├── persona_sam_altman/
│   └── persona_richard_feynman/      # 蒸馏专家自动创建
└── worker_state.json                 # Always-On Worker 状态
```

---

## 2. 专家配置 Schema

**文件**: `data/personas/config.yml`

```yaml
personas:
  - id: elon_musk
    display_name: Elon Musk
    x_handle: "@elonmusk"
    x_posts_file: data/personas/raw/elon_musk_tweets.json
    wikipedia_url: https://en.wikipedia.org/wiki/Elon_Musk
    rime_voice_id: ""
    avatar_color: from-slate-700 to-slate-900
    initials: EM
  # 用户蒸馏后追加新条目
  - id: richard_feynman
    display_name: Richard Feynman
    x_handle: "@richard_feynman"
    wikipedia_url: https://en.wikipedia.org/wiki/Richard_Feynman
    avatar_color: from-rose-600 to-pink-900
    initials: RF
```

---

## 3. 专家数据 Schema

**文件**: `.data/personas/{persona_id}.json`

```json
{
  "id": "elon_musk",
  "display_name": "Elon Musk",
  "handle": "@elonmusk",
  "description": "",
  "wikipedia_url": "https://en.wikipedia.org/wiki/Elon_Musk",
  "rime_voice_id": "",
  "personality_traits": ["First Principles Thinking", "Asymmetric Risk Taking"],
  "speaking_style": "Direct, provocative. Short punchy sentences.",

  "wikipedia": {
    "summary": "Elon Reeve Musk is a businessman known for...",
    "key_facts": [],
    "last_fetched": "2026-05-29T06:00:00Z"
  },

  "x_posts": [
    {
      "id": "tweet_001",
      "text": "The thing I find most surprising about AI progress is...",
      "created_at": "2026-05-10T14:32:00Z",
      "metrics": { "like_count": 82000, "retweet_count": 14000 },
      "source": "x_api_v2"
    }
  ],

  "cognitive_framework": {
    "mental_models": [
      {
        "name": "First Principles Thinking",
        "description": "Decomposes every problem to physical limits before engineering",
        "signature_phrase": "What does physics say is possible?",
        "limitation": "Underweights institutional knowledge and social friction"
      }
    ],
    "decision_heuristics": [
      "Optimize for the physically possible, not the historically precedented",
      "If the obvious thing hasn't been tried, try it"
    ],
    "expression_dna": {
      "tone": "Direct, provocative",
      "sentence_style": "Short punchy declarations, occasional meme, no hedging",
      "signature_phrases": ["Obviously", "This is insane", "Actually..."],
      "argument_structure": "State conclusion first, derive from first principles",
      "humor_style": "Deadpan absurdism, self-referential memes"
    },
    "anti_patterns": [
      "Never hedges with 'I think maybe possibly'",
      "Never defers to authority as a reason"
    ],
    "honest_boundaries": [
      "Cannot simulate private communications or internal company decisions",
      "Post-2025 developments are outside training knowledge"
    ],
    "core_tensions": [
      "Believes in human potential but often treats humans as execution problems"
    ],
    "_dimension_notes": {
      "01-writings": "...",
      "02-conversations": "...",
      "03-expression-dna": "...",
      "04-external-views": "...",
      "05-decisions": "...",
      "06-timeline": "..."
    },
    "generated_at": "2026-05-29T10:30:00Z"
  },

  "briefing": {
    "text": "近期 Elon 主要关注：xAI Grok 4 发布后的市场反应...",
    "generated_at": "2026-05-29T06:00:00Z",
    "source_post_count": 342
  }
}
```

**字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，Chroma collection 命名用 |
| `personality_traits` | string[] | 从 `cognitive_framework.mental_models` 名称提取，注入 system prompt |
| `speaking_style` | string | 从 `expression_dna.tone + sentence_style` 生成，注入 system prompt |
| `cognitive_framework` | object | 女娲蒸馏 Phase 2-3 产出，预置专家无此字段 |
| `cognitive_framework.mental_models` | object[] | 3-5 个心智模型，每个含 limitation |
| `cognitive_framework.expression_dna` | object | 表达风格 DNA |
| `cognitive_framework.anti_patterns` | string[] | 专家绝不会做的事 ≥4 条 |
| `cognitive_framework.honest_boundaries` | string[] | 此 AI 角色无法可靠模拟的内容 ≥3 条 |
| `cognitive_framework._dimension_notes` | object | 6 维度调研原始笔记，仅用于溯源 |
| `briefing.text` | string | Always-On Worker 生成的今日摘要 |

---

## 4. 记忆两层模型

| 层级 | 范围 | 存储位置 | system prompt 注入方式 |
|------|------|---------|---------------------|
| **线程历史** | 当前对话线程内所有消息（跨人格共享） | `.data/threads/{thread_id}.json` | 最近 12 条原文 |
| **全局历史** | 用户所有线程的 LLM 压缩摘要 | `.data/users/{user_id}.json` | ~100 字摘要 |

---

## 5. 线程数据 Schema

**文件**: `.data/threads/{thread_id}.json`

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
      "retrieved_chunks": ["wiki_summary", "tweet_001"]
    },
    {
      "id": "msg_003",
      "timestamp": "2026-05-29T10:15:00Z",
      "persona_id": "sam_altman",
      "role": "system_event",
      "content": "[PERSONA_SWITCH: elon_musk → sam_altman]"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `thread_id` | string | 与 Rasa `sender_id` 对应 |
| `personas_involved` | string[] | 本线程出现过的所有专家 |
| `thread_history[].role` | enum | `user` / `assistant` / `system_event` |
| `thread_history[].retrieved_chunks` | string[] | RAG 命中的 chunk ID（调试用） |
| `thread_history[].voice_input` | bool | 是否来自语音输入 |

---

## 6. 用户画像 Schema

**文件**: `.data/users/{user_id}.json`

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
    }
  ],

  "global_summary": {
    "text": "Alex 是 AI SaaS 创业者，正在融 A 轮。...",
    "generated_at": "2026-05-29T06:00:00Z",
    "thread_count": 2
  }
}
```

---

## 7. Chroma 向量库结构

**Collection 命名**: `persona_{persona_id}`

| Document ID | 来源 | metadata.type |
|-------------|------|---------------|
| `tweet_{post_id}` | X 帖子文本 | `tweet` |
| `wiki_summary` | Wikipedia `extract` 字段 | `wikipedia` |
| `wiki_fact_{hash}` | Wikipedia key facts | `wikipedia` |
| `framework_summary` | cognitive_framework 平铺文本 | `cognitive_framework` |

`framework_summary` 仅蒸馏专家有（预置专家无 cognitive_framework）。

```python
# 检索示例
collection.query(
    query_texts=["quantum mechanics teaching"],
    n_results=5
    # 不过滤 type，同时检索 tweets + wiki + framework
)
```

---

## 8. Worker 状态 Schema

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
    }
  }
}
```

---

## 9. System Prompt 拼装逻辑

`action_persona_chat.py` `_build_prompt()` 动态拼装 6 个 block：

```
[PERSONA DEFINITION]
You are {display_name} ({handle}).
Personality traits: {personality_traits}.    ← from mental_models names
Speaking style: {speaking_style}             ← from expression_dna
Today's briefing: {briefing.text}

[COGNITIVE FRAMEWORK — How {name} Thinks]    ← 仅蒸馏专家有此 block
Mental Models:
  • {name}: {description}
    Signature: "{signature_phrase}"
    Limitation: {limitation}
Decision Heuristics:
  • {heuristic}
Expression DNA:
  Tone: ...  Style: ...  Signature phrases: ...
Anti-patterns (NEVER do these):
  ✗ {anti_pattern}
Core Tensions:
  ⟷ {tension}

[USER CONTEXT]
{name}, {role}, interests: {interests}
{raw_description}

[GLOBAL HISTORY]
{global_summary.text}                        ← Always-On Worker 维护，~100字

[THREAD HISTORY]
{thread_history[-12:]}                       ← 最近 12 条原文

[RETRIEVED KNOWLEDGE]
{top_5_chunks}                               ← Chroma top-5 (tweets+wiki+framework)
```

**Token 预算参考**

| Block | 预估 tokens | 说明 |
|-------|------------|------|
| Persona Definition | ~150 | 固定 |
| Cognitive Framework | ~400 | 仅蒸馏专家有；预置专家此 block 为空 |
| User Context | ~100 | 用户自我描述 |
| Global History | ~150 | LLM 压缩摘要 |
| Thread History (12条) | ~800 | 最大变量 |
| Retrieved Knowledge (top-5) | ~600 | tweets + wiki + framework chunks |
| **合计（蒸馏专家）** | **~2200** | — |
| **合计（预置专家）** | **~1800** | 无 Cognitive Framework block |
