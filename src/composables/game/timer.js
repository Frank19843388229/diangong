// 计时器管理 - 从各关卡文件中提取的公共逻辑
import { onUnmounted } from 'vue'

export function useTimer(onComplete) {
  let runId = 0
  const timers = []
  const ivs = []
  
  function later(fn, ms) {
    const id = runId
    const t = setTimeout(() => { if (id === runId) fn() }, ms)
    timers.push(t)
    return t
  }
  
  function setInterval_(fn, ms) {
    const id = setInterval(fn, ms)
    ivs.push(id)
    return id
  }
  
  function clearAll() {
    timers.forEach(t => clearTimeout(t))
    ivs.forEach(iv => clearInterval(iv))
    timers.length = 0
    ivs.length = 0
    runId++
  }
  
  function reset() {
    clearAll()
    runId = 0
  }
  
  onUnmounted(clearAll)
  
  return { later, setInterval: setInterval_, clearAll, reset }
}
