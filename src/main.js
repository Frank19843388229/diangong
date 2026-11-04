import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import TrainingReport from './components/TrainingReport.vue'
import router from './router/index.js'
import './styles/mobile.css'
import { initStageFit } from './composables/stageFit.js'
import { initDragVeil } from './composables/gameFs.js'
import { preloadStorage } from './lib/appStorage.js'
import { setupBackButton } from './lib/backButton.js'

const app = createApp(App)

// Pinia 必须先于 router 安装：路由 redirect/守卫里要用 auth store
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)
app.use(router)
// 全局注册：12 个关卡结算页都要放“查看详细报告 / 导出训练记录”
app.component('TrainingReport', TrainingReport)
// Android 物理返回键接管（重大失误弹窗/关卡内 → 回选关页，选关页 → 弹退出确认）；
// Web 端 isNativePlatform() 为 false，是空操作。
setupBackButton(router)

// 持久化数据（成绩 / 场次）预热，必须在 mount 之前完成：
// store 一创建插件就会同步读 storage，读不到就会用初始值（并可能覆盖旧成绩）。
// 预热失败也照样启动（Web 端为同步 localStorage，此步是空操作）。
preloadStorage()
  .catch((e) => console.warn('[storage] 预热异常', e))
  .finally(() => {
    app.mount('#app')
    // 移动端适配：舞台 960×640 按屏宽等比缩放（--s），窄屏铺满不横滚
    initStageFit()
    // 纯净模式：按住拖拽物时让任务面板浮层/暗纱临时消失，松手恢复
    initDragVeil()
  })
