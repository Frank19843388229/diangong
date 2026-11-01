<template>
  <div class="exit-mask" role="alertdialog" aria-modal="true" aria-labelledby="exit-title">
    <div class="exit-box">
      <div class="exit-icon">🚪</div>
      <h2 id="exit-title">确定退出应用吗？</h2>
      <p class="exit-tip">训练进度与成绩已保存在本设备，可随时回来继续。</p>
      <div class="exit-actions">
        <button class="btn" @click="cancel">取消</button>
        <button class="btn danger" @click="confirmExit">退出</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { hideExitConfirm } from '@/composables/exitConfirm'

function cancel() {
  hideExitConfirm()
}

// 确认退出：原生端退出 App；Web 端页面无法被脚本关闭时静默忽略
//（本弹窗正常只由原生端返回键触发，Web 端防御性处理）
function confirmExit() {
  hideExitConfirm()
  if (Capacitor.isNativePlatform()) {
    CapApp.exitApp().catch(() => {})
    return
  }
  try { window.close() } catch (_) { /* 非脚本打开的页面会被忽略 */ }
}
</script>

<style scoped>
.exit-mask {
  position: fixed;
  inset: 0;
  z-index: 10100; /* 高于隐私政策(10050)/重大失误(10000)，正常只在已同意隐私后出现 */
  display: flex;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  /* 贴边安全区（刘海屏/挖孔/手势条），index.html 已开 viewport-fit=cover */
  padding: calc(14px + env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right))
    calc(14px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left));
  background: rgba(12, 18, 34, 0.62);
}

/* margin:auto 而非 align-items:center：内容高于屏幕时不会被裁掉上半截 */
.exit-box {
  width: min(100%, 360px);
  margin: auto;
  padding: 24px 18px 18px;
  border-radius: 10px;
  background: #fff;
  text-align: center;
  box-shadow: 0 14px 44px rgba(10, 20, 50, 0.4);
}

.exit-icon {
  font-size: clamp(30px, 8vw, 36px);
  line-height: 1;
}

.exit-box h2 {
  margin: 10px 0 8px;
  font-size: clamp(17px, 4.6vw, 19px);
  color: #1c1e24;
}

.exit-tip {
  margin: 0 0 16px;
  font-size: clamp(12.5px, 3.4vw, 13.5px);
  line-height: 1.6;
  color: #7a8090;
}

.exit-actions {
  display: flex;
  gap: 10px;
}

.btn {
  flex: 1;
  min-height: 44px; /* 触摸目标不小于 44px */
  padding: 10px 18px;
  border: 1px solid #cfd6e4;
  border-radius: 6px;
  background: #f5f7fb;
  color: #2b3242;
  font-size: clamp(15px, 4vw, 16px);
  cursor: pointer;
  touch-action: manipulation;
}

.btn.danger {
  border-color: #c62828;
  background: #c62828;
  color: #fff;
}

.btn:active {
  transform: translateY(1px);
}
</style>
