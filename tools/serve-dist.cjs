// 极简静态服务器：用于本地预览 dist/（避免 vite preview 的分块传输问题）
const http = require('http')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const root = path.resolve(__dirname, '..', 'dist')
const port = Number(process.argv[2] || 4174)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

http.createServer((req, res) => {
  try {
    const url = decodeURIComponent(req.url.split('?')[0])
    let file = path.join(root, url)
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(root, 'index.html') // SPA fallback
    }
    const ext = path.extname(file)
    const raw = fs.readFileSync(file)
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'close',
    }
    const accept = String(req.headers['accept-encoding'] || '')
    const canGzip = /\bgzip\b/.test(accept) && ['.js', '.css', '.html', '.json'].includes(ext)
    if (canGzip) {
      const body = zlib.gzipSync(raw)
      headers['Content-Encoding'] = 'gzip'
      headers['Content-Length'] = body.length
      res.writeHead(200, headers)
      res.end(body)
    } else {
      headers['Content-Length'] = raw.length
      res.writeHead(200, headers)
      res.end(raw)
    }
  } catch (e) {
    res.writeHead(500); res.end(String(e))
  }
}).listen(port, '0.0.0.0', () => console.log('serving dist on http://localhost:' + port))
