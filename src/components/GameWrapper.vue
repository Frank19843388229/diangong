<template>
  <component :is="levelComp" v-if="levelComp" />
  <div v-else class="coming">
    <p>该关卡尚未上线</p>
    <router-link to="/dashboard">返回选关</router-link>
  </div>

  <!-- 交卷结果提示（本地判定：达标留档 / 未达合格分可重练） -->
  <transition name="toast-fade">
    <div v-if="toast.show" class="toast" :class="{ bad: !toast.ok }">
      {{ toast.msg }}
    </div>
  </transition>

  <!-- 重大失误弹窗：各关卡触发重大违规时弹出，随后返回选关页 -->
  <FatalExitDialog v-if="fatalExit.show" />
</template>

<script setup>
import { computed, defineAsyncComponent, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLevelAttempt } from '@/composables/levelAttempt'
import { useFatalExit } from '@/composables/fatalExit'
import FatalExitDialog from '@/components/FatalExitDialog.vue'

const route = useRoute()
const no = Number(route.params.level)

// 已实现的关卡组件（按关卡编号注册）
const LEVEL_COMPONENTS = {
  1: defineAsyncComponent(() => import('@/components/gane/Level1.vue')),
  2: defineAsyncComponent(() => import('@/components/gane/Level2.vue')),
  3: defineAsyncComponent(() => import('@/components/gane/Level3.vue')),
  4: defineAsyncComponent(() => import('@/components/gane/Level4.vue')),
  5: defineAsyncComponent(() => import('@/components/gane/K2101.vue')),
  6: defineAsyncComponent(() => import('@/components/gane/K3101.vue')),
  7: defineAsyncComponent(() => import('@/components/gane/K3102.vue')),
  8: defineAsyncComponent(() => import('@/components/gane/K3103.vue')),
  9: defineAsyncComponent(() => import('@/components/gane/K3104.vue')),
  10: defineAsyncComponent(() => import('@/components/gane/K3105.vue')),
  11: defineAsyncComponent(() => import('@/components/gane/LowVoltageCabinetMaintenance.vue')),
  12: defineAsyncComponent(() => import('@/components/gane/TemporaryPowerConstruction.vue')),
}

// 重构版参考实现：仅开发环境可通过 ?refactored=1 打开用于对比验证
const REFACTORED_COMPONENTS = {
  1: defineAsyncComponent(() => import('@/components/gane/Level1Refactored.vue')),
}

const levelComp = computed(() => {
  if (import.meta.env.DEV && route.query.refactored === '1' && REFACTORED_COMPONENTS[no]) {
    return REFACTORED_COMPONENTS[no]
  }
  return LEVEL_COMPONENTS[no] || null
})

const { attempt, toast, openAttempt } = useLevelAttempt()
const { fatalExit } = useFatalExit()

onMounted(() => {
  // 未上线的关卡不开考，交由上面的"尚未上线"提示
  if (!LEVEL_COMPONENTS[no]) return
  // 无后端：全部关卡直接解锁。
  // 刷新/返回不重开：同一关卡还有进行中的场次就继续用（计时不归零）
  if (!(attempt.attemptId && attempt.level === no)) {
    openAttempt(no)
  }
})
</script>

<style scoped>
.coming {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #5d6370;
}

.coming a {
  color: #1a3fc4;
}

.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  max-width: min(92vw, 480px);
  padding: 10px 18px;
  border-radius: 4px;
  background: #1a3fc4;
  color: #fff;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 6px 24px rgba(18, 45, 148, 0.28);
}

.toast.bad {
  background: #c62828;
  box-shadow: 0 6px 24px rgba(198, 40, 40, 0.28);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>
