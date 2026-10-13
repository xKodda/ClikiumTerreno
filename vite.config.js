import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'Clikium Terreno',
        short_name: 'Clikium',
        description: 'Control de Obra y Registro de Terreno',
        theme_color: '#252a31',
        icons: [
          {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='9' fill='%23252a31'/%3E%3Cpath d='M28 12H13v16h15M20 20h10' fill='none' stroke='%234f6ef7' stroke-width='4'/%3E%3C/svg%3E",
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
});
