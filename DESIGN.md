# DESIGN.md

> 温润可靠的个人导航首页 —— 每次打开都像回到一个熟悉的桌面

## 1. Visual Theme & Atmosphere

**Style**: Warm Professional
**Keywords**: 温暖、圆润、信赖、清晰、克制、友好、专业、呼吸感
**Tone**: 温润可靠，信息优先 — NOT 花哨装饰、NOT 冰冷科技、NOT 密集压迫
**Feel**: 像一杯手冲咖啡旁的整洁桌面——温暖但不散漫，专业但不疏远

**Interaction Tier**: L1 精致静态
**Dependencies**: CSS only（无 GSAP / Lenis）

## 2. Color Palette & Roles

```css
:root {
  /* Backgrounds */
  --bg: #ffffff;
  --surface: #ffffff;
  --surface-alt: #f8f9fa;
  --surface-hover: #f1f3f5;

  /* Borders */
  --border: #e9ecef;
  --border-hover: #ced4da;

  /* Text */
  --text: #212529;
  --text-secondary: #868e96;
  --text-tertiary: #adb5bd;

  /* Accent */
  --accent: #4c6ef5;
  --accent-hover: #3b5bdb;
  --accent-soft: rgba(76, 110, 245, 0.08);
  --accent-soft-hover: rgba(76, 110, 245, 0.14);

  /* Secondary Accent */
  --amber: #f59f00;
  --amber-soft: rgba(245, 159, 0, 0.1);

  /* Semantic */
  --success: #40c057;
  --success-soft: rgba(64, 192, 87, 0.1);
  --error: #fa5252;
  --error-soft: rgba(250, 82, 82, 0.1);
  --warning: #fab005;
  --warning-soft: rgba(250, 176, 5, 0.1);

  /* RGB for rgba() */
  --bg-rgb: 255, 255, 255;
  --accent-rgb: 76, 110, 245;
  --surface-rgb: 255, 255, 255;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  --shadow-accent: 0 4px 14px rgba(76, 110, 245, 0.25);

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}

[data-theme="dark"] {
  --bg: #0f1117;
  --surface: #1a1d27;
  --surface-alt: #1e2130;
  --surface-hover: #252838;

  --border: #2c3040;
  --border-hover: #3d4259;

  --text: #e1e4ec;
  --text-secondary: #8b8fa3;
  --text-tertiary: #5c6078;

  --accent: #6c8cff;
  --accent-hover: #8da6ff;
  --accent-soft: rgba(108, 140, 255, 0.1);
  --accent-soft-hover: rgba(108, 140, 255, 0.18);

  --amber: #fcc419;
  --amber-soft: rgba(252, 196, 25, 0.12);

  --success: #51cf66;
  --success-soft: rgba(81, 207, 102, 0.12);
  --error: #ff6b6b;
  --error-soft: rgba(255, 107, 107, 0.12);
  --warning: #ffd43b;
  --warning-soft: rgba(255, 212, 59, 0.12);

  --bg-rgb: 15, 17, 23;
  --accent-rgb: 108, 140, 255;
  --surface-rgb: 26, 29, 39;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-accent: 0 4px 14px rgba(108, 140, 255, 0.2);
}
```

**Color Rules:**
- 所有颜色通过 CSS 变量引用，组件中禁止硬编码 hex
- 语义色（success/error/warning）只用在小标签、进度条阈值和 toast 提示，不作为大面积填充色
- 同一组件内只用一个强调色区域（accent 或 amber，不重叠）
- 交互态一律使用 `*-soft` 背景变体，不用纯 accent 色块做 hover 背景（保持温润感）
- Dark mode 下 border 对比度不低于 3:1（确保可读性）

## 3. Typography Rules

**Font Stack:**
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&display=swap');
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Page Title | Plus Jakarta Sans, Noto Sans SC | 1.25rem | 700 | 1.3 | -0.01em |
| Section Title | Plus Jakarta Sans, Noto Sans SC | 0.9375rem | 600 | 1.4 | — |
| Body | Plus Jakarta Sans, Noto Sans SC | 0.875rem | 400 | 1.6 | — |
| Label | Plus Jakarta Sans, Noto Sans SC | 0.75rem | 500 | 1.4 | 0.03em |
| Mono / Kbd | JetBrains Mono, monospace | 0.75rem | 500 | 1.4 | — |
| Stat Number | Plus Jakarta Sans | 1.75rem | 700 | 1.2 | -0.02em |

**Typography Rules:**
- 中文内容行高 ≥ 1.7，letter-spacing: 0.02em
- 标题 weight ≥ 600，正文 weight = 400
- `font-family` 链: `"Plus Jakarta Sans", "Noto Sans SC", system-ui, sans-serif`
- Mono 链: `"JetBrains Mono", "Fira Code", monospace`
- **NEVER use**: Comic Sans, Papyrus, Times New Roman, Arial 作为主字体

**Text Decoration:**
- Page Title: 无渐变、无投影（Warm Professional 克制风格）
- Section Title: 无装饰，纯靠 weight 和 size 建立层级
- 链接 hover: color transition 0.15s，无 text-shadow

## 4. Component Stylings

### Buttons

**Primary Button**（CTA、确认操作）
```css
.btn-primary {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: var(--shadow-sm);
}
.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: var(--shadow-accent);
  transform: translateY(-1px);
}
.btn-primary:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}
.btn-primary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
```

**Secondary Button**（取消、非主要操作）
```css
.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-secondary:hover {
  background: var(--surface-hover);
  border-color: var(--border-hover);
}
.btn-secondary:active {
  background: var(--surface-alt);
}
.btn-secondary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Ghost Button**（header 工具按钮、标签按钮）
```css
.btn-ghost {
  background: var(--surface-alt);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 4px 12px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-ghost:hover {
  background: var(--surface-hover);
  color: var(--text);
  border-color: var(--border-hover);
}
.btn-ghost:active {
  background: var(--surface-alt);
}
.btn-ghost:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.btn-ghost.active {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: var(--accent);
}
```

**Danger Button**（删除操作）
```css
.btn-danger {
  background: var(--error);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-danger:hover {
  background: #e03131;
  box-shadow: 0 2px 8px rgba(250, 82, 82, 0.3);
}
.btn-danger:active {
  transform: scale(0.97);
}
.btn-danger:focus-visible {
  outline: 2px solid var(--error);
  outline-offset: 2px;
}
```

### Cards

**Bookmark Card**（书签链接卡片）
```css
.bookmark-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}
.bookmark-card:hover {
  background: var(--surface-hover);
  border-color: var(--border-hover);
  box-shadow: var(--shadow-sm);
}
.bookmark-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
```

**Widget Card**（小组件容器）
```css
.widget-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.15s ease;
  min-width: 160px;
}
.widget-card:hover {
  box-shadow: var(--shadow-md);
}
```

**Group Card**（书签分组容器）
```css
.group-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
}
```

### Inputs

```css
.input {
  width: 100%;
  padding: 8px 10px;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  color: var(--text);
  transition: all 0.15s ease;
  outline: none;
}
.input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.input::placeholder {
  color: var(--text-tertiary);
}
```

### Tags / Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  font-size: 0.7rem;
  font-weight: 500;
  border-radius: 4px;
  letter-spacing: 0.02em;
}
.badge-default {
  background: var(--surface-alt);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}
.badge-accent {
  background: var(--accent-soft);
  color: var(--accent);
}
.badge-success {
  background: var(--success-soft);
  color: var(--success);
}
.badge-error {
  background: var(--error-soft);
  color: var(--error);
}
```

### Progress Bar

```css
.progress-track {
  height: 6px;
  background: var(--surface-alt);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}
.progress-bar-normal { background: var(--accent); }
.progress-bar-warning { background: var(--warning); }
.progress-bar-danger { background: var(--error); }
```

### Overlay Backdrop

```css
.overlay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(var(--bg-rgb), 0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
  animation: fadeIn 0.15s ease;
}
```

### Modal / Dialog

```css
.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
```

## 5. Layout Principles

**Container:**
- Max width: 1280px（`max-w-screen-xl`）
- Content padding: 24px（`px-6`）
- Narrow variant: 480px（modals / forms）

**Spacing Scale:**
- Section gap: 24px（`gap-6`）
- Component gap: 16px（`gap-4`）
- Card internal padding: 16px（`p-4`）
- Tight gap: 8px（`gap-2`）
- Inline gap: 4px（`gap-1`）

**Grid:**
```css
/* Bookmark groups */
.bookmark-grid {
  display: grid;
  grid-template-columns: repeat(var(--columns, 3), 1fr);
  gap: 16px;
}

/* Responsive override */
@media (max-width: 768px) {
  .bookmark-grid { grid-template-columns: 1fr; }
}
@media (max-width: 1024px) and (min-width: 769px) {
  .bookmark-grid { grid-template-columns: repeat(2, 1fr); }
}
```

**Z-Index Layers:**
| Layer | z-index | Use |
|-------|---------|-----|
| Base | 0 | Page content |
| Edit overlay | 10 | Edit mode badges |
| AI Panel | 100 | Side panel |
| Modal | 200 | Settings, Login |
| Command Palette | 300 | Search overlay |
| Toast | 400 | Notifications |

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | 无阴影，1px border | 页面背景容器、分组标题 |
| Subtle | `var(--shadow-sm)` | Widget cards（默认态） |
| Resting | `var(--shadow-md)` | Widget cards（hover）、书签卡片 |
| Elevated | `var(--shadow-lg)` | Modals、Command Palette、AI Panel |
| Accent glow | `var(--shadow-accent)` | Primary button hover |

## 7. Animation & Interaction

**Motion Philosophy**: 克制优雅，只用 opacity 和 transform，时长不超过 200ms
**Tier**: L1 精致静态

### Entrance Animation

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Stagger entrance for grid items */
.stagger-item {
  animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.stagger-item:nth-child(1) { animation-delay: 0ms; }
.stagger-item:nth-child(2) { animation-delay: 40ms; }
.stagger-item:nth-child(3) { animation-delay: 80ms; }
.stagger-item:nth-child(4) { animation-delay: 120ms; }
.stagger-item:nth-child(5) { animation-delay: 160ms; }
/* Cap at 0.3s total stagger */
.stagger-item:nth-child(n+8) { animation-delay: 280ms; }
```

### Scroll Behavior

无滚动动效（Dashboard 场景，信息必须立即可见）。

### Hover & Focus States

```css
/* All interactive elements */
*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Card hover — subtle elevation + border */
.hover-lift:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border-hover);
}

/* Icon hover — gentle scale */
.hover-scale:hover {
  transform: scale(1.05);
}

/* Chevron rotation — for collapse toggle */
.chevron {
  transition: transform 0.15s ease;
}
.chevron.collapsed {
  transform: rotate(-90deg);
}
```

### Special Effects

无特殊效果（L1 档位，Dashboard 场景不需要光标跟随或粒子）。

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 8. Do's and Don'ts

### Do
- 用 `var(--accent-soft)` 做 hover 背景，而非实色（温润感的关键）
- 让间距和圆角传递「友好」+ 「可靠」（12px radius、16px gap）
- 保证每个交互元素有 hover + focus-visible 态
- 用 shadow 层级区分信息深度（flat → subtle → elevated）
- 保持 header 简洁（一行，不超过 6 个操作按钮）

### Don't
- ❌ 禁止硬编码 hex 颜色 — 一律用 CSS 变量
- ❌ 禁止 animation duration > 300ms（Dashboard 要即时响应）
- ❌ 禁止在大面积区域用 `backdrop-filter: blur()` > 8px（性能杀手）
- ❌ 禁止 `filter: blur()` 在移动元素上（GPU 压力）
- ❌ 禁止使用 Emoji 作为 UI 图标（Playful 风格外禁止）
- ❌ 禁止 z-index 跳跃式分配（必须按层级表顺序）
- ❌ 禁止模态框无入场动画直接出现（至少 0.15s fadeIn+scaleIn）
- ❌ 禁止在 Dashboard 页面使用 scroll reveal（信息必须立即可见）
- ❌ 禁止红色/琥珀色作为大面积填充色（仅用于标签和进度条阈值）
- ❌ 禁止使用 "x" 字符做关闭按钮（必须用 SVG icon）

## 9. Responsive Behavior

**Breakpoints:**
| Name | Width | Key Changes |
|------|-------|-------------|
| Desktop | > 1024px | 多列 grid、AI side panel 右侧抽屉 |
| Tablet | 768–1024px | 2 列 grid、AI panel 覆盖更多宽度 |
| Mobile | < 768px | 单列、header 折叠、AI panel 全屏 |

**Touch Targets:** minimum 44×44px
**Collapsing Strategy:**
- Bookmark grid 列数响应式覆盖配置值
- Header 按钮在移动端收缩为 icon-only
- AI Panel 在移动端全屏覆盖
- Command Palette 在移动端宽度 95vw

```css
/* Mobile header */
@media (max-width: 768px) {
  .header-actions .btn-label {
    display: none;
  }
  .header-actions button {
    padding: 8px;
    min-width: 44px;
    min-height: 44px;
  }
}

/* Mobile AI panel */
@media (max-width: 768px) {
  .ai-panel {
    width: 100vw;
  }
}

/* Mobile command palette */
@media (max-width: 768px) {
  .command-palette {
    width: 95vw;
  }
}
```
