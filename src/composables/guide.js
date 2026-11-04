// ================= 首次进入的操作引导 =================
// 首次启动（且已同意隐私政策）时自动弹出分步引导，教用户怎么选关、拖拽元件、
// 点端子接线、看提示和训练报告。看完/跳过后记 `guide=1`，以后不再自动弹；
// 用户仍可从首页「操作指引」随时重新打开。
import { ref } from 'vue'
import { appStorage } from '@/lib/appStorage'

const GUIDE_KEY = 'guide'

/** 引导是否显示 */
export const guideVisible = ref(false)

/** 是否已看过（看完或跳过都算） */
export function hasSeenGuide() {
  return appStorage.getItem(GUIDE_KEY) === '1'
}

/** 打开引导（首页入口 / 首次启动） */
export function openGuide() {
  guideVisible.value = true
}

/** 关闭引导并记录已看过 */
export function closeGuide() {
  guideVisible.value = false
  appStorage.setItem(GUIDE_KEY, '1')
}

/** 首次启动逻辑：没看过才自动弹（调用方需确认隐私政策已同意） */
export function maybeAutoShowGuide() {
  if (!hasSeenGuide()) guideVisible.value = true
}
