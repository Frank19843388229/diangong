import { expect, test } from 'vitest'
import router from '@/router/index.js'
import { fatalExit } from '@/composables/fatalExit.js'
import {
  confirmGameExit,
  gameExitConfirm,
  hideGameExitConfirm,
} from '@/composables/gameExitConfirm.js'

test('关卡退出需要确认，且重大违规直接放行', async () => {
  fatalExit.show = false
  hideGameExitConfirm()
  await router.push('/dashboard')
  await router.push('/game/1')

  await router.push('/dashboard')
  expect(router.currentRoute.value.name).toBe('GamePlay')
  expect(gameExitConfirm.show).toBe(true)

  hideGameExitConfirm()
  expect(router.currentRoute.value.name).toBe('GamePlay')
  expect(gameExitConfirm.show).toBe(false)

  await router.push('/dashboard')
  await confirmGameExit(router)
  expect(router.currentRoute.value.name).toBe('Dashboard')
  expect(gameExitConfirm.show).toBe(false)

  await router.push('/game/2')
  await router.push('/dashboard')
  expect(gameExitConfirm.show).toBe(true)

  hideGameExitConfirm()
  fatalExit.show = true
  await router.push('/dashboard')
  expect(router.currentRoute.value.name).toBe('Dashboard')
  expect(gameExitConfirm.show).toBe(false)
  fatalExit.show = false
})
