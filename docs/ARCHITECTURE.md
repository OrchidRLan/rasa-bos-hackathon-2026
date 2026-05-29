# ARCHITECTURE — EchoSphere

---

## 系统总览

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│                                                                  │
│  ┌──────────────┐   ┌────────────────┐   ┌──────────────────┐  │
│  │  Persona     │   │   Chat UI      │   │  Voice Controls  │  │
│  │  Selector    │   │  (共享历史)    │   │  (mic button)    │  │
│  └──────┬───────┘   └───────┬────────┘   └────────┬─────────┘  │
└─────────┼───────────────────┼─────────────────────┼────────────┘
          │          REST / WebSocket                │
          └───────────────────▼─────────────────────┘
                    ┌──────────────────┐
                    │   Rasa CALM      │
                    │  (REST API :5005)│
                    └────────┬─────────┘
                             │
           ┌─────────────────┼──────────────────┐
           │                 │                  │
  ┌────────▼────────┐  ┌─────▼──────┐  ┌───────▼───────────┐
  │  Action Server  │  │  Nebius    │  │  Voice Pipeline   │
  │  (Python :5055) │  │  Token     │  │                   │
  │                 │  │  Factory   │  │  Speechmatics ASR │
  │  ┌───────────┐  │  │  (LLM)     │  │       ↓           │
  │  │  Chroma   │  │  └────────────┘  │  Rasa REST API    │
  │  │  Vector DB│  │                  │       ↓           │
  │  │           │  │                  │  Rime TTS         │
  │  │ persona_A │  │                  └───────────────────┘
  │  │ persona_B │  │
  │  │ persona_C │  │
  │  │ persona_D │  │
  │  │ persona_E │  │
  │  └───────────┘  │
  │                 │
  │  ┌───────────┐  │
  │  │ Memory    │  │
  │  │ Store     │  │
  │  │ (JSON)    │  │
  │  └───────────┘  │
  └────────┬────────┘
           │
  ┌────────▼──────────────────────────┐
  │    Always-On Layer                │
  │    APScheduler (Background)       │
  │                                   │
  │  ┌─────────────────────────────┐  │
  │  │  每 6h: 读取 data/personas/  │  │
  │  │  *.json → re-embed → Chroma  │  │
  │  └─────────────────────────────┘  │
  │  ┌─────────────────────────────┐  │
  │  │  每次刷新: LLM 生成          │  │
  │  │  persona briefing (今日摘要) │  │
  │  └─────────────────────────────┘  │
  └───────────────────────────────────┘
```

---

## 组件说明

### 1. Frontend (React)

| 组件 | 职责 |
|------|------|
| `PersonaSelector` | 展示 5 个人格卡片（头像、名称、today's briefing） |
| `ChatUI` | 渲染共享对话历史，区分不同人格消息（颜色/头像标识） |
| `VoiceControls` | 麦克风按钮，触发 Speechmatics ASR，接收 Rime TTS 播放 |
| `UserSetupModal` | 用户首次使用时填写个人信息和偏好（存入 session） |

通信方式：调用 Rasa REST API (`POST /webhooks/rest/webhook`)，轮询或 WebSocket 获取 bot 回复。

---

### 2. Rasa CALM (对话引擎)

核心 CALM flows：

| Flow | 触发条件 | 动作 |
|------|---------|------|
| `switch_persona` | 用户说"切换到 XXX" 或 UI 发送 `/switch_persona{"persona": "XXX"}` | 调用 `ActionSwitchPersona` |
| `update_user_preference` | 用户介绍自己或说"我喜欢..." | 调用 `ActionUpdateUserPreference` |
| `general_chat` | 默认 flow，一般对话 | 调用 `ActionPersonaChat`，RAG 检索 |

---

### 3. Action Server (Python)

| Action | 功能 |
|--------|------|
| `ActionSwitchPersona` | 更新 slot `active_persona`，切换 Chroma 集合，更新 system prompt |
| `ActionPersonaChat` | 检索当前人格 Chroma 集合（top-k），拼装 prompt，调用 Nebius LLM |
| `ActionUpdateUserPreference` | 解析用户描述，更新 `user_context` slot |
| `ActionGetPersonaList` | 返回所有人格的 id、名称、briefing |

---

### 4. Chroma Vector DB

每个人格对应一个独立的 Chroma 集合（collection）：

```
chroma_db/
├── persona_elon/        # X posts + Wikipedia embedding
├── persona_sam/
├── persona_yc/
├── persona_xxx/
└── persona_yyy/
```

embedding 模型：Nebius 提供的 embedding endpoint（或 `sentence-transformers/all-MiniLM-L6-v2` 本地）。

---

### 5. Memory Store (JSON)

```
.data/
├── sessions/
│   └── {session_id}.json     # 对话历史 + user_context
├── personas/
│   ├── persona_elon.json     # 原始 X 帖子 + Wikipedia + briefing
│   ├── persona_sam.json
│   └── ...
└── worker_state.json          # 最后一次成功运行时间、各人格 embed 状态
```

---

### 6. Always-On Layer (APScheduler)

运行在 action server 内部的后台线程：

```
启动时:
  1. 扫描 data/personas/*.json
  2. 检查各人格 Chroma 集合是否已初始化
  3. 如未初始化 → 全量 embed

每 6 小时:
  1. 重新读取 data/personas/*.json
  2. 对比上次 embed 的帖子 hash
  3. 增量 embed 新内容
  4. 调用 Nebius LLM 生成 briefing（近期主题摘要, ~100字）
  5. 写入 persona_xxx.json 的 briefing 字段
  6. 更新 worker_state.json
```

---

## 关键数据流

### 人格切换流

```
用户: "切换到 Sam Altman 模式"
  → Speechmatics ASR: "switch to Sam Altman mode"
  → Rasa CALM: 匹配 switch_persona flow
  → ActionSwitchPersona:
      slot[active_persona] = "sam_altman"
      加载 chroma_db/persona_sam 集合
      更新 system_prompt = persona_prompt + user_context + 对话历史摘要
  → Rasa 回复: "好的，我现在是 Sam Altman..."
  → Rime TTS: 合成 Sam 专属声音
```

### RAG 对话流

```
用户: "你对 AGI 安全怎么看？"
  → Rasa CALM: 匹配 general_chat flow
  → ActionPersonaChat:
      query_embedding = embed("你对 AGI 安全怎么看？")
      top_k = chroma_db/persona_sam.query(query_embedding, k=5)
      prompt = system_prompt + top_k_context + conversation_history + user_query
      response = Nebius LLM(prompt)
  → 回复: "[Sam 视角的 AGI 安全观点]"
```

---

## 技术栈总表

| 层 | 技术 | 版本/备注 |
|----|------|---------|
| 对话引擎 | Rasa CALM | Rasa Pro |
| LLM 推理 | Nebius Token Factory | Qwen3-235B / DeepSeek-V3 |
| 向量 DB | ChromaDB | 本地持久化 |
| Embedding | sentence-transformers | all-MiniLM-L6-v2 |
| 语音输入 | Speechmatics ASR | REST API |
| 语音输出 | Rime TTS | REST API |
| 后台调度 | APScheduler | 内嵌 action server |
| 前端 | React | Vite + TypeScript |
| 运行时 | Python 3.10/3.11 | uv 管理依赖 |
