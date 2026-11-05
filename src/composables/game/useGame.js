import { computed, reactive, ref, watch } from 'vue'
import { useLevelAttempt } from '@/composables/levelAttempt.js'
import { resetTrainingReport, useTrainingReport } from '@/composables/trainingReport.js'
import { triggerFatalExit } from '@/composables/fatalExit.js'
import { useAudio } from './audio.js'
import { useDrag } from './drag.js'
import { useMessage } from './message.js'
import { useTimer } from './timer.js'

export function useGame(phases, catDefs, options = {}) {
  const { beep } = useAudio()
  const timer = useTimer()
  const { startDrag, stageRef } = useDrag()
  const canvasRef = ref(null)
  const ctx = ref(null)
  const setStageRef = el => { stageRef.value = el }
  const setCanvasRef = el => { canvasRef.value = el }

  const screen = ref('title')
  const phase = ref(-1)
  const lock = ref(false)
  const paused = ref(false)
  const sheetOpen = ref(true)
  const mistakes = ref(0)
  const violations = ref([])

  const cats = reactive({})
  Object.entries(catDefs).forEach(([key, value]) => {
    cats[key] = { got: 0, max: value.max }
  })
  const total = computed(() => Object.values(cats).reduce((sum, cat) => sum + cat.got, 0))

  const { reportResult } = useLevelAttempt()
  const { noteIssue, noteMistake, attachReason } = useTrainingReport({
    step: () => phase.value + 1,
    stepName: () => phases[phase.value]?.name || '',
    category: () => phases[phase.value]?.cat || '',
  })
  const { msgText, msgType, showMsg } = useMessage({
    onShow: attachReason,
    duration: options.messageDuration ?? 2800,
  })

  watch(screen, value => {
    if (value === 'play') resetTrainingReport()
    if (value === 'results' && (options.shouldReport?.() ?? true)) {
      reportResult(total.value, {
        cats,
        mistakes: mistakes.value,
        violations: violations.value,
      })
    }
  })

  function addScore(cat, n) {
    cats[cat].got = Math.min(cats[cat].max, +(cats[cat].got + n).toFixed(1))
  }

  function setScore(cat, n) {
    cats[cat].got = Math.max(0, Math.min(cats[cat].max, +Number(n).toFixed(1)))
  }

  function penalize(cat, n) {
    cats[cat].got = Math.max(0, +(cats[cat].got - n).toFixed(1))
    mistakes.value++
    noteIssue(cat, n)
  }

  function majorViolation(reason, cat, penalty) {
    if (paused.value) return
    triggerFatalExit(reason)
    penalize(cat, penalty)
    violations.value.push(reason)
    options.onViolation?.(reason, cat, penalty)
    showMsg(options.violationMessage?.(reason, penalty) || `检测到严重安全风险：${reason}（-${penalty} 分）`, 'bad')
    beep(120, .45, 'sawtooth')
    paused.value = true
    timer.later(() => {
      paused.value = false
      showMsg(options.resumeMessage || '请重新执行安全操作', 'info')
    }, 2600)
  }

  function enterPhase(i) {
    phase.value = i
    paused.value = false
    sheetOpen.value = true
    if (canvasRef.value) canvasRef.value.style.cursor = 'default'
    options.onEnterPhase?.(i)
    if (i >= phases.length) screen.value = 'results'
  }

  function completePhase() {
    if (lock.value) return
    lock.value = true
    beep(880, .12)
    timer.later(() => {
      lock.value = false
      enterPhase(phase.value + 1)
    }, options.phaseDelay ?? 1200)
  }

  function resetState() {
    Object.values(cats).forEach(cat => { cat.got = 0 })
    mistakes.value = 0
    violations.value = []
    paused.value = false
    lock.value = false
    sheetOpen.value = true
    options.onReset?.()
  }

  function startGame() {
    timer.reset()
    resetState()
    screen.value = 'play'
    enterPhase(0)
  }

  const stars = computed(() => total.value >= 90 ? 5 : total.value >= 80 ? 4 : total.value >= 70 ? 3 : total.value >= 60 ? 2 : 1)
  const verdict = computed(() => options.verdict?.(total.value) ?? '')

  return {
    beep,
    startDrag,
    stageRef,
    canvasRef,
    setStageRef,
    setCanvasRef,
    ctx,
    later: timer.later,
    setInterval: timer.setInterval,
    clearAll: timer.clearAll,
    resetTimer: timer.reset,
    screen,
    phase,
    lock,
    paused,
    sheetOpen,
    mistakes,
    violations,
    cats,
    total,
    stars,
    verdict,
    msgText,
    msgType,
    showMsg,
    noteMistake,
    addScore,
    setScore,
    penalize,
    majorViolation,
    enterPhase,
    completePhase,
    resetState,
    startGame,
  }
}
