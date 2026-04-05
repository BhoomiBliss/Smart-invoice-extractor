/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#ff6b00",
        dark: {
          bg: "#0f172a",
          card: "#1e293b",
          border: "rgba(255, 255, 255, 0.1)"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
