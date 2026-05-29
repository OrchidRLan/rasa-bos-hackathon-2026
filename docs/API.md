# API — EchoSphere

---

## 1. Rasa REST API（主对话入口）

Base URL: `http://localhost:5005`

### 1.1 发送消息

```
POST /webhooks/rest/webhook
```

**Request**
```json
{
  "sender": "user_001",
  "message": "你好，切换到 Sam Altman 模式"
}
```

**Response**
```json
[
  {
    "recipient_id": "user_001",
    "text": "好的，我现在是 Sam Altman。有什么想聊的？",
    "custom": {
      "persona_id": "sam_altman",
      "tts_voice": "rime_sam_voice_id"
    }
  }
]
```

---

### 1.2 触发特定 intent（人格切换专用）

前端 UI 按钮切换时直接发 intent，绕过 NLU：

```
POST /webhooks/rest/webhook
```

```json
{
  "sender": "user_001",
  "message": "/switch_persona{\"persona_id\": \"elon_musk\"}"
}
```

---

### 1.3 获取会话追踪器状态

```
GET /conversations/{sender_id}/tracker
```

用于前端初始化时恢复历史对话和当前激活人格。

**Response（关键字段）**
```json
{
  "sender_id": "user_001",
  "slots": {
    "active_persona": "sam_altman",
    "user_context": "用户是创业者，关注 AI 领域"
  },
  "events": [...]
}
```

---

## 2. 自定义 Action Server API

Base URL: `http://localhost:5055`

> 这些端点由 Rasa 内部调用，前端不直接访问（除 `/personas`）。

### 2.1 获取人格列表（前端直接调用）

```
GET /personas
```

**Response**
```json
{
  "personas": [
    {
      "id": "elon_musk",
      "display_name": "Elon Musk",
      "handle": "@elonmusk",
      "description": "Tech entrepreneur, CEO of Tesla & SpaceX",
      "briefing": "近期关注 xAI Grok 模型发布，讨论 AI 监管问题...",
      "briefing_updated_at": "2026-05-29T06:00:00Z",
      "avatar_url": "/assets/personas/elon.jpg",
      "rime_voice_id": "voice_elon_001"
    },
    {
      "id": "sam_altman",
      "display_name": "Sam Altman",
      "handle": "@sama",
      "description": "CEO of OpenAI",
      "briefing": "...",
      "briefing_updated_at": "2026-05-29T06:00:00Z",
      "avatar_url": "/assets/personas/sam.jpg",
      "rime_voice_id": "voice_sam_001"
    }
  ]
}
```

---

### 2.2 更新用户偏好（Rasa 内部 action）

内部 Rasa action `ActionUpdateUserPreference` 调用，不对外暴露。
前端通过对话触发（用户说"我是一个产品经理，喜欢..."）。

---

## 3. Always-On Worker API

Base URL: `http://localhost:5055/worker`（与 action server 共进程）

### 3.1 健康检查

```
GET /worker/health
```

**Response**
```json
{
  "status": "ok",
  "last_run": "2026-05-29T06:00:00Z",
  "next_run": "2026-05-29T12:00:00Z",
  "personas": {
    "elon_musk": {
      "embed_status": "ok",
      "last_embed": "2026-05-29T06:00:00Z",
      "doc_count": 342
    },
    "sam_altman": {
      "embed_status": "ok",
      "last_embed": "2026-05-29T06:00:00Z",
      "doc_count": 218
    }
  }
}
```

---

### 3.2 手动触发刷新（Demo 演示用）

```
POST /worker/trigger
```

**Request**
```json
{
  "persona_id": "elon_musk"   // 可选，不填则刷新所有
}
```

**Response**
```json
{
  "status": "triggered",
  "persona_id": "elon_musk",
  "message": "Refresh job queued"
}
```

---

## 4. 语音管道（Voice Pipeline）

> 语音管道不暴露独立 API，由 `voice/demo.py` 编排，通过 Rasa REST API 传递文字消息。

```
用户语音 (mic)
  → Speechmatics WebSocket ASR → transcript (string)
  → POST /webhooks/rest/webhook  (message = transcript)
  → Rasa 回复 text
  → POST https://users.rime.ai/v1/rime-tts  (text = reply)
  → 播放音频
```

### Speechmatics 关键参数

```python
# voice/speechmatics_config.py
LANGUAGE = "en"          # 或 "zh" 中文
MAX_DELAY = 0.7          # 低延迟模式
OPERATING_POINT = "enhanced"
```

### Rime TTS 关键参数

```python
# voice/rime_service.py
SPEAKER = "voice_id_from_persona"   # 每个人格不同
SPEED_ALPHA = 1.0
SAMPLE_RATE = 22050
```

---

## 5. 环境变量索引

| 变量名 | 用途 | 示例值 |
|--------|------|--------|
| `RASA_PRO_LICENSE` | Rasa Pro 许可证 | `eyJ...` |
| `NEBIUS_API_KEY` | Nebius Token Factory | `nb-...` |
| `NEBIUS_BASE_URL` | Nebius endpoint | `https://api.studio.nebius.com/v1` |
| `NEBIUS_MODEL` | LLM 模型 ID | `Qwen3-235B-A22B-Instruct-2507` |
| `SPEECHMATICS_API_KEY` | Speechmatics ASR | `sm-...` |
| `RIME_API_KEY` | Rime TTS | `rime-...` |
| `WORKER_INTERVAL_HOURS` | 后台刷新间隔 | `6` |
| `CHROMA_PERSIST_DIR` | Chroma 持久化目录 | `.data/chroma_db` |
