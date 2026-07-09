/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12192B',       // sidebar / headers
        asphalt: '#1F2937',   // secondary dark surfaces
        cloud: '#F5F6F8',     // app background
        slate: {
          DEFAULT: '#64748B',
          light: '#94A3B8'
        },
        amber: {
          DEFAULT: '#F5A524',
          dark: '#C97A0B'
        },
        alert: '#DC2626',
        signal: '#16A34A',
        line: '#E2E5EA'
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgba(18,25,43,0.06), 0 1px 12px rgba(18,25,43,0.04)'
      }
    }
  },
  plugins: []
}
