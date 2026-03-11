import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { execSync } from 'node:child_process'
import { getChangedFiles } from './changed-files.js'

const ROOT = process.cwd()
const LINTABLE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])

function isLintableFile(relativePath) {
  const ext = path.extname(relativePath).toLowerCase()
  if (!LINTABLE_EXTENSIONS.has(ext)) return false

  const normalized = relativePath.replace(/\\/g, '/')
  if (normalized.startsWith('dist/')) return false
  if (normalized.startsWith('node_modules/')) return false
  return true
}

const changedFiles = getChangedFiles({ rootDir: ROOT })
const targets = changedFiles
  .filter(isLintableFile)
  .map((relativePath) => path.resolve(ROOT, relativePath))
  .filter((absolutePath) => fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile())

if (targets.length === 0) {
  console.log('Changed-file lint skipped: no lintable changed files found.')
  process.exit(0)
}

async function runNodeApiLint() {
  const eslintModule = await import('eslint')
  const eslint = new eslintModule.ESLint({})
  const results = await eslint.lintFiles(targets)
  const formatter = await eslint.loadFormatter('stylish')
  const output = formatter.format(results)
  if (output.trim() !== '') {
    console.log(output)
  }

  const errorCount = results.reduce((sum, result) => sum + (result.errorCount || 0), 0)
  if (errorCount > 0) {
    process.exit(1)
  }

  console.log(`Changed-file lint passed for ${targets.length} file(s).`)
}

function runCliFallback() {
  const quotedTargets = targets.map((target) => `"${target}"`).join(' ')
  const eslintCli = process.platform === 'win32'
    ? path.join(ROOT, 'node_modules', '.bin', 'eslint.cmd')
    : path.join(ROOT, 'node_modules', '.bin', 'eslint')

  if (!fs.existsSync(eslintCli)) {
    throw new Error(`ESLint CLI not found at ${eslintCli}. Run npm ci.`)
  }

  execSync(`"${eslintCli}" ${quotedTargets}`, {
    cwd: ROOT,
    stdio: 'inherit',
  })
  console.log(`Changed-file lint passed for ${targets.length} file(s).`)
}

try {
  await runNodeApiLint()
} catch (error) {
  if (String(error?.code || '') === 'ERR_MODULE_NOT_FOUND') {
    console.warn('ESLint Node API not available locally. Falling back to eslint CLI.')
    runCliFallback()
  } else {
    throw error
  }
}
