# DESIGN.md

> 少即是多——用大留白和大字对比建立层次，让内容自己说话。

## 1. Visual Theme & Atmosphere

**Style**: 极简克制 (Minimal Pure)
**Keywords**: 干净、留白、精确、安静、高级、呼吸感
**Tone**: 安静自信 — NOT 喧闹花哨
**Feel**: 美术馆白墙上的一行字

**Interaction Tier**: L1（精致静态 + 简单入场动画）
**Dependencies**: CSS only

## 2. Color Palette & Roles

```css
:root {
  /* Backgrounds */
  --bg: #FAFAFA;
  --surface: #FFFFFF;
  --surface-alt: #F5F5F5;
  --surface-hover: #F0F0F0;

  /* Borders */
  --border: #E8E8E8;
  --border-hover: #CCCCCC;

  /* Text */
  --text: #1A1A1A;
  --text-secondary: #555555;
  --text-tertiary: #888888;

  /* Accent */
  --accent: #0066FF;
  --accent-hover: #0052CC;

  /* RGB variants */
  --accent-rgb: 0,102,255;

  /* Semantic */
  --success: #16A34A;
  --error: #DC2626;
}
```

**Color Rules:**
- 所有颜色通过 CSS 变量引用，禁止硬编码 hex
- 强调色仅用于链接、CTA、活跃态——标题和正文不染色
- 同一 section 内只用一个强调色

## 3. Typography Rules

**Font Stack:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Hero H1 | Inter, Noto Sans SC | clamp(2.5rem, 5vw, 4rem) | 700 | 1.1 | -0.03em |
| Section H2 | Inter, Noto Sans SC | 1.75rem | 600 | 1.3 | -0.02em |
| H3 | Inter, Noto Sans SC | 1.15rem | 600 | 1.4 | — |
| Body | Inter, Noto Sans SC | 1rem | 400 | 1.7 | 0.02em |
| Label | Inter | 0.75rem | 500 | 1.4 | 0.05em |
| Mono/Code | JetBrains Mono, monospace | 0.9rem | 400 | 1.7 | — |

**Typography Rules:**
- Heading weight ≥ 600, body weight ≤ 400
- 中文行高 ≥ 1.7, 字距 0.02em
- font-family 链：中文字族在前，英文作为 fallback

**Text Decoration:**
- Hero h1: 无渐变、无投影（极简克制风格禁止）
- Section h2: 无装饰
- 正文: 无任何装饰

## 4. Component Stylings

### Buttons
```css
.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1.5rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  font-family: inherit;
  transition: all 0.2s ease;
  background: var(--accent);
  color: #FFFFFF;
  border: none;
  cursor: pointer;
  text-decoration: none;
}
.btn:hover { background: var(--accent-hover); color: #FFFFFF; }
.btn:active { transform: scale(0.97); }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.btn-outline {
  background: transparent;
  border: 1.5px solid var(--border);
  color: var(--text);
}
.btn-outline:hover { border-color: var(--accent); color: var(--accent); }
.btn-outline:active { transform: scale(0.97); }
.btn-outline:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

### Cards
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.75rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.card:hover {
  border-color: var(--border-hover);
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
```

### Navigation
```css
.nav {
  position: fixed;
  top: 0;
  width: 100%;
  padding: 1rem 2rem;
  background: rgba(250,250,250,0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
  z-index: 100;
  transition: background 0.2s;
}
.nav a {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
  transition: color 0.15s;
}
.nav a:hover { color: var(--accent); }
```

### Links
```css
a { color: var(--accent); text-decoration: none; transition: color 0.15s; }
a:hover { color: var(--accent-hover); }
```

### Tags / Badges
```css
.tag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  background: var(--surface-alt);
  color: var(--text-secondary);
}
```

## 5. Layout Principles

**Container:**
- Max width: 1080px
- Padding: 0 1.5rem
- Narrow variant (code blocks): 680px

**Spacing Scale:**
- Section padding: 6rem 0
- Component gap: 1.5rem
- Card internal padding: 1.75rem

**Grid:**
```css
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}
```

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | 无阴影 | 默认状态 |
| Subtle | box-shadow: 0 2px 12px rgba(0,0,0,0.04) | 卡片 hover |
| Code | box-shadow: inset 0 0 0 1px var(--border) | 代码块 |

## 7. Animation & Interaction

**Motion Philosophy**: 克制优雅，只用 opacity 和 transform，无弹跳无回弹
**Tier**: L1

### Entrance Animation
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.fade-in {
  opacity: 0;
  animation: fadeInUp 0.6s ease forwards;
}
.fade-in-delay-1 { animation-delay: 0.1s; }
.fade-in-delay-2 { animation-delay: 0.2s; }
.fade-in-delay-3 { animation-delay: 0.3s; }
```

### Scroll Reveal (IntersectionObserver)
```js
// Lightweight scroll reveal — no dependencies
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('revealed');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
```

```css
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal.revealed {
  opacity: 1;
  transform: translateY(0);
}
```

### Hover & Focus States
```css
/* Card hover — lift + shadow */
.card:hover {
  border-color: var(--border-hover);
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  transform: translateY(-2px);
  transition: all 0.2s ease;
}

/* Button hover — color shift */
.btn:hover { background: var(--accent-hover); }

/* Link hover — underline */
a:hover { text-decoration: underline; text-underline-offset: 3px; }
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  .fade-in, .reveal {
    opacity: 1;
    transform: none;
    animation: none;
    transition: none;
  }
}
```

## 8. Do's and Don'ts

### Do
- 大量留白，section 间距 ≥ 6rem
- 用字号对比建立层次（h1 大、body 小）
- 强调色仅用于 CTA 和链接
- 图片用 border-radius: 12px 圆角
- 代码块用等宽字体 + 淡色背景

### Don't
- ❌ 标题染色（用 var(--text)，不用 accent）
- ❌ 多色强调（同一页面只用一种 accent）
- ❌ 装饰性渐变文字
- ❌ 重阴影、glow 效果
- ❌ 弹跳/回弹动画（只用 ease）
- ❌ 全屏 WebGL / 3D 效果
- ❌ 自动播放视频
- ❌ 装饰性背景纹理

## 9. Responsive Behavior

**Breakpoints:**
| Name | Width | Key Changes |
|------|-------|-------------|
| Desktop | > 768px | 3 列 grid, 大字号 hero |
| Mobile | ≤ 768px | 单列, 小字号 hero, 缩减间距 |

**Touch Targets:** minimum 44×44px
**Collapsing Strategy:** 3 列 → 1 列, 2 列 → 1 列

```css
@media (max-width: 768px) {
  .grid-3, .grid-2 { grid-template-columns: 1fr; }
  .section { padding: 4rem 0; }
  .hero h1 { font-size: 2rem; }
}
```
