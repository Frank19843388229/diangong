<template>
  <div class="overlay">
    <div class="panel-box">
      <div class="lv-code">{{ code }}</div>
      <h2>{{ title }}</h2>
      <p class="sub">{{ subtitle }}</p>
      <div class="objs">
        <p>{{ goal }}</p>
        <ul><li v-for="task in tasks" :key="task">{{ task }}</li></ul>
      </div>
      <p v-if="fatalNote" class="fatal-note">⚠ {{ fatalNote }}</p>
      <p v-if="extraNote" class="ct-note">{{ extraNote }}</p>
      <slot name="extra" />
      <button class="btn primary big" @click="$emit('start')">开始训练</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  code: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  goal: { type: String, default: '' },
  tasks: { type: Array, default: () => [] },
  fatalNote: { type: String, default: '' },
  extraNote: { type: String, default: '' },
})
defineEmits(['start'])
</script>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  background: rgba(9, 12, 13, .8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.panel-box {
  width: 620px;
  max-height: 92%;
  overflow-y: auto;
  background: var(--panel-raised, #22292b);
  color: var(--ink, #f0f2ef);
  border: 1px solid var(--panel-border, #343d3f);
  border-radius: 12px;
  padding: 24px 32px;
  text-align: center;
  box-shadow: 0 16px 60px rgba(0, 0, 0, .6);
}
.panel-box h2 { margin: 6px 0; color: var(--orange, #f39a32); font-size: 24px; }
.lv-code { display: inline-block; background: var(--orange, #f39a32); color: #191b1b; font-size: 13px; font-weight: 700; letter-spacing: .08em; padding: 3px 14px; border-radius: 14px; }
.sub { color: var(--sub, #9da8a5); font-size: 14px; margin: 4px 0; }
.objs { text-align: left; background: var(--panel, #1b2022); border: 1px solid var(--panel-border, #343d3f); border-radius: 8px; padding: 12px 18px; margin: 12px 0; font-size: 14px; color: var(--sub, #9da8a5); }
.objs p { color: var(--sub, #9da8a5); }
.objs ul { margin: 8px 0 0; padding-left: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; }
.fatal-note { color: #f2a08f; font-size: 13px; font-weight: 600; background: rgba(217, 120, 99, .12); border: 1px solid rgba(217, 120, 99, .35); border-radius: 6px; padding: 6px 10px; margin: 2px 0; }
.ct-note { color: var(--muted, #687471); font-size: 13px; }
.btn { border: 1px solid var(--panel-border, #343d3f); background: var(--panel, #1b2022); border-radius: 6px; padding: 6px 14px; font: inherit; font-size: 14px; cursor: pointer; color: var(--ink, #f0f2ef); }
.btn.primary { background: var(--orange, #f39a32); border-color: var(--orange, #f39a32); color: #191b1b; }
.btn.primary:hover { background: #e08a22; border-color: #e08a22; }
.btn.big { font-size: 17px; padding: 12px 42px; }
</style>