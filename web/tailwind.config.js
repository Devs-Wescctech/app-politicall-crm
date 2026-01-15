/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg))",
        panel: "rgb(var(--panel))",
        text: "rgb(var(--text))",
        muted: "rgb(var(--muted))",
        border: "rgb(var(--border))",
        primary: "rgb(var(--primary))",
        accent: "rgb(var(--accent))",
        danger: "rgb(var(--danger))"
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,.35)"
      }
    }
  },
  plugins: []
};
