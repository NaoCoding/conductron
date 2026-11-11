import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({ base: '/conductron/', plugins: [vue()], test: { environment: 'happy-dom' } })
