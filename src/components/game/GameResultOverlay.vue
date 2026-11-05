<template>
  <div class="overlay">
    <div class="panel-box">
      <div class="lv-code">{{ code }}</div>
      <h2>{{ title }}</h2>
      <table class="score-table">
        <tbody>
          <tr v-for="(cat, key) in cats" :key="key"><td>{{ key }}</td><td>{{ cat.got }}/{{ cat.max }}</td></tr>
          <tr class="total"><td>最终成绩</td><td>{{ total }}/100</td></tr>
        </tbody>
      </table>
      <div class="lv-stars" :class="{ fail }">{{ fail ? '✕' : '★'.repeat(stars) + '☆'.repeat(5 - stars) }}</div>
      <p class="verdict">{{ verdict }}</p>
      <slot />
      <div class="row center">
        <button class="btn primary" @click="$emit('restart')">重新训练</button>
        <router-link to="/dashboard" class="btn">返回选关</router-link>
        <TrainingReport />
      </div>
    </div>
  </div>
</template>

<script setup>
import TrainingReport from '@/components/TrainingReport.vue'

defineProps({
  code: { type: String, required: true },
  title: { type: String, required: true },
  cats: { type: Object, required: true },
  total: { type: Number, default: 0 },
  stars: { type: Number, default: 1 },
  verdict: { type: String, default: '' },
  fail: Boolean,
})
defineEmits(['restart'])
</script>

<style scoped>
.overlay { position: absolute; inset: 0; background: rgba(9, 12, 13, .8); display: flex; align-items: center; justify-content: center; z-index: 50; }
.panel-box { width: 620px; max-height: 92%; overflow-y: auto; background: var(--panel-raised, #22292b); color: var(--ink, #f0f2ef); border: 1px solid var(--panel-border, #343d3f); border-radius: 12px; padding: 24px 32px; text-align: center; box-shadow: 0 16px 60px rgba(0, 0, 0, .6); }
.panel-box h2 { margin: 6px 0; color: var(--orange, #f39a32); font-size: 24px; }
.lv-code { display: inline-block; background: var(--orange, #f39a32); color: #191b1b; font-size: 13px; font-weight: 700; letter-spacing: .08em; padding: 3px 14px; border-radius: 14px; }
.lv-stars { font-size: 34px; color: var(--orange, #f39a32); letter-spacing: .1em; margin: 10px 0 2px; }
.lv-stars.fail { color: var(--red, #d97863); }
.verdict { color: var(--sub, #9da8a5); font-size: 15px; margin: 6px 0 12px; }
.score-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 15px; }
.score-table td { padding: 6px 12px; border-bottom: 1px solid var(--panel-border, #343d3f); text-align: left; color: var(--sub, #9da8a5); }
.score-table td:last-child { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; color: var(--ink, #f0f2ef); }
.score-table tr.total td { border-top: 2px solid var(--orange, #f39a32); border-bottom: none; font-size: 17px; color: var(--orange, #f39a32); }
.row { display: flex; gap: 10px; align-items: center; margin: 6px 0; flex-wrap: wrap; }
.row.center { justify-content: center; }
.btn { border: 1px solid var(--panel-border, #343d3f); background: var(--panel, #1b2022); border-radius: 6px; padding: 6px 14px; font: inherit; font-size: 14px; cursor: pointer; color: var(--ink, #f0f2ef); text-decoration: none; }
.btn.primary { background: var(--orange, #f39a32); border-color: var(--orange, #f39a32); color: #191b1b; }
.btn.primary:hover { background: #e08a22; border-color: #e08a22; }
</style>