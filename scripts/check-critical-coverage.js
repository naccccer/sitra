import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const summaryPath = path.join(ROOT, 'coverage', 'coverage-summary.json')

const globalThresholds = {
  lines: 45,
  statements: 45,
  functions: 45,
  branches: 35,
}

const criticalThresholds = [
  {
    fileSuffix: 'src/services/api.js',
    thresholds: { lines: 70, statements: 70, functions: 70, branches: 60 },
  },
  {
    fileSuffix: 'src/modules/sales/services/salesApi.js',
    thresholds: { lines: 65, statements: 65, functions: 65, branches: 50 },
  },
]

if (!fs.existsSync(summaryPath)) {
  console.error(`Coverage summary not found: ${summaryPath}`)
  process.exit(1)
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
const failures = []

function assertThresholds(scopeLabel, metrics, thresholds) {
  for (const [metric, min] of Object.entries(thresholds)) {
    const pct = Number(metrics?.[metric]?.pct ?? 0)
    if (pct < min) {
      failures.push(`${scopeLabel}: ${metric} ${pct}% < ${min}%`)
    }
  }
}

assertThresholds('global(total)', summary.total, globalThresholds)

for (const item of criticalThresholds) {
  const matchKey = Object.keys(summary).find((key) => key.endsWith(item.fileSuffix))
  if (!matchKey) {
    failures.push(`critical coverage entry missing for ${item.fileSuffix}`)
    continue
  }
  assertThresholds(item.fileSuffix, summary[matchKey], item.thresholds)
}

if (failures.length > 0) {
  console.error('Critical coverage check failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Critical coverage check passed.')
