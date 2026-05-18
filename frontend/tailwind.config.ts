import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "var(--color-brand-navy)",
        surface: "var(--color-dark-surface)",
        accent: "var(--color-accent)",
        secondary: "var(--color-secondary-text)",
        light: "var(--color-light-contrast)",
        darkText: "var(--color-dark-text)"
      },
      fontFamily: {
        display: ["var(--font-manrope)", "sans-serif"],
        body: ["var(--font-work-sans)", "sans-serif"],
        report: ["var(--font-inter)", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
