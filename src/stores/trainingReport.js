// 训练报告（错题本）持久化：最近一次结算的完整报告 + 最近若干次历史。
// 无后端：本机留档。除 Pinia 持久化外，额外写一份 last_report.json，
// 方便用户直接查看/拷走（Web 端 localStorage，App 端 Preferences）。
import { defineStore } from 'pinia'
import { appStorage } from '@/lib/appStorage.js'

export const useTrainingReportStore = defineStore('trainingReport', {
  state: () => ({
    last: null, // 最近一次训练报告
    history: [], // 最近 20 次报告（新的在前）
  }),
  actions: {
    save(report) {
      if (!report) return
      this.last = report
      this.history = [report, ...this.history.filter(r => r && r.id !== report.id)].slice(0, 20)
      try {
        appStorage.setItem('last_report.json', JSON.stringify(report, null, 2))
      } catch (e) {
        console.warn('[report] 写入 last_report.json 失败', e)
      }
    },
  },
  persist: { storage: appStorage },
})
