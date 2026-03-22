/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        // === iCodeMyBusiness Design Tokens ===

        // Backgrounds
        bg: {
          primary: "#000000",
          secondary: "#0A0A0A",
          tertiary: "#141414",
        },
        // Gold accent system
        gold: {
          DEFAULT: "#D4AF37",
          light: "#E8C84A",
          dim: "#A08628",
          glow: "rgba(212,175,55,0.15)",
        },
        // Blue accent system
        blue: {
          DEFAULT: "#3AA6FF",
          dark: "#2B7FC7",
          light: "#5CB5FF",
        },
        // Text hierarchy
        text: {
          primary: "#E6ECF1",
          muted: "#9AA7B2",
          dim: "#6B7885",
        },
        // Borders
        border: {
          DEFAULT: "#2A3441",
          gold: "rgba(212,175,55,0.3)",
        },
        // Semantic
        success: "#22C55E",
        error: "#EF4444",
        warning: "#F59E0B",

        // === shadcn/ui compatibility (CSS custom properties) ===
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        body: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        accent: ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
      },
      fontSize: {
        "display": ["clamp(3rem, 8vw, 5rem)", { lineHeight: "1.0" }],
        "h1": ["clamp(2.5rem, 5vw, 3rem)", { lineHeight: "1.1" }],
        "h2": ["clamp(1.5rem, 3vw, 2rem)", { lineHeight: "1.2" }],
        "h3": ["1.25rem", { lineHeight: "1.4" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(212,175,55,0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(212,175,55,0.3)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.5s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
