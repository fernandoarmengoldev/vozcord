/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        dark: {
          bg: {
            primary: '#0f0f13',      // Casi negro
            secondary: '#18181d',    // Negro con tinte púrpura
            tertiary: '#1f1f26',     // Gris muy oscuro
            elevated: '#25252d',     // Elementos elevados
            hover: '#2b2b35',        // Estado hover
          },
          border: {
            subtle: '#2a2a33',       // Bordes sutiles
            default: '#35353f',      // Bordes por defecto
            strong: '#40404a',       // Bordes fuertes
          },
          text: {
            primary: '#e8e8ed',      // Texto principal
            secondary: '#b4b4c0',    // Texto secundario
            tertiary: '#8a8a99',     // Texto terciario
            muted: '#6a6a77',        // Texto apagado
          },
          accent: {
            purple: '#7c3aed',       // Acento púrpura
            'purple-light': '#8b5cf6',
            'purple-dark': '#6d28d9',
            blue: '#3b82f6',         // Acento azul
            'blue-light': '#60a5fa',
            'blue-dark': '#2563eb',
          }
        }
      },
    },
  },
  plugins: [],
}