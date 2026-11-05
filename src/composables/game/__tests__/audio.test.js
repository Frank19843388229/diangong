import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAudio } from '../audio.js'

describe('useAudio', () => {
  let audio
  
  beforeEach(() => {
    // Mock AudioContext
    global.AudioContext = vi.fn(() => ({
      createOscillator: vi.fn(() => ({
        type: 'sine',
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      createGain: vi.fn(() => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      })),
      destination: {},
      currentTime: 0,
    }))
    
    audio = useAudio()
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })
  
  it('应该创建 AudioContext', () => {
    audio.beep(600, 0.08)
    expect(global.AudioContext).toHaveBeenCalled()
  })
  
  it('beep 函数应该被调用', () => {
    const spy = vi.spyOn(audio, 'beep')
    audio.beep(600, 0.08)
    expect(spy).toHaveBeenCalledWith(600, 0.08)
  })
  
  it('beep 函数应该处理错误', () => {
    // Mock AudioContext 抛出错误
    global.AudioContext = vi.fn(() => {
      throw new Error('AudioContext not available')
    })
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // 不应该抛出错误
    expect(() => audio.beep()).not.toThrow()
    
    consoleSpy.mockRestore()
  })
})
