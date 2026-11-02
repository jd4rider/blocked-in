// Worker for gen-table.mjs: node scripts/gen-part.mjs <from> <to> writes /tmp/blocked-in-part-<from>.json
import { writeFileSync } from 'node:fs'
import { searchLevel } from '../src/game.js'

const from = Number(process.argv[2])
const to = Number(process.argv[3])
const rows = []
for (let n = from; n <= to; n++) {
  const found = searchLevel(n, 160, 60000)
  if (!found) throw new Error(`no solvable board for level ${n}`)
  rows.push(found)
}
writeFileSync(`/tmp/blocked-in-part-${from}.json`, JSON.stringify(rows))
console.log('done', from, to)
