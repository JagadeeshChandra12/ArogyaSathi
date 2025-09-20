/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: '#1a1a1a',
        onyx: '#000000',
        'neon-cyan': '#000000',
        'electric-violet': '#666666',
        'clinical-white': '#ffffff',
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'counter': 'counter 2s ease-out',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #000000, 0 0 10px #000000, 0 0 15px #000000' },
          '100%': { boxShadow: '0 0 10px #000000, 0 0 20px #000000, 0 0 30px #000000' },
        },
        counter: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'neural-pattern': 'linear-gradient(45deg, transparent 30%, rgba(0, 0, 0, 0.1) 50%, transparent 70%)',
      },
    },
  },
  plugins: [],
};