<template>
  <div class="page">
    <div class="wrap">
      <!-- 顶栏：品牌 + 通关计数 -->
      <header class="top">
        <div class="brand"><i class="led"></i><span class="brand-main">ELECTRICAL</span><span class="brand-sub">TRAINING SYSTEM</span></div>
        <div class="top-side">
          <button class="guide-link" type="button" @click="openGuide">操作指引</button>
          <p class="ptext">已通关 <b>{{ passedCount }}</b><i>/{{ TOTAL }}</i></p>
        </div>
      </header>

      <!-- 标题 + 通电进度线 -->
      <section class="intro">
        <div class="intro-head">
          <h1>实训任务</h1>
          <p class="hint">LOW VOLTAGE · PRACTICAL TRAINING</p>
        </div>

        <!-- 通电进度线：通过哪一关，线就亮到哪一关 -->
        <div class="rail" aria-hidden="true">
          <template v-for="i in TOTAL" :key="i">
            <span
              class="node"
              :class="{ lit: passedSet.has(i), now: i === firstUnpassed }"
            ></span>
            <span
              v-if="i < TOTAL"
              class="seg"
              :class="{ lit: i < firstUnpassed }"
              :style="{ '--i': i }"
            ><i></i></span>
          </template>
        </div>
      </section>

      <!-- 上次训练报告：入口放顶栏，详情走独立路由 /report（横屏全屏时大卡片会挡住关卡列表） -->
      <router-link
        v-if="lastReport"
        to="/report"
        class="report-link"
        :aria-label="`上次训练报告：${lastReport.code} ${lastReport.title}`"
      >
        <b>上次训练报告</b>
        <span>{{ lastReport.code }} {{ lastReport.title }} · {{ lastReport.aborted ? '重大违规中止' : `${lastReport.score} 分 · ${lastReport.passed ? '已合格' : '未合格'}` }}</span>
        <i>查看 ›</i>
      </router-link>

      <!-- 关卡：按科目分组 -->
      <div class="groups">
        <section v-for="g in GROUPED" :key="g.key" class="group">
          <h2 class="group-title">
            <em>{{ g.name }}</em><span>{{ g.desc }}</span>
          </h2>

          <div class="grid">
            <template v-for="lv in g.items" :key="lv.no">
              <!-- 待上线占位 -->
              <div v-if="lv.pending" class="card pending" aria-disabled="true">
                <span class="title">{{ lv.title }}</span>
                <span class="meta">
                  <span class="state">待上线</span>
                </span>
              </div>

              <!-- 可进入：无后端后全部关卡直接解锁 -->
              <router-link
                v-else
                :to="{ name: 'GamePlay', params: { level: lv.no } }"
                class="card"
                :class="isPassed(lv.no) ? 'done' : 'current'"
                :aria-label="`第${lv.no}关 ${lv.title}，${isPassed(lv.no) ? '已通关，可重练' : '进入训练'}`"
              >
                <span class="title">{{ lv.title }}</span>
                <span class="meta">
                  <span class="score">{{ lv.score }}分 · 合格{{ lv.pass }}</span>
                  <span class="state">
                    {{ isPassed(lv.no) ? `已通关 · ${progress.passed[lv.no]} 分` : '进入训练' }}
                  </span>
                </span>
              </router-link>
            </template>
          </div>
        </section>
      </div>
    </div>

    <!-- 底部：隐私政策入口（合规要求，应用内可直接查看） -->
    <footer class="foot">
      <span>训练数据仅保存在本设备</span>
      <router-link to="/privacy">隐私政策</router-link>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { LEVELS, GROUPS, TOTAL } from '@/data/levels'
import { useProgressStore } from '@/stores/progress'
import { useTrainingReportStore } from '@/stores/trainingReport.js'
import { openGuide } from '@/composables/guide'

const progress = useProgressStore() // 通关记录（本地 localStorage）
const reportStore = useTrainingReportStore()
const lastReport = computed(() => reportStore.last)

// 已通关关卡集合 / 通关数 / 下一个未通关关（进度线的"当前"节点）
const passedSet = computed(() => new Set(Object.keys(progress.passed).map(Number)))
const passedCount = computed(() => passedSet.value.size)
const firstUnpassed = computed(() => {
  for (let i = 1; i <= TOTAL; i++) if (!passedSet.value.has(i)) return i
  return 0
})

// 按科目分组
const GROUPED = computed(() =>
  GROUPS.map(g => ({
    ...g,
    items: LEVELS.filter(l => l.group === g.key),
  }))
)

const isPassed = (no) => passedSet.value.has(no)
</script>

<style scoped>
/* =========================================================
   横屏 APK · 工业控制台主题
   保留原有 Vue 数据、路由、Pinia 和业务逻辑
   ========================================================= */
.page {
  --bg: #111416;
  --panel: #1b2022;
  --panel-raised: #22292b;
  --panel-border: #343d3f;
  --orange: #f39a32;
  --orange-soft: rgba(243, 154, 50, .13);
  --green: #63c58a;
  --red: #d97863;
  --ink: #f0f2ef;
  --sub: #9da8a5;
  --muted: #687471;

  position: relative;
  isolation: isolate;
  min-height: var(--dvh, 100vh);
  box-sizing: border-box;
  overflow-x: hidden;
  background:
    radial-gradient(ellipse at 50% -35%, rgba(243,154,50,.09), transparent 55%),
    var(--bg);
  color: var(--ink);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC",
    "Microsoft YaHei", "Noto Sans SC", sans-serif;
  font-size: 14px;
  line-height: 1.45;
}

.page::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: .22;
  background-image:
    linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
  background-size: 32px 32px;
}

.wrap, .foot {
  position: relative;
  z-index: 1;
}

.wrap {
  width: min(1480px, 100%);
  box-sizing: border-box;
  margin: 0 auto;
  padding: 0 30px 28px;
}

/* 顶栏 */
.top {
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid var(--panel-border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--ink);
  letter-spacing: .12em;
  font-size: 14px;
  font-weight: 800;
}

.brand .led {
  width: 9px;
  height: 9px;
  flex: none;
  border-radius: 2px;
  background: var(--orange);
  box-shadow: 0 0 10px rgba(243,154,50,.45);
}

.brand-main { color: #f2f3ef; }
.brand-sub {
  margin-left: 4px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .16em;
}

.ptext {
  margin: 0;
  color: var(--sub);
  font-size: 12px;
  letter-spacing: .04em;
}
.ptext b {
  margin: 0 4px 0 8px;
  color: var(--orange);
  font-size: 21px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.ptext i {
  color: var(--muted);
  font-style: normal;
}

/* 顶栏右侧：操作指引 + 通关计数 */
.top-side {
  display: flex;
  align-items: center;
  gap: 14px;
}

.guide-link {
  flex: none;
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  background: transparent;
  padding: 5px 10px;
  color: var(--sub);
  font: inherit;
  font-size: 12px;
  letter-spacing: .04em;
  cursor: pointer;
  touch-action: manipulation;
  transition: color .2s, border-color .2s;
}

.guide-link:hover,
.guide-link:focus-visible {
  color: var(--orange);
  border-color: var(--orange);
}

/* 页面标题 */
.intro {
  padding: 22px 0 18px;
}
.intro-head {
  display: flex;
  align-items: baseline;
  gap: 15px;
}
.intro-head h1 {
  margin: 0;
  color: var(--ink);
  font-size: 25px;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: .04em;
}
.hint {
  margin: 0;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .16em;
}
.rail {
  display: flex;
  align-items: center;
  margin-top: 15px;
  height: 5px;
  overflow: hidden;
  border-radius: 2px;
  background: #293032;
}
.node {
  width: 5px;
  height: 5px;
  flex: none;
  border-radius: 50%;
  background: #59615f;
}
.node.lit { background: var(--green); }
.node.now { background: var(--orange); }
.seg {
  height: 2px;
  flex: 1;
  overflow: hidden;
  background: #39413f;
}
.seg i {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--green);
  transform: scaleX(0);
  transform-origin: left;
}
.seg.lit i {
  animation: charge .25s ease-out forwards;
  animation-delay: calc(var(--i) * 35ms);
}
@keyframes charge { to { transform: scaleX(1); } }

/* 最近一次报告 */
.report-link {
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  margin: 0 0 17px;
  padding: 10px 14px;
  border: 1px solid rgba(243,154,50,.3);
  border-left: 3px solid var(--orange);
  border-radius: 5px;
  background: var(--orange-soft);
  color: var(--ink);
  text-decoration: none;
}
.report-link b {
  flex: none;
  color: var(--orange);
  font-size: 12px;
}
.report-link span {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--sub);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.report-link i {
  flex: none;
  color: var(--orange);
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}

/* 科目分区 */
.groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.group {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--panel-border);
  border-radius: 7px;
  background: linear-gradient(145deg, rgba(34,41,43,.96), rgba(25,30,32,.96));
  box-shadow: 0 5px 18px rgba(0,0,0,.14);
}
.group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 25px;
  margin: 0 0 12px;
  padding: 0 0 10px;
  border-bottom: 1px solid #394244;
  font-size: 14px;
  font-weight: 800;
}
.group-title em {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 22px;
  box-sizing: border-box;
  padding: 2px 7px;
  border-radius: 3px;
  background: var(--orange);
  color: #191b1b;
  font-size: 11px;
  font-style: normal;
  font-weight: 900;
  letter-spacing: .04em;
}
.group-title span {
  color: var(--sub);
  font-size: 11px;
  font-weight: 500;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

/* 任务卡片 */
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 9px;
  min-width: 0;
  min-height: 82px;
  box-sizing: border-box;
  padding: 11px 12px 10px;
  overflow: hidden;
  border: 1px solid #3a4445;
  border-radius: 5px;
  background: #252d2f;
  color: var(--ink);
  text-decoration: none;
  transition: border-color .15s, background .15s, transform .15s;
}
.card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: #697471;
}
.card .title {
  display: -webkit-box;
  overflow: hidden;
  color: #e9eeeb;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.card .meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}
.card .score {
  overflow: hidden;
  color: #899591;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card .state {
  flex: none;
  color: var(--orange);
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}
.card .state::before {
  content: "●";
  margin-right: 5px;
  font-size: 8px;
}
.card.current {
  border-color: #48504e;
}
.card.current::before { background: var(--orange); }
.card.current:active {
  transform: scale(.985);
  border-color: var(--orange);
  background: #303536;
}
.card.done {
  border-color: rgba(99,197,138,.32);
  background: linear-gradient(120deg, rgba(35,62,49,.72), #252d2f 65%);
}
.card.done::before { background: var(--green); }
.card.done .state { color: var(--green); }
.card.done .state::before { content: "✓"; font-size: 10px; }
.card.pending {
  border-style: dashed;
  border-color: #414947;
  background: #202627;
  cursor: not-allowed;
}
.card.pending::before { background: #59615f; }
.card.pending .title { color: #87918d; }
.card.pending .state { color: #75807c; }
.card.pending .state::before { content: ""; margin: 0; }
.card:focus-visible, .report-link:focus-visible {
  outline: 2px solid var(--orange);
  outline-offset: 2px;
}

/* 底栏 */
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 30px calc(12px + env(safe-area-inset-bottom, 0px));
  color: #687370;
  font-size: 10px;
}
.foot a {
  color: #9da8a5;
  text-decoration: none;
}

/* 横屏 APK：优先保证任务矩阵完整、触控区域足够 */
@media (orientation: landscape) {
  .page {
    min-height: var(--dvh, 100vh);
  }
  .wrap {
    width: 100%;
    max-width: 1600px;
    padding: 0 26px 12px;
  }
  .top {
    min-height: 48px;
  }
  .intro {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 13px 0 12px;
  }
  .intro-head h1 { font-size: 21px; }
  .hint { font-size: 9px; }
  .rail {
    width: min(38%, 480px);
    margin: 0;
  }
  .groups {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .group {
    padding: 10px 12px;
  }
  .group-title {
    margin-bottom: 8px;
    padding-bottom: 7px;
  }
  .grid { gap: 7px; }
  .card {
    min-height: 70px;
    padding: 8px 10px 7px;
    gap: 6px;
  }
  .card .title { font-size: 12px; }
  .card .score, .card .state { font-size: 9px; }
  .report-link {
    margin-bottom: 9px;
    padding: 7px 11px;
  }
  .foot {
    padding-top: 8px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  }
}

/* 矮屏横屏设备：减少留白，避免任务区被挤出 */
@media (orientation: landscape) and (max-height: 520px) {
  .top { min-height: 40px; }
  .intro { padding: 8px 0; }
  .intro-head h1 { font-size: 18px; }
  .rail { height: 3px; }
  .group { padding: 7px 9px; }
  .group-title { margin-bottom: 5px; padding-bottom: 5px; }
  .card { min-height: 60px; padding: 6px 8px; }
  .card .title { font-size: 11px; }
  .groups { gap: 7px; }
  .grid { gap: 5px; }
  .foot { padding-top: 5px; padding-bottom: 5px; }
}

/* 竖屏或窄窗口时仍可正常查看，不影响横屏 APK 主布局 */
@media (max-width: 700px) and (orientation: portrait) {
  .wrap { padding: 0 14px 24px; }
  .intro-head { align-items: flex-start; flex-direction: column; gap: 4px; }
  .groups { grid-template-columns: 1fr; gap: 12px; }
  .grid { grid-template-columns: 1fr; }
  .card {
    min-height: 66px;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
  }
  .card .title { flex: 1; min-width: 0; }
  .card .meta { flex: none; flex-direction: column; align-items: flex-end; }
  .foot { padding-left: 14px; padding-right: 14px; }
  .report-link { align-items: flex-start; flex-direction: column; gap: 4px; }
  .report-link span { white-space: normal; }
  .report-link i { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
/* 修复横屏 APK 无法滚动 */
@media (orientation: landscape) {
  .page {
    height: var(--dvh, 100vh);
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .wrap {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .groups {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
    padding-bottom: 15px;
  }

  .foot {
    flex: none;
  }
}
</style>
