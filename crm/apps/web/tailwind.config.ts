import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'sans-serif'],
      },
      colors: {
        // پالت صنعتی HVAC: سرمه‌ای/فولادی + لهجه‌ی نارنجی (شعله/گرمایش)
        steel: {
          50: '#f5f7fa',
          100: '#e9eef5',
          200: '#cdd9e8',
          300: '#a6bbd4',
          400: '#7794ba',
          500: '#5474a1',
          600: '#415c85',
          700: '#364a6c',
          800: '#2f3f5b',
          900: '#1e2a3d',
          950: '#131b29',
        },
        flame: {
          50: '#fff7ed',
          100: '#ffedd5',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(19,27,41,0.08), 0 1px 2px rgba(19,27,41,0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
