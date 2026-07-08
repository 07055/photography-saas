import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-border": "var(--card-border)",
        "input-bg": "var(--input-bg)",
        "input-border": "var(--input-border)",
        "input-text": "var(--input-text)",
        "input-placeholder": "var(--input-placeholder)",
        "surface-muted": "var(--surface-muted)",
      },
    },
  },
  plugins: [],
};
export default config;
