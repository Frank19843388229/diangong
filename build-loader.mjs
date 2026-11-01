import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, resolve } from 'node:path'

const dir = resolve(process.env.SRC || 'dist-inline')
const html = readFileSync(join(dir, 'single.html'), 'utf8')

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/)
const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/)
if (!styleMatch || !scriptMatch) throw new Error('inline blocks not found')

const css = styleMatch[1]
let js = scriptMatch[1]

// 资源是 new URL("xxx.jpg", import.meta.url)，blob 模块拿不到原目录，改成绝对目录
js = js.split('import.meta.url').join('"http://localhost/assets/"')

const chunksDir = join(dir, 'chunks')
rmSync(chunksDir, { recursive: true, force: true })
mkdirSync(chunksDir, { recursive: true })

const SIZE = 48 * 1024
function split(name, text) {
  const gz = gzipSync(Buffer.from(text), { level: 9 })
  let n = 0
  for (let i = 0; i < gz.length; i += SIZE) {
    writeFileSync(join(chunksDir, `${name}-${n}.bin`), gz.subarray(i, i + SIZE))
    n++
  }
  console.log(name, 'raw', Buffer.byteLength(text), 'gz', gz.length, 'parts', n)
  return n
}

const cssParts = split('css', css)
const jsParts = split('js', js)

const page = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<title>电工实训平台</title>
<style>html,body{margin:0;background:#fff}#boot{padding:24px;font:14px/1.6 sans-serif;color:#444}</style>
</head>
<body>
<div id="app"></div>
<div id="boot">正在加载实训平台…</div>
<script>
(async () => {
  const boot = document.getElementById('boot')
  async function part(prefix, i) {
    let last
    for (let t = 0; t < 40; t++) {
      try {
        const r = await fetch('/chunks/' + prefix + '-' + i + '.bin?t=' + Date.now() + '-' + t, { cache: 'no-store' })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const b = new Uint8Array(await r.arrayBuffer())
        if (b.length) return b
        throw new Error('empty')
      } catch (e) { last = e; await new Promise(r => setTimeout(r, 60)) }
    }
    throw new Error(prefix + '-' + i + ' 加载失败: ' + last)
  }
  async function load(prefix, count, type) {
    const parts = []
    for (let i = 0; i < count; i++) parts.push(await part(prefix, i))
    const total = parts.reduce((a, p) => a + p.length, 0)
    const all = new Uint8Array(total)
    let off = 0
    for (const p of parts) { all.set(p, off); off += p.length }
    const stream = new Blob([all]).stream().pipeThrough(new DecompressionStream('gzip'))
    const text = await new Response(stream).text()
    return URL.createObjectURL(new Blob([text], { type }))
  }
  const cssUrl = await load('css', ${cssParts}, 'text/css')
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = cssUrl
  document.head.appendChild(link)
  const jsUrl = await load('js', ${jsParts}, 'text/javascript')
  boot.remove()
  await import(jsUrl)
})().catch(e => {
  document.getElementById('boot').textContent = '加载失败：' + (e && e.message ? e.message : e)
})
</script>
</body>
</html>`

writeFileSync(join(dir, 'app.html'), page)
console.log('app.html bytes', Buffer.byteLength(page))
