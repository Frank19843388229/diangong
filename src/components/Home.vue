<template>
  <div class="hm-root">
    <section class="hm-stage">
      <div class="hm-brand">
        <i class="hm-brand-mark"></i>
        <span>FRANK</span>
        <small>LOW VOLTAGE TRAINING</small>
      </div>

      <div class="hm-main">
        <div class="hm-kicker">ELECTRICAL PRACTICAL SYSTEM <span> / 2026</span></div>
        <h1 class="hm-title">低压电工<br /><em>实操训练</em></h1>

        <div class="hm-progress">
          <div class="hm-progress-head">
            <p class="hm-count">训练进度</p>
            <p class="hm-number"><b>{{ passedCount }}</b><span>/ {{ TOTAL }} 已通关</span></p>
          </div>
          <div class="hm-breakers" aria-hidden="true">
            <span
              v-for="n in TOTAL"
              :key="n"
              class="hm-sw"
              :class="{ 'hm-on': ready && n <= passedCount }"
              :style="{ transitionDelay: 300 + (n - 1) * 70 + 'ms' }"
            ><span class="hm-knob"></span></span>
          </div>
        </div>

        <!-- 操作区：左侧是开始按钮，右侧是本地存储和隐私政策 -->
        <div class="hm-actions">
          <button class="hm-start" type="button" @click="goDashboard">
            <span>{{ startLabel }}</span>
            <b aria-hidden="true">→</b>
          </button>
          
          <div class="hm-meta">
            <span class="hm-local"><i></i> 进度保存在本机</span>
            <button class="hm-privacy hm-guide" type="button" @click="openGuide">操作指引 <b>?</b></button>
            <router-link to="/privacy" class="hm-privacy">隐私政策 <b>↗</b></router-link>
          </div>
        </div>
      </div>

      <div class="hm-stage-foot">
        <span>SAFETY · STANDARD · PRACTICE</span>
        <span>01 / TRAINING</span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { TOTAL } from '@/data/levels'
import { useProgressStore } from '@/stores/progress'
import { openGuide } from '@/composables/guide'

const router = useRouter()
const progress = useProgressStore()

const passedCount = computed(() => Object.keys(progress.passed).length)

const startLabel = computed(() => {
  if (TOTAL > 0 && passedCount.value >= TOTAL) return '再练一遍'
  return passedCount.value > 0 ? '继续训练' : '开始训练'
})

// 页面载入后依次合闸，只做这一次动效
const ready = ref(false)
onMounted(() => setTimeout(() => { ready.value = true }, 50))

function goDashboard() {
  router.push('/dashboard')
}
</script>

<style scoped>
/* =========================================================
   横屏 APK · 纯净单栏宽屏版（一屏展示，不滚动）
   ========================================================= */
.hm-root {
  --bg: #111416;
  --panel-border: #343d3f;
  --orange: #f39a32;
  --green: #63c58a;
  --ink: #f0f2ef;
  --sub: #9da8a5;
  --muted: #687471;

  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  height: 100vh;
  display: flex;
  flex-direction: column;
  
  background:
    radial-gradient(ellipse at 50% -35%, rgba(243,154,50,.09), transparent 55%),
    var(--bg);
  color: var(--ink);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC",
    "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 14px;
  line-height: 1.45;
}

.hm-root::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: .22;
  background-image:
    linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
  background-size: 32px 32px;
}

/* =========================================================
   主体容器：充满全屏，自动居中
   ========================================================= */
.hm-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 24px 40px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.hm-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: .12em;
}

.hm-brand-mark {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: var(--orange);
  box-shadow: 0 0 10px rgba(243,154,50,.45);
}

.hm-brand small {
  color: var(--muted);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: .16em;
}

/* 中间核心区：垂直居中 */
.hm-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 32px;
  min-width: 0;
  padding: 20px 0;
}

.hm-kicker {
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .18em;
}
.hm-kicker span { color: var(--orange); }

.hm-title {
  margin: 0;
  font-size: clamp(36px, 5vw, 64px);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: .02em;
}
.hm-title em {
  color: var(--orange);
  font-style: normal;
}

/* 进度条卡片 */
.hm-progress {
  width: 100%;
  padding: 18px 20px;
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  background: linear-gradient(145deg, rgba(34,41,43,.96), rgba(25,30,32,.96));
}

.hm-progress-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.hm-count {
  margin: 0;
  color: var(--sub);
  font-size: 13px;
  letter-spacing: .06em;
}

.hm-number {
  margin: 0;
  color: var(--sub);
  font-size: 13px;
}
.hm-number b {
  color: var(--orange);
  font-size: 26px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

/* 开关矩阵 */
.hm-breakers {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
}

.hm-sw {
  position: relative;
  flex: 1;
  height: 44px;
  max-width: 48px;
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  background: #252d2f;
  transition: background .25s, border-color .25s;
}

.hm-knob {
  position: absolute;
  left: 50%;
  bottom: 5px;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  background: #59615f;
  transform: translateX(-50%);
  transition: transform .25s, background .25s;
}

.hm-sw.hm-on {
  border-color: rgba(99,197,138,.45);
  background: rgba(99,197,138,.12);
}
.hm-sw.hm-on .hm-knob {
  background: var(--green);
  transform: translate(-50%, -20px);
  box-shadow: 0 0 10px rgba(99,197,138,.6);
}

/* 操作区（按钮 + 隐私协议） */
.hm-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap; /* 小屏自动换行 */
}

.hm-start {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 40px;
  border: 0;
  border-radius: 8px;
  background: var(--orange);
  color: #191b1b;
  font: inherit;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: .06em;
  cursor: pointer;
  transition: transform .12s, box-shadow .15s;
}

.hm-start:hover { box-shadow: 0 8px 24px rgba(243,154,50,.35); }
.hm-start:active { transform: scale(.97); }
.hm-start:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.hm-start b { font-size: 20px; line-height: 1; }

/* 右侧隐私与本地状态 */
.hm-meta {
  display: flex;
  align-items: center;
  gap: 20px;
  color: var(--muted);
  font-size: 12px;
}

.hm-local {
  display: flex;
  align-items: center;
}

.hm-local i {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 6px;
  border-radius: 50%;
  background: var(--green);
}

.hm-privacy {
  color: var(--sub);
  text-decoration: none;
  transition: color .2s;
}
.hm-privacy:hover { color: var(--orange); }
.hm-privacy b {
  color: var(--orange);
  font-size: 13px;
}

/* 「操作指引」是可点按钮，去掉浏览器默认按钮样式 */
button.hm-guide {
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  touch-action: manipulation;
}

/* 底部文字 */
.hm-stage-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--panel-border);
  color: var(--muted);
  font-size: 11px;
  letter-spacing: .16em;
}

/* =========================================================
   小屏适配（防挤压）
   ========================================================= */
@media (max-height: 520px) {
  .hm-stage { padding: 16px 24px; }
  .hm-main { gap: 20px; padding: 10px 0; }
  .hm-title { font-size: 32px; }
  .hm-progress { padding: 12px; }
  .hm-sw { height: 36px; }
  .hm-sw.hm-on .hm-knob { transform: translate(-50%, -15px); }
  .hm-start { padding: 12px 24px; font-size: 15px; }
  .hm-kicker, .hm-brand small { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
</style>