// App 退出确认：在选关页按 Android 物理返回键不再直接退出 App，
// 而是先弹「确定退出吗？」确认框，由用户选择「取消」或「退出」。
// - backButton.js 在选关页首次按返回键时调用 showExitConfirm()；
// - 弹窗显示时再按返回键 = 取消（与系统对话框行为一致），调用 hideExitConfirm()；
// - App.vue 全局挂载 ExitConfirmDialog，依据 exitConfirm.show 显隐。
import { reactive } from 'vue'

export const exitConfirm = reactive({ show: false })

export function showExitConfirm() {
  exitConfirm.show = true
}

export function hideExitConfirm() {
  exitConfirm.show = false
}

export function useExitConfirm() {
  return { exitConfirm, showExitConfirm, hideExitConfirm }
}
