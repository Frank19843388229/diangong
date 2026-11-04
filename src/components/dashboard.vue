<template>
  <div class="page">
    <div class="wrap">
      <!-- 顶栏：品牌 + 通关计数 -->
      <header class="top">
        <div class="brand"><i class="led"></i>Frank</div>
        <p class="ptext">已通关 <b>{{ passedCount }}</b><i>/{{ TOTAL }}</i></p>
      </header>

      <!-- 标题 + 通电进度线 -->
      <section class="intro">
        <div class="intro-head">
          <h1>选择关卡</h1>
          <p class="hint">全部关卡已解锁 · 点击进入训练</p>
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
      <span>Frank · 训练数据仅保存在本设备</span>
      <router-link to="/privacy">隐私政策</router-link>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { LEVELS, GROUPS, TOTAL } from '@/data/levels'
import { useProgressStore } from '@/stores/progress'
import { useTrainingReportStore } from '@/stores/trainingReport.js'

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
.page {
  --blue: #2f6bff;
  --cyan: #38e1ff;
  --amber: #ffc93c;
  --ok: #4ade80;
  --ink: #e8f0ff;
  --sub: #8fa3c7;
  --line: rgba(96, 150, 255, 0.16);
  --panel: linear-gradient(160deg, rgba(21, 33, 59, 0.92), rgba(11, 18, 34, 0.92));

  position: relative;
  isolation: isolate;
  min-height: var(--dvh, 100vh);
  box-sizing: border-box;
  border-top: 3px solid var(--cyan);
  background:
    radial-gradient(1100px 560px at 12% -12%, rgba(47, 107, 255, 0.22), transparent 60%),
    radial-gradient(900px 520px at 102% -6%, rgba(56, 225, 255, 0.12), transparent 55%),
    #070c16;
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC',
    'Microsoft YaHei', 'Noto Sans SC', 'Segoe UI', sans-serif;
  font-size: 15px;
  line-height: 1.5;
}

/* 电路网格底纹（固定，不随滚动） */
.page::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(96, 150, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(96, 150, 255, 0.05) 1px, transparent 1px);
  background-size: 34px 34px;
}

.wrap,
.foot {
  position: relative;
  z-index: 1;
}

.wrap {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 20px 40px;
}

/* ---------- 顶栏 ---------- */
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.brand .led {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--cyan);
  box-shadow: 0 0 10px var(--cyan);
  animation: led 2.4s ease-in-out infinite;
}

@keyframes led {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.ptext {
  margin: 0;
  color: var(--sub);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.ptext b {
  color: var(--cyan);
  font-size: 17px;
  font-weight: 800;
  margin: 0 1px;
  text-shadow: 0 0 12px rgba(56, 225, 255, 0.5);
}

.ptext i {
  font-style: normal;
}

/* ---------- 标题 + 进度线 ---------- */
.intro {
  padding: 22px 0 20px;
}

.intro-head h1 {
  margin: 0;
  font-size: 27px;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.hint {
  margin: 3px 0 16px;
  color: var(--sub);
  font-size: 13px;
}

.rail {
  display: flex;
  align-items: center;
}

.node {
  flex: none;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #16233d;
  border: 1px solid rgba(96, 150, 255, 0.28);
  box-sizing: border-box;
}

.seg {
  flex: 1;
  height: 4px;
  background: #16233d;
  overflow: hidden;
}

.seg i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--blue), var(--cyan));
  transform: scaleX(0);
  transform-origin: left;
}

.seg.lit i {
  animation: charge 0.28s ease-out forwards;
  animation-delay: calc(var(--i) * 70ms);
  box-shadow: 0 0 8px rgba(56, 225, 255, 0.6);
}

.node.lit {
  background: var(--cyan);
  border-color: var(--cyan);
  box-shadow: 0 0 9px rgba(56, 225, 255, 0.8);
}

/* 当前待通关：琥珀色描边 + 呼吸 */
.node.now {
  background: transparent;
  border: 2px solid var(--amber);
  box-shadow: 0 0 10px rgba(255, 201, 60, 0.75);
  animation: breathe 1.6s ease-in-out infinite;
}

@keyframes charge {
  to { transform: scaleX(1); }
}

@keyframes breathe {
  0%, 100% { box-shadow: 0 0 10px rgba(255, 201, 60, 0.75); }
  50% { box-shadow: 0 0 3px rgba(255, 201, 60, 0.3); }
}

/* ---------- 关卡分组 ---------- */
.groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.group-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 11px;
  font-size: 15px;
  font-weight: 700;
}

.group-title em {
  font-style: normal;
  padding: 1px 8px;
  border: 1px solid rgba(56, 225, 255, 0.45);
  border-radius: 4px;
  background: rgba(56, 225, 255, 0.1);
  color: var(--cyan);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.group-title span {
  color: var(--sub);
  font-size: 12.5px;
  font-weight: 400;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
  gap: 11px;
}

/* ---------- 关卡卡片（精简：标题 + 分值 + 状态） ---------- */
.card {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  min-height: 118px;
  padding: 14px 15px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  color: var(--ink);
  text-decoration: none;
  overflow: hidden;
  transition: border-color 0.16s, box-shadow 0.16s, transform 0.16s;
}

/* 左侧能量条：状态色 */
.card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 14px;
  bottom: 14px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--blue);
  box-shadow: 0 0 8px rgba(47, 107, 255, 0.6);
}

.card .title {
  font-size: 15px;
  font-weight: 650;
  line-height: 1.42;
}

.card .meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.card .score {
  color: var(--sub);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.card .state {
  font-size: 13px;
  font-weight: 700;
  color: var(--cyan);
}

.card .state::before {
  content: '▶ ';
  font-size: 10px;
}

/* 待通关（当前）：青色描边 + 微光 */
.card.current:hover,
.card.current:focus-visible {
  border-color: rgba(56, 225, 255, 0.6);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(56, 225, 255, 0.3);
  transform: translateY(-2px);
}

/* 已通关：绿色能量条 + ✓ */
.card.done::before {
  background: var(--ok);
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
}

.card.done .state {
  color: var(--ok);
}

.card.done .state::before {
  content: '✓ ';
}

.card.done:hover,
.card.done:focus-visible {
  border-color: rgba(74, 222, 128, 0.55);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(74, 222, 128, 0.3);
  transform: translateY(-2px);
}

/* 待上线：暗淡虚线 */
.card.pending {
  border-style: dashed;
  border-color: rgba(143, 163, 199, 0.22);
  background: rgba(11, 18, 34, 0.55);
  cursor: not-allowed;
}

.card.pending::before {
  background: #2a3555;
  box-shadow: none;
}

.card.pending .title {
  color: var(--sub);
  font-weight: 500;
}

.card.pending .state {
  color: #6b7a99;
  font-weight: 600;
}

.card.pending .state::before {
  content: '';
}

.card:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 3px;
}

/* ---------- 底部 ---------- */
.foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 6px 16px;
  padding: 16px 12px calc(16px + env(safe-area-inset-bottom, 0px));
  color: #6b7a99;
  font-size: 12px;
}

.foot a {
  color: var(--sub);
  text-decoration: underline;
  font-weight: 600;
}

/* ---------- 窄屏（竖屏手机） ---------- */
@media (max-width: 560px) {
  .wrap {
    padding: 0 14px 32px;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .card {
    min-height: 0;
    flex-direction: row;
    align-items: center;
    gap: 14px;
    padding: 13px 14px;
  }

  .card .title {
    flex: 1;
    min-width: 0;
    font-size: 14.5px;
  }

  .card .meta {
    flex: none;
    text-align: right;
  }
}

/* ============================================================
 * 横屏铺满（选关页全屏：html.game-fs.dashboard-fs）
 * 由 gameFs.js 在 /dashboard 路由切换：进页全屏 + 锁横屏（best-effort），
 * 但与关卡页的「纯净模式」互斥 —— 这里保留全部文字。
 * 需要在一屏内放下 4 个科目 14 张卡：科目改为「左侧标签 + 右侧卡片横排」，
 * 卡片压扁为横向（标题左、分值状态右），装不下时容器内部滚动兜底。
 * ============================================================ */
@media (orientation: landscape) {
  html.game-fs.dashboard-fs .page {
    height: var(--dvh, 100vh);
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  html.game-fs.dashboard-fs .wrap {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    max-width: none;
    padding: 0 14px;
  }

  html.game-fs.dashboard-fs .top {
    flex: none;
    padding: 7px 0;
  }

  html.game-fs.dashboard-fs .intro {
    flex: none;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 7px 0 8px;
  }

  html.game-fs.dashboard-fs .intro-head {
    flex: none;
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  html.game-fs.dashboard-fs .intro-head h1 {
    font-size: 18px;
    white-space: nowrap;
  }

  html.game-fs.dashboard-fs .hint {
    margin: 0;
    font-size: 12px;
    white-space: nowrap;
  }

  html.game-fs.dashboard-fs .rail {
    flex: 1;
    min-width: 120px;
  }

  /* 科目行式排布：左侧科目标签，右侧该科目关卡横排 */
  html.game-fs.dashboard-fs .groups {
    flex: 1;
    min-height: 0;
    gap: 7px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding-bottom: 6px;
  }

  html.game-fs.dashboard-fs .group {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    flex: none;
  }

  html.game-fs.dashboard-fs .group-title {
    flex: 0 0 96px;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    margin: 0;
    padding-top: 7px;
    line-height: 1.3;
  }

  html.game-fs.dashboard-fs .group-title span {
    font-size: 11px;
    line-height: 1.3;
  }

  html.game-fs.dashboard-fs .grid {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  /* 横屏卡片：压扁为横向（标题左，分值/状态右） */
  html.game-fs.dashboard-fs .card {
    flex: 0 1 218px;
    min-height: 0;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    padding: 8px 11px 8px 13px;
    border-radius: 9px;
  }

  html.game-fs.dashboard-fs .card::before {
    top: 9px;
    bottom: 9px;
  }

  html.game-fs.dashboard-fs .card .title {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  html.game-fs.dashboard-fs .card .meta {
    flex: none;
    text-align: right;
    gap: 1px;
  }

  html.game-fs.dashboard-fs .card .score {
    font-size: 11px;
  }

  html.game-fs.dashboard-fs .card .state {
    font-size: 12px;
    white-space: nowrap;
  }

  html.game-fs.dashboard-fs .foot {
    flex: none;
    padding: 5px 14px calc(5px + env(safe-area-inset-bottom, 0px));
    justify-content: space-between;
    font-size: 11px;
  }

  /* 横屏全屏：报告入口压成一行小字，不挤占关卡列表 */
  html.game-fs.dashboard-fs .report-link {
    flex: none;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    margin: 0 0 6px;
    padding: 4px 10px;
    border-radius: 8px;
  }

  html.game-fs.dashboard-fs .report-link span {
    font-size: 12px;
  }

  html.game-fs.dashboard-fs .report-link i {
    display: none;
  }
}

.report-link {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  box-sizing: border-box;
  margin: 0 0 18px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  color: var(--ink);
  text-decoration: none;
  transition: border-color 0.16s, box-shadow 0.16s;
}

.report-link b {
  flex: none;
  color: var(--cyan);
  font-size: 13px;
  font-weight: 600;
}

.report-link span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--sub);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-link i {
  flex: none;
  font-style: normal;
  color: var(--cyan);
  font-size: 13px;
  font-weight: 700;
}

.report-link:hover,
.report-link:focus-visible {
  border-color: rgba(56, 225, 255, 0.6);
  box-shadow: 0 0 0 1px rgba(56, 225, 255, 0.3);
}

.report-link:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 2px;
}

@media (max-width: 560px) {
  .report-link {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
    padding: 11px 12px;
  }

  .report-link span {
    white-space: normal;
  }

  .report-link i {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .seg.lit i,
  .node.lit,
  .node.now,
  .brand .led {
    animation: none;
  }

  .seg.lit i {
    transform: scaleX(1);
  }

  .card {
    transition: none;
  }
}
</style>
