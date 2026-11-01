// 极简静态服务器：预览 dist/，不压缩、不使用分块编码（部分代理对 chunked+gzip 处理有 bug）。
// 用法：node scripts/static-server.mjs [port]   （默认 4174，监听 127.0.0.1）
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('../dist', import.meta.url)))
const PORT = Number(process.argv[2] || 4174)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x')
    let p = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '')
    // 截断实验端点：/gen/40000.bin（带 Content-Length）/ /gen/100000-chunked.bin（分块流）
    const gm = p.match(/^gen[\\/](\d+)(-chunked)?\.bin$/)
    if (gm) {
      const n = Number(gm[1])
      const buf = Buffer.alloc(n, 0x78)
      if (gm[2]) {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' }) // 无 Content-Length → chunked
        for (let i = 0; i < n; i += 8192) res.write(buf.subarray(i, Math.min(i + 8192, n)))
        res.end()
      } else {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': n })
        res.end(buf)
      }
      return
    }
    let file = join(ROOT, p)
    if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return }
    let st = await stat(file).catch(() => null)
    if (st?.isDirectory()) { file = join(file, 'index.html'); st = await stat(file).catch(() => null) }
    if (!st) {
      // SPA 回退（history 路由，如 /dashboard、/game/1）
      file = join(ROOT, 'index.html')
      const st2 = await stat(file).catch(() => null)
      if (!st2) { res.writeHead(404).end('not found'); return }
    }
    const buf = await readFile(file)
    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': buf.length,
      'Cache-Control': 'no-store',
      'Connection': 'close',
    })
    res.end(buf)
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(String(e))
  }
}).listen(PORT, () => {
  console.log(`static: http://localhost:${PORT}/  root=${ROOT}`)
})
