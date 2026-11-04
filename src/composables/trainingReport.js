// 训练报告 / 错题本：记录关卡内每一次扣分，结算时汇总为一份可查看、可导出的报告。
//
// 设计要点：
// - 各关卡只需在 `penalize()` 里调用 noteIssue(cat, n)，在 `showMsg()` 里调用
//   attachReason(text)：扣分发生时先记一条空原因的错题，紧随其后的提示语会被补成原因。
// - 报告在 `useLevelAttempt.reportResult()` 交卷时 finalize：按“步骤 + 分类 + 原因”合并，
//   写入 trainingReport store（Pinia 持久化 + last_report.json），并清空本局记录。
// - 模块级 live 只保存“当前这一局”的临时记录，不持久化；刷新/重进不会串局。
import { useTrainingReportStore } from '@/stores/trainingReport.js'
import { LEVELS } from '@/data/levels.js'
import { appStorage } from '@/lib/appStorage.js'

const live = {
  issues: [],
  pending: null, // 等待 showMsg 补充原因的错题
}

// 当前关卡的步骤上下文（同一时刻只会挂载一个关卡组件）
let context = { step: () => 0, stepName: () => '' }

function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10
}

/** 去掉提示语里的对勾/分数尾巴，留下可读的“错误原因” */
function cleanReason(text) {
  return String(text || '')
    .replace(/^[✔✘√×!！\s]+/, '')
    .replace(/[（(]\s*[-－]?\s*\d+(?:\.\d+)?\s*分\s*[)）]/g, '')
    .replace(/[—–-]{1,2}\s*\d+(?:\.\d+)?\s*分[。.]?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 本次一局开始：清空临时错题（进入关卡 / 交卷后自动重开时调用） */
export function resetTrainingReport() {
  live.issues = []
  live.pending = null
}

/** 从场次号（base36 时间戳-随机串）还原开考时间 */
export function attemptStartedAt(attemptId) {
  const ts = parseInt(String(attemptId || '').split('-')[0], 36)
  return Number.isFinite(ts) && ts > 0 ? ts : null
}

export function useTrainingReport(config) {
  if (config) context = config

  const store = useTrainingReportStore()

  /** 记录一次扣分；原因稍后由 showMsg 补全 */
  function noteIssue(category, points, extra = {}) {
    const step = typeof context.step === 'function' ? context.step() : 0
    const stepName = typeof context.stepName === 'function' ? context.stepName() : ''
    const issue = {
      at: Date.now(),
      step: Number(step) || 0,
      stepName: stepName || '',
      category: category || '',
      points: round1(points),
      reason: extra.reason || '',
    }
    live.issues.push(issue)
    // 防止极端情况下持续点错导致无限增长
    if (live.issues.length > 300) live.issues.splice(0, live.issues.length - 300)
    live.pending = issue
    // 只在这一轮事件循环内等待紧随其后的 showMsg，避免把无关提示挂到本条错题上
    queueMicrotask(() => {
      if (live.pending === issue) live.pending = null
    })
    return issue
  }

  /** 用紧随扣分出现的提示语补全错题原因 */
  function attachReason(text) {
    if (!live.pending) return
    const reason = cleanReason(text)
    if (reason) live.pending.reason = reason
    live.pending = null
  }

  /** 记录一次“只计失误、未直接扣分”的操作（接错线、顺序错、调试失败等） */
  function noteMistake(points = 0) {
    const category = typeof context.category === 'function' ? context.category() : ''
    return noteIssue(category, points)
  }

  /** 同一“步骤 + 分类 + 原因”合并，显示为“×N 次”；保持可读性 */
  function mergeIssues() {
    const map = new Map()
    for (const it of live.issues) {
      const key = [it.step, it.category, it.reason || ''].join('|')
      const hit = map.get(key)
      if (hit) {
        hit.count += 1
        hit.points = round1(hit.points + it.points)
      } else {
        map.set(key, { ...it, count: 1 })
      }
    }
    return [...map.values()].sort((a, b) => a.step - b.step || a.at - b.at)
  }

  /** 交卷：生成本次报告并本地留档（score=null 表示重大违规中止，未生成成绩） */
  function finalize({ level, score, cats, mistakes, violations, attemptId, startedAt, aborted } = {}) {
    const meta = LEVELS.find(l => l.no === level) || null
    const finishedAt = Date.now()
    const started = startedAt || attemptStartedAt(attemptId)
    const isAborted = aborted === true || score == null
    const finalScore = isAborted ? null : round1(score)
    const pass = meta ? meta.pass : 80
    const categories = Object.entries(cats || {}).map(([name, c]) => {
      const max = round1(c && c.max)
      const got = round1(c && c.got)
      return { name, got, max, lost: round1(Math.max(0, max - got)) }
    })
    const report = {
      version: 1,
      id: `${level || 0}-${finishedAt.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      attemptId: attemptId || null,
      level: level || 0,
      code: meta ? meta.code : '',
      title: meta ? meta.title : '',
      finishedAt,
      startedAt: started || null,
      durationSec: started ? Math.max(0, Math.round((finishedAt - started) / 1000)) : null,
      aborted: isAborted,
      score: finalScore,
      fullScore: 100,
      pass,
      passed: isAborted ? false : finalScore >= pass,
      stars: isAborted ? 0 : finalScore >= 90 ? 5 : finalScore >= 80 ? 4 : finalScore >= 70 ? 3 : finalScore >= 60 ? 2 : 1,
      mistakes: Number(mistakes) || 0,
      categories,
      issues: mergeIssues(),
      violations: Array.isArray(violations) ? violations.slice(0, 30).map(String) : [],
      totalLost: round1(categories.reduce((a, c) => a + c.lost, 0)),
    }
    store.save(report)
    resetTrainingReport()
    return report
  }

  return { noteIssue, noteMistake, attachReason, finalize, resetLive: resetTrainingReport }
}

/** “导出训练记录”按钮共用：生成下载文件 */
export function downloadText(filename, content, mime = 'application/json;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 供“本地留档”按钮使用：把当前报告再写一次 last_report.json */
export function persistLastReportJson(report) {
  try {
    appStorage.setItem('last_report.json', JSON.stringify(report, null, 2))
  } catch (e) {
    console.warn('[report] 本地留档失败', e)
  }
}
