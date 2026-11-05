# 测试指南

本指南说明如何测试重构后的公共逻辑。

## 📚 目录

1. [测试环境设置](#测试环境设置)
2. [单元测试](#单元测试)
3. [集成测试](#集成测试)
4. [测试示例](#测试示例)
5. [测试覆盖率](#测试覆盖率)

---

## 🔧 测试环境设置

### 1. 安装测试依赖

```bash
npm install --save-dev vitest @vue/test-utils happy-dom
```

### 2. 配置 Vitest

创建 `vitest.config.js`：

```javascript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/composables/game/**', 'src/utils/game/**'],
    },
  },
})
```

### 3. 添加测试脚本

在 `package.json` 中添加：

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 🧪 单元测试

### 1. 音效测试 (`audio.test.js`)

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAudio } from '../composables/game/audio.js'

describe('useAudio', () => {
  let audio
  
  beforeEach(() => {
    // Mock AudioContext
    global.AudioContext = vi.fn(() => ({
      createOscillator: vi.fn(() => ({
        type: 'sine',
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      createGain: vi.fn(() => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      })),
      destination: {},
      currentTime: 0,
    }))
    
    audio = useAudio()
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })
  
  it('应该创建 AudioContext', () => {
    expect(global.AudioContext).toHaveBeenCalled()
  })
  
  it('beep 函数应该被调用', () => {
    const spy = vi.spyOn(audio, 'beep')
    audio.beep(600, 0.08)
    expect(spy).toHaveBeenCalledWith(600, 0.08, 'sine')
  })
  
  it('beep 函数应该处理错误', () => {
    // Mock AudioContext 抛出错误
    global.AudioContext = vi.fn(() => {
      throw new Error('AudioContext not available')
    })
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // 不应该抛出错误
    expect(() => audio.beep()).not.toThrow()
    
    consoleSpy.mockRestore()
  })
})
```

### 2. 消息测试 (`message.test.js`)

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useMessage } from '../composables/game/message.js'

describe('useMessage', () => {
  let message
  
  beforeEach(() => {
    vi.useFakeTimers()
    message = useMessage()
  })
  
  afterEach(() => {
    vi.useRealTimers()
  })
  
  it('应该显示消息', () => {
    message.showMsg('测试消息', 'info')
    expect(message.msgText.value).toBe('测试消息')
    expect(message.msgType.value).toBe('info')
  })
  
  it('应该在 2.6 秒后清除消息', () => {
    message.showMsg('测试消息', 'info')
    expect(message.msgText.value).toBe('测试消息')
    
    // 快进 2.6 秒
    vi.advanceTimersByTime(2600)
    
    expect(message.msgType.value).toBe('')
  })
  
  it('应该支持不同类型的消息', () => {
    message.showMsg('成功', 'good')
    expect(message.msgType.value).toBe('good')
    
    message.showMsg('警告', 'warn')
    expect(message.msgType.value).toBe('warn')
    
    message.showMsg('错误', 'bad')
    expect(message.msgType.value).toBe('bad')
  })
  
  it('应该清除之前的定时器', () => {
    message.showMsg('消息1', 'info')
    vi.advanceTimersByTime(1300)  // 一半时间
    
    message.showMsg('消息2', 'info')
    expect(message.msgText.value).toBe('消息2')
    
    vi.advanceTimersByTime(1300)  // 另一半时间
    expect(message.msgType.value).toBe('info')  // 消息2 还在显示
    
    vi.advanceTimersByTime(1300)  // 消息2 的剩余时间
    expect(message.msgType.value).toBe('')  // 消息2 被清除
  })
})
```

### 3. 计分测试 (`score.test.js`)

```javascript
import { describe, it, expect } from 'vitest'
import { useScore } from '../composables/game/score.js'

describe('useScore', () => {
  const categories = {
    '安全防护': { got: 0, max: 20 },
    '工具检查': { got: 0, max: 20 },
    '登杆操作': { got: 0, max: 25 },
  }
  
  it('应该初始化分数', () => {
    const score = useScore(categories)
    expect(score.cats['安全防护'].got).toBe(0)
    expect(score.cats['工具检查'].got).toBe(0)
    expect(score.cats['登杆操作'].got).toBe(0)
  })
  
  it('应该添加分数', () => {
    const score = useScore(categories)
    score.addScore('安全防护', 10)
    expect(score.cats['安全防护'].got).toBe(10)
  })
  
  it('不应该超过最大分数', () => {
    const score = useScore(categories)
    score.addScore('安全防护', 30)
    expect(score.cats['安全防护'].got).toBe(20)
  })
  
  it('应该扣除分数', () => {
    const score = useScore(categories)
    score.addScore('安全防护', 10)
    score.penalize('安全防护', 5)
    expect(score.cats['安全防护'].got).toBe(5)
  })
  
  it('不应该低于 0 分', () => {
    const score = useScore(categories)
    score.penalize('安全防护', 10)
    expect(score.cats['安全防护'].got).toBe(0)
  })
  
  it('应该计算总分', () => {
    const score = useScore(categories)
    score.addScore('安全防护', 10)
    score.addScore('工具检查', 15)
    score.addScore('登杆操作', 20)
    expect(score.total.value).toBe(45)
  })
  
  it('应该返回正确的星级', () => {
    const score = useScore(categories)
    
    // 1 星
    score.addScore('安全防护', 10)
    expect(score.stars()).toBe(1)
    
    // 2 星
    score.addScore('工具检查', 15)
    expect(score.stars()).toBe(2)
    
    // 3 星
    score.addScore('登杆操作', 20)
    expect(score.stars()).toBe(3)
  })
  
  it('应该返回正确的评价文本', () => {
    const score = useScore(categories)
    
    expect(score.verdict()).toBe('存在安全风险，建议重新训练')
    
    score.addScore('安全防护', 20)
    expect(score.verdict()).toBe('基本掌握操作流程，注意安全细节')
    
    score.addScore('工具检查', 20)
    expect(score.verdict()).toBe('符合规范，可独立完成作业')
  })
})
```

### 4. 计时器测试 (`timer.test.js`)

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTimer } from '../composables/game/timer.js'

describe('useTimer', () => {
  let timer
  
  beforeEach(() => {
    vi.useFakeTimers()
    timer = useTimer()
  })
  
  afterEach(() => {
    vi.useRealTimers()
  })
  
  it('应该延迟执行函数', () => {
    const callback = vi.fn()
    timer.later(callback, 1000)
    
    expect(callback).not.toHaveBeenCalled()
    
    vi.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledTimes(1)
  })
  
  it('应该清除定时器', () => {
    const callback = vi.fn()
    timer.later(callback, 1000)
    
    timer.clearAll()
    
    vi.advanceTimersByTime(1000)
    expect(callback).not.toHaveBeenCalled()
  })
  
  it('应该支持间隔执行', () => {
    const callback = vi.fn()
    timer.setInterval(callback, 500)
    
    vi.advanceTimersByTime(1500)
    expect(callback).toHaveBeenCalledTimes(3)
  })
  
  it('应该重置计时器', () => {
    const callback = vi.fn()
    timer.later(callback, 1000)
    
    timer.reset()
    
    vi.advanceTimersByTime(1000)
    expect(callback).not.toHaveBeenCalled()
  })
})
```

---

## 🔗 集成测试

### 1. 游戏管理器测试 (`game.test.js`)

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGame } from '../composables/game/index.js'
import { LEVEL1_CONFIG } from '../composables/game/config.js'

describe('useGame', () => {
  let game
  const config = LEVEL1_CONFIG
  
  beforeEach(() => {
    game = useGame(config.phases, config.categories)
  })
  
  it('应该初始化游戏', () => {
    expect(game.screen.value).toBe('title')
    expect(game.phase.value).toBe(-1)
    expect(game.total.value).toBe(0)
    expect(game.mistakes.value).toBe(0)
  })
  
  it('应该开始游戏', () => {
    game.startGame()
    expect(game.screen.value).toBe('play')
    expect(game.phase.value).toBe(0)
  })
  
  it('应该进入下一阶段', () => {
    game.startGame()
    game.enterPhase(1)
    expect(game.phase.value).toBe(1)
  })
  
  it('应该完成阶段', () => {
    game.startGame()
    game.completePhase('安全防护', 10)
    expect(game.cats['安全防护'].got).toBe(10)
  })
  
  it('应该触发重大违规', () => {
    game.startGame()
    game.triggerFatal('测试违规')
    expect(game.screen.value).toBe('results')
  })
  
  it('应该计算正确的总分', () => {
    game.startGame()
    game.completePhase('安全防护', 10)
    game.completePhase('工具检查', 15)
    game.completePhase('登杆操作', 20)
    expect(game.total.value).toBe(45)
  })
})
```

### 2. 画布绘制测试 (`canvas.test.js`)

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { line, rect, circle, txt, clearCanvas, drawGrid } from '../utils/game/canvas.js'

describe('canvas drawing', () => {
  let ctx
  
  beforeEach(() => {
    ctx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      clearRect: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'center',
    }
  })
  
  it('应该绘制线条', () => {
    line(ctx, 0, 0, 100, 100, '#000', 2)
    
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0)
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 100)
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.strokeStyle).toBe('#000')
    expect(ctx.lineWidth).toBe(2)
  })
  
  it('应该绘制矩形', () => {
    rect(ctx, 10, 10, 100, 50, '#fff', '#000', 2)
    
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 10, 100, 50)
    expect(ctx.strokeRect).toHaveBeenCalledWith(10, 10, 100, 50)
    expect(ctx.fillStyle).toBe('#fff')
    expect(ctx.strokeStyle).toBe('#000')
  })
  
  it('应该绘制圆形', () => {
    circle(ctx, 50, 50, 30, '#fff', '#000', 2)
    
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.arc).toHaveBeenCalledWith(50, 50, 30, 0, Math.PI * 2)
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
  })
  
  it('应该绘制文本', () => {
    txt(ctx, '你好', 50, 50, '#000', '20px sans-serif', 'center')
    
    expect(ctx.fillText).toHaveBeenCalledWith('你好', 50, 50)
    expect(ctx.fillStyle).toBe('#000')
    expect(ctx.font).toBe('20px sans-serif')
    expect(ctx.textAlign).toBe('center')
  })
  
  it('应该清空画布', () => {
    clearCanvas(ctx, 100, 100, '#fff')
    
    expect(ctx.fillStyle).toBe('#fff')
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 100)
  })
  
  it('应该绘制网格', () => {
    drawGrid(ctx, 100, 100, 50, '#eee')
    
    expect(ctx.strokeStyle).toBe('#eee')
    expect(ctx.lineWidth).toBe(0.5)
  })
})
```

---

## 📊 测试覆盖率

### 1. 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并显示覆盖率
npm run test:coverage

# 运行特定测试
npx vitest run src/composables/game/audio.test.js
```

### 2. 查看覆盖率报告

覆盖率报告会生成在 `coverage/` 目录下：

- `coverage/index.html` - HTML 报告
- `coverage/lcov.info` - LCOV 格式
- `coverage/coverage-final.json` - JSON 格式

### 3. 覆盖率目标

- **行覆盖率**: > 80%
- **分支覆盖率**: > 70%
- **函数覆盖率**: > 90%

---

## 📝 测试示例

### 创建新测试文件

1. 在 `src/composables/game/` 或 `src/utils/game/` 目录下创建 `.test.js` 文件
2. 导入要测试的模块
3. 编写测试用例
4. 运行测试

### 测试命名规范

```javascript
describe('模块名称', () => {
  describe('功能描述', () => {
    it('应该做什么', () => {
      // 测试逻辑
    })
    
    it('不应该做什么', () => {
      // 测试逻辑
    })
    
    it('应该处理边界情况', () => {
      // 测试逻辑
    })
  })
})
```

### 测试断言

```javascript
// 基本断言
expect(value).toBe(expected)  // 严格相等
expect(value).toEqual(expected)  // 深度相等
expect(value).toBeTruthy()  // 真值
expect(value).toBeFalsy()  // 假值
expect(value).toBeNull()  // null
expect(value).toBeUndefined()  // undefined
expect(value).toContain(item)  // 包含
expect(value).toHaveLength(n)  // 长度

// 异常断言
expect(fn).toThrow()  // 抛出错误
expect(fn).toThrow('错误消息')  // 抛出特定错误
expect(fn).not.toThrow()  // 不抛出错误

// Mock 断言
expect(spy).toHaveBeenCalled()  // 被调用
expect(spy).toHaveBeenCalledWith(args)  // 被调用并传入参数
expect(spy).toHaveBeenCalledTimes(n)  // 被调用 n 次
```

---

## 🚀 持续集成

### 1. GitHub Actions

创建 `.github/workflows/test.yml`：

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test:coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

### 2. 覆盖率检查

在 `vitest.config.js` 中添加覆盖率阈值：

```javascript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  include: ['src/composables/game/**', 'src/utils/game/**'],
  thresholds: {
    lines: 80,
    functions: 90,
    branches: 70,
    statements: 80,
  },
}
```

---

## 📚 相关资源

- [Vitest 文档](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [重构总结文档](./REFACTOR_SUMMARY.md)
- [公共逻辑使用指南](./GAME_LOGIC_GUIDE.md)

---

## 🤝 贡献

如果你在测试过程中发现问题或有改进建议，请：

1. 提交 Issue 描述问题
2. 提交 Pull Request 修复问题
3. 更新相关文档

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE) 文件。
