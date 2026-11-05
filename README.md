# 电工培训游戏前端

## 📋 项目简介

这是一个电工培训游戏的前端项目，包含多个关卡供用户学习电工操作。

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 🧪 测试

### 运行所有测试

```bash
npm test
```

### 运行测试并显示覆盖率

```bash
npm run test:coverage
```

### 运行特定测试

```bash
npx vitest run src/composables/game/audio.test.js
```

## 📁 项目结构

```
src/
├── composables/
│   └── game/
│       ├── audio.js      # 音效管理
│       ├── message.js    # 消息提示
│       ├── drag.js       # 拖拽管理
│       ├── timer.js      # 计时器管理
│       ├── score.js      # 计分系统
│       ├── config.js     # 关卡配置
│       └── index.js      # 综合管理器
├── utils/
│   └── game/
│       └── canvas.js     # 画布绘制工具
└── components/
    └── gane/
        ├── Level1.vue           # 关卡1
        ├── Level1Refactored.vue # 关卡1（重构版）
        ├── Level2.vue
        ├── Level3.vue
        ├── Level4.vue
        ├── K2101.vue
        ├── K3101.vue
        ├── K3102.vue
        ├── K3103.vue
        ├── K3104.vue
        ├── K3105.vue
        ├── TemporaryPowerConstruction.vue
        └── LowVoltageCabinetMaintenance.vue
```

## 📚 文档

- [重构总结文档](./REFACTOR_SUMMARY.md)
- [公共逻辑使用指南](./GAME_LOGIC_GUIDE.md)
- [测试指南](./TEST_GUIDE.md)
- [运行测试](./RUN_TESTS.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 MIT 许可证。
