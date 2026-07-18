**SystemOne Dashboard Developer Spec Sheet**

---

## 1. Overall Design
- Theme: Dark mode (#1E1E2D background)
- Accent Colors:
  - Positive / Bullish: #00FF7F (Neon Green)
  - Negative / Bearish: #FF4500 (Neon Red)
  - Neutral / Caution: #FFD700 (Yellow)
  - Interactive / Info: #1E90FF (Blue)
- Typography:
  - Font Family: Sans-serif, Modern, Clean
  - Header: 20–24px
  - KPI Values: 18–22px
  - Subtext: 12–14px
- Card Corners: 8–12px radius
- Shadow: Subtle drop shadow (#00000030)

---

## 2. Layout Specification
### Header
- Height: 60px desktop, collapsible on mobile
- Elements: Logo, System Status, Version, Search bar, Watchlist, Notifications, User avatar

### Top Row
1. Market Overview
   - Fear & Greed Dial
     - Circular gauge, radius 70px
     - Zones: Red 0-25, Yellow 25-50, Green 50-100
     - Needle for current value
     - Mini trend sparkline under dial
2. Market Sentiment
   - Line chart (0-100)
   - Timeline buttons: 1D, 1W, 1M, 3M, 1Y, All
3. Market Breadth / Advance-Decline
   - Horizontal bar with Advancing, Neutral, Declining
   - Sparkline overlay
4. Quick Actions
   - Buttons: New Signal, Portfolio, Hot Symbols

### Middle Section
1. Market Trend Overview
   - Multi-line chart: Price, 200 MA, Sentiment, Fear/Greed
   - Timeline: 6M default
   - Interactive tooltip on hover
2. Market Movers / Hot Symbols
   - Table/cards: Symbol, Price, % Change, Volume
   - Tabs: Top Gainers, Top Losers, Most Active
3. Hot Takes / High Volume
   - Columns: Symbol, Price, % Change, Volume, Volume vs Avg
   - Sortable/filterable
4. Sector Performance
   - Horizontal bars per sector, color-coded by % change
5. News & Insights
   - List of recent news, timestamp, source label

### Bottom Section
1. Market Heatmap
   - Treemap layout
   - Rectangle size = Market Cap / Portfolio allocation
   - Color = % Change (Green/Red)
   - Sector grouping with labels
   - Hover tooltip: Symbol, % Change, Price
2. Portfolio Overview
   - Donut chart, center text = Total Value
   - Segments = allocation per sector
   - Today's P&L, Unrealized gains, Buying Power

### Footer
- User info, quick settings, help, optional news ticker

---

## 3. Component Specifications
| Component | Type | Specs |
|-----------|------|------|
| KPI Cards | Card | Width ~180px, Height ~100px, Icon + Value + Label, Hover Shadow, Background #1E1E2D |
| Gauge / Dial | Circular Gauge | Radius 70px, Color Zones Red/Yellow/Green, Needle for Current Value, Mini Sparkline |
| Line / Area Charts | Chart | Multi-line, X-axis date, Y-axis numeric, Tooltip on hover, Gradient fill optional |
| Radar Chart | Layer Analysis | Hexagon layout, Vertices: Trend, Momentum, MTF, Institutional, Sentiment, Intermarket, Hover shows values |
| Treemap | Tree/Grid | Rectangle size by allocation, Color by % change, Hover tooltip, Sector grouping |
| Tables / Cards | Data Table | Column headers bold, Rows color-coded, Hover highlight, Sorting/filtering |
| Donut Chart | Pie/Donut | Segmented by allocation, Center text for total value, Interactive hover |
| Buttons | Action | Rounded corners, Hover glow, Color-coded by action |

---

## 4. Interaction / UX
- Hover tooltips on charts, treemap, KPI cards
- Clickable charts for drill-down: radar → ticker → historical trend
- Smooth animations for gauge, line updates, tables
- Responsive Layout:
  - Desktop: 3–4 columns grid
  - Tablet: 2 columns stacked
  - Mobile: 1 column vertical scroll, collapsible headers, floating action buttons

---

## 5. Content Mapping
- Data Sources: Real-time market data (indexes, tickers, portfolios)
- Signals: Active signals, Confidence %, Entry/Stop/Target
- Portfolio: Allocation, P&L, Sector grouping
- Market Metrics: Fear/Greed Index, Sentiment, Breadth, Advance/Decline Ratio
- News: Timestamped headlines, source labels

---

**End of Developer Spec Sheet**

