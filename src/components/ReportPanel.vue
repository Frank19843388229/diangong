<template>
  <section
    class="tr-panel"
    :class="{ inline }"
    :role="inline ? 'region' : 'dialog'"
    :aria-modal="inline ? undefined : 'true'"
    aria-label="训练报告"
  >
    <header class="tr-head">
      <div>
        <h2>训练报告</h2>
        <p class="tr-sub">{{ report ? `${report.code || ''} ${report.title || ''}` : '暂无训练记录' }}</p>
      </div>
      <button v-if="!inline" class="tr-close" type="button" aria-label="关闭" @click="$emit('close')">×</button>
    </header>

    <template v-if="report">
      <div class="tr-summary">
        <div class="tr-kpi">
          <span>本次成绩</span>
          <b :class="{ bad: !report.passed }">{{ report.aborted ? '中止' : `${report.score}/${report.fullScore || 100}` }}</b>
        </div>
        <div class="tr-kpi">
          <span>合格线</span>
          <b>{{ report.aborted ? '—' : report.pass }}</b>
        </div>
        <div class="tr-kpi">
          <span>用时</span>
          <b>{{ fmtDuration(report.durationSec) }}</b>
        </div>
        <div class="tr-kpi">
          <span>问题记录</span>
          <b :class="{ bad: report.issues && report.issues.length }">{{ report.issues ? report.issues.length : 0 }} 处</b>
        </div>
      </div>

      <p class="tr-verdict" :class="{ bad: !report.passed }">
        <template v-if="report.aborted">✘ 本次训练因重大违规中止，未生成成绩。请对照下面错题重新训练。</template>
        <template v-else>{{ report.passed ? '✔ 达到合格线，本次训练成绩已记录。' : '✘ 未达到合格线，请对照下面错题逐项重练。' }}</template>
        <span>完成时间：{{ fmtTime(report.finishedAt) }}</span>
      </p>

      <h3 class="tr-h3">分类得分</h3>
      <table class="tr-table">
        <thead>
          <tr><th>评分分类</th><th>得分</th><th>失分</th></tr>
        </thead>
        <tbody>
          <tr v-for="c in (report.categories || [])" :key="c.name">
            <td>{{ c.name }}</td>
            <td>{{ c.got }}/{{ c.max }}</td>
            <td :class="{ lost: c.lost > 0 }">{{ c.lost > 0 ? `-${c.lost}` : '0' }}</td>
          </tr>
          <tr v-if="!report.categories || !report.categories.length">
            <td colspan="3" class="tr-empty">{{ report.aborted ? '本次训练因重大违规中止，未生成分类得分' : '暂无分类得分' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="weakCategories.length" class="tr-advice">
        建议重点复习：<b>{{ weakCategories.map(c => `${c.name}（-${c.lost} 分）`).join('、') }}</b>
      </p>

      <h3 class="tr-h3">错题本 / 扣分明细</h3>
      <ol v-if="report.issues && report.issues.length" class="tr-issues">
        <li v-for="(it, i) in report.issues" :key="i">
          <div class="tr-issue-top">
            <b>{{ stepLabel(it) }}</b>
            <span class="tr-points" :class="{ zero: !it.points }">
              <template v-if="it.points > 0">-{{ it.points }} 分</template>
              <template v-else>未直接扣分</template>
              <em v-if="it.count > 1"> ×{{ it.count }} 次</em>
            </span>
          </div>
          <p class="tr-issue-meta">
            <span class="tr-tag">{{ it.category }}</span>
            <span v-if="it.reason" class="tr-reason">{{ it.reason }}</span>
            <span v-else class="tr-reason muted">未按规范完成本步骤</span>
          </p>
        </li>
      </ol>
      <p v-else class="tr-empty tr-empty-box">
        本次没有记录到明确的扣分操作，但仍有 {{ report.totalLost }} 分未拿到，通常是漏做步骤或未完成评分点。
      </p>
      <p v-if="report.issues && report.issues.length" class="tr-tip">
        说明：分值按评分项权重计；“未直接扣分”的操作失误会体现在上方分类失分中。
      </p>

      <template v-if="report.violations && report.violations.length">
        <h3 class="tr-h3">重大违规</h3>
        <ul class="tr-violations">
          <li v-for="(v, i) in report.violations" :key="i">{{ v }}</li>
        </ul>
      </template>

      <p class="tr-saved">报告已自动保存在本机（last_report.json），可导出后交给教练或留档复习。</p>

      <footer class="tr-foot">
        <button class="btn primary" type="button" @click="exportJson">导出 JSON</button>
        <button class="btn" type="button" @click="copyText">{{ copied ? '已复制 ✔' : '复制文字版' }}</button>
        <button class="btn" type="button" @click="$emit('close')">{{ closeLabel }}</button>
      </footer>
    </template>

    <template v-else>
      <p class="tr-empty tr-empty-box">还没有可查看的训练报告，请先完成一次训练。</p>
      <footer class="tr-foot">
        <button class="btn" type="button" @click="$emit('close')">{{ closeLabel }}</button>
      </footer>
    </template>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTrainingReportStore } from '@/stores/trainingReport.js'
import { downloadText, persistLastReportJson } from '@/composables/trainingReport.js'

defineProps({
  // inline：作为独立路由页渲染（无遮罩、无右上角 ×，closeLabel 生效）
  inline: { type: Boolean, default: false },
  closeLabel: { type: String, default: '关闭' },
})
defineEmits(['close'])

const store = useTrainingReportStore()
const copied = ref(false)

const report = computed(() => store.last || store.history[0] || null)

const weakCategories = computed(() => {
  const list = (report.value && report.value.categories) || []
  return list.filter(c => c.lost > 0).sort((a, b) => b.lost - a.lost).slice(0, 3)
})

function pad(n) {
  return String(n).padStart(2, '0')
}

function fmtTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmtDuration(sec) {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`
}

function stepLabel(it) {
  if (it.step) return `第 ${it.step} 步${it.stepName ? ` · ${it.stepName}` : ''}`
  return it.stepName || '操作过程'
}

function exportJson() {
  if (!report.value) return
  persistLastReportJson(report.value)
  downloadText('last_report.json', JSON.stringify(report.value, null, 2))
}

async function copyText() {
  if (!report.value) return
  const lines = [
    `【训练报告】${report.value.code || ''} ${report.value.title || ''}`.trim(),
    `完成时间：${fmtTime(report.value.finishedAt)}`,
    `成绩：${report.value.aborted ? '训练中止（重大违规，未生成成绩）' : `${report.value.score}/${report.value.fullScore || 100}（合格线 ${report.value.pass}）${report.value.passed ? '合格' : '未合格'}`}`,
    `用时：${fmtDuration(report.value.durationSec)}　问题记录：${(report.value.issues || []).length} 处`,
    '',
    '— 分类得分 —',
    ...(report.value.categories || []).map(c => `${c.name}：${c.got}/${c.max}（失分 ${c.lost}）`),
  ]
  const weak = (report.value.categories || []).filter(c => c.lost > 0).sort((a, b) => b.lost - a.lost).slice(0, 3)
  if (weak.length) lines.push(`建议重点复习：${weak.map(c => `${c.name}（-${c.lost} 分）`).join('、')}`)
  lines.push('', '— 错题本 / 扣分明细 —')
  if (report.value.issues && report.value.issues.length) {
    report.value.issues.forEach((it, i) => {
      const pts = it.points > 0 ? `-${it.points} 分` : '未直接扣分'
      lines.push(`${i + 1}. ${stepLabel(it)}｜${it.category}｜${pts}${it.count > 1 ? ` ×${it.count} 次` : ''}${it.reason ? `｜${it.reason}` : ''}`)
    })
  } else {
    lines.push('未记录到明确的扣分操作（存在漏做/未完成评分点）。')
  }
  if (report.value.violations && report.value.violations.length) {
    lines.push('', '— 重大违规 —', ...report.value.violations.map(v => `· ${v}`))
  }
  const text = lines.join('\n')
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } catch (e) {
    // 剪贴板不可用时退回下载 txt，保证用户仍能拿到内容
    downloadText('last_report.txt', text, 'text/plain;charset=utf-8')
  }
}
</script>

<style scoped>
.tr-panel {
  width: min(100%, 720px);
  max-height: min(90vh, 900px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 0 20px 20px;
  border-radius: 14px;
  background: #fff;
  color: #1f2937;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
  font-size: 14px;
  line-height: 1.55;
}

/* 独立路由页：不滚动外层，随页面自然流动 */
.tr-panel.inline {
  width: 100%;
  max-height: none;
  overflow: visible;
  box-shadow: none;
}

.tr-head {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin: 0 -20px 14px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #e8edf3;
  background: #fff;
}

.tr-panel.inline .tr-head {
  position: static;
}

.tr-head h2 {
  margin: 0;
  font-size: 20px;
  color: #123a7a;
}

.tr-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.tr-close {
  flex: none;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #eef2f7;
  color: #475569;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.tr-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.tr-kpi {
  padding: 10px 12px;
  border: 1px solid #e3eaf3;
  border-radius: 10px;
  background: #f7f9fc;
}

.tr-kpi span {
  display: block;
  margin-bottom: 2px;
  font-size: 12px;
  color: #6b7280;
}

.tr-kpi b {
  font-size: 18px;
  color: #123a7a;
}

.tr-kpi b.bad {
  color: #c62828;
}

.tr-verdict {
  margin: 0 0 14px;
  padding: 9px 12px;
  border-radius: 8px;
  background: #e8f6ec;
  color: #1b6b34;
  font-weight: 600;
}

.tr-verdict.bad {
  background: #fdeaea;
  color: #a51f1f;
}

.tr-verdict span {
  display: block;
  margin-top: 2px;
  font-weight: 400;
  font-size: 12px;
  color: #5b6472;
}

.tr-h3 {
  margin: 16px 0 8px;
  font-size: 15px;
  color: #1f3d68;
}

.tr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.tr-table th,
.tr-table td {
  padding: 7px 8px;
  border-bottom: 1px solid #edf1f6;
  text-align: left;
}

.tr-table th {
  background: #f4f7fb;
  color: #526078;
  font-weight: 600;
}

.tr-table td:last-child,
.tr-table th:last-child {
  text-align: right;
}

.tr-table td.lost {
  color: #c62828;
  font-weight: 700;
}

.tr-issues {
  margin: 0;
  padding: 0;
  list-style: none;
}

.tr-issues li {
  margin-bottom: 8px;
  padding: 9px 11px;
  border-left: 3px solid #d64545;
  border-radius: 6px;
  background: #fbf5f5;
}

.tr-issue-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.tr-issue-top b {
  color: #243b5a;
}

.tr-points {
  flex: none;
  color: #c62828;
  font-weight: 700;
}

.tr-points em {
  font-style: normal;
  font-size: 12px;
  color: #8a3a3a;
}

.tr-points.zero {
  color: #8a6d1f;
  font-weight: 600;
}

.tr-tip {
  margin: 10px 0 0;
  color: #8a94a3;
  font-size: 12px;
  line-height: 1.5;
}

.tr-advice {
  margin: 8px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff8e6;
  color: #7a5b12;
  font-size: 13px;
}

.tr-issue-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 4px 0 0;
  font-size: 12px;
}

.tr-tag {
  padding: 1px 7px;
  border-radius: 999px;
  background: #e8eef8;
  color: #31558a;
}

.tr-reason {
  color: #4b5563;
}

.tr-reason.muted {
  color: #9aa3b0;
}

.tr-violations {
  margin: 0;
  padding-left: 18px;
  color: #9d2020;
  font-size: 13px;
}

.tr-empty {
  color: #8a94a3;
  font-size: 13px;
}

.tr-empty-box {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: #f7f9fc;
}

.tr-saved {
  margin: 14px 0 0;
  color: #6b7280;
  font-size: 12px;
}

.tr-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #edf1f6;
}

.tr-foot .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 8px 18px;
  border: 1px solid #9fb4c6;
  border-radius: 6px;
  background: #fff;
  color: #1f2937;
  font: inherit;
  font-size: 14px;
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.tr-foot .btn:hover {
  background: #f0f4fa;
  border-color: #7d95aa;
}

.tr-foot .btn.primary {
  border-color: #1a3fc4;
  background: #1a3fc4;
  color: #fff;
}

.tr-foot .btn.primary:hover {
  border-color: #122d94;
  background: #122d94;
}

@media (max-width: 560px) {
  .tr-panel {
    padding: 0 14px 16px;
    border-radius: 12px;
  }

  .tr-head {
    margin: 0 -14px 12px;
    padding: 14px 14px 10px;
  }

  .tr-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tr-foot {
    justify-content: stretch;
  }

  .tr-foot .btn {
    flex: 1 1 auto;
  }
}
</style>
