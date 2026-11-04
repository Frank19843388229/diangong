// 临时自检：训练报告 finalize / 错题合并 / last_report.json 落盘
function makeStorage() {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    clear: () => m.clear(),
  }
}
globalThis.localStorage = makeStorage()
globalThis.window = globalThis

const { createApp } = await import('vue')
const { createPinia } = await import('pinia')
const app = createApp({ render: () => null })
app.use(createPinia())

const { useTrainingReport } = await import('../src/composables/trainingReport.js')
const { useTrainingReportStore } = await import('../src/stores/trainingReport.js')

let failed = 0
function check(name, cond, detail = '') {
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${cond ? '' : ' ' + detail}`)
  if (!cond) failed++
}

const r = useTrainingReport({
  step: () => 3,
  stepName: () => '低压验电',
})
r.noteIssue('电气测试', 5)
r.attachReason('未验电就开始接线（-5 分）')
r.noteIssue('电气测试', 2)
r.attachReason('未验电就开始接线（-2 分）')
r.noteIssue('安全防护', 1)
r.attachReason('未戴绝缘手套')

const report = r.finalize({
  level: 1,
  score: 72,
  cats: { '电气测试': { got: 18, max: 25 }, '安全防护': { got: 9, max: 10 } },
  mistakes: 3,
  violations: ['未验电即接线'],
  attemptId: 'm3abcdef-xyz',
  startedAt: Date.now() - 125000,
})
const store = useTrainingReportStore()

check('报告已写入 store.last', store.last && store.last.id === report.id)
check('分类失分计算正确', store.last.categories.find(c => c.name === '电气测试').lost === 7)
check('错题原因已补全', store.last.issues[0].reason === '未验电就开始接线', JSON.stringify(store.last.issues))
check('同原因错题合并', store.last.issues[0].count === 2 && store.last.issues[0].points === 7, JSON.stringify(store.last.issues))
check('重大违规留档', store.last.violations[0] === '未验电即接线')
check('last_report.json 已落盘', !!localStorage.getItem('last_report.json'))
const emptyReport = useTrainingReport().finalize({
  level: 2,
  score: 90,
  cats: { '安全防护': { got: 20, max: 20 } },
  mistakes: 0,
  attemptId: 'm3empty-xyz',
})
check('finalize 后本局错题清空', emptyReport.issues.length === 0)

const abortReport = useTrainingReport().finalize({
  level: 3,
  score: null,
  cats: null,
  violations: ['重大违规：未验电即接线'],
  attemptId: 'm3abort-xyz',
  aborted: true,
})
check('重大违规中止报告', abortReport.aborted === true && abortReport.score === null && abortReport.passed === false)
check('中止报告保留违规原因', abortReport.violations[0] === '重大违规：未验电即接线')

// ---- 交卷链路：reportResult 应生成报告并重开一场 ----
const { useLevelAttempt } = await import('../src/composables/levelAttempt.js')
const lv = useLevelAttempt()
lv.openAttempt(6)
const oldAttempt = lv.attempt.attemptId
const run = useTrainingReport({
  step: () => 7,
  stepName: () => '拆除电路',
  category: () => '拆除电路',
})
run.noteIssue('拆除电路', 3)
run.attachReason('未确认断电就拆线')
lv.reportResult(72, {
  cats: { '拆除电路': { got: 2, max: 5 } },
  mistakes: 1,
  violations: ['未确认断电就拆线'],
})
check('交卷后生成对应关卡报告', store.last.level === 6 && store.last.code === 'K31-01')
check('未达合格线判定正确', store.last.passed === false && store.last.pass === 80)
check('交卷后已自动重开新场次', lv.attempt.attemptId && lv.attempt.attemptId !== oldAttempt)
check('交卷后 last_report.json 同步更新', JSON.parse(localStorage.getItem('last_report.json')).level === 6)

console.log(failed === 0 ? '\n===== 报告自检全部通过 =====' : `\n===== ${failed} 项失败 =====`)
process.exit(failed === 0 ? 0 : 1)
