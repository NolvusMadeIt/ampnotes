import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(from var(--bg) r g b / <alpha-value>)',
        surface: 'rgb(from var(--surface) r g b / <alpha-value>)',
        surface2: 'rgb(from var(--surface-2) r g b / <alpha-value>)',
        text: 'rgb(from var(--text) r g b / <alpha-value>)',
        muted: 'rgb(from var(--text-muted) r g b / <alpha-value>)',
        border: 'rgb(from var(--border) r g b / <alpha-value>)',
        line: 'rgb(from var(--border) r g b / <alpha-value>)',
        popover: 'rgb(from var(--popover) r g b / <alpha-value>)',
        popoverForeground: 'rgb(from var(--popover-foreground) r g b / <alpha-value>)',
        input: 'rgb(from var(--input) r g b / <alpha-value>)',
        ring: 'rgb(from var(--ring) r g b / <alpha-value>)',
        icon: 'rgb(from var(--icon) r g b / <alpha-value>)',
        iconMuted: 'rgb(from var(--icon-muted) r g b / <alpha-value>)',
        accent: 'rgb(from var(--accent) r g b / <alpha-value>)',
        accentContrast: 'rgb(from var(--accent-contrast) r g b / <alpha-value>)',
        success: 'rgb(from var(--success) r g b / <alpha-value>)',
        warning: 'rgb(from var(--warning) r g b / <alpha-value>)',
        danger: 'rgb(from var(--danger) r g b / <alpha-value>)'
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-sm)',
        lg: 'var(--radius-md)',
        xl: 'var(--radius-lg)',
        '2xl': 'var(--radius-xl)'
      },
      boxShadow: {
        panel: 'var(--shadow-panel)'
      }
    }
  },
  plugins: []
} satisfies Config
