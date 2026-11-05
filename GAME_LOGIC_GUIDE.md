# 游戏逻辑使用指南

本指南说明如何使用重构后的公共逻辑来开发关卡。

## 📚 目录

1. [快速开始](#快速开始)
2. [公共逻辑详解](#公共逻辑详解)
3. [画布绘制工具](#画布绘制工具)
4. [关卡配置](#关卡配置)
5. [完整示例](#完整示例)
6. [常见问题](#常见问题)

---

## 🚀 快速开始

### 1. 导入公共逻辑

```javascript
import {
  useAudio,
  useMessage,
  useDrag,
  useTimer,
  useScore,
  useGame,
  LEVEL1_CONFIG
} from '@/composables/game/index.js'

// 导入画布绘制工具
import { line, rect, circle, txt, clearCanvas, drawGrid } from '@/utils/game/canvas.js'
```

### 2. 使用游戏管理器

```javascript
const config = LEVEL1_CONFIG
const PHASES = config.phases

const {
  beep,
  msgText,
  msgType,
  showMsg,
  startDrag,
  stageRef,
  later,
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
} = useGame(PHASES, config.categories)
```

### 3. 使用画布绘制工具

```javascript
function drawScene() {
  const c = canvasRef.value.getContext('2d')
  
  // 清空画布
  clearCanvas(c, 960, 640, '#87ceeb')
  
  // 绘制网格
  drawGrid(c, 960, 640, 50, '#ddd')
  
  // 绘制线条
  line(c, 0, 520, 960, 520, '#555', 3)
  
  // 绘制矩形
  rect(c, 100, 100, 200, 150, '#4CAF50', '#2E7D32')
  
  // 绘制圆形
  circle(c, 480, 320, 50, '#2196F3', '#1565C0')
  
  // 绘制文本
  txt(c, '你好世界', 480, 320, '#fff', '20px sans-serif')
}
```

---

## 🔧 公共逻辑详解

### 1. 音效管理 (`useAudio`)

```javascript
const { beep } = useAudio()

// 基本用法
beep(600, 0.08)  // 600Hz，持续 0.08 秒，正弦波
beep(880, 0.12)  // 880Hz，持续 0.12 秒，正弦波
beep(160, 0.25, 'sawtooth')  // 160Hz，持续 0.25 秒，锯齿波

// 常用音效
beep(500, 0.05)   // 按钮点击
beep(620, 0.06)   // 选择成功
beep(220, 0.1)    // 选择错误
beep(880, 0.12)   // 阶段完成
beep(160, 0.2, 'sawtooth')  // 严重错误
```

### 2. 消息提示管理 (`useMessage`)

```javascript
const { msgText, msgType, showMsg } = useMessage()

// 显示消息
showMsg('这是一条信息', 'info')      // 信息提示
showMsg('操作成功', 'good')          // 成功提示
showMsg('请注意安全', 'warn')        // 警告提示
showMsg('发生错误', 'bad')           // 错误提示

// 消息会自动在 2.6 秒后消失
```

### 3. 拖拽管理 (`useDrag`)

```javascript
const { startDrag, stageRef } = useDrag()

// 在模板中使用
<div @pointerdown="e => startDrag(e, onDrop)">拖拽元素</div>

// onDrop 回调
function onDrop(x, y, restore) {
  // x, y: 鼠标释放时的坐标
  // restore: 函数，调用可以将元素放回原位
  
  if (hitEl(x, y, 'target-zone')) {
    // 投放成功
    beep(700, 0.08)
  } else {
    // 投放失败，放回原位
    restore()
    showMsg('请拖到正确位置', 'warn')
  }
}
```

### 4. 计时器管理 (`useTimer`)

```javascript
const { later, setInterval: setInterval_, clearAll, reset } = useTimer()

// 延迟执行
later(() => {
  console.log('1秒后执行')
}, 1000)

// 间隔执行
const iv = setInterval(() => {
  console.log('每 500 毫秒执行一次')
}, 500)

// 清除所有定时器
clearAll()

// 重置计时器（重新开始）
reset()
```

### 5. 计分系统 (`useScore`)

```javascript
const {
  cats,
  mistakes,
  total,
  addScore,
  penalize,
  completePhase,
  stars,
  verdict
} = useScore(config.categories)

// 添加分数
addScore('安全防护', 10)

// 扣除分数
penalize('安全防护', 2)

// 完成阶段（自动添加分数并显示消息）
completePhase('安全防护', 10)

// 获取星级（1-5）
console.log(stars())  // 例如：4

// 获取评价文本
console.log(verdict())  // 例如：'符合规范，可独立完成作业'
```

### 6. 游戏管理器 (`useGame`)

```javascript
const game = useGame(PHASES, config.categories)

// 游戏流程控制
game.startGame()  // 开始游戏
game.enterPhase(0)  // 进入阶段 0
game.completePhase('安全防护', 10)  // 完成阶段
game.triggerFatal('重大违规')  // 触发重大违规

// 游戏状态
console.log(game.screen.value)  // 'title' | 'play' | 'results'
console.log(game.phase.value)   // 当前阶段索引
console.log(game.total.value)   // 当前总分
console.log(game.mistakes.value) // 失误次数
```

---

## 🎨 画布绘制工具

### 基础函数

```javascript
import { line, rect, circle, txt, clearCanvas, drawGrid } from '@/utils/game/canvas.js'

// 绘制线条
line(c, x1, y1, x2, y2, color, lineWidth)

// 绘制矩形
rect(c, x, y, width, height, fill, stroke, lineWidth)

// 绘制圆形
circle(c, x, y, radius, fill, stroke, lineWidth)

// 绘制文本
txt(c, text, x, y, color, font, align)

// 清空画布
clearCanvas(c, width, height, color)

// 绘制网格
drawGrid(c, width, height, step, color)
```

### 使用示例

```javascript
function drawScene() {
  const c = canvasRef.value.getContext('2d')
  
  // 清空画布
  clearCanvas(c, 960, 640, '#87ceeb')
  
  // 绘制网格
  drawGrid(c, 960, 640, 50, '#ddd')
  
  // 绘制地面
  line(c, 0, 520, 960, 520, '#555', 3)
  
  // 绘制电杆
  line(c, 350, 520, 350, 262, '#8B4513', 8)
  
  // 绘制安全围栏
  rect(c, 250, 432, 212, 102, 'transparent', '#d32f2f', 2)
  
  // 绘制警告牌
  rect(c, 443, 393, 118, 118, '#fdd835', '#222')
  txt(c, '警告', 502, 450, '#222', '20px sans-serif')
  
  // 绘制云朵
  circle(c, 100, 100, 16, '#fff', '#ccc', 1)
  circle(c, 118, 103, 12, '#fff', '#ccc', 1)
  circle(c, 82, 104, 11, '#fff', '#ccc', 1)
}
```

---

## ⚙️ 关卡配置

### 配置结构

```javascript
export const LEVEL1_CONFIG = {
  // 基本信息
  no: 1,
  code: 'K11-01',
  title: '安全用具使用与登杆作业',
  pass: 80,  // 合格分数
  time: 30,  // 考试时间（分钟）
  
  // 画布尺寸
  W: 960,
  H: 640,
  
  // 场景常量
  GROUND: 520,
  POLE_X: 350,
  PXM: 50,  // 每米像素数
  ANCHOR: { x: 350, y: 262 },
  
  // 阶段配置
  phases: [
    {
      name: '阶段名称',
      cat: '分类名称',
      pts: 10,  // 分值
      obj: '阶段目标描述'
    },
    // ... 更多阶段
  ],
  
  // 分类配置
  categories: {
    '安全防护': { got: 0, max: 20 },
    '工具检查': { got: 0, max: 20 },
    // ... 更多分类
  },
  
  // PPE 配置
  ppe: [
    {
      label: '安全帽',
      opts: ['普通帽', '电工安全帽', '建筑帽'],
      correct: '电工安全帽'
    },
    // ... 更多 PPE
  ],
  
  // 穿戴步骤
  wearSteps: [
    ['安全帽', '调整帽带'],
    ['安全帽', '锁紧'],
    // ... 更多步骤
  ],
  
  // 其他配置...
}
```

### 使用配置

```javascript
import { LEVEL1_CONFIG } from '@/composables/game/config.js'

const config = LEVEL1_CONFIG

// 使用配置
const W = config.W
const H = config.H
const PHASES = config.phases
const CATEGORIES = config.categories
```

---

## 📝 完整示例

### 创建新关卡

```vue
<template>
  <div class="game-page">
    <!-- 顶部 HUD -->
    <header class="hud">
      <span class="htitle">关卡 {{ config.code }} · {{ config.title }}</span>
      <span class="cats"><i v-for="(c, k) in cats" :key="k">{{ k }} {{ c.got }}/{{ c.max }}</i></span>
      <span>得分 <b>{{ total }}/100</b></span>
      <span>失误 <b>{{ mistakes }}</b></span>
      <router-link to="/dashboard" class="exit">退出</router-link>
    </header>

    <div class="stage-wrap">
      <div class="stage" ref="stageRef">
        <canvas ref="canvasRef" width="960" height="640" @click="onCanvasClick"></canvas>

        <!-- 阶段横幅 -->
        <div class="banner" v-if="screen === 'play' && phase >= 0">
          <b>阶段 {{ phase + 1 }}/{{ PHASES.length }} · {{ PHASES[phase].name }}</b>
          <span>{{ PHASES[phase].obj }}</span>
        </div>

        <!-- 交互层 -->
        <div class="panel" ref="panelRef">
          <!-- 根据阶段显示不同内容 -->
          <div v-for="(p, i) in PHASES" :key="i" v-if="phase === i" class="sheet">
            <!-- 阶段特定内容 -->
          </div>
        </div>

        <!-- 消息提示 -->
        <div class="msg" :class="msgType">{{ msgText }}</div>

        <!-- 开始界面 -->
        <div v-if="screen === 'title'" class="overlay">
          <!-- 开始界面内容 -->
        </div>

        <!-- 结算界面 -->
        <div v-if="screen === 'results'" class="overlay">
          <!-- 结算界面内容 -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useGame, LEVEL1_CONFIG } from '@/composables/game/index.js'
import { imgUrl } from '@/assets/imgmap'

const config = LEVEL1_CONFIG
const PHASES = config.phases

const {
  beep,
  msgText,
  msgType,
  showMsg,
  startDrag,
  stageRef,
  later,
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
} = useGame(PHASES, config.categories)

// 关卡特定逻辑
function onCanvasClick(e) {
  if (screen.value !== 'play') return
  const r = canvasRef.value.getBoundingClientRect()
  const x = (e.clientX - r.left) * (config.W / r.width)
  const y = (e.clientY - r.top) * (config.H / r.height)
  
  // 根据阶段处理点击
  if (phase.value === 0) {
    // 阶段 0 的点击逻辑
  }
}

onMounted(() => {
  const c = canvasRef.value
  c.width = config.W
  c.height = config.H
  drawScene()
})

watch([phase], drawScene)

function drawScene() {
  const c = canvasRef.value.getContext('2d')
  // 绘制场景
}
</script>
```

---

## ❓ 常见问题

### Q1: 如何修改音效？

**A:** 修改 `composables/game/audio.js` 中的 `beep` 函数：

```javascript
function beep(f = 600, d = .08, type = 'sine') {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)()
    const o = AC.createOscillator(), g = AC.createGain()
    o.type = type; o.frequency.value = f
    g.gain.setValueAtTime(.12, AC.currentTime)  // 修改这里的音量
    g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + d)
    o.connect(g); g.connect(AC.destination)
    o.start(); o.stop(AC.currentTime + d)
  } catch (e) { /* 无音频环境时静默 */ }
}
```

### Q2: 如何修改消息显示时间？

**A:** 修改 `composables/game/message.js` 中的 `showMsg` 函数：

```javascript
function showMsg(text, type = 'info') {
  msgText.value = text
  msgType.value = type
  clearTimeout(msgTimer)
  msgTimer = setTimeout(() => { msgType.value = '' }, 2600)  // 修改这里的时间
}
```

### Q3: 如何添加新的关卡？

**A:** 在 `composables/game/config.js` 中添加新关卡配置：

```javascript
export const LEVEL5_CONFIG = {
  no: 5,
  code: 'K11-05',
  title: '新关卡标题',
  // ... 其他配置
}

// 在 LEVELS_CONFIG 中注册
export const LEVELS_CONFIG = {
  1: LEVEL1_CONFIG,
  2: LEVEL2_CONFIG,
  5: LEVEL5_CONFIG,
  // ... 其他关卡
}
```

### Q4: 如何调试游戏逻辑？

**A:** 使用浏览器的开发者工具：

```javascript
// 在游戏逻辑中添加调试信息
console.log('当前阶段:', phase.value)
console.log('当前分数:', total.value)
console.log('失误次数:', mistakes.value)

// 或者使用 Vue Devtools 查看组件状态
```

### Q5: 如何优化性能？

**A:** 减少画布重绘和状态更新：

```javascript
// 使用 watch 优化画布绘制
watch([phase, S], drawScene, { deep: true })

// 避免频繁的状态更新
function updateScore(cat, pts) {
  // 使用 nextTick 确保状态更新后再绘制
  nextTick(() => {
    drawScene()
  })
}
```

---

## 📚 相关资源

- [重构总结文档](./REFACTOR_SUMMARY.md)
- [公共逻辑源码](./src/composables/game/)
- [画布绘制工具](./src/utils/game/canvas.js)
- [关卡配置](./src/composables/game/config.js)

---

## 🤝 贡献

如果你在使用过程中发现问题或有改进建议，请：

1. 提交 Issue 描述问题
2. 提交 Pull Request 修复问题
3. 更新相关文档

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE) 文件。
