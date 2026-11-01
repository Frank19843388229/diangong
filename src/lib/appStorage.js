// ================= 统一持久化存储 =================
// App（Capacitor 原生）走 @capacitor/preferences（SharedPreferences，系统级落盘，
// 不受 WebView 进程被杀影响）；Web 端回落 localStorage。
//
// 为什么不让插件直接读 Preferences：
//   pinia-plugin-persistedstate 的 storage.getItem 必须**同步**返回字符串
//   （它拿到 Promise 会 JSON.parse 抛错并被 catch 吞掉，随后把初始值写回存储，
//   等于清空已有成绩）。Preferences 是异步的，因此在 app 启动时先 await 预热
//   进内存缓存，插件同步读缓存，写入则同时更新缓存 + 异步落盘。
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

/** 是否运行在原生 App（Android/iOS）里 */
export const isNative = Capacitor.isNativePlatform()

/** 需要持久化的 key（progress/attempt 必须与各 store 的 $id 一致；privacy 是隐私政策同意记录） */
const KEYS = ['progress', 'attempt', 'privacy']

/** 同步内存缓存：key → JSON 字符串 */
const cache = new Map()

/**
 * 启动时预热：把持久化数据读进内存缓存。
 * 必须在第一个 store 创建之前（即 app.mount 之前）完成。
 * 兼容迁移：同包名升级后 Preferences 无值但 WebView localStorage 有旧成绩时，搬一次。
 */
export async function preloadStorage() {
  if (!isNative) return
  await Promise.all(KEYS.map(async (key) => {
    try {
      const { value } = await Preferences.get({ key })
      if (value != null) { cache.set(key, value); return }
      // 旧版本用 localStorage 存过 → 迁移到 Preferences，避免升级后成绩"消失"
      const legacy = localStorage.getItem(key)
      if (legacy != null) {
        cache.set(key, legacy)
        await Preferences.set({ key, value: legacy })
      }
    } catch (e) {
      console.warn('[storage] 预热失败', key, e)
    }
  }))
}

/** 给 pinia-plugin-persistedstate 用的同步 storage 接口 */
export const appStorage = {
  getItem(key) {
    if (isNative) return cache.has(key) ? cache.get(key) : null
    return localStorage.getItem(key)
  },
  setItem(key, value) {
    if (isNative) {
      cache.set(key, value)
      // 异步落盘；Promise 由插件忽略，失败只告警（缓存里仍有最新值，下次启动可恢复）
      Preferences.set({ key, value }).catch((e) => console.warn('[storage] 写入失败', key, e))
    } else {
      localStorage.setItem(key, value)
    }
  },
  removeItem(key) {
    if (isNative) {
      cache.delete(key)
      Preferences.remove({ key }).catch((e) => console.warn('[storage] 删除失败', key, e))
    } else {
      localStorage.removeItem(key)
    }
  },
}
