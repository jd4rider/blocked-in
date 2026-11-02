import Phaser from 'phaser'
import { W, H, background, button, text, fade } from './common.js'
import { data } from './save.js'
import { TOTAL_LEVELS, PACK, WORLDS } from '../game.js'

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu')
  }

  create() {
    this.input.enabled = true
    background(this, WORLDS[0].bg, 0xfde68a)
    this.cameras.main.fadeIn(300, 20, 10, 4)

    // Title blocks that slide to spell out the name.
    const word = ['B', 'L', 'O', 'C', 'K', 'E', 'D']
    const cols = [0xf59e0b, 0x38bdf8, 0x4ade80, 0xf472b6, 0xa78bfa, 0xfb923c, 0x2dd4bf]
    word.forEach((ch, k) => {
      const x = 62 + k * 86
      const c = this.add.container(x + (k % 2 ? 300 : -300), 170)
      const g = this.add.graphics()
      g.fillStyle(0x000000, 0.35).fillRoundedRect(-36, -34, 72, 78, 14)
      g.fillStyle(cols[k], 1).fillRoundedRect(-38, -40, 72, 78, 14)
      g.fillStyle(0xffffff, 0.25).fillRoundedRect(-30, -34, 56, 8, 4)
      c.add(g)
      c.add(text(this, -2, -2, ch, 52, '#1e1536', { fontStyle: 'bold' }).setOrigin(0.5))
      c.setAlpha(0)
      this.tweens.add({ targets: c, x, alpha: 1, duration: 520, delay: 80 * k, ease: 'Back.Out' })
    })
    const inn = text(this, W / 2, 250, 'IN', 48, '#fde047', { fontStyle: 'bold', stroke: '#1e1536', strokeThickness: 8 }).setOrigin(0.5)
    this.tweens.add({ targets: inn, scale: 1.12, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' })

    text(this, W / 2, 330, 'Slide the blocks. Free the red key.', 21, '#fde68a', { align: 'center', wordWrap: { width: 520 } }).setOrigin(0.5)
    text(this, W / 2, 362, 'Spinners, magnets and moving exits will test you.', 17, '#d9ccf5').setOrigin(0.5)

    const done = Object.keys(data.stars).length
    const stars = Object.values(data.stars).reduce((a, b) => a + b, 0)
    const next = Math.min(data.unlocked, TOTAL_LEVELS)
    button(this, W / 2, 470, next > 1 ? `▶  Continue · Level ${next}` : '▶  Play', () => fade(this, 'game', { level: next }), { w: 420, h: 66, size: 28, color: 0xd97706 })
    button(this, W / 2, 560, '🗂  Levels', () => fade(this, 'levels', { page: Math.floor((next - 1) / PACK) }), { w: 420, h: 60, size: 26, color: 0x0f766e })
    text(this, W / 2, 618, `${done}/${TOTAL_LEVELS} levels · ${stars}★`, 20, '#fff').setOrigin(0.5)

    WORLDS.forEach((w, i) => this.add.circle(W / 2 + (i - 2) * 34, 690, 11, w.wood).setStrokeStyle(3, w.dark))
    text(this, W / 2, 770, 'Drag blocks along their lane. Tap spinners to turn them.', 17, '#f1dfbf').setOrigin(0.5)
    text(this, W / 2, H - 50, '200 levels · 5 worlds · undo & hints', 15, '#bfa77c').setOrigin(0.5)
  }
}
