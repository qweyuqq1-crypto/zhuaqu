
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Fix: Property 'cwd' does not exist on type 'Process' error in some environments where Node types are not globally available
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false,
      // 确保构建时不检查外部化的依赖
      rollupOptions: {
        external: [],
      }
    },
    define: {
      // 注入环境变量，解决浏览器端 process.env 不存在的问题
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.ADMIN_PASSWORD': JSON.stringify(env.ADMIN_PASSWORD || '')
    }
  }
})
