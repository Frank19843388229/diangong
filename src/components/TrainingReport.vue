<template>
  <div class="tr-actions">
    <button class="btn tr-btn" type="button" @click="openReport">查看详细报告</button>
    <button class="btn tr-btn" type="button" @click="exportJson">导出训练记录</button>
  </div>

  <teleport to="body">
    <div v-if="show" class="tr-mask" @click.self="show = false">
      <ReportPanel @close="show = false" />
    </div>
  </teleport>
</template>

<script setup>
import { ref } from 'vue'
import ReportPanel from '@/components/ReportPanel.vue'
import { useTrainingReportStore } from '@/stores/trainingReport.js'
import { downloadText, persistLastReportJson } from '@/composables/trainingReport.js'

const store = useTrainingReportStore()
const show = ref(false)

function openReport() {
  show.value = true
}

function exportJson() {
  const report = store.last || store.history[0] || null
  if (!report) return
  persistLastReportJson(report)
  downloadText('last_report.json', JSON.stringify(report, null, 2))
}
</script>

<style scoped>
.tr-actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tr-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 8px 18px;
  border: 1px solid #9fb4c6;
  border-radius: 6px;
  background: #fff;
  color: #1f2937;
  font: inherit;
  font-size: 14px;
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.tr-btn:hover {
  background: #f0f4fa;
  border-color: #7d95aa;
}

.tr-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(10, 18, 28, 0.66);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 560px) {
  .tr-mask {
    padding: 10px;
  }
}
</style>
