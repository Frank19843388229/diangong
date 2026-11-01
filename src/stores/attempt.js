// 关卡考试场次的可持久化部分（场次号 / 关卡号）。
// 无后端：场次号由本机生成，仅用于"刷新不重开、计时不归零"的场次标识。
// 必须用持久化存储（App 走 Preferences / Web 走 localStorage），不能用 sessionStorage：
//   Android WebView 的 sessionStorage 随进程销毁即清零，进程被系统回收后恢复时
//   attemptId 为 null，levelAttempt.reportResult 会第一行静默 return → 交卷无效、成绩不记。
// toast 属于纯展示态，不进 store，留在 composables/levelAttempt.js。
import { defineStore } from 'pinia'
import { appStorage } from '@/lib/appStorage.js'

export const useAttemptStore = defineStore('attempt', {
  state: () => ({
    attemptId: null,
    level: 0,
  }),
  actions: {
    open(attemptId, level) {
      this.attemptId = attemptId
      this.level = level
    },
    clear() {
      this.attemptId = null
      this.level = 0
    },
  },
  persist: { storage: appStorage },
})
