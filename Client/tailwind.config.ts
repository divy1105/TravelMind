import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--bg) / <alpha-value>)',
        fg: 'hsl(var(--fg) / <alpha-value>)',
        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
          fg: 'hsl(var(--brand-fg) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          fg: 'hsl(var(--accent-fg) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          fg: 'hsl(var(--muted-fg) / <alpha-value>)',
        },
        surface: 'hsl(var(--surface) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        danger: {
          DEFAULT: 'hsl(var(--danger) / <alpha-value>)',
          fg: 'hsl(var(--danger-fg) / <alpha-value>)',
        },
        success: 'hsl(var(--success) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        sans: ['var(--font-body)'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) - 2px)',
        md: 'var(--radius)',
        lg: 'calc(var(--radius) + 4px)',
        xl: 'calc(var(--radius) + 8px)',
      },
      boxShadow: {
        soft: '0 1px 2px hsl(var(--shadow) / 0.06), 0 8px 24px hsl(var(--shadow) / 0.06)',
        lift: '0 4px 16px hsl(var(--shadow) / 0.1)',
      },
    },
  },
  plugins: [],
} satisfies Config
