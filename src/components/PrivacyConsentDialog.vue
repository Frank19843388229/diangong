<template>
  <div
    v-if="privacyDialogVisible"
    class="pp-mask"
    role="dialog"
    aria-modal="true"
    aria-labelledby="pp-title"
  >
    <div class="pp-box">
      <div class="pp-icon">🔒</div>
      <h2 id="pp-title">隐私政策与个人信息保护提示</h2>

      <div class="pp-body">
        <p>欢迎您使用「电工培训」！我们依据《中华人民共和国个人信息保护法》等法律法规，在您使用前向您说明本应用的个人信息处理情况，请阅读并确认：</p>
        <ul>
          <li>本应用<b>无需注册登录，不收集、不上传任何个人信息</b>；</li>
          <li>仅在<b>本设备本地</b>保存三类数据：训练进度与成绩、当前训练场次、功能设置；卸载应用或清除数据即删除；</li>
          <li>本应用<b>不读取任何传感器数据</b>（不使用陀螺仪、加速度计、位置等）；</li>
          <li>应用<b>不发起网络请求</b>，不集成任何第三方 SDK（无广告、统计分析、消息推送）；</li>
          <li>您可随时在系统「设置 → 应用 → 电工培训 → 存储」中清除全部数据。</li>
        </ul>
        <p class="pp-note">完整版《隐私政策》可在选关页底部「隐私政策」中随时查看。</p>
        <p class="pp-note">点击「同意并继续」，即表示您已阅读并同意本政策；如不同意，将无法使用本应用。</p>
        <p v-if="denied" class="pp-denied">您已选择不同意，应用无法继续使用。可关闭本页面或返回桌面。</p>
      </div>

      <div class="pp-actions">
        <button class="pp-btn" @click="disagree">不同意并退出</button>
        <button class="pp-btn primary" @click="agreePrivacy">同意并继续</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { privacyDialogVisible, agreePrivacy, initPrivacyConsent } from '@/composables/privacyConsent'

const denied = ref(false)

// 不同意：原生端退出 App；Web 端页面无法被脚本关闭时给出提示
function disagree() {
  if (Capacitor.isNativePlatform()) {
    CapApp.exitApp().catch(() => {})
    return
  }
  denied.value = true
  try { window.close() } catch (_) { /* 非脚本打开的页面会被忽略 */ }
}

// 挂载即检查（App.vue 始终挂载本组件）：
// preloadStorage 在 mount 之前完成，此时读 storage 是安全的。
initPrivacyConsent()
</script>

<style scoped>
.pp-mask {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: calc(14px + env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right))
    calc(14px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left));
  background: rgba(12, 18, 34, 0.62);
}

/* 内容高于屏幕时不裁上半截 */
.pp-box {
  width: min(100%, 420px);
  margin: auto;
  padding: 22px 18px 16px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 14px 44px rgba(10, 20, 50, 0.4);
}

.pp-icon {
  font-size: 30px;
  line-height: 1;
  margin-bottom: 6px;
}

h2 {
  margin: 0 0 10px;
  font-size: 17px;
  text-align: center;
}

.pp-body {
  max-height: min(52vh, 420px);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding: 2px 4px;
  font-size: 13.5px;
  line-height: 1.75;
  color: #333a45;
  text-align: left;
}

.pp-body p {
  margin: 6px 0;
}

.pp-body ul {
  margin: 6px 0;
  padding-left: 20px;
}

.pp-body li {
  margin: 4px 0;
}

.pp-note {
  color: #5d6370;
  font-size: 12.5px;
}

.pp-denied {
  color: #c62828;
  font-weight: 600;
}

.pp-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.pp-btn {
  flex: 1;
  min-height: 42px;
  border: 1px solid #c9d2e0;
  border-radius: 8px;
  background: #fff;
  color: #333a45;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}

.pp-btn.primary {
  border-color: #1a3fc4;
  background: #1a3fc4;
  color: #fff;
}

@media (max-width: 420px) {
  .pp-btn {
    font-size: 13px;
    min-height: 44px;
  }
}
</style>
