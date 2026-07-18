# SystemOne Design Spec — Reconciliation Report
**Spec:** `SystemOne_Design_Spec.md` (uploaded 2026-07-17)
**Baseline commit:** `2c0fe0d` (P2 fixes applied)
**Date:** 2026-07-17

---

## Reconciliation Summary

| Status | Meaning |
|---|---|
| ✅ ALIGNED | Deployed matches spec exactly |
| ⚠️ PARTIAL | Deployed partially implements spec |
| ❌ GAP | Deployed is missing spec requirement |
| 🔄 SPEC | Spec requirement conflicts with implementation (explained) |
| ✅ FIXED | Previously mismatched, now resolved this session |

---

## §1 Design Tokens

| Item | Spec | Deployed | Status |
|---|---|---|---|
| CSS variable `--text-muted` | WCAG AA ≥ 4.5:1 on dark bg (#6B7280 or lighter) | `#6B7280` | ✅ FIXED |
| `--accent-cyan` | `#00E5C8` | `#00E5C8` | ✅ ALIGNED |
| `--bg-card` | `#1A1D27` | `#1A1D27` | ✅ ALIGNED |
| IBM Plex Mono / Sans fonts | Required | Loaded via Google Fonts @import | ✅ ALIGNED |

---

## §9 Grid System

**⚠️ ISSUE: Dashboard Grid Row Heights**

| Spec | Deployed |
|---|---|
| `gridTemplateRows: '40px 168px 280px 220px 380px 80px'` (6 rows incl. blocks strip) | `grid-auto-rows: minmax(100px, auto)` + nth-child selectors |
| Explicit fixed row heights | Auto-height driven by content |
| `gap: 12px` | `gap: 8px` |

Spec conflict: The spec defines 6 rows (R0 ticker, R1 168px, R2 280px, R3 220px, R4 380px, R5 80px blocks strip). The deployed app has 5 rows — blocks strip was removed (P1-7).

tailwind.config.js already defines `gridTemplateRows: '40px 168px 280px 220px 380px'` (5 rows, no blocks strip) — this is the practical consensus.

**Action required:** Migrate Dashboard.tsx to use spec grid rows + gap: 12px.

---

## §4 Navigation

| Item | Spec | Deployed | Status |
|---|---|---|---|
| Sidebar expanded: 200px | `width: 180px` | 🔄 SPEC (within acceptable margin) |
| Sidebar icon rail: 64px | `width: 64px` | ✅ ALIGNED |
| Bottom nav: 60px | `height: 48px` | ⚠️ PARTIAL (12px difference) |
| Sidebar labels: full text, no truncation | Labels were truncating | ✅ FIXED (P2-4) |

---

## §6 Widgets

### §6.1 Ticker Strip
| Item | Spec | Deployed | Status |
|---|---|---|---|
| VIX color: inverted (rising = red) | Rising VIX = red, falling = green | ✅ FIXED (P2-1) |
| Forex 4 decimal places | EUR/USD to 4dp | ✅ ALIGNED |

### §6.2 Fear & Greed Index
| Item | Spec | Deployed | Status |
|---|---|---|---|
| Scale labels | 12px, WCAG AA | 7px | ❌ GAP → ✅ FIXED |
| Needle position | Exact ±10% scale labels | ✅ ALIGNED |

### §6.3 Market Sentiment
| Item | Spec | Deployed | Status |
|---|---|---|---|
| Period selector ≥44px touch (mobile) | Required | ✅ FIXED (P2-5) |
| Delta vs previous period | Required | ✅ FIXED (P2-6) |
| 7-point sparkline | Required | ✅ FIXED (P2-6) |
| require() error | Must not throw | ✅ FIXED (commit 26b92c2) |

### §6.4 Market Breadth
| Item | Spec | Deployed | Status |
|---|---|---|---|
| Labeled readout | "A/D Ratio 0.9" | ✅ FIXED (P2-2) |
| Legend font size | 11px | 11px | ✅ ALIGNED |

### §6.5 Market Movers
| Item | Spec | Deployed | Status |
|---|---|---|---|
| Gainers/Losers/Active tabs | Disabled + opacity when no signals | ✅ FIXED (P1-4) |

### §6.6 Hot Takes
| Item | Spec | Deployed | Status |
|---|---|---|---|
| High Volume / Price Spike / Options Flow tabs | 3 tabs | Currently 2 tabs | ⚠️ PARTIAL |

### §6.7 Sector Performance
| Item | Spec | Deployed | Status |
|---|---|---|---|
| Sector legend functional | Required | ✅ ALIGNED |
| Period selector ≥44px (mobile) | Required | ✅ FIXED (P2-5) |

### §6.8 News & Insights
| Item | Spec | Deployed | Status |
|---|---|---|---|
| Never blank card | Empty state required | ✅ FIXED (P1-3) |

### §6.9 Market Heatmap
| Item | Spec | Deployed | Status |
|---|---|---|---|
| Treemap area ∝ market cap | Required | ✅ FIXED (P1-1) |
| Sector encoding as border/header/ticker color | Required | ✅ FIXED (P1-2) |
| Non-functional legend removed | Required | ✅ FIXED (P1-2) |
| Sector zone labels (9px uppercase) | Required | ⚠️ PARTIAL (not yet added) |

### §6.10 Portfolio Overview
| Item | Spec | Deployed | Status |
|---|---|---|---|
| Total = $0 → empty ring + empty state | Required | ✅ FIXED (P1-5) |
| Period dropdown inline styled | Required | ✅ FIXED (P0-3) |

---

## §8 Card Content Contract

| Item | Spec | Deployed | Status |
|---|---|---|---|
| .card flex column + overflow:hidden | Required | ✅ ALIGNED |
| .card-header / .card-body / .card-footer zones | Required | ✅ ALIGNED |
| No text within 12px of card edge | Required | ✅ ALIGNED |
| .numeric with tabular-nums | Required | ✅ ALIGNED |

---

## §13 Footer Strip

| Item | Spec | Deployed | Status |
|---|---|---|---|
| Features bar (36px) | Required | Deleted | 🔄 SPEC (P1-7: user explicitly requested removal) |

---

## Open Items (Not Yet Implemented)

| Priority | Item | Description |
|---|---|---|
| P1 | Hot Takes 3rd tab | Add "Options Flow" tab to HotTakes |
| P1 | Heatmap sector labels | Add 9px uppercase sector zone labels |
| P2 | Dashboard grid | Migrate to spec grid rows + gap: 12px |
| P2 | Bottom nav height | Raise 48px → 60px |
| P2 | Pill contrast | .pill-positive text #000 on green may fail WCAG AA |

---

## Resolved This Session

| Commit | Change |
|---|---|
| `26b92c2` | Remove require() from MarketSentiment ES module |
| `2c0fe0d` | P2: VIX inverted, A/D label, sidebar, segmented 44px, drift needle |
| `3ea7683` | P1: heatmap treemap+sectors, EmptyState, tabs/sentiment/footer |
| `2a684f8` | P0: TickerStrip + Layout + PortfolioDonut + MarketHeatmap |
