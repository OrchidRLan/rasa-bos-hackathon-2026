# Skill: Project Meta 管理

## 触发词
`update meta` / `更新meta` / `add api` / `log deploy` / `记录部署`

## 管理文件位置
`docs/PROJECT_META.md`

---

## 执行规则

### 触发词 `log deploy` / `记录部署`
在"部署记录"表格**顶部**插入一行（最新在上）：

| 字段 | 来源 |
|------|------|
| 日期 | 当前日期 |
| 版本号 | app.json 的 version + buildNumber |
| 环境 | preview / production |
| EAS Build ID | 用户提供或标注"待填" |
| 备注 | 用户描述的改动内容 |

---

### 触发词 `add api` / `新增api`
在"API 管理"表格追加一行，字段：

| 字段 | 说明 |
|------|------|
| 服务名 | 用户提供 |
| 用途 | 用户提供 |
| 环境变量名 | 用户提供（如 `EXPO_PUBLIC_API_KEY`） |
| 文档链接 | 用户提供或留空 |
| 状态 | 默认"✅ 启用" |

> ⚠️ 不记录 API Key 的实际值，只记录变量名

---

### 触发词 `update meta` / `更新meta`
全量扫描项目，重新生成以下章节：
- 技术栈表（从 package.json 读取）
- 数据表结构（从 types/ 或 models/ 或 schema 文件推断）

---

## `docs/PROJECT_META.md` 模板

首次运行时，如果文件不存在，创建以下结构：

```markdown
# ArCareer - Project Meta

> 此文件由 Claude Code 维护，记录部署历史、API 目录和数据结构。

---

## 部署记录

| 日期 | 版本 | 环境 | EAS Build ID | 备注 |
|------|------|------|-------------|------|
| - | - | - | - | 初始化 |

---

## API 管理

| 服务名 | 用途 | 环境变量名 | 文档 | 状态 |
|-------|------|-----------|------|------|
| - | - | - | - | - |

> ⚠️ 不在此文件存储实际 Key 值，Key 存于 .env（已加入 .gitignore）

---

## 技术栈 <!-- AUTO -->

| 分类 | 技术 | 版本 |
|------|------|------|
| 框架 | Expo | - |
| 导航 | Expo Router | - |
| 构建 | EAS Build | - |
| 语言 | TypeScript | - |

[运行 update meta 后从 package.json 自动填充]

---

## 数据表 / 类型结构 <!-- AUTO -->

[运行 update meta 后从 types/ 目录自动生成]

---

## 环境说明

| 环境 | 说明 | EAS Profile |
|------|------|-------------|
| development | 本地开发，Expo Go | development |
| preview | 内测，TestFlight | preview |
| production | 正式发布，App Store | production |
```
