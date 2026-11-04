// 关卡考试场次：GameWrapper 进关时"开考"，各关卡组件结算时"交卷"。
// 无后端版本：开考在本机生成场次号；交卷在本机判定是否达标，
// 达标写入 progress store（localStorage 留档）。
// - 场次号/关卡号走 Pinia attempt store（Web 端 localStorage / App 端 Preferences 持久化）：
//   整页刷新不丢 —— 同一关卡的进行中场次继续用，计时不会因刷新归零。
// - toast 是纯展示态，保持模块级单例（同一时刻只会进入一个关卡）。
import { reactive } from 'vue'
import { LEVELS } from '@/data/levels.js'
import { useAttemptStore } from '@/stores/attempt.js'
import { useProgressStore } from '@/stores/progress.js'
import { useTrainingReport, resetTrainingReport, attemptStartedAt } from '@/composables/trainingReport.js'

const toast = reactive({ show: false, ok: true, msg: '', timer: null })

function showToast(ok, msg) {
  if (toast.timer) clearTimeout(toast.timer)
  toast.ok = ok
  toast.msg = msg
  toast.show = true
  toast.timer = setTimeout(() => { toast.show = false }, 4500)
}

/** 本机生成场次号：只用于区分场次，无服务端含义 */
function genAttemptId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function useLevelAttempt() {
  const attempt = useAttemptStore()
  const progress = useProgressStore()

  /** 开考（进入关卡、或每次交卷后自动重开一场，保证"重新训练"还能交卷） */
  function openAttempt(level) {
    // 新场次 = 新的一局：清掉上一局残留的错题记录
    resetTrainingReport()
    attempt.open(genAttemptId(), level)
  }

  /** 结算交卷：本地判定合格分并记录成绩；无论成功失败都重开一场，避免卡死无法再交卷 */
  function reportResult(score, details = {}) {
    if (!attempt.attemptId) return
    const meta = LEVELS.find(l => l.no === attempt.level)
    // 先把本局错题固化成报告（last_report.json + 历史记录），再重开新场次
    try {
      const { finalize } = useTrainingReport()
      finalize({
        level: attempt.level,
        score,
        attemptId: attempt.attemptId,
        startedAt: attemptStartedAt(attempt.attemptId),
        cats: details.cats,
        mistakes: details.mistakes,
        violations: details.violations,
      })
    } catch (e) {
      console.warn('[report] 生成训练报告失败', e)
    }
    if (meta && score >= meta.pass) {
      progress.markPassed(meta.no, score)
      showToast(true, `成绩已记录：${score} 分（合格线 ${meta.pass} 分）`)
    } else {
      showToast(false, `本次 ${score} 分${meta ? `，未达合格线 ${meta.pass} 分` : ''}，可重新训练`)
    }
    openAttempt(attempt.level)
  }

  return { attempt, toast, openAttempt, reportResult }
}
