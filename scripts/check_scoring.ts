/**
 * Quick sanity checks for scoreAll — run with:
 *   npx --yes tsx scripts/check_scoring.ts
 */
import {
  scoreAll,
  getDefaultScaleSettings,
  buildCodebook,
} from '../src/lib/scoring'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

// SWLS sum: 5+5+5+5+5 = 25
{
  const raw = {
    swls_1: 5,
    swls_2: 5,
    swls_3: 5,
    swls_4: 5,
    swls_5: 5,
  }
  const { scores } = scoreAll(raw, {}, ['swls'])
  assert(scores.swls_total === 25, `SWLS expected 25 got ${scores.swls_total}`)
}

// TIPI extraversion: tipi_1=7, tipi_6_r=1 (reverse on 1–7 → 7) => mean 7
{
  const raw = {
    tipi_1: 7,
    tipi_6_r: 1,
    tipi_2_r: 4,
    tipi_3: 4,
    tipi_4_r: 4,
    tipi_5: 4,
    tipi_7: 4,
    tipi_8_r: 4,
    tipi_9: 4,
    tipi_10_r: 4,
  }
  const { scores } = scoreAll(raw, {}, ['tipi'])
  assert(
    scores.tipi_extraversion === 7,
    `TIPI E expected 7 got ${scores.tipi_extraversion}`,
  )
}

// SPANE balance
{
  const raw: Record<string, number> = {}
  for (const v of ['spane_pos_1','spane_pos_2','spane_pos_3','spane_pos_4','spane_pos_5','spane_pos_6']) {
    raw[v] = 5
  }
  for (const v of ['spane_neg_1','spane_neg_2','spane_neg_3','spane_neg_4','spane_neg_5','spane_neg_6']) {
    raw[v] = 1
  }
  const { scores } = scoreAll(raw, {}, ['spane'])
  assert(scores.spane_p === 30, `SPANE-P expected 30 got ${scores.spane_p}`)
  assert(scores.spane_n === 6, `SPANE-N expected 6 got ${scores.spane_n}`)
  assert(scores.spane_b === 24, `SPANE-B expected 24 got ${scores.spane_b}`)
}

// Listwise missing
{
  const raw = { swls_1: 5, swls_2: 5, swls_3: 5, swls_4: 5 }
  const settings = { swls: { ...getDefaultScaleSettings('swls'), missingRule: 'listwise' as const } }
  const { scores } = scoreAll(raw, settings, ['swls'])
  assert(scores.swls_total == null, 'listwise should null incomplete SWLS')
}

// Prorate
{
  const raw = { swls_1: 5, swls_2: 5, swls_3: 5, swls_4: 5 }
  const settings = { swls: { ...getDefaultScaleSettings('swls'), missingRule: 'prorate' as const, aggregation: 'sum' as const } }
  const { scores } = scoreAll(raw, settings, ['swls'])
  assert(scores.swls_total === 25, `prorate expected 25 got ${scores.swls_total}`)
}

const codebook = buildCodebook()
assert(codebook.some((r) => r.variable_name === 'swls_total' && r.kind === 'scored'), 'codebook missing swls_total')
assert(codebook.some((r) => r.variable_name === 'swls_1' && r.kind === 'raw_item'), 'codebook missing swls_1')

console.log('scoring checks passed')
