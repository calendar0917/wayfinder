# Architecture & Quality Fixes

## Goal

修复架构审计中发现的关键问题，为后续功能开发（Weather、集成模板、书签导入等）铺路。这些问题如果不修，新功能会踩坑（predictConfig 脱节、并发 mutation 覆盖、widget config 无类型）。

## Must Fix（新功能前必须完成）

### M1: Optimistic rollback 写反了

**位置**: `src/hooks/useMutate.ts:58`

**问题**: `snapshotRef.current = predictedConfig` 存的是预测值。失败时回滚到"预测的未来"而非"修改前的原始状态"。

**修复**:
```ts
// 当前（错误）
snapshotRef.current = predictedConfig;
setConfig(predictedConfig);

// 修复
snapshotRef.current = config;       // 保存当前状态
setConfig(predictedConfig);         // 应用乐观更新
```

### M2: 删除 predictConfig，改用 server 返回的 config

**位置**: `src/components/layout/Dashboard.tsx:29-174`（145 行）

**问题**: 客户端 predictConfig 是服务端 executeTool 的镜像，已脱节（15 vs 21 个操作）。每加新 mutation 都需同步两处，漏了就出 bug（当前已缺：move_bookmark, search_bookmarks, change_layout, update_ai_settings, save_config, reload_config）。

**修复**:
- 删除 `predictConfig` 函数和 `deepClone` 辅助函数
- 删除 Dashboard 中所有 `optimisticMutate` 调用，全部改为 `mutate()`
- `mutate()` 内部逻辑改为：发请求 → 收到 server 返回的 `readConfigSafe()` → 直接 `setConfig(serverConfig)`
- 删除 `useMutate` 中的 `optimisticMutate` 函数及其相关逻辑（snapshotRef、rollback 等）
- `useMutate` 的 deps 对象移除 `setConfig`，改为只返回 `mutate`

**Trade-off**: 删除乐观更新意味着每次操作等一次网络往返（本地 YAML read/write 通常 <5ms），用户几乎感知不到。换来的是永远正确的状态。

### M3: WidgetConfig 类型化

**位置**: `src/types/config.ts`, `src/lib/config-schema.ts`

**问题**: `WidgetConfig.config` 是 `Record<string, unknown>`，ClockWidget 里用了 `as any`。新功能（Weather config、集成模板）需要类型化。

**修复**:
```ts
// types/config.ts
interface DateTimeConfig {
  format?: { dateStyle?: string; timeStyle?: string };
  locale?: string;
}

interface WeatherConfig {
  location?: string;      // 城市名
  units?: "metric" | "imperial";
}

type WidgetConfig =
  | { type: "datetime"; config: DateTimeConfig }
  | { type: "greeting"; config: Record<string, unknown> }
  | { type: "weather"; config: WeatherConfig }
  | { type: "resources"; config: Record<string, unknown> }
  | { type: "logo"; config: Record<string, unknown> }
  | { type: "notes"; config: Record<string, unknown> }
  | { type: "search"; config: Record<string, unknown> };
```

- 同步更新 Zod schema（discriminated union）
- ClockWidget 去掉 `as any`
- 各 Widget 组件从 `props.config` 直接读取类型化的字段

### M4: Mutation 序列化

**位置**: `src/app/api/config/mutate/route.ts`

**问题**: 并发 mutation（用户+AI，或快速连续点击）会互相覆盖 YAML 文件。readConfig → executeTool → writeConfig 无原子性保证。

**修复**:
- 在 `src/lib/config.ts` 中加一个简单的 mutex（基于 Promise 队列）：
```ts
let writeQueue = Promise.resolve();

function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = writeQueue;
  let resolve: () => void;
  writeQueue = new Promise(r => { resolve = r; });
  return prev.then(fn).finally(resolve!);
}
```
- `writeConfig()` 和所有调它的路径都用 `withWriteLock()` 包裹
- AI chat route 的 config 写入也走同一队列

## Should Fix（性能问题）

### S1: useKeyboard 每次渲染重绑

**位置**: `src/hooks/useKeyboard.ts`

**问题**: effect deps 包含对象引用（panels, actions），每次渲染都重建 keydown listener。

**修复**: 用 `useRef` 存储 panels/actions，effect 只依赖原始值（如 `panels.aiOpen`, `panels.paletteOpen` 等布尔值）。

### S2: flattenBookmarks 未 memoize

**位置**: `src/components/layout/Dashboard.tsx:176,212`

**问题**: 每次渲染递归遍历整棵 group 树。

**修复**: `useMemo(() => flattenBookmarks(config.groups), [config.groups])`

### S3: 双重 auth 检查

**位置**: 各 API route handler

**问题**: middleware 已做 auth，route handler 又做一遍 `isAuthenticated()`（含 bcrypt compare）。

**修复**: 在 mutate、undo、import、integration/proxy、docker/status 等 route 中移除 `isAuthenticated()` 调用，只保留 middleware 层的 auth。`ai/chat/route.ts` 同理。保留 `checkCsrf()` 和 `checkRateLimit()`。

### S4: 批量 status check

**位置**: `src/hooks/useStatusCheck.ts`, `src/app/api/status-check/route.ts`

**问题**: 每个书签一个请求，20 个书签 = 20 个 HTTP 请求（最多 5 并发）。

**修复**:
- 新增 `POST /api/status-check/batch`，接受 `{ urls: string[] }`，服务端并发检查，返回 `{ [url]: { status, responseTime } }`
- `useStatusCheck` 改为单次批量请求
- 保留旧端点兼容性

## Acceptance Criteria

- [ ] `optimisticMutate` 从 `useMutate` 中删除，`predictConfig` 从 Dashboard 中删除
- [ ] 所有 mutation 走 `mutate()`，用 server 返回的 config 更新状态
- [ ] `WidgetConfig` 是 discriminated union 类型，ClockWidget 无 `as any`
- [ ] `WeatherConfig` 类型存在（location + units 字段）
- [ ] 并发 mutation 不会互相覆盖（mutex 保护 writeConfig）
- [ ] `useKeyboard` 不在每次渲染时重建 listener
- [ ] `flattenBookmarks` 用 `useMemo` 包裹
- [ ] API route 中不重复做 auth 检查
- [ ] Status check 支持批量请求
- [ ] Lint / typecheck / build 通过

## File List

| File | Action | Summary |
|------|--------|---------|
| `src/hooks/useMutate.ts` | modify | 删除 optimisticMutate，简化 mutate 用 server config |
| `src/components/layout/Dashboard.tsx` | modify | 删除 predictConfig/deepClone，所有调用改 mutate，flattenBookmarks memoize |
| `src/types/config.ts` | modify | WidgetConfig discriminated union，加 DateTimeConfig/WeatherConfig |
| `src/lib/config-schema.ts` | modify | 同步 Zod schema 为 discriminated union |
| `src/components/widgets/ClockWidget.tsx` | modify | 去掉 as any，用类型化 config |
| `src/lib/config.ts` | modify | 加 withWriteLock mutex |
| `src/app/api/config/mutate/route.ts` | modify | 用 withWriteLock 包裹写操作，移除重复 auth |
| `src/app/api/ai/chat/route.ts` | modify | config 写入走 mutex，移除重复 auth |
| `src/app/api/config/undo/route.ts` | modify | 移除重复 auth |
| `src/app/api/config/import/route.ts` | modify | 移除重复 auth |
| `src/app/api/integration/proxy/route.ts` | modify | 移除重复 auth |
| `src/app/api/docker/status/route.ts` | modify | 移除重复 auth |
| `src/hooks/useKeyboard.ts` | modify | 用 useRef 存储 deps，避免重绑 |
| `src/hooks/useStatusCheck.ts` | modify | 改用批量端点 |
| `src/app/api/status-check/route.ts` | modify | 新增 batch 端点 |
