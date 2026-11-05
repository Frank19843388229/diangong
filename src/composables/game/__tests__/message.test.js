import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useMessage } from '../message.js'

describe('useMessage', () => {
  let message
  
  beforeEach(() => {
    vi.useFakeTimers()
    message = useMessage()
  })
  
  afterEach(() => {
    vi.useRealTimers()
  })
  
  it('应该显示消息', () => {
    message.showMsg('测试消息', 'info')
    expect(message.msgText.value).toBe('测试消息')
    expect(message.msgType.value).toBe('info')
  })
  
  it('应该在 2.6 秒后清除消息', () => {
    message.showMsg('测试消息', 'info')
    expect(message.msgText.value).toBe('测试消息')
    
    // 快进 2.6 秒
    vi.advanceTimersByTime(2600)
    
    expect(message.msgType.value).toBe('')
  })
  
  it('应该支持不同类型的消息', () => {
    message.showMsg('成功', 'good')
    expect(message.msgType.value).toBe('good')
    
    message.showMsg('警告', 'warn')
    expect(message.msgType.value).toBe('warn')
    
    message.showMsg('错误', 'bad')
    expect(message.msgType.value).toBe('bad')
  })
  
  it('应该清除之前的定时器', () => {
    message.showMsg('消息1', 'info')
    vi.advanceTimersByTime(1300)  // 一半时间
    
    message.showMsg('消息2', 'info')
    expect(message.msgText.value).toBe('消息2')
    
    vi.advanceTimersByTime(1300)  // 另一半时间
    expect(message.msgType.value).toBe('info')  // 消息2 还在显示
    
    vi.advanceTimersByTime(1300)  // 消息2 的剩余时间
    expect(message.msgType.value).toBe('')  // 消息2 被清除
  })
})
