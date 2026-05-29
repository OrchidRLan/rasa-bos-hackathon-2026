# EchoSphere

> 多人格 AI 陪伴 · Boston Tech Week Hackathon 2026

与你关注的创作者的 AI 分身对话。切换视角，保留记忆，一直在线。

```
              ears                   brain                  voice
 user  ──▶  Speechmatics ASR  ──▶  Rasa CALM (agent)  ──▶  Rime TTS  ──▶  user
                                        │
                                        ├── Nebius Token Factory  (LLM)
                                        ├── Chroma Vector DB      (RAG · per persona)
                                        └── APScheduler           (always-on worker)
```

---

## 快速启动 <!-- AUTO -->

```bash
# 0. 复制环境变量
cp .env.example .env          # 填入各服务 API key

# 1. 安装依赖
make install                  # Python 依赖（uv）
make install-frontend         # 前端依赖（npm）

# 2. 预检
make verify                   # 检查 key、依赖、服务连通性

# 3. 初始化人格数据
make seed-personas            # 读取 data/personas/*.json，embedding → Chroma

# 4. 训练 Rasa 模型
make train

# 5. 启动（4 个终端）
make run-actions              # tab 1  Action Server + Always-On Worker
make run-rasa                 # tab 2  Rasa CALM
make run-frontend             # tab 3  React 前端 (localhost:3000)
# 语音可选：
make demo                     # tab 4  语音 Demo CLI
```

文字模式（无需语音）：`make demo-text`

---

## 项目结构 <!-- AUTO -->

```
EchoSphere/
├── data/
│   ├── flows/                # Rasa CALM flows (switch_persona, general_chat, ...)
│   └── personas/             # 预存人格数据 JSON (elon_musk.json, sam_altman.json, ...)
├── domain/                   # Rasa slots + responses
├── actions/                  # 自定义 Action Server
│   ├── action_switch_persona.py
│   ├── action_persona_chat.py
│   ├── action_update_user_preference.py
│   └── worker/               # Always-On APScheduler
│       ├── scheduler.py
│       └── briefing_generator.py
├── frontend/                 # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── PersonaSelector.tsx
│   │   │   ├── ChatUI.tsx
│   │   │   └── VoiceControls.tsx
│   │   └── App.tsx
│   └── package.json
├── voice/                    # Speechmatics ASR + Rime TTS 管道
│   ├── demo.py
│   ├── speechmatics_service.py
│   └── rime_service.py
├── scripts/
│   ├── seed_personas.py      # 初始化 Chroma embedding
│   └── verify_setup.py       # 预检脚本
├── .data/                    # 运行时数据（gitignore）
│   ├── chroma_db/
│   └── sessions/
├── config.yml                # Rasa 配置（Nebius LLM）
├── endpoints.yml             # Rasa endpoint 配置
├── Makefile
├── .env.example
└── docs/                     # 项目文档
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── API.md
    ├── DATABASE.md
    └── PROJECT_META.md
```

---

## 功能地图 <!-- AUTO -->

| 功能 | 文件路径 | 说明 |
|------|---------|------|
| 人格切换 | `actions/action_switch_persona.py` | 切换 Chroma 集合 + system prompt |
| RAG 对话 | `actions/action_persona_chat.py` | 检索 → Nebius LLM → 回复 |
| 用户偏好 | `actions/action_update_user_preference.py` | 解析用户描述 → slot |
| Always-On Worker | `actions/worker/scheduler.py` | 定时刷新 embedding + briefing |
| 人格选择 UI | `frontend/src/components/PersonaSelector.tsx` | 展示人格卡片 + briefing |
| 对话界面 | `frontend/src/components/ChatUI.tsx` | 跨人格共享历史 |
| 语音输入/输出 | `voice/demo.py` | ASR → Rasa → TTS 全链路 |
| 人格数据 | `data/personas/*.json` | X 帖子 + Wikipedia 原始数据 |
| Chroma 初始化 | `scripts/seed_personas.py` | 首次 embedding |
| 切换 CALM flow | `data/flows/switch_persona.yml` | Rasa 人格切换流程定义 |

---

## 环境变量 <!-- AUTO -->

```bash
# .env.example

# Rasa
RASA_PRO_LICENSE=

# LLM (Nebius Token Factory)
NEBIUS_API_KEY=
NEBIUS_BASE_URL=https://api.studio.nebius.com/v1
NEBIUS_MODEL=Qwen3-235B-A22B-Instruct-2507

# Voice
SPEECHMATICS_API_KEY=
RIME_API_KEY=

# Worker
WORKER_INTERVAL_HOURS=6

# Storage
CHROMA_PERSIST_DIR=.data/chroma_db
SESSION_DIR=.data/sessions
PERSONA_DIR=data/personas
```

---

## Hackathon 评分对应

| 奖项 | EchoSphere 对应点 |
|------|-----------------|
| Most Resilient Long-Term Agent | 跨人格共享对话历史 · Chroma RAG 避免幻觉 · 会话 JSON 持久化 |
| Best Voice Coworker | Speechmatics ASR + Rime（每人格独立声音）· 语音人格切换 |
| Most Creative Enterprise Use Case | 多人格 AI 陪伴 · Always-On 知识刷新 |

---

## 文档索引

| 文档 | 内容 |
|------|------|
| [docs/PRD.md](docs/PRD.md) | 产品需求、用户故事、范围 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 系统架构图、数据流、组件说明 |
| [docs/API.md](docs/API.md) | API 端点文档 |
| [docs/DATABASE.md](docs/DATABASE.md) | 数据结构 Schema · Chroma 结构 · System Prompt 拼装 |
| [docs/PROJECT_META.md](docs/PROJECT_META.md) | 部署记录、API key 目录、Make 命令 |
