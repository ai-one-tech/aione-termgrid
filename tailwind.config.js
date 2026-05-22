/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/webview/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme
        'dark-bg': '#0f172a',
        'dark-card': '#1e293b',
        'dark-muted': '#334155',
        'dark-hover': '#475569',
        'dark-text': '#f8fafc',
        'dark-text-muted': '#94a3b8',
        // Light theme
        'light-bg': '#ffffff',
        'light-card': '#f8fafc',
        'light-muted': '#e2e8f0',
        'light-hover': '#cbd5e1',
        'light-text': '#0f172a',
        'light-text-muted': '#64748b',
        // Accent
        'accent': '#22c55e',
        'accent-hover': '#16a34a',
        'destructive': '#ef4444',
      },
      fontFamily: {
        mono: ['Consolas', '"Courier New"', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'sm': '2px',
        'md': '4px',
        'lg': '8px',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
