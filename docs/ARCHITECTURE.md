# ARCHITECTURE — HuddleX

---

## 系统总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 15 + React 18)                   │
│                                                                         │
│  ┌──────────────────┐  ┌─────────────┐  ┌───────────┐  ┌───────────┐  │
│  │  ExpertsLibrary  │  │ VoiceCenter │  │UserInfo   │  │TasksPanel │  │
│  │  + AddExpert     │  │(chat+voice) │  │Panel      │  │ChatPreview│  │
│  │  Modal           │  │             │  │           │  │           │  │
│  └────────┬─────────┘  └──────┬──────┘  └─────┬─────┘  └─────┬─────┘  │
└───────────┼────────────────────┼───────────────┼──────────────┼────────┘
            │  /api/*            │  /webhooks/*  │  /api/*      │
            ▼                    ▼               ▼              ▼
┌──────────────────────┐   ┌──────────────────────────────────────────┐
│  FastAPI :8080       │   │  Rasa CALM :5005                         │
│  (api_server.py)     │   │                                          │
│                      │   │  Flows:                                  │
│  GET  /api/experts   │   │    switch_persona                        │
│  POST /api/experts   │◄──│    update_user_preference                │
│  GET  /api/user/{id} │   │    general_chat (default)                │
│  PUT  /api/user/{id} │   └────────────────┬─────────────────────────┘
│  GET  /api/threads   │                    │ calls actions
│  GET  /api/threads/  │   ┌────────────────▼─────────────────────────┐
│       {id}           │   │  Action Server (Python :5055)            │
│  GET  /api/x/creator │   │                                          │
│       /{handle}      │   │  action_persona_chat     ← RAG + LLM     │
│  POST /api/notif../  │   │  action_switch_persona   ← slot update   │
│       email/send     │   │  action_update_user_pref ← parse prefs   │
│  GET  /worker/health │   └────────────────┬─────────────────────────┘
│  POST /worker/trigger│                    │
└──────────┬───────────┘          ┌─────────▼──────────────────────────┐
           │                      │  Services                          │
           │                      │                                    │
           │  persona_store.py    │  ChromaDB (.data/chroma_db/)       │
           │  distillation.py     │    persona_{id}/                   │
           │  store.py            │    → tweets + wiki + framework     │
           │                      │                                    │
           │                      │  Nebius LLM (OpenAI-compat API)   │
           │                      │    Qwen3-235B / DeepSeek-V3        │
           └──────────────────────┤                                    │
                                  │  X API (XClient)                   │
                                  │    fetch_creator_posts_by_handle   │
                                  └────────────────────────────────────┘
                                            │
                         ┌──────────────────▼─────────────────────────┐
                         │  Always-On Worker (APScheduler)            │
                         │                                            │
                         │  every 6h:                                 │
                         │    re-fetch X posts (live or mock)         │
                         │    incremental embed → Chroma              │
                         │    LLM → briefing.text (~100 words)        │
                         │    write .data/personas/{id}.json          │
                         │    update .data/worker_state.json          │
                         └────────────────────────────────────────────┘
```

---

## 组件详解

### 1. Frontend (Next.js 15 + React 18 + TypeScript + Tailwind CSS)

| 组件 | 文件 | 职责 |
|------|------|------|
| `ExpertsLibrary` | `components/dashboard/ExpertsLibrary.tsx` | 专家卡片列表，"+" 按钮触发蒸馏 |
| `AddExpertModal` | `components/dashboard/AddExpertModal.tsx` | 女娲蒸馏向导（3步：输入 → 进行中 → 完成） |
| `VoiceCenter` | `components/dashboard/VoiceCenter.tsx` | 主聊天界面，麦克风 toggle，文字输入 |
| `UserInfoPanel` | `components/dashboard/UserInfoPanel.tsx` | 用户画像展示与编辑 |
| `TasksPanel` | `components/dashboard/TasksPanel.tsx` | 所有对话线程列表 |
| `ChatPreview` | `components/dashboard/ChatPreview.tsx` | 最近消息预览（最近 40 条） |
| `useVoiceInput` | `hooks/useVoiceInput.ts` | MediaRecorder + Speechmatics ASR |

**代理路由**（`next.config.ts`）：
- `/api/*` → `localhost:8080`（FastAPI）
- `/webhooks/*` → `localhost:5005`（Rasa CALM）
- `/worker/*` → `localhost:8080`（Worker 状态）

---

### 2. FastAPI REST Server (api_server.py — port 8080)

对外暴露所有 REST 端点，前端直接调用。不经过 Rasa。

| 模块 | 职责 |
|------|------|
| `persona_store.py` | 读取 `data/personas/config.yml` + `.data/personas/{id}.json` |
| `distillation.py` | 女娲蒸馏引擎（4-Phase pipeline，详见下节） |
| `store.py` | Thread / User JSON 读写 |
| `services/x_client.py` | X API v2 客户端，按 handle 抓推文 |
| `services/email_client.py` | SMTP 邮件发送 |

---

### 3. 女娲蒸馏引擎 (distillation.py)

```
POST /api/experts  {display_name, x_handle, wikipedia_url}
        │
        ▼
Phase 1   _fetch_wikipedia()
        │   → Wikipedia REST API → wiki summary text
        ▼
Phase 1.5 _run_all_dimensions()          ← ThreadPoolExecutor(max_workers=6)
        │   6 个并行 LLM calls:
        │     01-writings      著作与系统思考
        │     02-conversations 对话与即兴思考
        │     03-expression-dna 表达DNA
        │     04-external-views 他者视角
        │     05-decisions     决策模式
        │     06-timeline      人生轨迹
        ▼
Phase 2-3 _synthesize_framework()
        │   → 合并 6 维度笔记 → LLM synthesis
        │   → cognitive_framework JSON:
        │       mental_models / decision_heuristics
        │       expression_dna / anti_patterns
        │       honest_boundaries / core_tensions
        ▼
Phase 4   _quality_check()  +  _embed()
        │   → 验证字段完整性
        │   → ChromaDB embed (tweets + wiki + framework_summary)
        │   → 追加 config.yml
        │   → 写 .data/personas/{id}.json
        ▼
返回 Expert 对象（与 GET /api/experts 格式相同）
```

---

### 4. Rasa CALM (port 5005)

| Flow | 触发 | Action |
|------|------|--------|
| `switch_persona` | UI `/switch_persona{...}` 或语音"切换到 XXX" | `action_switch_persona` |
| `update_user_preference` | 用户自我介绍 | `action_update_user_pref` |
| `general_chat` | 默认 fallback | `action_persona_chat` |

---

### 5. action_persona_chat — System Prompt 拼装

每次对话动态拼装 6 个 block：

```
[PERSONA DEFINITION]   display_name + handle + traits + style + briefing
[COGNITIVE FRAMEWORK]  mental_models + heuristics + expression_dna + anti_patterns + tensions
                       ← 仅蒸馏生成的专家有此 block
[USER CONTEXT]         name + role + interests + raw_description
[GLOBAL HISTORY]       LLM 跨线程摘要 (~100 tokens)
[THREAD HISTORY]       最近 12 条消息原文
[RETRIEVED KNOWLEDGE]  Chroma top-5 chunks (tweets + wiki + framework)
```

---

### 6. ChromaDB (本地持久化)

```
.data/chroma_db/
└── persona_{id}/
    ├── tweet_{post_id}     type=tweet
    ├── wiki_summary        type=wikipedia, section=summary
    └── framework_summary   type=cognitive_framework, section=full
                            ← 蒸馏专家新增
```

---

### 7. Always-On Worker (APScheduler)

```
启动时:
  扫描 config.yml → 未初始化的专家全量 embed

每 WORKER_INTERVAL_HOURS (默认 6h):
  for each persona:
    X_API_MODE=live  → 抓最新推文 (XClient)
    X_API_MODE=mock  → 读 data/personas/raw/{id}_tweets.json
    增量 embed 新内容 → Chroma
    LLM 生成 briefing (~100字) → persona JSON
  更新 .data/worker_state.json
```

---

## 关键数据流

### 女娲蒸馏流

```
用户点击 "+" → 填写 Richard Feynman + Wikipedia URL
  → POST /api/experts
  → distillation.py Phase 1-4 (~35s)
  → .data/personas/richard_feynman.json 写入
  → data/personas/config.yml 追加
  → 返回 Expert 对象
  → 前端列表即时显示，可直接开始对话
```

### RAG 对话流

```
用户: "你对量子力学的教学方式怎么看？"（正在与 Richard Feynman 对话）
  → POST /webhooks/rest/webhook
  → action_persona_chat:
      query_embedding = embed(user_message)
      chunks = chroma["persona_richard_feynman"].query(top_k=5)
                        ↑ 包含 wiki_summary + framework_summary
      prompt = [PERSONA DEF] + [COGNITIVE FRAMEWORK] + [USER CTX]
             + [GLOBAL HIST] + [THREAD HIST] + [RETRIEVED]
      reply = Nebius LLM(prompt)
  → Rime TTS → 播放
```

---

## 技术栈总表

| 层 | 技术 | 版本/备注 |
|----|------|---------|
| 前端 | Next.js + React + TypeScript | Next.js 15, React 18, Tailwind CSS |
| REST API | FastAPI + Pydantic | Python，port 8080 |
| 对话引擎 | Rasa CALM | Rasa Pro，port 5005 |
| LLM 推理 | Nebius Token Factory | Qwen3-235B-A22B-Instruct-2507 |
| 向量数据库 | ChromaDB | 本地持久化 |
| Embedding | sentence-transformers | all-MiniLM-L6-v2 |
| 蒸馏并发 | Python ThreadPoolExecutor | max_workers=6，Phase 1.5 |
| 语音输入 | Speechmatics ASR | WebSocket |
| 语音输出 | Rime TTS | REST API |
| X 数据源 | X API v2 | XClient，支持 live/mock 双模式 |
| 后台调度 | APScheduler | 内嵌 action server 进程 |
| Python 运行时 | Python 3.11 | uv 管理依赖 |
| 包管理 | uv (Python) + npm (前端) | — |

