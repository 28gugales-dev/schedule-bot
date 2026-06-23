import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Mirrors the product app: Tailwind v4 as a Vite plugin.
// dedupe + optimizeDeps.include fix the @gsap/react + react-three-fiber
// "duplicate React / Invalid hook call" crash: pre-bundle all heavy deps at
// server start (so there's no mid-render re-optimize + reload), and force a
// single React/React-DOM copy so useGSAP/useRef never resolves a null React.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5180 },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'gsap',
      '@gsap/react',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
    ],
  },
})
