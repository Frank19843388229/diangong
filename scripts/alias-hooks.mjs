// Node module resolve 钩子：把 `@/xxx` 映射到 `<repo>/src/xxx`（与 Vite 别名一致）。
// 只影响 Node 直跑的脚本（npm run check），Vite 构建/开发走自己的 alias，互不干扰。
const SRC = new URL('../src/', import.meta.url)

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    return next(new URL(specifier.slice(2), SRC).href, context)
  }
  return next(specifier, context)
}
