import Phaser from 'phaser'
import { W, H, background, button, text, fade } from './common.js'
import { data } from './save.js'
import { WORLDS, PACK, PACKS, TOTAL_LEVELS, worldOf } from '../game.js'

export default class LevelsScene extends Phaser.Scene {
  constructor() {
    super('levels')
  }

  init(d) {
    this.page = Phaser.Math.Clamp(d?.page ?? 0, 0, PACKS - 1)
  }

  create() {
    this.input.enabled = true
    const first = this.page * PACK + 1
    const w = WORLDS[worldOf(first)]
    background(this, w.bg, w.accent)
    this.cameras.main.fadeIn(250, 20, 10, 4)
    text(this, W / 2, 66, w.name, 44, '#fff', { fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5)
    text(this, W / 2, 112, `Levels ${first}–${Math.min(TOTAL_LEVELS, first + PACK - 1)} of ${TOTAL_LEVELS}`, 17, '#f1dfbf').setOrigin(0.5)
    const stars = Object.values(data.stars).reduce((a, b) => a + b, 0)
    text(this, W - 24, 30, `${stars} ★`, 24, '#fde047', { fontStyle: 'bold' }).setOrigin(1, 0.5)
    button(this, 80, 36, '◀ Menu', () => fade(this, 'menu'), { w: 120, h: 42, size: 17, color: 0x374151 })

    const cols = 3
    const size = 160
    const gap = 24
    const left = (W - (cols * size + (cols - 1) * gap)) / 2
    for (let i = 0; i < PACK; i++) {
      const n = first + i
      if (n > TOTAL_LEVELS) break
      const open = n <= data.unlocked
      const x = left + (i % cols) * (size + gap) + size / 2
      const y = 175 + Math.floor(i / cols) * (size - 14 + gap) + size / 2 - 8
      const box = this.add.container(x, y)
      const g = this.add.graphics()
      g.fillStyle(open ? w.wood : 0x2a2a33, open ? 1 : 0.85).fillRoundedRect(-size / 2, -size / 2 + 8, size, size - 16, 18)
      g.lineStyle(3, open ? w.dark : 0xffffff, open ? 1 : 0.15).strokeRoundedRect(-size / 2, -size / 2 + 8, size, size - 16, 18)
      box.add(g)
      if (open) {
        for (const sx of [-1, 1]) box.add(this.add.image(sx * 62, -size / 2 + 26, 'screw').setScale(0.36).setAngle(sx * 40))
      }
      box.add(text(this, 0, -12, String(n), 46, open ? '#5b3414' : '#5b5b66', { fontStyle: 'bold' }).setOrigin(0.5))
      if (open) {
        const got = data.stars[n] || 0
        for (let s = 0; s < 3; s++) box.add(text(this, (s - 1) * 32, 34, '★', 28, s < got ? '#b45309' : '#00000033').setOrigin(0.5))
        box.setSize(size, size).setInteractive({ useHandCursor: true })
        box.on('pointerdown', () => {
          this.tweens.add({ targets: box, scale: 0.94, duration: 70, yoyo: true })
          fade(this, 'game', { level: n })
        })
        if (n === data.unlocked) this.tweens.add({ targets: box, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
      } else {
        box.add(text(this, 0, 28, '🔒', 28).setOrigin(0.5))
      }
    }

    const go = (d) => this.scene.restart({ page: Phaser.Math.Clamp(this.page + d, 0, PACKS - 1) })
    const nav = { w: 100, h: 48, size: 18, color: 0x92400e }
    const last = Math.floor((Math.min(data.unlocked, TOTAL_LEVELS) - 1) / PACK)
    const y = H - 46
    if (this.page > 0) {
      button(this, 62, y, '◀ Prev', () => go(-1), nav)
      if (this.page > 5) button(this, 170, y, '−5', () => go(-5), { ...nav, w: 70, color: 0x78350f })
    }
    if (this.page < PACKS - 1) {
      button(this, W - 62, y, 'Next ▶', () => go(1), nav)
      if (this.page < PACKS - 6) button(this, W - 170, y, '+5', () => go(5), { ...nav, w: 70, color: 0x78350f })
    }
    if (this.page !== last) button(this, W / 2, y, 'Current', () => this.scene.restart({ page: last }), { ...nav, w: 120, color: 0x0f766e })
  }
}
