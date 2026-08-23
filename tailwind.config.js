/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta oficial Gala FNE
        gala: {
          dark: '#0B0F19',       // Fondo principal azul noche / grafito
          card: 'rgba(255, 255, 255, 0.04)', // Fondo de vidrio
          cardHover: 'rgba(255, 255, 255, 0.08)',
          border: 'rgba(255, 255, 255, 0.1)', // Borde de vidrio sutil
          gold: '#F59E0B',       // Dorado brillante para Reinas y acentos
          goldLight: '#FDE68A',  // Champagne
          goldDark: '#B45309',
          violet: '#8B5CF6',     // Violeta primaveral FNE
          fuchsia: '#EC4899',    // Fucsia primaveral FNE
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'gold-glow': '0 0 25px -5px rgba(245, 158, 11, 0.3)',
        'gold-glow-lg': '0 0 40px -5px rgba(245, 158, 11, 0.5)',
      },
      backdropBlur: {
        'glass': '16px',
      }
    },
  },
  plugins: [],
}
