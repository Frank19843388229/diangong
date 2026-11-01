// 通关记录（纯本地）：关卡号 → 最好成绩。
// 无后端后不再限制解锁顺序：12 关全部可进，这里只做成绩留档与选关页展示。
import { defineStore } from 'pinia'
import { appStorage } from '@/lib/appStorage.js'

export const useProgressStore = defineStore('progress', {
  state: () => ({
    passed: {}, // { [level]: bestScore }
  }),
  actions: {
    markPassed(level, score) {
      if (!(level > 0)) return
      if (score > (this.passed[level] || 0)) {
        // 整体替换对象：computed（如通关数、进度线）才能稳定侦测到变化
        this.passed = { ...this.passed, [level]: score }
      }
    },
  },
  // App 端走 Capacitor Preferences（系统级落盘，WebView 进程被杀不丢），Web 端回落 localStorage
  persist: { storage: appStorage },
})
