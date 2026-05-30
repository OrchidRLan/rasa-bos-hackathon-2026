# API — HuddleX

> 所有 REST 端点由 FastAPI 服务器提供（port 8080）。
> Next.js 通过 `next.config.ts` 代理：`/api/*` → `:8080`，`/webhooks/*` → `:5005`，`/worker/*` → `:8080`。

---

## 1. FastAPI REST API（port 8080）

### 1.1 专家（personas）

#### 获取所有专家

```
GET /api/experts
```

**Response** — Expert 对象数组
```json
[
  {
    "id": "elon_musk",
    "display_name": "Elon Musk",
    "x_handle": "@elonmusk",
    "x_source": "@elonmusk",
    "wikipedia": "https://en.wikipedia.org/wiki/Elon_Musk",
    "avatar_color": "from-slate-700 to-slate-900",
    "initials": "EM",
    "rime_voice_id": "",
    "briefing": "近期 Elon 主要关注：xAI Grok...",
    "last_updated": "2026-05-29T06:00:00Z",
    "subtitle": ""
  }
]
```

---

#### 获取单个专家（含完整 JSON）

```
GET /api/experts/{persona_id}
```

返回完整 `.data/personas/{id}.json` 内容，含 `cognitive_framework` 字段（蒸馏专家）。

**404** — 专家不存在或尚未 seed

---

#### 蒸馏新专家（女娲蒸馏）

```
POST /api/experts
Content-Type: application/json
```

**Request**
```json
{
  "display_name": "Richard Feynman",
  "x_handle": "@feynmanlectures",
  "wikipedia_url": "https://en.wikipedia.org/wiki/Richard_Feynman"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `display_name` | string | ✅ | 专家姓名，生成 persona_id |
| `x_handle` | string | — | X 账号，可选 |
| `wikipedia_url` | string | — | Wikipedia URL，留空则不抓取 |

**Response 200** — 与 `GET /api/experts` 格式相同的单个 Expert 对象

**Response 409** — `{"detail": "Expert 'Richard Feynman' already exists"}`

**Response 422** — `display_name` 为空

> 此接口同步执行完整 4-Phase 蒸馏流程，耗时 30-45 秒，请前端展示进度 UI。

---

#### 触发重新 seed（Dev Only）

```
POST /api/experts/trigger-seed?persona_id=elon_musk
```

后台启动 `seed_personas.py` 子进程，立即返回。

---

### 1.2 用户画像

#### 获取用户画像

```
GET /api/user/{user_id}
```

**Response** — UserProfile 对象
```json
{
  "user_id": "user_001",
  "user_context": {
    "name": "Alex",
    "role": "AI startup founder",
    "interests": ["AGI", "product design"],
    "raw_description": "我是做 AI SaaS 的...",
    "updated_at": "2026-05-29T10:05:00Z"
  },
  "threads": [...],
  "global_summary": {
    "text": "...",
    "generated_at": "2026-05-29T06:00:00Z",
    "thread_count": 2
  }
}
```

---

#### 更新用户画像

```
PUT /api/user/{user_id}
Content-Type: application/json
```

**Request**（所有字段可选）
```json
{
  "name": "Alex",
  "role": "AI startup founder",
  "interests": ["AGI", "fundraising"],
  "raw_description": "我是做 AI SaaS 的创业者..."
}
```

`interests` 做增量合并（已有 + 新增），其余字段直接覆盖。

---

### 1.3 对话线程

#### 获取所有线程（轻量列表）

```
GET /api/threads
```

**Response** — Thread 轻量对象数组（不含 `thread_history` 消息体）

---

#### 获取单条线程（含消息历史）

```
GET /api/threads/{thread_id}
```

**Response** — 完整 Thread 对象，含 `thread_history` 数组

---

### 1.4 X 创作者数据

```
GET /api/x/creator/{handle}?max_results=20
```

实时调用 X API v2 抓取指定 handle 的最新帖子。

**Response**
```json
{
  "profile": { "username": "elonmusk", "name": "Elon Musk", ... },
  "posts": [
    { "id": "...", "text": "...", "created_at": "...", "public_metrics": {...} }
  ]
}
```

**502** — X API 调用失败

---

### 1.5 邮件通知

```
POST /api/notifications/email/send
Content-Type: application/json
```

**Request**
```json
{
  "to": "user@example.com",
  "subject": "HuddleX 讨论摘要",
  "body": "纯文本正文",
  "html": "<h1>HTML 版本</h1>"
}
```

---

## 2. Rasa CALM API（port 5005）

前端直接调用的唯一 Rasa 端点。

### 发送消息 / 切换人格

```
POST /webhooks/rest/webhook
Content-Type: application/json
```

**Request**
```json
{
  "sender": "thread_abc123",
  "message": "你好，AI 安全最大的挑战是什么？"
}
```

人格切换（UI 按钮）：
```json
{
  "sender": "thread_abc123",
  "message": "/switch_persona{\"target_persona_id\": \"sam_altman\"}"
}
```

**Response** — RasaMessage 数组
```json
[
  {
    "recipient_id": "thread_abc123",
    "text": "从 OpenAI 的角度看，对齐问题...",
    "custom": {
      "type": "persona_reply",
      "persona_id": "sam_altman",
      "retrieved_chunk_ids": ["wiki_summary", "tweet_042"]
    }
  }
]
```

人格切换响应的 `custom.type = "switch_persona_ack"`：
```json
{
  "custom": {
    "type": "switch_persona_ack",
    "persona": { "id": "sam_altman", "display_name": "Sam Altman", ... }
  }
}
```

---

## 3. Worker API（port 8080，路径 /worker/）

### 健康检查

```
GET /worker/health
```

**Response**
```json
{
  "elon_musk": {
    "embed_status": "ok",
    "last_embed_at": "2026-05-29T06:00:00Z",
    "doc_count": 342,
    "last_briefing_at": "2026-05-29T06:01:30Z"
  }
}
```

---

### 手动触发刷新（Demo 演示用）

```
POST /worker/trigger?persona_id=elon_musk
```

`persona_id` 可选，不填则刷新全部专家。

---

## 4. 语音管道

语音管道不暴露独立 REST API，由前端 `useVoiceInput` hook 编排：

```
用户语音 (MediaRecorder)
  → /api/transcribe  (Speechmatics WebSocket via Next.js API Route)
  → transcript string
  → POST /webhooks/rest/webhook  (message = transcript)
  → Rasa 回复 text
  → Rime TTS REST API
  → 播放音频
```

---

## 5. 环境变量索引

| 变量名 | 用途 | 示例值 |
|--------|------|--------|
| `NEBIUS_API_KEY` | Nebius LLM 推理 | `nb-...` |
| `NEBIUS_BASE_URL` | Nebius endpoint | `https://api.tokenfactory.nebius.com/v1` |
| `NEBIUS_MODEL` | LLM 模型 ID | `Qwen/Qwen3-235B-A22B-Instruct-2507` |
| `RASA_PRO_LICENSE` | Rasa Pro 许可证 | `eyJ...` |
| `SPEECHMATICS_API_KEY` | Speechmatics ASR | `sm-...` |
| `RIME_API_KEY` | Rime TTS | `rime-...` |
| `X_BEARER_TOKEN` | X API v2 | `AAAA...` |
| `X_API_MODE` | `live` 或 `mock` | `mock`（默认，用预存 JSON） |
| `X_POSTS_MAX_RESULTS` | live 模式每次抓取数量 | `30` |
| `WORKER_INTERVAL_HOURS` | Always-On 刷新间隔 | `6` |
| `DATA_DIR` | 数据根目录 | `.data` |
| `PERSONA_CONFIG` | 专家配置文件路径 | `data/personas/config.yml` |
| `SMTP_HOST` | 邮件服务器 | `smtp.gmail.com` |
| `SMTP_PORT` | 邮件端口 | `587` |
| `SMTP_USER` | 发件邮箱 | `noreply@example.com` |
| `SMTP_PASSWORD` | 邮件密码 | `...` |
