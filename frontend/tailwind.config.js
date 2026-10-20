/** @type {import('tailwindcss').Config} */
const grotesk = ['"Bricolage Grotesque"', 'system-ui', 'sans-serif']

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14110F',
        paper: '#F4EEE3',
        cherry: { DEFAULT: '#A41E34', dark: '#7E1426' },
        sun: '#FFD23F',
        matcha: '#A8C686',
        sky: '#9CC9E8',
      },
      fontFamily: {
        sans: grotesk,
        display: grotesk,
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        jp: ['"Noto Sans JP"', 'sans-serif'],
      },
      boxShadow: {
        hard: '4px 4px 0 0 #14110F',
        'hard-lg': '7px 7px 0 0 #14110F',
        'hard-paper': '4px 4px 0 0 #F4EEE3',
        flyer: '6px 8px 0 -1px rgba(20,17,15,.18)',
      },
    },
  },
  plugins: [],
}
