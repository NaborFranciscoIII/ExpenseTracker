import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 👇 Add this block to prevent Vite from looking inside Tauri's build folder
  server: {
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },

  assetsInclude: ['**/*.svg', '**/*.csv'],
})

export const formatPHP = (value: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: '₱',
  }).format(value);
};