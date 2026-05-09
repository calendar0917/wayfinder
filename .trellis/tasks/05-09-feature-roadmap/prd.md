# Feature Roadmap: Weather, CSS+AI, Icons, Integrations, Import, Tags, Docker, Pages

## Goal

在架构修复完成后，按优先级实现竞品对标功能，补齐与 Homepage/Dashy/Homarr 的差距。按"用户感知价值 / 工作量"排序分 Phase 实施。

## Prerequisites

- `05-09-arch-fixes` 已完成（特别是 WidgetConfig 类型化、predictConfig 删除）

---

## Phase 1: Quick Wins（1-2 天）

### F1: Weather Widget 接通

**现状**: `src/lib/weather.ts` 后端已实现（Open-Meteo，免费无需 API key，接受 lat/lng/units），但 `WeatherWidget.tsx` 是 placeholder，不读取 config 不调用后端。

**实现**:
- 新增 `GET /api/weather?location=&units=`，服务端用 Open-Meteo 的 geocoding API 把城市名转 lat/lng，再调已有的 `getWeather()`
- `WeatherWidget.tsx` 从 `widget.config` 读 `location` 和 `units`，调 `/api/weather`
- 渲染：温度（大字） + 天气图标（emoji） + 描述 + 风速
- Settings 的 Widget 编辑（或直接在 widget 上点 edit）加城市名和单位输入

**Files**: `WeatherWidget.tsx`, 新增 `src/app/api/weather/route.ts`

### F2: 自定义 CSS + AI Tool

**实现**:
- `Settings` 类型加 `customCss?: string`（`types/config.ts` + `config-schema.ts`）
- `SettingsDialog.tsx` 加 `<textarea>` 在语言设置下方，label "Custom CSS"
- 新 mutation `update_custom_css`（`ai-tools.ts` + `Dashboard.tsx` + `SettingsDialog.tsx`）
- `layout.tsx` 或 `Dashboard.tsx` 渲染：
  ```tsx
  {config.settings.customCss && (
    <style dangerouslySetInnerHTML={{ __html: config.settings.customCss }} />
  )}
  ```
- AI tool: 在 `ai-tools.ts` 加 `update_custom_css` operation，接受 `{ css: string }`
- AI system prompt 加一段："You can modify the page appearance using update_custom_css. Write raw CSS using CSS custom properties (e.g. --accent, --bg) and standard selectors."
- AI 能读取当前 customCss 值（通过 config 上下文），支持增量修改

**Files**: `types/config.ts`, `config-schema.ts`, `ai-tools.ts`, `SettingsDialog.tsx`, `Dashboard.tsx`

### F3: 图标库（Simple Icons）

**实现**:
- 集成 [Simple Icons](https://simpleicons.org/) CDN：图标 URL 格式 `https://cdn.simpleicons.org/{slug}/{color}`
- `BookmarkEditModal.tsx` 图标输入旁加"选图标"按钮，弹出搜索面板
- 搜索面板：input 输入关键词 → 从本地的 slug 列表（JSON 文件或内嵌前 200 个常用图标）过滤 → 点击填入 URL
- 自动匹配：添加书签时从 URL 域名推导 icon slug（映射表：youtube→youtube, github→github, reddit→reddit 等约 50 个常见域名）
- `favicon.ts` 的 `getFaviconUrl()` 加一级 fallback：先尝试 Simple Icons，失败再 fallback 到 `/favicon.ico`

**Files**: `BookmarkEditModal.tsx`, `favicon.ts`, 新增 `src/lib/simple-icons.ts`（slug 映射表）

---

## Phase 2: Integration 增强（2-3 天）

### F4: Integration 显示增强

**现状**: 三种模式（inline/badge/card）都是纯文本。从 Pi-hole 拿到 `ads_percentage_today: 23.5` 只显示文字，没有进度条/状态指示器。

**实现**:
- `IntegrationField` 类型加可选 `type` 字段：
  ```ts
  type IntegrationFieldType = "text" | "number" | "percent" | "status" | "bytes" | "duration" | "bitrate" | "temperature";
  ```
- `IntegrationDisplay.tsx` 按 type 分支渲染：
  - `percent`: 进度条 + 百分比数字（如 `23.5% ████░░░░`）
  - `status`: 彩色圆点（绿/黄/红，根据 statusMap 映射）
  - `bytes`: 自动换算（1.2 GB, 456 MB）
  - `duration`: 时间格式化（2d 3h, 45m）
  - `number`: 格式化数字（1,234,567）
  - `bitrate`: 速率格式化（12.5 MB/s）
  - `temperature`: 温度 + 颜色阈值
- 后端 field 配置同步加 `type` 字段（`types/config.ts` + `config-schema.ts`）
- `BookmarkEditModal` integration 配置中每个 field 加 type 下拉选择

**Files**: `IntegrationDisplay.tsx`, `types/config.ts`, `config-schema.ts`, `BookmarkEditModal.tsx`

### F5: 集成模板

**现状**: 用户需手动配置 endpoint/headers/fields/type，门槛高。

**实现**:
- 新增 `src/lib/integration-templates.ts`，包含预设模板数组：
  ```ts
  const INTEGRATION_TEMPLATES = [
    { id: "pihole", name: "Pi-hole", icon: "🛡️",
      endpoint: "http://pihole/admin/api.php",
      fields: [
        { path: "ads_percentage_today", label: "Ads Blocked", type: "percent" },
        { path: "domains_being_blocked", label: "Domains", type: "number" },
      ],
      display: "card" },
    { id: "sonarr", name: "Sonarr", icon: "📺",
      endpoint: "http://sonarr:8989/api/v3/series?apiKey=${SONARR_API_KEY}",
      fields: [{ path: "length", label: "Series", type: "number" }],
      display: "badge" },
    // Plex, Jellyfin, Proxmox, NZBGet, Portainer, Radarr, Lidarr, qBittorrent, Unraid, Traefik...
  ];
  ```
- `BookmarkEditModal` integration 区域加"选择预设"下拉
- 选择后自动填充 endpoint、headers（含 `${ENV_VAR}` 占位符）、fields（含 type）、display mode
- 用户只需填域名/端口和确认 env var 名称

**Files**: 新增 `src/lib/integration-templates.ts`, 修改 `BookmarkEditModal.tsx`

---

## Phase 3: 导入 + 标签（2-3 天）

### F6: 浏览器书签导入 + AI 整理

**实现**:
- `SettingsDialog.tsx` 导入区域加"导入浏览器书签"按钮，接受 `.html` 文件
- 新增 `POST /api/bookmarks/import/browser`：
  - 用 cheerio 解析 Netscape HTML 格式（`<DT><A HREF="...">名称</A>` 层级结构）
  - 提取 URL + 名称 + 文件夹层级，转成 `{ groups: [{name, bookmarks}] }`
  - 返回预览数据给前端
- 前端显示预览后提供两个选项：
  - **直接导入**：保持浏览器原有文件夹结构，走现有 merge 逻辑
  - **AI 整理**：把书签列表 + 已有分组发给 AI，AI 用 `add_bookmark`/`add_group` tool 自动归类
    - Prompt: "Here are {N} bookmarks from a browser export. Organize them into logical groups. Merge into existing groups where appropriate. Current groups: {existingGroupNames}."
- AI 整理过程在 AISidePanel 中展示（tool calling 反馈可见）

**Files**: 新增 `src/app/api/bookmarks/import/browser/route.ts`, 修改 `SettingsDialog.tsx`, 新增 `src/lib/bookmark-parser.ts`

### F7: 其他 Homepage 配置导入

**实现**:
- 复用 `/api/config/import` 路由，加 `format` 参数：
  - `format: "native"` (默认，当前 JSON 格式)
  - `format: "homepage"` (gethomepage.dev YAML)
  - `format: "dashy"` (Dashy YAML)
- 新增 `src/lib/import-normalizers.ts`，每种格式一个 `normalizeXxxConfig()` 函数：
  - `normalizeHomepageConfig(yaml)`: 解析 YAML 的 `services:` → groups
  - `normalizeDashyConfig(yaml)`: 解析 YAML 的 `sections:` → groups
- 转成统一的 `{ groups: [{name, bookmarks}] }` 后走现有 merge/replace 逻辑
- SettingsDialog 加格式选择下拉

**Files**: 新增 `src/lib/import-normalizers.ts`, 修改 `src/app/api/config/import/route.ts`, 修改 `SettingsDialog.tsx`

### F8: 标签显示 + 过滤

**现状**: 标签存了但无 UI。Schema 有 `tags: string[]`，编辑时可输入逗号分隔，但卡片上不显示，不能按标签过滤。

**实现**:
- `BookmarkCard.tsx`：描述行下方显示 tag 胶囊（小号 `rounded-full bg-[var(--accent-soft)] text-[var(--accent)]`）
- `BookmarkGrid.tsx` 顶栏：加横向可滚动 tag filter bar
  - 采集所有书签的 tags，去重排序
  - 点击某个 tag 过滤显示只含该 tag 的书签组
  - 再次点击取消过滤
- `CommandPalette`：搜索时同时匹配 tags（现有代码只在 name/url 上 filter）

**Files**: `BookmarkCard.tsx`, `BookmarkGrid.tsx`, `CommandPalette.tsx`

---

## Phase 4: Docker 管控 + 多页面（3-4 天）

### F9: Docker 管理（start/stop/restart）

**实现**:
- `GET /api/docker/status` 扩展，额外返回 container ID
- 新增 `POST /api/docker/action`：`{ containerId, action: "start" | "stop" | "restart" }`
  - 调 Docker Engine API：`POST /containers/{id}/${action}`
  - 只在 `config.settings.docker.allowManagement === true` 时启用
  - 需 authenticated + canEdit
- `BookmarkCard` Docker 状态点击后弹出上下文菜单（start/stop/restart）
- `docker-compose.yml` 加 `HOMEPAGE_DOCKER_MANAGE=true` 环境变量示例

**Files**: 修改 `src/app/api/docker/status/route.ts`, 新增 `src/app/api/docker/action/route.ts`, 修改 `BookmarkCard.tsx`, 修改 `types/config.ts`

### F10: 多页面 Tab

**实现 Route A（Tab 系统）**:
- Config 加 `pages?: [{ name: string; groups: string[] }]`
  - 默认只有一个 page（显示所有 groups）
  - 用户可在 Settings 中创建多个 page，每个分配若干 group name
- `Dashboard.tsx` 顶栏加 Tab bar（在标题和按钮之间）
- 切换 Tab 时过滤显示的 groups（`config.groups.filter(g => activePage.groups.includes(g.name))`）
- Tab 管理在 Settings Dialog 中（新增 Page 管理区域）

**Files**: `types/config.ts`, `config-schema.ts`, `Dashboard.tsx`, `SettingsDialog.tsx`, `ai-tools.ts`

---

## AI 对话持久化（独立小功能，随时可做）

### F11: AI 对话持久化

**实现**:
- `AISidePanel.tsx` 中 `localStorage.setItem("ai-conversation", JSON.stringify(messages))` 在 messages 变化时写入
- 面板打开时 `localStorage.getItem("ai-conversation")` 恢复
- Clear 按钮同时清 localStorage
- 如 messages 太大（>100KB），只保留最近 50 条

**Files**: `AISidePanel.tsx`

---

## Acceptance Criteria

### Phase 1
- [ ] WeatherWidget 显示真实天气数据，配置城市名即可用
- [ ] Settings 中可输入 Custom CSS，页面实时生效
- [ ] AI 可以通过对话修改页面样式（如 "把 accent 改成绿色"）
- [ ] 书签编辑有图标搜索，常见域名自动匹配 Simple Icons

### Phase 2
- [ ] Integration field 支持 percent 类型（进度条）、status 类型（彩色圆点）
- [ ] 预制模板下拉可选，选中后自动填充配置
- [ ] 模板覆盖至少 10 个常见服务（Pi-hole, Sonarr, Radarr, Plex, Jellyfin, Portainer, Proxmox, qBittorrent, Unraid, Traefik）

### Phase 3
- [ ] 可导入 Chrome/Firefox 导出的 HTML 书签文件
- [ ] AI 整理模式能自动归类书签到合理分组
- [ ] 可导入 Homepage (YAML) 和 Dashy (YAML) 的配置
- [ ] BookmarkCard 上显示标签，标签栏可过滤

### Phase 4
- [ ] Docker 容器可 start/stop/restart（需配置开启）
- [ ] 多页面 Tab 切换，每个 Tab 显示不同分组
