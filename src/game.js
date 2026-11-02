import TABLE from './levels-table.js'

// Rules of Blocked In.
// A 6x6 board of sliding blocks. Blocks slide along their own axis. Free the red key block through the
// exit on the right wall. Twists, introduced world by world:
//   rot  - tap to turn 90 degrees about its top-left cell (needs the cell it swings into to be empty)
//   mag  - when it slides, the block directly behind it (same axis) is towed along
//   wall - fixed stone
//   exit - in later worlds the exit patrols up and down the right wall, one step per move
// One move = one drag of any length, one rotation, or one wait. Every move advances the exit.

export const N = 6
export const TOTAL_LEVELS = 200
export const PACK = 12
export const PACKS = Math.ceil(TOTAL_LEVELS / PACK)

export const WORLDS = [
  { name: 'Toy Box', wood: 0xf2b95c, dark: 0xa56a1f, grain: 0xc99a52, bg: ['#5b4a8a', '#1e1536'], wall: 0x2a1f4d, accent: 0xfcd34d },
  { name: 'Spinning Tops', wood: 0x6cc4e8, dark: 0x1f6f95, grain: 0x4aa5cc, bg: ['#1d5c7a', '#081c2b'], wall: 0x0d3247, accent: 0x67e8f9 },
  { name: 'Magnet Lab', wood: 0xc084fc, dark: 0x6b21a8, grain: 0xa15de0, bg: ['#5b2a86', '#1b0a2e'], wall: 0x2d1450, accent: 0xf0abfc },
  { name: 'Moving Gates', wood: 0x86d98a, dark: 0x2f7a39, grain: 0x62bd68, bg: ['#2f6b45', '#0b2216'], wall: 0x143824, accent: 0x86efac },
  { name: 'Grand Garage', wood: 0xf08a7c, dark: 0x9a3328, grain: 0xd2675a, bg: ['#7a2d3a', '#26090f'], wall: 0x42141d, accent: 0xfda4af },
]
export const worldOf = (n) => Math.min(WORLDS.length - 1, Math.floor((n - 1) / 40))
export const difficulty = (n) => (n - 1) / (TOTAL_LEVELS - 1)

export function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---- state ------------------------------------------------------------------------------------------------
// State: { p: [[x, y, d], ...] per block (d: 0 horizontal, 1 vertical), ph: exit phase }

export const startState = (lvl) => ({ p: lvl.blocks.map((b) => [b.x, b.y, b.d]), ph: 0 })

export const period = (lvl) => (lvl.exit.rows.length === 1 ? 1 : 2 * (lvl.exit.rows.length - 1))

export function exitRow(lvl, ph) {
  const rows = lvl.exit.rows
  const n = rows.length
  if (n === 1) return rows[0]
  const k = ph % period(lvl)
  return rows[k < n ? k : 2 * (n - 1) - k]
}

export function grid(lvl, p) {
  const g = new Int8Array(N * N).fill(-1)
  lvl.blocks.forEach((b, i) => {
    const [x, y, d] = p[i]
    for (let k = 0; k < b.len; k++) g[(y + (d ? k : 0)) * N + x + (d ? 0 : k)] = i
  })
  return g
}

export function isWon(lvl, st) {
  const [x, y, d] = st.p[0]
  return d === 0 && x + lvl.blocks[0].len === N && y === exitRow(lvl, st.ph)
}

// One-cell slide of block i. Magnets tow the block directly behind them. Returns the new positions or null.
function stepP(lvl, p, i, dir) {
  const b = lvl.blocks[i]
  if (b.kind === 'wall') return null
  const [x, y, d] = p[i]
  const dx = d ? 0 : dir
  const dy = d ? dir : 0
  const lx = x + (d ? 0 : b.len - 1)
  const ly = y + (d ? b.len - 1 : 0)
  const hx = (dir > 0 ? lx : x) + dx
  const hy = (dir > 0 ? ly : y) + dy
  const g = grid(lvl, p)
  if (hx < 0 || hy < 0 || hx >= N || hy >= N || g[hy * N + hx] >= 0) return null
  const q = p.map((a) => a.slice())
  q[i][0] += dx
  q[i][1] += dy
  if (b.kind === 'mag') {
    const bx = (dir > 0 ? x : lx) - dx
    const by = (dir > 0 ? y : ly) - dy
    if (bx >= 0 && by >= 0 && bx < N && by < N) {
      const j = g[by * N + bx]
      if (j >= 0 && lvl.blocks[j].kind !== 'wall' && p[j][2] === d) {
        q[j][0] += dx
        q[j][1] += dy
      }
    }
  }
  return q
}

function rotateP(lvl, p, i) {
  if (lvl.blocks[i].kind !== 'rot') return null
  const [x, y, d] = p[i]
  const nd = 1 - d
  const cx = x + (nd ? 0 : 1)
  const cy = y + (nd ? 1 : 0)
  if (cx >= N || cy >= N) return null
  if (grid(lvl, p)[cy * N + cx] >= 0) return null
  const q = p.map((a) => a.slice())
  q[i][2] = nd
  return q
}

// A move: { t: 's', i, d, k } slide k cells, { t: 'r', i } rotate, { t: 'w' } wait.
export function applyMove(lvl, st, mv) {
  let p = st.p
  if (mv.t === 's') {
    for (let k = 0; k < mv.k; k++) {
      p = stepP(lvl, p, mv.i, mv.d)
      if (!p) return null
    }
  } else if (mv.t === 'r') {
    p = rotateP(lvl, p, mv.i)
    if (!p) return null
  } else if (period(lvl) === 1) return null
  return { p, ph: (st.ph + 1) % period(lvl) }
}

// How far block i can slide each way (cells).
export function reach(lvl, st, i) {
  const out = { '-1': 0, 1: 0 }
  for (const dir of [-1, 1]) {
    let p = st.p
    for (;;) {
      p = stepP(lvl, p, i, dir)
      if (!p) break
      out[dir]++
    }
  }
  return { neg: out[-1], pos: out[1] }
}

export function neighbors(lvl, st) {
  const out = []
  lvl.blocks.forEach((b, i) => {
    if (b.kind === 'wall') return
    for (const dir of [-1, 1]) {
      let p = st.p
      for (let k = 1; ; k++) {
        p = stepP(lvl, p, i, dir)
        if (!p) break
        out.push({ mv: { t: 's', i, d: dir, k }, st: { p, ph: (st.ph + 1) % period(lvl) } })
      }
    }
    if (b.kind === 'rot') {
      const p = rotateP(lvl, st.p, i)
      if (p) out.push({ mv: { t: 'r', i }, st: { p, ph: (st.ph + 1) % period(lvl) } })
    }
  })
  if (period(lvl) > 1) out.push({ mv: { t: 'w' }, st: { p: st.p, ph: (st.ph + 1) % period(lvl) } })
  return out
}

const keyOf = (st) => {
  let s = ''
  for (const [x, y, d] of st.p) s += String.fromCharCode(48 + x + 6 * y + 36 * d)
  return s + st.ph
}

// Breadth-first search: the path is a shortest solution. cap limits visited states.
export function solve(lvl, st = startState(lvl), cap = 200000) {
  if (isWon(lvl, st)) return { path: [], capped: false }
  const seen = new Map([[keyOf(st), null]])
  let layer = [st]
  const keys = [keyOf(st)]
  let keyLayer = keys
  while (layer.length) {
    const next = []
    const nextKeys = []
    for (let a = 0; a < layer.length; a++) {
      for (const nb of neighbors(lvl, layer[a])) {
        const k = keyOf(nb.st)
        if (seen.has(k)) continue
        seen.set(k, { prev: keyLayer[a], mv: nb.mv })
        if (isWon(lvl, nb.st)) {
          const path = []
          let cur = k
          while (seen.get(cur)) {
            const e = seen.get(cur)
            path.push(e.mv)
            cur = e.prev
          }
          return { path: path.reverse(), capped: false }
        }
        if (seen.size > cap) return { path: null, capped: true }
        next.push(nb.st)
        nextKeys.push(k)
      }
    }
    layer = next
    keyLayer = nextKeys
  }
  return { path: null, capped: false }
}

// ---- generator --------------------------------------------------------------------------------------------

export function build(n, attempt = 0) {
  const rnd = mulberry32(n * 7919 + attempt * 104729 + 17)
  const world = worldOf(n)
  const local = (n - 1) % 40
  const t = local / 39
  const occ = new Uint8Array(N * N)
  const blocks = []
  const fits = (x, y, len, d) => {
    for (let k = 0; k < len; k++) {
      const cx = x + (d ? 0 : k)
      const cy = y + (d ? k : 0)
      if (cx >= N || cy >= N || occ[cy * N + cx]) return false
    }
    return true
  }
  const put = (kind, x, y, len, d) => {
    for (let k = 0; k < len; k++) occ[(y + (d ? k : 0)) * N + x + (d ? 0 : k)] = 1
    blocks.push({ kind, x, y, len, d, c: Math.floor(rnd() * 8) })
  }
  const place = (kind, len, d, tries = 60) => {
    for (let i = 0; i < tries; i++) {
      const dd = d ?? (rnd() < 0.5 ? 0 : 1)
      const x = Math.floor(rnd() * N)
      const y = Math.floor(rnd() * N)
      if (fits(x, y, len, dd)) {
        put(kind, x, y, len, dd)
        return true
      }
    }
    return false
  }

  const row = 1 + Math.floor(rnd() * (N - 2))
  const sx = Math.floor(rnd() * 3)
  put('special', sx, row, 2, 0)

  const crossers = 2 + Math.floor(t * 2 + rnd() * 1.6)
  for (let k = 0; k < crossers; k++) {
    for (let tries = 0; tries < 30; tries++) {
      const c = sx + 2 + Math.floor(rnd() * (N - sx - 2))
      const len = rnd() < 0.4 ? 3 : 2
      const y0 = row - Math.floor(rnd() * len)
      if (y0 >= 0 && fits(c, y0, len, 1)) {
        put('normal', c, y0, len, 1)
        break
      }
    }
  }

  const rotN = world === 1 ? 1 + (rnd() < 0.3 + t * 0.5 ? 1 : 0) : world === 2 ? (rnd() < 0.5 ? 1 : 0) : world >= 3 ? (rnd() < 0.5 + t * 0.3 ? 1 : 0) + (world === 4 ? 1 : 0) : 0
  const magN = world === 2 ? 1 + (rnd() < 0.3 + t * 0.5 ? 1 : 0) : world === 3 ? (rnd() < 0.5 ? 1 : 0) : world === 4 ? 1 + (rnd() < 0.5 ? 1 : 0) : 0
  const wallN = world === 0 ? 0 : 1 + Math.floor(rnd() * 2.2)
  for (let k = 0; k < rotN; k++) place('rot', 2)
  for (let k = 0; k < magN; k++) place('mag', rnd() < 0.3 ? 3 : 2)
  for (let k = 0; k < wallN; k++) place('wall', 1)
  const fill = 3 + Math.floor(t * 3 + rnd() * 2)
  for (let k = 0; k < fill; k++) place('normal', rnd() < 0.3 ? 3 : 2)

  let rows = [row]
  if (world >= 3) {
    const len = local < 14 ? 2 : 3
    const s = Math.max(0, Math.min(N - len, row - Math.floor(rnd() * len)))
    rows = Array.from({ length: len }, (_, i) => s + i)
  }
  return { n, size: N, blocks, exit: { rows }, par: 0 }
}

const targetPar = (n) => 3 + Math.floor(((n - 1) % 40) * 0.42) + worldOf(n) * 2

export function searchLevel(n, maxAttempts = 400, cap = 60000) {
  const want = targetPar(n)
  let best = null
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const lvl = build(n, attempt)
    if (isWon(lvl, startState(lvl))) continue
    const res = solve(lvl, startState(lvl), cap)
    if (!res.path) continue
    if (res.path.length >= want) return [attempt, res.path.length]
    if (!best || res.path.length > best[1]) best = [attempt, res.path.length]
  }
  return best
}

const cache = new Map()
export function generateLevel(n) {
  if (cache.has(n)) return cache.get(n)
  const row = TABLE[n - 1]
  const [attempt, par] = row && row.length ? row : searchLevel(n) || [0, 1]
  const lvl = build(n, attempt)
  lvl.par = par
  cache.set(n, lvl)
  return lvl
}
export const levelData = generateLevel

export function starsFor(lvl, moves) {
  if (moves <= Math.ceil(lvl.par * 1.25)) return 3
  if (moves <= Math.ceil(lvl.par * 1.8)) return 2
  return 1
}
