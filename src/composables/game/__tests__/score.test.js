import { describe, it, expect, beforeEach } from 'vitest'
import { useScore } from '../score.js'

describe('useScore', () => {
  let categories

  function freshCategories() {
    return {
      '安全防护': { got: 0, max: 20 },
      '工具检查': { got: 0, max: 20 },
      '登杆操作': { got: 0, max: 25 },
    }
  }

  beforeEach(() => {
    categories = freshCategories()
  })

  it('应该初始化分数', () => {
    const score = useScore(categories)
    expect(score.cats['安全防护'].got).toBe(0)
    expect(score.cats['工具检查'].got).toBe(0)
    expect(score.cats['登杆操作'].got).toBe(0)
  })
  
  it('应该添加分数', () => {
    const score = useScore(categories)
    score.addScore('安全防护', 10)
    expect(score.cats['安全防护'].got).toBe(10)
  })
  
  it('不应该超过最大分数', () => {
    const score = useScore(categories)
    score.addScore('安全防护', 30)
    expect(score.cats['安全防护'].got).toBe(20)
  })
  
  it('应该扣除分数', () => {
    const score = useScore(categories)
    score.addScore('安全防护', 10)
    score.penalize('安全防护', 5)
    expect(score.cats['安全防护'].got).toBe(5)
  })
  
  it('不应该低于 0 分', () => {
    const score = useScore(categories)
    score.penalize('安全防护', 10)
    expect(score.cats['安全防护'].got).toBe(0)
  })
  
  it('应该计算总分', () => {
    const score = useScore(categories)
    score.addScore('安全防护', 10)
    score.addScore('工具检查', 15)
    score.addScore('登杆操作', 20)
    expect(score.total.value).toBe(45)
  })
  
  it('应该返回正确的星级', () => {
    const score = useScore(categories)

    // 1 星（10 分 < 60）
    score.addScore('安全防护', 10)
    expect(score.stars()).toBe(1)

    // 2 星（10 + 20 + 25 = 55 < 60 → 还是 1 星；补到 60）
    score.addScore('工具检查', 20)
    score.addScore('登杆操作', 25)
    expect(score.total.value).toBe(55)
    expect(score.stars()).toBe(1)

    // 再补 5 分 → 60 分 = 2 星
    score.addScore('安全防护', 5)
    expect(score.total.value).toBe(60)
    expect(score.stars()).toBe(2)
  })
  
  it('应该返回正确的评价文本', () => {
    const score = useScore(categories)

    // 0 分 → 存在安全风险
    expect(score.verdict()).toBe('存在安全风险，建议重新训练')

    // 20 分（< 60）→ 仍然是存在安全风险
    score.addScore('安全防护', 20)
    expect(score.verdict()).toBe('存在安全风险，建议重新训练')

    // 60 分 → 基本掌握
    score.addScore('工具检查', 20)
    score.addScore('登杆操作', 25)
    score.addScore('安全防护', 0) // 已到上限
    // total = 20 + 20 + 25 = 65 → ≥60
    expect(score.total.value).toBe(65)
    expect(score.verdict()).toBe('基本掌握操作流程，注意安全细节')
  })
})
