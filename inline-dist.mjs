import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dir = resolve(process.argv[2] || 'dist-inline')
let html = readFileSync(resolve(dir, 'index.html'), 'utf8')

html = html.replace(/<script[^>]*src="\.\/([^"]+)"[^>]*><\/script>/g, (_, p) => {
  const js = readFileSync(resolve(dir, p), 'utf8')
  return `<script type="module">\n${js}\n</script>`
})

html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g, (_, p) => {
  const css = readFileSync(resolve(dir, p), 'utf8')
  return `<style>\n${css}\n</style>`
})

writeFileSync(resolve(dir, 'single.html'), html)
console.log(dir, 'single.html bytes:', Buffer.byteLength(html))
