import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Brand + Authority - EcoComply Deep Forest Green
        primary: {
          50: '#f0f7f5',
          100: '#d9ede7',
          200: '#b3dbd0',
          300: '#8dc9b8',
          400: '#67b7a1',
          500: '#104B3A',
          600: '#0B372A',
          700: '#082820',
          800: '#051a16',
          900: '#020c0b',
          DEFAULT: '#104B3A',
          dark: '#0B372A',
          light: '#94B49F',
        },
        // Primary CTA + Trust - Royal Blue
        cta: {
          primary: '#0056A6',
          'primary-hover': '#004D95',
        },
        // Enterprise Neutrals
        charcoal: {
          DEFAULT: '#101314',
        },
        slate: {
          DEFAULT: '#E2E6E7',
        },
        // Border Gray for dark backgrounds (from spec)
        'border-gray': {
          DEFAULT: '#374151',
        },
        // Input border color (from spec - #E2E6E7)
        'input-border': {
          DEFAULT: '#E2E6E7',
        },
        // Compliance Semantic Colors
        success: {
          DEFAULT: '#2E7D32',
        },
        warning: {
          DEFAULT: '#D4A017',
        },
        danger: {
          DEFAULT: '#C44536',
        },
        // Text Colors
        text: {
          primary: '#101314',
          secondary: '#6B7280',
          tertiary: '#9CA3AF',
          disabled: '#D1D5DB',
        },
        // Background Colors
        background: {
          primary: '#FFFFFF',
          secondary: '#E2E6E7',
          tertiary: '#F9FAFB',
          dark: '#101314',
        },
        // Info color (uses primary-light)
        info: {
          DEFAULT: '#94B49F',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        // Display sizes - Hero headlines
        'display-2xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }], // 72px
        'display-xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }], // 60px
        'display-lg': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],    // 48px

        // Heading sizes - Page/section titles
        'heading-xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],  // 36px
        'heading-lg': ['1.875rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }], // 30px
        'heading-md': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.005em', fontWeight: '600' }],   // 24px
        'heading-sm': ['1.25rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],         // 20px
        'heading-xs': ['1.125rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],        // 18px

        // Body text sizes
        'body-xl': ['1.125rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],   // 18px
        'body-lg': ['1rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],       // 16px (default)
        'body-md': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],   // 14px
        'body-sm': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],  // 13px
        'body-xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],    // 12px

        // Label/UI text sizes
        'label-lg': ['0.875rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '500' }],  // 14px
        'label-md': ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '500' }], // 13px
        'label-sm': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '500' }], // 12px
        'label-xs': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }], // 11px

        // Code/monospace sizes
        'code-lg': ['0.875rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400', fontFamily: 'monospace' }],
        'code-md': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400', fontFamily: 'monospace' }],
        'code-sm': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400', fontFamily: 'monospace' }],
      },
      spacing: {
        // 4px base unit
        '0.5': '2px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      borderRadius: {
        sm: '2px',
        base: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        full: '9999px',
      },
      boxShadow: {
        // Original shadows
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        base: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',

        // World-class elevation system
        'card': '0px 1px 3px rgba(0, 0, 0, 0.05), 0px 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0px 4px 8px rgba(0, 0, 0, 0.08), 0px 2px 4px rgba(0, 0, 0, 0.06)',
        'float': '0px 12px 24px rgba(0, 0, 0, 0.12), 0px 4px 8px rgba(0, 0, 0, 0.08)',
        'modal': '0px 24px 48px rgba(0, 0, 0, 0.16), 0px 8px 16px rgba(0, 0, 0, 0.10)',
        'primary-glow': '0px 4px 16px rgba(16, 75, 58, 0.24)',
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

