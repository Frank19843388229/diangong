import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ---- 外部依赖 mock（不需要网络 / Pinia 持久化 / 弹窗） ----
// vi.hoisted 保证 mock 工厂执行时这些 spy 已初始化
const mocks = vi.hoisted(() => ({
  reportResult: vi.fn(),
  noteIssue: vi.fn(),
  attachReason: vi.fn(),
  triggerFatalExit: vi.fn(),
}))
const { reportResult, noteIssue, attachReason, triggerFatalExit } = mocks

vi.mock('@/composables/levelAttempt', () => ({
  useLevelAttempt: () => ({ reportResult: mocks.reportResult }),
}))
vi.mock('@/composables/trainingReport', () => ({
  useTrainingReport: () => ({ noteIssue: mocks.noteIssue, attachReason: mocks.attachReason }),
  resetTrainingReport: vi.fn(),
}))
vi.mock('@/composables/fatalExit', () => ({
  triggerFatalExit: (...args) => mocks.triggerFatalExit(...args),
}))
vi.mock('@/assets/imgmap', () => ({
  imgUrl: () => '',
}))

// ---- canvas 2d 上下文 mock（happy-dom 不实现 getContext） ----
function makeCtx() {
  const ctx = {}
  const methods = [
    'beginPath', 'moveTo', 'lineTo', 'stroke', 'fill', 'arc',
    'fillRect', 'strokeRect', 'fillText', 'clearRect',
    'save', 'restore', 'closePath', 'setLineDash', 'translate', 'rotate',
  ]
  methods.forEach(m => { ctx[m] = vi.fn() })
  return ctx
}

import Level1Refactored from '../Level1Refactored.vue'

function mountLevel() {
  return mount(Level1Refactored, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        TrainingReport: true,
      },
    },
  })
}

function findButtonByText(wrapper, text) {
  const btn = wrapper.findAll('button').find(b => b.text().trim() === text)
  if (!btn) throw new Error(`button not found: ${text}`)
  return btn
}

describe('Level1Refactored.vue 运行冒烟', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    HTMLCanvasElement.prototype.getContext = () => makeCtx()
    reportResult.mockClear()
    noteIssue.mockClear()
    attachReason.mockClear()
    triggerFatalExit.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('应该从开始界面进入第 1 阶段', async () => {
    const wrapper = mountLevel()
    expect(wrapper.text()).toContain('开始训练')

    await findButtonByText(wrapper, '开始训练').trigger('click')
    await nextTick()

    // 顶层 HUD + 阶段横幅（阶段 1/13）
    expect(wrapper.text()).toContain('阶段 1/13')
    expect(wrapper.text()).toContain('任务 1：个人防护用品选择')
    wrapper.unmount()
  })

  it('正确选择防护用品后应进入第 2 阶段（completePhase 生效）', async () => {
    const wrapper = mountLevel()
    await findButtonByText(wrapper, '开始训练').trigger('click')
    await nextTick()

    // 五个正确选项
    for (const label of ['电工安全帽', '电工防护服', '双保险安全带', '绝缘鞋', '合格脚扣']) {
      await findButtonByText(wrapper, label).trigger('click')
    }
    await findButtonByText(wrapper, '确认进入作业区').trigger('click')
    await nextTick()

    // completePhase 内部 later(..., 1400)
    vi.advanceTimersByTime(1500)
    await nextTick()

    expect(wrapper.text()).toContain('阶段 2/13')
    expect(wrapper.text()).toContain('任务 2：规范穿戴')
    // 扣分为 0，不应触发报告钩子
    expect(noteIssue).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('选错防护用品应扣分，且 penalize/showMsg 钩子接入训练报告', async () => {
    const wrapper = mountLevel()
    await findButtonByText(wrapper, '开始训练').trigger('click')
    await nextTick()

    // 选错：每个分组都选第一项（普通帽 / 化纤运动服 / 普通腰带 / 运动鞋 / 损坏脚扣）
    const groups = wrapper.findAll('.grp')
    expect(groups.length).toBe(5)
    for (const g of groups) {
      await g.findAll('button')[0].trigger('click')
    }
    await findButtonByText(wrapper, '确认进入作业区').trigger('click')
    await nextTick()

    // 一票否决：扣 10 分 + 训练报告钩子被调用
    expect(noteIssue).toHaveBeenCalledWith('安全防护', 10)
    expect(attachReason).toHaveBeenCalled()
    expect(triggerFatalExit).toHaveBeenCalled()
    wrapper.unmount()
  })
})
