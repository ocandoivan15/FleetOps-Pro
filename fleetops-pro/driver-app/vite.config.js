import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/driver/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'FleetOps Chofer',
        short_name: 'FleetOps',
        description: 'App para conductores de FleetOps Pro',
        theme_color: '#0051d5',
        background_color: '#faf9fd',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/driver/',
        icons: [
          { src: '/driver/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/driver/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    port: 5180,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
