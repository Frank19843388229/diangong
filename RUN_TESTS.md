# 运行测试

本文件说明如何运行测试。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 运行所有测试

```bash
npm test
```

### 3. 运行测试并显示覆盖率

```bash
npm run test:coverage
```

## 📋 测试脚本

### 基础测试

```bash
# 运行所有测试
npm test

# 运行测试并显示覆盖率
npm run test:coverage

# 运行特定测试
npx vitest run src/composables/game/audio.test.js

# 监听模式运行测试
npm run test:watch
```

### 测试覆盖率

```bash
# 生成覆盖率报告
npm run test:coverage

# 查看覆盖率报告
# 覆盖率报告会生成在 coverage/ 目录下
# - coverage/index.html - HTML 报告
# - coverage/lcov.info - LCOV 格式
# - coverage/coverage-final.json - JSON 格式
```

## 📊 测试覆盖率目标

- **行覆盖率**: > 80%
- **分支覆盖率**: > 70%
- **函数覆盖率**: > 90%

## 🧪 测试文件位置

```
src/
├── composables/game/
│   ├── audio.test.js        # 音效测试
│   ├── message.test.js      # 消息测试
│   ├── drag.test.js         # 拖拽测试
│   ├── timer.test.js        # 计时器测试
│   ├── score.test.js        # 计分测试
│   └── index.test.js        # 综合管理器测试
├── utils/game/
│   └── canvas.test.js       # 画布绘制测试
└── components/gane/
    └── Level1.test.js       # 关卡测试
```

## 📝 测试示例

### 运行音效测试

```bash
npx vitest run src/composables/game/audio.test.js
```

### 运行计分测试

```bash
npx vitest run src/composables/game/score.test.js
```

### 运行所有测试并显示详细输出

```bash
npx vitest run --reporter=verbose
```

## 🔧 测试配置

测试配置在 `vitest.config.js` 中：

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
      thresholds: {
        lines: 80,
        functions: 90,
        branches: 70,
        statements: 80,
      },
    },
  },
})
```

## ❓ 常见问题

### Q1: 测试失败怎么办？

**A:** 检查以下几点：

1. 确保依赖已正确安装：`npm install`
2. 检查测试文件路径是否正确
3. 查看测试错误信息，定位问题
4. 运行单个测试文件进行调试

### Q2: 如何添加新测试？

**A:** 在对应的目录下创建 `.test.js` 文件：

```javascript
import { describe, it, expect } from 'vitest'

describe('模块名称', () => {
  it('应该做什么', () => {
    // 测试逻辑
    expect(true).toBe(true)
  })
})
```

### Q3: 如何查看测试覆盖率？

**A:** 运行以下命令：

```bash
npm run test:coverage
```

覆盖率报告会生成在 `coverage/` 目录下，可以用浏览器打开 `coverage/index.html` 查看。

### Q4: 测试运行很慢怎么办？

**A:** 可以尝试以下优化：

1. 使用 `--maxWorkers=50%` 限制并发数
2. 使用 `--runInBand` 串行运行
3. 减少测试文件数量或合并测试

## 📚 相关资源

- [Vitest 文档](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [测试指南](./TEST_GUIDE.md)
- [公共逻辑使用指南](./GAME_LOGIC_GUIDE.md)

## 🤝 贡献

如果你在测试过程中发现问题或有改进建议，请：

1. 提交 Issue 描述问题
2. 提交 Pull Request 修复问题
3. 更新相关文档

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE) 文件。
