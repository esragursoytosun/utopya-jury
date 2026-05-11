import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        iguBlue: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          500: '#1B3A6E',
          600: '#16316080',
          700: '#162B58',
          800: '#101F3E',
          900: '#0B1528',
        },
        gold: {
          300: '#FDE68A',
          400: '#FCD34D',
          500: '#F59E0B',
          600: '#D97706',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      backgroundImage: {
        'display-grad': 'linear-gradient(135deg, #0B1528 0%, #1B3A6E 50%, #0B1528 100%)',
        'gold-grad': 'linear-gradient(135deg, #F59E0B, #FCD34D, #F59E0B)',
        'silver-grad': 'linear-gradient(135deg, #6B7280, #D1D5DB, #6B7280)',
        'bronze-grad': 'linear-gradient(135deg, #92400E, #D97706, #92400E)',
      },
    },
  },
  plugins: [],
}
export default config
