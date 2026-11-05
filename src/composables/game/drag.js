// 拖拽管理 - 从各关卡文件中提取的公共逻辑
import { ref } from 'vue'

export function useDrag() {
  const stageRef = ref(null)
  
  function startDrag(e, onDrop) {
    e.preventDefault()
    const el = e.currentTarget
    const home = { parent: el.parentNode, next: el.nextSibling }
    const parent = el.offsetParent || stageRef.value
    const pr = parent.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const k = parent.offsetWidth && pr.width ? parent.offsetWidth / pr.width : 1
    const homeL = (r.left - pr.left) * k
    const homeT = (r.top - pr.top) * k
    const ox = e.clientX - r.left
    const oy = e.clientY - r.top
    document.body.appendChild(el)
    el.style.position = 'fixed'
    el.style.left = r.left + 'px'
    el.style.top = r.top + 'px'
    el.style.margin = '0'
    el.style.zIndex = 60
    el.classList.add('dragging')
    const rehome = () => {
      if (home.parent.contains(el)) return
      home.parent.insertBefore(el, home.next)
      el.style.position = 'absolute'
      el.style.left = homeL + 'px'
      el.style.top = homeT + 'px'
    }
    const restore = () => {
      rehome()
      el.classList.remove('dragging')
      el.style.zIndex = ''
    }
    // 多指：只响应按下时的那根手指，别的手指抬起/移动不能当成本次拖拽的投放
    const pid = e.pointerId
    const mine = ev => pid == null || ev.pointerId === pid
    const detach = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
    }
    const move = ev => {
      if (!mine(ev)) return
      el.style.left = (ev.clientX - ox) + 'px'
      el.style.top = (ev.clientY - oy) + 'px'
    }
    const up = ev => {
      if (!mine(ev)) return
      detach()
      el.classList.remove('dragging')
      onDrop(ev.clientX, ev.clientY, restore)
      rehome()
      el.style.zIndex = ''
    }
    // 系统手势/多指/来电等打断会派发 pointercancel 而不是 pointerup：
    // 此时不是一次投放，直接放回原位并摘掉监听，否则元件卡在 body 上，
    // 下一次任意 pointerup 还会被当成投放按那个坐标判对错。
    const cancel = ev => {
      if (!mine(ev)) return
      detach()
      restore()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
  }
  
  return { startDrag, stageRef }
}
