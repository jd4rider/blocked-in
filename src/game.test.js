import test from 'node:test'
import assert from 'node:assert/strict'
import { generateLevel, startState, applyMove, solve, isWon, reach, exitRow, period, neighbors, TOTAL_LEVELS, worldOf, WORLDS, starsFor, N } from './game.js'

const lvl = (blocks, rows = [2]) => ({ size: N, blocks, exit: { rows }, par: 1 })
const B = (kind, x, y, len, d) => ({ kind, x, y, len, d, c: 0 })

test('levels are deterministic and well formed', () => {
  for (const n of [1, 45, 90, 130, TOTAL_LEVELS]) {
    const a = generateLevel(n)
    assert.deepEqual(a, generateLevel(n))
    assert.equal(a.blocks[0].kind, 'special')
    assert.ok(a.par > 0)
  }
  assert.equal(worldOf(1), 0)
  assert.equal(worldOf(TOTAL_LEVELS), WORLDS.length - 1)
})

test('every level is solvable and par is the optimal length', () => {
  for (let n = 1; n <= TOTAL_LEVELS; n++) {
    const l = generateLevel(n)
    const res = solve(l, startState(l), 400000)
    assert.ok(res.path, `level ${n} solvable`)
    assert.equal(res.path.length, l.par, `level ${n} par`)
    let st = startState(l)
    for (const mv of res.path) st = applyMove(l, st, mv)
    assert.ok(isWon(l, st))
  }
})

test('blocks slide in any direction and stop at obstacles', () => {
  const l = lvl([B('special', 0, 2, 2, 0), B('normal', 3, 2, 2, 1), B('wall', 0, 0, 1, 0)])
  const st = startState(l)
  assert.deepEqual(reach(l, st, 0), [0, 1, 1, 3])
  assert.deepEqual(reach(l, st, 1), [1, 2, 2, 2])
  assert.equal(applyMove(l, st, { t: 's', i: 0, dir: 1, k: 2 }), null)
  assert.equal(applyMove(l, st, { t: 's', i: 2, dir: 1, k: 1 }), null)
  assert.deepEqual(applyMove(l, st, { t: 's', i: 1, dir: 0, k: 1 }).p[1], [2, 2, 1], 'a vertical block can slide sideways')
})

test('spinners need room to turn', () => {
  const l = lvl([B('special', 0, 2, 2, 0), B('rot', 3, 0, 2, 0), B('normal', 3, 1, 2, 0)])
  const st = startState(l)
  assert.equal(applyMove(l, st, { t: 'r', i: 1 }), null)
  const free = lvl([B('special', 0, 2, 2, 0), B('rot', 3, 0, 2, 0)])
  const turned = applyMove(free, startState(free), { t: 'r', i: 1 })
  assert.deepEqual(turned.p[1], [3, 0, 1])
})

test('magnets tow the blocks behind them', () => {
  const l = lvl([B('special', 0, 5, 2, 0), B('mag', 2, 0, 2, 0), B('normal', 0, 0, 2, 0), B('normal', 2, 1, 1, 1)])
  const moved = applyMove(l, startState(l), { t: 's', i: 1, dir: 1, k: 1 })
  assert.deepEqual(moved.p[1], [3, 0, 0])
  assert.deepEqual(moved.p[2], [1, 0, 0], 'towed')
  assert.deepEqual(moved.p[3], [2, 1, 1], 'a block beside it stays')
})

test('the exit gate patrols and win needs it aligned', () => {
  const l = lvl([B('special', 4, 1, 2, 0)], [0, 1, 2])
  assert.equal(period(l), 4)
  assert.deepEqual([0, 1, 2, 3, 4].map((ph) => exitRow(l, ph % 4)), [0, 1, 2, 1, 0])
  let st = { ...startState(l), ph: 0 }
  assert.ok(!isWon(l, st))
  st = applyMove(l, st, { t: 'w' })
  assert.ok(isWon(l, st))
  assert.ok(neighbors(l, startState(l)).some((x) => x.mv.t === 'w'))
})

test('star rating follows par', () => {
  assert.equal(starsFor({ par: 10 }, 12), 3)
  assert.equal(starsFor({ par: 10 }, 18), 2)
  assert.equal(starsFor({ par: 10 }, 40), 1)
})
