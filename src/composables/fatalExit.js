// 重大违规退出：任一关卡判定「重大违规 / 重大安全违规 / 一票否决」时，
// 由关卡组件调用 triggerFatalExit(reason)，GameWrapper 上挂载的 FatalExitDialog
// 弹窗提示违规原因，随后跳回选关页（/dashboard）。
// - 状态保持模块级单例：同一时刻只会进入一个关卡。
// - 弹窗组件卸载时（返回选关或离开关卡）调用 resetFatalExit 复位，
//   避免下次进关还残留上一局的弹窗。
import { reactive } from 'vue'

export const fatalExit = reactive({ show: false, reason: '' })

/** 触发「重大失误 → 弹窗返回选关」；重复触发（弹窗已出）时忽略 */
export function triggerFatalExit(reason) {
  if (fatalExit.show) return
  fatalExit.reason = reason || '发生重大安全违规'
  fatalExit.show = true
}

/** 复位弹窗（关卡卸载 / 跳转完成后调用） */
export function resetFatalExit() {
  fatalExit.show = false
  fatalExit.reason = ''
}

export function useFatalExit() {
  return { fatalExit, triggerFatalExit, resetFatalExit }
}
