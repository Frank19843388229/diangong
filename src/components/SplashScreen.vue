<template>
  <Transition name="splash-fade">
    <div v-if="show" class="splash" role="status" aria-label="正在加载">
      <div class="splash-inner">
        <!-- Frank 品牌 logo（SVG 内嵌动画：气泡呼吸、橙点脉动、下划线生长） -->
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 160" role="img" aria-label="Frank logo">
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#1B2A41" />
              <stop offset="100%" stop-color="#2E4A6B" />
            </linearGradient>
            <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#F28C28" />
              <stop offset="100%" stop-color="#FFB25E" />
            </linearGradient>
          </defs>

          <!-- 图形：F + 对话气泡 -->
          <g transform="translate(28,30)">
            <!-- 气泡主体（圆角矩形） -->
            <rect x="0" y="0" width="88" height="76" rx="18" fill="url(#g1)">
              <!-- 呼吸动画 -->
              <animate attributeName="opacity" values="1;0.88;1" dur="3s" repeatCount="indefinite" />
            </rect>

            <!-- 气泡小尾巴 -->
            <path d="M18 74 L18 96 L40 74 Z" fill="url(#g1)">
              <animate attributeName="opacity" values="1;0.88;1" dur="3s" repeatCount="indefinite" />
            </path>

            <!-- 字母 F（负空间/白色） -->
            <path d="M24 18 H64 V30 H38 V40 H58 V52 H38 V60 H24 Z" fill="#FFFFFF">
              <!-- 轻微上浮动画 -->
              <animateTransform attributeName="transform" type="translate"
                values="0 0; 0 -2; 0 0" dur="3s" repeatCount="indefinite" />
            </path>

            <!-- 橙色强调点（坦诚/活力） -->
            <circle cx="72" cy="18" r="6" fill="url(#g2)">
              <animate attributeName="r" values="6;7.5;6" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>

          <!-- 文字 Frank -->
          <g>
            <text x="140" y="98" font-family="Montserrat, Inter, Arial, sans-serif"
              font-size="52" font-weight="700" fill="#1B2A41" letter-spacing="1">
              Frank
            </text>
            <!-- 文字轻微淡入循环 -->
            <animate attributeName="opacity" values="0.85;1;0.85" dur="4s" repeatCount="indefinite" />
          </g>

          <!-- 橙色下划线（生长动画，似加载进度） -->
          <rect x="140" y="110" width="150" height="5" rx="2.5" fill="url(#g2)">
            <animate attributeName="width" values="0;150;150" dur="2.5s" repeatCount="indefinite" />
          </rect>
        </svg>

        <p class="loading">加载中…</p>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// 开屏加载页：每次启动展示约 2.2s 后淡出（纯本地应用，此时界面其实已可用，
// 这里主要承担品牌展示与 WebView 首帧过渡）。
// 首次启动时它先于隐私弹窗展示：弹窗 z-index 更低，淡出后自然接上。
const SHOW_MS = 2200

const show = ref(true)
let timer = null

onMounted(() => {
  timer = setTimeout(() => { show.value = false }, SHOW_MS)
})

onUnmounted(() => {
  clearTimeout(timer)
})
</script>

<style scoped>
.splash {
  position: fixed;
  inset: 0;
  z-index: 11000;
  /* 与 logo 背景色一致，避免 WebView 首帧闪白 */
  background: #FAF8F5;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 贴边安全区 */
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
    env(safe-area-inset-bottom) env(safe-area-inset-left);
}

.splash-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.splash svg {
  width: min(84vw, 420px);
  height: auto;
  display: block;
}

.loading {
  margin: 0;
  color: #8a93a6;
  font-size: 13px;
  letter-spacing: 0.3em;
  text-indent: 0.3em;
}

/* 淡出收尾 */
.splash-fade-leave-active {
  transition: opacity 0.45s ease;
}

.splash-fade-leave-to {
  opacity: 0;
}
</style>
