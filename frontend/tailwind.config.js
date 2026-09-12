/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Base surfaces — dark navy control-room, not pure black
        surface: {
          0: '#0B0F17', // app background
          1: '#111726', // panel background
          2: '#161D2E', // raised card / hover
          3: '#1D2740', // borders / dividers
        },
        ink: {
          primary: '#E7EAF2',   // main text
          secondary: '#9AA4BD', // muted text
          faint: '#5C6785',     // disabled / placeholder
        },
        // Semantic accents
        ai: {
          DEFAULT: '#8B7FD6',
          muted: '#8B7FD633',
        },
        rail: {
          DEFAULT: '#4E8FE0',
          muted: '#4E8FE033',
        },
        healthy: {
          DEFAULT: '#4CAF7D',
          muted: '#4CAF7D26',
        },
        warning: {
          DEFAULT: '#D6A947',
          muted: '#D6A94726',
        },
        critical: {
          DEFAULT: '#D6604D',
          muted: '#D6604D26',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.0625rem', { lineHeight: '1.6rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.625rem', { lineHeight: '2rem' }],
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
        DEFAULT: '3px',
        md: '4px',
        lg: '6px',
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
}
