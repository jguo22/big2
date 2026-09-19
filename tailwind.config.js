/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"Manrope"', 'ui-sans-serif', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
