
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
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
        // Enhanced Orange colorful palette
        'electric-blue': {
          DEFAULT: "hsl(25 100% 55%)", // Override to orange
          50: "#fff7ed",
          100: "#ffedd5", 
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "hsl(25 100% 55%)",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        'vibrant-purple': {
          DEFAULT: "hsl(30 100% 50%)", // Golden orange
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a", 
          300: "#fcd34d",
          400: "#fbbf24",
          500: "hsl(30 100% 50%)",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        'emerald-green': {
          DEFAULT: "hsl(35 100% 45%)", // Amber
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d", 
          400: "#fbbf24",
          500: "hsl(35 100% 45%)",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        'sunset-orange': {
          DEFAULT: "hsl(25 100% 60%)",
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "hsl(25 100% 60%)",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        // Orange variants
        'orange': {
          DEFAULT: "hsl(25 100% 55%)",
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "hsl(25 100% 55%)",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        }
      },
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'poppins': ['Poppins', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Courier New', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.025em' }],
        'sm': ['0.875rem', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        'base': ['1rem', { lineHeight: '1.7', letterSpacing: '-0.01em' }],
        'lg': ['1.125rem', { lineHeight: '1.6', letterSpacing: '-0.015em' }],
        'xl': ['1.25rem', { lineHeight: '1.5', letterSpacing: '-0.02em' }],
        '2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.025em' }],
        '3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.03em' }],
        '4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.035em' }],
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.04em' }],
      },
      fontWeight: {
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
      },
      boxShadow: {
        'glow': '0 0 20px hsl(25 100% 55% / 0.3)',
        'glow-lg': '0 0 30px hsl(25 100% 55% / 0.4)',
        'purple-glow': '0 0 20px hsl(30 100% 50% / 0.3)',
        'green-glow': '0 0 20px hsl(35 100% 45% / 0.3)',
        'enhanced': '0 8px 32px rgba(255, 140, 0, 0.12)',
        'elevated': '0 12px 48px rgba(255, 140, 0, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.25s ease-out forwards', 
        'scale-in': 'scaleIn 0.15s ease-out forwards',
        'pulse-glow': 'pulseGlow 1s infinite',
        'shimmer': 'shimmer 0.8s linear infinite',
        'bounce-fast': 'bounceFast 0.4s infinite',
        'spin-fast': 'spinFast 0.5s linear infinite',
        'title-glow': 'titleGlow 2s ease-in-out infinite alternate',
        'background-pulse': 'backgroundPulse 8s ease-in-out infinite',
        'page-slide': 'pageSlide 0.2s ease-out',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px', 
        'md': '8px',
        'lg': '15px',
        'xl': '20px',
      },
      transitionDuration: {
        '50': '50ms',
        '100': '100ms',
        '200': '200ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
