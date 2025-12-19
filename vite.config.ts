
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    // 定义全局常量替换，使 process.env 在前端代码中可用
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.ADMIN_PASSWORD': JSON.stringify(env.ADMIN_PASSWORD || '')
    }
  }
})
