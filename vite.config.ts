
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载当前目录下的所有环境变量
  // 第三个参数 '' 表示加载所有变量，而不只是 VITE_ 开头的
  // Fix: Cast process to any to resolve 'cwd' property error in environments where standard Node types are missing
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false, // 生产环境关闭 sourcemap 防止密码泄露
    },
    define: {
      // 显式注入，优先取环境中的变量
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.ADMIN_PASSWORD': JSON.stringify(env.ADMIN_PASSWORD || '')
    }
  }
})
