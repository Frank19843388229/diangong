// 消息提示管理 - 从各关卡文件中提取的公共逻辑
import { ref, onUnmounted } from 'vue'

/**
 * @param {{ onShow?: (text: string) => void, duration?: number }} [hooks] 可选钩子与提示时长
 */
export function useMessage(hooks = {}) {
  const msgText = ref('')
  const msgType = ref('')
  let msgTimer = null

  function showMsg(text, type = 'info') {
    if (hooks.onShow) hooks.onShow(text)
    msgText.value = text
    msgType.value = type
    clearTimeout(msgTimer)
    msgTimer = setTimeout(() => { msgType.value = '' }, hooks.duration ?? 2600)
  }

  onUnmounted(() => { clearTimeout(msgTimer) })

  return { msgText, msgType, showMsg }
}
