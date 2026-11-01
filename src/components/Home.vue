<template>
  <div class="home">
    <div class="grid-bg" aria-hidden="true"></div>

    <main class="hero">
      <div class="brand"><i class="led"></i>FRANK</div>

      <h1>低压电工实操训练</h1>
      <p class="sub">安全用具 · 作业现场 · 安全操作 · 应急处置</p>

      <!-- 通关进度（本地记录，无后端） -->
      <div class="progress">
        <span class="plabel">已通关</span>
        <b>{{ passedCount }}</b>
        <span class="ptotal">/ {{ TOTAL }}</span>
        <span class="bar"><i :style="{ width: pct + '%' }"></i></span>
      </div>

      <button class="start" type="button" @click="goDashboard">开始训练</button>

      <router-link class="privacy" to="/privacy">隐私政策</router-link>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { TOTAL } from '@/data/levels'
import { useProgressStore } from '@/stores/progress'

const router = useRouter()
const progress = useProgressStore()

const passedCount = computed(() => Object.keys(progress.passed).length)
const pct = computed(() => (TOTAL ? Math.round((passedCount.value / TOTAL) * 100) : 0))

function goDashboard() {
  router.push('/dashboard')
}
</script>

<style scoped>
.home {
  position: relative;
  min-height: var(--dvh, 100vh);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: hidden;
  background:
    radial-gradient(1000px 520px at 18% -10%, rgba(47, 107, 255, 0.22), transparent 60%),
    radial-gradient(820px 460px at 96% 4%, rgba(56, 225, 255, 0.12), transparent 55%),
    #070c16;
  color: #e8f0ff;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC',
    'Microsoft YaHei', 'Noto Sans SC', 'Segoe UI', sans-serif;
}

/* 电路网格底纹 */
.grid-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(96, 150, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(96, 150, 255, 0.05) 1px, transparent 1px);
  background-size: 34px 34px;
}

.hero {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 720px;
  text-align: center;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.22em;
  color: #8fa3c7;
}

.brand .led {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #38e1ff;
  box-shadow: 0 0 10px #38e1ff;
  animation: led 2.4s ease-in-out infinite;
}

@keyframes led {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

h1 {
  margin: 14px 0 0;
  font-size: clamp(26px, 4.4vw, 42px);
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1.2;
  text-shadow: 0 0 26px rgba(56, 225, 255, 0.28);
}

.sub {
  margin: 10px 0 0;
  font-size: clamp(12px, 1.5vw, 15px);
  color: #8fa3c7;
  letter-spacing: 0.04em;
}

.progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 18px 0 0;
  font-variant-numeric: tabular-nums;
}

.plabel {
  font-size: 12px;
  color: #8fa3c7;
}

.progress b {
  font-size: 20px;
  font-weight: 800;
  color: #38e1ff;
  text-shadow: 0 0 12px rgba(56, 225, 255, 0.5);
}

.ptotal {
  font-size: 12px;
  color: #8fa3c7;
  margin-right: 6px;
}

.bar {
  position: relative;
  width: 120px;
  height: 5px;
  border-radius: 3px;
  background: #16233d;
  overflow: hidden;
}

.bar i {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0;
  background: linear-gradient(90deg, #2f6bff, #38e1ff);
  box-shadow: 0 0 8px rgba(56, 225, 255, 0.6);
  transition: width 0.4s ease;
}

.start {
  display: block;
  margin: 26px auto 0;
  min-width: 210px;
  padding: 15px 34px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, #2f6bff, #38e1ff);
  color: #04121f;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.08em;
  font-family: inherit;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 8px 28px rgba(47, 107, 255, 0.45), 0 0 0 1px rgba(56, 225, 255, 0.35) inset;
  transition: transform 0.15s, box-shadow 0.15s;
}

.start:hover,
.start:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 12px 34px rgba(47, 107, 255, 0.55), 0 0 0 1px rgba(56, 225, 255, 0.5) inset;
}

.start:active {
  transform: translateY(0) scale(0.985);
}

.privacy {
  display: inline-block;
  margin-top: 20px;
  color: #6b7a99;
  font-size: 12px;
  text-decoration: underline;
}

@media (max-height: 420px) {
  h1 { margin-top: 8px; }
  .sub { margin-top: 6px; }
  .progress { margin-top: 10px; }
  .start { margin-top: 16px; padding: 12px 30px; }
  .privacy { margin-top: 10px; }
}

@media (prefers-reduced-motion: reduce) {
  .brand .led { animation: none; }
  .start { transition: none; }
}
</style>
