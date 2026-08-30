/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-strong": "var(--color-surface-strong)",
        primary: "var(--color-primary)",
        "primary-strong": "var(--color-primary-strong)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        
        error: "var(--color-error)",
        "error-strong": "var(--color-error-strong)",
        "error-bg": "var(--color-error-bg)",
        "error-bg-strong": "var(--color-error-bg-strong)",
        "error-border": "var(--color-error-border)",

        success: "var(--color-success)",
        "success-strong": "var(--color-success-strong)",
        "success-bg": "var(--color-success-bg)",
        "success-bg-strong": "var(--color-success-bg-strong)",
        "success-border": "var(--color-success-border)",

        info: "var(--color-info)",
        "info-strong": "var(--color-info-strong)",
        "info-text": "var(--color-info-text)",
        "info-bg": "var(--color-info-bg)",
        "info-bg-strong": "var(--color-info-bg-strong)",
        "info-border": "var(--color-info-border)",

        "cat-aftercare-bg": "var(--color-cat-aftercare-bg)",
        "cat-aftercare-text": "var(--color-cat-aftercare-text)",
      },
      fontFamily: {
        sans: ["var(--font-main)"],
      }
    },
  },
  plugins: [],
};
