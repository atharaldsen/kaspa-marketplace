import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kaspa: {
          50: "#e6f7f0",
          100: "#ccefdf",
          200: "#99dfbf",
          300: "#66cf9f",
          400: "#33bf7f",
          500: "#49eacb",
          600: "#00a86b",
          700: "#007f50",
          800: "#005536",
          900: "#002b1b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
