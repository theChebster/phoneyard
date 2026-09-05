/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1E1A12',
        muted: '#6B6252',
        cream: '#FAF6ED',
        teal: '#0F3538',
        gold: '#E8B94A',
        'gold-dark': '#A6690E',
        line: '#E8E0CD',
        danger: '#A23A3A',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(30,26,18,.08)',
      },
    },
  },
  plugins: [],
};
