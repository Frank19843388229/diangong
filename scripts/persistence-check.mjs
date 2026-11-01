// Pinia 持久化链路的运行时自检（不依赖浏览器）：npm run check
// 验证 4 件事：
//   1. 插件真的注册了 —— 状态变更写入 localStorage（防"persist 配了没生效"的静默失败）
//   2. 模拟刷新：重建 pinia 后状态从 storage 水合回来（考试场次 + 通关记录都不丢）
//   3. 通关记录只留最好成绩：低分不覆盖高分
//   4. clear() 结束场次后同步写回 storage（App 进程被杀 / 关掉标签页都不会残留脏场次）
//
// 注意：装配顺序必须和 src/main.js 一致 —— pinia.use() 挂的插件要等
// app.use(pinia)（install）才会进 _p 生效，直接 setActivePinia 不够。
import { createApp, nextTick } from 'vue'

function makeStorage() {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    clear: () => m.clear(),
  }
}

globalThis.localStorage = makeStorage()
globalThis.sessionStorage = makeStorage()
// 插件默认存储取的是 window.localStorage（浏览器恒有），Node 下补上浏览器全局
globalThis.window = globalThis

const { createPinia } = await import('pinia')
const persisted = (await import('pinia-plugin-persistedstate')).default
const { useAttemptStore } = await import('../src/stores/attempt.js')
const { useProgressStore } = await import('../src/stores/progress.js')

let failed = 0
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`  [PASS] ${name}`)
  } else {
    failed++
    console.log(`  [FAIL] ${name} ${detail}`)
  }
}

/** 模拟一次"页面加载"：与 src/main.js 相同的装配顺序（pinia.use → app.use） */
function freshPage() {
  const app = createApp({ render: () => null })
  const pinia = createPinia()
  pinia.use(persisted)
  app.use(pinia) // install：设 active pinia + 把待装插件推入 _p
}

// ---- 1. 开场次 + 通关 → 写入 storage ----
freshPage()
const attempt1 = useAttemptStore()
const progress1 = useProgressStore()
attempt1.open('att-42', 3)
progress1.markPassed(3, 86)
await nextTick() // $subscribe 走 Vue 调度器（flush: 'pre'），写入是异步的

const attemptPersisted = JSON.parse(localStorage.getItem('attempt') || 'null')
const progressPersisted = JSON.parse(localStorage.getItem('progress') || 'null')
// v4 的序列化格式：直接平铺 state，不带 {"state":...} 包装
check('场次写入 localStorage.attempt', attemptPersisted?.attemptId === 'att-42', JSON.stringify(attemptPersisted))
check('场次关卡号写入', attemptPersisted?.level === 3, JSON.stringify(attemptPersisted))
check('通关记录写入 localStorage.progress', progressPersisted?.passed?.[3] === 86, JSON.stringify(progressPersisted))

// ---- 2. 通关记录只留最好成绩 ----
progress1.markPassed(3, 70)
await nextTick()
check('低分不覆盖最好成绩', progress1.passed[3] === 86, `got=${progress1.passed[3]}`)
check('低分也未写坏 storage', JSON.parse(localStorage.getItem('progress'))?.passed?.[3] === 86)

// ---- 3. 模拟整页刷新：重新装配 → 水合 ----
freshPage()
const attempt2 = useAttemptStore()
const progress2 = useProgressStore()
await nextTick() // 水合若走调度器，等一拍再断言
check('刷新后场次号不丢', attempt2.attemptId === 'att-42', `got=${attempt2.attemptId}`)
check('刷新后场次关卡号不丢', attempt2.level === 3, `got=${attempt2.level}`)
check('刷新后通关记录不丢', progress2.passed[3] === 86, `got=${JSON.stringify(progress2.passed)}`)

// ---- 4. 结束场次 → 同步写回 storage ----
attempt2.clear()
await nextTick()
check('clear 后场次清空', attempt2.attemptId === null && attempt2.level === 0)
check('clear 持久化到 storage', JSON.parse(localStorage.getItem('attempt'))?.attemptId === null)
check('clear 不影响通关记录', JSON.parse(localStorage.getItem('progress'))?.passed?.[3] === 86)

console.log(failed === 0 ? '\n===== 全部通过 =====' : `\n===== ${failed} 项失败 =====`)
process.exit(failed === 0 ? 0 : 1)
