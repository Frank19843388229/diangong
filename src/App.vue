<template>
  <router-view></router-view>

  <!-- 开屏加载页（每次启动展示约 2.2s 后淡出） -->
  <SplashScreen />

  <!-- 首次启动隐私政策同意弹窗（全局，未同意前覆盖一切页面） -->
  <PrivacyConsentDialog />

  <!-- 首次进入的操作引导（隐私同意后自动弹出；也可从首页「操作指引」重开） -->
  <GuideDialog />

  <!-- 退出确认弹窗（全局，选关页按返回键时弹出，确认后才退出 App） -->
  <ExitConfirmDialog v-if="exitConfirm.show" />

  <!-- 手机端舞台缩放控件（仅游戏页显示）：
       竖屏下 960×640 舞台按屏宽自适应只有 ~38%，场景太小点不准；
       「＋/－」在自适应基础上放大，最大 1:1 原始尺寸，放大后页面可横向滚动 -->
  <div class="zoom-pad" v-if="onGame && !fsOn">
    <button class="zbtn" :disabled="!canZoomOut" @click="zoomOut" aria-label="缩小">−</button>
    <span class="zlabel">{{ pct }}%</span>
    <button class="zbtn" :disabled="!canZoomIn" @click="zoomIn" aria-label="放大">＋</button>
  </div>

  <!-- 纯净全屏下临时呼出任务面板（默认隐藏文字，只留画布） -->
  <button
    class="fs-toggle"
    v-if="onGame && fsOn"
    :class="{ on: panelOpen }"
    @click="toggleText"
    :aria-label="panelOpen ? '收起任务面板' : '显示任务面板'"
    :aria-expanded="panelOpen ? 'true' : 'false'"
  >☰</button>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { stageScale, canZoomIn, canZoomOut, zoomIn, zoomOut } from './composables/stageFit.js'
import { fsOn, panelOpen, reconcileFs, toggleText } from './composables/gameFs.js'
import SplashScreen from './components/SplashScreen.vue'
import PrivacyConsentDialog from './components/PrivacyConsentDialog.vue'
import GuideDialog from './components/GuideDialog.vue'
import ExitConfirmDialog from './components/ExitConfirmDialog.vue'
import { exitConfirm } from './composables/exitConfirm.js'

const route = useRoute()
const onGame = computed(() => route.path.startsWith('/game/'))
const pct = computed(() => Math.round(stageScale.value * 100))

// 全屏铺满策略（按路由分三类）：
//   /game/*   → 全屏 + 纯净模式（隐藏画布外文字，只留画布 + ☰ 呼出面板）
//   /dashboard → 全屏铺满但保留全部文字（选关要读标题、点按钮，不能进纯净）
//   其余(/privacy 等) → 退出全屏，长文档按普通页面滚动
watch(() => route.path, (path) => reconcileFs(path), { immediate: true })

// 视口跨过断点（桌面窗口拉宽/拉窄过 1008px、转屏）时重对齐铺满状态；
// 状态没变时 reconcileFs 是空操作，不会重复申请全屏。
window.addEventListener('resize', () => reconcileFs(route.path))
</script>

<style>
/* 桌面端不显示（舞台已是 1:1），样式与关卡无关故放全局 */
.zoom-pad {
  display: none;
}

@media (max-width: 1007px) {
  .zoom-pad {
    display: flex;
    align-items: center;
    gap: 2px;
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 998; /* 低于左上角返回按钮(999) */
    background: rgba(27, 32, 34, .9);
    border-radius: 22px;
    padding: 3px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .35);
    -webkit-user-select: none;
    user-select: none;
  }

  .zoom-pad .zbtn {
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, .14);
    color: #fff;
    font-size: 20px;
    line-height: 1;
    padding: 0;
    cursor: pointer;
    touch-action: manipulation;
  }

  .zoom-pad .zbtn:disabled {
    opacity: .3;
  }

  .zoom-pad .zlabel {
    min-width: 40px;
    text-align: center;
    color: #f39a32;
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
}

/* 纯净全屏：右下角圆形「☰」临时呼出任务面板 */
.fs-toggle {
  position: fixed;
  /* edge-to-edge 下要避开刘海/挖孔：横屏时缺口可能在左右两侧 */
  right: calc(14px + env(safe-area-inset-right, 0px));
  bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  z-index: 998; /* 低于返回按钮(999)，高于面板浮层(996) */
  width: 46px;
  height: 46px;
  border: 0;
  border-radius: 50%;
  background: rgba(27, 32, 34, 0.9);
  color: #fff;
  font-size: 22px;
  line-height: 1;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
}

.fs-toggle.on {
  background: #f39a32;
  color: #191b1b;
}
</style>
