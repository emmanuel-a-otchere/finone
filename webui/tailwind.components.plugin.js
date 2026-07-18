// tailwind.components.plugin.js — Layer 3: Component Classes
// Ref: SystemOne Design Spec v2.5.0 §16.4
// ALL addComponents/addBase calls MUST be inside the plugin function scope.
const plugin = require('tailwindcss/plugin');

module.exports = plugin(function ({ addComponents, addBase, theme }) {

  // ── §8.1 Card Shell ──────────────────────────────────────────────────────────
  addComponents({
    '.card': {
      display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '0',
      background: 'var(--bg-card)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)',
    },
    '.card-nopad': {
      display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '0',
      background: 'var(--bg-card)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', height: '100%',
    },
    '.card-stretch': {
      display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '0',
      background: 'var(--bg-card)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', height: '100%',
    },

    // ── §8.2 Card Zones ────────────────────────────────────────────────────────
    '.card-header': {
      flexShrink: '0', padding: '14px 16px 10px', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between', gap: '8px',
      minHeight: '0',
    },
    '.card-body': {
      flex: '1', minHeight: '0', overflow: 'hidden', padding: '0 16px',
    },
    '.card-body-scroll': {
      flex: '1', minHeight: '0', overflowY: 'auto', padding: '0 16px',
      WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
    },
    '.card-footer': {
      flexShrink: '0', padding: '10px 16px 14px', marginTop: 'auto',
      borderTop: '1px solid var(--border-subtle)',
    },

    // ── §8.3 Card Title ───────────────────────────────────────────────────────
    '.card-title': {
      fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: '600',
      color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden',
      textOverflow: 'ellipsis', maxWidth: '100%',
    },

    // ── §8.4 Numeric values ───────────────────────────────────────────────────
    '.numeric': {
      fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
      fontFeatureSettings: '"tnum"', letterSpacing: '0', whiteSpace: 'nowrap',
    },
    '.value-positive': { color: 'var(--green)',  fontWeight: '600' },
    '.value-negative': { color: 'var(--red)',    fontWeight: '600' },
    '.value-neutral':  { color: 'var(--yellow)', fontWeight: '600' },

    // ── §8.3 / §10.3 Pills / Badges ───────────────────────────────────────────
    '.pill': {
      display: 'inline-flex', alignItems: 'center', borderRadius: 'var(--radius-sm)',
      padding: '2px 6px', fontSize: '10px', fontWeight: '600',
      fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
    },
    '.pill-positive': { backgroundColor: 'var(--green)', color: '#000', fontWeight: '700' },
    '.pill-negative': { backgroundColor: 'var(--red)',   color: '#fff', fontWeight: '700' },
    '.pill-neutral':  { backgroundColor: 'var(--yellow)', color: '#000', fontWeight: '700' },
    '.badge': {
      display: 'inline-flex', alignItems: 'center', borderRadius: 'var(--radius-sm)',
      padding: '2px 6px', fontSize: '10px', fontWeight: '600',
      fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
    },
    '.badge-green':   { backgroundColor: 'rgba(34,197,94,0.15)',  color: 'var(--green)',  border: '1px solid rgba(34,197,94,0.25)' },
    '.badge-red':     { backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--red)',    border: '1px solid rgba(239,68,68,0.25)' },
    '.badge-yellow':  { backgroundColor: 'rgba(245,158,11,0.15)', color: 'var(--yellow)', border: '1px solid rgba(245,158,11,0.25)' },
    '.badge-cyan':    { backgroundColor: 'rgba(0,229,200,0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,229,200,0.25)' },
    '.badge-muted':   { backgroundColor: 'rgba(139,149,165,0.12)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' },

    // ── §10.1 Data Table ─────────────────────────────────────────────────────
    '.data-table': { width: '100%', borderCollapse: 'collapse' },
    '.data-table th': {
      padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--font-ui)',
      fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)',
      letterSpacing: '0.04em', textTransform: 'uppercase',
      borderBottom: '1px solid var(--border-default)',
    },
    '.data-table td': {
      padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '12px',
      color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)',
    },
    '.data-table tr:hover td': { backgroundColor: 'rgba(255,255,255,0.02)' },
    '.data-table tr:last-child td': { borderBottom: 'none' },

    // ── §10.2 Tabs ─────────────────────────────────────────────────────────────
    '.tab-pill': {
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: '11px',
      fontWeight: '500', fontFamily: 'var(--font-ui)',
      backgroundColor: 'transparent', color: 'var(--text-secondary)',
      border: '1px solid transparent', cursor: 'pointer',
      transition: 'all var(--duration-fast) var(--ease-out)',
    },
    '.tab-pill.active': {
      backgroundColor: 'rgba(0,229,200,0.12)', color: 'var(--accent-cyan)',
      borderColor: 'rgba(0,229,200,0.25)',
    },
    '.tab-pill:not(.active):hover': {
      backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)',
    },
    '.tabs-pill': { display: 'flex', gap: '2px' },
    '.tab-line': {
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '4px 8px', fontSize: '12px', fontWeight: '500', fontFamily: 'var(--font-ui)',
      backgroundColor: 'transparent', color: 'var(--text-muted)',
      borderBottom: '2px solid transparent', cursor: 'pointer',
      transition: 'all var(--duration-fast) var(--ease-out)',
    },
    '.tab-line.active': { color: 'var(--text-primary)', borderBottomColor: 'var(--accent-cyan)' },
    '.tabs-line': { display: 'flex', gap: '0', borderBottom: '1px solid var(--border-default)' },

    // ── §12.1 Skeleton Loading ────────────────────────────────────────────────
    '.skeleton': {
      background: 'linear-gradient(90deg, var(--border-subtle) 25%, var(--border-default) 50%, var(--border-subtle) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1600ms ease-in-out infinite',
      borderRadius: 'var(--radius-sm)',
    },
    '.skeleton-text':    { height: '12px', width: '100%' },
    '.skeleton-text-sm': { height: '10px', width: '60%' },
    '.skeleton-title':   { height: '16px', width: '80%' },
    '.skeleton-value':   { height: '24px', width: '50%' },
    '.skeleton-row':     { height: '36px', width: '100%' },
    '.skeleton-chart':   { height: '80px', width: '100%' },

    // ── §8.5 Interactive ──────────────────────────────────────────────────────
    '.interactive': {
      cursor: 'pointer', transition: 'all var(--duration-fast) var(--ease-out)',
    },
    '.interactive:hover': { backgroundColor: 'rgba(255,255,255,0.03)' },
    '.overlay': {
      position: 'fixed', inset: '0', backgroundColor: 'rgba(0,0,0,0.60)',
      backdropFilter: 'blur(4px)', zIndex: 'var(--z-overlay)',
    },

    // ── §16.4 Chart line colors ──────────────────────────────────────────────
    '.chart-line': { fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },

    // ── §16.4 Navigation ──────────────────────────────────────────────────────
    '.icon-expand': { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', transition: 'all 150ms' },
    '.info-icon':   { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'var(--border-default)', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', cursor: 'help' },
  });

  // ── §8.6 / §16.4 Buttons & Inputs ───────────────────────────────────────────
  addComponents({
    // Buttons
    '.btn': {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: '6px', padding: '7px 14px', borderRadius: 'var(--radius-md)',
      fontSize: '12px', fontWeight: '500', fontFamily: 'var(--font-ui)',
      cursor: 'pointer', transition: 'all var(--duration-fast) var(--ease-out)',
      border: 'none', whiteSpace: 'nowrap',
    },
    '.btn-primary': {
      backgroundColor: 'var(--accent-cyan)', color: '#0B1120', fontWeight: '600',
    },
    '.btn-primary:hover': { backgroundColor: 'var(--accent-cyan-dim)' },
    '.btn-primary:active': { transform: 'scale(0.97)' },
    '.btn-primary:disabled': { opacity: '0.38', cursor: 'not-allowed' },
    '.btn-ghost': {
      backgroundColor: 'transparent', color: 'var(--text-secondary)',
      border: '1px solid var(--border-default)',
    },
    '.btn-ghost:hover': { backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', borderColor: 'var(--border-active)' },
    '.btn-ghost:active': { transform: 'scale(0.97)' },
    '.btn-ghost:disabled': { opacity: '0.38', cursor: 'not-allowed' },

    // Inputs
    '.input': {
      display: 'block', width: '100%', padding: '7px 12px',
      backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)',
      border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
      fontSize: '12px', fontFamily: 'var(--font-ui)',
      transition: 'border-color var(--duration-fast) var(--ease-out)',
      outline: 'none',
    },
    '.input::placeholder': { color: 'var(--text-muted)' },
    '.input:focus': { borderColor: 'var(--accent-cyan)', boxShadow: '0 0 0 3px rgba(0,229,200,0.12)' },
    '.input:disabled': { opacity: '0.38', cursor: 'not-allowed' },
  });

  // ── §16.3 Layer 3 utility: text-primary (CSS var → Tailwind class) ───────────
  addComponents({
    '.text-primary':   { color: 'var(--text-primary)' },
    '.text-secondary': { color: 'var(--text-secondary)' },
    '.text-muted':     { color: 'var(--text-muted)' },
    '.text-accent':    { color: 'var(--text-accent)' },
  });

  // ── §16.3 Layer 3: Color + Opacity variants (§17.4) ─────────────────────────
  // Replace Tailwind arbitrary /N syntax (bg-primary-500/10) with token-safe
  // CSS variable classes (bg-primary-10 = rgba(0,229,200,0.10)).
  addComponents({
    /* Primary/Cyan fills */
    '.bg-primary-5':   { backgroundColor: 'rgba(0,229,200,0.05)' },
    '.bg-primary-10':  { backgroundColor: 'rgba(0,229,200,0.10)' },
    '.bg-primary-15':  { backgroundColor: 'rgba(0,229,200,0.15)' },
    '.bg-primary-20':  { backgroundColor: 'rgba(0,229,200,0.20)' },
    '.bg-primary-30':  { backgroundColor: 'rgba(0,229,200,0.30)' },
    '.bg-primary-50':  { backgroundColor: 'rgba(0,229,200,0.50)' },
    /* Emerald fills (positive / long) */
    '.bg-emerald-5':   { backgroundColor: 'rgba(34,197,94,0.05)' },
    '.bg-emerald-10':  { backgroundColor: 'rgba(34,197,94,0.10)' },
    '.bg-emerald-15':  { backgroundColor: 'rgba(34,197,94,0.15)' },
    '.bg-emerald-20':  { backgroundColor: 'rgba(34,197,94,0.20)' },
    '.bg-emerald-30':  { backgroundColor: 'rgba(34,197,94,0.30)' },
    '.bg-emerald-50':  { backgroundColor: 'rgba(34,197,94,0.50)' },
    /* Red fills (negative / short) */
    '.bg-red-5':       { backgroundColor: 'rgba(239,68,68,0.05)' },
    '.bg-red-10':      { backgroundColor: 'rgba(239,68,68,0.10)' },
    '.bg-red-15':      { backgroundColor: 'rgba(239,68,68,0.15)' },
    '.bg-red-20':      { backgroundColor: 'rgba(239,68,68,0.20)' },
    '.bg-red-30':      { backgroundColor: 'rgba(239,68,68,0.30)' },
    '.bg-red-50':      { backgroundColor: 'rgba(239,68,68,0.50)' },
    /* Amber fills (caution / warning) */
    '.bg-amber-5':     { backgroundColor: 'rgba(245,158,11,0.05)' },
    '.bg-amber-10':   { backgroundColor: 'rgba(245,158,11,0.10)' },
    '.bg-amber-15':   { backgroundColor: 'rgba(245,158,11,0.15)' },
    '.bg-amber-20':   { backgroundColor: 'rgba(245,158,11,0.20)' },
    '.bg-amber-30':   { backgroundColor: 'rgba(245,158,11,0.30)' },
    '.bg-amber-50':   { backgroundColor: 'rgba(245,158,11,0.50)' },
    /* Blue fills (info) */
    '.bg-blue-5':      { backgroundColor: 'rgba(59,130,246,0.05)' },
    '.bg-blue-10':     { backgroundColor: 'rgba(59,130,246,0.10)' },
    '.bg-blue-15':     { backgroundColor: 'rgba(59,130,246,0.15)' },
    '.bg-blue-20':     { backgroundColor: 'rgba(59,130,246,0.20)' },
    '.bg-blue-30':     { backgroundColor: 'rgba(59,130,246,0.30)' },
    '.bg-blue-50':     { backgroundColor: 'rgba(59,130,246,0.50)' },
    /* Overlay backdrop */
    '.bg-overlay-60': { backgroundColor: 'rgba(0,0,0,0.60)' },
    '.bg-overlay-70': { backgroundColor: 'rgba(0,0,0,0.70)' },
    '.bg-overlay-80': { backgroundColor: 'rgba(0,0,0,0.80)' },
    /* Border opacity variants */
    '.border-emerald-20': { borderColor: 'rgba(34,197,94,0.20)' },
    '.border-emerald-30': { borderColor: 'rgba(34,197,94,0.30)' },
    '.border-red-20':     { borderColor: 'rgba(239,68,68,0.20)' },
    '.border-red-30':     { borderColor: 'rgba(239,68,68,0.30)' },
    '.border-amber-20':   { borderColor: 'rgba(245,158,11,0.20)' },
    '.border-amber-30':   { borderColor: 'rgba(245,158,11,0.30)' },
    '.border-primary-20': { borderColor: 'rgba(0,229,200,0.20)' },
    '.border-primary-30': { borderColor: 'rgba(0,229,200,0.30)' },
    '.border-blue-20':    { borderColor: 'rgba(59,130,246,0.20)' },
    '.border-blue-30':    { borderColor: 'rgba(59,130,246,0.30)' },
  });

  // ── §9.3 Dashboard grid base ─────────────────────────────────────────────────
  addBase({
    '.dashboard-grid': {
      display: 'grid',
      gridTemplateColumns: 'repeat(12, 1fr)',
      gap: '12px',
      alignItems: 'stretch',
      justifyItems: 'stretch',
    },
  });

});
