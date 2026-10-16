/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF5FF',
          100: '#DCEBFF',
          200: '#B9D6FE',
          500: '#2F80F0',
          600: '#1D6FE6',
          700: '#155BC4',
        },
        ink: {
          900: '#0B1930',
          700: '#334155',
          500: '#64748B',
          400: '#94A3B8',
        },
      },
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
        'inter-extrabold': ['Inter_800ExtraBold'],
        cairo: ['Cairo_400Regular'],
        'cairo-semibold': ['Cairo_600SemiBold'],
        'cairo-bold': ['Cairo_700Bold'],
        'cairo-extrabold': ['Cairo_800ExtraBold'],
      },
    },
  },
  plugins: [],
};
