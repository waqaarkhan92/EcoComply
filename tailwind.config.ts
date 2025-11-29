import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
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
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        base: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;

