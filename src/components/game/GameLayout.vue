<template>
  <div class="game-page">
    <header class="hud">
      <span class="htitle">{{ title }}</span>
      <span class="cats"><i v-for="(cat, key) in cats" :key="key">{{ key }} {{ cat.got }}/{{ cat.max }}</i></span>
      <span>得分 <b>{{ total }}/100</b></span>
      <slot name="hud-extra" />
      <span v-if="mistakes !== null">失误 <b>{{ mistakes }}</b></span>
      <span>违规 <b>{{ violations.length }}</b></span>
      <router-link to="/dashboard" class="exit">退出</router-link>
    </header>

    <div class="stage-wrap">
      <div :ref="setStageRef" class="stage">
        <canvas
          :ref="setCanvasRef"
          width="960"
          height="640"
          :style="{ cursor: canvasCursor }"
          @click="$emit('canvas-click', $event)"
          @pointermove="$emit('canvas-move', $event)"
          @pointerleave="$emit('canvas-leave', $event)"
        />

        <div v-if="screen === 'play'" class="banner">
          <b>任务 {{ phase + 1 }}/{{ phases.length }} · {{ phases[phase]?.name }}</b>
          <span>{{ phases[phase]?.obj }}</span>
        </div>

        <div v-if="paused" class="pause-badge">⚠ 存在严重安全风险 —— 任务暂停，请重新执行安全步骤</div>

        <slot name="tray" />

        <div class="panel">
          <!-- 默认：使用共享收起面板；关卡可通过 #panel 插槽接管整个交互层 -->
          <slot name="panel">
            <div class="sheet" :class="[sheetClass, { folded: !sheetOpen }]">
              <button class="fold" @click="$emit('toggle-sheet')">{{ sheetOpen ? '收起 ▼' : '展开 ▲' }}</button>
              <div v-show="sheetOpen" class="fold-area">
                <slot />
              </div>
            </div>
          </slot>
        </div>

        <div class="msg" :class="msgType">{{ msgText }}</div>
        <slot name="overlays" />
      </div>
    </div>

    <slot name="footer" />
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  phases: { type: Array, default: () => [] },
  cats: { type: Object, required: true },
  total: { type: Number, default: 0 },
  violations: { type: Array, default: () => [] },
  phase: { type: Number, default: -1 },
  screen: { type: String, default: 'title' },
  paused: Boolean,
  sheetOpen: Boolean,
  sheetClass: { type: [String, Array, Object], default: '' },
  msgText: { type: String, default: '' },
  msgType: { type: String, default: '' },
  mistakes: { type: Number, default: null },
  canvasCursor: { type: String, default: 'default' },
  setStageRef: { type: Function, required: true },
  setCanvasRef: { type: Function, required: true },
})

defineEmits(['canvas-click', 'canvas-move', 'canvas-leave', 'toggle-sheet'])
</script>

<style scoped>
.game-page {
  --bg: #111416;
  --panel: #1b2022;
  --panel-raised: #22292b;
  --panel-border: #343d3f;
  --orange: #f39a32;
  --orange-soft: rgba(243, 154, 50, .13);
  --green: #63c58a;
  --red: #d97863;
  --ink: #f0f2ef;
  --sub: #9da8a5;
  --muted: #687471;
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  box-sizing: border-box;
  padding: 16px;
  background:
    radial-gradient(ellipse at 50% -35%, rgba(243, 154, 50, .09), transparent 55%),
    var(--bg);
  color: var(--ink);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.45;
}
.game-page::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: .22;
  background-image:
    linear-gradient(rgba(255, 255, 255, .025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, .025) 1px, transparent 1px);
  background-size: 32px 32px;
}
.hud {
  max-width: 960px;
  margin: 0 auto 10px;
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
  color: var(--sub);
  background: var(--panel);
  border: 1px solid var(--panel-border);
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
}
.htitle { color: var(--ink); font-weight: 600; }
.cats { display: flex; gap: 10px; flex: 1; flex-wrap: wrap; }
.cats i { font-style: normal; color: var(--sub); font-variant-numeric: tabular-nums; }
.hud b { color: var(--orange); font-variant-numeric: tabular-nums; }
.exit { margin-left: auto; color: var(--muted); text-decoration: none; }
.exit:hover { color: var(--ink); }
.stage-wrap { max-width: 960px; margin: 0 auto; overflow-x: auto; }
.stage {
  position: relative;
  width: 960px;
  height: 640px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--panel-border);
  box-shadow: 0 10px 40px rgba(0, 0, 0, .55);
  background: #dfe7ee;
}
canvas { position: absolute; inset: 0; display: block; }
.banner {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(27, 32, 34, .92);
  border: 1px solid var(--panel-border);
  color: var(--ink);
  padding: 5px 16px;
  border-radius: 20px;
  font-size: 13px;
  display: flex;
  gap: 10px;
  align-items: baseline;
  pointer-events: none;
  white-space: nowrap;
  z-index: 5;
}
.banner span { color: var(--sub); font-size: 12px; }
.pause-badge {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(198, 40, 40, .95);
  color: #fff;
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 15px;
  font-weight: 700;
  z-index: 45;
  pointer-events: none;
  animation: pulse 1s infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
.panel { position: absolute; inset: 0; pointer-events: none; z-index: 10; }
.sheet {
  position: absolute;
  left: 50%;
  bottom: 6px;
  transform: translateX(-50%);
  width: 880px;
  max-height: 220px;
  overflow-y: auto;
  background: rgba(34, 41, 43, .97);
  color: var(--ink);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, .45);
  padding: 12px 18px;
  box-sizing: border-box;
}
.sheet.sheet-top { top: 44px; bottom: auto; }
.sheet.sheet-tall { max-height: 330px; }
.sheet.sheet-xl { max-height: 430px; }
.sheet.sheet-inline { position: relative; left: auto; bottom: auto; transform: none; width: 100%; }
.sheet.folded { max-height: 40px; overflow: hidden; padding: 6px 18px; }
.fold {
  position: absolute;
  right: 10px;
  top: 8px;
  border: 1px solid var(--panel-border);
  background: var(--panel);
  border-radius: 5px;
  padding: 2px 10px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  color: var(--sub);
  z-index: 2;
}
.fold:hover { background: #2b3335; color: var(--ink); }
.msg {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%) translateY(-8px);
  background: rgba(27, 32, 34, .94);
  border: 1px solid var(--panel-border);
  color: var(--ink);
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  opacity: 0;
  transition: opacity .2s, transform .2s;
  pointer-events: none;
  z-index: 40;
  max-width: 84%;
  text-align: center;
}
.msg.info, .msg.good, .msg.warn, .msg.bad { opacity: 1; transform: translateX(-50%) translateY(0); }
.msg.good { background: rgba(46, 125, 50, .95); border-color: rgba(99, 197, 138, .6); }
.msg.warn { background: rgba(240, 150, 30, .95); border-color: rgba(243, 154, 50, .6); }
.msg.bad { background: rgba(198, 40, 40, .95); border-color: rgba(217, 120, 99, .6); }
@media (max-width: 1000px) {
  .game-page { padding: 8px; }
}
</style>

<style>
/* 关卡内（插槽）控件统一为主题：深炭灰面板 + 橙色强调 */
.game-page .stage .panel .sheet,
.game-page .stage .panel .modal {
  background: rgba(34, 41, 43, .97);
  color: var(--ink);
  border: 1px solid var(--panel-border);
}
.game-page .stage .panel .sheet h3,
.game-page .stage .panel .sheet h4,
.game-page .stage .panel .modal h4 { color: var(--orange); }
.game-page .stage .panel .tip,
.game-page .stage .panel .hint,
.game-page .stage .panel .probe-tip,
.game-page .stage .panel .cname { color: var(--sub); }
.game-page .stage .panel .tip b { color: var(--ink); }
.game-page .stage .panel .status {
  background: rgba(243, 154, 50, .08);
  border: 1px solid rgba(243, 154, 50, .18);
  color: var(--sub);
}
.game-page .stage .panel .status b { color: var(--orange); }
.game-page .stage .panel .status i { color: var(--green); }
.game-page .stage .panel .status i.off { color: var(--red); }
.game-page .stage .panel .btn,
.game-page .stage .panel .opt,
.game-page .stage .panel .step,
.game-page .stage .panel .chk {
  background: var(--panel);
  border-color: var(--panel-border);
  color: var(--ink);
}
.game-page .stage .panel .btn:hover:not(:disabled),
.game-page .stage .panel .opt:hover,
.game-page .stage .panel .step:hover,
.game-page .stage .panel .chk:hover { background: #2b3335; }
.game-page .stage .panel .btn.primary {
  background: var(--orange);
  border-color: var(--orange);
  color: #191b1b;
}
.game-page .stage .panel .btn.primary:hover:not(:disabled) {
  background: #e08a22;
  border-color: #e08a22;
}
.game-page .stage .panel .btn:disabled { opacity: .4; }
.game-page .stage .panel .opt.sel,
.game-page .stage .panel .chk.sel {
  background: var(--orange-soft);
  border-color: var(--orange);
  color: #f5c98a;
}
.game-page .stage .panel .chk.bad.sel {
  background: rgba(217, 120, 99, .16);
  border-color: var(--red);
  color: #eda99a;
}
.game-page .stage .panel .step.next {
  border-color: var(--orange);
  color: var(--orange);
  box-shadow: 0 0 0 2px rgba(243, 154, 50, .18);
}
.game-page .stage .panel .step.done {
  background: rgba(99, 197, 138, .14);
  border-color: var(--green);
  color: var(--green);
}
.game-page .stage .panel .grp { border-color: var(--panel-border); }
.game-page .stage .panel .glabel { color: var(--orange); }
.game-page .stage .panel .modal-mask { background: rgba(9, 12, 13, .72); }
.game-page .stage .panel .mrow { border-color: var(--panel-border); }
.game-page .stage .panel .mrow.ok b { color: var(--green); }
.game-page .stage .panel .mrow.wrong { background: rgba(217, 120, 99, .12); }
.game-page .stage .panel .radio { color: var(--sub); }
.game-page .stage .panel .zone {
  border-color: rgba(243, 154, 50, .65);
  background: rgba(243, 154, 50, .06);
  color: var(--orange);
}
.game-page .stage .panel .test-list { color: var(--sub); }
.game-page .stage .panel .test-list li.done { color: var(--green); }
.game-page .stage .panel .wire-btn.tw-L,
.game-page .stage .panel .wire-btn.tw-N,
.game-page .stage .panel .wire-btn.tw-PE { background: var(--panel); }
.game-page .stage .panel .wire-btn.tw-L { border-color: #e53935; }
.game-page .stage .panel .wire-btn.tw-N { border-color: #1e88e5; }
.game-page .stage .panel .wire-btn.tw-PE { border-color: #9ccc65; }
.game-page .stage .panel .wire-btn.tw-L.sel { background: #3a1f20; color: #ffb4ab; }
.game-page .stage .panel .wire-btn.tw-N.sel { background: #17283a; color: #a8d0ff; }
.game-page .stage .panel .wire-btn.tw-PE.sel { background: #23301f; color: #c7e8a0; }
.game-page input[type="checkbox"],
.game-page input[type="radio"] { accent-color: var(--orange); }
.game-page .tray {
  background: rgba(34, 41, 43, .94);
  border-color: rgba(243, 154, 50, .5);
}
.game-page .tray-title { color: var(--orange); }
.game-page .tray-tip { color: var(--sub); }
.game-page .tray .chip { background: #2b3335; border-color: var(--orange); }
.game-page .plaque { background: #2b3335; border-color: var(--orange); color: var(--ink); }
.game-page .overlay .record-sec { color: var(--sub); }
.game-page .overlay .record-sec h4 { color: var(--orange); }
.game-page .overlay .mini-table td,
.game-page .overlay .mini-table th { border-color: var(--panel-border); color: var(--sub); }
.game-page .overlay .task-list { color: var(--sub); }
.game-page .overlay .task-list b { color: var(--green); }
.game-page .overlay .fatal-reason { color: #f2a08f; }
.game-page .overlay .ct-note { color: var(--muted); }
.game-page .stage .panel .sign-zone {
  border-color: rgba(243, 154, 50, .5);
  background: rgba(243, 154, 50, .05);
  color: var(--sub);
}
.game-page .stage .panel .sign-card,
.game-page .stage .panel .mini-card,
.game-page .stage .panel .result-box,
.game-page .stage .panel .readings,
.game-page .stage .panel .checks li,
.game-page .stage .panel .steps li {
  background: var(--panel);
  border-color: var(--panel-border);
  color: var(--ink);
}
.game-page .stage .panel .sign-card.locked { background: #2b3335; }
.game-page .stage .panel .checks li.done,
.game-page .stage .panel .steps li.done {
  background: rgba(99, 197, 138, .12);
  border-color: var(--green);
  color: var(--green);
}
.game-page .stage .panel .checks li.cur {
  border-color: var(--orange);
  color: var(--orange);
}
.game-page .stage .panel .circuit .dev,
.game-page .stage .panel .mtr-mode { color: var(--sub); }
.game-page .stage .panel .circuit .port {
  background: var(--panel);
  border-color: var(--panel-border);
  color: var(--sub);
}
.game-page .stage .panel .circuit .port.on {
  background: var(--orange-soft);
  border-color: var(--orange);
  color: var(--orange);
}
.game-page .stage .panel .meter-sim .display { background: #101415; color: var(--green); }
.game-page .stage .panel .console {
  background: var(--panel);
  border-color: var(--panel-border);
  color: var(--sub);
}
.game-page .stage .panel .console-head b { color: var(--orange); }
.game-page .climb-pad .climb-btn {
  background: var(--panel);
  border-color: var(--panel-border);
  color: var(--ink);
}
.game-page .climb-pad .climb-btn:active { background: #2b3335; }
.game-page .climb-pad .climb-btn.down {
  background: rgba(243, 154, 50, .12);
  border-color: rgba(243, 154, 50, .5);
  color: var(--orange);
}
</style>