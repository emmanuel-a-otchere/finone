# SystemOne — Financial Dashboard Design Specification
> Version 2.0.0 · Full Build Reference for AI-Assisted Reconstruction

---

## 0. Quick Reference

| Property | Value |
|---|---|
| App Name | SystemOne |
| Version | v2.0.0 |
| Theme | Dark (default) / Light toggle |
| Primary Font | Monospace / Tabular (numbers), Sans-serif (labels) |
| Accent Color | Cyan/Teal `#00E5C8` |
| Background | `#0D0F14` |
| Surface | `#141720` |
| Card Surface | `#1A1D27` |
| Border | `#252836` |
| Text Primary | `#E8ECF0` |
| Text Secondary | `#8B95A5` |
| Green Positive | `#22C55E` |
| Red Negative | `#EF4444` |
| Yellow Warning | `#F59E0B` |

---

## 0.1 Version History

| Version | Date | Commit | Changes |
|---|---|---|---|
| v1.1.0 | 2025 | — | Initial spec baseline |
| v1.5.0 | 2025 | — | Full spec build reference |
| v1.6.0 | 2026-07-17 | `7efa868` | UI-1: `GET /api/market/status` (NYSE market hours, is_trading, next_open/close); UI-2: `GET /api/symbols/search?q=` (prefix autocomplete); UI-3: `--text-muted` fixed to `#6B7280` (WCAG AA 4.7:1) |
| v2.0.0 | 2026-07-17 | `2c0fe0d` | P0: TickerStrip WCAG colors/formatting, Layout nav mutual exclusivity, PortfolioDonut dropdown, MarketHeatmap overflow; P1: Heatmap treemap (allocation→grid-span), sector colored left-border accent, shared EmptyState component, empty-state hygiene (hide legend, disable tabs), Portfolio $0→neutral ring, Fear&Greed delta+sparkline, Footer features strip deleted; P2: VIX inverted coloring (rising=red), A/D Ratio labeled readout, Sidebar 11px labels+full text+tooltip, 44px segmented touch controls, Drift gauge needle math+12px scale labels; Fixed: `require('react')` ES module error in MarketSentiment (commit `26b92c2`); Reconciliation: Fear&Greed scale labels 7px→12px |

---

## 1. Design Tokens

### 1.1 Color Palette

```css
:root {
  /* Backgrounds */
  --bg-base:        #0D0F14;   /* page background */
  --bg-surface:     #141720;   /* sidebar, nav bar */
  --bg-card:        #1A1D27;   /* card/widget background */
  --bg-card-hover:  #1F2333;
  --bg-input:       #0F1219;
  --bg-overlay:     rgba(13,15,20,0.85);

  /* Borders */
  --border-default: #252836;
  --border-subtle:  #1E2130;
  --border-active:  #3D4460;

  /* Brand / Accent */
  --accent-cyan:    #00E5C8;
  --accent-cyan-dim:#00B09A;
  --accent-blue:    #3B82F6;
  --accent-purple:  #8B5CF6;

  /* Status */
  --green:          #22C55E;
  --green-dim:      #16A34A;
  --red:            #EF4444;
  --red-dim:        #DC2626;
  --yellow:         #F59E0B;
  --yellow-dim:     #D97706;
  --orange:         #F97316;

  /* Chart Lines */
  --chart-price:    #3B82F6;   /* blue — Price/SPY */
  --chart-ma200:    #F59E0B;   /* amber — 200 MA */
  --chart-sentiment:#A855F7;   /* purple — Sentiment */
  --chart-fg:       #EF4444;   /* red — Fear & Greed */

  /* Sector bar colors (warm→cool by performance) */
  --sector-tech:    #22C55E;
  --sector-comm:    #16A34A;
  --sector-concy:   #15803D;
  --sector-fin:     #EF4444;
  --sector-ind:     #DC2626;
  --sector-util:    #6B7280;
  --sector-hlth:    #6B7280;
  --sector-defcon:  #F97316;
  --sector-energy:  #EF4444;
  --sector-re:      #EF4444;

  /* Text */
  --text-primary:   #E8ECF0;
  --text-secondary: #8B95A5;
  --text-muted:     #4B5568;
  --text-accent:    #00E5C8;

  /* Heatmap cells */
  --hm-strong-up:   #166534;  /* >+2% */
  --hm-up:          #15803D;  /* +0.5 to +2% */
  --hm-flat-up:     #166534;  /* 0 to +0.5% */
  --hm-flat-dn:     #7F1D1D;  /* -0.5 to 0% */
  --hm-dn:          #991B1B;  /* -0.5 to -2% */
  --hm-strong-dn:   #EF4444;  /* < -2% */
}
```

### 1.2 Typography

```css
/* Recommended font stack */
--font-display:  'JetBrains Mono', 'Fira Code', monospace;  /* numbers, tickers, prices */
--font-ui:       'IBM Plex Sans', 'DM Sans', sans-serif;    /* labels, nav, UI text */
--font-mono:     'JetBrains Mono', monospace;               /* data cells */

/* Scale */
--text-xs:    10px;
--text-sm:    11px;
--text-base:  12px;
--text-md:    13px;
--text-lg:    14px;
--text-xl:    16px;
--text-2xl:   20px;
--text-3xl:   24px;
--text-hero:  32px;   /* Portfolio total value */

/* Weights */
--weight-normal:   400;
--weight-medium:   500;
--weight-semibold: 600;
--weight-bold:     700;
```

### 1.3 Spacing & Radius

```css
--space-1:  4px;
--space-2:  6px;
--space-3:  8px;
--space-4:  12px;
--space-5:  16px;
--space-6:  20px;
--space-7:  24px;
--space-8:  32px;

--radius-sm:  4px;
--radius-md:  6px;
--radius-lg:  8px;
--radius-xl:  12px;
--radius-pill:9999px;

--shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px var(--border-default);
--shadow-glow: 0 0 12px rgba(0,229,200,0.15);
```

---

## 2. Layout Architecture

### 2.1 Global Grid

```
┌─────────────────────────────────────────────────────────────┐
│  TOP NAV BAR  (full width, height: 48px, z-index: 100)      │
├──────────┬──────────────────────────────────────────────────┤
│          │  TICKER STRIP  (height: 40px)                    │
│ SIDEBAR  ├──────────────────────────────────────────────────┤
│  64px    │                                                  │
│  (or     │         MAIN CONTENT AREA                        │
│  200px   │         (scrollable, padding: 16px)              │
│  expanded│                                                  │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

- **Top Nav**: `height: 48px`, `background: var(--bg-surface)`, `border-bottom: 1px solid var(--border-default)`
- **Sidebar (collapsed)**: `width: 64px`, icon-only mode
- **Sidebar (expanded)**: `width: 200px`, icon + label mode
- **Main Content**: `calc(100vw - sidebar-width)`, `padding: 16px`, `overflow-y: auto`
- **Content max-width**: None (fluid), column gap `12px`, row gap `12px`

### 2.2 Main Content Column Layout

The main scrollable area uses a **12-column fluid grid** with `gap: 12px`.

```
Row 1: [Ticker Strip — full width, 5 cells]
Row 2: [Fear & Greed — 3 col] [Market Sentiment — 3 col] [Market Breadth — 6 col]
Row 3: [Market Trend Overview — 7 col] [Market Movers — 5 col]
Row 4: [Hot Takes / High Volume — 4 col] [Sector Performance — 4 col] [News & Insights — 4 col]
Row 5: [Market Heatmap — 6 col] [Portfolio Overview — 6 col]
```

---

## 3. Top Navigation Bar

### 3.1 Structure
```
[Logo] [Status Badge] [Version]     [Search Bar]     [Watchlist] [Bell] [Bell2] [Avatar]
left-aligned                         center            right-aligned
```

### 3.2 Specs
- **Logo**: `"⚡ SystemOne"` — lightning bolt icon (cyan), text white, `font-size: 16px, font-weight: 700`
- **Status Badge**: pill shape, `background: rgba(34,197,94,0.15)`, `border: 1px solid var(--green)`, text `"● Connected"` green dot + text `font-size: 10px`
- **Version**: `"v1.1.0"` in `var(--text-muted)`, `font-size: 10px`
- **Search Bar**: `width: 280px`, `height: 32px`, `background: var(--bg-input)`, `border: 1px solid var(--border-default)`, `border-radius: var(--radius-pill)`, placeholder `"Search symbol, layer, signal..."`, search icon left, keyboard shortcut badge right
- **Watchlist button**: text+icon, `font-size: 12px`, `color: var(--text-secondary)`, star icon
- **Bell icons**: icon-only, `color: var(--text-secondary)`, `width/height: 32px`
- **Avatar**: circle `32px`, initials `"A"`, `background: var(--accent-blue)`

---

## 4. Sidebar Navigation

### 4.1 Collapsed State (64px)
- Icon-only navigation
- `background: var(--bg-surface)`
- `border-right: 1px solid var(--border-default)`
- Each icon button: `width: 64px, height: 44px`, centered icon `20px`
- **Active item**: `background: rgba(0,229,200,0.1)`, left border `3px solid var(--accent-cyan)`, icon color `var(--accent-cyan)`
- **Hover**: `background: rgba(255,255,255,0.05)`

### 4.2 Nav Items (top to bottom)
```
Icon    Label           Route
─────────────────────────────
⊞      Dashboard       /dashboard       ← ACTIVE
📊     Market Overview /market
⚡     Signals         /signals
🔍     Screener        /screener
◈      Layers          /layers
💼     Portfolio       /portfolio
⭐     Watchlist       /watchlist
📰     News            /news
🔔     Alerts          /alerts
📋     Reports         /reports
⚙      Settings        /settings
```

### 4.3 Bottom of Sidebar
```
[🌙/☀] [Dark/Light toggle label]   ← theme toggle row
[Avatar] [admin] [Pro Plan]  [→]   ← user profile row
```
- Theme toggle: icon `20px`, `color: var(--text-secondary)`, label `"Dark"` when dark mode
- User row: avatar `28px circle`, name `font-size: 12px font-weight: 500`, plan badge `"Pro Plan" font-size: 10px var(--text-muted)`, logout icon right

### 4.4 Expanded State (200px)
- Same items, icon + label text
- Label: `font-size: 13px, font-weight: 500, color: var(--text-secondary)`
- Active label: `color: var(--text-primary)`

### 4.5 Sub-Menu Specifications (Expanded Sidebar)

When a nav item with children is hovered/clicked, a **fly-out sub-menu** appears:

```
┌──────────────┐  ┌─────────────────────────┐
│ ◈  Layers ▶  │  │ All Layers              │
│              │  │ ─────────────────────── │
│              │  │ ○  Momentum             │
│              │  │ ○  Mean Reversion       │
│              │  │ ○  Options Flow         │
│              │  │ ○  Macro Signals        │
│              │  │ ─────────────────────── │
│              │  │ + Create New Layer      │
└──────────────┘  └─────────────────────────┘
```

**Sub-menu styling:**
```css
.submenu {
  position: absolute;
  left: 200px; /* or 64px collapsed */
  top: [item top offset];
  min-width: 220px;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px var(--border-subtle);
  padding: 6px;
  z-index: 200;
}

.submenu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s;
}

.submenu-item:hover {
  background: rgba(255,255,255,0.06);
  color: var(--text-primary);
}

.submenu-item.active {
  background: rgba(0,229,200,0.08);
  color: var(--accent-cyan);
}

.submenu-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 4px 6px;
}

.submenu-header {
  padding: 4px 10px 6px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
```

**Per-section sub-menus:**

| Section | Sub-items |
|---|---|
| Market Overview | Summary, Indices, Futures, Forex, Crypto, Commodities |
| Signals | All Signals, My Signals, AI Signals, Options Flow, Momentum, Volume |
| Screener | Stock Screener, ETF Screener, Options Screener, Saved Screens |
| Layers | All Layers, Momentum, Mean Reversion, Options Flow, Macro, + New |
| Portfolio | Overview, Holdings, Transactions, P&L, Risk Analysis |
| Watchlist | My Lists, Shared Lists, Alerts, + New List |
| Alerts | Active Alerts, Triggered, Price Alerts, Volume Alerts, + New |
| Reports | Performance, Portfolio, Market, Custom, Scheduled |
| Settings | General, Notifications, API Keys, Billing, Security |

---

## 5. Ticker Strip

### 5.1 Layout
Horizontal strip `height: 40px`, `background: var(--bg-surface)`, `border-bottom: 1px solid var(--border-default)`

5 ticker cells equally spaced:
```
[S&P 500]  [NASDAQ]  [DOW JONES]  [VIX]  [BTC/USDT]
```

### 5.2 Ticker Cell
```
[Symbol name — text-muted text-xs]
[Value — text-primary font-mono font-bold text-lg]
[Δ Change — green/red, text-xs]  [Sparkline — 60px wide]
```

- **Positive change**: text `var(--green)`, value has faint green glow
- **Negative change**: text `var(--red)`, value has faint red glow
- **VIX** is shown in red (volatile index)
- **Sparkline**: `height: 24px, width: 80px`, SVG path, color matches change direction, filled with 10% opacity

---

## 6. Dashboard Widgets

> All widgets share base card styles:
```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  padding: 16px;
  box-shadow: var(--shadow-card);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: none;
  letter-spacing: 0;
}
```

---

### 6.1 Fear & Greed Index Widget

**Size**: ~3 columns

**Structure**:
- Header: `"Fear & Greed Index"` + `ℹ` info icon
- Below header: time range tabs `[1D] [1W] [1M] [1Y] [ALL]`
  - Tab style: `font-size: 10px`, `padding: 2px 6px`, `border-radius: 3px`
  - Active tab: `background: var(--border-active)`, `color: var(--text-primary)`
- **Gauge/Dial**: SVG semicircle gauge
  - Arc spans 180° (left=0/Fear, right=100/Greed)
  - Background track: `stroke: #1E2130, stroke-width: 12`
  - Colored segments (left→right): `#EF4444` → `#F97316` → `#F59E0B` → `#84CC16` → `#22C55E`
  - Needle: thin line from center to arc edge, `stroke: white, stroke-width: 2`
  - Center value: `"63"` — `font-size: 32px, font-weight: 700, color: white`
  - Center label: `"Greed"` — `font-size: 12px, color: var(--yellow)`
  - Tick marks at 0, 25, 50, 75, 100

---

### 6.2 Market Sentiment Widget

**Size**: ~3 columns

**Structure**:
- Header: `"Market Sentiment"`
- Large label: `"Bullish"` — `font-size: 24px, font-weight: 700, color: var(--green)`
- Score: `"68/100"` — `font-size: 14px, color: var(--text-secondary)`, right-aligned
- Time range tabs: `[1D] [1W] [1M] [3M] [1Y]`
- Chart: Area line chart, height ~80px
  - Line color: `var(--green)`, fill: `rgba(34,197,94,0.1)`
  - Y-axis: 0–100, labels at 50, 100
  - No grid lines (or very subtle `rgba(255,255,255,0.03)`)

---

### 6.3 Market Breadth Widget

**Size**: ~6 columns

**Structure**:
- Header: `"Market Breadth"`
- Progress bar (full width, height 8px, border-radius pill):
  - Green segment left: Advancing count proportion
  - Gray segment middle: Neutral
  - Red segment right: Declining
  - Colors: `var(--green)` / `#374151` / `var(--red)`
- Three stat columns below bar:
  ```
  [2,157 Advancing green] [232 Neutral gray] [742 Declining red]
  ```
  - Number: `font-size: 20px, font-weight: 700`
  - Label: `font-size: 11px, color: var(--text-muted)`
- Divider line
- Row: `"Advance/Decline Ratio"` label + value `"2.98"` right + mini sparkline right

---

### 6.4 Market Trend Overview Chart

**Size**: ~7 columns

**Structure**:
- Header left: `"Market Trend Overview"`
- Header right: dropdown `[6M ▾]` + icon button (grid/settings)
- Legend row: 4 items
  ```
  ● Price (SPY) — blue
  ● 200 MA — amber  
  ● Sentiment — purple
  ● Fear & Greed — red
  ```
  - Dot: `width: 8px, height: 2px` (horizontal line, not circle)
  - Label: `font-size: 11px`
- **Chart**: Multi-line chart, `height: ~160px`
  - Dual Y-axis: left 400–600 (price), right 0–100 (indicators)
  - X-axis: monthly labels `Nov '24  Dec '24  Jan '25  Feb '25  Mar '25  Apr '25  May '25`
  - Background: subtle horizontal grid lines `rgba(255,255,255,0.04)`
  - Lines: smooth curves (bezier), `stroke-width: 1.5`
  - Hover: vertical crosshair line `rgba(255,255,255,0.2)`, tooltip card

**Dropdown spec** (time range selector):
```css
.dropdown-select {
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 3px 8px;
  font-size: 11px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}
/* Open state */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  min-width: 80px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  z-index: 50;
  overflow: hidden;
}
.dropdown-option {
  padding: 7px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}
.dropdown-option:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
.dropdown-option.active { color: var(--accent-cyan); background: rgba(0,229,200,0.06); }
```

---

### 6.5 Market Movers Widget

**Size**: ~5 columns

**Structure**:
- Header: `"Market Movers"` + `ℹ` + expand icon
- Tab row:
  ```
  [Top Gainers] [Top Losers] [Most Active]
  ```
  - Active tab: bottom border `2px solid var(--accent-cyan)`, text `var(--text-primary)`
  - Inactive: `color: var(--text-muted)`
- **Table** (5 columns):
  ```
  Symbol | Price | % Chg | Volume
  ```
  - Header row: `font-size: 10px, color: var(--text-muted), text-transform: uppercase`
  - Data rows: `height: 36px, border-bottom: 1px solid var(--border-subtle)`
  - Symbol: favicon-like colored square + ticker text `font-weight: 600 font-size: 12px`
  - Price: monospace `font-size: 12px`
  - % Chg: colored pill `border-radius: 4px, padding: 2px 6px, font-size: 11px`
    - Positive: `background: rgba(34,197,94,0.12), color: var(--green)`
    - Negative: `background: rgba(239,68,68,0.12), color: var(--red)`
  - Volume: `font-size: 11px, color: var(--text-secondary)`
- Footer: `"View All →"` link, right-aligned, `color: var(--accent-cyan), font-size: 11px`

**Example data:**
| Symbol | Price | % Chg | Volume |
|--------|-------|--------|--------|
| NVDA | 1,053.74 | +5.32% | 52.4M |
| TSLA | 248.42 | +4.81% | 78.1M |
| META | 496.21 | +3.67% | 26.7M |
| AMD | 167.91 | +3.21% | 31.2M |
| AMZN | 186.35 | +2.98% | 34.8M |

---

### 6.6 Hot Takes / High Volume Widget

**Size**: ~4 columns

**Structure**:
- Header: `"Hot Takes / High Volume"` + expand icon
- **3-tab group**: `[High Volume] [Price Spike] [Options Flow]`
  - Tab style: `font-size: 11px`, pill tabs, active: `background: var(--bg-input), color: var(--text-primary)`
- **Table** (5 columns):
  ```
  Symbol | Price | %Chg | Volume | Vol vs Avg
  ```
  - Same table style as Market Movers
  - `Vol vs Avg` column: shows multiplier like `"2.1x"` in `var(--yellow)` for high values
- Footer: `"View All"` link

---

### 6.7 Sector Performance Widget

**Size**: ~4 columns

**Structure**:
- Header: `"Sector Performance"` + time dropdown `[1D ▾]`
- Table rows — each row:
  ```
  [Sector Name 14chars] [% Change ±X.XX%] [Bar ===|]
  ```
  - Sector label: `font-size: 11px, color: var(--text-secondary)`, left column ~100px
  - % change: `font-size: 11px`, green or red, width ~50px right-aligned
  - Bar: horizontal bar chart, `height: 6px, border-radius: 3px`
    - Positive: `background: var(--green)`, extends right from center
    - Negative: `background: var(--red)`, extends left from center (or just left-anchored)
    - Max bar width: 120px representing ±2%
  - Row gap: 6px

**Sectors** (top to bottom):
```
Technology       +1.85%  ████████████████
Communication    +1.42%  █████████████
Consumer Cyclical+1.12%  ██████████
Financials       -0.72%  ▊▊▊▊▊▊▊
Industrials      -1.38%  ▊▊▊▊▊▊▊▊▊▊▊▊▊
Utilities        +0.10%  █
Healthcare       +0.07%  █
Consumer Defensive-1.03% ▊▊▊▊▊▊▊▊▊▊
Energy           -1.02%  ▊▊▊▊▊▊▊▊▊▊
Real Estate      -1.19%  ▊▊▊▊▊▊▊▊▊▊▊
```

---

### 6.8 News & Insights Widget

**Size**: ~4 columns

**Structure**:
- Header: `"News & Insights"` + share/link icon
- List of news items:
  ```
  [Headline text]  [Source tag]  [Time ago]
  [optional: secondary line truncated]
  ```
  - Headline: `font-size: 12px, font-weight: 500, color: var(--text-primary)`
  - Source tag: pill `font-size: 9px, padding: 1px 5px, border-radius: 3px, background: var(--bg-input), color: var(--text-muted)`
  - Time: `font-size: 10px, color: var(--text-muted)`, right-aligned
  - Row separator: `border-bottom: 1px solid var(--border-subtle)`
  - Row height: `~44px`
  - Max 5 items shown
- Footer: `"View All News →"` with external link icon

---

### 6.9 Market Heatmap Widget

**Size**: ~6 columns (full left half of bottom row)

**Structure**:
- Header: `"Market Heatmap (by Market Cap)"` + `ℹ`
- **Treemap chart** — sectors as labeled zones, stocks as colored cells
  - Sector labels: uppercase, `font-size: 9px, font-weight: 700, color: var(--text-muted)`, positioned top-left of sector block
  - Sectors (left to right): TECHNOLOGY, COMMUNICATION SERVICES, CONSUMER CYCLICAL, FINANCIALS, (smaller: HEALTHCARE, ENERGY, CONSUMER DEFENSIVE, REAL ESTATE)
- **Cell content** (each company block):
  - Ticker: `font-size: 14–18px` (scales with cell size), `font-weight: 700, color: white`
  - Change %: `font-size: 10–12px, color: rgba(255,255,255,0.7)`
- **Cell colors** by % change:
  ```
  > +2%:     #166534 (dark green)
  +0.5–2%:  #15803D (medium green)
  0–+0.5%:  #1E3A2F (faint green)
  -0.5–0%:  #3B1A1A (faint red)
  -0.5–-2%: #7F1D1D (medium red)
  < -2%:    #991B1B (dark red)
  ```
- **Legend** row at bottom:
  `■ >+2%  ■ +0.5 to +2%  ■ 0 to +0.5%  ■ -0.5 to 0%  ■ -0.5 to -2%  ■ <-2%`
  - Legend dot: `8x8px, border-radius: 2px`
  - Legend text: `font-size: 9px, color: var(--text-muted)`

---

### 6.10 Portfolio Overview Widget

**Size**: ~6 columns

**Structure**:
- Header: `"Portfolio Overview"` + dropdown `[All Portfolios ▾]`
- Two-column layout inside:

  **Left**: Donut chart
  - `width/height: 180px`
  - Center text: `"Total Value"` (text-muted 11px) + `"$128,450.25"` (32px bold white) + `"+2.45% (1D)"` (green 12px)
  - Segments (clockwise): Teal, Blue, Purple, Orange, Gray
  - Segment gap: `2px`

  **Right**: Allocation list
  ```
  ● Cash         $12,410.25   9.7%
  ● Technology   $45,210.50  35.2%
  ● Healthcare   $18,730.00  14.6%
  ● Financials   $16,890.75  13.1%
  ● Consumer Cyc $13,250.30  10.3%
  ● Others       $21,958.45  17.1%
  ```
  - Dot: `8px, border-radius: 50%`, matching donut segment color
  - Name: `font-size: 12px, color: var(--text-secondary)`
  - Amount: `font-size: 12px, color: var(--text-primary), font-family: mono`, right-aligned
  - %: `font-size: 11px, color: var(--text-muted)`, right-aligned, width 36px

- Divider
- Bottom row:
  - `"Today's P&L"` label
  - Value: `"+$733.81"` (green, `font-size: 18px, font-weight: 700`)
  - `"Unrealized P&L: +$8,742.31 (7.31%)"` — smaller, muted
  - `"Buying Power: $23,560.00"` — smaller, right-aligned
  - Mini sparkline (P&L for the day) — green fill area chart, `height: 32px`

---

## 7. Component Building Blocks (Bottom Strip)

Displayed as a showcase row of reusable components with labels.

```
KPI Card | Line/Area Chart | Gauge/Dial | Treemap | Data Table |
List/Feed | Donut Chart | Heatmap | Mini Chart | Tabs/Filters
```

Each block: `background: var(--bg-card)`, `border: 1px solid var(--border-default)`, `border-radius: 8px`, `padding: 10px`, `width: ~90px, height: ~70px`, label below in `font-size: 10px, color: var(--text-muted), text-align: center`

**KPI Card example:**
```
1.3S        ← large number, accent color
Active Signals  ← small label
```

---

## 8. Card Content Contract

> **These rules are non-negotiable and take precedence over any individual widget spec.
> A card that violates them is considered broken, not merely unstyled.**

---

### 8.1 Card Shell — Required Base Structure

Every card **must** be a flex column. This is the foundational rule from which all containment follows. No exceptions.

```css
.card {
  /* Structure */
  display: flex;
  flex-direction: column;
  overflow: hidden;          /* hard clip — content can NEVER escape the card boundary */
  min-height: 0;             /* prevents flex children from inflating past card height */

  /* Appearance */
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);

  /* Spacing — the card edge is a hard wall, padding is the only buffer */
  padding: 0;                /* padding is applied to zones below, NOT the card itself */
}
```

### 8.2 Card Zone System

Every card is divided into exactly three zones. All content must live in one of these zones — never placed directly on `.card`.

```css
.card-header {
  flex-shrink: 0;            /* never compresses regardless of card height */
  padding: 14px 16px 10px;   /* top · sides · bottom */
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 0;
  /* No border-bottom by default — add only if card has a persistent tab strip */
}

.card-body {
  flex: 1;                   /* grows to fill remaining card height */
  min-height: 0;             /* critical: allows shrink without overflow */
  overflow: hidden;          /* default — change to overflow-y: auto for scrollable cards */
  padding: 0 16px;           /* sides only — vertical rhythm owned by child elements */
}

.card-footer {
  flex-shrink: 0;
  padding: 10px 16px 14px;   /* top · sides · bottom */
  margin-top: auto;          /* pins to card bottom even if body is short */
  border-top: 1px solid var(--border-subtle);
}

/* Footer is OMITTED entirely (not rendered) when the card has no footer content.
   Never render an empty .card-footer. */
```

> **12px Rule:** No rendered text or graphical element may appear within 12px of any card edge.
> The padding values above enforce this. Never override them with negative margins or extra padding on child elements.

---

### 8.3 Text Truncation by Role

Each text role has exactly one overflow behavior. Never deviate.

```css
/* ── Card titles / section labels ──────────────────────────────
   Single line. Cut with ellipsis. Never wraps. Never shrinks font. */
.card-title,
.widget-label,
.table-col-header {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* ── Primary values (prices, scores, large numbers) ────────────
   Never truncate. Never wrap. Shrink font-size one step before
   truncating. Steps: 32px → 24px → 20px → 16px (stop here). */
.card-value,
.metric-number,
.portfolio-total {
  white-space: nowrap;
  overflow: hidden;
  font-variant-numeric: tabular-nums;
  /* Font size reduction is applied via JS/React when rendered width > container width */
}

/* ── Secondary / supporting text ───────────────────────────────
   Max 2 lines. Line-clamp. Never shows scrollbar. */
.card-description,
.card-subtitle {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.45;
}

/* ── News headlines / list item text ───────────────────────────
   Single line. Ellipsis. */
.news-headline,
.list-item-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Ticker symbols ─────────────────────────────────────────────
   Always uppercase. Never truncate (max 5 chars by data contract). */
.ticker-symbol {
  text-transform: uppercase;
  white-space: nowrap;
  letter-spacing: 0.03em;
}
```

---

### 8.4 Number Formatting Contract

All displayed financial values must follow this format table exactly. Inconsistency between cards breaks the professional feel immediately.

| Data type | Format rule | Correct | Wrong |
|---|---|---|---|
| Price (< $1,000) | 2 decimal, comma thousands | `$496.21` | `$496.2` · `$496.213` |
| Price (≥ $1,000) | 2 decimal, comma thousands | `$1,053.74` | `$1053.74` · `$1,053.7` |
| Large value | 2 decimal, comma thousands | `$128,450.25` | `$128450` · `$128,450` |
| % Change | Always show sign, 2 decimal | `+5.32%` · `-1.02%` | `5.32%` · `+5.3%` |
| Volume (< 1M) | Abbreviate to K, 1 decimal | `842.3K` | `842,300` |
| Volume (≥ 1M) | Abbreviate to M, 1 decimal | `52.4M` | `52,400,000` · `52M` |
| Volume (≥ 1B) | Abbreviate to B, 2 decimal | `1.24B` | `1,240M` |
| Multiplier | 1 decimal, `x` suffix | `2.1x` | `2x` · `2.10x` |
| Ratio | 2 decimal, no suffix | `2.98` | `2.9` · `2.980` |
| P&L with sign | Sign + $ + value | `+$733.81` · `-$212.40` | `$733.81` · `+733.81` |
| Percentage of total | 1 decimal, `%` suffix | `35.2%` | `35%` · `35.20%` |

```css
/* Apply to every element displaying a number */
.numeric {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
  letter-spacing: 0;         /* monospace already handles alignment */
}
```

> **Alignment rule:** In any column of numbers (tables, allocation lists, P&L rows), all values must be **right-aligned** so decimal points stack vertically. Labels are left-aligned. Never center-align numbers in a data context.

---

### 8.5 Table-in-Card Contract

Tables are the most common source of card overflow. Every table inside a card must follow all of these rules.

```css
/* Wrapper — always present, never omitted */
.table-wrapper {
  width: 100%;
  overflow-x: hidden;        /* tables never cause horizontal scroll inside a card */
  overflow-y: auto;          /* vertical scroll allowed for long tables */
}

/* Table reset */
.card table {
  width: 100%;
  table-layout: fixed;       /* REQUIRED: columns respect their assigned widths */
  border-collapse: collapse;
}

/* All cells */
.card td,
.card th {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 6px;
  vertical-align: middle;
}

/* Header row */
.card th {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  height: 28px;
  border-bottom: 1px solid var(--border-subtle);
}

/* Data rows */
.card tr {
  height: 36px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.1s;
}
.card tr:last-child { border-bottom: none; }
.card tr:hover { background: rgba(255,255,255,0.025); }
```

**Column width contracts — specified per table (percentages must sum to 100%):**

```css
/* Market Movers / Hot Takes table */
.movers-table col.symbol  { width: 18%; }  /* NVDA, TSLA … */
.movers-table col.price   { width: 24%; }  /* $1,053.74    */
.movers-table col.change  { width: 20%; }  /* +5.32%       */
.movers-table col.volume  { width: 20%; }  /* 52.4M        */
.movers-table col.vsavg   { width: 18%; }  /* 2.1x         */

/* Sector Performance table */
.sector-table col.name    { width: 38%; }
.sector-table col.change  { width: 18%; }
.sector-table col.bar     { width: 44%; }

/* Portfolio Allocation list (flex, not table) */
.alloc-row { display: flex; align-items: center; gap: 8px; }
.alloc-dot  { flex-shrink: 0; width: 8px; height: 8px; border-radius: 50%; }
.alloc-name { flex: 1; min-width: 0; }  /* min-width: 0 allows flex child to truncate */
.alloc-amt  { flex-shrink: 0; width: 80px; text-align: right; }
.alloc-pct  { flex-shrink: 0; width: 38px; text-align: right; }
```

> **The `min-width: 0` Rule:** Any flex child that contains truncated text **must** have `min-width: 0` set. Without it, the flex algorithm will refuse to shrink the item below its content size, causing overflow. This applies to `.alloc-name`, news headline containers, and any label in a flex row.

---

### 8.6 Content States — Every Card Must Handle All Three

Cards must never be built for the "happy path" only.

```css
/* ── 1. LOADING STATE — skeleton shimmer ─────────────────────── */
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-input) 25%,
    var(--border-default) 50%,
    var(--bg-input) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
  border-radius: var(--radius-sm);
}

/* Skeleton elements match real content dimensions exactly */
.skeleton-title   { height: 12px; width: 55%;  margin-bottom: 10px; }
.skeleton-value   { height: 28px; width: 40%;  margin-bottom: 6px;  }
.skeleton-text    { height: 10px; width: 80%;  margin-bottom: 6px;  }
.skeleton-text-sm { height: 10px; width: 60%;                       }
.skeleton-row     { height: 34px; width: 100%; margin-bottom: 2px;  }
.skeleton-chart   { height: 80px; width: 100%;                      }

/* ── 2. POPULATED STATE — as specced per widget ──────────────── */

/* ── 3. EMPTY STATE ───────────────────────────────────────────── */
.card-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px;
}
.card-empty-state .empty-icon  { font-size: 20px; opacity: 0.3; }
.card-empty-state .empty-label {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}
/* Card maintains its full assigned height in empty state — never collapses */
```

---

## 9. Grid Alignment & Row Height Contract

> **The root cause of unequal card heights, overlapping rows, and ragged bottom edges is always the same: card heights are being driven by content instead of by the grid. This section defines the single source of truth for all sizing. No card, in any state, may contradict these rules.**

---

### 9.1 Why Content-Driven Heights Break the Layout

When a card is allowed to size itself to its content, three failure modes occur simultaneously:

```
❌ BROKEN (content-driven)

Row 1: ┌──────────┐  ┌─────────────────┐  ┌──────────────┐
       │ Fear &   │  │ Market          │  │ Market       │
       │ Greed    │  │ Sentiment       │  │ Breadth      │
       │ [gauge]  │  │ [chart grows!]  │  │              │
       └──────────┘  │                 │  └──────────────┘
                     │ ← overflows     │
Row 2: ┌─────────────┼─────────────────┼──────────────────┐
       │ Market Trend│ ← overlapped ←  │  Market Movers   │
       │ Overview    │                 │                  │
```

```
✅ CORRECT (grid-driven)

Row 1: ┌──────────┐  ┌─────────────────┐  ┌──────────────┐
       │ Fear &   │  │ Market          │  │ Market       │
       │ Greed    │  │ Sentiment       │  │ Breadth      │
       │          │  │ [chart clips]   │  │              │
       └──────────┘  └─────────────────┘  └──────────────┘
          168px            168px               168px
       ←──────────── 12px gap ────────────────────────────→
Row 2: ┌────────────────────────────────┐  ┌─────────────┐
       │ Market Trend Overview          │  │Market Movers│
       └────────────────────────────────┘  └─────────────┘
                    280px                       280px
```

The fix is structural, not cosmetic. It has three parts:
1. The grid defines all row heights explicitly via `grid-template-rows`
2. Gap is set once on the grid and never overridden anywhere
3. Every card clips its content with `overflow: hidden`

---

### 9.2 The Complete Grid Definition

This is the single source of truth for the entire layout. It is defined once. Nothing else touches heights or gaps.

```css
.dashboard-grid {
  display: grid;

  /* 12 equal columns */
  grid-template-columns: repeat(12, 1fr);

  /* All rows — explicit pixel heights, no auto, no fr, no min-content */
  grid-template-rows:
    40px    /* R0 — Ticker strip                                          */
    168px   /* R1 — Fear & Greed · Market Sentiment · Market Breadth     */
    280px   /* R2 — Market Trend Overview · Market Movers                */
    220px   /* R3 — Hot Takes · Sector Performance · News & Insights     */
    380px   /* R4 — Market Heatmap · Portfolio Overview                  */
    80px    /* R5 — Component building blocks strip                      */
  ;

  /* ONE gap value — applied identically between every row AND every column */
  gap: 12px;

  /* Cards stretch to fill their assigned cell(s) — never align to content */
  align-items: stretch;
  justify-items: stretch;
}
```

> **The `gap` property is the only spacing mechanism in the grid. Never use `margin` on cards. Never use `padding` on the grid container. Gap is uniform in both axes: 12px column gap = 12px row gap = consistent visual rhythm everywhere.**

---

### 9.3 Card Placement Map

Every card is placed using explicit `grid-column` and `grid-row`. No card uses implicit placement (no auto-flow). This prevents any card from accidentally landing in the wrong row and disrupting row heights.

```css
/* ── Row 0: Ticker Strip ───────────────────────────────── */
.ticker-strip          { grid-column: 1 / -1;   grid-row: 1; }

/* ── Row 1: Summary Cards ──────────────────────────────── */
.card-fear-greed       { grid-column: 1 / 4;    grid-row: 2; }
.card-sentiment        { grid-column: 4 / 7;    grid-row: 2; }
.card-breadth          { grid-column: 7 / 13;   grid-row: 2; }

/* ── Row 2: Charts ─────────────────────────────────────── */
.card-trend-overview   { grid-column: 1 / 8;    grid-row: 3; }
.card-market-movers    { grid-column: 8 / 13;   grid-row: 3; }

/* ── Row 3: Tables & Feeds ─────────────────────────────── */
.card-hot-takes        { grid-column: 1 / 5;    grid-row: 4; }
.card-sector-perf      { grid-column: 5 / 9;    grid-row: 4; }
.card-news             { grid-column: 9 / 13;   grid-row: 4; }

/* ── Row 4: Heatmap & Portfolio ────────────────────────── */
.card-heatmap          { grid-column: 1 / 7;    grid-row: 5; }
.card-portfolio        { grid-column: 7 / 13;   grid-row: 5; }

/* ── Row 5: Component Blocks ───────────────────────────── */
.card-blocks-strip     { grid-column: 1 / -1;   grid-row: 6; }
```

> **Grid rows are 1-indexed in CSS Grid. Row 1 = R0 ticker, Row 2 = R1 Fear & Greed, etc.**

---

### 9.4 Multi-Row Spanning — The Alignment Guarantee

When a card spans multiple rows, its height is **automatically computed by the grid** as:

```
spanning card height = (row1 height) + gap + (row2 height) + gap + ... + (rowN height)
```

This is the key property that guarantees perfect bottom-alignment with no manual calculation required.

```
Example: A card spanning R2 + R3 (rows 3 and 4 in CSS):

Height = 280px (R2) + 12px (gap) + 220px (R3) = 512px

Its bottom edge lands at exactly the same pixel as the bottom
of every R3 single-row card beside it. Zero manual adjustment needed.
```

```css
/* Example: a sidebar card spanning rows 2–3 */
.card-spanning-r2-r3 {
  grid-column: 10 / 13;
  grid-row: 3 / 5;      /* from row 3, ending before row 5 */
  /* height = 280 + 12 + 220 = 512px — computed automatically */
}

/* Example: a card spanning rows 3–4 */
.card-spanning-r3-r4 {
  grid-column: 1 / 5;
  grid-row: 4 / 6;      /* from row 4, ending before row 6 */
  /* height = 220 + 12 + 380 = 612px — computed automatically */
}
```

**Alignment diagram for spanning cards:**

```
Col:  1    2    3    4    5    6    7    8    9    10   11   12
      ├────────────────────────────────────────┤  ├───────────┤
R2    │  Market Trend Overview (7 col)         │  │  Movers   │  280px
      │                                        │  │ (5 col)   │
      ├──────────────────────────┤  ├──────────┤  │           │
R3    │  Hot Takes (4 col)       │  │ Sector   │  │  ↕ spans  │  220px
      │                          │  │ (4 col)  │  │  R2 + R3  │
      └──────────────────────────┘  └──────────┘  └───────────┘
                                                   bottom edge of Movers
                                                   = bottom edge of Sector ✓
```

---

### 9.5 Every Card's Sizing Rules

Cards receive their dimensions exclusively from the grid. They must not resist, override, or supplement these dimensions.

```css
/* Applied to EVERY .card inside .dashboard-grid — no exceptions */
.dashboard-grid > .card {
  /* Sizing: inherit from grid cell, never self-size */
  width: 100%;
  height: 100%;
  min-width: 0;    /* prevent content from forcing column expansion */
  min-height: 0;   /* prevent content from forcing row expansion */

  /* Containment: hard clip at card boundary */
  overflow: hidden;

  /* Internal layout: flex column so zones stack correctly */
  display: flex;
  flex-direction: column;

  /* Do NOT set: height, min-height, max-height, margin */
}
```

---

### 9.6 Content Adaptation Within a Fixed Cell

Content must adapt to the card. The card never adapts to content.

```
Content shorter than cell height:
  → .card-body { flex: 1 } absorbs the empty space
  → Charts use height: 100% on their container — they grow to fill
  → "View All" footer pins to bottom via .card-footer with margin-top: auto

Content taller than cell height:
  → .card-body switches to overflow-y: auto (internal scroll only)
  → Card boundary is never crossed
  → Scroll is signalled by a bottom fade gradient (see §8.2)
  → The row height is NOT increased — other cards in the row are unaffected
```

```css
.chart-container {
  width: 100%;
  height: 100%;   /* fills .card-body, which fills the grid cell */
  min-height: 0;
}

.card-body.scrollable {
  overflow-y: auto;
}

/* Fade gradient signals scrollable overflow */
.card-body.scrollable {
  -webkit-mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
          mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
}
```

---

### 9.7 Uniform Gap — The One Spacing Rule

```
The 12px gap is the ONLY space between cards.
It is defined once on .dashboard-grid { gap: 12px }.
It must never be approximated, duplicated, or overridden anywhere.
```

| What you want | How to achieve it | What NOT to do |
|---|---|---|
| Space between two cards | Already there — it's the `gap` | `margin-bottom: 12px` on a card |
| Space between card edge and content | `padding` inside `.card-header` / `.card-body` | `padding` on `.dashboard-grid` |
| Extra space above a row | Increase that row's height in `grid-template-rows` | `margin-top` on cards in that row |
| Extra space to the right of a card | Already there — it's the column `gap` | `margin-right` on a card |

---

### 9.8 Responsive Behaviour

On smaller viewports, the grid reflows to fewer columns. Explicit row heights are relaxed because cards no longer share rows with siblings.

```css
/* ── Tablet landscape: 2-column layout ─────────────────── */
@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: none;     /* rows become auto-height */
    gap: 10px;
  }

  /* All cards revert to content-height — they no longer share rows */
  .dashboard-grid > .card {
    grid-column: auto;            /* override explicit placements */
    grid-row: auto;
    height: auto;
    min-height: 160px;
  }
}

/* ── Mobile portrait: single column ────────────────────── */
@media (max-width: 480px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    gap: 8px;
  }

  .dashboard-grid > .card {
    grid-column: auto;
    grid-row: auto;
    height: auto;
    min-height: 140px;
  }
}
```

> On desktop (> 1024px), explicit `grid-template-rows` heights are always in force. Card heights are 100% predictable and verifiable. On tablet and mobile, cards stack individually and may be content-height since they no longer have row-siblings to align with.

---

### 9.9 The "Never Do This" List

| ❌ Forbidden | Why it breaks things | ✅ Correct |
|---|---|---|
| `height: fit-content` on a card | Card grows past row boundary, overlaps next row | `height: 100%` — grid cell defines it |
| `height: 200px` on a card | Card shorter than row, creates gap inside the row | Remove — inherited from `grid-template-rows` |
| `min-height: 200px` on a card | Can force row to expand, misaligning all siblings | Set row height in `grid-template-rows` |
| `margin: 12px` on a card | Doubles the gap visually, creates uneven spacing | Use `gap` on grid only, zero margin on cards |
| `overflow: visible` on a card | Content escapes into neighboring rows/cards | Always `overflow: hidden` |
| `grid-row: auto` on desktop | Card lands in wrong row, corrupts explicit row heights | Always explicit `grid-row: N` on desktop |
| Chart with `height: 160px` hardcoded | Chart shorter than card, leaves dead space below | `height: 100%` in a flex-growing `.card-body` |
| Empty card collapses | Row shrinks, misaligns all siblings in that row | Empty state always fills full cell height |

---

## 10. Shared UI Patterns

### 10.1 Info Icon (`ℹ`)
```css
.info-icon {
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 1px solid var(--text-muted);
  color: var(--text-muted);
  font-size: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-left: 4px;
}
.info-icon:hover { border-color: var(--text-secondary); color: var(--text-secondary); }
```

### 10.2 Expand / Popout Icon
- Top-right of most widgets
- Small `⤡` or `⊞` icon, `14px`, `color: var(--text-muted)`
- On hover: `color: var(--text-primary)`

### 10.3 Status / Change Pill
```css
.pill-positive {
  background: rgba(34,197,94,0.12);
  color: #22C55E;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
}
.pill-negative {
  background: rgba(239,68,68,0.12);
  color: #EF4444;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
}
```

### 10.4 Tab Group (Pill Style)
```css
.tab-group {
  display: flex;
  gap: 2px;
  background: var(--bg-input);
  border-radius: var(--radius-md);
  padding: 2px;
}
.tab-item {
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-muted);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.tab-item.active {
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
```

### 10.5 Tab Group (Underline Style)
```css
.tab-underline { border-bottom: 1px solid var(--border-default); display: flex; gap: 0; }
.tab-underline-item {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab-underline-item.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent-cyan);
}
```

### 10.6 Tooltip / Crosshair
```css
.chart-tooltip {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  font-size: 11px;
  color: var(--text-primary);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  pointer-events: none;
  white-space: nowrap;
}
```

### 10.7 Scrollbar
```css
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-active); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
```

---

## 11. Responsive Breakpoints

### 11.1 Mobile Portrait (`< 480px`)
- Sidebar: **hidden by default**, accessible via hamburger icon in nav bar
- Nav bar: show logo + hamburger only
- Layout: **single column**, cards stacked
- Widget priority order (top to bottom):
  1. Fear & Greed Index (full width)
  2. Market Sentiment (full width)
  3. Market Movers (full width)
  4. Sector Performance (full width)
  5. News & Insights (full width)
  6. Portfolio Overview (full width)
  7. Market Heatmap (full width, horizontal scroll)
- Bottom nav bar: `[Home] [Signals] [Portfolio] [Watchlist] [More]` — 60px height, icon + label
- Ticker strip: horizontal scroll, show 2 at a time
- Charts: `height: 120px` reduced

### 11.2 Tablet Landscape (`480px – 1024px`)
- Sidebar: **icon-only (64px)**, persistent
- Layout: **2-column** grid
- Card pairs: Fear & Greed + Sentiment, Movers + Sectors, etc.
- Charts: `height: 140px`
- Market Trend Overview: full width

### 11.3 Desktop Wide (`> 1280px`)
- Sidebar: **expanded (200px)** with labels
- Layout: full 12-column grid as specified in §2.2
- All widgets visible simultaneously
- Charts: full height

---

## 12. Motion & Interaction

### 12.1 Page Load Sequence
```
0ms   — Sidebar fades in (opacity 0→1, 200ms)
100ms — Nav bar slides down (translateY -48px→0, 200ms)
200ms — Ticker strip fades (opacity 0→1, 150ms)
300ms — Row 1 cards (opacity 0→1, translateY 8px→0, 200ms each with 50ms stagger)
500ms — Row 2 cards (same, 50ms stagger)
700ms — Charts animate their lines (SVG stroke-dashoffset draw, 600ms ease-out)
900ms — Heatmap cells fade in with stagger (20ms each, left-to-right)
```

### 12.2 Data Update Animation
- Number changes: count-up animation (100ms), flash `var(--green)` or `var(--red)` for 300ms
- Sparkline updates: smooth transition on path data
- Table row additions: slide-in from top, 150ms

### 12.3 Hover States
- Cards: `box-shadow` subtle increase, `border-color` to `var(--border-active)`
- Table rows: `background: rgba(255,255,255,0.03)`
- Buttons/icons: `opacity: 1` (from 0.7), 100ms transition
- Sidebar items: left accent bar slides in, 100ms

### 12.4 Theme Toggle
- Transition: `background-color 250ms, color 200ms, border-color 200ms` on all elements
- Subtle overlay flash (white 5% opacity) for 100ms at toggle moment

---

## 13. Footer Strip

Full-width footer at bottom of page:
```
⚡ Real-time Data   ✦ AI-Powered Signals   ◈ Multi-Asset Coverage   ⟲ Backtested Strategies   🔒 Secure & Private
```
- `height: 36px`, `background: var(--bg-surface)`, `border-top: 1px solid var(--border-default)`
- Items centered horizontally with `gap: 32px`
- Icon + text: `font-size: 11px, color: var(--text-muted)`
- Icon: `var(--accent-cyan)` or matching theme accent

---

## 14. Implementation Notes

### 14.1 Chart Libraries
- **Recommended**: `recharts` (React), `Chart.js`, or `D3.js`
- Multi-line chart: use `ComposedChart` with dual Y-axis in recharts
- Donut chart: `PieChart` with `innerRadius: 65, outerRadius: 85`
- Heatmap/Treemap: `Treemap` component or D3 treemap layout
- Sparklines: pure SVG `<path>` with computed bezier control points

### 14.2 Fonts (CDN)
```html
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### 14.3 Icons
- Use `lucide-react` or `heroicons` for UI icons
- Custom icons (logo lightning bolt, layers icon): inline SVG

### 14.4 Data Simulation
For prototype, generate random data with realistic constraints:
- S&P 500: base `5725`, ±`0.1–2%` variation
- Volume: `1M–200M`, Poisson-ish distribution
- Sector returns: correlated (market factor ±0.8 + idiosyncratic ±0.3)
- News timestamps: evenly spaced 10–120 mins ago
- P&L: daily ±0.5–3% of total value

### 14.5 Z-Index Stack
```
1    — Base cards
10   — Sticky ticker strip
50   — Dropdown menus
100  — Top nav bar
200  — Sidebar sub-menus
300  — Tooltips
400  — Modal overlays
500  — Toast notifications
```

---

## 15. Accessibility

- All color pairs meet **WCAG AA** contrast (4.5:1 for text, 3:1 for UI)
- Focus rings: `outline: 2px solid var(--accent-cyan); outline-offset: 2px`
- `aria-label` on all icon-only buttons
- Chart data available as `<table>` in visually-hidden fallback
- Keyboard nav: Tab through interactive elements, Enter/Space to activate
- `prefers-reduced-motion`: disable all animations, show final states

---

## 16. Tailwind CSS Integration — Portability & Enforcement

> **Tailwind is not used here as a utility shorthand. It is used as the design system enforcer. The config file IS the design spec translated into code. Any value that doesn't exist in the config cannot be used — making design drift structurally impossible.**

---

### 16.1 The Architecture: Three-Layer Token Bridge

The system uses three layers so tokens flow in one direction and can never be contradicted:

```
Layer 1 — CSS Variables (globals.css)
  The raw values. One place to change a color and it updates everywhere.
  e.g. --bg-card: #1A1D27

         ↓ referenced by ↓

Layer 2 — tailwind.config.js (theme extension)
  Maps CSS variables to named Tailwind tokens.
  e.g. 'card': 'var(--bg-card)'  →  enables class bg-card

         ↓ consumed by ↓

Layer 3 — Component classes (JSX / @apply)
  Developers write bg-card, not bg-[#1A1D27] or var(--bg-card).
  One token name works everywhere: utility class, @apply, or CSS-in-JS.
```

This means: change `--bg-card` in `globals.css`, and every component using `bg-card` across every page updates instantly — including future pages that haven't been built yet.

---

### 16.2 `globals.css` — Token Definitions

```css
/* globals.css — imported once in the app root */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Backgrounds */
    --bg-base:           #0D0F14;
    --bg-surface:        #141720;
    --bg-card:           #1A1D27;
    --bg-card-hover:     #1F2333;
    --bg-input:          #0F1219;

    /* Borders */
    --border-default:    #252836;
    --border-subtle:     #1E2130;
    --border-active:     #3D4460;

    /* Brand */
    --accent-cyan:       #00E5C8;
    --accent-cyan-dim:   #00B09A;
    --accent-blue:       #3B82F6;
    --accent-purple:     #8B5CF6;

    /* Status */
    --green:             #22C55E;
    --green-dim:         #16A34A;
    --red:               #EF4444;
    --red-dim:           #DC2626;
    --yellow:            #F59E0B;
    --orange:            #F97316;

    /* Text */
    --text-primary:      #E8ECF0;
    --text-secondary:    #8B95A5;
    --text-muted:        #4B5568;
    --text-accent:       #00E5C8;

    /* Spacing */
    --space-1: 4px;   --space-2: 6px;   --space-3: 8px;
    --space-4: 12px;  --space-5: 16px;  --space-6: 20px;
    --space-7: 24px;  --space-8: 32px;

    /* Radius */
    --radius-sm: 4px;  --radius-md: 6px;  --radius-lg: 8px;
    --radius-xl: 12px; --radius-pill: 9999px;
  }

  /* Light theme override — swap token values, all components update automatically */
  .theme-light {
    --bg-base:        #F0F2F5;
    --bg-surface:     #FFFFFF;
    --bg-card:        #FFFFFF;
    --bg-card-hover:  #F7F9FC;
    --bg-input:       #F0F2F5;
    --border-default: #E2E6EE;
    --border-subtle:  #EDF0F5;
    --border-active:  #C5CEDF;
    --text-primary:   #111827;
    --text-secondary: #4B5568;
    --text-muted:     #9CA3AF;
  }
}
```

> **Why CSS variables instead of hardcoded Tailwind values in the config?**
> Because Tailwind compiles at build time. If you hardcode `card: '#1A1D27'` in the config,
> theme switching requires a page reload or duplicate CSS. With CSS variables,
> theme switching is a single class toggle — zero rebuild, zero flicker.

---

### 16.3 `tailwind.config.js` — The Enforcer

```js
// tailwind.config.js
const { fontFamily } = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],

  // Theme switching via class, not media query — gives programmatic control
  darkMode: 'class',

  theme: {
    // ── EXTEND only — never replace Tailwind defaults entirely ──────────
    extend: {

      // ── Colors — every token from §1.1 ────────────────────────────────
      colors: {
        // Backgrounds
        base:         'var(--bg-base)',
        surface:      'var(--bg-surface)',
        card:         'var(--bg-card)',
        'card-hover': 'var(--bg-card-hover)',
        input:        'var(--bg-input)',

        // Borders (used as bg for dividers too)
        border: {
          DEFAULT: 'var(--border-default)',
          subtle:  'var(--border-subtle)',
          active:  'var(--border-active)',
        },

        // Brand
        cyan:    'var(--accent-cyan)',
        'cyan-dim': 'var(--accent-cyan-dim)',

        // Status (supplement Tailwind's built-in green/red with themed versions)
        positive: 'var(--green)',
        negative: 'var(--red)',
        warning:  'var(--yellow)',

        // Text (usable as text-primary, bg-primary won't make sense but won't hurt)
        primary:   'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted:     'var(--text-muted)',
        accent:    'var(--text-accent)',

        // Heatmap cells
        hm: {
          'strong-up': '#166534',
          'up':        '#15803D',
          'flat-up':   '#1E3A2F',
          'flat-dn':   '#3B1A1A',
          'dn':        '#7F1D1D',
          'strong-dn': '#991B1B',
        },
      },

      // ── Typography — from §1.2 ─────────────────────────────────────────
      fontFamily: {
        mono:    ['IBM Plex Mono', 'JetBrains Mono', ...fontFamily.mono],
        sans:    ['IBM Plex Sans', 'DM Sans', ...fontFamily.sans],
      },

      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:    ['11px', { lineHeight: '16px' }],
        sm:    ['12px', { lineHeight: '18px' }],
        md:    ['13px', { lineHeight: '20px' }],
        base:  ['14px', { lineHeight: '20px' }],
        lg:    ['16px', { lineHeight: '24px' }],
        xl:    ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['32px', { lineHeight: '40px' }],
      },

      // ── Spacing — from §1.3 ────────────────────────────────────────────
      // Tailwind's default scale is kept; these named aliases layer on top
      spacing: {
        'gap':    '12px',   // the one grid gap — use as p-gap, m-gap, gap-gap
        'card':   '16px',   // card padding alias
        'inset':  '16px',
      },

      // ── Border Radius — from §1.3 ──────────────────────────────────────
      borderRadius: {
        sm:   '4px',
        md:   '6px',
        lg:   '8px',
        xl:   '12px',
        pill: '9999px',
      },

      // ── Box Shadow ─────────────────────────────────────────────────────
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px var(--border-default)',
        glow:  '0 0 12px rgba(0,229,200,0.15)',
        panel: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px var(--border-subtle)',
      },

      // ── Grid — dashboard layout rows from §9.2 ─────────────────────────
      gridTemplateColumns: {
        'dashboard': 'repeat(12, 1fr)',
      },
      gridTemplateRows: {
        'dashboard': '40px 168px 280px 220px 380px 80px',
      },

      // ── Grid column/row placement aliases from §9.3 ────────────────────
      gridColumn: {
        'ticker':         '1 / -1',
        'fear-greed':     '1 / 4',
        'sentiment':      '4 / 7',
        'breadth':        '7 / 13',
        'trend':          '1 / 8',
        'movers':         '8 / 13',
        'hot-takes':      '1 / 5',
        'sector':         '5 / 9',
        'news':           '9 / 13',
        'heatmap':        '1 / 7',
        'portfolio':      '7 / 13',
        'blocks':         '1 / -1',
      },
      gridRow: {
        'r0': '1',
        'r1': '2',
        'r2': '3',
        'r3': '4',
        'r4': '5',
        'r5': '6',
        'r2-3': '3 / 5',
        'r3-4': '4 / 6',
      },

      // ── Animation — from §12.1 ─────────────────────────────────────────
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'draw-line': {
          '0%':   { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        flash: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
      },
      animation: {
        shimmer:   'shimmer 1.6s ease-in-out infinite',
        'fade-up': 'fade-up 200ms ease-out both',
        'draw':    'draw-line 600ms ease-out both',
        flash:     'flash 300ms ease-in-out',
      },
    },
  },

  plugins: [
    // Plugin 1 — Component classes via @layer components
    // (keeps class names short, allows @apply in component files)
    require('./tailwind.components.plugin'),

    // Plugin 2 — ESLint-style enforcement (optional but recommended)
    // Blocks arbitrary values and unknown tokens at build time
    require('tailwindcss-no-arbitrary-values'),   // npm package
  ],
}
```

---

### 16.4 `tailwind.components.plugin.js` — Reusable Component Classes

This plugin defines the base classes from §8 as Tailwind `@layer components`. Any file in the app can use `className="card"` and get the complete card contract automatically — no copy-pasting required.

```js
// tailwind.components.plugin.js
const plugin = require('tailwindcss/plugin')

module.exports = plugin(function ({ addComponents, theme }) {
  addComponents({

    // ── Card shell (§8.1) ────────────────────────────────────────────────
    '.card': {
      display:          'flex',
      flexDirection:    'column',
      overflow:         'hidden',
      minHeight:        '0',
      background:       'var(--bg-card)',
      border:           '1px solid var(--border-default)',
      borderRadius:     theme('borderRadius.xl'),
      boxShadow:        theme('boxShadow.card'),
    },

    // ── Card zones (§8.2) ────────────────────────────────────────────────
    '.card-header': {
      flexShrink:     '0',
      padding:        '14px 16px 10px',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      gap:            '8px',
      minHeight:      '0',
    },
    '.card-body': {
      flex:       '1',
      minHeight:  '0',
      overflow:   'hidden',
      padding:    '0 16px',
    },
    '.card-body-scroll': {
      flex:       '1',
      minHeight:  '0',
      overflowY:  'auto',
      padding:    '0 16px',
      maskImage:  'linear-gradient(to bottom, black 80%, transparent 100%)',
    },
    '.card-footer': {
      flexShrink:   '0',
      padding:      '10px 16px 14px',
      marginTop:    'auto',
      borderTop:    '1px solid var(--border-subtle)',
    },

    // ── Card title (§8.3 truncation) ─────────────────────────────────────
    '.card-title': {
      fontFamily:     'IBM Plex Sans, sans-serif',
      fontSize:       '12px',
      fontWeight:     '600',
      color:          'var(--text-secondary)',
      whiteSpace:     'nowrap',
      overflow:       'hidden',
      textOverflow:   'ellipsis',
      maxWidth:       '100%',
    },

    // ── Numeric values (§8.4) ────────────────────────────────────────────
    '.numeric': {
      fontFamily:        'IBM Plex Mono, monospace',
      fontVariantNumeric:'tabular-nums',
      fontFeatureSettings:'"tnum"',
      letterSpacing:     '0',
      whiteSpace:        'nowrap',
    },
    '.value-positive': { color: 'var(--green)',  fontWeight: '600' },
    '.value-negative': { color: 'var(--red)',    fontWeight: '600' },
    '.value-neutral':  { color: 'var(--yellow)', fontWeight: '600' },

    // ── Change pills (§8.3) ──────────────────────────────────────────────
    '.pill': {
      display:      'inline-flex',
      alignItems:   'center',
      borderRadius: '4px',
      padding:      '2px 6px',
      fontSize:     '10px',
      fontWeight:   '600',
      fontFamily:   'IBM Plex Mono, monospace',
      whiteSpace:   'nowrap',
    },
    '.pill-positive': {
      background: 'rgba(34,197,94,0.12)',
      color:      'var(--green)',
    },
    '.pill-negative': {
      background: 'rgba(239,68,68,0.12)',
      color:      'var(--red)',
    },

    // ── Tables (§8.5) ────────────────────────────────────────────────────
    '.data-table': {
      width:          '100%',
      tableLayout:    'fixed',
      borderCollapse: 'collapse',
    },
    '.data-table th': {
      fontSize:        '10px',
      fontWeight:      '600',
      color:           'var(--text-muted)',
      textTransform:   'uppercase',
      letterSpacing:   '0.06em',
      height:          '28px',
      padding:         '0 6px',
      textAlign:       'left',
      borderBottom:    '1px solid var(--border-subtle)',
      whiteSpace:      'nowrap',
      overflow:        'hidden',
      textOverflow:    'ellipsis',
    },
    '.data-table td': {
      height:       '36px',
      padding:      '0 6px',
      fontSize:     '12px',
      color:        'var(--text-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
      whiteSpace:   'nowrap',
      overflow:     'hidden',
      textOverflow: 'ellipsis',
    },
    '.data-table tr:last-child td': { borderBottom: 'none' },
    '.data-table tr:hover td':      { background: 'rgba(255,255,255,0.025)' },

    // ── Skeleton (§8.6) ──────────────────────────────────────────────────
    '.skeleton': {
      background:         'linear-gradient(90deg, var(--bg-input) 25%, var(--border-default) 50%, var(--bg-input) 75%)',
      backgroundSize:     '200% 100%',
      animation:          'shimmer 1.6s ease-in-out infinite',
      borderRadius:       '4px',
    },

    // ── Tab groups (§10.4 / §10.5) ───────────────────────────────────────
    '.tabs-pill': {
      display:      'flex',
      gap:          '2px',
      background:   'var(--bg-input)',
      borderRadius: theme('borderRadius.md'),
      padding:      '2px',
    },
    '.tab-pill': {
      padding:      '4px 10px',
      fontSize:     '11px',
      color:        'var(--text-muted)',
      borderRadius: '4px',
      cursor:       'pointer',
      transition:   'all 150ms',
    },
    '.tab-pill.active': {
      background:  'var(--bg-card)',
      color:       'var(--text-primary)',
      boxShadow:   '0 1px 3px rgba(0,0,0,0.3)',
    },
    '.tabs-line': {
      display:     'flex',
      borderBottom:'1px solid var(--border-default)',
    },
    '.tab-line': {
      padding:      '6px 12px',
      fontSize:     '12px',
      color:        'var(--text-muted)',
      cursor:       'pointer',
      borderBottom: '2px solid transparent',
      marginBottom: '-1px',
      transition:   'all 150ms',
    },
    '.tab-line.active': {
      color:        'var(--text-primary)',
      borderBottomColor: 'var(--accent-cyan)',
    },

    // ── Dashboard grid (§9.2) ─────────────────────────────────────────────
    '.dashboard-grid': {
      display:               'grid',
      gridTemplateColumns:   'repeat(12, 1fr)',
      gridTemplateRows:      '40px 168px 280px 220px 380px 80px',
      gap:                   '12px',
      alignItems:            'stretch',
      justifyItems:          'stretch',
    },
    '.dashboard-grid > *': {
      width:      '100%',
      height:     '100%',
      minWidth:   '0',
      minHeight:  '0',
    },
  })
})
```

---

### 16.5 Usage in Components — The Right Way

With the config and plugin in place, components write exclusively in named tokens. Arbitrary values are never needed.

```jsx
// ✅ Correct — every class maps to a token
<div className="card col-span-3 row-r1">
  <div className="card-header">
    <span className="card-title">Market Sentiment</span>
    <InfoIcon />
  </div>
  <div className="card-body">
    <p className="text-2xl font-bold text-positive numeric">Bullish</p>
    <p className="text-xs text-muted numeric">68/100</p>
  </div>
</div>

// ❌ Wrong — arbitrary values, bypasses the design system
<div className="bg-[#1A1D27] rounded-[12px] p-[16px] h-[168px]">
  <span className="text-[#8B95A5] text-[12px]">Market Sentiment</span>
</div>
```

```jsx
// ✅ Change pill
<span className="pill pill-positive">+5.32%</span>
<span className="pill pill-negative">-1.02%</span>

// ✅ Skeleton loading state
<div className="skeleton h-3 w-1/2 mb-2" />
<div className="skeleton h-7 w-2/5 mb-1" />
<div className="skeleton h-2.5 w-4/5" />

// ✅ Table
<table className="data-table">
  <colgroup>
    <col className="w-[18%]" />
    <col className="w-[24%]" />
    <col className="w-[20%]" />
    <col className="w-[38%]" />
  </colgroup>
  <thead><tr><th>Symbol</th><th>Price</th><th>% Chg</th><th>Volume</th></tr></thead>
  <tbody>
    <tr>
      <td className="font-semibold text-primary">NVDA</td>
      <td className="numeric text-primary">$1,053.74</td>
      <td><span className="pill pill-positive">+5.32%</span></td>
      <td className="numeric text-muted">52.4M</td>
    </tr>
  </tbody>
</table>
```

---

### 16.6 Enforcement — Blocking Design Drift

Three mechanisms prevent developers from bypassing the token system:

**1. ESLint plugin** — flags arbitrary Tailwind values at write time:
```jsonc
// .eslintrc.json
{
  "plugins": ["tailwindcss"],
  "rules": {
    "tailwindcss/no-arbitrary-value": "error",    // bg-[#fff] → error
    "tailwindcss/no-contradicting-classname": "error",
    "tailwindcss/classnames-order": "warn"
  }
}
```

**2. Tailwind config `blocklist`** — prevents specific dangerous patterns:
```js
// tailwind.config.js
module.exports = {
  // ...
  blocklist: [
    // Prevent hardcoded heights that would break the grid contract
    'h-screen', 'h-full',   // only allowed via the component plugin, not ad-hoc
    // Prevent margins on cards (use gap on grid instead — §9.7)
    'm-3', 'm-4', 'm-5', 'mx-3', 'my-3',
  ],
}
```

**3. Design token audit** — a `package.json` script that catches raw hex values in source files:
```jsonc
// package.json
{
  "scripts": {
    "token-audit": "grep -rn '#[0-9a-fA-F]\\{3,6\\}' src/ --include='*.tsx' --include='*.ts' --include='*.css' | grep -v 'globals.css' | grep -v 'tailwind.config'"
  }
}
```
Running `npm run token-audit` surfaces any hardcoded hex values that bypassed the token system.

---

### 16.7 App-Wide Portability — How New Pages Inherit Everything

Any new page or feature built in the app gets the complete design system for free, with no setup:

```
New developer creates src/pages/Screener.tsx
  → imports globals.css (already in _app.tsx — done once)
  → writes className="card" → gets card shell, border, shadow, radius, overflow
  → writes className="card-title" → gets truncation, correct font, correct color
  → writes className="data-table" → gets fixed layout, column overflow, row hover
  → writes className="pill pill-positive" → gets the exact green pill from Movers
  → writes className="text-muted numeric" → gets correct secondary color + tabular nums
  → writes className="skeleton" → gets shimmer animation at correct speed

Zero design decisions required. Zero risk of visual inconsistency with the dashboard.
```

**Theme switching across the whole app** — one line:
```js
// ThemeToggle component
document.documentElement.classList.toggle('theme-light')
// Every CSS variable updates instantly.
// Every Tailwind class that references a variable updates instantly.
// No rebuild. No component re-render needed for styling.
```

---

### 16.8 Token Naming Cheatsheet

Quick reference — the full mapping from design intent to Tailwind class:

| Intent | Tailwind class | CSS variable resolved |
|---|---|---|
| Page background | `bg-base` | `#0D0F14` |
| Sidebar / nav background | `bg-surface` | `#141720` |
| Card background | `bg-card` | `#1A1D27` |
| Input / code background | `bg-input` | `#0F1219` |
| Default border | `border-border` | `#252836` |
| Subtle border | `border-border-subtle` | `#1E2130` |
| Active border | `border-border-active` | `#3D4460` |
| Primary text | `text-primary` | `#E8ECF0` |
| Secondary text | `text-secondary` | `#8B95A5` |
| Muted text | `text-muted` | `#4B5568` |
| Cyan accent | `text-cyan` / `bg-cyan` | `#00E5C8` |
| Positive green | `text-positive` | `#22C55E` |
| Negative red | `text-negative` | `#EF4444` |
| Warning yellow | `text-warning` | `#F59E0B` |
| Card shadow | `shadow-card` | compound shadow |
| Glow effect | `shadow-glow` | cyan glow |
| Panel / popover shadow | `shadow-panel` | deep shadow |
| Monospace font | `font-mono` | IBM Plex Mono |
| UI font | `font-sans` | IBM Plex Sans |
| Shimmer animation | `animate-shimmer` | shimmer keyframe |
| Fade-up animation | `animate-fade-up` | fade-up keyframe |

---

## 17. Complete Design Token Exhaustiveness

> **Every design decision that could vary must be a token. If a value appears more than once in any file, it must be a token. If a value could ever change for a theme, breakpoint, or brand, it must be a token. Raw values in component files are a spec violation.**

The previous sections tokenized colors, spacing, and typography. This section closes the remaining gaps: motion, depth, opacity, chart palette, typography refinements, and surface treatments.

---

### 17.1 Motion Tokens — Every Timing Decision

```css
@layer base {
  :root {
    /* Durations — named by perceived speed, not milliseconds */
    --duration-instant:   50ms;    /* state changes that feel immediate (toggle, check) */
    --duration-fast:      100ms;   /* hover effects, icon transitions */
    --duration-normal:    200ms;   /* most UI transitions (panels, dropdowns) */
    --duration-slow:      350ms;   /* page-level transitions, large panel slides */
    --duration-crawl:     600ms;   /* chart line draws, value count-up animations */
    --duration-shimmer:   1600ms;  /* skeleton loading loop */

    /* Easing curves — named by feel */
    --ease-linear:   linear;
    --ease-out:      cubic-bezier(0.0, 0.0, 0.2, 1);   /* decelerate — most UI elements */
    --ease-in:       cubic-bezier(0.4, 0.0, 1.0, 1);   /* accelerate — elements leaving */
    --ease-in-out:   cubic-bezier(0.4, 0.0, 0.2, 1);   /* balanced — toggles, theme switch */
    --ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);/* slight overshoot — popovers, tooltips */
    --ease-chart:    cubic-bezier(0.0, 0.0, 0.2, 1);   /* chart draws — decelerate to final */

    /* Delays — stagger system */
    --delay-none:   0ms;
    --delay-1:      50ms;    /* first staggered child */
    --delay-2:      100ms;
    --delay-3:      150ms;
    --delay-4:      200ms;
    --delay-5:      250ms;
    --delay-stagger: 40ms;  /* multiplied by child index in JS: i * var(--delay-stagger) */
  }
}
```

```js
// tailwind.config.js additions
transitionDuration: {
  instant: '50ms',
  fast:    '100ms',
  normal:  '200ms',
  slow:    '350ms',
  crawl:   '600ms',
},
transitionTimingFunction: {
  'out':    'cubic-bezier(0.0, 0.0, 0.2, 1)',
  'in':     'cubic-bezier(0.4, 0.0, 1.0, 1)',
  'in-out': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
},
transitionDelay: {
  '1': '50ms', '2': '100ms', '3': '150ms',
  '4': '200ms', '5': '250ms',
},
```

> **Rule:** All `transition`, `animation`, and `animation-delay` values in components must reference these tokens. Never write `transition: all 0.3s ease` — that skips the token system and creates inconsistent feel across the app.

---

### 17.2 Depth (Z-Index) Tokens

```css
:root {
  --z-base:      1;     /* cards, static content */
  --z-raised:    10;    /* sticky strip, floating labels */
  --z-dropdown:  50;    /* dropdowns, select menus */
  --z-nav:       100;   /* top nav bar */
  --z-sidebar:   150;   /* sidebar when overlaid on mobile */
  --z-submenu:   200;   /* sidebar sub-menus (above sidebar) */
  --z-tooltip:   300;   /* tooltips (above everything interactive) */
  --z-modal:     400;   /* modal backdrops + dialogs */
  --z-toast:     500;   /* toast notifications (always on top) */
  --z-overlay:   999;   /* full-screen overlays (onboarding, critical alerts) */
}
```

```js
zIndex: {
  base:    '1',
  raised:  '10',
  dropdown:'50',
  nav:     '100',
  sidebar: '150',
  submenu: '200',
  tooltip: '300',
  modal:   '400',
  toast:   '500',
  overlay: '999',
},
```

---

### 17.3 Opacity Tokens

```css
:root {
  --opacity-disabled:  0.38;   /* disabled interactive elements */
  --opacity-muted:     0.54;   /* secondary icons, placeholder text */
  --opacity-ghost:     0.70;   /* inactive nav items, decorative elements */
  --opacity-subtle:    0.85;   /* slightly subdued active elements */
  --opacity-full:      1.00;

  /* Overlay backgrounds */
  --opacity-scrim:     0.60;   /* modal backdrop */
  --opacity-hover-bg:  0.04;   /* hover highlight on dark surfaces */
  --opacity-active-bg: 0.08;   /* active/selected highlight */
  --opacity-focus-bg:  0.12;   /* focus ring fill */
}
```

```js
opacity: {
  disabled: '0.38',
  muted:    '0.54',
  ghost:    '0.70',
  subtle:   '0.85',
  full:     '1',
},
```

---

### 17.4 Chart Color Palette Tokens

Chart colors must be tokenized so they stay consistent across Trend Overview, Sparklines, and any future chart widget.

```css
:root {
  /* Line chart series (ordered — use in this sequence for multi-series charts) */
  --chart-1:  #3B82F6;   /* blue   — Price, primary series */
  --chart-2:  #F59E0B;   /* amber  — MA200, secondary series */
  --chart-3:  #A855F7;   /* purple — Sentiment, tertiary */
  --chart-4:  #EF4444;   /* red    — Fear & Greed, quaternary */
  --chart-5:  #22C55E;   /* green  — fifth series */
  --chart-6:  #06B6D4;   /* cyan   — sixth series */

  /* Fill opacities for area charts (applied as rgba on chart-N color) */
  --chart-fill-opacity: 0.08;

  /* Donut/pie segments (portfolio allocation) */
  --donut-1:  #00E5C8;   /* teal   — Cash */
  --donut-2:  #3B82F6;   /* blue   — Technology */
  --donut-3:  #A855F7;   /* purple — Healthcare */
  --donut-4:  #F97316;   /* orange — Financials */
  --donut-5:  #F59E0B;   /* amber  — Consumer Cyclical */
  --donut-6:  #6B7280;   /* gray   — Others */

  /* Grid lines inside charts */
  --chart-grid:    rgba(255,255,255,0.04);
  --chart-grid-em: rgba(255,255,255,0.08);  /* emphasized gridline (e.g. zero baseline) */

  /* Axis labels */
  --chart-axis-text: #4B5568;

  /* Crosshair */
  --chart-crosshair:      rgba(255,255,255,0.20);
  --chart-crosshair-dot:  rgba(255,255,255,0.80);

  /* Light theme overrides */
  --chart-grid:           rgba(0,0,0,0.05);
  --chart-grid-em:        rgba(0,0,0,0.10);
  --chart-axis-text:      #9CA3AF;
}
```

---

### 17.5 Surface Treatment Tokens

```css
:root {
  /* Gradient overlays applied over card backgrounds */
  --surface-shimmer:     linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%);
  --surface-glow-cyan:   radial-gradient(ellipse at top left, rgba(0,229,200,0.06) 0%, transparent 60%);
  --surface-glow-blue:   radial-gradient(ellipse at top right, rgba(59,130,246,0.06) 0%, transparent 60%);

  /* Scrollable fade — signals more content below */
  --surface-fade-bottom: linear-gradient(to bottom, transparent 70%, var(--bg-card) 100%);
  --surface-fade-right:  linear-gradient(to right,  transparent 70%, var(--bg-card) 100%);

  /* Backdrop blur — used for modals and dropdowns over content */
  --backdrop-sm:  blur(4px);
  --backdrop-md:  blur(8px);
  --backdrop-lg:  blur(16px);
}
```

```js
backdropBlur: {
  sm: '4px',
  md: '8px',
  lg: '16px',
},
```

---

### 17.6 Typography Detail Tokens

```css
:root {
  /* Line heights — named by density */
  --leading-tight:    1.2;   /* headings, large values */
  --leading-snug:     1.35;  /* card titles, labels */
  --leading-normal:   1.5;   /* body text, descriptions */
  --leading-relaxed:  1.65;  /* readable paragraphs (news content) */

  /* Letter spacing */
  --tracking-tight:   -0.02em;  /* large display numbers */
  --tracking-normal:  0;
  --tracking-wide:    0.04em;   /* uppercase labels */
  --tracking-wider:   0.08em;   /* table column headers */

  /* Font weights — named by role */
  --weight-data:    400;   /* raw numbers in tables */
  --weight-label:   500;   /* UI labels, nav items */
  --weight-title:   600;   /* card titles, section headers */
  --weight-value:   700;   /* key metrics, prices */
  --weight-display: 700;   /* hero numbers (portfolio total, gauge center) */
}
```

---

### 17.7 Token Completeness Audit Checklist

Before shipping any component, verify every value is tokenized:

```
□ Colors      — no raw hex, no raw rgba() except in token definitions
□ Spacing     — no raw px for margin/padding/gap outside tokens
□ Typography  — font-size, font-weight, line-height, letter-spacing all from tokens
□ Radius      — no raw border-radius values
□ Shadow      — no raw box-shadow values
□ Z-index     — no raw numbers (1, 100, 9999)
□ Opacity     — no raw decimal opacities
□ Duration    — no raw ms/s values in transitions or animations
□ Easing      — no raw cubic-bezier() outside token definitions
□ Chart colors — no hardcoded colors in chart configs, always var(--chart-N)
□ Gradients   — no inline gradient strings, always var(--surface-*)
```

---

## 18. Fluid Auto-Layout & Intrinsic Card Scaling

> **The grid defined in §9 uses fixed pixel row heights for desktop — predictable and exact. This section adds an intrinsic fluid layer that sits beneath it: cards adapt their internal content proportionally to any screen width without breaking, and on smaller screens the grid itself becomes fully intrinsic using `minmax()` and container queries.**

---

### 18.1 The Two-Mode Grid Strategy

```
Desktop (> 1024px):
  grid-template-rows: explicit px heights (§9.2)
  Cards are rigid — content adapts inside them
  Result: pixel-perfect, identical rows

Tablet + Mobile (≤ 1024px):
  grid-template-rows: none (auto)
  Cards are intrinsic — height follows content
  Result: no overflow, no clipping, natural stacking
```

The switch between modes is a single media query on the grid container. Everything else — card internals, tokens, component classes — is identical in both modes.

---

### 18.2 Intrinsic Column Sizing with `minmax()`

Replace fixed 12-column repeat with a fluid column system for tablet/mobile:

```css
/* ── Desktop: strict 12 columns ──────────────────────── */
.dashboard-grid {
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: 40px 168px 280px 220px 380px 80px;
  gap: 12px;
}

/* ── Tablet: 2 columns, auto rows ─────────────────────── */
@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: none;
    gap: 10px;
  }
  .dashboard-grid > * {
    grid-column: auto;
    grid-row: auto;
    height: auto;
    min-height: 160px;
  }
}

/* ── Mobile: single column, fully intrinsic ───────────── */
@media (max-width: 640px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    gap: 8px;
  }
  .dashboard-grid > * {
    grid-column: auto;
    grid-row: auto;
    height: auto;
    min-height: 140px;
  }
}
```

---

### 18.3 Fluid Typography with `clamp()`

Font sizes scale proportionally with viewport width. No abrupt jumps at breakpoints.

```css
:root {
  /* clamp(min, preferred, max)
     preferred = viewport-relative size that scales between min and max  */

  --text-fluid-xs:    clamp(10px, 1vw + 8px,   11px);
  --text-fluid-sm:    clamp(11px, 1vw + 9px,   13px);
  --text-fluid-base:  clamp(12px, 1.2vw + 9px, 14px);
  --text-fluid-lg:    clamp(14px, 1.5vw + 10px,18px);
  --text-fluid-xl:    clamp(18px, 2vw + 12px,  24px);
  --text-fluid-hero:  clamp(24px, 3vw + 14px,  36px);  /* portfolio total, large KPIs */
}
```

```js
// tailwind.config.js — fluid text scale
fontSize: {
  'fluid-xs':   'var(--text-fluid-xs)',
  'fluid-sm':   'var(--text-fluid-sm)',
  'fluid-base': 'var(--text-fluid-base)',
  'fluid-lg':   'var(--text-fluid-lg)',
  'fluid-xl':   'var(--text-fluid-xl)',
  'fluid-hero': 'var(--text-fluid-hero)',
},
```

**Usage:** Apply fluid sizes to key metric values that must remain readable at any width:
```jsx
<p className="text-fluid-hero font-display numeric">$128,450.25</p>
<p className="text-fluid-sm text-muted">Total Portfolio Value</p>
```

---

### 18.4 Fluid Spacing with `clamp()`

Card padding and grid gap scale with viewport so the layout never feels cramped on small screens or wasteful on large ones.

```css
:root {
  --space-fluid-gap:    clamp(8px,  1.5vw, 12px);   /* grid gap */
  --space-fluid-card:   clamp(12px, 2vw,   16px);   /* card internal padding */
  --space-fluid-inset:  clamp(10px, 1.5vw, 16px);   /* section insets */
}
```

```css
/* Apply fluid gap to grid */
.dashboard-grid { gap: var(--space-fluid-gap); }

/* Apply fluid padding to card zones */
.card-header { padding: calc(var(--space-fluid-card) * 0.875) var(--space-fluid-card) calc(var(--space-fluid-card) * 0.625); }
.card-body   { padding: 0 var(--space-fluid-card); }
.card-footer { padding: calc(var(--space-fluid-card) * 0.625) var(--space-fluid-card) var(--space-fluid-card); }
```

---

### 18.5 Container Queries — Component-Level Responsiveness

Media queries respond to the viewport. Container queries respond to the card's own width. This means a card widget behaves correctly whether it spans 3 columns, 6 columns, or the full width — without knowing which.

```css
/* Opt each card into container query context */
.card {
  container-type: inline-size;
  container-name: card;
}

/* Card content adapts to the card's own width, not the viewport */
@container card (max-width: 280px) {
  /* Narrow card — compact layout */
  .card-header        { padding: 10px 12px 8px; }
  .card-title         { font-size: 11px; }
  .metric-number      { font-size: 20px; }
  .pill               { font-size: 9px; padding: 1px 4px; }
  .data-table th,
  .data-table td      { padding: 0 4px; font-size: 10px; }
}

@container card (min-width: 280px) and (max-width: 480px) {
  /* Medium card — standard layout */
  .metric-number      { font-size: 24px; }
}

@container card (min-width: 480px) {
  /* Wide card — spacious layout, can show more */
  .card-header        { padding: 16px 20px 12px; }
  .data-table td      { height: 40px; font-size: 13px; }
}
```

**Container query for chart height adaptation:**
```css
@container card (max-height: 180px) {
  .chart-container { height: 80px; }
  .chart-x-axis    { display: none; }   /* hide labels when space is tight */
}

@container card (min-height: 180px) {
  .chart-container { height: 100%; }
  .chart-x-axis    { display: flex; }
}
```

---

### 18.6 Aspect Ratio Locks for Charts and Gauges

Charts must never collapse to zero height or stretch to an unusable aspect ratio.

```css
/* Sparklines — always 3:1 width:height */
.sparkline-container {
  aspect-ratio: 3 / 1;
  width: 100%;
  min-width: 60px;
  max-width: 120px;
}

/* Gauge/dial — always square (semicircle needs equal sides) */
.gauge-container {
  aspect-ratio: 2 / 1;   /* semicircle is 2:1 (wide:tall) */
  width: 100%;
  max-width: 220px;
  margin: 0 auto;
}

/* Donut chart — always square */
.donut-container {
  aspect-ratio: 1 / 1;
  width: 100%;
  max-width: 180px;
  flex-shrink: 0;
}

/* Main trend chart — 16:7 ratio minimum, fills available space above that */
.trend-chart-container {
  aspect-ratio: 16 / 7;
  width: 100%;
  min-height: 120px;
  max-height: 100%;
}
```

---

### 18.7 Intrinsic Card Minimum Heights

On fluid/auto layouts (tablet/mobile), every card type declares a `min-height` that guarantees readability even when content is minimal.

```css
/* Per card type — applied via data attribute */
[data-card="kpi"]       { min-height: 100px; }
[data-card="chart-sm"]  { min-height: 140px; }
[data-card="chart-lg"]  { min-height: 200px; }
[data-card="table"]     { min-height: 180px; }
[data-card="heatmap"]   { min-height: 220px; }
[data-card="portfolio"] { min-height: 260px; }
[data-card="news"]      { min-height: 160px; }
```

```jsx
// Usage
<div className="card" data-card="chart-lg">...</div>
```

---

## 19. Performance

> **A financial dashboard renders real-time data. Performance is not a nice-to-have — a chart that paints slowly during a price spike destroys trust. These rules cover rendering, layout, bundle, and animation performance.**

---

### 19.1 CSS Containment

Tell the browser explicitly what can and cannot affect elements outside a card. This allows the browser to skip layout and paint calculations for cards that haven't changed.

```css
.card {
  /* layout: changes inside don't trigger layout outside the card
     style:  CSS counters and custom properties don't escape
     paint:  card creates its own stacking context — no external repaints */
  contain: layout style paint;
  /* Note: don't use contain: strict — it also contains size, which conflicts
     with our grid-driven height inheritance */
}

/* For cards with internal scroll only */
.card-body.scrollable {
  contain: layout style;   /* layout is contained; paint is NOT (needed for sticky fade) */
  overflow-y: auto;
  overscroll-behavior: contain;  /* prevents scroll from propagating to the page */
}
```

---

### 19.2 `content-visibility` for Off-Screen Cards

Cards below the fold don't need to be painted until the user scrolls to them.

```css
/* Applied to rows that are reliably off-screen on initial load */
.dashboard-grid-row-4,
.dashboard-grid-row-5 {
  content-visibility: auto;
  /* contain-intrinsic-size tells the browser how much space to reserve
     while the content is skipped — prevents layout shift on scroll */
  contain-intrinsic-size: 0 380px;   /* matches grid-template-rows value */
}
```

---

### 19.3 GPU Layer Promotion — Targeted and Minimal

```css
/* Only promote elements that actually animate — never apply will-change globally */

/* Sidebar slide (transforms on scroll) */
.sidebar { will-change: transform; }

/* Chart lines (SVG path animations) */
.chart-line { will-change: stroke-dashoffset; }

/* Skeleton shimmer (background-position animation) */
.skeleton { will-change: background-position; }

/* Tooltip (repositions frequently on mouse move) */
.chart-tooltip { will-change: transform; }

/* Remove will-change after animation completes — frees GPU memory */
.chart-line.drawn { will-change: auto; }
```

> **Rule:** `will-change` is applied in JavaScript after the element is measured and just before animation starts. It is removed in the animation `onComplete` callback. Never apply it statically to all cards or all charts.

---

### 19.4 Font Loading Strategy

```html
<!-- In <head> — preconnect before anything else -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Subset to only weights used by the spec:
     IBM Plex Sans: 400, 500, 600, 700
     IBM Plex Mono: 400, 600, 700                    -->
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?
    family=IBM+Plex+Mono:wght@400;600;700&
    family=IBM+Plex+Sans:wght@400;500;600;700&
    display=swap&subset=latin"
/>
```

```css
/* Prevent layout shift during font load */
body {
  font-display: swap;       /* show fallback immediately, swap when loaded */
}

/* Size-adjust fallback to match IBM Plex metrics — minimises reflow on swap */
@font-face {
  font-family: 'IBM Plex Sans Fallback';
  src: local('Arial');
  size-adjust: 101%;
  ascent-override: 92%;
  descent-override: 24%;
  line-gap-override: 0%;
}
```

---

### 19.5 Chart Rendering Performance

```
Virtual rendering for large datasets:
  Datasets > 500 points: use canvas-based rendering (Chart.js, ECharts)
  Datasets ≤ 500 points: SVG is fine — more flexible for theming

Memoization contract:
  Chart components must be wrapped in React.memo
  Data arrays passed as props must be stable references (useMemo)
  Theme tokens passed as a single config object (not individual props)

Chart update strategy:
  Real-time tick (< 1s intervals): update only the last data point, don't redraw full series
  Slow refresh (> 5s intervals):   full redraw acceptable
  Tab hidden (document.visibilityState === 'hidden'): pause all chart updates

Resize handling:
  Use ResizeObserver on .chart-container, not window 'resize' event
  Debounce resize callbacks: 150ms
  Charts respond to container size, not viewport size (pairs with §18.4 container queries)
```

---

### 19.6 Transition Performance Rules

```css
/* Only animate GPU-composited properties — never animate layout properties */

/* ✅ GPU composited — animate freely */
.animatable {
  transition-property: transform, opacity, filter;
  /* These never trigger layout or paint */
}

/* ⚠️ Paint only — animate sparingly (small areas only) */
.animatable-paint {
  transition-property: background-color, border-color, color, box-shadow;
  /* Triggers paint but not layout — acceptable for small elements */
}

/* ❌ Never animate these — triggers full layout recalc */
/* width, height, padding, margin, top, left, font-size */
/* Use transform: scale() instead of width/height animations */
/* Use transform: translateY() instead of top/margin animations */
```

---

### 19.7 Bundle & CSS Performance

```
PurgeCSS / Tailwind JIT:
  content: ['./src/**/*.{js,ts,jsx,tsx}'] in tailwind.config.js
  JIT mode ensures only used utility classes are included in the build
  Estimated CSS bundle: < 15KB gzipped for this design system

CSS @layer order (prevents specificity wars):
  @layer base      — reset, CSS variables, :root tokens
  @layer components — .card, .data-table, .pill (from plugin)
  @layer utilities  — Tailwind utility classes (always win specificity)

Critical CSS:
  Inline styles for: sidebar, nav bar, ticker strip, Row 1 cards
  These are above-the-fold — must paint before first contentful paint
  All other rows: loaded in main CSS bundle

Icon strategy:
  Use lucide-react with tree-shaking: import { TrendingUp } from 'lucide-react'
  Never import the full icon library: import * as Icons from 'lucide-react' ← banned
```

---

## 20. API Specifications

> All endpoints are served from the core-engine on `http://localhost:8003`. The Vite dev proxy forwards `/api/*` and `/symbols/*` to that port. All responses are JSON. Timestamps are ISO 8601 UTC unless noted.

### 20.1 `GET /api/market/status`

Returns real-time NYSE/U.S. equity market open/closed/pre-market status.

**Request:** `GET /api/market/status`

**Response:**
```json
{
  "status": "PRE_MARKET",          // "OPEN" | "CLOSED" | "PRE_MARKET" | "AFTER_HOURS"
  "status_label": "PRE-MARKET",    // human-readable, all caps
  "next_open_et": "09:30 ET",     // next market open (weekdays only)
  "next_close_et": "16:00 ET",    // next market close (weekdays only)
  "is_trading": false,            // true during regular market hours 09:30–16:00 ET Mon–Fri
  "timestamp": "2026-07-17T09:00:00-04:00"
}
```

**Business rules:**
- Market hours: 09:30–16:00 ET, Monday–Friday (U.S. market calendar)
- Pre-market: 04:00–09:30 ET; After-hours: 16:00–20:00 ET
- weekends and NYSE holidays → `status: "CLOSED"`, `is_trading: false`
- Implementation: `services/core-engine/app/api/market.py`, function `get_market_status()`, line 517+

---

### 20.2 `GET /api/symbols/search`

Returns symbol search autocomplete. Case-insensitive prefix match.

**Request:** `GET /api/symbols/search?q={query}`

| Param | Type | Description |
|---|---|---|
| `q` | string | Search query, 1+ characters |

**Response:** `200 OK`
```json
[
  {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "type": "Stock",
    "exchange": "NASDAQ"
  }
]
```
Returns empty array `[]` if no matches. Max 10 results.

**Business rules:**
- Case-insensitive prefix match on `symbol` and `name`
- Priority: exact symbol match first, then name prefix
- Implementation: `services/core-engine/app/api/symbols.py`, function `search_symbols()`, line 253+
- Vite proxy route: `server.proxy['/api/symbols'] → http://localhost:8003` (added in `webui/vite.config.ts`)

---

### 20.3 `GET /api/core/layers/correlation-matrix`

Returns the 6-symbol correlation matrix used by SignalCard's 6-layer bars footer.

**Request:** `GET /api/core/layers/correlation-matrix`

**Response:**
```json
{
  "matrix": [
    [1.00,  0.12,  0.45,  0.67,  0.23,  0.78],
    [0.12,  1.00, -0.34,  0.09,  0.56,  0.21],
    [0.45, -0.34,  1.00,  0.88,  0.11,  0.43],
    [0.67,  0.09,  0.88,  1.00,  0.06,  0.61],
    [0.23,  0.56,  0.11,  0.06,  1.00,  0.19],
    [0.78,  0.21,  0.43,  0.61,  0.19,  1.00]
  ],
  "labels": ["NVDA", "AAPL", "MSFT", "AMZN", "BTC", "SPY"],
  "timestamp": "2026-07-17T14:30:00Z"
}
```

- 6×6 symmetric matrix, diagonal = 1.00
- Used by SignalCard.tsx footer 6-layer bars loop
- Implementation: `services/core-engine/app/api/layers.py`, endpoint `/correlation-matrix`, line 32+

---

## 21. Aesthetic Refinements

> **These rules address the gap between "it looks right" and "it feels right". They are not optional polish — in a professional trading dashboard, visual quality is a signal of data quality. A sloppy UI implies sloppy data.**

---

### 21.1 Consistent Micro-Interaction Language

Every interactive element must follow this exact interaction model. Inconsistency in hover/active states is felt immediately even when users can't name it.

```css
/* The standard interactive element state machine */
.interactive {
  /* Base */
  opacity: var(--opacity-ghost);       /* 0.70 — slightly subdued at rest */
  transition:
    opacity      var(--duration-fast)  var(--ease-out),
    background   var(--duration-fast)  var(--ease-out),
    border-color var(--duration-fast)  var(--ease-out),
    box-shadow   var(--duration-normal) var(--ease-out),
    transform    var(--duration-fast)  var(--ease-spring);
}
.interactive:hover  { opacity: 1; background: rgba(255,255,255, var(--opacity-hover-bg)); }
.interactive:active { transform: scale(0.97); background: rgba(255,255,255, var(--opacity-active-bg)); }
.interactive:focus-visible {
  outline: 2px solid var(--accent-cyan);
  outline-offset: 2px;
  opacity: 1;
}
.interactive:disabled { opacity: var(--opacity-disabled); pointer-events: none; }
```

---

### 21.2 Number Change Animation

When a real-time value updates, the direction of change must be communicated visually. This is a primary UX signal in a financial dashboard.

```css
@keyframes flash-positive {
  0%   { color: var(--text-primary); }
  30%  { color: var(--green); background: rgba(34,197,94,0.12); }
  100% { color: var(--text-primary); background: transparent; }
}

@keyframes flash-negative {
  0%   { color: var(--text-primary); }
  30%  { color: var(--red); background: rgba(239,68,68,0.12); }
  100% { color: var(--text-primary); background: transparent; }
}

.value-flash-up   { animation: flash-positive var(--duration-slow) var(--ease-out); }
.value-flash-down { animation: flash-negative var(--duration-slow) var(--ease-out); }
```

```js
// Apply in React — compare prev and next value
const prevRef = useRef(value)
useEffect(() => {
  if (value > prevRef.current) el.classList.add('value-flash-up')
  if (value < prevRef.current) el.classList.add('value-flash-down')
  const id = setTimeout(() => el.classList.remove('value-flash-up', 'value-flash-down'), 350)
  prevRef.current = value
  return () => clearTimeout(id)
}, [value])
```

---

### 21.3 Chart Line Quality

```
Smoothing:     Use monotone cubic interpolation (not cardinal or catmull-rom)
               This prevents lines from going below zero and respects data shape

Stroke caps:   stroke-linecap: round — softer endings match the rounded card aesthetic
Stroke joins:  stroke-linejoin: round

Anti-aliasing: shape-rendering: geometricPrecision on all SVG paths
               (not crispEdges — that creates pixelated diagonals)

Area fills:    Use a vertical gradient, not a flat opacity:
               top of fill: rgba(chart-color, 0.15)
               bottom of fill: rgba(chart-color, 0.00)
               This reads as depth, not as a flat colored region

Data points:   Only show dots on hover (not always-on)
               Dot radius: 4px, stroke: 2px white, fill: chart-series-color
               Transition: opacity 100ms, r 100ms — pops in on hover
```

---

### 21.4 Card Depth Hierarchy

Not all cards are equal. The visual hierarchy between card types must be readable at a glance:

```css
/* Primary cards (contain key decision metrics) */
.card[data-priority="primary"] {
  border-color: var(--border-active);
  background-image: var(--surface-glow-cyan);
}

/* Standard cards (contain supporting data) */
.card[data-priority="standard"] {
  border-color: var(--border-default);
  /* no gradient overlay */
}

/* Muted cards (reference/supplementary data) */
.card[data-priority="muted"] {
  border-color: var(--border-subtle);
  opacity: 0.90;
}

/* Card hover — all types lift by the same amount */
.card:hover {
  border-color: var(--border-active);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px var(--border-active);
  transform: translateY(-1px);
  transition:
    box-shadow   var(--duration-normal) var(--ease-out),
    border-color var(--duration-fast)   var(--ease-out),
    transform    var(--duration-fast)   var(--ease-spring);
}
```

---

### 21.5 Typography Rendering

```css
body {
  /* Subpixel antialiasing on macOS — crisper text on dark backgrounds */
  -webkit-font-smoothing:  antialiased;
  -moz-osx-font-smoothing: grayscale;

  /* Optical sizing — font adjusts its design for the rendered size */
  font-optical-sizing: auto;

  /* Prevent text from shifting during font swap (pairs with §19.4) */
  text-size-adjust: 100%;
}

/* Numeric values — optical kerning for tight financial numbers */
.numeric {
  font-kerning: normal;
  font-variant-numeric: tabular-nums slashed-zero;  /* slashed zero avoids 0/O confusion */
  font-feature-settings: "tnum", "zero";
}

/* Uppercase labels — optical tracking adjustment */
.label-upper {
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  /* Uppercase + wide tracking needs slightly lighter weight to avoid looking heavy */
  font-weight: var(--weight-label);
}
```

---

### 21.6 Scrollbar Aesthetics

```css
/* Custom scrollbar — matches the dark surface aesthetic */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--border-active) transparent;
}

::-webkit-scrollbar        { width: 4px; height: 4px; }
::-webkit-scrollbar-track  { background: transparent; }
::-webkit-scrollbar-thumb  {
  background:    var(--border-active);
  border-radius: var(--radius-pill);
  transition:    background var(--duration-fast);
}
::-webkit-scrollbar-thumb:hover   { background: var(--text-muted); }
::-webkit-scrollbar-corner        { background: transparent; }
```

---

### 21.7 Focus & Accessibility Aesthetics

Focus states must be visible without being jarring — they're part of the visual language, not an afterthought.

```css
/* Global focus ring — visible keyboard nav indicator */
:focus-visible {
  outline: 2px solid var(--accent-cyan);
  outline-offset: 3px;
  border-radius: var(--radius-sm);
  /* Glow makes it more visible without being harsh */
  box-shadow: 0 0 0 4px rgba(0,229,200,0.15);
  transition: box-shadow var(--duration-fast) var(--ease-out);
}

/* Remove focus ring for mouse users (only shows for keyboard) */
:focus:not(:focus-visible) { outline: none; box-shadow: none; }

/* Selection highlight — consistent with brand color */
::selection {
  background: rgba(0,229,200,0.20);
  color: var(--text-primary);
}
```

---

### 21.8 Dark/Light Theme Transition

When the user toggles the theme, the transition must feel intentional — not like a flash.

```css
/* Applied temporarily to the root during theme switch (add/remove via JS) */
.theme-transitioning * {
  transition:
    background-color var(--duration-normal) var(--ease-in-out),
    border-color     var(--duration-normal) var(--ease-in-out),
    color            var(--duration-fast)   var(--ease-in-out),
    box-shadow       var(--duration-normal) var(--ease-in-out) !important;
}
```

```js
// ThemeToggle.tsx
const toggleTheme = () => {
  document.documentElement.classList.add('theme-transitioning')
  document.documentElement.classList.toggle('theme-light')
  // Remove transition class after animation completes
  setTimeout(() => {
    document.documentElement.classList.remove('theme-transitioning')
  }, 350) // matches --duration-slow
}
```

---

*End of SystemOne Design Specification v2.0.0*
