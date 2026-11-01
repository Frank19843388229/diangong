// ================= 图片素材统一映射 =================
// 目录 src/assets 下的器材图（中文文件名）→ 代码里的语义名。
// 用 import.meta.glob 一次性把整目录图片打进来，不用为每张图手写 import。

// eager 全量引入，query '?url' 拿到打包后的可引用地址
const files = import.meta.glob('./*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' })

// 中文文件名（去扩展名）→ url
export const IMG = {}
for (const [path, url] of Object.entries(files)) {
  const base = path.replace(/^\.\/|\.png$|\.jpe?g$|\.webp$/g, '')
  IMG[base] = url
}

// 界面里的选项文字 → 图片文件名（去扩展名）的别名表。
// 只有名字对不上的才写这里，能对上的不用写。
const ALIAS = {
  // 工具：不合格项
  '绝缘破损的剥线钳（不合格）': '破损剥线钳',
  '绝缘破裂的压线钳（不合格）': '破损压线钳',
  '绝缘破损的剥线钳': '破损剥线钳',
  '绝缘破裂的压线钳': '破损压线钳',
  '带水湿布': '带水抹布',
  '吸尘设备': '工业吸尘器',
  // 仪表
  '数字式万用表': '数字万用表',
  '指针式万用表': '指针万用表',
  '数字式钳形电流表': '钳形电流表',
  '钳形表': '钳形电流表',
  '绝缘电阻表': '兆欧表',
  // 元器件
  '接线端子': '接线端子排',
  '接触器': '交流接触器',
  '交流接触器 KM1（正转）': '交流接触器',
  '交流接触器 KM2（反转）': '交流接触器',
  '扳手': '活动扳手',
  '万用表': '数字万用表',
  '单相异步电动机': '单向异步电动机',
  '单相电能表': '单向电能表',
  '电动机': '三相异步电动机',
  '电能表': '单向电能表',
  // PPE
  '电工绝缘鞋': '绝缘鞋',
  '普通帽': '普通安全帽',
  '建筑帽': '施工帽',
  '普通衣服': '工作服',
  '普通外套': '工作服',
  '化纤运动服': '工作服',
  '化纤外套': '工作服',
  '电工防护服': '电工工作服',
  '电工作业服': '电工工作服',
  '普通皮带': '普通腰带',
  '皮带': '普通腰带',
  '合格脚扣': '脚扣',
  '损坏脚扣': '破损的脚扣',
  '合格围杆带': '合格围杆带',
  '损坏围杆带': '损坏围杆带',
  '合格安全绳': '合格安全绳',
  '断股安全绳': '断股安全绳',
  '00级绝缘手套': '00级低压绝缘手套',
  '绝缘手套': '00级低压绝缘手套',
  '防护眼镜（完好）': '防护眼镜',
  '6kV 绝缘垫（完好）': '6kv绝缘垫',
  '绝缘垫（完好）': '6kv绝缘垫',
  '绝缘垫（有破损）': '破损6kv绝缘垫',
  '绝缘垫（油污污染）': '油污污染6kv绝缘垫',
  '绝缘垫': '6kv绝缘垫',
}

// 解析出最终 url；找不到返回 undefined
export function urlFor(name) {
  if (!name) return undefined
  if (IMG[name]) return IMG[name]
  const key = ALIAS[name]
  if (key && IMG[key]) return IMG[key]
  return undefined
}

// 给模板 / <img :src> 用
export function imgUrl(name) {
  return urlFor(name)
}

// ---------------- 画布用：缓存 Image 对象 ----------------
const imgCache = new Map()
export function getImage(name) {
  const url = urlFor(name)
  if (!url) return null
  if (imgCache.has(url)) return imgCache.get(url)
  const im = new Image()
  im.src = url
  imgCache.set(url, im)
  return im
}

// 把图片等比缩放（contain）画进 (x,y,w,h) 区域，居中。
// opt.card=true 时先铺一张白底圆角卡片（JPG 白底图会更干净）。
// 图片没加载好返回 false，调用方可继续画原来的色块/文字兜底。
export function drawImgFit(c, name, x, y, w, h, opt = {}) {
  const im = getImage(name)
  if (!im || !im.complete || !im.naturalWidth) return false
  const pad = opt.pad ?? 2
  const bw = w - pad * 2, bh = h - pad * 2
  if (bw <= 0 || bh <= 0) return false
  if (opt.card) {
    c.save()
    c.fillStyle = opt.cardColor || '#ffffff'
    if (c.roundRect) {
      c.beginPath()
      c.roundRect(x + pad, y + pad, bw, bh, opt.r ?? 4)
      c.fill()
    } else {
      c.fillRect(x + pad, y + pad, bw, bh)
    }
    c.restore()
  }
  const s = Math.min(bw / im.naturalWidth, bh / im.naturalHeight)
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s
  c.drawImage(im, x + pad + (bw - dw) / 2, y + pad + (bh - dh) / 2, dw, dh)
  return true
}
