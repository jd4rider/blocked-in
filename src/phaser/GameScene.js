import Phaser from 'phaser'
import { openTipJar } from './support.js'
import { W, H, button, text, fade, background } from './common.js'
import { flashAt, popText, grains } from './fx.js'
import { sfx } from '../sound.js'
import { data, persist } from './save.js'
import { levelData, WORLDS, worldOf, TOTAL_LEVELS, PACK, N, startState, applyMove, reach, solve, isWon, exitRow, period, starsFor } from '../game.js'

const CS = 88
const X0 = (W - N * CS) / 2
const Y0 = 196
const PALETTE = [0xf59e0b, 0x38bdf8, 0x4ade80, 0xf472b6, 0xa78bfa, 0xfb923c, 0x2dd4bf, 0xfacc15]
const shade = (c, f) => {
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)))
  return (ch((c >> 16) & 255) << 16) | (ch((c >> 8) & 255) << 8) | ch(c & 255)
}
const cx = (x) => X0 + (x + 0.5) * CS
const cy = (y) => Y0 + (y + 0.5) * CS

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('game')
  }

  init(d) {
    this.n = Phaser.Math.Clamp(d?.level ?? 1, 1, TOTAL_LEVELS)
  }

  create() {
    this.input.enabled = true
    this.lvl = levelData(this.n)
    this.world = WORLDS[worldOf(this.n)]
    this.state = startState(this.lvl)
    this.history = []
    this.moveCount = 0
    this.busy = false
    this.ended = false
    this.drag = null
    this.marks = []
    this.cameras.main.fadeIn(250, 20, 10, 4)

    background(this, this.world.bg, this.world.accent)
    this.drawBoard()
    this.objs = this.lvl.blocks.map((b, i) => this.makeBlock(b, i))
    this.gate = this.makeGate()
    this.syncAll()
    this.buildHud()
    this.input.on('pointermove', (p) => this.onMove(p))
    this.input.on('pointerup', (p) => this.onUp(p))
    this.input.keyboard.on('keydown-U', () => this.undo())
    this.input.keyboard.on('keydown-Z', () => this.undo())
    this.input.keyboard.on('keydown-H', () => this.hint())
    this.input.keyboard.on('keydown-W', () => this.wait())
    this.input.keyboard.on('keydown-R', () => this.scene.restart({ level: this.n }))
    this.input.keyboard.on('keydown-ESC', () => fade(this, 'levels', { page: Math.floor((this.n - 1) / PACK) }))
    this.intro()
  }

  // ---- drawing --------------------------------------------------------------------------------------------

  drawBoard() {
    const w = this.world
    const g = this.add.graphics().setDepth(-10)
    const bx = X0 - 18
    const by = Y0 - 18
    const bs = N * CS + 36
    g.fillStyle(0x000000, 0.35).fillRoundedRect(bx + 4, by + 8, bs, bs, 26)
    g.fillStyle(w.wall, 1).fillRoundedRect(bx, by, bs, bs, 26)
    g.lineStyle(5, shade(w.wall, 1.7), 1).strokeRoundedRect(bx, by, bs, bs, 26)
    g.fillStyle(shade(w.wall, 0.7), 1).fillRoundedRect(X0 - 4, Y0 - 4, N * CS + 8, N * CS + 8, 10)
    g.lineStyle(2, 0xffffff, 0.07)
    for (let i = 0; i <= N; i++) {
      g.lineBetween(X0 + i * CS, Y0, X0 + i * CS, Y0 + N * CS)
      g.lineBetween(X0, Y0 + i * CS, X0 + N * CS, Y0 + i * CS)
    }
  }

  makeBlock(b, i) {
    const c = this.add.container(0, 0).setDepth(5)
    const g = this.add.graphics()
    const len = b.len
    const wpx = len * CS
    const pad = 5
    const color = b.kind === 'special' ? 0xef4444 : b.kind === 'wall' ? 0x6b7280 : b.kind === 'rot' ? 0x38bdf8 : b.kind === 'mag' ? 0xc084fc : PALETTE[b.c % PALETTE.length]
    const x0 = -CS / 2 + pad
    const y0 = -CS / 2 + pad
    const bw = wpx - pad * 2
    const bh = CS - pad * 2
    g.fillStyle(0x000000, 0.35).fillRoundedRect(x0 + 2, y0 + 5, bw, bh, 16)
    g.fillStyle(shade(color, 0.7), 1).fillRoundedRect(x0, y0, bw, bh, 16)
    g.fillStyle(color, 1).fillRoundedRect(x0 + 3, y0 + 2, bw - 6, bh - 8, 14)
    g.fillStyle(0xffffff, 0.22).fillRoundedRect(x0 + 8, y0 + 6, bw - 16, 10, 5)
    if (b.kind === 'wall') {
      g.lineStyle(3, 0x374151, 0.9)
      g.lineBetween(x0 + 8, 0, x0 + bw - 8, 0)
      g.lineBetween(-10, y0 + 6, -10, 0)
      g.lineBetween(14, 0, 14, y0 + bh - 12)
    } else if (b.kind === 'normal') {
      g.lineStyle(3, shade(color, 0.75), 0.8)
      for (let k = 1; k < len; k++) g.lineBetween(-CS / 2 + k * CS, y0 + 10, -CS / 2 + k * CS, y0 + bh - 14)
    }
    c.add(g)
    const mid = ((len - 1) * CS) / 2
    if (b.kind === 'special') {
      const e = this.add.graphics()
      e.fillStyle(0xffffff, 0.95)
      e.fillTriangle(mid - 14 + 18, 0, mid - 14 - 8, -20, mid - 14 - 8, 20)
      e.fillCircle(-14, 0, 12)
      e.fillStyle(0xef4444, 1).fillCircle(-14, 0, 5)
      c.add(e)
    } else if (b.kind === 'rot') {
      const e = this.add.graphics()
      e.lineStyle(7, 0xffffff, 0.95)
      e.beginPath()
      e.arc(0, 0, 18, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(500), false)
      e.strokePath()
      e.fillStyle(0xffffff, 1).fillTriangle(10, -22, 28, -12, 8, -4)
      c.add(e)
    } else if (b.kind === 'mag') {
      const e = this.add.graphics()
      e.lineStyle(10, 0xef4444, 1)
      e.beginPath()
      e.arc(mid, 4, 17, Math.PI, 0, false)
      e.strokePath()
      e.lineStyle(10, 0xe5e7eb, 1)
      e.lineBetween(mid - 17, 4, mid - 17, 20)
      e.lineBetween(mid + 17, 4, mid + 17, 20)
      e.fillStyle(0xe5e7eb, 1)
      c.add(e)
    }
    if (b.kind !== 'wall') {
      c.setInteractive(new Phaser.Geom.Rectangle(-CS / 2, -CS / 2, wpx, CS), Phaser.Geom.Rectangle.Contains)
      c.on('pointerdown', (pointer) => this.beginDrag(i, pointer))
      c.input.cursor = 'grab'
    }
    return c
  }

  makeGate() {
    const rows = this.lvl.exit.rows
    const g = this.add.graphics().setDepth(2)
    if (rows.length > 1) {
      g.lineStyle(3, 0x86efac, 0.35)
      for (const r of rows) g.strokeRoundedRect(X0 + N * CS + 6, Y0 + r * CS + 8, 20, CS - 16, 6)
    }
    const c = this.add.container(X0 + N * CS + 16, 0).setDepth(30)
    const body = this.add.graphics()
    body.fillStyle(0x16a34a, 1).fillRoundedRect(-14, -CS / 2 + 8, 28, CS - 16, 8)
    body.fillStyle(0xbbf7d0, 1).fillTriangle(-6, -14, -6, 14, 8, 0)
    c.add(body)
    this.tweens.add({ targets: body, alpha: 0.65, duration: 600, yoyo: true, repeat: -1 })
    const ghost = this.add.graphics().setDepth(29).setAlpha(0.3)
    ghost.fillStyle(0x86efac, 1).fillRoundedRect(X0 + N * CS + 2, -CS / 2 + 8, 28, CS - 16, 8)
    return { c, ghost }
  }

  syncGate(animate) {
    const y = cy(exitRow(this.lvl, this.state.ph))
    const nextY = cy(exitRow(this.lvl, (this.state.ph + 1) % period(this.lvl)))
    if (animate) this.tweens.add({ targets: this.gate.c, y, duration: 220, ease: 'Cubic.Out' })
    else this.gate.c.y = y
    this.gate.ghost.y = nextY
    this.gate.ghost.setVisible(period(this.lvl) > 1)
  }

  posOf(p) {
    return { x: cx(p[0]) + (p[2] ? 0 : 0), y: cy(p[1]), a: p[2] ? 90 : 0 }
  }

  syncAll(animate = false, skip = -1) {
    this.state.p.forEach((p, i) => {
      if (i === skip) return
      const t = this.posOf(p)
      const o = this.objs[i]
      if (animate) {
        this.tweens.killTweensOf(o)
        this.tweens.add({ targets: o, x: t.x, y: t.y, angle: t.a, duration: 150, ease: 'Cubic.Out' })
      } else o.setPosition(t.x, t.y).setAngle(t.a)
    })
    this.syncGate(animate)
  }

  // ---- HUD ------------------------------------------------------------------------------------------------

  buildHud() {
    text(this, W / 2, 34, `Level ${this.n}`, 32, '#fff', { fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5)
    text(this, W / 2, 70, this.world.name, 17, '#e4dcf5').setOrigin(0.5)
    this.movesText = text(this, W / 2, 104, '', 20, '#fde68a', { fontStyle: 'bold' }).setOrigin(0.5)
    this.msg = text(this, W / 2, 148, '', 18, '#fff', { fontStyle: 'bold', stroke: '#000', strokeThickness: 4, align: 'center', wordWrap: { width: 560 } }).setOrigin(0.5).setDepth(150)
    this.updateHud()
    const y = 792
    const patrol = period(this.lvl) > 1
    const w = patrol ? 112 : 126
    const gap = patrol ? 118 : 140
    const left = patrol ? 64 : 78
    const b = { w, h: 52, size: patrol ? 17 : 19 }
    let k = 0
    const at = () => left + gap * k++
    this.undoBtn = button(this, at(), y, '↶ Undo', () => this.undo(), { ...b, color: 0x0f766e })
    button(this, at(), y, '💡 Hint', () => this.hint(), { ...b, color: 0xb45309 })
    if (patrol) button(this, at(), y, '⏳ Wait', () => this.wait(), { ...b, color: 0x16a34a })
    button(this, at(), y, '↻ Restart', () => this.scene.restart({ level: this.n }), { ...b, color: 0x1d4ed8 })
    button(this, at(), y, '☰ Levels', () => fade(this, 'levels', { page: Math.floor((this.n - 1) / PACK) }), { ...b, color: 0x475569 })
    text(this, W / 2, 836, 'Drag blocks · tap spinners · U undo · H hint · R restart', 13, '#b9aedd').setOrigin(0.5)
  }

  updateHud() {
    this.movesText.setText(`Moves ${this.moveCount}   ·   3★ in ${Math.ceil(this.lvl.par * 1.25)}`)
    this.undoBtn?.setAlpha(this.history.length ? 1 : 0.45)
  }

  toast(str, color = '#fff', ms = 2600) {
    this.msg.setText(str).setColor(color).setAlpha(1)
    this.msgTimer?.remove()
    if (ms) this.msgTimer = this.time.delayedCall(ms, () => this.tweens.add({ targets: this.msg, alpha: 0, duration: 300 }))
  }

  intro() {
    const kinds = new Set(this.lvl.blocks.map((b) => b.kind))
    data.seen ||= {}
    const once = (key, msg, color) => {
      data.seen[key] = 1
      persist()
      this.toast(msg, color, 6500)
    }
    if (this.n === 1) this.toast('Drag the blocks to clear a path for the red key block.', '#fde68a', 7000)
    else if (kinds.has('rot') && !data.seen.rot) once('rot', 'SPINNERS turn 90° when you tap them, if there is room.', '#7dd3fc')
    else if (kinds.has('mag') && !data.seen.mag) once('mag', 'MAGNETS tow the block right behind them as they slide.', '#e9d5ff')
    else if (period(this.lvl) > 1 && !data.seen.gate) once('gate', 'The exit gate moves one step after EVERY move. Time it, or tap Wait.', '#86efac')
  }

  // ---- input ----------------------------------------------------------------------------------------------

  beginDrag(i, pointer) {
    if (this.busy || this.ended || this.drag) return
    const p = this.state.p[i]
    this.drag = { i, sx: pointer.worldX, sy: pointer.worldY, axis: p[2], reach: reach(this.lvl, this.state, i), delta: 0, moved: 0, k: 0 }
    this.objs[i].setDepth(20)
    this.clearMarks()
  }

  onMove(pointer) {
    const d = this.drag
    if (!d) return
    const raw = d.axis ? pointer.worldY - d.sy : pointer.worldX - d.sx
    d.moved = Math.max(d.moved, Math.abs(raw))
    d.delta = Phaser.Math.Clamp(raw, -d.reach.neg * CS, d.reach.pos * CS)
    const base = this.posOf(this.state.p[d.i])
    const o = this.objs[d.i]
    if (d.axis) o.y = base.y + d.delta
    else o.x = base.x + d.delta
    const k = Math.round(d.delta / CS)
    if (k !== d.k) {
      d.k = k
      if (this.lvl.blocks[d.i].kind === 'mag') {
        const ns = k ? applyMove(this.lvl, this.state, { t: 's', i: d.i, d: Math.sign(k), k: Math.abs(k) }) : this.state
        if (ns) ns.p.forEach((p, j) => j !== d.i && this.objs[j].setPosition(this.posOf(p).x, this.posOf(p).y))
      }
    }
  }

  onUp() {
    const d = this.drag
    if (!d) return
    this.drag = null
    this.objs[d.i].setDepth(5)
    const b = this.lvl.blocks[d.i]
    if (d.moved < 10) {
      if (b.kind === 'rot') this.rotate(d.i)
      else this.syncAll(true)
      return
    }
    const k = Math.round(d.delta / CS)
    if (!k) {
      this.syncAll(true)
      return
    }
    this.doMove({ t: 's', i: d.i, d: Math.sign(k), k: Math.abs(k) })
  }

  rotate(i) {
    const mv = { t: 'r', i }
    if (!applyMove(this.lvl, this.state, mv)) {
      sfx.wrong()
      const o = this.objs[i]
      this.tweens.add({ targets: o, angle: o.angle + 8, duration: 60, yoyo: true, repeat: 1 })
      this.toast('No room to turn here.', '#fca5a5', 1500)
      return
    }
    sfx.creak()
    this.doMove(mv)
  }

  wait() {
    if (period(this.lvl) > 1) this.doMove({ t: 'w' })
  }

  // ---- moves ----------------------------------------------------------------------------------------------

  doMove(mv) {
    if (this.busy || this.ended) return
    const ns = applyMove(this.lvl, this.state, mv)
    if (!ns) {
      this.syncAll(true)
      return
    }
    this.clearMarks()
    this.history.push(this.state)
    this.state = ns
    this.moveCount++
    if (mv.t === 's') sfx.whoosh()
    else if (mv.t === 'w') sfx.tick()
    this.syncAll(true)
    this.updateHud()
    this.msg.setAlpha(0)
    this.busy = true
    this.time.delayedCall(190, () => {
      this.busy = false
      if (mv.t === 's') sfx.clunk()
      if (isWon(this.lvl, this.state)) this.leave()
      else this.checkStuck()
    })
  }

  undo() {
    if (this.busy || this.ended || !this.history.length) return
    this.state = this.history.pop()
    this.moveCount = Math.max(0, this.moveCount - 1)
    sfx.click()
    this.clearMarks()
    this.syncAll(true)
    this.updateHud()
    this.msg.setAlpha(0)
  }

  clearMarks() {
    this.marks.forEach((m) => m.destroy())
    this.marks = []
  }

  hint() {
    if (this.busy || this.ended) return
    const res = solve(this.lvl, this.state, 120000)
    if (!res.path) {
      this.toast(res.capped ? 'No hint found, try undoing a few moves.' : 'Stuck! Undo or restart.', '#fca5a5', 3000)
      return
    }
    this.clearMarks()
    const mv = res.path[0]
    sfx.hint()
    const outline = (p, len, color) => {
      const horizontal = !p[2]
      const w = horizontal ? len * CS : CS
      const h = horizontal ? CS : len * CS
      const r = this.add.rectangle(X0 + p[0] * CS + w / 2, Y0 + p[1] * CS + h / 2, w - 6, h - 6).setStrokeStyle(5, color).setDepth(40)
      this.tweens.add({ targets: r, alpha: 0.25, duration: 380, yoyo: true, repeat: -1 })
      this.marks.push(r)
    }
    if (mv.t === 'w') {
      this.toast('Wait one move for the exit to line up.', '#86efac', 3500)
      return
    }
    const b = this.lvl.blocks[mv.i]
    outline(this.state.p[mv.i], b.len, 0xfde047)
    if (mv.t === 's') {
      const p = this.state.p[mv.i]
      const to = [p[0] + (p[2] ? 0 : mv.d * mv.k), p[1] + (p[2] ? mv.d * mv.k : 0), p[2]]
      outline(to, b.len, 0x4ade80)
      const dir = p[2] ? (mv.d > 0 ? 'down' : 'up') : mv.d > 0 ? 'right' : 'left'
      this.toast(`Slide the yellow block ${dir} ${mv.k}.`, '#fde68a', 3500)
    } else this.toast('Tap the yellow spinner to turn it.', '#fde68a', 3500)
  }

  checkStuck() {
    if (this.ended || this.busy) return
    const res = solve(this.lvl, this.state, 30000)
    if (!res.path && !res.capped) {
      this.toast('Stuck! Undo (U) or restart (R).', '#fca5a5', 0)
      sfx.wrong()
    }
  }

  // ---- finish ---------------------------------------------------------------------------------------------

  leave() {
    this.ended = true
    const o = this.objs[0]
    sfx.coin()
    flashAt(this, X0 + N * CS, cy(this.state.p[0][1]), 360, 0x86efac)
    this.tweens.add({ targets: o, x: o.x + 3 * CS, duration: 520, ease: 'Cubic.In', onComplete: () => this.win() })
  }

  win() {
    const earned = starsFor(this.lvl, this.moveCount)
    data.stars[this.n] = Math.max(data.stars[this.n] || 0, earned)
    if (this.n + 1 > data.unlocked && this.n < TOTAL_LEVELS) data.unlocked = this.n + 1
    const prev = data.best[this.n]
    const best = prev && this.moveCount < prev
    if (!prev || this.moveCount < prev) data.best[this.n] = this.moveCount
    persist()
    sfx.win()
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 140, () => grains(this, Phaser.Math.Between(120, 520), Phaser.Math.Between(240, 560), [0xfde047, 0xf59e0b, 0xffffff, this.world.accent], 24, 380))
    const D = 200
    const shadeR = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(D)
    this.tweens.add({ targets: shadeR, fillAlpha: 0.55, duration: 300 })
    const box = this.add.container(W / 2, H / 2 - 20).setDepth(D + 1)
    const bg = this.add.graphics()
    bg.fillStyle(0x1a1233, 0.97).fillRoundedRect(-270, -200, 540, 420, 28)
    bg.lineStyle(4, 0xfde047, 1).strokeRoundedRect(-270, -200, 540, 420, 28)
    box.add(bg)
    box.add(text(this, 0, -150, 'Unblocked!', 44, '#fde047', { fontStyle: 'bold' }).setOrigin(0.5))
    for (let i = 0; i < 3; i++) {
      const st = text(this, (i - 1) * 80, -70, '★', 70, i < earned ? '#fde047' : '#3f3560').setOrigin(0.5)
      box.add(st)
      if (i < earned) this.tweens.add({ targets: st, scale: 1.4, duration: 260, delay: 250 + i * 240, yoyo: true, ease: 'Back.Out' })
    }
    box.add(text(this, 0, 5, `${this.moveCount} moves  ·  par ${this.lvl.par}${best ? '  ·  new best!' : ''}`, 20, '#e4dcf5').setOrigin(0.5))
    const hasNext = this.n < TOTAL_LEVELS
    const y = 110
    box.add(button(this, hasNext ? -170 : -90, y, '↻ Retry', () => this.scene.restart({ level: this.n }), { w: 150, h: 58, size: 22, color: 0x1d4ed8 }))
    box.add(button(this, hasNext ? 0 : 90, y, '🗂 Levels', () => fade(this, 'levels', { page: Math.floor((this.n - 1) / PACK) }), { w: 150, h: 58, size: 22, color: 0x475569 }))
    if (hasNext) box.add(button(this, 170, y, 'Next ▶', () => fade(this, 'game', { level: this.n + 1 }), { w: 150, h: 58, size: 22, color: 0xd97706 }))
    // Quiet support link: results panel only, under the actions inside the card.
    box.add(button(this, 0, 172, '☕ Buy me a coffee', () => openTipJar(), { w: 230, h: 28, size: 15, color: 0x2b2140, textColor: '#fde68a' }))
    box.setScale(0.7).setAlpha(0)
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 280, ease: 'Back.Out' })
    this.input.keyboard.once('keydown-ENTER', () => (hasNext ? fade(this, 'game', { level: this.n + 1 }) : this.scene.restart({ level: this.n })))
    flashAt(this, W / 2, H / 2, 600, 0xfde047)
    popText(this, W / 2, 150, `${earned}★`, '#fde047', 34)
  }
}
