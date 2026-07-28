/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#153B50",
          50: "#F0F5F8", 100: "#DCE7EE", 200: "#B9CFDC", 300: "#8FB0C2",
          400: "#5E879F", 500: "#356179", 600: "#234E66", 700: "#153B50",
          800: "#102E3F", 900: "#0B2230",
        },
        teal: {
          DEFAULT: "#2A7F7F",
          50: "#F0F7F7", 100: "#DCEDED", 200: "#B5DBDB", 300: "#85C2C2",
          400: "#55A3A3", 500: "#2A7F7F", 600: "#226666", 700: "#1B5252",
          800: "#143D3D", 900: "#0E2B2B",
        },
        gold: {
          DEFAULT: "#D9A441",
          50: "#FBF4E4", 100: "#F6E8C6", 200: "#EED48F", 300: "#E5BC60",
          400: "#D9A441", 500: "#C98F2B", 600: "#A97722", 700: "#855C1B",
          800: "#5F4213", 900: "#3D2A0C",
        },
        mist: "#EAF3F3",
        charcoal: {
          DEFAULT: "#24323A",
          50: "#F4F6F7", 100: "#E3E8EB", 200: "#C3CDD3", 300: "#9DADB6",
          400: "#6E8391", 500: "#4A6070", 600: "#24323A", 700: "#1D282E",
          800: "#161E23", 900: "#0F1518",
        },

        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        sans: ["Inter","ui-sans-serif","system-ui","-apple-system","Segoe UI","Roboto","Helvetica Neue","Arial","sans-serif"],
        display: ["Manrope","Inter","ui-sans-serif","system-ui","sans-serif"],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
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
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}