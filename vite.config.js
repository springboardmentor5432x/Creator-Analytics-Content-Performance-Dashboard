import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { handleYouTubeApiRequest } from './server/youtubeApi.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      react(),
      {
        name: 'youtube-api-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && (req.url.startsWith('/api/auth/youtube') || req.url.startsWith('/api/youtube'))) {
              try {
                const handled = await handleYouTubeApiRequest(req, res)
                if (handled !== false) return
              } catch (err) {
                console.error('[Vite YouTube API] Server error:', err)
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: err.message }))
                return
              }
            }
            next()
          })
        },
      },
    ],
    server: {
      host: true, // binds to 0.0.0.0 (IPv4 & IPv6 localhost)
      port: 5173,
    },
  }
})
