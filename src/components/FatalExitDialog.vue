<template>
  <div class="fatal-mask" role="alertdialog" aria-modal="true" aria-labelledby="fatal-title">
    <div class="fatal-box">
      <div class="fatal-icon">⚠</div>
      <h2 id="fatal-title">重大失误 · 训练终止</h2>
      <p class="fatal-reason">{{ fatalExit.reason }}</p>
      <p class="fatal-tip">本次训练已判定不合格，即将返回选关页（{{ left }} 秒）</p>
      <div class="fatal-actions">
        <button class="btn primary" @click="back">立即返回选关</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { fatalExit, resetFatalExit } from '@/composables/fatalExit'

const AUTO_SECONDS = 5 // 无操作时自动跳回 dashboard 的倒计时

const router = useRouter()
const left = ref(AUTO_SECONDS)
let timer = null

function startTimer() {
  if (timer) return
  timer = setInterval(() => {
    left.value -= 1
    if (left.value <= 0) {
      left.value = 0
      stopTimer()
      back()
    }
  }, 1000)
}

function stopTimer() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

// App 切后台（WebView 不可见）暂停倒计时，回前台再继续：
// 避免系统把 setInterval 节流到后台执行、切回来时被"突然跳转"打个措手不及。
function onVisibility() {
  if (document.hidden) stopTimer()
  else startTimer()
}

/**
 * 返回选关页（兼容 Capacitor WebView / file://）：
 * 1) 正常走 router.push（hash 路由，不依赖服务端回退）；
 * 2) history API 不可用或导航被拒 → 直接改 location.hash（不走 history API，必成功）；
 * 3) 再不行 → 整页回到入口并用 hash 定位选关页。
 * 三种方式都保证最后停在 #/dashboard，且复位弹窗状态。
 */
function back() {
  stopTimer()
  if (router.currentRoute.value.path === '/dashboard') {
    resetFatalExit()
    return
  }
  try {
    const p = router.push('/dashboard')
    if (p && typeof p.catch === 'function') p.catch(fallbackBack)
  } catch (e) {
    fallbackBack()
  }
}

function fallbackBack() {
  try {
    if (location.hash === '#/dashboard') location.reload()
    else location.hash = '/dashboard' // 兜底 1：hash 路由直接改片段，不需要 history API
  } catch (e) {
    location.href = location.pathname + location.search + '#/dashboard' // 兜底 2：整页回入口
  }
}

onMounted(() => {
  startTimer()
  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  stopTimer()
  document.removeEventListener('visibilitychange', onVisibility)
  resetFatalExit()
})
</script>

<style scoped>
.fatal-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
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
.fatal-box {
  width: min(100%, 400px);
  margin: auto;
  padding: 24px 18px 18px;
  border-radius: 10px;
  background: #fff;
  text-align: center;
  box-shadow: 0 14px 44px rgba(10, 20, 50, 0.4);
}

.fatal-icon {
  font-size: clamp(32px, 8vw, 40px);
  line-height: 1;
  color: #c62828;
}

.fatal-box h2 {
  margin: 10px 0 8px;
  font-size: clamp(17px, 4.6vw, 20px);
  color: #c62828;
}

.fatal-reason {
  margin: 0 0 10px;
  font-size: clamp(13px, 3.6vw, 14px);
  line-height: 1.6;
  color: #333a45;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.fatal-tip {
  margin: 0 0 16px;
  font-size: clamp(12px, 3.4vw, 13px);
  color: #7a8090;
}

.fatal-actions {
  display: flex;
  justify-content: center;
}

.btn {
  min-height: 44px; /* 触摸目标不小于 44px */
  padding: 10px 22px;
  border: 1px solid #cfd6e4;
  border-radius: 6px;
  background: #f5f7fb;
  color: #2b3242;
  font-size: clamp(15px, 4vw, 16px);
  cursor: pointer;
}

.btn.primary {
  border-color: #1a3fc4;
  background: #1a3fc4;
  color: #fff;
}

.btn:active {
  transform: translateY(1px);
}

/* 超高密度小屏/横屏放不下时允许缩小间距 */
@media (max-height: 460px) {
  .fatal-box {
    padding: 14px 14px 12px;
  }
  .fatal-icon {
    display: none;
  }
}
</style>
