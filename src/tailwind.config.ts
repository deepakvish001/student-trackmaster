
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
        // Professional Vibrant Color Palette for Superfast Animations
        'electric-blue': {
          DEFAULT: "hsl(195 100% 60%)",
          50: "#e6f9ff",
          100: "#b3ecff", 
          200: "#80dfff",
          300: "#4dd2ff",
          400: "#1ac5ff",
          500: "hsl(195 100% 60%)",
          600: "#0099e6",
          700: "#0080cc",
          800: "#0066b3",
          900: "#004d99",
        },
        'vibrant-purple': {
          DEFAULT: "hsl(280 100% 70%)",
          50: "#f9e6ff",
          100: "#f0b3ff",
          200: "#e680ff", 
          300: "#dd4dff",
          400: "#d31aff",
          500: "hsl(280 100% 70%)",
          600: "#b300e6",
          700: "#9900cc",
          800: "#8000b3",
          900: "#660099",
        },
        'emerald-green': {
          DEFAULT: "hsl(160 100% 50%)",
          50: "#e6fff9",
          100: "#b3ffec",
          200: "#80ffdf",
          300: "#4dffd2", 
          400: "#1affc5",
          500: "hsl(160 100% 50%)",
          600: "#00e6b8",
          700: "#00cc9f",
          800: "#00b386",
          900: "#00996d",
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
        'pink-rose': {
          DEFAULT: "hsl(340 100% 65%)",
          50: "#fef1f7",
          100: "#fce8f0",
          200: "#f9d1e1",
          300: "#f5a9c7",
          400: "#f176a6",
          500: "hsl(340 100% 65%)",
          600: "#e11d74",
          700: "#be1964",
          800: "#9f1654",
          900: "#881349",
        },
        'lime-green': {
          DEFAULT: "hsl(75 100% 55%)",
          50: "#f7ffe6",
          100: "#ecffb3",
          200: "#e1ff80",
          300: "#d6ff4d",
          400: "#cbff1a",
          500: "hsl(75 100% 55%)",
          600: "#99e600",
          700: "#80cc00",
          800: "#66b300",
          900: "#4d9900",
        },
        'golden-yellow': {
          DEFAULT: "hsl(45 100% 60%)",
          50: "#fffee6",
          100: "#fffcb3",
          200: "#fff980",
          300: "#fff64d",
          400: "#fff31a",
          500: "hsl(45 100% 60%)",
          600: "#e6d400",
          700: "#ccba00",
          800: "#b3a000",
          900: "#998600",
        },
        'neon-cyan': {
          DEFAULT: "hsl(180 100% 65%)",
          50: "#e6ffff",
          100: "#b3ffff",
          200: "#80ffff",
          300: "#4dffff",
          400: "#1affff",
          500: "hsl(180 100% 65%)",
          600: "#00e6e6",
          700: "#00cccc",
          800: "#00b3b3",
          900: "#009999",
        },
        'hot-pink': {
          DEFAULT: "hsl(320 100% 70%)",
          50: "#ffe6f7",
          100: "#ffb3ec",
          200: "#ff80e1",
          300: "#ff4dd6",
          400: "#ff1acb",
          500: "hsl(320 100% 70%)",
          600: "#e600b8",
          700: "#cc009f",
          800: "#b30086",
          900: "#99006d",
        },
        'electric-violet': {
          DEFAULT: "hsl(270 100% 75%)",
          50: "#f6e6ff",
          100: "#eab3ff",
          200: "#de80ff",
          300: "#d24dff",
          400: "#c61aff",
          500: "hsl(270 100% 75%)",
          600: "#a600e6",
          700: "#8f00cc",
          800: "#7800b3",
          900: "#610099",
        },
        // Orange variants for compatibility
        'orange': {
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
        'glow': '0 0 25px hsl(25 100% 60% / 0.3)',
        'glow-lg': '0 0 40px hsl(25 100% 60% / 0.35)',
        'purple-glow': '0 0 25px hsl(280 100% 70% / 0.35)',
        'blue-glow': '0 0 25px hsl(195 100% 60% / 0.35)',
        'green-glow': '0 0 25px hsl(160 100% 50% / 0.35)',
        'pink-glow': '0 0 25px hsl(340 100% 65% / 0.35)',
        'professional': '0 12px 40px rgba(255, 140, 0, 0.18)',
        'elevated': '0 20px 60px rgba(255, 140, 0, 0.25)',
        'modern': '0 15px 50px rgba(255, 140, 0, 0.2), 0 0 30px rgba(59, 130, 246, 0.15), 0 0 15px rgba(147, 51, 234, 0.12)',
        'superfast': '0 8px 32px rgba(255, 140, 0, 0.15), 0 0 20px rgba(59, 130, 246, 0.1)',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px', 
        'md': '8px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
      },
      transitionDuration: {
        '50': '50ms',
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        'superfast': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'bounce-fast': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      backgroundImage: {
        'rainbow-gradient': 'linear-gradient(135deg, hsl(25 100% 60%), hsl(340 100% 65%), hsl(280 100% 70%), hsl(195 100% 60%))',
        'neon-gradient': 'linear-gradient(135deg, hsl(180 100% 65%), hsl(270 100% 75%))',
        'fire-gradient': 'linear-gradient(135deg, hsl(25 100% 60%), hsl(45 100% 60%), hsl(340 100% 65%))',
        'professional-gradient': 'linear-gradient(135deg, hsl(25 100% 60% / 0.05), hsl(195 100% 60% / 0.05), hsl(280 100% 70% / 0.05))',
        'animated-gradient': 'linear-gradient(270deg, hsl(25 100% 60%), hsl(340 100% 65%), hsl(280 100% 70%), hsl(195 100% 60%), hsl(160 100% 50%))',
      },
      keyframes: {
        // SUPERFAST KEYFRAMES
        'pageLoad': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px) scale(0.98)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)'
          }
        },
        'textReveal': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'fadeInUp': {
          '0%': {
            opacity: '0',
            transform: 'translateY(15px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'slideInRight': {
          '0%': {
            opacity: '0',
            transform: 'translateX(30px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        'slideInLeft': {
          '0%': {
            opacity: '0',
            transform: 'translateX(-30px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        'scaleIn': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.9)'
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)'
          }
        },
        'pulseGlow': {
          '0%, 100%': {
            boxShadow: '0 0 15px hsl(25 100% 60% / 0.3)'
          },
          '50%': {
            boxShadow: '0 0 30px hsl(25 100% 60% / 0.6)'
          }
        },
        'shimmerFast': {
          '0%': {
            backgroundPosition: '-200% 0'
          },
          '100%': {
            backgroundPosition: '200% 0'
          }
        },
        'rainbowShift': {
          '0%': { filter: 'hue-rotate(0deg)' },
          '25%': { filter: 'hue-rotate(90deg)' },
          '50%': { filter: 'hue-rotate(180deg)' },
          '75%': { filter: 'hue-rotate(270deg)' },
          '100%': { filter: 'hue-rotate(360deg)' }
        },
        'floatUp': {
          '0%': {
            transform: 'translateY(0px)'
          },
          '50%': {
            transform: 'translateY(-5px)'
          },
          '100%': {
            transform: 'translateY(0px)'
          }
        },
        'backgroundPulse': {
          '0%, 100%': { 
            backgroundSize: '100% 100%, 100% 100%, 100% 100%'
          },
          '50%': { 
            backgroundSize: '120% 120%, 120% 120%, 120% 120%'
          }
        },
        'codeGlow': {
          '0%, 100%': {
            boxShadow: '0 0 5px hsl(270 100% 75% / 0.2)'
          },
          '50%': {
            boxShadow: '0 0 15px hsl(270 100% 75% / 0.4)'
          }
        }
      },
      animation: {
        // SUPERFAST ANIMATIONS
        'page-load': 'pageLoad 0.6s ease-out forwards',
        'text-reveal': 'textReveal 0.4s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
        'slide-in-right': 'slideInRight 0.5s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer-fast': 'shimmerFast 0.8s ease-in-out infinite',
        'rainbow-shift': 'rainbowShift 4s ease-in-out infinite',
        'float-up': 'floatUp 3s ease-in-out infinite',
        'background-pulse': 'backgroundPulse 8s ease-in-out infinite',
        'code-glow': 'codeGlow 2s ease-in-out infinite',
        // Combined superfast animations
        'super-enter': 'fadeInUp 0.3s ease-out, scaleIn 0.2s ease-out',
        'super-hover': 'pulseGlow 1s ease-in-out infinite',
        'card-enter': 'slideInRight 0.6s ease-out forwards, scaleIn 0.4s ease-out forwards',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
