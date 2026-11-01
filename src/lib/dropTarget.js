// 拖拽投放的「碰撞体积」。
//
// 背景：各关卡的投放判定原本是"指针是否精确落在目标元素矩形内"。
// 手机端舞台按屏宽等比缩小后，可视目标往往只有几十个像素（例如测试区
// 164×86 画布单位，在 785×360 的横屏上只有 ~92×48 px），手指必须压得很准，
// 稍微偏一点就判"投放失败/放错位置"。
//
// 这里给判定范围统一放宽一圈（视觉像素），手指落在目标附近就算命中；
// 多个目标相邻时取"离中心最近"的那个，避免放宽后互相抢判定。

/** 容差：视觉像素（getBoundingClientRect 已是缩放后的 CSS 像素） */
export const DROP_PAD = 34

/** 分类区这类相邻网格用更小的容差，防止跨格误判 */
export const DROP_PAD_TIGHT = 10

/**
 * 点是否落在客户区矩形附近（rect 来自 getBoundingClientRect）。
 * @param {number} x 客户区 x
 * @param {number} y 客户区 y
 * @param {{left:number,top:number,right:number,bottom:number}} r
 * @param {number} pad 视觉像素容差
 */
export function nearRect(x, y, r, pad = DROP_PAD) {
  return (
    x >= r.left - pad &&
    x <= r.right + pad &&
    y >= r.top - pad &&
    y <= r.bottom + pad
  )
}

/**
 * 画布本地坐标下，点是否落在矩形附近（SLOTS 等用的是画布单位）。
 * @param {{x:number,y:number}} p 画布本地坐标
 * @param {{x:number,y:number,w:number,h:number}} r
 * @param {number} pad 画布单位容差（调用方按缩放比换算）
 */
export function nearBox(p, r, pad) {
  return (
    p.x >= r.x - pad &&
    p.x <= r.x + r.w + pad &&
    p.y >= r.y - pad &&
    p.y <= r.y + r.h + pad
  )
}

/**
 * 在若干矩形候选中挑「离中心最近」的一个（只考虑容差内的）。
 * 用户放宽容差后相邻目标会重叠，必须用最近优先而不是"第一个命中"。
 * @template T
 * @param {{x:number,y:number}} p 画布本地坐标
 * @param {T[]} list 每项需提供 x/y/w/h
 * @param {number} pad 画布单位容差
 * @returns {T|null}
 */
export function nearestBox(p, list, pad) {
  let best = null
  let bestD = Infinity
  for (const s of list) {
    if (!nearBox(p, s, pad)) continue
    const d = Math.hypot(p.x - (s.x + s.w / 2), p.y - (s.y + s.h / 2))
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return best
}

/**
 * 在一组「点 + 半径」目标中挑最近的（K2101 的隐患点铭牌）。
 * @template T
 * @param {{x:number,y:number}} p 画布本地坐标
 * @param {T[]} list 每项需提供 x/y
 * @param {number} radius 画布单位判定半径（已含容差）
 * @returns {T|null}
 */
export function nearestPoint(p, list, radius) {
  let best = null
  let bestD = Infinity
  for (const h of list) {
    const d = Math.hypot(p.x - h.x, p.y - h.y)
    if (d <= radius && d < bestD) {
      bestD = d
      best = h
    }
  }
  return best
}

/** 画布单位与视觉像素的换算比：视觉 1px 等于多少画布单位 */
export function padToCanvas(pad, canvasRect, canvasWidth) {
  if (!canvasRect || !canvasRect.width) return pad
  return (pad * canvasWidth) / canvasRect.width
}

/** 按元素 id 判单个目标（客户区坐标，含容差） */
export function hitElId(x, y, id, pad = DROP_PAD) {
  const el = document.getElementById(id)
  return !!el && nearRect(x, y, el.getBoundingClientRect(), pad)
}

/**
 * 按元素 id 取多个候选里「容差内离中心最近」的一个（客户区坐标）。
 * 用于分类区这类相邻网格：容差小一些，且不能"第一个命中"就算。
 * @param {string[]} ids
 * @returns {string|null}
 */
export function nearestElId(x, y, ids, pad = DROP_PAD_TIGHT) {
  let best = null
  let bestD = Infinity
  for (const id of ids) {
    const el = document.getElementById(id)
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (!nearRect(x, y, r, pad)) continue
    const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2))
    if (d < bestD) {
      bestD = d
      best = id
    }
  }
  return best
}
