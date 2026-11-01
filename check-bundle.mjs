import { readFileSync } from 'node:fs'
const s = readFileSync('dist-dev-inline/single.html', 'utf8')
for (const p of ['__vueParentComponent', '__VUE_PROD_DEVTOOLS__', '__vue_app__']) {
  console.log(p, s.split(p).length - 1)
}
const i = s.indexOf('__vueParentComponent')
console.log(s.slice(i - 160, i + 80))
