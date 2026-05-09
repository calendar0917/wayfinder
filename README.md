# Homepage

一个带 AI 助手的自托管导航仪表盘。用自然语言管理你的书签、小组件和集成服务。

[English](README.en.md)

## 功能特性

- **AI 助手** — 用对话操控仪表盘：添加书签、调整布局、更换主题、配置集成，全部通过自然语言完成
- **书签管理** — 拖拽排序、嵌套子分组、标签系统、自动获取图标、HTTP 状态检测
- **Docker 集成** — 直接在仪表盘上监控容器运行状态
- **实时数据集成** — 轮询任意 JSON API，以类型化格式展示（字节、百分比、温度等），内置常用服务模板
- **小组件** — 时钟、问候语、天气、搜索栏、系统资源、笔记、自定义 Logo
- **多页面** — 将分组组织到不同标签页中（工作、个人、家庭服务器……）
- **身份认证** — bcrypt 密码哈希 + httpOnly HMAC 签名 Cookie
- **YAML 即配置** — 单一 `settings.yaml` 文件，自动 Git 提交，支持撤销
- **明暗主题** — CSS 变量系统，支持自定义 CSS 注入
- **PWA** — Service Worker 离线支持
- **命令面板** — `Cmd+K` 快速搜索和 AI 对话

## 快速开始

```bash
# 克隆
git clone https://github.com/YOUR_USERNAME/homepage.git
cd homepage

# 配置
cp .env.example .env.local
cp data/settings.example.yaml data/settings.yaml

# 生成认证密钥
echo "AUTH_SECRET=$(openssl rand -hex 32)" >> .env.local

# 启动
docker compose up -d
```

打开 `http://localhost:3000`，通过设置对话框或 AI 对话设置密码。

### AI 配置（可选）

启用 AI 助手需要配置 OpenAI 兼容的 API：

```bash
# 在 .env.local 中添加
HOMEPAGE_API_KEY=sk-your-api-key
HOMEPAGE_API_BASE=https://api.openai.com/v1    # 或任意兼容端点
HOMEPAGE_AI_MODEL=gpt-4o                         # 或你偏好的模型
```

也可以直接在仪表盘的设置对话框中配置。

### 不使用 Docker

```bash
npm ci
npm run dev
```

## 配置说明

所有配置位于 `data/settings.yaml`，支持环境变量替换：

```yaml
settings:
  apiKey: ${HOMEPAGE_API_KEY}
  passwordHash: ${HOMEPAGE_PASSWORD_HASH}
```

完整配置示例见 `data/settings.example.yaml`，字段文档见 [docs/CONFIG_SCHEMA.md](docs/CONFIG_SCHEMA.md)。

### AI 工具列表

AI 助手可执行 27 种操作：

| 类别 | 工具 |
|------|------|
| 书签 | 添加、删除、更新、移动、重排、搜索 |
| 分组 | 添加、删除、重命名 |
| 页面 | 添加、删除、更新 |
| 外观 | 更换主题、调整布局、修改标题、自定义 CSS |
| 小组件 | 添加、删除、更新配置 |
| 集成 | 配置、移除 |
| 设置 | AI 设置、搜索引擎、语言、密码 |
| 系统 | 保存配置、重载配置 |

## 架构

```
Next.js Server
┌──────────────┐    ┌──────────────┐
│   Frontend   │    │  API Routes  │
│  (RSC + CC)  │◄──►│              │
│              │    │ /api/config  │
│  Dashboard   │    │ /api/ai/*    │
│  Widgets     │    │ /api/system  │
│  AI Panel    │    │ /api/auth/*  │
└──────────────┘    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  YAML Config │
                    │ (data volume)│
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Git Repo    │
                    │ (auto-commit)│
                    └──────────────┘
```

完整架构图和数据流见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 开发

```bash
npm ci
npm run dev          # 开发服务器 localhost:3000
npm run lint         # ESLint
npx tsc --noEmit     # 类型检查
npm test             # Vitest
npm run build        # 生产构建
```

## 文档

- [架构说明](docs/ARCHITECTURE.md) — 系统架构图和数据流
- [API 文档](docs/API_SPEC.md) — REST API 参考
- [配置 Schema](docs/CONFIG_SCHEMA.md) — YAML 配置字段说明
- [设计决策](docs/DESIGN_DECISIONS.md) — 记录关键设计选择及其原因

## 许可证

[GPL-3.0](LICENSE)
