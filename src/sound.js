let ctx = null
export const audioState = { muted: false }

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, { type = 'sine', dur = 0.18, gain = 0.12, delay = 0 } = {}) {
  if (audioState.muted || !Number.isFinite(freq)) return
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const osc = a.createOscillator()
  const amp = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  amp.gain.setValueAtTime(0.0001, t)
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(amp).connect(a.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noise({ dur = 0.4, gain = 0.2, freq = 600, delay = 0 } = {}) {
  if (audioState.muted) return
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2
  const src = a.createBufferSource()
  src.buffer = buf
  const filter = a.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(freq * 4, t)
  filter.frequency.exponentialRampToValueAtTime(freq, t + dur)
  const amp = a.createGain()
  amp.gain.value = gain
  src.connect(filter).connect(amp).connect(a.destination)
  src.start(t)
}

// A rising-then-falling sweep that reads as a little meow.
function meow(base = 520, delay = 0) {
  if (audioState.muted) return
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const osc = a.createOscillator()
  const amp = a.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(base, t)
  osc.frequency.exponentialRampToValueAtTime(base * 1.7, t + 0.09)
  osc.frequency.exponentialRampToValueAtTime(base * 0.8, t + 0.3)
  amp.gain.setValueAtTime(0.0001, t)
  amp.gain.exponentialRampToValueAtTime(0.1, t + 0.04)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
  osc.connect(amp).connect(a.destination)
  osc.start(t)
  osc.stop(t + 0.35)
}

export const sfx = {
  unscrew: () => [0, 1, 2, 3].forEach((i) => tone(900 + i * 70, { type: 'square', dur: 0.04, gain: 0.03, delay: i * 0.035 })),
  screw: () => [3, 2, 1, 0].forEach((i) => tone(700 + i * 60, { type: 'square', dur: 0.05, gain: 0.035, delay: i * 0.04 })),
  clunk: () => {
    noise({ dur: 0.35, gain: 0.18, freq: 220 })
    tone(90, { type: 'triangle', dur: 0.25, gain: 0.12 })
  },
  creak: () => tone(240, { type: 'sawtooth', dur: 0.4, gain: 0.04 }),
  whoosh: () => noise({ dur: 0.5, gain: 0.07, freq: 1200 }),
  coin: () => [12, 19].forEach((s, i) => tone(660 * 2 ** (s / 12), { dur: 0.15, gain: 0.07, delay: i * 0.08 })),
  click: () => tone(640, { type: 'triangle', dur: 0.06, gain: 0.06 }),
  select: () => tone(780, { type: 'sine', dur: 0.05, gain: 0.05 }),
  meow: (v = 1) => meow(430 + v * 45),
  wrong: () => {
    tone(200, { type: 'sawtooth', dur: 0.18, gain: 0.05 })
    tone(150, { type: 'sawtooth', dur: 0.25, gain: 0.05, delay: 0.1 })
  },
  purr: () => {
    for (let i = 0; i < 6; i++) noise({ dur: 0.1, gain: 0.07, freq: 300, delay: i * 0.07 })
    ;[0, 4, 7, 12].forEach((s, i) => tone(660 * 2 ** (s / 12), { type: 'triangle', dur: 0.2, gain: 0.05, delay: i * 0.07 }))
  },
  hint: () => tone(700, { type: 'triangle', dur: 0.12, gain: 0.06 }),
  tick: () => tone(880, { type: 'square', dur: 0.04, gain: 0.03 }),
  win: () => {
    ;[0, 4, 7, 12, 16].forEach((s, i) => tone(523.25 * 2 ** (s / 12), { dur: 0.4, delay: i * 0.1 }))
    meow(560, 0.1)
    meow(700, 0.45)
  },
  lose: () => [7, 3, 0, -5].forEach((s, i) => tone(392 * 2 ** (s / 12), { type: 'triangle', dur: 0.4, delay: i * 0.16 })),
}
