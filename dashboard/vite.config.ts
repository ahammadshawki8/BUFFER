import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Relative base so the same build works at any path (GitHub Pages serves it under /BUFFER/).
export default defineConfig({
  base: './',
  plugins: [react()],
})
