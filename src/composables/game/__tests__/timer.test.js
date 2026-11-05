import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTimer } from '../timer.js'

describe('useTimer', () => {
  let timer
  
  beforeEach(() => {
    vi.useFakeTimers()
    timer = useTimer()
  })
  
  afterEach(() => {
    vi.useRealTimers()
  })
  
  it('应该延迟执行函数', () => {
    const callback = vi.fn()
    timer.later(callback, 1000)
    
    expect(callback).not.toHaveBeenCalled()
    
    vi.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledTimes(1)
  })
  
  it('应该清除定时器', () => {
    const callback = vi.fn()
    timer.later(callback, 1000)
    
    timer.clearAll()
    
    vi.advanceTimersByTime(1000)
    expect(callback).not.toHaveBeenCalled()
  })
  
  it('应该支持间隔执行', () => {
    const callback = vi.fn()
    timer.setInterval(callback, 500)
    
    vi.advanceTimersByTime(1500)
    expect(callback).toHaveBeenCalledTimes(3)
  })
  
  it('应该重置计时器', () => {
    const callback = vi.fn()
    timer.later(callback, 1000)
    
    timer.reset()
    
    vi.advanceTimersByTime(1000)
    expect(callback).not.toHaveBeenCalled()
  })
})
