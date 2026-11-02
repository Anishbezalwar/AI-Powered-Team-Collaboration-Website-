/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0B0F17',
        surface: '#111827',
        surfaceLight: '#1F2937',
        border: 'rgba(255, 255, 255, 0.08)',
        accent: {
          primary: '#6366F1', // Indigo
          success: '#10B981', // Emerald
          warning: '#F59E0B', // Amber
          danger: '#EF4444',  // Rose
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
