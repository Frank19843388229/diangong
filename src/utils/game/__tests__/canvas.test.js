import { describe, it, expect, vi, beforeEach } from 'vitest'
import { line, rect, circle, txt, clearCanvas, drawGrid } from '../canvas.js'

describe('canvas drawing', () => {
  let ctx
  
  beforeEach(() => {
    ctx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      clearRect: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'center',
    }
  })
  
  it('应该绘制线条', () => {
    line(ctx, 0, 0, 100, 100, '#000', 2)
    
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0)
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 100)
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.strokeStyle).toBe('#000')
    expect(ctx.lineWidth).toBe(2)
  })
  
  it('应该绘制矩形', () => {
    rect(ctx, 10, 10, 100, 50, '#fff', '#000', 2)
    
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 10, 100, 50)
    expect(ctx.strokeRect).toHaveBeenCalledWith(10, 10, 100, 50)
    expect(ctx.fillStyle).toBe('#fff')
    expect(ctx.strokeStyle).toBe('#000')
  })
  
  it('应该绘制圆形', () => {
    circle(ctx, 50, 50, 30, '#fff', '#000', 2)
    
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.arc).toHaveBeenCalledWith(50, 50, 30, 0, Math.PI * 2)
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
  })
  
  it('应该绘制文本', () => {
    txt(ctx, '你好', 50, 50, '#000', '20px sans-serif', 'center')
    
    expect(ctx.fillText).toHaveBeenCalledWith('你好', 50, 50)
    expect(ctx.fillStyle).toBe('#000')
    expect(ctx.font).toBe('20px sans-serif')
    expect(ctx.textAlign).toBe('center')
  })
  
  it('应该清空画布', () => {
    clearCanvas(ctx, 100, 100, '#fff')
    
    expect(ctx.fillStyle).toBe('#fff')
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 100)
  })
  
  it('应该绘制网格', () => {
    drawGrid(ctx, 100, 100, 50, '#eee')
    
    expect(ctx.strokeStyle).toBe('#eee')
    expect(ctx.lineWidth).toBe(0.5)
  })
})
