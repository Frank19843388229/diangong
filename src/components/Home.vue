<template>
  <div class="hm-root">
    <section class="hm-stage">
      <div class="hm-brand">FRANK</div>

      <div class="hm-main">
        <h1 class="hm-title">低压电工<br />实操训练</h1>

        <!-- 通关进度（本地记录，无后端）：每一关是一个断路器，通关即合闸 -->
        <div class="hm-progress">
          <p class="hm-count">已通关 <b>{{ passedCount }}</b> / {{ TOTAL }}</p>
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

        <button class="hm-start" type="button" @click="goDashboard">{{ startLabel }}</button>
      </div>
    </section>

    <aside class="hm-side">
      <section class="hm-topics" aria-labelledby="hm-topics-title">
        <h2 id="hm-topics-title" class="hm-h2">训练内容</h2>
        <ul class="hm-list">
          <li v-for="t in topics" :key="t.name" class="hm-item">
            <strong>{{ t.name }}</strong>
            <span>{{ t.desc }}</span>
          </li>
        </ul>
      </section>

      <footer class="hm-foot">
        <span>进度保存在本机</span>
        <router-link to="/privacy">隐私政策</router-link>
      </footer>
    </aside>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { TOTAL } from '@/data/levels'
import { useProgressStore } from '@/stores/progress'

const router = useRouter()
const progress = useProgressStore()

const topics = [
  { name: '安全用具', desc: '绝缘手套、验电器等' },
  { name: '作业现场', desc: '围栏、标识牌、环境确认' },
  { name: '安全操作', desc: '停电、验电、挂接地线' },
  { name: '应急处置', desc: '触电急救、初期灭火' }
]

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
/*
  横屏手机：左右两栏、一屏放下。
  兼容老 WebView：只用 flex、固定 px，按屏幕高度分三档（媒体查询），
  不依赖 grid / clamp() / min() / max() / flex gap / vh 缩放。
  类名全部带 hm- 前缀，避免被项目里的全局样式（.stage、.start 之类）覆盖。
*/
.hm-root {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  box-sizing: border-box;
  min-height: 100vh;
  min-height: var(--dvh, 100vh);
  background: #f2f4fa;
  color: #0f1b3d;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'HarmonyOS Sans SC',
    'Microsoft YaHei', 'Noto Sans SC', 'Segoe UI', sans-serif;
}

/* ---------- 左：钴蓝主视觉 ---------- */
.hm-stage {
  position: relative;
  flex: 0 0 55%;
  max-width: 55%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-self: stretch;
  padding: 22px 24px 22px 28px;
  padding-left: max(28px, env(safe-area-inset-left, 0px));
  padding-bottom: max(22px, env(safe-area-inset-bottom, 0px));
  background: #1745d6;
  color: #fff;
}

.hm-brand {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.hm-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.hm-title {
  margin: 0;
  font-size: 42px;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.hm-progress {
  margin-top: 16px;
}

.hm-count {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.82);
}

.hm-count b {
  margin: 0 4px;
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
  color: #fff;
}

.hm-breakers {
  display: flex;
  flex-wrap: wrap;
  margin-top: 8px;
}

.hm-sw {
  position: relative;
  width: 16px;
  height: 28px;
  margin: 0 6px 6px 0;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.18);
  transition: background 0.25s;
}

.hm-knob {
  position: absolute;
  left: 2px;
  right: 2px;
  bottom: 2px;
  height: 11px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.55);
  transition: transform 0.25s, background 0.25s;
  transition-delay: inherit;
}

.hm-sw.hm-on {
  background: #ffd21f;
}

.hm-sw.hm-on .hm-knob {
  transform: translateY(-13px);
  background: #0d1b4c;
}

.hm-start {
  margin: 18px 0 0;
  min-width: 200px;
  min-height: 48px;
  padding: 0 36px;
  border: 0;
  border-radius: 6px;
  background: #ffd21f;
  color: #0d1b4c;
  font-family: inherit;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.06em;
  cursor: pointer;
  touch-action: manipulation;
}

.hm-start:active {
  transform: translateY(1px);
}

/* ---------- 右：训练内容 ---------- */
.hm-side {
  flex: 1 1 0;
  min-width: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 22px 28px 16px 24px;
  padding-right: max(28px, env(safe-area-inset-right, 0px));
  padding-bottom: max(16px, env(safe-area-inset-bottom, 0px));
}

.hm-topics {
  width: 100%;
  max-width: 420px;
  margin-top: auto;
  margin-bottom: auto;
}

.hm-h2 {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
  color: #4a5675;
}

.hm-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.hm-item {
  display: flex;
  align-items: baseline;
  padding: 11px 0;
  border-top: 1px solid #cdd5e6;
}

.hm-item strong {
  flex: 0 0 auto;
  margin-right: 16px;
  font-size: 18px;
  font-weight: 800;
  white-space: nowrap;
}

.hm-item span {
  font-size: 13px;
  line-height: 1.5;
  color: #4a5675;
}

.hm-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #5b6788;
}

.hm-foot a {
  padding: 6px 0;
  color: inherit;
  text-decoration: underline;
}

/* ---------- 屏幕较高（平板 / 模拟器大窗） ---------- */
@media (min-height: 500px) {
  .hm-stage { padding-top: 32px; padding-bottom: 32px; }
  .hm-title { font-size: 54px; }
  .hm-progress { margin-top: 24px; }
  .hm-count b { font-size: 40px; }
  .hm-sw { width: 18px; height: 32px; margin: 0 7px 7px 0; }
  .hm-knob { height: 13px; }
  .hm-sw.hm-on .hm-knob { transform: translateY(-15px); }
  .hm-start { margin-top: 26px; min-height: 54px; font-size: 18px; }
  .hm-side { padding-top: 32px; }
  .hm-item { padding: 16px 0; }
  .hm-item strong { font-size: 20px; }
  .hm-item span { font-size: 14px; }
}

/* ---------- 屏幕很矮（小屏手机横屏） ---------- */
@media (max-height: 340px) {
  .hm-stage { padding-top: 14px; padding-bottom: 14px; }
  .hm-title { font-size: 30px; }
  .hm-progress { margin-top: 10px; }
  .hm-count b { font-size: 26px; }
  .hm-sw { width: 14px; height: 22px; margin: 0 5px 5px 0; }
  .hm-knob { height: 9px; }
  .hm-sw.hm-on .hm-knob { transform: translateY(-9px); }
  .hm-start { margin-top: 12px; min-height: 42px; font-size: 16px; }
  .hm-side { padding-top: 14px; padding-bottom: 8px; }
  .hm-item { padding: 7px 0; }
  .hm-item strong { font-size: 15px; }
  .hm-item span { font-size: 12px; }
}

/* 万一在竖屏打开（调试 / 窄窗），退化为上下排列 */
@media (orientation: portrait) {
  .hm-root { flex-direction: column; }
  .hm-stage { flex: 0 0 auto; max-width: none; min-height: 60vh; }
}

@media (prefers-reduced-motion: reduce) {
  .hm-sw,
  .hm-knob { transition: none; }
}
</style>