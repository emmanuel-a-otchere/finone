// tailwind.config.js — Layer 2: Design Token Bridge
// Ref: SystemOne Design Spec v2.5.0 §16
// Maps CSS variables to named Tailwind tokens so SignalCard/Signals use real tokens.
const components = require('./tailwind.components.plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',   // driven by .theme-light class on <html>

  theme: {
    extend: {
      // ── §1.1 Color Palettes ─────────────────────────────────────────────────
      colors: {
        // Dark surface scale
        dark: {
          700: '#16191F', 800: '#12161E', 850: '#0F1520',
          900: '#0D1117', 950: '#0A0E15',
        },
        // Slate text/border scale
        slate: {
          300: '#CBD5E1', 400: '#94A3B8', 500: '#64748B',
          600: '#475569', 700: '#334155', 800: '#1E293B',
          900: '#0F172A', 950: '#0A0E15',
        },
        // Primary accent scale — primary-500 = #00E5C8
        primary: {
          50:  'rgba(0,229,200,0.05)',  100: 'rgba(0,229,200,0.10)',
          200: 'rgba(0,229,200,0.20)',  300: 'rgba(0,229,200,0.40)',
          400: 'rgba(0,229,200,0.60)',  500: '#00E5C8',
          600: '#00B09A',  700: '#008B7A',  800: '#006B5B',  900: '#004D42',
        },
        // Emerald (positive / buy / long)
        emerald: {
          50:  'rgba(34,197,94,0.05)',  100: 'rgba(34,197,94,0.10)',
          200: 'rgba(34,197,94,0.20)',  300: 'rgba(34,197,94,0.40)',
          400: 'rgba(34,197,94,0.60)',  500: '#22C55E',
          600: '#16A34A',  700: '#15803D',  800: '#166534',  900: '#14532D',
        },
        // Red (negative / sell / short)
        red: {
          50:  'rgba(239,68,68,0.05)',  100: 'rgba(239,68,68,0.10)',
          200: 'rgba(239,68,68,0.20)',  300: 'rgba(239,68,68,0.40)',
          400: 'rgba(239,68,68,0.60)',  500: '#EF4444',
          600: '#DC2626',  700: '#B91C1C',  800: '#991B1B',  900: '#7F1D1D',
        },
        // Amber (caution)
        amber: {
          50:  'rgba(245,158,11,0.05)',  100: 'rgba(245,158,11,0.10)',
          200: 'rgba(245,158,11,0.20)',  300: 'rgba(245,158,11,0.40)',
          400: 'rgba(245,158,11,0.60)',  500: '#F59E0B',
          600: '#D97706',  700: '#B45309',  800: '#92400E',  900: '#78350F',
        },
        // Blue (info)
        blue: {
          50:  'rgba(59,130,246,0.05)',  100: 'rgba(59,130,246,0.10)',
          200: 'rgba(59,130,246,0.20)',  300: 'rgba(59,130,246,0.40)',
          400: 'rgba(59,130,246,0.60)',  500: '#3B82F6',
          600: '#2563EB',  700: '#1D4ED8',  800: '#1E40AF',  900: '#1E3A8A',
        },
        // Named brand/status colors
        base:     '#1E1E2D', card:     '#252538', hover:    '#2E2E45',
        input:    '#181828', muted:    '#4E5A6B',
        buy:      '#00FF7F', sell:     '#FF4500', neutral:  '#FFD700',
        info:     '#1E90FF', orange:   '#F97316', warning:  '#F59E0B',
        danger:   '#EF4444', success:  '#22C55E',
        border: { DEFAULT: '#252836', subtle: '#1E2130', active: '#3D4460' },
        // Chart / heatmap
        'chart-1': '#3B82F6', 'chart-2': '#F59E0B', 'chart-3': '#A855F7',
        'chart-4': '#EF4444', 'chart-5': '#22C55E', 'chart-6': '#06B6D4',
        hm: { 'strong-up': '#166534', 'up': '#15803D', 'flat-up': '#166534',
              'flat-dn':   '#7F1D1D', 'dn': '#991B1B', 'strong-dn': '#EF4444' },
      },

      // ── §1.2 Typography ────────────────────────────────────────────────────
      fontFamily: {
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'monospace'],
        sans: ['IBM Plex Sans', 'DM Sans', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }], 'xs':  ['11px', { lineHeight: '16px' }],
        'sm':  ['12px', { lineHeight: '18px' }], 'md':  ['13px', { lineHeight: '20px' }],
        'lg':  ['16px', { lineHeight: '24px' }], 'xl':  ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }], '3xl': ['32px', { lineHeight: '40px' }],
      },

      // ── §9.2 Grid rows (desktop fixed) ──────────────────────────────────────
      gridTemplateColumns: { dashboard: 'repeat(12, 1fr)' },
      gridTemplateRows:    { dashboard: '40px 168px 280px 220px 380px 80px' },

      // ── §17.1 Motion tokens ─────────────────────────────────────────────────
      transitionDuration: {
        instant: '50ms', fast: '100ms', normal: '200ms',
        slow: '350ms', crawl: '600ms', shimmer: '1600ms',
      },
      transitionTimingFunction: {
        out:     'cubic-bezier(0.0, 0.0, 0.2, 1)',
        in:      'cubic-bezier(0.4, 0.0, 1.0, 1)',
        'in-out':'cubic-bezier(0.4, 0.0, 0.2, 1)',
        spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        shimmer:  'shimmer 1600ms ease-in-out infinite',
        'fade-up':'fade-up 200ms ease-out both',
      },

      // ── §17.2 Z-index ───────────────────────────────────────────────────────
      zIndex: {
        base: '1', raised: '10', dropdown: '50', nav: '100',
        sidebar: '150', submenu: '200', tooltip: '300',
        modal: '400', toast: '500', overlay: '999',
      },

      // ── §1.3 Radius / Shadow ───────────────────────────────────────────────
      borderRadius: {
        DEFAULT: '6px', sm: '4px', md: '6px', lg: '8px', xl: '12px', pill: '9999px',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px var(--border-default)',
        glow:  '0 0 12px rgba(0,229,200,0.15)',
        panel: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px var(--border-subtle)',
      },

      backdropBlur: { sm: '4px', md: '8px', lg: '16px' },

      // ── §16.3 Layer 3 utility: text-primary (CSS var → Tailwind class) ─────
      textColor: {
        primary:     'var(--text-primary)',
        secondary:   'var(--text-secondary)',
        muted:       'var(--text-muted)',
        accent:      'var(--text-accent)',
        emerald:     '#22C55E',
        red:         '#EF4444',
        amber:       '#F59E0B',
        blue:        '#3B82F6',
      },
      backgroundColor: {
        overlay: 'var(--bg-overlay)',
      },
      borderColor: {
        emerald: 'rgba(34,197,94,0.30)',
        red:     'rgba(239,68,68,0.30)',
        amber:   'rgba(245,158,11,0.30)',
        primary: 'rgba(0,229,200,0.30)',
        blue:    'rgba(59,130,246,0.30)',
      },
    },
  },

  plugins: [require('./tailwind.components.plugin')],
};
