// 让 Node 也能解析 Vite 的 `@/` 别名（等价于 vite.config.js 里 alias '@' → src/）。
// 用法（package.json）：node --import ./scripts/alias-register.mjs scripts/persistence-check.mjs
import { register } from 'node:module'

register('./alias-hooks.mjs', import.meta.url)
