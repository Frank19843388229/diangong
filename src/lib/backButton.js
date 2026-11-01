// Android 物理返回键（仅原生端生效，Web 端直接跳过）：
// - 「重大失误」弹窗打开时：返回键 = 点「立即返回选关」，直接回选关页；
// - 关卡内：返回键 = 关内「退出」按钮，回选关页（避免返回键退回上一关卡画面）；
// - 选关页：回落地页（不再直接弹退出）；
// - 落地页：弹「确定退出吗？」确认框，点「退出」才真正退出 App；
//   确认框打开时再按返回键 = 关闭确认框（取消退出，与系统对话框行为一致）。
// 注意：一旦注册 backButton 监听，Capacitor 的默认返回行为就交给我们接管，
// 所以上面几种情况都要显式处理，不能漏。
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { fatalExit, resetFatalExit } from '@/composables/fatalExit'
import { exitConfirm, showExitConfirm, hideExitConfirm } from '@/composables/exitConfirm'

export function setupBackButton(router) {
  if (!Capacitor.isNativePlatform()) return // 浏览器环境：不接管返回键

  CapApp.addListener('backButton', () => {
    const path = router.currentRoute.value.path

    if (exitConfirm.show) {
      // 退出确认框在最上层：返回键 = 取消退出，关闭确认框
      hideExitConfirm()
      return
    }
    if (fatalExit.show) {
      // 弹窗在最上层：返回键直接回选关页（跳过倒计时）
      go(router, '/dashboard')
      return
    }

    // 层级：关卡 → 选关 → 落地页 → 退出确认
    if (path === '/') {
      showExitConfirm()
      return
    }
    if (path === '/dashboard') {
      go(router, '/')
      return
    }
    go(router, '/dashboard')
  }).catch((e) => {
    console.warn('[backButton] 监听注册失败', e)
  })
}

function go(router, to) {
  try {
    const p = router.push(to)
    if (p && typeof p.catch === 'function') p.catch(() => { location.hash = to })
  } catch (e) {
    try {
      location.hash = to
    } catch (_) {
      resetFatalExit()
    }
  }
}
