# Feature Roadmap: Weather, CSS+AI, Icons, Integrations, Import, Tags, Docker, Pages

## Goal

在架构修复完成后，按优先级实现竞品对标功能，补齐与 Homepage/Dashy/Homarr 的差距。按"用户感知价值 / 工作量"排序分 Phase 实施。

## Prerequisites

- `05-09-arch-fixes` 已完成（特别是 WidgetConfig 类型化、predictConfig 删除）

---

## Phase 1: Quick Wins ✅ DONE

Commit: `2357101b` — 2026-05-09

- [x] F1: Weather Widget 接通（`/api/weather` route + WeatherWidget 组件）
- [x] F2: 自定义 CSS + AI Tool（`customCss` in Settings, `update_custom_css` AI tool, `<style>` injection）
- [x] F3: 图标库 Simple Icons（CDN 集成, `simple-icons.ts` slug 映射, BookmarkEditModal 搜索面板, favicon fallback）

---

## Phase 2: Integration 增强 ✅ DONE

- [x] F4: Integration 显示增强 — `IntegrationFieldType` + type-aware rendering + structured field UI in BookmarkEditModal
- [x] F5: 集成模板 — 10 templates (Pi-hole, Sonarr, Radarr, Plex, Jellyfin, Portainer, Proxmox, qBittorrent, Traefik, Unraid)

---

## Phase 3: 导入 + 标签 ✅ DONE

- [x] F6: 浏览器书签导入 — DOMParser-based parser, Import format selector in SettingsDialog
- [x] F7: Homepage/Dashy YAML 导入 — import-normalizers.ts with js-yaml, format dropdown in SettingsDialog
- [x] F8: 标签显示 + 过滤 — tags on BookmarkCard, tag filter bar in BookmarkGrid, CommandPalette tag search

---

## Phase 4: Docker tooltip + 多页面 ✅ DONE

- [x] F9: Docker tooltip — container ID in API response, ID shown in status dot
- [x] F10: 多页面 Tab — Page type, tab bar in Dashboard, AI tools (add/remove/update_page)

---

## 独立小功能 ✅ DONE

- [x] F11: AI 对话持久化 — localStorage save/restore, 100KB auto-trim

### F4: Integration 显示增强

**现状**: `IntegrationDisplay.tsx` 三种模式（inline/badge/card）全是纯文本。`formatValue()` 只做 `toLocaleString`，没有进度条、状态圆点等视觉增强。`IntegrationField` 类型仅有 `{ path: string; label: string }`，无 `type` 字段。

**实现**:
1. `types/config.ts` — `IntegrationField` 加可选 `type` 字段：
   ```ts
   export type IntegrationFieldType = "text" | "number" | "percent" | "status" | "bytes" | "duration" | "bitrate" | "temperature";
   export interface IntegrationField {
     path: string;
     label: string;
     type?: IntegrationFieldType; // default "text"
   }
   ```
2. `config-schema.ts` — field schema 加 `type` 可选字段（带默认值 "text"）
3. `IntegrationDisplay.tsx` — 新增 `renderField(field, value)` 函数按 type 分支渲染：
   - `text`: 当前的 `formatValue()` 逻辑不变
   - `number`: `toLocaleString()` + 缩写（1.2M, 45K）
   - `percent`: 进度条 `<div className="h-1.5 bg-[var(--surface-alt)] rounded-full"><div style={{width: pct}} className="h-full bg-[var(--accent)] rounded-full" /></div>` + 百分比数字
   - `status`: 彩色圆点 `●`，绿/黄/红三档（`running/active/online` → 绿，`stopped/error/offline` → 红，其余 → 黄）
   - `bytes`: 手动换算 KB/MB/GB/TB（`Intl.NumberFormat` unit support 有限，直接算更可靠）
   - `duration`: 秒数 → `Xd Xh` / `Xh Xm` / `Xm Xs`
   - `bitrate`: bytes/sec → `12.5 MB/s`, `1.2 Gbps`
   - `temperature`: `°C`/`°F` + 颜色阈值（<40 绿, 40-70 黄, >70 红）
4. `BookmarkEditModal.tsx` — integration fields 输入从 comma-separated `"path:label"` 改为结构化 UI：每 field 一行 `[path] [label] [type▾]` 三输入，更直观且避免解析歧义。旧数据无 type 时默认 "text"。
5. 迁移兼容：旧配置无 `type` 字段时默认 `text`，不影响现有行为

**Files**: `IntegrationDisplay.tsx`, `types/config.ts`, `config-schema.ts`, `BookmarkEditModal.tsx`

### F5: 集成模板

**现状**: 用户在 `BookmarkEditModal` 的 Integration 区域需手动填写 endpoint / headers / fieldsStr / display / pollInterval。字段格式不直观（headers 是 `Key: Value` 多行，fields 是 comma-separated），门槛高。

**实现**:
1. 新增 `src/lib/integration-templates.ts`，导出 `INTEGRATION_TEMPLATES` 数组：
   ```ts
   export interface IntegrationTemplate {
     id: string;
     name: string;
     icon: string;
     endpoint: string;
     headers?: Record<string, string>;
     fields: Array<{ path: string; label: string; type: IntegrationFieldType }>;
     display: "inline" | "badge" | "card";
   }
   ```
2. 模板列表（≥10 个常见服务）：
   | ID | Service | Key Fields |
   |----|---------|------------|
   | pihole | Pi-hole | ads_percentage_today (percent), domains_being_blocked (number) |
   | sonarr | Sonarr | length (number) — series count |
   | radarr | Radarr | length (number) — movie count |
   | plex | Plex | MediaContainer.size (bytes) |
   | jellyfin | Jellyfin | ActiveDevices (number) |
   | portainer | Portainer | (需 API key, containers count) |
   | proxmox | Proxmox | cpu (percent), mem (bytes) |
   | qbittorrent | qBittorrent | dl_info_speed (bitrate), up_info_speed (bitrate) |
   | unraid | Unraid | (via API plugin, disk usage) |
   | traefik | Traefik | (metrics endpoint) |
3. `BookmarkEditModal.tsx` integration 区域顶部加"Choose template"下拉：
   - 选择后 `setIntegration()` 自动填充 endpoint/headers/fields/display
   - endpoint 中 `${HOST}` 占位符高亮提示用户替换
   - headers 中 `${API_KEY}` 占位符同上
4. 模板填充后用户仍可自由修改所有字段

**Files**: 新增 `src/lib/integration-templates.ts`, 修改 `BookmarkEditModal.tsx`

---

## Phase 3: 导入 + 标签（2-3 天）

### F6: 浏览器书签导入 + AI 整理

**现状**: `/api/config/import` 只接受原生 JSON 格式 `{ groups: ImportGroup[] }`，支持 merge/replace 模式。无 HTML 书签解析能力。

**实现**:
1. 新增 `src/lib/bookmark-parser.ts` — `parseNetscapeBookmark(html: string)`:
   - 用正则或 DOMParser 解析 `<DT><A HREF="url" ...>name</A>` 层级结构
   - `<DL>` 嵌套表示文件夹层级
   - 返回 `{ groups: Array<{ name: string; bookmarks: Array<{ name: string; url: string; tags?: string[] }> }> }`
   - 顶层书签（无文件夹）归入 "Uncategorized" group
   - **不引入 cheerio 依赖**：书签 HTML 结构简单，推荐前端 DOMParser 解析，结果 POST 到现有 `/api/config/import` 路由
2. `SettingsDialog.tsx` Bookmarks 区域加"Import Browser Bookmarks"按钮：
   - `<input type="file" accept=".html,.htm">`
   - 读取文件 → DOMParser 解析 → 预览分组数量和书签数量
   - 两个选项按钮：
     - **Direct Import**: 保持文件夹结构，POST 到 `/api/config/import` (mode: merge)
     - **AI Organize**: 把书签列表 + 现有分组名发给 AI，AI 用 `add_bookmark` / `add_group` tool 归类
       - Prompt: "Here are {N} bookmarks from a browser export. Organize them into logical groups. Merge into existing groups where appropriate. Current groups: {existingGroupNames}."
       - AI 整理过程在 AISidePanel 中可见（tool calling 反馈）
3. 不需要新增后端路由：前端解析 → `normalizeImportBookmark()` 格式化 → 走现有 `/api/config/import`

**Files**: 新增 `src/lib/bookmark-parser.ts`, 修改 `SettingsDialog.tsx`

### F7: 其他 Homepage 配置导入

**现状**: `/api/config/import` route 的 `ImportBookmark` 接口已兼容 `title/name` 和 `href/url`，但只接受 JSON body。

**实现**:
1. 新增 `src/lib/import-normalizers.ts`，导出格式转换函数：
   ```ts
   export function normalizeHomepageConfig(yaml: string): ImportGroup[];
   export function normalizeDashyConfig(yaml: string): ImportGroup[];
   ```
2. `normalizeHomepageConfig()`: 解析 YAML 的 `services:` 下按 group 分组 → `{ name, bookmarks }`
   - Homepage YAML 结构: `services: { groupName: [{ name, url, icon, description }] }`
   - 需要引入 YAML 解析：用 `js-yaml`（轻量，~18KB gzip）
3. `normalizeDashyConfig()`: 解析 YAML 的 `sections:` → groups
   - Dashy YAML: `sections: [{ name, items: [{ title, url, icon, description, tags }] }]`
4. `SettingsDialog.tsx` 加格式选择：
   - 当前 "Import JSON" 按钮改为下拉 + 导入按钮组合
   - 下拉选项：JSON (native) / Homepage (YAML) / Dashy (YAML)
   - 选 JSON 时走原逻辑；选 Homepage/Dashy 时前端读取文件 → `normalizeXxxConfig()` → 走 `/api/config/import`
5. 不需要新增后端路由：前端 YAML → JSON normalize → 现有 import endpoint

**依赖**: 需要 `js-yaml` 包

**Files**: 新增 `src/lib/import-normalizers.ts`, 修改 `SettingsDialog.tsx`, 安装 `js-yaml`

### F8: 标签显示 + 过滤

**现状**: `Bookmark.tags: string[]` 存在数据模型和编辑模态框中，但 `BookmarkCard.tsx` 不渲染，`BookmarkGrid.tsx` 无过滤逻辑。`CommandPalette` 搜索只匹配 name/url。

**实现**:
1. `BookmarkCard.tsx` — 描述行下方添加 tag 胶囊：
   ```tsx
   {bookmark.tags.length > 0 && (
     <div className="flex flex-wrap gap-1 mt-0.5">
       {bookmark.tags.map(tag => (
         <span key={tag} className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">{tag}</span>
       ))}
     </div>
   )}
   ```
2. `BookmarkGrid.tsx` 顶栏加横向可滚动 tag filter bar：
   - 从所有 `groups.flatMap(g => g.bookmarks).flatMap(b => b.tags)` 提取唯一 tags
   - 渲染为水平滚动的胶囊列表，左侧有 "Tags" label
   - 激活的 tag 用 `bg-[var(--accent)] text-white` 样式
   - 点击 tag 设置 `activeTag` state → 传递给 `BookmarkGroup`
   - `BookmarkGroup` 中过滤：只显示 `group.bookmarks.filter(b => b.tags.includes(activeTag))`
   - 再次点击取消过滤
   - 无 tags 的书签在过滤时隐藏
3. `CommandPalette.tsx` — 搜索逻辑扩展匹配 tags：
   - 当前: `b.name.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)`
   - 改为: 上述 + `b.tags.some(t => t.toLowerCase().includes(q))`

**Files**: `BookmarkCard.tsx`, `BookmarkGrid.tsx`, `BookmarkGroup.tsx`（可能需要传 filter prop）, `CommandPalette.tsx`

---

## Phase 4: Docker 管控 + 多页面（3-4 天）

### F9: Docker 只读状态增强（不做管控）

**现状**: `GET /api/docker/status` 通过 `curl --unix-socket` 查询容器状态，返回 `{ name, state, status }`。`useDockerStatus` hook 30s 轮询。BookmarkCard 有 Docker 状态圆点显示（绿/黄/红）。

**保持只读，不做 start/stop/restart 控件。**

**小改进**:
1. `src/app/api/docker/status/route.ts` — 扩展返回 container ID：
   - Docker API `/containers/json` 返回的对象有 `Id` 字段，加上用于前端 key
2. 状态圆点增加 title tooltip 显示完整状态文字（如 "Running (up 3 days)"）

**Files**: 修改 `docker/status/route.ts`, 微调 `BookmarkCard.tsx` tooltip

### F10: 多页面 Tab

**现状**: Dashboard 渲染所有 groups，无 page/tab 概念。`AppConfig` 无 pages 字段。

**实现**:
1. `types/config.ts` — 新增：
   ```ts
   export interface Page {
     name: string;
     groups: string[]; // group names to show on this page
   }
   // Settings 里加:
   pages?: Page[];
   ```
2. `config-schema.ts` — pages 数组 schema
3. `Dashboard.tsx` — tab bar 渲染：
   - 如 `pages` 为空或未定义，显示所有 groups（当前行为，向后兼容）
   - 如有 pages，标题下方渲染 tab bar：`[Tab 1] [Tab 2] [Tab 3]`
   - activeTab state 控制过滤：`groups.filter(g => activePage.groups.includes(g.name))`
   - Tab 用 `border-b-2 border-[var(--accent)]` 表示激活
4. `SettingsDialog.tsx` — 新增 Page 管理区域：
   - 每个 Page 一行：名称 + groups 多选（checkbox list）
   - 添加/删除 Page 按钮
5. `ai-tools.ts` — 新增 `add_page`, `remove_page`, `update_page` operations

**Files**: `types/config.ts`, `config-schema.ts`, `Dashboard.tsx`, `SettingsDialog.tsx`, `ai-tools.ts`

---

## 独立小功能（随时可做）

### F11: AI 对话持久化

**现状**: `AISidePanel.tsx` 的 `messages` 完全用 `useState<Message[]>([])` 管理。面板关闭后消息丢失。无任何 localStorage/database 持久化。

**实现**:
1. `useState` 初始化改为从 localStorage 恢复：
   ```ts
   const [messages, setMessages] = useState<Message[]>(() => {
     try {
       const saved = localStorage.getItem("ai-conversation");
       return saved ? JSON.parse(saved) : [];
     } catch { return []; }
   });
   ```
2. `useEffect` 同步写入：
   ```ts
   useEffect(() => {
     try {
       const json = JSON.stringify(messages);
       if (json.length > 100_000) {
         const trimmed = messages.slice(-50);
         localStorage.setItem("ai-conversation", JSON.stringify(trimmed));
       } else {
         localStorage.setItem("ai-conversation", json);
       }
     } catch { /* quota exceeded: silently ignore */ }
   }, [messages]);
   ```
3. Clear 按钮 `setMessages([])` 会自动触发 useEffect 清空 localStorage

**Files**: `AISidePanel.tsx`

---

## Acceptance Criteria

### Phase 1 ✅
- [x] WeatherWidget 显示真实天气数据，配置城市名即可用
- [x] Settings 中可输入 Custom CSS，页面实时生效
- [x] AI 可以通过对话修改页面样式（如 "把 accent 改成绿色"）
- [x] 书签编辑有图标搜索，常见域名自动匹配 Simple Icons

### Phase 2 ✅
- [x] Integration field 支持 percent 类型（进度条）、status 类型（彩色圆点）、bytes（自动换算）
- [x] BookmarkEditModal integration fields 从 comma-separated 改为结构化 UI（每 field 一行 path+label+type）
- [x] 预制模板下拉可选，选中后自动填充配置
- [x] 模板覆盖至少 10 个常见服务

### Phase 3 ✅
- [x] 可导入 Chrome/Firefox 导出的 HTML 书签文件（前端 DOMParser 解析）
- [ ] AI 整理模式能自动归类书签到合理分组（需人工在 AISidePanel 中触发）
- [x] 可导入 Homepage (YAML) 和 Dashy (YAML) 的配置
- [x] BookmarkCard 上显示标签，标签栏可过滤
- [x] CommandPalette 搜索匹配 tags

### Phase 4 ✅
- [x] Docker 状态 API 返回 container ID
- [x] 多页面 Tab 切换，每个 Tab 显示不同分组
- [x] 无 pages 配置时行为不变（向后兼容）

### F11 ✅
- [x] AI 对话关闭面板后重新打开可恢复
- [x] 超过 100KB 时自动裁剪到最近 50 条
