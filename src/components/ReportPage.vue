<template>
  <div class="page">
    <header class="bar">
      <button class="back" type="button" @click="goBack">‹ 返回</button>
      <b>训练报告</b>
      <span class="hint">本机留档 · 可导出</span>
    </header>

    <main class="wrap">
      <ReportPanel inline close-label="返回选关" @close="goDashboard" />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import ReportPanel from '@/components/ReportPanel.vue'

const router = useRouter()

function goBack() {
  if (window.history.state && window.history.state.back) {
    router.back()
  } else {
    router.push('/dashboard')
  }
}

function goDashboard() {
  router.push('/dashboard')
}
</script>

<style scoped>
.page {
  min-height: var(--dvh, 100vh);
  box-sizing: border-box;
  background: #eef2f9;
  color: #1f2937;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC',
    'Microsoft YaHei', 'Noto Sans SC', 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.55;
}

.bar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #dbe3ef;
  background: #fff;
  box-shadow: 0 2px 10px rgba(15, 27, 61, 0.06);
}

.back {
  padding: 7px 14px;
  border: 1px solid #c4d0e2;
  border-radius: 8px;
  background: #f7f9fc;
  color: #1f3d68;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.back:hover {
  background: #eaf0f9;
  border-color: #9fb4c6;
}

.bar b {
  font-size: 16px;
  color: #123a7a;
}

.bar .hint {
  margin-left: auto;
  color: #8a94a3;
  font-size: 12px;
}

.wrap {
  max-width: 760px;
  margin: 0 auto;
  padding: 18px 16px calc(28px + env(safe-area-inset-bottom, 0px));
}

.wrap :deep(.tr-panel) {
  padding: 0 20px 20px;
  border: 1px solid #e1e8f2;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 27, 61, 0.08);
}

@media (max-width: 560px) {
  .wrap {
    padding: 12px 10px calc(20px + env(safe-area-inset-bottom, 0px));
  }

  .wrap :deep(.tr-panel) {
    padding: 0 14px 16px;
    border-radius: 12px;
  }
}
</style>
