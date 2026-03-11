import process from 'node:process'
import { getChangedFiles } from './changed-files.js'

const ROOT_DOC_FILES = new Set([
  'MODULE_CONTRACTS.md',
  'ARCHITECTURE.md',
  'docs/api-contracts-index.md',
  'docs/code-map.md',
])

const ARGUMENTS = process.argv.slice(2)
const CHANGED_MODE = ARGUMENTS.includes('--changed')

function normalizePath(filePath) {
  return String(filePath || '').trim().replace(/\\/g, '/')
}

function shouldTriggerDocContractGuard(changedFiles) {
  return changedFiles.some((file) => (
    /^api\/.+\.php$/.test(file)
    || file === 'database/schema.sql'
    || /^contracts\/schemas\/.+\.json$/.test(file)
  ))
}

function hasMatchingDocs(changedFiles) {
  return changedFiles.some((file) => ROOT_DOC_FILES.has(file))
}

const explicitFiles = ARGUMENTS
  .filter((arg) => !arg.startsWith('--'))
  .map(normalizePath)
  .filter(Boolean)

const changedFiles = explicitFiles.length > 0
  ? explicitFiles
  : (CHANGED_MODE
      ? getChangedFiles({ rootDir: process.cwd() }).map(normalizePath)
      : getChangedFiles({ rootDir: process.cwd() }).map(normalizePath))

if (changedFiles.length === 0) {
  console.log('Doc-contract check skipped: no changed files provided.')
  process.exit(0)
}

if (!shouldTriggerDocContractGuard(changedFiles)) {
  console.log('Doc-contract check passed (no endpoint/schema/schema-contract changes detected).')
  process.exit(0)
}

if (hasMatchingDocs(changedFiles)) {
  console.log('Doc-contract check passed.')
  process.exit(0)
}

console.error('Doc-contract check failed.')
console.error('Detected endpoint/schema/schema-contract changes without contract-doc updates.')
console.error('Update at least one of the following in the same change:')
for (const file of ROOT_DOC_FILES) {
  console.error(`- ${file}`)
}
process.exit(1)
