<template>
  <div
    v-if="guideVisible"
    class="gd-mask"
    role="dialog"
    aria-modal="true"
    aria-labelledby="gd-title"
    @click.self="skip"
  >
    <div class="gd-box">
      <!-- 顶部：步骤计数 + 跳过 -->
      <div class="gd-top">
        <span class="gd-count">{{ current + 1 }} / {{ steps.length }}</span>
        <button class="gd-skip" type="button" @click="skip">跳过引导</button>
      </div>

      <div class="gd-head">
        <div class="gd-icon" aria-hidden="true">{{ steps[current].icon }}</div>
        <div>
          <h2 id="gd-title">{{ steps[current].title }}</h2>
          <p class="gd-sub">{{ steps[current].sub }}</p>
        </div>
      </div>

      <p class="gd-desc">{{ steps[current].desc }}</p>

      <ul v-if="steps[current].tips" class="gd-tips">
        <li v-for="(t, i) in steps[current].tips" :key="i">{{ t }}</li>
      </ul>

      <!-- 步骤进度点 -->
      <div class="gd-dots" role="tablist" aria-label="引导步骤">
        <button
          v-for="(s, i) in steps"
          :key="i"
          class="gd-dot"
          :class="{ on: i === current }"
          type="button"
          :aria-label="`第 ${i + 1} 步：${s.title}`"
          @click="current = i"
        ></button>
      </div>

      <div class="gd-actions">
        <button v-if="current > 0" class="gd-btn" type="button" @click="prev">上一步</button>
        <button v-if="current < steps.length - 1" class="gd-btn primary" type="button" @click="next">下一步</button>
        <button v-else class="gd-btn primary" type="button" @click="finish">开始训练</button>
      </div>

      <p class="gd-note">随时可在首页「操作指引」重新查看</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { privacyAgreed } from '@/composables/privacyConsent'
import { guideVisible, closeGuide, maybeAutoShowGuide } from '@/composables/guide'

const router = useRouter()
const current = ref(0)

const steps = [
  {
    icon: '🎯',
    title: '选择关卡，开始训练',
    sub: '选关 → 进入实操',
    desc: '选关页按模块列出全部关卡，点击即可进入。每关满分 100 分，60 分合格；已通关的关卡会显示星级和最好成绩，可反复练习刷新成绩。',
    tips: ['第一次练建议从「安全用具」类关卡开始', '进度、成绩都保存在本机，无需登录'],
  },
  {
    icon: '🧰',
    title: '跟着任务面板做',
    sub: '任务面板 = 本关操作清单',
    desc: '进入关卡后，任务面板会按顺序列出本关要做的事。完成一项就点对应的「提交 / 确认」按钮，系统会立即判定并给出反馈。',
    tips: ['手机全屏时，点右下角「☰」呼出或收起任务面板', '面板里的提示文字说明了本步的具体要求'],
  },
  {
    icon: '🖐',
    title: '拖拽安装元器件',
    sub: '按住 → 拖到安装位 → 松手',
    desc: '需要安装元器件的关卡，按住左侧元件芯片拖到操作台上对应的安装位再松手。放错位置会扣分并提示应该装在哪里。',
    tips: ['拖动时元件会跟随手指移动，不用精确到像素', '安装顺序也可能计分，按任务要求来'],
  },
  {
    icon: '🔌',
    title: '选线种 → 点两个端子',
    sub: '接线题的核心操作',
    desc: '接线前先在面板里选择导线线种（L / N / PE / 控制线），再依次点击两个接线端子即可连成一条线。',
    tips: [
      '同一节点的等效孔都算对：端子排备用孔、母排上下端、端子同一端子的进/出',
      '接错的线显示为橙色虚线，选中后可以拆除重接',
    ],
  },
  {
    icon: '✅',
    title: '看提示，及时纠错',
    sub: '做错会立刻提示原因',
    desc: '操作不符合要求时，画面上方会出现橙色/红色提示并扣分，告诉你错在哪里。重大安全违规一票否决，训练会终止并生成中止报告。',
    tips: ['提示会停留几秒，没看清可在训练报告里回看', '安全操作类步骤请按顺序执行，跳步同样会扣分'],
  },
  {
    icon: '📊',
    title: '结算与训练报告',
    sub: '看清每处失分',
    desc: '全部任务完成后进入结算页，可查看详细报告、导出训练记录；报告按分类统计扣分，并列出每一道错题的原因，方便针对性复习。',
    tips: ['错题本记录每次扣分的步骤、分类和原因', '分数达到 60 分即记为通关'],
  },
]

function next() {
  if (current.value < steps.length - 1) current.value++
}
function prev() {
  if (current.value > 0) current.value--
}
function skip() {
  closeGuide()
}
function finish() {
  closeGuide()
  // 「开始训练」直接进入选关页（首次启动看完引导即可开练）
  router.push('/dashboard')
}

// 首次启动：隐私政策同意后再弹（隐私弹窗优先，避免两层遮罩叠在一起）
onMounted(() => {
  watch(privacyAgreed, (agreed) => {
    if (agreed) maybeAutoShowGuide()
  }, { immediate: true })
})

// 每次重新打开都从第 1 步开始（中途关掉再进来不接着上次的步骤）
watch(guideVisible, (v) => {
  if (v) current.value = 0
})
</script>

<style scoped>
.gd-mask {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: calc(14px + env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right))
    calc(14px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left));
  background: rgba(12, 18, 34, 0.62);
}

.gd-box {
  width: min(100%, 460px);
  margin: auto;
  padding: 16px 20px 14px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 16px 50px rgba(10, 20, 50, 0.42);
  text-align: left;
}

.gd-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.gd-count {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #8a94a6;
  font-variant-numeric: tabular-nums;
}

.gd-skip {
  border: 0;
  background: none;
  padding: 6px 2px;
  color: #8a94a6;
  font-size: 12.5px;
  cursor: pointer;
  touch-action: manipulation;
}

.gd-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gd-icon {
  flex: none;
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #1a3fc4, #2f6bff);
  color: #fff;
  font-size: 23px;
  box-shadow: 0 6px 16px rgba(26, 63, 196, 0.3);
}

.gd-head h2 {
  margin: 0;
  font-size: 17px;
  line-height: 1.35;
  color: #16203a;
}

.gd-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: #1a3fc4;
  font-weight: 600;
}

.gd-desc {
  margin: 14px 0 0;
  font-size: 14px;
  line-height: 1.8;
  color: #333a45;
}

.gd-tips {
  margin: 10px 0 0;
  padding: 10px 12px 10px 28px;
  border-radius: 10px;
  background: #f2f6ff;
  color: #3b4a66;
  font-size: 12.5px;
  line-height: 1.7;
}

.gd-tips li + li {
  margin-top: 4px;
}

.gd-dots {
  display: flex;
  justify-content: center;
  gap: 7px;
  margin: 16px 0 12px;
}

.gd-dot {
  width: 7px;
  height: 7px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #d3dae6;
  cursor: pointer;
  touch-action: manipulation;
  transition: width 0.2s, background 0.2s;
}

.gd-dot.on {
  width: 20px;
  border-radius: 4px;
  background: #1a3fc4;
}

.gd-actions {
  display: flex;
  gap: 10px;
}

.gd-btn {
  flex: 1;
  min-height: 42px;
  border: 1px solid #c9d2e0;
  border-radius: 8px;
  background: #fff;
  color: #333a45;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}

.gd-btn.primary {
  border-color: #1a3fc4;
  background: #1a3fc4;
  color: #fff;
}

.gd-note {
  margin: 10px 0 0;
  text-align: center;
  font-size: 11.5px;
  color: #9aa4b4;
}

@media (max-width: 420px) {
  .gd-box {
    padding: 14px 16px 12px;
  }

  .gd-head h2 {
    font-size: 16px;
  }

  .gd-desc {
    font-size: 13.5px;
  }

  .gd-btn {
    min-height: 44px;
    font-size: 13.5px;
  }
}
</style>
