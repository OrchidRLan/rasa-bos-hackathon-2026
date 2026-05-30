# HuddleX — Project Meta

> 此文件记录部署历史、API 目录和技术栈。

---

## 部署记录

| 日期 | 版本 | 环境 | 备注 |
|------|------|------|------|
| 2026-05-30 | v0.1.0 | hackathon-demo | Boston Tech Week Hackathon 提交版本 |

---

## API 管理

| 服务名 | 用途 | 环境变量名 | 状态 |
|-------|------|-----------|------|
| Nebius Token Factory | LLM 推理（对话 + 蒸馏 + briefing） | `NEBIUS_API_KEY` / `NEBIUS_BASE_URL` | ✅ 启用 |
| Rasa Pro | 对话引擎许可证 | `RASA_PRO_LICENSE` | ✅ 启用 |
| Speechmatics | 语音转文字 (ASR) | `SPEECHMATICS_API_KEY` | ✅ 启用 |
| Rime TTS | 文字转语音 | `RIME_API_KEY` | ✅ 启用 |
| X API v2 | 实时抓取推文（live 模式） | `X_BEARER_TOKEN` | ✅ 启用（默认 mock 模式） |
| SMTP | 邮件导出 | `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` | ✅ 启用 |

> ⚠️ 不在此文件存储实际 Key 值，Key 存于 `.env`（已加入 `.gitignore`）

---

## 技术栈

| 分类 | 技术 | 版本/说明 |
|------|------|---------|
| 前端 | Next.js + React + TypeScript | Next.js 15, React 18, Tailwind CSS |
| REST API | FastAPI + Pydantic | Python，port 8080 |
| 对话引擎 | Rasa CALM | Rasa Pro，port 5005 |
| LLM 推理 | Nebius Token Factory | Qwen3-235B-A22B-Instruct-2507 |
| 蒸馏引擎 | 女娲蒸馏（自研） | 6维度并行 LLM research → synthesis → quality check |
| 向量数据库 | ChromaDB | 本地持久化，内嵌 action server |
| Embedding | sentence-transformers | all-MiniLM-L6-v2 |
| 蒸馏并发 | Python ThreadPoolExecutor | max_workers=6（Phase 1.5） |
| 语音输入 | Speechmatics ASR | WebSocket |
| 语音输出 | Rime TTS | REST API |
| X 数据源 | X API v2 | XClient，live/mock 双模式 |
| 后台调度 | APScheduler | 内嵌 Python 进程，每 6h 刷新 |
| Python 运行时 | Python 3.11 | uv 管理依赖 |

---

## 数据结构

| 文件/集合 | 类型 | 说明 |
|----------|------|------|
| `data/personas/config.yml` | YAML | 专家配置（id, handle, wiki URL, avatar_color…） |
| `.data/personas/{id}.json` | JSON | 专家完整数据：Wikipedia + X posts + cognitive_framework + briefing |
| `.data/threads/{id}.json` | JSON | 对话线程历史（跨人格共享） |
| `.data/users/{id}.json` | JSON | 用户画像 + 全局摘要 + 线程索引 |
| `.data/chroma_db/persona_{id}/` | Chroma | 向量集合：tweets + wiki_summary + framework_summary |
| `.data/worker_state.json` | JSON | Always-On Worker 最后运行状态 |

详见 [DATABASE.md](DATABASE.md)。

---

## 核心 Make 命令

```bash
make install           # 安装 Python 依赖（uv）
make install-frontend  # 安装前端依赖（npm）
make verify            # 预检：环境变量、依赖、服务连通性
make seed-personas     # 初始化预置 5 个专家数据 + Chroma embedding
make train             # 训练 Rasa 模型
make run-actions       # 启动 FastAPI :8080 + Action Server :5055 + Worker
make run-rasa          # 启动 Rasa CALM :5005
make run-frontend      # 启动 Next.js 前端
```

---

## 服务端口一览

| 服务 | 端口 | 说明 |
|------|------|------|
| Next.js 前端 | 3000 | `npm run dev` |
| FastAPI REST | 8080 | `api_server.py` — 专家、用户、线程、Worker 控制 |
| Action Server | 5055 | Rasa action server（内部，Rasa 调用） |
| Rasa CALM | 5005 | `POST /webhooks/rest/webhook`（主对话入口） |

---

## 环境说明

| 环境 | 说明 |
|------|------|
| `development` | 本地开发，`X_API_MODE=mock`，用预存 JSON |
| `hackathon-demo` | 单机 Demo，所有服务本地运行 |
| `production` | 待规划 |
