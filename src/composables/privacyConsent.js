// ================= 首次启动隐私政策同意弹窗 =================
// 合规要求（《个人信息保护法》）：首次使用前须提示隐私政策并取得同意，
// 不同意则不可使用（原生端直接退出 App）。
// 同意记录持久化在 `privacy` 键（'1' = 已同意）：App 端走 Preferences，
// Web 端走 localStorage；清除应用数据后会重新询问。
//
// 注意：不要在模块加载时读 storage —— 原生端 Preferences 预热（preloadStorage）
// 发生在 mount 之前，模块 import 早于预热，读到的永远是空。统一在 init 时读。
import { ref } from 'vue'
import { appStorage } from '@/lib/appStorage'

const CONSENT_KEY = 'privacy'

/** 是否已同意（启动时由 initPrivacyConsent 填充） */
export const privacyAgreed = ref(false)

/** 弹窗是否显示 */
export const privacyDialogVisible = ref(false)

/** App 启动后调用：未同意则弹窗 */
export function initPrivacyConsent() {
  privacyAgreed.value = appStorage.getItem(CONSENT_KEY) === '1'
  privacyDialogVisible.value = !privacyAgreed.value
}

/** 点「同意并继续」：记录同意并关闭弹窗 */
export function agreePrivacy() {
  appStorage.setItem(CONSENT_KEY, '1')
  privacyAgreed.value = true
  privacyDialogVisible.value = false
}
