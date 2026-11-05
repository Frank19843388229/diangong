<template>
  <div class="exit-mask" role="alertdialog" aria-modal="true" aria-labelledby="game-exit-title" aria-describedby="game-exit-tip">
    <div class="exit-box">
      <h2 id="game-exit-title">确定退出当前关卡吗？</h2>
      <p id="game-exit-tip" class="exit-tip">退出后将返回选关页，当前场次会保留在本设备。</p>
      <div class="exit-actions">
        <button class="btn" @click="hideGameExitConfirm">继续训练</button>
        <button class="btn danger" @click="confirm">退出关卡</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { confirmGameExit, hideGameExitConfirm } from '@/composables/gameExitConfirm'

const router = useRouter()

function confirm() {
  confirmGameExit(router).catch(() => {})
}
</script>

<style scoped>
.exit-mask {
  position: fixed;
  inset: 0;
  z-index: 10200;
  display: flex;
  overflow: auto;
  overscroll-behavior: contain;
  padding: calc(14px + env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right))
    calc(14px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left));
  background: rgba(12, 18, 34, 0.62);
}

.exit-box {
  width: min(100%, 360px);
  margin: auto;
  padding: 24px 18px 18px;
  border-radius: 10px;
  background: #fff;
  text-align: center;
  box-shadow: 0 14px 44px rgba(10, 20, 50, 0.4);
}

.exit-box h2 {
  margin: 0 0 10px;
  font-size: clamp(17px, 4.6vw, 19px);
  color: #1c1e24;
}

.exit-tip {
  margin: 0 0 18px;
  font-size: clamp(12.5px, 3.4vw, 13.5px);
  line-height: 1.6;
  color: #7a8090;
}

.exit-actions {
  display: flex;
  gap: 10px;
}

.btn {
  flex: 1;
  min-height: 44px;
  padding: 10px 18px;
  border: 1px solid #cfd6e4;
  border-radius: 6px;
  background: #f5f7fb;
  color: #2b3242;
  font-size: clamp(15px, 4vw, 16px);
  cursor: pointer;
  touch-action: manipulation;
}

.btn.danger {
  border-color: #c62828;
  background: #c62828;
  color: #fff;
}
</style>
