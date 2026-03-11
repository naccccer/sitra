import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { getChangedFiles } from './changed-files.js'

const ROOT = process.cwd()
const MAX_LINES = 300
const ARGUMENTS = process.argv.slice(2)
const CHANGED_MODE = ARGUMENTS.includes('--changed')
const EXPLICIT_INPUTS = ARGUMENTS.filter((arg) => !arg.startsWith('--'))
const TARGET_DIRS = ['src', 'api']
const TEXT_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.php'])
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git'])

const allowlistPath = path.join(ROOT, 'scripts', 'file-size-allowlist.json')
const allowlistText = fs.existsSync(allowlistPath)
  ? fs.readFileSync(allowlistPath, 'utf8').replace(/^\uFEFF/, '')
  : '{}'
const allowlist = fs.existsSync(allowlistPath)
  ? JSON.parse(allowlistText)
  : {}

const violations = []

function normalizeRelative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/')
}

function shouldCheckFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return TEXT_EXTENSIONS.has(ext)
}

function checkFile(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return
  if (!shouldCheckFile(filePath)) return

  const rel = normalizeRelative(filePath)
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length
  const allowedMax = Number(allowlist[rel] ?? MAX_LINES)

  if (lines > allowedMax) {
    violations.push({ rel, lines, allowedMax })
  }
}

function walk(entryPath) {
  if (!fs.existsSync(entryPath)) return
  const stat = fs.statSync(entryPath)
  if (stat.isFile()) {
    checkFile(entryPath)
    return
  }

  if (!stat.isDirectory()) return
  const base = path.basename(entryPath)
  if (IGNORE_DIRS.has(base)) return

  for (const child of fs.readdirSync(entryPath)) {
    walk(path.join(entryPath, child))
  }
}

function resolveInputs(inputs) {
  return inputs
    .map((input) => path.resolve(ROOT, input))
    .filter((absolutePath) => fs.existsSync(absolutePath))
}

function run() {
  if (EXPLICIT_INPUTS.length > 0) {
    resolveInputs(EXPLICIT_INPUTS).forEach((entryPath) => walk(entryPath))
    return
  }

  if (CHANGED_MODE) {
    const changed = getChangedFiles({ rootDir: ROOT })
    if (changed.length === 0) {
      console.log('File-size check (changed) skipped: no changed files found.')
      return
    }
    resolveInputs(changed).forEach((entryPath) => walk(entryPath))
    return
  }

  TARGET_DIRS.forEach((dir) => walk(path.join(ROOT, dir)))
}

run()

if (violations.length > 0) {
  console.error(`File-size check failed (max ${MAX_LINES} lines unless allowlisted).`)
  violations
    .sort((a, b) => b.lines - a.lines)
    .forEach((v) => {
      console.error(`- ${v.rel}: ${v.lines} lines (allowed ${v.allowedMax})`)
    })
  process.exit(1)
}

console.log('File-size check passed.')
