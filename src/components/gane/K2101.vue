<template>
  <div class="game-page">
    <header class="hud">
      <span class="htitle">关卡 030101-K21-01 · 作业现场风险隐患辨识</span>
      <span class="cats"><i v-for="(c, k) in cats" :key="k">{{ k }} {{ c.got }}/{{ c.max }}</i></span>
      <span>得分 <b>{{ total }}/100</b></span>
      <span>失误 <b>{{ mistakes }}</b></span>
      <router-link to="/dashboard" class="exit">退出</router-link>
    </header>

    <div class="stage-wrap">
      <div class="stage" ref="stageRef">
        <canvas ref="canvasRef" width="960" height="640" @click="onCanvasClick"></canvas>

        <div class="banner" v-if="screen === 'play' && phase >= 0">
          <b>阶段 {{ phase + 1 }}/5 · {{ PHASES[phase].name }}</b>
          <span>{{ PHASES[phase].obj }}</span>
        </div>

        <div class="pause-badge" v-if="paused">⏸ 任务暂停中…</div>

        <div class="panel" ref="panelRef">
          <!-- 任务1：进入考位安全检查 -->
          <div v-if="phase === 0" class="sheet" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 1：进入考位安全检查</h3>
            <p class="tip">按规范穿戴个人防护用品。<b>未穿戴个人防护用品，禁止进入作业区域。</b></p>
            <div class="grid3">
              <div class="grp" v-for="(g, gi) in ppe.groups" :key="gi">
                <div class="glabel">{{ g.label }}</div>
                <button
                  v-for="o in g.opts"
                  :key="o"
                  class="opt"
                  :class="{ sel: ppe.sel[gi] === o }"
                  @click="ppe.sel[gi] = o; beep(500, .05)"
                ><img v-if="imgUrl(o)" class="optthumb" :src="imgUrl(o)" alt="">{{ o }}</button>
              </div>
            </div>
            <div class="row">
              <button class="btn primary" @click="p1Confirm">确认，进入现场</button>
            </div>
            <p class="status">系统检测：安全帽 <i>√</i>　工作服 <i>√</i>　绝缘鞋 <i>√</i>（随选择逐步确认）</p>
          </div>

          <!-- 任务2-4：隐患辨识 -->
          <div v-if="phase >= 1 && phase <= 3" class="sheet sheet-top" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 {{ phase + 1 }}：{{ currentZone.name }}风险隐患辨识</h3>
            <p class="tip">点击画面中<b>红色脉冲检查点</b>进行观察：先判断是否正常，发现隐患则选择对应铭牌。绿色圆点为正常设备。漏判危险点属严重错误。</p>
            <p class="status">
              已发现隐患 <b>{{ foundCount }}/{{ currentZone.hazards.length }}</b>　{{ currentZone.hazards.filter(h => h.done).map(h => h.plaque).join('　') || '——' }}
            </p>
          </div>

          <!-- 任务5：放置隐患铭牌 -->
          <div v-if="phase === 4" class="sheet sheet-top" :class="{ folded: !sheetOpen }">
            <button class="fold" @click="sheetOpen = !sheetOpen">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
            <h3>任务 5：放置隐患铭牌</h3>
            <p class="tip">将铭牌拖动到画面上对应编号的隐患点。<b>错误位置扣分，漏放隐患扣分。</b></p>
            <div class="plaque-tray">
              <div
                v-for="p in plaques"
                :key="p.id"
                v-show="!p.placed"
                class="plaque"
                @pointerdown="e => startDrag(e, (x, y, restore) => plaqueDrop(p, x, y, restore))"
              >{{ p.label }}</div>
            </div>
            <p class="status">已放置 <b>{{ placedCount }}/10</b></p>
          </div>
        </div>

        <!-- 现场检查弹窗 -->
        <div v-if="inspect.open" class="modal-mask" @click.self="closeInspect">
          <div class="modal">
            <h4>现场检查</h4>
            <p class="inspect-desc">{{ inspect.item ? inspect.item.desc : '' }}</p>
            <template v-if="!inspect.selecting">
              <div class="row">
                <button class="btn" @click="judgeSafe">经检查正常</button>
                <button class="btn primary" @click="judgeHazard">存在隐患</button>
              </div>
            </template>
            <template v-else>
              <p class="tip">选择对应的隐患铭牌：</p>
              <div class="row">
                <button
                  v-for="o in inspect.options"
                  :key="o"
                  class="btn"
                  @click="pickPlaque(o)"
                >{{ o }}</button>
              </div>
            </template>
          </div>
        </div>

        <div class="msg" :class="msgType">{{ msgText }}</div>

        <!-- 开始界面 -->
        <div v-if="screen === 'title'" class="overlay">
          <div class="panel-box">
            <div class="lv-code">030101-K21-01</div>
            <h2>作业现场风险隐患辨识</h2>
            <p class="sub">低压电工考证综合实训 · 风险辨识类 · 5项任务 · 满分100分</p>
            <div class="objs">
              <p>训练目标：作为现场安全检查人员，进入模拟电工作业现场，正确穿戴防护用品，发现不安全因素，判断风险类型，并将隐患铭牌放置到正确位置。</p>
              <ul>
                <li>进入考位安全检查</li>
                <li>移动电动工具隐患辨识</li>
                <li>登杆作业隐患辨识</li>
                <li>临时用电隐患辨识</li>
                <li>隐患铭牌放置</li>
              </ul>
            </div>
            <p class="fatal-note">⚠ 严重错误（暂停任务并重新检查）：漏掉重大触电风险 · 将危险点判断为正常 · 错误判断安全状态</p>
            <button class="btn primary big" @click="startGame">开始训练</button>
          </div>
        </div>

        <!-- 结算界面 -->
        <div v-if="screen === 'results'" class="overlay">
          <div class="panel-box">
            <h2>实训完成</h2>
            <table class="score-table">
              <tr v-for="(c, k) in cats" :key="k">
                <td>{{ k }}</td>
                <td>{{ c.got }}/{{ c.max }}</td>
              </tr>
              <tr class="total">
                <td>总分</td>
                <td>{{ total }}/100</td>
              </tr>
            </table>
            <div class="lv-stars">{{ '★'.repeat(stars) }}{{ '☆'.repeat(5 - stars) }}</div>
            <p class="verdict">{{ verdict }}</p>
            <div class="record-sec">
              <h4>风险发现</h4>
              <table class="mini-table">
                <tr><td>移动工具区域</td><td>{{ zoneDone(0) ? '√' : '×' }}</td></tr>
                <tr><td>登杆区域</td><td>{{ zoneDone(1) ? '√' : '×' }}</td></tr>
                <tr><td>临时用电区域</td><td>{{ zoneDone(2) ? '√' : '×' }}</td></tr>
              </table>
            </div>
            <div class="record-sec">
              <h4>隐患辨识清单</h4>
              <ul class="task-list">
                <li v-for="h in allHazards" :key="h.id">
                  <b>{{ h.done ? '✔' : '○' }}</b> {{ h.plaque }}
                </li>
              </ul>
            </div>
            <div class="record-sec">
              <h4>错误记录</h4>
              <p>失误次数：{{ mistakes }} 次（每次严重错误已暂停任务并扣分）</p>
            </div>
            <div class="row center">
              <button class="btn primary" @click="startGame">重新训练</button>
              <router-link to="/dashboard" class="btn">返回选关</router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useLevelAttempt } from '@/composables/levelAttempt'
import { triggerFatalExit } from '@/composables/fatalExit'
import { imgUrl } from '@/assets/imgmap'
import { DROP_PAD, nearestPoint, padToCanvas } from '@/lib/dropTarget.js'

// ================= 常量 =================
const W = 960, H = 640, GROUND = 520

const PHASES = [
  { name: '进入考位安全检查', cat: '安全防护', pts: 10, obj: '穿戴安全帽、工作服、绝缘鞋' },
  { name: '移动电动工具隐患辨识', cat: '风险辨识', pts: 25, obj: '辨识 3 处隐患' },
  { name: '登杆作业隐患辨识', cat: '风险辨识', pts: 25, obj: '辨识 3 处隐患' },
  { name: '临时用电隐患辨识', cat: '风险辨识', pts: 30, obj: '辨识 4 处隐患' },
  { name: '放置隐患铭牌', cat: '隐患标记', pts: 10, obj: '10 枚铭牌放置到对应隐患点' },
]

// ================= 现场数据（三个区域） =================
const zoneData = [
  {
    key: 'tool',
    name: '移动电动工具',
    hazards: [
      { id: 'h1', x: 135, y: 444, pts: 8, plaque: '导线绝缘破损', desc: '观察：电动工具 A 的电源线外皮破裂，内部导线裸露。', options: ['导线绝缘破损', '箱体接地不可靠', '未正确佩戴安全帽'], done: false, placed: false },
      { id: 'h2', x: 278, y: 403, pts: 8, plaque: '电源线未使用橡皮护套软电缆', desc: '观察：电源插板使用普通电源线，未使用橡皮护套软电缆。', options: ['电源线未使用橡皮护套软电缆', '同一开关控制多台设备', '作业区域未设置封闭护栏'], done: false, placed: false },
      { id: 'h3', x: 275, y: 470, pts: 9, plaque: '未配置漏电保护器', desc: '观察：Ⅱ类电动工具在金属平台上使用，供电回路未配置漏电保护器。', options: ['未配置漏电保护器', '配电箱内存在杂物', '登杆器材携带不符合要求'], done: false, placed: false },
    ],
    decoys: [
      { id: 'd1', x: 135, y: 391, desc: '观察：电动工具 A 外壳完整，防护罩齐全，转动正常。', checked: false },
      { id: 'd2', x: 100, y: 468, desc: '观察：工具台稳固，台面整洁无杂物。', checked: false },
    ],
  },
  {
    key: 'pole',
    name: '登杆作业',
    hazards: [
      { id: 'h4', x: 480, y: 372, pts: 8, plaque: '登杆器材携带不符合要求', desc: '观察：作业人员准备登杆，未携带脚扣、安全带、安全绳。', options: ['登杆器材携带不符合要求', '导线绝缘破损', '电缆未从规定出口出线'], done: false, placed: false },
      { id: 'h5', x: 480, y: 325, pts: 9, plaque: '未正确佩戴安全帽', desc: '观察：登杆人员头部未佩戴任何防护用品。', options: ['未正确佩戴安全帽', '电源线未使用橡皮护套软电缆', '箱体接地不可靠'], done: false, placed: false },
      { id: 'h6', x: 415, y: 508, pts: 8, plaque: '作业区域未设置封闭护栏', desc: '观察：电杆周围未设置封闭护栏，人员可随意进入。', options: ['作业区域未设置封闭护栏', '未配置漏电保护器', '配电箱内存在杂物'], done: false, placed: false },
    ],
    decoys: [
      { id: 'd3', x: 480, y: 250, desc: '观察：电杆杆身牢固，无裂纹、无倾斜。', checked: false },
    ],
  },
  {
    key: 'power',
    name: '临时用电',
    hazards: [
      { id: 'h7', x: 720, y: 514, pts: 8, plaque: '箱体接地不可靠', desc: '观察：配电箱箱体接地线连接松脱。', options: ['箱体接地不可靠', '未正确佩戴安全帽', '同一开关控制多台设备'], done: false, placed: false },
      { id: 'h8', x: 755, y: 428, pts: 7, plaque: '同一开关控制多台设备', desc: '观察：配电箱内一个开关同时控制三台设备，无法独立控制。', options: ['同一开关控制多台设备', '导线绝缘破损', '作业区域未设置封闭护栏'], done: false, placed: false },
      { id: 'h9', x: 882, y: 462, pts: 7, plaque: '电缆未从规定出口出线', desc: '观察：电缆从箱门缝隙穿出，未从箱体底部出线孔出线。', options: ['电缆未从规定出口出线', '登杆器材携带不符合要求', '未配置漏电保护器'], done: false, placed: false },
      { id: 'h10', x: 815, y: 498, pts: 8, plaque: '配电箱内存在杂物', desc: '观察：配电箱内部有工具、垃圾等杂物。', options: ['配电箱内存在杂物', '电源线未使用橡皮护套软电缆', '箱体接地不可靠'], done: false, placed: false },
    ],
    decoys: [
      { id: 'd4', x: 790, y: 402, desc: '观察：配电箱体完好，箱门可正常开合。', checked: false },
    ],
  },
]

// ================= 模板引用 =================
const stageRef = ref(null)
const canvasRef = ref(null)
const ctx = ref(null)

// ================= 流程状态 =================
const screen = ref('title')
const phase = ref(-1)
const sheetOpen = ref(true)
const doneCount = ref(0)
const lock = ref(false)
const paused = ref(false)
const mistakes = ref(0)

const cats = reactive({
  '安全防护': { got: 0, max: 10 },
  '风险辨识': { got: 0, max: 80 },
  '隐患标记': { got: 0, max: 10 },
})
const total = computed(() => Object.values(cats).reduce((a, c) => a + c.got, 0))

// 结算时向服务端交卷：由服务端校验考试时长与合格分，通过后才解锁下一关
const { reportResult } = useLevelAttempt()
watch(screen, v => { if (v === 'results') reportResult(total.value) })
const stars = computed(() => total.value >= 90 ? 5 : total.value >= 80 ? 4 : total.value >= 70 ? 3 : total.value >= 60 ? 2 : 1)
const verdict = computed(() => {
  const t = total.value
  if (t >= 90) return '具备现场安全风险辨识能力'
  if (t >= 80) return '基本具备现场安全风险辨识能力，注意细节'
  if (t >= 70) return '能够发现主要风险，但存在漏判'
  return '风险辨识能力不足，建议重新训练'
})

// ================= 音效 =================
let AC = null
function beep(f = 600, d = .08, type = 'sine') {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)()
    const o = AC.createOscillator(), g = AC.createGain()
    o.type = type; o.frequency.value = f
    g.gain.setValueAtTime(.12, AC.currentTime)
    g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + d)
    o.connect(g); g.connect(AC.destination)
    o.start(); o.stop(AC.currentTime + d)
  } catch (e) { /* 无音频环境时静默 */ }
}

// ================= 消息 =================
const msgText = ref('')
const msgType = ref('')
let msgTimer = null
function showMsg(text, type = 'info') {
  msgText.value = text
  msgType.value = type
  clearTimeout(msgTimer)
  msgTimer = setTimeout(() => { msgType.value = '' }, 2600)
}

// ================= 计分 =================
function addScore(cat, n) { cats[cat].got = Math.min(cats[cat].max, cats[cat].got + n) }
function penalize(cat, n) {
  cats[cat].got = Math.max(0, cats[cat].got - n)
  mistakes.value++
}
function completePhase(cat, pts) {
  if (lock.value) return
  lock.value = true
  addScore(cat, pts)
  showMsg(pts > 0 ? `✔ 阶段完成　+${pts} 分` : '✔ 阶段完成', 'good')
  beep(880, .12)
  later(() => { lock.value = false; enterPhase(phase.value + 1) }, 1400)
}

// ================= 严重错误：暂停当前任务并要求重新检查 =================
function majorViolation(reason, cat, penalty) {
  if (paused.value) return
  triggerFatalExit(reason)
  penalize(cat, penalty)
  showMsg(`严重错误：${reason} —— 当前任务已暂停，请重新检查（-${penalty} 分）`, 'bad')
  beep(120, .4, 'sawtooth')
  paused.value = true
  later(() => {
    paused.value = false
    showMsg('任务已恢复，请重新检查现场', 'info')
  }, 2400)
}

const timers = []
let runId = 0
function later(fn, ms) {
  const id = runId
  const t = setTimeout(() => { if (id === runId) fn() }, ms)
  timers.push(t)
}
function enterPhase(i) {
  phase.value = i
  sheetOpen.value = true
  doneCount.value = i
  paused.value = false
  if (i >= PHASES.length) { screen.value = 'results'; return }
  canvasRef.value.style.cursor = 'crosshair'
}

// ================= 拖拽 =================
// 拖动期间把元素临时挂到 body、按视口坐标跟随手指：
// 1) 不受舞台等比缩放影响（移动端舞台按屏宽缩放，家坐标要按显示比例换算）；
// 2) 不被任务面板的 overflow 裁剪（手机上面板在舞台外，拖拽要跨出面板）。
function startDrag(e, onDrop) {
  e.preventDefault()
  const el = e.currentTarget
  const home = { parent: el.parentNode, next: el.nextSibling }
  const parent = el.offsetParent || stageRef.value
  const pr = parent.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  // 容器实际显示比例（屏幕像素 / 本地像素），用于把家坐标换算回本地像素
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
    if (home.parent.contains(el)) return // 已由 restore() 放回
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
  const move = ev => {
    el.style.left = (ev.clientX - ox) + 'px'
    el.style.top = (ev.clientY - oy) + 'px'
  }
  const up = ev => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    el.classList.remove('dragging')
    onDrop(ev.clientX, ev.clientY, restore)
    rehome() // 放置成功时元素会被 v-if/v-show 隐藏，这里放回托盘（幂等）
    el.style.zIndex = ''
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

// ================= 任务 1：进入考位安全检查 =================
const ppe = reactive({
  groups: [
    { label: '安全帽', opts: ['普通帽', '电工安全帽', '无帽进入'], correct: '电工安全帽' },
    { label: '工作服', opts: ['电工作业服', '普通休闲服'], correct: '电工作业服' },
    { label: '绝缘鞋', opts: ['运动鞋', '劳保鞋', '绝缘鞋'], correct: '绝缘鞋' },
  ],
  sel: {},
})
function p1Confirm() {
  if (paused.value) return
  const ok = ppe.groups.every((g, i) => ppe.sel[i] === g.correct)
  if (ok) completePhase('安全防护', 10)
  else {
    penalize('安全防护', 2)
    showMsg('个人防护用品穿戴不合格，禁止进入作业区域（-2 分）', 'bad')
    beep(160, .2, 'sawtooth')
  }
}

// ================= 任务 2-4：隐患辨识 =================
const currentZone = computed(() => (phase.value >= 1 && phase.value <= 3) ? zoneData[phase.value - 1] : null)
const foundCount = computed(() => currentZone.value ? currentZone.value.hazards.filter(h => h.done).length : 0)

const inspect = reactive({ open: false, item: null, isHazard: false, selecting: false, options: [] })
function openInspect(item, isHazard) {
  if (paused.value || lock.value) return
  inspect.open = true
  inspect.item = item
  inspect.isHazard = isHazard
  inspect.selecting = false
  inspect.options = []
  beep(500, .05)
}
function closeInspect() {
  inspect.open = false
  inspect.item = null
  inspect.selecting = false
}
function judgeSafe() {
  if (!inspect.item) return
  if (inspect.isHazard) {
    const plaque = inspect.item.plaque
    inspect.open = false
    inspect.item = null
    majorViolation(`安全风险未识别：将危险点判断为正常（${plaque}）`, '风险辨识', 5)
  } else {
    inspect.item.checked = true
    inspect.open = false
    inspect.item = null
    showMsg('经检查无异常', 'good')
    beep(700, .06)
  }
}
function judgeHazard() {
  if (!inspect.item) return
  if (!inspect.isHazard) {
    penalize('风险辨识', 2)
    inspect.open = false
    inspect.item = null
    showMsg('错误判断：此处经检查无隐患（-2 分）', 'warn')
    beep(220, .1)
  } else {
    inspect.selecting = true
    inspect.options = inspect.item.options
  }
}
function pickPlaque(p) {
  if (!inspect.item) return
  if (p === inspect.item.plaque) {
    inspect.item.done = true
    addScore('风险辨识', inspect.item.pts)
    showMsg(`✔ 发现隐患：${p}　+${inspect.item.pts} 分`, 'good')
    beep(880, .12)
    inspect.open = false
    inspect.item = null
    inspect.selecting = false
    checkZoneComplete()
  } else {
    penalize('风险辨识', 2)
    showMsg(`铭牌错误：此处隐患应为「${inspect.item.plaque}」（-2 分）`, 'warn')
    beep(220, .1)
  }
}
function checkZoneComplete() {
  const zone = zoneData[phase.value - 1]
  if (zone.hazards.every(h => h.done)) {
    showMsg(`${zone.name}区域检查完成`, 'good')
    later(() => completePhase('风险辨识', 0), 1300)
  }
}
function zoneDone(i) {
  return zoneData[i].hazards.every(h => h.done)
}
const allHazards = computed(() => zoneData.flatMap(z => z.hazards))
// ================= 任务 5：放置隐患铭牌 =================
const plaques = ref([])
const placedCount = computed(() => plaques.value.filter(p => p.placed).length)
function plaqueDrop(p, x, y, restore) {
  const r = canvasRef.value.getBoundingClientRect()
  const cx = (x - r.left) * (W / r.width)
  const cy = (y - r.top) * (H / r.height)
  // 带容差 + 最近优先：42 画布单位的半径在缩小的舞台上只有二十几像素
  const pad = padToCanvas(DROP_PAD, r, W)
  const target = nearestPoint({ x: cx, y: cy }, allHazards.value.filter(h => !h.placed), 42 + pad)
  if (target && target.id === p.id) {
    target.placed = true
    p.placed = true
    addScore('隐患标记', 1)
    beep(760, .08)
    showMsg(`铭牌放置正确：${p.label}　+1 分`, 'good')
    if (plaques.value.every(pl => pl.placed)) {
      later(() => completePhase('隐患标记', 0), 1200)
    }
  } else {
    restore()
    if (target) {
      penalize('隐患标记', 1)
      showMsg(`铭牌放置错误：「${p.label}」不属于该隐患点（-1 分）`, 'warn')
      beep(220, .1)
    }
  }
}

// ================= 游戏流程 =================
function resetState() {
  zoneData.forEach(z => {
    z.hazards.forEach(h => { h.done = false; h.placed = false })
    z.decoys.forEach(d => { d.checked = false })
  })
  plaques.value = zoneData.flatMap(z => z.hazards.map(h => ({ id: h.id, label: h.plaque, placed: false })))
  ppe.sel = {}
  inspect.open = false; inspect.item = null; inspect.isHazard = false; inspect.selecting = false; inspect.options = []
  mistakes.value = 0
  paused.value = false
  Object.values(cats).forEach(c => { c.got = 0 })
}
function startGame() {
  runId++
  lock.value = false
  resetState()
  screen.value = 'play'
  enterPhase(0)
}

// ================= 画布交互 =================
function onCanvasClick(e) {
  if (screen.value !== 'play' || paused.value || lock.value) return
  if (phase.value < 1 || phase.value > 3) return
  const r = canvasRef.value.getBoundingClientRect()
  const x = (e.clientX - r.left) * (W / r.width)
  const y = (e.clientY - r.top) * (H / r.height)
  const zone = zoneData[phase.value - 1]
  for (const h of zone.hazards) {
    if (!h.done && Math.hypot(x - h.x, y - h.y) < 34) {
      openInspect(h, true)
      return
    }
  }
  for (const d of zone.decoys) {
    if (!d.checked && Math.hypot(x - d.x, y - d.y) < 28) {
      openInspect(d, false)
      return
    }
  }
}

// ================= 画布绘制 =================
function line(c, x1, y1, x2, y2) {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke()
}
function cloud(c, x, y) {
  c.beginPath()
  c.arc(x, y, 16, 0, Math.PI * 2)
  c.arc(x + 18, y + 3, 12, 0, Math.PI * 2)
  c.arc(x - 18, y + 4, 11, 0, Math.PI * 2)
  c.fill()
}
function drawToolZone() {
  const c = ctx.value
  // 工具台
  c.fillStyle = '#8b5a2b'; c.fillRect(60, 410, 230, 14)
  c.fillStyle = '#6f4520'; c.fillRect(70, 424, 10, 96); c.fillRect(270, 424, 10, 96)
  c.fillStyle = '#37474f'; c.font = '12px sans-serif'; c.textAlign = 'center'
  c.fillText('工具台', 175, 405)
  // 电动工具 A（电钻）
  c.fillStyle = '#37474f'; c.fillRect(105, 372, 60, 38)
  c.fillStyle = '#546e7a'; c.fillRect(165, 382, 22, 18)
  c.fillStyle = '#90a4ae'; c.fillRect(187, 386, 10, 10)
  c.fillStyle = '#2e7d32'; c.fillRect(115, 410, 12, 18)
  // 电源线（破损）
  c.strokeStyle = '#222'; c.lineWidth = 3
  c.beginPath(); c.moveTo(135, 428); c.lineTo(135, 448); c.lineTo(205, 448); c.stroke()
  // 破损处：外皮破裂 + 裸露导线
  c.strokeStyle = '#c62828'; c.lineWidth = 2
  c.beginPath(); c.moveTo(128, 436); c.lineTo(135, 444); c.lineTo(128, 452); c.stroke()
  // 电源插板
  c.fillStyle = '#78909c'; c.fillRect(205, 396, 60, 14)
  c.strokeStyle = '#37474f'; c.lineWidth = 1.5; c.strokeRect(205, 396, 60, 14)
  c.fillStyle = '#fff'
  for (let i = 0; i < 3; i++) c.fillRect(212 + i * 18, 400, 10, 6)
  // 插板电源线（普通细线，非橡皮护套）
  c.strokeStyle = '#333'; c.lineWidth = 1.5
  c.beginPath(); c.moveTo(265, 403); c.lineTo(290, 403); c.lineTo(290, 368); c.stroke()
  // 墙壁插座
  c.fillStyle = '#f5f5f5'; c.fillRect(280, 340, 22, 28)
  c.strokeStyle = '#333'; c.lineWidth = 1.5; c.strokeRect(280, 340, 22, 28)
  c.fillStyle = '#333'; c.fillRect(286, 346, 4, 6); c.fillRect(294, 346, 4, 6)
  // 金属平台
  c.fillStyle = '#90a4ae'; c.fillRect(245, 448, 60, 8)
  c.fillStyle = '#78909c'; c.fillRect(248, 456, 6, 64); c.fillRect(291, 456, 6, 64)
  c.fillStyle = '#37474f'; c.font = '11px sans-serif'; c.textAlign = 'center'
  c.fillText('金属平台', 275, 443)
  // Ⅱ类电动工具在金属平台上（小砂轮机）
  c.fillStyle = '#5d4037'; c.fillRect(252, 428, 34, 20)
  c.fillStyle = '#37474f'; c.beginPath(); c.arc(286, 438, 10, 0, Math.PI * 2); c.fill()
  // 直接供电（无漏电保护器）
  c.strokeStyle = '#333'; c.lineWidth = 2
  c.beginPath(); c.moveTo(235, 410); c.lineTo(235, 430); c.lineTo(260, 430); c.stroke()
  c.textAlign = 'left'
}
function drawClimber(c, x, y) {
  c.save()
  c.lineCap = 'round'
  const hipY = y - 36, shY = y - 62
  // 双腿张开踩踏
  c.strokeStyle = '#2b4a7a'; c.lineWidth = 6
  line(c, x - 6, hipY, x - 16, y + 2)
  line(c, x + 6, hipY, x + 16, y + 2)
  // 未系安全带（不画安全带）
  // 躯干
  c.strokeStyle = '#2b6cb0'; c.lineWidth = 11
  line(c, x, hipY, x, shY)
  // 双臂抓杆
  c.strokeStyle = '#2b4a7a'; c.lineWidth = 5
  line(c, x, shY + 8, x - 14, shY + 14)
  line(c, x, shY + 8, x + 14, shY + 14)
  // 头部（未戴安全帽）
  c.fillStyle = '#f2c89b'
  c.beginPath(); c.arc(x, shY - 13, 9, 0, Math.PI * 2); c.fill()
  c.restore()
}
function drawPoleZone() {
  const c = ctx.value
  const px = 480
  // 电杆
  c.fillStyle = '#8a6a35'; c.fillRect(px - 7, 130, 14, GROUND - 130)
  c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1
  for (let y = 160; y < GROUND - 10; y += 26) line(c, px - 6, y, px + 6, y + 5)
  // 横担
  c.fillStyle = '#6f5223'; c.fillRect(px - 58, 168, 116, 8)
  // 绝缘子
  c.fillStyle = '#37474f'; c.fillRect(px - 52, 159, 6, 9); c.fillRect(px + 46, 159, 6, 9)
  // 线路
  c.strokeStyle = '#4a4a4a'; c.lineWidth = 2
  line(c, px - 52, 166, 325, 150); line(c, px + 52, 166, 640, 150)
  // 杆根
  c.fillStyle = '#6d6d6d'; c.fillRect(px - 16, GROUND - 10, 32, 10)
  // 登杆人员（未戴安全帽、未携带登杆器材）
  drawClimber(c, px, 400)
  c.fillStyle = '#37474f'; c.font = '11px sans-serif'; c.textAlign = 'center'
  c.fillText('登杆人员', px, 440)
  c.textAlign = 'left'
}
function drawPowerZone() {
  const c = ctx.value
  const bx = 700, by = 390, bw = 180, bh = 130
  // 配电箱主体
  c.fillStyle = '#78909c'; c.fillRect(bx, by, bw, bh)
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.strokeRect(bx, by, bw, bh)
  // 箱门（左侧开启）
  c.fillStyle = '#90a4ae'
  c.beginPath()
  c.moveTo(bx, by); c.lineTo(bx - 38, by + 14); c.lineTo(bx - 38, by + bh - 10); c.lineTo(bx, by + bh)
  c.closePath(); c.fill()
  c.strokeStyle = '#37474f'; c.lineWidth = 2; c.stroke()
  // 箱内：一个开关
  c.fillStyle = '#37474f'; c.fillRect(735, 415, 40, 26)
  c.strokeStyle = '#111'; c.lineWidth = 1.5; c.strokeRect(735, 415, 40, 26)
  c.fillStyle = '#c62828'; c.fillRect(742, 422, 26, 12)
  // 三台设备（上方）
  ;[725, 775, 825].forEach(dx => {
    c.fillStyle = '#546e7a'; c.fillRect(dx, 348, 40, 30)
    c.strokeStyle = '#37474f'; c.lineWidth = 1.5; c.strokeRect(dx, 348, 40, 30)
  })
  // 开关到三台设备的电缆（一开关多设备）
  c.strokeStyle = '#4a4a4a'; c.lineWidth = 2
  line(c, 755, 415, 745, 378)
  line(c, 755, 415, 795, 378)
  line(c, 755, 415, 845, 378)
  // 电缆从箱门缝隙穿出（错误方式）
  c.strokeStyle = '#c62828'; c.lineWidth = 3
  c.beginPath(); c.moveTo(830, 455); c.lineTo(bx + bw, 462); c.lineTo(915, 462); c.stroke()
  // 正确的底部出线孔（空着）
  c.fillStyle = '#37474f'; c.beginPath(); c.arc(850, by + bh - 6, 7, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#f5f5f5'; c.font = '9px sans-serif'; c.textAlign = 'center'
  c.fillText('出线孔', 850, by + bh + 14)
  // 接地线松脱
  c.strokeStyle = '#7cb342'; c.lineWidth = 3
  c.beginPath(); c.moveTo(730, by + bh - 20); c.lineTo(730, by + bh + 2); c.lineTo(715, by + bh + 10); c.stroke()
  // 箱内杂物
  c.fillStyle = '#8d6e63'; c.fillRect(800, 490, 22, 16)
  c.fillStyle = '#eceff1'; c.fillRect(830, 496, 18, 12)
  c.fillStyle = '#a1887f'; c.fillRect(795, 500, 12, 10)
  c.fillStyle = '#37474f'; c.font = '12px sans-serif'; c.textAlign = 'center'
  c.fillText('临时用电配电箱', 790, 382)
  c.textAlign = 'left'
}
function drawHotspots(t) {
  const c = ctx.value
  if (phase.value >= 1 && phase.value <= 3) {
    const zone = zoneData[phase.value - 1]
    const pulse = 1 + 0.15 * Math.sin(t / 200)
    zone.hazards.forEach(h => {
      if (h.done) return
      c.strokeStyle = '#c62828'; c.lineWidth = 3
      c.beginPath(); c.arc(h.x, h.y, 22 * pulse, 0, Math.PI * 2); c.stroke()
      c.fillStyle = 'rgba(198,40,40,.92)'
      c.beginPath(); c.arc(h.x, h.y, 9, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#fff'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'
      c.fillText('!', h.x, h.y + 4)
    })
    zone.decoys.forEach(d => {
      if (d.checked) return
      c.strokeStyle = '#2e7d32'; c.lineWidth = 2
      c.beginPath(); c.arc(d.x, d.y, 14, 0, Math.PI * 2); c.stroke()
      c.fillStyle = '#2e7d32'
      c.beginPath(); c.arc(d.x, d.y, 5, 0, Math.PI * 2); c.fill()
    })
  }
  if (phase.value === 4) {
    // 编号隐患点 + 已放置铭牌标签
    let n = 0
    allHazards.value.forEach(h => {
      n++
      c.fillStyle = h.placed ? 'rgba(46,125,50,.92)' : 'rgba(198,40,40,.92)'
      c.beginPath(); c.arc(h.x, h.y, 14, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#fff'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'
      c.fillText(String(n), h.x, h.y + 4)
      if (h.placed) {
        c.font = '11px sans-serif'; c.textAlign = 'left'
        const w = c.measureText(h.plaque).width + 10
        c.fillStyle = 'rgba(255,255,255,.92)'
        c.fillRect(h.x + 18, h.y - 10, w, 20)
        c.strokeStyle = '#2e7d32'; c.lineWidth = 1; c.strokeRect(h.x + 18, h.y - 10, w, 20)
        c.fillStyle = '#1b5e20'
        c.fillText(h.plaque, h.x + 23, h.y + 4)
      }
    })
    c.textAlign = 'left'
  }
}
function drawScene(t) {
  const c = ctx.value
  // 天空
  const g = c.createLinearGradient(0, 0, 0, GROUND)
  g.addColorStop(0, '#79b6dd'); g.addColorStop(1, '#e6f2fa')
  c.fillStyle = g; c.fillRect(0, 0, W, GROUND)
  c.fillStyle = 'rgba(255,255,255,.85)'
  cloud(c, 120, 80); cloud(c, 500, 60); cloud(c, 830, 90)
  // 地面
  c.fillStyle = '#cbb689'; c.fillRect(0, GROUND, W, H - GROUND)
  c.fillStyle = '#ab976f'; c.fillRect(0, GROUND, W, 8)
  // 区域分隔线
  c.strokeStyle = 'rgba(60,70,80,.25)'; c.lineWidth = 2
  c.setLineDash([8, 8])
  line(c, 325, 140, 325, GROUND)
  line(c, 640, 140, 640, GROUND)
  c.setLineDash([])
  // 区域标签
  c.fillStyle = 'rgba(20,32,44,.85)'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'
  c.fillText('移动电动工具区', 175, 165)
  c.fillText('登杆作业区', 480, 118)
  c.fillText('临时用电区域', 790, 165)
  c.textAlign = 'left'
  drawToolZone()
  drawPoleZone()
  drawPowerZone()
  drawHotspots(t)
}

// ================= 主循环 =================
let raf = null
function loop(t) {
  drawScene(t)
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  ctx.value = canvasRef.value.getContext('2d')
  raf = requestAnimationFrame(loop)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  timers.forEach(id => clearTimeout(id))
  clearTimeout(msgTimer)
})
</script>
<style scoped>
.game-page {
  min-height: 100vh;
  background: #16202b;
  padding: 16px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', 'Segoe UI', sans-serif;
  color: #1c1e24;
}

/* ---------- HUD ---------- */
.hud {
  max-width: 960px;
  margin: 0 auto 10px;
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  color: #dfe7ee;
  background: #22303e;
  border: 1px solid #2f4156;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
}
.htitle { font-weight: 600; }
.cats { display: flex; gap: 12px; flex: 1; flex-wrap: wrap; }
.cats i { font-style: normal; color: #9fb4c6; font-variant-numeric: tabular-nums; }
.hud b { color: #ffd54f; font-variant-numeric: tabular-nums; }
.exit { margin-left: auto; color: #9fb4c6; text-decoration: none; }
.exit:hover { color: #fff; }

/* ---------- 舞台 ---------- */
.stage-wrap { max-width: 960px; margin: 0 auto; overflow-x: auto; }
.stage {
  position: relative;
  width: 960px;
  height: 640px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, .5);
  background: #79b6dd;
}
canvas { position: absolute; top: 0; right: 0; bottom: 0; left: 0; display: block; }

/* ---------- 阶段横幅 ---------- */
.banner {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 32, 44, .88);
  color: #fff;
  padding: 6px 18px;
  border-radius: 20px;
  font-size: 13px;
  display: flex;
  gap: 10px;
  align-items: baseline;
  pointer-events: none;
  white-space: nowrap;
  z-index: 5;
}
.banner span { color: #a9c3d8; font-size: 12px; }

/* ---------- 暂停提示 ---------- */
.pause-badge {
  position: absolute;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(198, 40, 40, .94);
  color: #fff;
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 15px;
  font-weight: 700;
  z-index: 45;
  pointer-events: none;
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .55; }
}

/* ---------- 交互层 ---------- */
.panel { position: absolute; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none; z-index: 10; }
.panel .sheet,
.panel .modal-mask { pointer-events: auto; }

.sheet {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  width: 880px;
  max-height: 310px;
  overflow-y: auto;
  background: rgba(255, 255, 255, .96);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, .25);
  padding: 14px 20px;
}
.sheet.sheet-top {
  bottom: auto;
  top: 46px;
  max-height: none;
}
.sheet.folded { max-height: 40px !important; overflow: hidden !important; padding-top: 8px !important; padding-bottom: 8px !important; }
.fold {
  position: absolute;
  right: 10px;
  top: 8px;
  border: 1px solid #c9d2dd;
  background: #f0f4fa;
  border-radius: 5px;
  padding: 2px 10px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  color: #4a5568;
  z-index: 2;
}
.fold:hover { background: #e3ebf7; }
.sheet h3 { margin: 0 0 6px; font-size: 16px; color: #122d94;  padding-right: 76px; }
.tip { margin: 2px 0 8px; font-size: 13px; color: #4a5568; }
.tip b { color: #1c1e24; }
.status { margin: 8px 0 0; font-size: 13px; color: #2b6cb0; background: #ebf3fc; border-radius: 6px; padding: 6px 10px; }
.status i { font-style: normal; color: #2e7d32; font-weight: 700; }
.status b { color: #122d94; }
.row { display: flex; gap: 10px; align-items: center; margin: 8px 0; flex-wrap: wrap; }
.row.center { justify-content: center; }

/* ---------- 按钮 ---------- */
.btn {
  border: 1px solid #c9d2dd;
  background: #fff;
  border-radius: 6px;
  padding: 7px 16px;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  color: #1c1e24;
  transition: background .15s, border-color .15s, color .15s;
}
.btn:hover:not(:disabled) { background: #f0f4fa; border-color: #9fb4c6; }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn.primary { background: #1a3fc4; border-color: #1a3fc4; color: #fff; }
.btn.primary:hover:not(:disabled) { background: #122d94; border-color: #122d94; }
.btn.big { font-size: 17px; padding: 12px 42px; }

/* ---------- 任务1：选项（3组） ---------- */
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 6px; }
.grp { border: 1px solid #dfe3ea; border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.glabel { font-weight: 700; font-size: 14px; color: #122d94; text-align: center; }
.opt { border: 1px solid #c9d2dd; background: #fff; border-radius: 5px; padding: 6px 4px; font-size: 13px; cursor: pointer; }
.opt .optthumb { display: block; width: 46px; height: 34px; object-fit: contain; margin: 0 auto 3px; background: #fff; border-radius: 3px; }
.opt:hover { background: #f0f4fa; }
.opt.sel { background: #1a3fc4; border-color: #1a3fc4; color: #fff; }

/* ---------- 检查弹窗 ---------- */
.modal-mask {
  position: absolute; top: 0; right: 0; bottom: 0; left: 0;
  background: rgba(15, 25, 35, .55);
  display: flex; align-items: center; justify-content: center;
  z-index: 30;
}
.modal {
  width: 480px;
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, .35);
}
.modal h4 { margin: 0 0 10px; color: #122d94; }
.inspect-desc {
  font-size: 15px; line-height: 1.6;
  background: #f6f8fa; border: 1px solid #eef1f5;
  border-radius: 8px; padding: 12px 14px; margin: 0 0 12px;
}

/* ---------- 铭牌托盘 ---------- */
.plaque-tray {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin: 8px 0;
}
.plaque {
  background: #fff8e1;
  border: 2px solid #f0b429;
  border-radius: 8px;
  padding: 9px 6px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  cursor: grab;
  touch-action: none;
  user-select: none;
  line-height: 1.35;
}
.plaque.dragging { opacity: .85; cursor: grabbing; box-shadow: 0 8px 18px rgba(0, 0, 0, .25); }

/* ---------- 消息 ---------- */
.msg {
  position: absolute;
  top: 56px;
  left: 50%;
  transform: translateX(-50%) translateY(-8px);
  background: rgba(20, 32, 44, .92);
  color: #fff;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  opacity: 0;
  transition: opacity .2s, transform .2s;
  pointer-events: none;
  z-index: 40;
  max-width: 80%;
  text-align: center;
}
.msg.show, .msg.info, .msg.good, .msg.warn, .msg.bad { opacity: 1; transform: translateX(-50%) translateY(0); }
.msg.good { background: rgba(46, 125, 50, .94); }
.msg.warn { background: rgba(240, 150, 30, .94); }
.msg.bad { background: rgba(198, 40, 40, .94); }

/* ---------- 覆盖层 ---------- */
.overlay {
  position: absolute; top: 0; right: 0; bottom: 0; left: 0;
  background: rgba(15, 25, 35, .82);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
  pointer-events: auto;
}
.panel-box {
  width: 600px;
  max-height: 92%;
  overflow-y: auto;
  background: #fff;
  border-radius: 12px;
  padding: 26px 34px;
  text-align: center;
  box-shadow: 0 16px 60px rgba(0, 0, 0, .45);
}
.panel-box h2 { margin: 6px 0; color: #122d94; font-size: 24px; }
.lv-code {
  display: inline-block;
  background: #1a3fc4; color: #fff;
  font-size: 13px; letter-spacing: .08em;
  padding: 3px 14px; border-radius: 14px;
}
.sub { color: #5d6370; font-size: 14px; margin: 4px 0; }
.objs { text-align: left; background: #f6f8fa; border-radius: 8px; padding: 12px 18px; margin: 12px 0; font-size: 14px; }
.objs ul { margin: 8px 0 0; padding-left: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; }
.fatal-note {
  color: #c62828; font-size: 13px; font-weight: 600;
  background: #fdecea; border: 1px solid #f3c6c6;
  border-radius: 6px; padding: 6px 10px; margin: 2px 0;
}
.lv-stars { font-size: 34px; color: #f0b429; letter-spacing: .1em; margin: 10px 0 2px; }
.verdict { color: #2b6cb0; font-size: 15px; margin: 6px 0 12px; }

.score-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 15px; }
.score-table td { padding: 7px 12px; border-bottom: 1px solid #eef1f5; text-align: left; }
.score-table td:last-child { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
.score-table tr.total td { border-top: 2px solid #122d94; border-bottom: none; font-size: 17px; color: #122d94; }

.record-sec {
  text-align: left;
  background: #f6f8fa;
  border: 1px solid #eef1f5;
  border-radius: 8px;
  padding: 10px 14px;
  margin: 8px 0;
  font-size: 14px;
}
.record-sec h4 { margin: 0 0 6px; color: #122d94; font-size: 14px; }
.record-sec p { margin: 4px 0; }
.mini-table { border-collapse: collapse; font-size: 14px; }
.mini-table td { border: 1px solid #dfe3ea; padding: 4px 14px; text-align: center; }
.task-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; font-size: 13px; }
.task-list b { color: #2e7d32; }

@media (max-width: 1000px) {
  .game-page { padding: 8px; }
}
</style>
