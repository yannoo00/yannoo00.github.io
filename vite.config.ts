import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { contentPlugin } from './build/content-plugin.ts'

export default defineConfig({
  plugins: [react(), contentPlugin()],
  // 이 기기에서는 IPv6 루프백(::1)으로 접속이 되지 않아 IPv4 주소에 고정한다
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
})
