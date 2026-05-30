# PRD — HuddleX
> 你的Experts辅助决策团队· Boston Tech Week Hackathon 2026

---

## 1. 问题陈述

brainstorming的过程中，我们总会希望听到更多视角的内容。用户希望能召集各行业专家。
深度理解并"对话"自己关注的创作者/博主的思维方式，但创作者内容分散（X 帖子、Wikipedia、播客等），且我们无法直接沟通。

## 2. 解决方案

构建一个多人格 AI 伴侣，将最多 5 个博主/创作者的公开知识（X 帖子 + Wikipedia）提炼为独立 AI 人格，用户可随时通过语音或 UI 切换，并维持跨人格的持续对话记忆。
input：
1️⃣agent聊天者setting：读取关注的名人专家的X、维基百科。
2️⃣用户希望agent知道的关于自己的信息、偏好
output流程：
1️⃣用户创建新的名人专家档案，启动蒸馏技能（ Phase 1 (6个并行Agent)
    01-writings.md     ← 著作/文章/newsletter
    02-conversations.md ← 播客/访谈 + download_subtitles + srt_to_transcript
    03-expression-dna.md ← X风格/金句
    04-external-views.md ← 他人评价/批评
    05-decisions.md    ← 重大决策案例
    06-timeline.md     ← 人生轨迹时间线
  Phase 1.5: merge_research 
  Phase 2-3: 提炼心智模型、反模式、诚实边界
  Phase 4: quality_check）
2️⃣AGENT有多个人格，每个人格对应一个人物的资料，用户用prompt切换人格。agent会实时读取的记忆包括：切换到的人格的知识储备、该对话框之前别的人格和用户的交流记录、用户的系统prompt
*用户用voice/手动介绍切换


---

## 3. 目标用户

- 重度内容消费者，关注科技/商业/创意领域博主
- 希望测试想法、获取特定视角的创业者/学生
- 想用 AI 陪伴但对单一人格感到无聊的用户

---

## 4. 核心功能

### 4.1 人格系统

| 功能 | 描述 |
|------|------|
| 人格配置 | 管理员预先配置 5 个博主人格，每个人格绑定 X 账号 + Wikipedia 条目等 |
| 人格知识库 | 每个人格有独立 Chroma 向量集合，存储该博主的 X 帖子 + Wikipedia 摘要的 embedding |
| 人格声音 | 每个人格绑定独立 Rime TTS voice profile |
| 人格切换 | 用户通过 UI 按钮或语音命令（"切换到 XXX 模式"）切换，CALM flow 处理切换逻辑 |

### 4.2 对话记忆

| 功能 | 描述 |
|------|------|
| 跨人格共享历史 | 所有人格共享同一对话线程，切换后新人格能看到之前对话 |
| 用户画像 | 用户可通过语音/文字告诉系统关于自己的信息和偏好，存入 system prompt |
| 会话持久化 | 对话历史持久化到 JSON，重启后保留 |

### 4.3 语音交互

| 功能 | 描述 |
|------|------|
| 语音输入 | Speechmatics ASR 实时识别用户语音 |
| 语音输出 | Rime TTS 合成当前人格的回复 |
| 语音切换 | 用户说"切换到 [人格名]"触发 CALM 切换 flow |

### 4.4 Always-On 后台层

| 功能 | 描述 |
|------|------|
| 知识刷新 | APScheduler 定时（默认每 6 小时）读取预存 JSON，更新各人格 Chroma 集合 |
| Briefing 生成 | 每次刷新后，用 LLM 为每个人格生成当日 briefing（近期关注话题摘要） |
| 健康检查 | Worker 提供 `/worker/health` 端点，记录最后一次成功运行时间 |

---

## 5. 用户流程

```
1. 用户打开 Web App
   └─▶ ①看到专家人才库 人格卡片（头像、姓名、今日 briefing等）②开过的对话框

2. 用户开启一个新的对话主题
在这条对话记录里能
点击/说出选择某个人格
   └─▶ CALM flow 激活 switch_persona
       └─▶ Action server 加载该人格的 Chroma 集合 + briefing + 此对话框用户和其他人格的对话记录
           └─▶ 对话框激活，system prompt 注入：
               [人格知识] + [用户偏好] + [跨人格历史]

3. 用户开始对话（文字 / 语音）
   └─▶ Speechmatics ASR 转文字（语音路径）
       └─▶ Rasa CALM 处理意图
           └─▶ Nebius LLM 生成回复（RAG 检索该人格知识）
               └─▶ Rime TTS 合成语音 + 文字回复展示

4. 用户切换人格
   └─▶ 新人格接收完整历史 + 新 system prompt
       └─▶ 新人格可以说："我看到你之前和 [前人格] 讨论了 XXX..."

5. 用户说“把这个主题我们的讨论的聊天记录及summary发到我的邮箱”，调用mail的agent+ 读用户profile里的邮箱。发两份附件。
```

---

## 6. 非功能需求

| 指标 | 目标 |
|------|------|
| 语音延迟 | ASR → TTS 全链路 < 3s |
| 人格切换延迟 | < 500ms（Chroma 集合切换） |
| 知识刷新周期 | 可配置，默认 6 小时 |
| 并发用户 | Hackathon demo 阶段：1-5 用户 |

---

## 7. Hackathon 范围外（v1 不做）

- 实时 X API 抓取（用预存 JSON 替代）
- 用户自定义添加博主
- 多语言支持（默认中/英双语）
- 用户账号系统
- 移动端 App

---

## 8. 成功指标（Hackathon）

- [ ] 5 个人格可正常切换且对话
- [ ] 跨人格历史正确传递
- [ ] 语音输入/输出正常工作
- [ ] Always-On Worker 可演示知识刷新
- [ ] Demo 时间 ≤ 3 分钟内完整展示核心流程
