export const W = 640
export const H = 860
export const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

function canvas(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return
  const t = scene.textures.createCanvas(key, w, h)
  draw(t.getContext(), w, h)
  t.refresh()
}

function drawScrew(ctx) {
  const g = ctx.createRadialGradient(26, 24, 3, 32, 32, 28)
  g.addColorStop(0, '#f8fafc')
  g.addColorStop(0.55, '#cbd5e1')
  g.addColorStop(1, '#64748b')
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.arc(34, 36, 26, 0, 7)
  ctx.fill()
  ctx.fillStyle = g
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(32, 32, 26, 0, 7)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(32, 15)
  ctx.lineTo(32, 49)
  ctx.moveTo(15, 32)
  ctx.lineTo(49, 32)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(32, 32, 21, Math.PI * 1.1, Math.PI * 1.6)
  ctx.stroke()
}

function drawHole(ctx) {
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.beginPath()
  ctx.arc(32, 34, 23, 0, 7)
  ctx.fill()
  const g = ctx.createRadialGradient(30, 28, 2, 32, 32, 22)
  g.addColorStop(0, '#0b0b10')
  g.addColorStop(1, '#2a2a33')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(32, 32, 22, 0, 7)
  ctx.fill()
}

export function makeTextures(scene) {
  canvas(scene, 'screw', 64, 64, drawScrew)
  canvas(scene, 'hole', 64, 64, drawHole)
  canvas(scene, 'spark', 16, 16, (ctx) => {
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(8, 8, 8, 0, Math.PI * 2)
    ctx.fill()
  })
  canvas(scene, 'glow', 128, 128, (ctx) => {
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)
  })
}

export function background(scene, [c1, c2], tint = 0xfde68a) {
  const key = `bg${c1}${c2}`
  canvas(scene, key, 8, H, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, c1)
    grad.addColorStop(1, c2)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 8, H)
  })
  scene.add.image(W / 2, H / 2, key).setDisplaySize(W, H).setDepth(-100)
  scene.add
    .particles(0, 0, 'spark', {
      x: { min: 0, max: W },
      y: H + 10,
      speedY: { min: -50, max: -15 },
      speedX: { min: -10, max: 10 },
      lifespan: 10000,
      scale: { start: 0.35, end: 0.1 },
      alpha: { start: 0.3, end: 0 },
      frequency: 300,
      tint,
    })
    .setDepth(-90)
}

export function button(scene, x, y, label, fn, { w = 200, h = 54, size = 22, color = 0x0284c7, textColor = '#fff' } = {}) {
  const box = scene.add.container(x, y)
  const bg = scene.add.graphics()
  const draw = (fill, alpha) => {
    bg.clear()
    bg.fillStyle(fill, alpha).fillRoundedRect(-w / 2, -h / 2, w, h, 14)
    bg.lineStyle(2, 0xffffff, 0.3).strokeRoundedRect(-w / 2, -h / 2, w, h, 14)
  }
  draw(color, 0.92)
  const t = scene.add.text(0, 0, label, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color: textColor }).setOrigin(0.5)
  box.add([bg, t])
  box.setSize(w, h).setInteractive({ useHandCursor: true })
  box.on('pointerover', () => draw(color, 1))
  box.on('pointerout', () => draw(color, 0.92))
  box.on('pointerdown', () => {
    scene.tweens.add({ targets: box, scale: 0.94, duration: 70, yoyo: true })
    fn()
  })
  box.setLabel = (s) => t.setText(s)
  return box
}

export const text = (scene, x, y, str, size = 22, color = '#fff', extra = {}) =>
  scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, ...extra })

export function fade(scene, to, data) {
  scene.input.enabled = false
  scene.cameras.main.fadeOut(220, 20, 10, 4)
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(to, data))
}
