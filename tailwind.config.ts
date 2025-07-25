
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
        // Enhanced Color Palette
        'electric-blue': {
          DEFAULT: "hsl(var(--electric-blue))",
          50: "hsl(200 100% 95%)",
          100: "hsl(200 100% 90%)",
          500: "hsl(var(--electric-blue))",
          600: "hsl(200 100% 40%)",
          700: "hsl(200 100% 30%)",
        },
        'vibrant-purple': {
          DEFAULT: "hsl(var(--vibrant-purple))",
          50: "hsl(262 83% 95%)",
          100: "hsl(262 83% 90%)",
          500: "hsl(var(--vibrant-purple))",
          600: "hsl(262 83% 48%)",
          700: "hsl(262 83% 38%)",
        },
        'emerald-green': {
          DEFAULT: "hsl(var(--emerald-green))",
          50: "hsl(142 71% 95%)",
          100: "hsl(142 71% 90%)",
          500: "hsl(var(--emerald-green))",
          600: "hsl(142 71% 35%)",
          700: "hsl(142 71% 25%)",
        },
        'sunset-orange': {
          DEFAULT: "hsl(var(--sunset-orange))",
          50: "hsl(43 96% 95%)",
          100: "hsl(43 96% 90%)",
          500: "hsl(var(--sunset-orange))",
          600: "hsl(43 96% 46%)",
          700: "hsl(43 96% 36%)",
        },
        'pink-rose': {
          DEFAULT: "hsl(var(--pink-rose))",
          50: "hsl(330 81% 95%)",
          100: "hsl(330 81% 90%)",
          500: "hsl(var(--pink-rose))",
          600: "hsl(330 81% 50%)",
          700: "hsl(330 81% 40%)",
        },
        'lime-green': {
          DEFAULT: "hsl(var(--lime-green))",
          50: "hsl(84 81% 95%)",
          100: "hsl(84 81% 90%)",
          500: "hsl(var(--lime-green))",
          600: "hsl(84 81% 34%)",
          700: "hsl(84 81% 24%)",
        },
        // Surface colors
        'surface-1': "hsl(var(--surface-1))",
        'surface-2': "hsl(var(--surface-2))",
        'surface-3': "hsl(var(--surface-3))",
      },
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'poppins': ['Poppins', 'system-ui', 'sans-serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      fontWeight: {
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glow': '0 0 20px hsl(var(--electric-blue) / 0.5)',
        'glow-lg': '0 0 30px hsl(var(--electric-blue) / 0.6)',
        'purple-glow': '0 0 20px hsl(var(--vibrant-purple) / 0.5)',
        'green-glow': '0 0 20px hsl(var(--emerald-green) / 0.5)',
        'card-hover': '0 20px 40px -12px rgba(0, 0, 0, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'slide-in-right': 'slideInRight 0.5s ease-out forwards',
        'bounce-in': 'bounceIn 0.7s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        'pulse-ring': 'pulseRing 3s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
