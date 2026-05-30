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
cd starter
cp .env .env.bak              # 备份（如已有）
# 填入 RASA_PRO_LICENSE / NEBIUS_API_KEY / SPEECHMATICS_API_KEY / RIME_API_KEY

# 1. 安装依赖
make install                  # Python 3.10/3.11 + rasa-pro + voice 依赖（uv）
make install-frontend         # React 前端依赖（npm, 待创建）

# 2. 预检
make verify                   # 检查 key、依赖、服务连通性

# 3. 初始化人格知识库
make seed-personas            # 读取 data/personas/*.json → Chroma embedding（待添加）

# 4. 训练 Rasa 模型
make train

# 5. 启动（4 个终端）
make run-actions              # tab 1  Action Server + Always-On Worker
make run-rasa                 # tab 2  Rasa CALM (:5005)
make run-frontend             # tab 3  React 前端 localhost:3000（待添加）
make demo                     # tab 4  语音 Demo（可选）
```

文字模式（无需语音）：`make demo-text`

---

## 项目结构 <!-- AUTO -->

> 基于 `starter/`，标 `[+]` 的文件/目录为 EchoSphere 新增，其余已存在于 starter。

```
starter/                          ← 产品根目录
├── config.yml                    Rasa 配置（Nebius LLM wired in）
├── endpoints.yml                 Rasa endpoint 配置
├── credentials.yml               Rasa channel 配置
├── pyproject.toml                Python 依赖（rasa-pro 3.16, voice extras）
├── Makefile                      所有开发命令入口
│
├── data/
│   ├── flows/
│   │   ├── support_triage.yml    starter 示例 flow（可删）
│   │   ├── ticket_status.yml     starter 示例 flow（可删）
│   │   ├── switch_persona.yml    [+] 人格切换 CALM flow
│   │   └── general_chat.yml      [+] 通用对话 flow（RAG）
│   └── personas/                 [+] 预存人格 JSON 数据
│       ├── elon_musk.json
│       ├── sam_altman.json
│       └── ...（5 个）
│
├── domain/
│   ├── shared.yml                基础 slots/responses
│   ├── support_triage.yml        starter（可替换）
│   ├── ticket_status.yml         starter（可替换）
│   └── personas.yml              [+] persona slots + 人格 responses
│
├── actions/
│   ├── __init__.py
│   ├── actions.py                starter 示例 actions
│   ├── tickets.py                starter ticket store
│   ├── action_switch_persona.py  [+] 切换人格 + Chroma 集合
│   ├── action_persona_chat.py    [+] RAG 检索 + Nebius LLM 回复
│   ├── action_update_user_preference.py  [+] 用户偏好写入 slot
│   └── worker/                   [+] Always-On 后台层
│       ├── scheduler.py          APScheduler 定时任务
│       └── briefing_generator.py LLM 生成今日 briefing
│
├── voice/
│   ├── demo.py                   语音 demo 主入口（starter 已有）
│   ├── speechmatics_service.py   Speechmatics ASR（starter 已有）
│   ├── rime_service.py           Rime TTS（starter 已有）
│   ├── audio_io.py               音频播放工具
│   └── audio/                    预生成语音片段（.wav）
│
├── frontend/                     [+] React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── PersonaSelector.tsx  人格卡片 + briefing 展示
│   │   │   ├── ChatUI.tsx           跨人格共享对话历史
│   │   │   └── VoiceControls.tsx    麦克风 + TTS 播放控制
│   │   └── App.tsx
│   └── package.json
│
├── scripts/
│   ├── verify_setup.py           预检脚本（starter 已有）
│   └── seed_personas.py          [+] 初始化 Chroma embedding
│
├── agentic/                      starter Level 2（可按需复用）
│   └── ...
│
├── .data/                        运行时数据（gitignore）
│   ├── chroma_db/                [+] Chroma 向量库
│   ├── sessions/                 [+] 对话历史 JSON
│   └── tickets.json              starter ticket store
│
└── docs/ → ../docs/              ← 本 repo 根目录的 docs/
```

---

## 功能地图 <!-- AUTO -->

> `✅ 已有` = starter 现成，`🔨 待建` = EchoSphere 新增

| 功能 | 状态 | 文件路径 | 说明 |
|------|------|---------|------|
| 语音输入 (ASR) | ✅ 已有 | `starter/voice/speechmatics_service.py` | Speechmatics WebSocket ASR |
| 语音输出 (TTS) | ✅ 已有 | `starter/voice/rime_service.py` | Rime TTS，需换人格声音 ID |
| 语音 Demo CLI | ✅ 已有 | `starter/voice/demo.py` | ASR → Rasa → TTS 全链路 |
| 预检脚本 | ✅ 已有 | `starter/scripts/verify_setup.py` | key + 依赖 + 服务检查 |
| 人格切换 CALM flow | 🔨 待建 | `starter/data/flows/switch_persona.yml` | 触发 ActionSwitchPersona |
| 通用对话 CALM flow | 🔨 待建 | `starter/data/flows/general_chat.yml` | 触发 ActionPersonaChat |
| 人格切换 Action | 🔨 待建 | `starter/actions/action_switch_persona.py` | 切换 Chroma 集合 + system prompt |
| RAG 对话 Action | 🔨 待建 | `starter/actions/action_persona_chat.py` | 检索 top-k → Nebius LLM |
| 用户偏好 Action | 🔨 待建 | `starter/actions/action_update_user_preference.py` | 解析用户描述 → slot |
| Always-On Worker | 🔨 待建 | `starter/actions/worker/scheduler.py` | APScheduler 定时刷新 embedding + briefing |
| Briefing 生成器 | 🔨 待建 | `starter/actions/worker/briefing_generator.py` | LLM 生成今日主题摘要 |
| 人格数据 (5个) | 🔨 待建 | `starter/data/personas/*.json` | X 帖子 + Wikipedia 原始数据 |
| Chroma 初始化 | 🔨 待建 | `starter/scripts/seed_personas.py` | 首次全量 embedding |
| React 前端 | 🔨 待建 | `starter/frontend/src/` | PersonaSelector + ChatUI + VoiceControls |

---

## 环境变量 <!-- AUTO -->

> 来源：`starter/scripts/verify_setup.py` 检查项 + EchoSphere 扩展项

```bash
# starter/.env  （复制后填入）

# ── 必填：verify 检查 ─────────────────────────────────────────
RASA_PRO_LICENSE=          # Rasa Pro 许可证（hello.rasa.ai 免费申请）
NEBIUS_API_KEY=            # Nebius Token Factory LLM 推理
SPEECHMATICS_API_KEY=      # Speechmatics ASR
RIME_API_KEY=              # Rime TTS

# ── EchoSphere 扩展项 ─────────────────────────────────────────
NEBIUS_BASE_URL=https://api.studio.nebius.com/v1
NEBIUS_MODEL=Qwen3-235B-A22B-Instruct-2507   # 或 DeepSeek-V3.2
NEBIUS_EMBED_MODEL=                           # embedding 用（可选，默认本地）

WORKER_INTERVAL_HOURS=6    # Always-On Worker 刷新间隔

CHROMA_PERSIST_DIR=.data/chroma_db
SESSION_DIR=.data/sessions
PERSONA_DIR=data/personas
```

| 变量 | 必填 | 获取地址 |
|------|------|---------|
| `RASA_PRO_LICENSE` | ✅ | https://rasa.com/rasa-pro-developer-edition-license-key-request |
| `NEBIUS_API_KEY` | ✅ | https://tokenfactory.nebius.com |
| `SPEECHMATICS_API_KEY` | ✅ | https://www.speechmatics.com |
| `RIME_API_KEY` | ✅ | https://rime.ai |

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
| [docs/HALLUCINATION.md](docs/HALLUCINATION.md) | 防幻觉机制：grounding prompt + 检索相关性阈值回退 |
| [docs/PROJECT_META.md](docs/PROJECT_META.md) | 部署记录、API key 目录、Make 命令 |
