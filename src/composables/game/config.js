// 关卡配置 - 统一管理所有关卡配置

export const LEVEL1_CONFIG = {
  no: 1,
  code: 'K11-01',
  title: '安全用具使用与登杆作业',
  pass: 80,
  time: 30,
  W: 960,
  H: 640,
  GROUND: 520,
  POLE_X: 350,
  PXM: 50,
  ANCHOR: { x: 350, y: 262 },
  
  phases: [
    { name: '个人防护用品选择', cat: '安全防护', pts: 10, obj: '正确选择安全帽、防护服、安全带、绝缘鞋、脚扣' },
    { name: '穿戴检查', cat: '安全防护', pts: 10, obj: '按顺序完成穿戴检查' },
    { name: '现场安全布置', cat: '登杆操作', pts: 5, obj: '布置围栏、标示牌，确定监护人' },
    { name: '登杆前检查', cat: '工具检查', pts: 5, obj: '核对线路名称、杆号，检查杆根、基础、拉线' },
    { name: '脚扣冲击试验', cat: '工具检查', pts: 5, obj: '脚扣人体冲击试验（模拟 80kg）' },
    { name: '围杆带与安全绳检查', cat: '工具检查', pts: 5, obj: '围杆带拉力试验、安全绳外观检查' },
    { name: '登杆操作', cat: '登杆操作', pts: 20, obj: '交替脚扣登杆至 4.0m，执行高挂低用' },
    { name: '低压验电', cat: '电气测试', pts: 10, obj: '选用验电笔对插座验电并记录' },
    { name: '登高板试验', cat: '工具检查', pts: 5, obj: '登高板检查与模拟承重' },
    { name: '万用表测量', cat: '电气测试', pts: 10, obj: 'AC V 750V 档测量电压并记录' },
    { name: '漏电保护检测', cat: '电气测试', pts: 5, obj: '测试漏保动作电流与动作时间' },
    { name: '安全标识识别', cat: '现场整理', pts: 5, obj: '将安全标识拖入正确分类' },
    { name: '整理现场', cat: '现场整理', pts: 5, obj: '收回工具、拆除围栏、关闭设备' },
  ],
  
  categories: {
    '安全防护': { got: 0, max: 20 },
    '工具检查': { got: 0, max: 20 },
    '登杆操作': { got: 0, max: 25 },
    '电气测试': { got: 0, max: 25 },
    '现场整理': { got: 0, max: 10 },
  },
  
  ppe: [
    { label: '安全帽', opts: ['普通帽', '电工安全帽', '建筑帽'], correct: '电工安全帽' },
    { label: '工作服', opts: ['化纤运动服', '电工防护服', '普通外套'], correct: '电工防护服' },
    { label: '安全带', opts: ['普通腰带', '双保险安全带', '皮带'], correct: '双保险安全带' },
    { label: '绝缘鞋', opts: ['运动鞋', '绝缘鞋', '劳保鞋'], correct: '绝缘鞋' },
    { label: '脚扣', opts: ['损坏脚扣', '合格脚扣'], correct: '合格脚扣' },
  ],
  
  wearSteps: [
    ['安全帽', '调整帽带'], ['安全帽', '锁紧'],
    ['工作服', '扣紧衣扣'],
    ['安全带', '检查腰带'], ['安全带', '检查围杆带'], ['安全带', '检查安全绳'],
    ['绝缘鞋', '检查鞋底'],
  ],
  
  p4Check: {
    root: '完好',
    base: '完好',
    guy: '牢固',
  },
}

export const LEVEL2_CONFIG = {
  no: 2,
  code: 'K11-02',
  title: '安全工器具与仪器仪表的使用02',
  pass: 80,
  time: 30,
  W: 960,
  H: 640,
  
  phases: [
    { name: '选择安全防护用品', cat: '安全防护', pts: 10, obj: '进入工具柜，选择正确的个人防护用品' },
    { name: '个人防护用品穿戴', cat: '安全防护', pts: 10, obj: '按顺序完成穿戴检查' },
    { name: '设置作业区域', cat: '登杆操作', pts: 5, obj: '布置围栏、标示牌，确定监护人' },
    { name: '检查电杆', cat: '工具检查', pts: 5, obj: '核对线路名称、杆号，检查杆根、基础、拉线' },
    { name: '脚扣冲击试验', cat: '工具检查', pts: 5, obj: '脚扣人体冲击试验（模拟 80kg）' },
    { name: '围杆带、安全绳检查', cat: '工具检查', pts: 5, obj: '围杆带拉力试验、安全绳外观检查' },
    { name: '登杆操作', cat: '登杆操作', pts: 20, obj: '交替脚扣登杆至 4.0m，执行高挂低用' },
    { name: '低压验电', cat: '电气测试', pts: 10, obj: '选用验电笔对插座验电并记录' },
    { name: '登高板试验', cat: '工具检查', pts: 5, obj: '登高板检查与模拟承重' },
    { name: '万用表测量', cat: '电气测试', pts: 10, obj: 'AC V 750V 档测量电压并记录' },
    { name: '漏电保护检测', cat: '电气测试', pts: 5, obj: '测试漏保动作电流与动作时间' },
    { name: '安全标识识别', cat: '现场整理', pts: 5, obj: '将安全标识拖入正确分类' },
    { name: '整理现场', cat: '现场整理', pts: 5, obj: '收回工具、拆除围栏、关闭设备' },
  ],
  
  categories: {
    '安全防护': { got: 0, max: 20 },
    '工具检查': { got: 0, max: 20 },
    '登杆操作': { got: 0, max: 25 },
    '电气测试': { got: 0, max: 25 },
    '现场整理': { got: 0, max: 10 },
  },
  
  ppe: [
    { label: '安全帽', opts: ['普通帽', '电工安全帽', '建筑帽'], correct: '电工安全帽' },
    { label: '工作服', opts: ['化纤运动服', '电工防护服', '普通外套'], correct: '电工防护服' },
    { label: '安全带', opts: ['普通腰带', '双保险安全带', '皮带'], correct: '双保险安全带' },
    { label: '绝缘鞋', opts: ['运动鞋', '绝缘鞋', '劳保鞋'], correct: '绝缘鞋' },
    { label: '脚扣', opts: ['损坏脚扣', '合格脚扣'], correct: '合格脚扣' },
  ],
  
  wearSteps: [
    ['安全帽', '调整帽带'], ['安全帽', '锁紧'],
    ['工作服', '扣紧衣扣'],
    ['安全带', '检查腰带'], ['安全带', '检查围杆带'], ['安全带', '检查安全绳'],
    ['绝缘鞋', '检查鞋底'],
  ],
  
  p4Check: {
    root: '完好',
    base: '完好',
    guy: '牢固',
  },
}

export const LEVELS_CONFIG = {
  1: LEVEL1_CONFIG,
  2: LEVEL2_CONFIG,
  // 3: LEVEL3_CONFIG,
  // 4: LEVEL4_CONFIG,
  // 5: K2101_CONFIG,
  // 6: K3101_CONFIG,
  // 7: K3102_CONFIG,
  // 8: K3103_CONFIG,
  // 9: K3104_CONFIG,
  // 10: K3105_CONFIG,
  // 11: LowVoltageCabinetMaintenance_CONFIG,
  // 12: TemporaryPowerConstruction_CONFIG,
}

export function getLevelConfig(no) {
  return LEVELS_CONFIG[no] || null
}
