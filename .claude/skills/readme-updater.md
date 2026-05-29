# Skill: README Updater

## 触发词
`update readme` / `更新readme` / `update docs`

## 执行步骤

### Step 1 - 扫描项目结构
```
扫描以下内容（忽略 node_modules / .git / .expo）：
- 根目录文件列表
- app/ 或 src/ 下的目录结构（最多 3 层）
- package.json 中的 dependencies 和 scripts
- app.json 或 app.config.js
- eas.json（如存在）
- .env.example（如存在）
```

### Step 2 - 更新 README.md 的以下章节

按以下模板结构更新，**保留已有的自定义内容，只更新标注了"AUTO"的章节**：

---

```markdown
# ArCareer

> [保留项目描述，不自动覆盖]

## 快速启动 <!-- AUTO -->

\```bash
# 安装依赖
npm install

# 启动开发服务器
npx expo start

# 在 iOS 模拟器运行（需要 Mac）
npx expo run:ios

# 使用 Expo Go 扫码运行（推荐 Windows 开发）
# 手机安装 Expo Go → 扫描终端二维码
\```

## 项目结构 <!-- AUTO -->

[根据实际扫描结果生成，格式如下]

\```
ArCareer/
├── app/                    # Expo Router 页面（文件即路由）
│   ├── (tabs)/            # Tab 导航页面
│   ├── _layout.tsx        # 根布局
│   └── index.tsx          # 首页
├── components/            # 可复用组件
├── hooks/                 # 自定义 Hook
├── constants/             # 常量、主题色
├── assets/                # 图片、字体
├── docs/                  # 项目文档（META、部署记录）
├── app.json               # Expo 配置
├── eas.json               # EAS Build 配置
└── CLAUDE.md              # Claude Code 工作手册
\```

## 功能地图 <!-- AUTO -->
> 想改某个功能？找对应文件：

| 功能 | 文件路径 | 说明 |
|------|---------|------|
[根据实际文件结构生成，每个主要页面/组件一行]

## 环境变量 <!-- AUTO -->

[从 .env.example 读取，列出所有变量名和用途]
如无 .env.example，标注"请创建 .env.example 并记录变量"]

## 构建 & 部署 <!-- AUTO -->

\```bash
# Preview 构建（TestFlight 内测）
eas build --platform ios --profile preview

# Production 构建
eas build --platform ios --profile production

# 提交 App Store
eas submit --platform ios
\```

## 依赖说明 <!-- AUTO -->

[从 package.json 读取主要依赖，排除开发依赖，简短说明用途]
```

---

### Step 3 - 完成后输出

告知用户：
- 更新了哪些章节
- 发现但未自动处理的内容（如缺少 .env.example）
- 建议手动补充的内容
