// 手机端关卡页「纯净全屏」：
//   1) 进入关卡自动请求全屏 + 锁横屏（Android WebView / 移动浏览器 best-effort）；
//   2) 舞台从"只按屏宽缩放"改为"宽高双向 fit 并居中"，画布尽量铺满整屏；
//   3) 纯净模式默认开启：隐藏任务面板/横幅/消息/HUD 等所有文字层，只留画布；
//      右下角「☰」可随时临时呼出任务面板（覆盖式居中卡片，不退出全屏）。
//
// ★ 兼容性说明：
//   - requestFullscreen 必须在用户手势内调用；从选关页点卡片跳转后调用通常仍处于
//     手势激活期，但 iOS Safari 不支持对普通元素全屏 —— 失败一律静默降级，
//     降级后仍走"视口铺满"布局（只是还有浏览器地址栏）。
//   - screen.orientation.lock 仅在全屏且 Android 上可用，失败静默。
import { ref } from 'vue'
import { setFsFit } from './stageFit.js'

/**
 * 全屏铺满模式：html.game-fs。
 * 两处复用，靠 html 上的另一个 class 区分形态：
 *   - 选关页（dashboard / privacy）→ 追加 .dashboard-fs：铺满横屏，但【保留全部文字】
 *   - 关卡页（/game/*）→ 不追加，走原「纯净模式」：铺满且隐藏画布外文字
 * 这是样式开关，与全屏 API 是否成功无关。
 */
export const fsOn = ref(false)

/** 任务面板是否被临时呼出（纯净模式下默认隐藏） */
export const panelOpen = ref(false)

/**
 * 是否处于纯净形态（隐藏文字）：仅关卡页。
 * 选关页进全屏但仍需读关卡标题、点按钮，因此永不受纯净规则影响。
 */
export const pureMode = ref(false)

/** 是否进入关卡纯净铺满布局：粗指针（触屏）或窄屏（与 mobile.css 的 1007px 断点一致） */
function wantsFsLayout() {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1008
}

/** 是否该抢占全屏：仅触屏设备 —— 桌面窄窗口同样铺满布局，但不打断用户的窗口 */
function wantsFullscreenApi() {
  return window.matchMedia('(pointer: coarse)').matches
}

/** 把状态同步到 <html> class，供 mobile.css 的 html.game-fs 规则使用 */
function syncClass() {
  const el = document.documentElement
  el.classList.toggle('game-fs', fsOn.value)
  el.classList.toggle('dashboard-fs', fsOn.value && !pureMode.value)
  el.classList.toggle('panel-open', panelOpen.value)
}

/**
 * 进入全屏铺满（选关页与关卡页共用）。
 * @param {boolean} pure 纯净形态？关卡页 true（隐藏画布外文字），选关页 false
 */
export async function enterFs(pure = false) {
  if (!wantsFsLayout()) return
  fsOn.value = true
  pureMode.value = pure
  panelOpen.value = false
  syncClass()
  setFsFit(true) // 先切布局，全屏 API 成败与否都铺满

  if (wantsFullscreenApi()) {
    try {
      const el = document.documentElement
      const req = el.requestFullscreen || el.webkitRequestFullscreen
      if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
        await req.call(el)
      }
    } catch (e) {
      // 无手势/iOS 不支持：静默降级，页面仍按视口铺满
    }
  }

  try {
    const lock = window.screen && window.screen.orientation && window.screen.orientation.lock
    if (lock && document.fullscreenElement) {
      await lock.call(window.screen.orientation, 'landscape')
    }
  } catch (e) {
    // 不支持锁向（iOS / 部分 WebView）：保持用户当前方向
  }
}

export function exitFs() {
  if (!fsOn.value) return
  fsOn.value = false
  pureMode.value = false
  panelOpen.value = false
  syncClass()
  setDragVeil(false) // 拖到一半退出关卡：别把 dragging 残留到选关页
  setFsFit(false)

  try {
    const exit = document.exitFullscreen || document.webkitExitFullscreen
    if (exit && (document.fullscreenElement || document.webkitFullscreenElement)) {
      exit.call(document)
    }
  } catch (e) { /* 忽略 */ }

  try {
    const unlock = window.screen && window.screen.orientation && window.screen.orientation.unlock
    if (unlock) unlock.call(window.screen.orientation)
  } catch (e) { /* 忽略 */ }
}

/** 右下角「☰」：临时呼出/收起任务面板 */
export function toggleText() {
  panelOpen.value = !panelOpen.value
  syncClass()
}

/**
 * 按「当前路由 + 当前视口」重新对齐全屏铺满状态（幂等，状态一致时什么都不做）。
 *
 * 触发时机：路由切换、以及窗口尺寸跨过断点（桌面窗口拉宽/拉窄到 1008px）——
 * 只在路由进入时判定一次的话，断点变化后会停留在旧状态：
 * 例如桌面窄窗进入选关页后把窗口拉宽，页面仍被锁在一屏高度里。
 *
 * 注意：enterFs 内部第一步就会重新检查 wantsFsLayout()，
 * 桌面宽屏（非触屏且 >1008px）不会去抢全屏 API。
 */
export function reconcileFs(path) {
  const pure = path.startsWith('/game/')
  // 落地页与选关页：铺满但保留文字（进入纯净模式会看不到标题和按钮）
  const useText = path === '/' || path === '/dashboard'
  const want = wantsFsLayout() && (pure || useText)

  if (want) {
    // 形态没变就不动：避免 resize 洪水里反复 requestFullscreen
    if (!fsOn.value || pureMode.value !== pure) enterFs(pure)
  } else if (fsOn.value) {
    exitFs()
  }
}

/* ==================== 拖拽期间让位（纯净模式配套） ====================
 * 纯净模式下任务面板是"视口居中的浮层卡片 + 画布暗纱"，几乎盖满整屏；
 * 而围栏/标示牌/脚扣/铭牌的投放区长在画布上 —— 按住拖拽物时面板还压着，
 * 等于盲投。所以：【按住拖拽物 → 浮层与暗纱一起消失，松手 → 自动回来】。
 *
 * 实现要点：
 * - 判定挂在 document 的【冒泡】阶段 —— 必须晚于各关卡 startDrag（目标阶段），
 *   因为 startDrag 要先量原位/按下偏移；顺序是"量完 → 搬到 body → 再藏面板"。
 *   拖拽物会被 startDrag 临时搬到 body（position:fixed），不受 .sheet 隐藏影响，全程可见。
 * - 拖拽物命中走 getBoundingClientRect（不依赖元素在最上层），所以隐藏浮层
 *   不会破坏投放判定，反而让画布上的投放区露出、能对准。
 * - 例外：任务12「安全标识」的托盘 .tray 与投放区 .zones 长在同一个 .sheet 里，
 *   整块隐藏会让 .zones 的 rect 归零、永远投不中 —— 该面板标了 .sheet-inline 不隐藏。
 * ======================================================================= */

/** 可拖拽物（各关卡里绑定 startDrag 的那几类元素） */
const DRAGGABLE_SEL = '.chip, .sign-card:not(.locked), .plaque'

function setDragVeil(on) {
  document.documentElement.classList.toggle('dragging', on)
}

export function initDragVeil() {
  // ★ 必须挂在【冒泡】阶段：目标阶段才是各关卡自己的 startDrag，
  //   它要先 getBoundingClientRect() 量出拖拽物的原位与按下偏移。
  //   若在捕获阶段就给 .sheet 加 display:none，rect 会全 0 →
  //   ox/oy/homeL/homeT 全错、拖拽物瞬间飞出屏幕。
  //   document 冒泡晚于目标阶段，顺序正好是：量完 → 搬到 body → 再藏面板。
  document.addEventListener('pointerdown', (e) => {
    const t = e.target
    if (t && typeof t.closest === 'function' && t.closest(DRAGGABLE_SEL)) setDragVeil(true)
  })

  // 同步摘掉即可：本监听器与各关卡 startDrag 的 pointerup 属于同一次事件派发，
  // 中间不会有绘制 —— 面板恢复时拖拽物已被放回托盘，不会闪一帧。
  // （本监听器在 initDragVeil 时注册，早于任何 startDrag 的注册顺序）
  window.addEventListener('pointerup', () => setDragVeil(false))
  window.addEventListener('pointercancel', () => setDragVeil(false))
  window.addEventListener('blur', () => setDragVeil(false))

  // 兜底：拖到一半切后台，pointerup/pointercancel 都可能不送达；
  // 残留的 dragging 会让面板一直显示不出来，恢复可见时必须清掉。
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setDragVeil(false)
  })
}
