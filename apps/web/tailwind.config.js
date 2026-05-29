/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
        accent: {
          400: '#34d399',
          500: '#10b981',
        },
        surface: {
          950: '#09090b',
          900: '#121214',
          800: '#1a1a1e',
          700: '#26262b',
          600: '#333339'
        }
      }
    },
  },
  plugins: [],
}
