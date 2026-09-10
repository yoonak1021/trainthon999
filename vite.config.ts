import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Default `/` for Vercel. GitHub Pages sets VITE_BASE=/trainthon999/
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
})
