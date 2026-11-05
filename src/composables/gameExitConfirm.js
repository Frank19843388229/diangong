import { reactive } from 'vue'

export const gameExitConfirm = reactive({
  show: false,
  target: '/dashboard',
})

let allowNextExit = false

export function requestGameExit(target = '/dashboard') {
  gameExitConfirm.target = target
  gameExitConfirm.show = true
}

export function hideGameExitConfirm() {
  gameExitConfirm.show = false
  gameExitConfirm.target = '/dashboard'
}

export function confirmGameExit(router) {
  const target = gameExitConfirm.target
  allowNextExit = true
  hideGameExitConfirm()
  return router.push(target).finally(() => {
    allowNextExit = false
  })
}

export function consumeGameExitApproval() {
  if (!allowNextExit) return false
  allowNextExit = false
  return true
}
