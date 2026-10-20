import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { cwd } from 'node:process'
import { createMailApi } from './server/mailApi.js'

function mailApiPlugin(credentials) {
  const handler = createMailApi(credentials)
  return {
    name: 'local-mail-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), '')
  return {
    plugins: [
      react(),
      mailApiPlugin({ user: env.GMAIL_USER, password: env.GMAIL_APP_PASSWORD, appOrigin: env.APP_ORIGIN }),
    ],
  }
})
