// 计分系统 - 从各关卡文件中提取的公共逻辑
import { reactive, ref, computed } from 'vue'
import { useMessage } from './message.js'

/**
 * @param {Record<string,{got:number,max:number}>} categories
 * @param {{ onPenalize?: (cat: string, n: number) => void, msgHooks?: object }} [hooks] 可选钩子
 * @param {(text: string, type?: string) => void} [externalShowMsg] 外部消息提示
 */
export function useScore(categories, hooks = {}, externalShowMsg) {
  const cats = reactive(categories)
  const mistakes = ref(0)
  const total = computed(() => Object.values(cats).reduce((a, c) => a + c.got, 0))

  const showMsg = externalShowMsg || useMessage(hooks.msgHooks).showMsg

  function addScore(cat, n) {
    cats[cat].got = Math.min(cats[cat].max, cats[cat].got + n)
  }

  function penalize(cat, n) {
    cats[cat].got = Math.max(0, cats[cat].got - n)
    mistakes.value++
    if (hooks.onPenalize) hooks.onPenalize(cat, n)
  }

  function completePhase(cat, pts) {
    addScore(cat, pts)
    showMsg(`✔ 阶段完成　+${pts} 分`, 'good')
  }
  
  const stars = computed(() => total.value >= 90 ? 5 : total.value >= 80 ? 4 : total.value >= 70 ? 3 : total.value >= 60 ? 2 : 1)

  const verdict = computed(() => {
    const t = total.value
    if (t >= 90) return '操作熟练，安全意识优秀'
    if (t >= 80) return '符合规范，可独立完成作业'
    if (t >= 60) return '基本掌握操作流程，注意安全细节'
    return '存在安全风险，建议重新训练'
  })
  
  return { cats, mistakes, total, addScore, penalize, completePhase, stars, verdict }
}
