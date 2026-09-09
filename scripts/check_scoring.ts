/**
 * Quick sanity checks wrapping main's scoring.test.ts expectations.
 * Prefer: npx --yes tsx src/lib/scoring.test.ts
 *
 * Run: npx --yes tsx scripts/check_scoring.ts
 */
import {
  SCORING_SPECS,
  reverseCode,
  scoreAll,
  scoreScale,
} from '../src/lib/scoring'
import {
  buildCodebook,
  specsWithSettings,
} from '../src/lib/scoringProtocol'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

assert(reverseCode(2, { min: 1, max: 7 }) === 6, 'reverseCode 1-7')
assert(
  Array.isArray(SCORING_SPECS) && SCORING_SPECS.length === 8,
  'SCORING_SPECS should list 8 scales',
)

const tipi = SCORING_SPECS.find((s) => s.scale_id === 'tipi')!
assert(
  tipi.reverseItems.has('tipi_6_r') && tipi.reverseItems.size === 5,
  'TIPI reverse set intact',
)

const tipiScores = scoreScale({ tipi_1: 6, tipi_6_r: 2 }, tipi)
assert(tipiScores.tipi_extraversion === 6, 'TIPI reverse+mean')

const swls = SCORING_SPECS.find((s) => s.scale_id === 'swls')!
assert(
  scoreScale(
    { swls_1: 5, swls_2: 6, swls_3: 7, swls_4: 4, swls_5: 3 },
    swls,
  ).swls_total === 25,
  'SWLS sum',
)

const merged = scoreAll(
  {
    swls_1: 5,
    swls_2: 5,
    swls_3: 5,
    swls_4: 5,
    swls_5: 5,
  },
  specsWithSettings({}, ['swls']),
)
assert(merged.swls_total === 25, 'scoreAll via specsWithSettings')

const codebook = buildCodebook()
assert(
  codebook.some((r) => r.variable_name === 'swls_total' && r.kind === 'scored'),
  'codebook missing swls_total',
)

console.log('scoring checks passed')
