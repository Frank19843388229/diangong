// 舞台等比缩放：所有关卡舞台固定 960×640，窄屏按屏宽等比缩小铺满。
//
// ★ 安卓 WebView 兼容：不依赖 CSS calc(var(--s) * Npx) / calc(1 / var(--s))，
//   这些 CSS Values Level 4 表达式在 Chromium < 95 的 WebView 中不支持或解析错误。
//   所有派生值（反向缩放比、面板宽度、遮罩高度等）都在 JS 中预计算，
//   写入 --s-inv / --stage-h / --sheet-w 等 CSS 自定义属性（带 px 单位），
//   CSS 只需读取现成值，无需 calc 运算。
import { ref, computed } from 'vue'

export const STAGE_W = 960
export const STAGE_H = 640

/** 当前舞台缩放比（<= 1），与 CSS transform: scale(var(--s)) 同值 */
export const stageScale = ref(1)

/**
 * 用户缩放倍率（>= 1）：手机端「＋/－」按钮在"按屏宽自适应"基础上放大舞台，
 * 最大放到 1:1 原始尺寸（stageScale 封顶 1）。放大后页面可横向滚动查看场景。
 */
export const zoomMul = ref(1)

/**
 * 关卡纯净全屏模式（gameFs.js 切换）：舞台不再"只按屏宽缩放"，
 * 而是宽高双向 fit 并在视口内居中，画布尽量铺满整屏。
 */
export const fsFit = ref(false)

export function setFsFit(on) {
  if (fsFit.value === on) return
  fsFit.value = on
  if (on) zoomMul.value = 1 // 全屏模式下禁用 ＋/－ 手动缩放
  update()
}

/** 当前视口宽高（优先 visualViewport：更准确反映实际可见区域，含地址栏收起） */
function viewportSize() {
  const de = document.documentElement
  // 以 documentElement 的可见尺寸做上界：
  //   部分 Android WebView / 模拟器会把 visualViewport 按物理像素或旧值上报，
  //   导致 --dvh 比实际可见高度大。后果不是"画布没铺满"，而是任务面板/弹窗
  //   按"更高的屏幕"居中 → 卡片整体下移、底部被切掉，而卡片自身内容没溢出
  //   所以也滚不动，底部按钮永远点不到。
  //   取两者较小值：键盘弹出时 vv 更小仍然生效，上报偏大时被 clientHeight 夹住。
  const cw = de.clientWidth || window.innerWidth || 0
  const ch = de.clientHeight || window.innerHeight || 0
  const vv = window.visualViewport
  let w = vv && vv.width ? Math.min(vv.width, cw) : cw
  let h = vv && vv.height ? Math.min(vv.height, ch) : ch
  // 启动早期可能读到 0 或极小值，退回 window 尺寸
  if (!(w > 100)) w = window.innerWidth || STAGE_W
  if (!(h > 100)) h = window.innerHeight || STAGE_H
  return { w, h }
}

/** 按当前屏宽的自适应缩放比（不含用户倍率） */
function fitScale() {
  // clientWidth 不含滚动条：避免缩放后舞台比容器宽、页面出现横向滚动条
  const { w, h } = viewportSize()
  if (fsFit.value) {
    // 全屏铺满：宽高双向取小（contain，整幅画面始终完整可见，不裁剪可点区域）。
    // 封顶 1:1 —— canvas 位图只有 960×640，再放大只是模糊放大。
    return Math.min(1, Math.min(w / STAGE_W, h / STAGE_H))
  }
  return Math.min(1, Math.max(0.3, (w - 24) / STAGE_W))
}

/** 放大一档（1.3 倍），封顶 1:1 原始尺寸 */
export function zoomIn() {
  zoomMul.value = Math.min(Math.max(1, zoomMul.value * 1.3), 1 / fitScale())
  update()
}

/** 缩小一档，下限为"按屏宽自适应" */
export function zoomOut() {
  zoomMul.value = Math.max(1, zoomMul.value / 1.3)
  update()
}

export const canZoomIn = computed(() => !fsFit.value && stageScale.value < 0.999)
export const canZoomOut = computed(() => !fsFit.value && zoomMul.value > 1.001)

function update() {
  const s = Math.min(1, fitScale() * zoomMul.value)
  stageScale.value = s

  // ---- 预计算所有 CSS 派生值 ----
  const inv = 1 / s                                    // 反向缩放比
  const stageH = STAGE_H * s                           // 舞台显示高度（px）
  const sheetW = s * 940                               // 面板/结算卡宽度
  const modalW = s * 900                               // 弹窗宽度
  const bannerW = s * 930                              // 横幅/消息最大宽度
  const { w: vw, h: dvh } = viewportSize()             // 视口宽/高（动态，含地址栏）
  const overlayH = dvh / s                             // 遮罩在舞台本地坐标的高度

  // 全屏铺满：舞台在视口内水平/垂直居中的偏移（px）
  const offX = Math.max(0, (vw - STAGE_W * s) / 2)
  const offY = Math.max(0, (dvh - stageH) / 2)

  // 纯净模式下临时呼出的任务面板：以"视觉像素"定尺寸并在视口居中，
  // 再换算回舞台本地坐标（面板自身带 --s-inv 反向缩放，视觉尺寸=布局尺寸）。
  // 注意：面板比舞台宽时结果为负（向左伸出舞台），不能钳到 0，否则不居中
  const panelW = Math.min(940, vw - 24)
  const panelH = Math.min(dvh - 24, 620)
  const panelLeft = ((vw - panelW) / 2 - offX) / s
  const panelTop = ((dvh - panelH) / 2 - offY) / s

  // 折叠后的任务面板：贴底一条横条。32px 高度差 + 让开右下角 ☰（46px 按钮 + 14px 边距），
  // 否则收起来会和 ☰ 叠在一起，两个按钮互相挡。
  const foldBarH = 48
  const foldGap = 72
  const panelFoldTop = (dvh - foldGap - foldBarH - offY) / s

  const root = document.documentElement.style
  root.setProperty('--s', String(s))
  root.setProperty('--s-inv', String(inv))
  root.setProperty('--stage-h', stageH + 'px')
  root.setProperty('--sheet-w', sheetW + 'px')
  root.setProperty('--modal-w', modalW + 'px')
  root.setProperty('--banner-w', bannerW + 'px')
  root.setProperty('--dvh', dvh + 'px')
  root.setProperty('--overlay-h', overlayH + 'px')
  root.setProperty('--stage-offx', offX + 'px')
  root.setProperty('--stage-offy', offY + 'px')
  root.setProperty('--panel-w', panelW + 'px')
  root.setProperty('--panel-h', panelH + 'px')
  root.setProperty('--panel-left', panelLeft + 'px')
  root.setProperty('--panel-top', panelTop + 'px')
  root.setProperty('--panel-fold-top', panelFoldTop + 'px')
  // 整个视口换算回舞台本地坐标的盒子（全屏下开始/结算遮罩、弹窗要盖满真整屏，
  // 而舞台居中后其左上角并不等于视口左上角）
  root.setProperty('--vp-left', -offX / s + 'px')
  root.setProperty('--vp-top', -offY / s + 'px')
  root.setProperty('--vp-w', vw / s + 'px')
  root.setProperty('--vp-h', dvh / s + 'px')
  updateLayout()
}

/** 任务简介(横幅)与下方元素之间的视觉间距(px) */
const BANNER_GAP = 16

let layoutMO = null       // 面板/按键出现、换阶段、折叠时重排
let layoutRO = null       // 面板/按键高度变化时重排
let observedSheet = null
let observedPad = null

function observeEl(key, el) {
  if (key === 'sheet' && observedSheet !== el) {
    if (observedSheet) layoutRO.unobserve(observedSheet)
    if (el) layoutRO.observe(el)
    observedSheet = el
  }
  if (key === 'pad' && observedPad !== el) {
    if (observedPad) layoutRO.unobserve(observedPad)
    if (el) layoutRO.observe(el)
    observedPad = el
  }
}

/**
 * 竖屏画布下方的纵向排布（顺序）：
 *   画布 → 任务面板(白卡) → 虚拟按键(登杆) → 任务简介(横幅)
 *
 * 任务面板、简介都是舞台内绝对定位 + 反向缩放（组合缩放=1，视觉尺寸=布局尺寸），
 * 虚拟按键是画布下方的普通流元素 —— 用 margin-top 把它顶到面板下方，
 * 避免被面板盖住；简介再排到按键下方。
 */
function updateLayout() {
  const root = document.documentElement.style
  const stage = document.querySelector('.stage')
  if (!stage) return

  // 纯净全屏：横幅/面板都由 gameFs 的 CSS 直接管（隐藏或浮层居中），
  // 不需要"排到画布下方"的流式计算
  if (fsFit.value) {
    root.removeProperty('--banner-top')
    root.removeProperty('--pad-gap')
    if (!layoutRO) layoutRO = new ResizeObserver(() => updateLayout())
    observeEl('sheet', stage.querySelector('.sheet'))
    observeEl('pad', document.querySelector('.climb-pad'))
    return
  }

  const banner = stage.querySelector('.banner')
  const sheet = stage.querySelector('.sheet')
  const canvas = stage.querySelector('canvas')
  const pad = document.querySelector('.climb-pad')

  if (!layoutRO) layoutRO = new ResizeObserver(() => updateLayout())
  observeEl('sheet', sheet)
  observeEl('pad', pad)

  if (!banner) {
    root.removeProperty('--banner-top')
    root.removeProperty('--pad-gap')
    return
  }

  const s = stageScale.value
  const stageRect = stage.getBoundingClientRect()
  const canvasRect = canvas ? canvas.getBoundingClientRect() : null
  const sheetRect = sheet ? sheet.getBoundingClientRect() : null

  // 1) 虚拟按键(登杆)排到任务面板下方
  if (pad) {
    if (sheetRect && canvasRect) {
      root.setProperty('--pad-gap', (sheetRect.bottom + 10 - canvasRect.bottom) + 'px')
    } else {
      root.removeProperty('--pad-gap')
    }
  } else {
    root.removeProperty('--pad-gap')
  }

  // 2) 任务简介排到(按键/面板)下方
  let below = sheetRect ? sheetRect.bottom : (canvasRect ? canvasRect.bottom : stageRect.bottom)
  if (pad) {
    const padRect = pad.getBoundingClientRect()   // 读取时已应用上面的 margin
    below = Math.max(below, padRect.bottom)
  }
  const localTop = (below + BANNER_GAP - stageRect.top) / s
  root.setProperty('--banner-top', localTop + 'px')
}

/**
 * 应用时机：首屏 + 窗口尺寸变化（含移动端地址栏收起/展开、转屏）。
 *
 * ★ 所有回调都走 schedule()：resize/orientationchange 触发的那一刻，
 *   visualViewport 往往还读着【旧】视口值（尤其 iframe/转屏时序），
 *   rAF 延后一帧再算才是最终尺寸；同帧内多次事件合并成一次。
 */
let schedRAF = 0
let schedTimer = 0
function schedule() {
  update() // ① 立即算：即使后续补算被节流，也已按最新值算过一轮
  // ② 同帧多次事件合并，延后一帧再算一次，纠正"事件到达时 visualViewport 还是旧值"的时序问题
  if (!schedRAF) {
    const raf = window.requestAnimationFrame
    if (raf) {
      schedRAF = raf(() => { schedRAF = 0; update() })
    }
  }
  // ③ rAF 兜底：页面被判定为隐藏(document.hidden)/后台 WebView 时 rAF 不执行，
  //    用定时器保证转屏、全屏切换后仍会按最终尺寸重算
  if (!schedTimer) {
    schedTimer = setTimeout(() => { schedTimer = 0; update() }, 120)
  }
}

export function initStageFit() {
  // 用 schedule() 而不是裸 update()：首屏这一刻 visualViewport/布局未必已稳定，
  // schedule 会立即算一次，并在下一帧与 120ms 后各补算一次（同 resize 的处理）。
  schedule()
  window.addEventListener('resize', schedule)
  window.addEventListener('orientationchange', schedule)
  // 全屏进入/退出会改变可用视口（安卓还会顺带转屏），必须重算
  document.addEventListener('fullscreenchange', schedule)
  document.addEventListener('webkitfullscreenchange', schedule)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', schedule)
    // scrollend 也在某些 WebView 上触发视口变化（软键盘收起后）
    window.visualViewport.addEventListener('scrollend', schedule)
  }
  // 页面在隐藏状态完成的尺寸变化（后台转屏、WebView 不可见时改尺寸），
  // rAF 与 ResizeObserver 都不会投递回调 —— 恢复可见时补算一次
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) schedule()
  })
  window.addEventListener('pageshow', schedule)
  // 兜底：视口尺寸变化但没派发 resize（部分 WebView / iframe 尺寸变化）时靠 RO 补算。
  // 写入的 CSS 变量收敛后不再变化，RO 不会自激循环。
  if (window.ResizeObserver && document.documentElement) {
    new ResizeObserver(schedule).observe(document.documentElement)
  }
  // 任务面板/虚拟按键随关卡阶段、折叠、选项增减而增删 —— 观察 DOM 变化重排
  if (!layoutMO && document.body) {
    layoutMO = new MutationObserver(() => updateLayout())
    layoutMO.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })
  }
}
