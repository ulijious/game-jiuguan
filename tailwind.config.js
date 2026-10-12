/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0B0B0D',
          soft: '#16161A',
          mute: '#26262C',
          line: '#3A3A42',
        },
        paper: {
          DEFAULT: '#F4F0E6',
          warm: '#FFFDF5',
          dim: '#E7E1D3',
        },
        signal: {
          DEFAULT: '#E4002B',
          deep: '#A8001F',
          glow: '#FF2A48',
        },
        royal: { DEFAULT: '#D6006E', deep: '#8E0049' },
        pulse: { DEFAULT: '#FFD400', deep: '#C9A400' },
        ice: { DEFAULT: '#12A5DC', deep: '#0A6E93' },
        jade: { DEFAULT: '#00A96E', deep: '#00714A' },
      },
      fontFamily: {
        display: [
          'Archivo Black',
          'Noto Sans SC',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
        head: [
          'Archivo',
          'Noto Sans SC',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
        body: [
          'Space Grotesk',
          'Noto Sans SC',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Noto Sans SC',
          'PingFang SC',
          'Microsoft YaHei',
          'monospace',
        ],
      },
      fontSize: {
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
        tiny: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.04em' }],
      },
      boxShadow: {
        hard: '5px 5px 0 0 #0B0B0D',
        'hard-sm': '3px 3px 0 0 #0B0B0D',
        'hard-lg': '9px 9px 0 0 #0B0B0D',
        'hard-xl': '14px 14px 0 0 #0B0B0D',
        'hard-red': '5px 5px 0 0 #E4002B',
        'hard-royal': '5px 5px 0 0 #D6006E',
        'hard-pulse': '5px 5px 0 0 #FFD400',
        inset: 'inset 0 0 0 2px #0B0B0D',
      },
      transitionTimingFunction: {
        snap: 'cubic-bezier(0.2, 0.9, 0.25, 1)',
        slam: 'cubic-bezier(0.85, 0, 0.15, 1)',
        flick: 'cubic-bezier(0.5, -0.4, 0.3, 1.4)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translate3d(0,0,0)' },
          '100%': { transform: 'translate3d(-50%,0,0)' },
        },
        'wipe-x': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        'slam-in': {
          '0%': { transform: 'translate3d(0,-14px,0) scale(1.03)', opacity: '0' },
          '100%': { transform: 'translate3d(0,0,0) scale(1)', opacity: '1' },
        },
        flicker: {
          '0%,100%': { opacity: '1' },
          '48%': { opacity: '1' },
          '50%': { opacity: '0.55' },
          '52%': { opacity: '1' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.5)', opacity: '0' },
          '100%': { opacity: '0' },
        },
        'tick-up': {
          '0%': { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        marquee: 'marquee 26s linear infinite',
        'marquee-fast': 'marquee 14s linear infinite',
        'wipe-x': 'wipe-x 420ms cubic-bezier(0.85,0,0.15,1) both',
        'slam-in': 'slam-in 340ms cubic-bezier(0.85,0,0.15,1) both',
        flicker: 'flicker 4.5s steps(1,end) infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.2,0.9,0.25,1) infinite',
        'tick-up': 'tick-up 260ms cubic-bezier(0.2,0.9,0.25,1) both',
      },
    },
  },
  plugins: [],
}
