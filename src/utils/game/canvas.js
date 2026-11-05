// 画布绘制工具 - 从各关卡文件中提取的公共逻辑
export function line(c, x1, y1, x2, y2, col = '#000', lw = 1) {
  c.beginPath()
  c.moveTo(x1, y1)
  c.lineTo(x2, y2)
  c.strokeStyle = col
  c.lineWidth = lw
  c.stroke()
}

export function rect(c, x, y, w, h, fill, stroke, lw = 2) {
  if (fill) {
    c.fillStyle = fill
    c.fillRect(x, y, w, h)
  }
  if (stroke) {
    c.strokeStyle = stroke
    c.lineWidth = lw
    c.strokeRect(x, y, w, h)
  }
}

export function circle(c, x, y, r, fill, stroke, lw = 2) {
  c.beginPath()
  c.arc(x, y, r, 0, Math.PI * 2)
  if (fill) {
    c.fillStyle = fill
    c.fill()
  }
  if (stroke) {
    c.strokeStyle = stroke
    c.lineWidth = lw
    c.stroke()
  }
}

export function txt(c, s, x, y, col = '#000', font = '12px sans-serif', align = 'center') {
  c.fillStyle = col
  c.font = font
  c.textAlign = align
  c.fillText(s, x, y)
}

export function clearCanvas(c, w, h, color = '#fff') {
  c.fillStyle = color
  c.fillRect(0, 0, w, h)
}

export function drawGrid(c, w, h, step = 50, color = '#eee') {
  c.strokeStyle = color
  c.lineWidth = 0.5
  for (let x = 0; x <= w; x += step) {
    c.beginPath()
    c.moveTo(x, 0)
    c.lineTo(x, h)
    c.stroke()
  }
  for (let y = 0; y <= h; y += step) {
    c.beginPath()
    c.moveTo(0, y)
    c.lineTo(w, y)
    c.stroke()
  }
}
