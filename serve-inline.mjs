import http from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { extname, join, normalize } from 'node:path'

const root = process.env.ROOT || 'E:/diangong/fe/dist-inline'
const html = readFileSync(join(root, 'app.html'))
console.log('app html', html.length)

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0])
  if (url === '/' || url === '/index.html' || !existsSync(join(root, normalize(url)))) {
    res.writeHead(200, {
      'Content-Type': types['.html'],
      'Content-Length': html.length,
      'Cache-Control': 'no-store',
      Connection: 'close',
    })
    res.end(html)
    return
  }
  const p = join(root, normalize(url))
  if (!statSync(p).isFile()) {
    res.writeHead(404); res.end(); return
  }
  const buf = readFileSync(p)
  res.writeHead(200, {
    'Content-Type': types[extname(p).toLowerCase()] || 'application/octet-stream',
    'Content-Length': buf.length,
    'Cache-Control': 'no-store',
    Connection: 'close',
  })
  res.end(buf)
})
server.listen(80, () => console.log('listening 80'))
