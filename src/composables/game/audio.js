// 音效管理 - 从各关卡文件中提取的公共逻辑
import { ref } from 'vue'

export function useAudio() {
  let AC = null
  
  function beep(f = 600, d = .08, type = 'sine') {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)()
      const o = AC.createOscillator(), g = AC.createGain()
      o.type = type; o.frequency.value = f
      g.gain.setValueAtTime(.12, AC.currentTime)
      g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + d)
      o.connect(g); g.connect(AC.destination)
      o.start(); o.stop(AC.currentTime + d)
    } catch (e) { /* 无音频环境时静默 */ }
  }
  
  return { beep }
}
