import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA }  from 'vite-plugin-pwa'


export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico','apple-touch-icon.png','mask-icon.svg'],
      workbox: {
    maximumFileSizeToCacheInBytes: 6 * 1024 * 1024
  },
      manifest:{
        name: 'GenMath',
        description: 'visualizador e interprete portatil de funciones analíticas evolutivas',
        theme_color: '#05296d',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'glowing-sterilize-upchuck.ngrok-free.dev' 
    ]
  }
})
