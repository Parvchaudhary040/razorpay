/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
        },
        surface: {
          DEFAULT: '#1e1e2e',
          card: '#2a2a3e',
          cardHover: '#33334d',
        },
        accent: {
          DEFAULT: '#a78bfa',
        },
      },
    },
  },
  plugins: [],
}