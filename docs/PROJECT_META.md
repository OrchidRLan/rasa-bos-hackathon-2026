# EchoSphere — Project Meta

> 此文件由 Claude Code 维护，记录部署历史、API 目录和技术栈。

---

## 部署记录

| 日期 | 版本 | 环境 | 备注 |
|------|------|------|------|
| 2026-05-30 | v0.1.0 | hackathon-demo | Boston Tech Week Hackathon 提交版本 |
| - | - | - | 初始化 |

---

## API 管理

| 服务名 | 用途 | 环境变量名 | 文档 | 状态 |
|-------|------|-----------|------|------|
| Rasa Pro | 对话引擎许可证 | `RASA_PRO_LICENSE` | https://rasa.com/docs/ | ✅ 启用 |
| Nebius Token Factory | LLM 推理 | `NEBIUS_API_KEY` / `NEBIUS_BASE_URL` | https://tokenfactory.nebius.com | ✅ 启用 |
| Speechmatics | 语音转文字 (ASR) | `SPEECHMATICS_API_KEY` | https://docs.speechmatics.com | ✅ 启用 |
| Rime TTS | 文字转语音 | `RIME_API_KEY` | https://rime.ai/docs | ✅ 启用 |

> ⚠️ 不在此文件存储实际 Key 值，Key 存于 `.env`（已加入 `.gitignore`）

---

## 技术栈 <!-- AUTO -->

| 分类 | 技术 | 版本/说明 |
|------|------|---------|
| 对话引擎 | Rasa CALM | Rasa Pro |
| LLM 推理 | Nebius Token Factory | Qwen3-235B / DeepSeek-V3.2 |
| 向量数据库 | ChromaDB | 本地持久化，内嵌 action server |
| Embedding | sentence-transformers | all-MiniLM-L6-v2 |
| 语音输入 | Speechmatics ASR | REST / WebSocket |
| 语音输出 | Rime TTS | REST API |
| 后台调度 | APScheduler | 内嵌 Python 进程 |
| 前端 | React + TypeScript | Vite |
| 运行时 | Python | 3.10 / 3.11（uv 管理） |

---

## 数据结构 <!-- AUTO -->

| 文件/集合 | 类型 | 说明 |
|----------|------|------|
| `.data/personas/{id}.json` | JSON | 人格原始数据（X 帖子 + Wikipedia + briefing） |
| `.data/sessions/{id}.json` | JSON | 对话历史 + 用户偏好，按 session_id 分文件 |
| `.data/chroma_db/persona_{id}/` | Chroma | 每个人格的向量集合，自动生成 |
| `.data/worker_state.json` | JSON | Always-On Worker 最后运行状态 |

详见 [DATABASE.md](DATABASE.md)。

---

## 环境说明

| 环境 | 说明 |
|------|------|
| `development` | 本地开发，`make run-actions` + `make run-rasa` + `npm run dev` |
| `hackathon-demo` | 单机 Demo，所有服务本地运行 |
| `production` | 待规划 |

---

## 核心 Make 命令

```bash
make install           # 安装 Python 依赖（uv）
make install-frontend  # 安装前端依赖（npm）
make verify            # 预检：环境变量、依赖、服务连通性
make seed-personas     # 初始化 5 个人格数据 + Chroma embedding
make train             # 训练 Rasa 模型
make run-actions       # 启动 Action Server（含 Worker）
make run-rasa          # 启动 Rasa CALM 服务
make run-frontend      # 启动 React 前端
make demo-text         # 纯文字对话 CLI（无需语音）
make demo              # 完整语音 Demo
```
