// 游戏逻辑管理器 - 统一导出所有公共逻辑
// 各能力模块独立维护，这里只做汇总与 useGame 组合，避免逻辑重复
import { ref } from 'vue'
import { hitElId } from '@/lib/dropTarget.js'
import { useAudio } from './audio.js'
import { useMessage } from './message.js'
import { useDrag } from './drag.js'
import { useTimer } from './timer.js'
import { useScore } from './score.js'

// 单项能力（供只用到其中一部分的关卡按需引入）
export { useAudio, useMessage, useDrag, useTimer, useScore }

// 关卡配置
export { LEVEL1_CONFIG, LEVEL2_CONFIG, LEVELS_CONFIG, getLevelConfig } from './config.js'

// 画布绘制工具
export { line, rect, circle, txt, clearCanvas, drawGrid } from '@/utils/game/canvas.js'

// 综合游戏管理器
/**
 * @param {Array} phases 阶段配置
 * @param {Record<string,{got:number,max:number}>} categories 分类配置
 * @param {{ onPenalize?: Function, msgHooks?: object, cursorFor?: (i: number) => string }} [hooks]
 */
export function useGame(phases, categories, hooks = {}) {
  const { beep } = useAudio()
  const { msgText, msgType, showMsg } = useMessage(hooks.msgHooks)
  const { startDrag, stageRef } = useDrag()
  const { later, setInterval: setInterval_, clearAll, reset } = useTimer()
  const { cats, mistakes, total, addScore, penalize, completePhase: baseCompletePhase, stars, verdict } = useScore(categories, hooks)

  const screen = ref('title')
  const phase = ref(-1)
  const sheetOpen = ref(true)
  const lock = ref(false)
  const canvasRef = ref(null)

  function hitEl(x, y, id) {
    return hitElId(x, y, id)
  }

  function completePhase(cat, pts) {
    if (lock.value) return
    lock.value = true
    baseCompletePhase(cat, pts)
    beep(880, .12)
    later(() => {
      lock.value = false
      enterPhase(phase.value + 1)
    }, 1400)
  }

  function enterPhase(i) {
    phase.value = i
    sheetOpen.value = true
    if (i >= phases.length) {
      screen.value = 'results'
      return
    }
    const c = canvasRef.value
    if (c) {
      c.style.cursor = hooks.cursorFor
        ? hooks.cursorFor(i)
        : (i === 3 || i === 7) ? 'pointer' : i === 6 ? 'crosshair' : 'default'
    }
  }

  function startGame() {
    screen.value = 'play'
    reset()
    enterPhase(0)
  }

  function triggerFatal(reason) {
    showMsg('⚠ 重大违规：' + reason + ' —— 一票否决', 'bad')
    beep(120, .5, 'sawtooth')
    screen.value = 'results'
  }

  return {
    beep,
    msgText,
    msgType,
    showMsg,
    startDrag,
    stageRef,
    later,
    setInterval: setInterval_,
    clearAll,
    reset,
    cats,
    mistakes,
    total,
    addScore,
    penalize,
    completePhase,
    stars,
    verdict,
    screen,
    phase,
    sheetOpen,
    lock,
    canvasRef,
    hitEl,
    enterPhase,
    startGame,
    triggerFatal,
  }
}
