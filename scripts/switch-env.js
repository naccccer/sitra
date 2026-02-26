import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const argv = globalThis.process?.argv ?? []
const exitWith = (code) => {
  if (globalThis.process?.exit) globalThis.process.exit(code)
  throw new Error(`Exit ${code}`)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const target = (argv[2] || '').trim().toLowerCase()
const localEnvPath = path.join(rootDir, '.env.local')

const profileMap = {
  home: path.join(rootDir, '.env.home.local'),
  office: path.join(rootDir, '.env.office.local'),
}

function parseEnv(content) {
  const values = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i <= 0) continue
    const key = line.slice(0, i).trim()
    const value = line.slice(i + 1).trim()
    values[key] = value
  }
  return values
}

function printStatus(content, label) {
  const env = parseEnv(content)
  const keys = [
    'VITE_DEV_API_TARGET',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'APP_DEBUG',
  ]

  console.log(`Active profile: ${label}`)
  for (const key of keys) {
    if (env[key] !== undefined) {
      console.log(`${key}=${env[key]}`)
    }
  }
}

if (target === 'status') {
  if (!fs.existsSync(localEnvPath)) {
    console.error('No .env.local found. Run "npm run env:home" or "npm run env:office" first.')
    exitWith(1)
  }

  const content = fs.readFileSync(localEnvPath, 'utf8')
  printStatus(content, '.env.local')
  exitWith(0)
}

if (!profileMap[target]) {
  console.error('Usage: node scripts/switch-env.js [home|office|status]')
  exitWith(1)
}

const sourcePath = profileMap[target]
if (!fs.existsSync(sourcePath)) {
  console.error(`Missing ${path.basename(sourcePath)}.`)
  console.error(`Create it once by copying .env.example, then edit for your ${target} machine.`)
  exitWith(1)
}

fs.copyFileSync(sourcePath, localEnvPath)
const content = fs.readFileSync(localEnvPath, 'utf8')
printStatus(content, path.basename(sourcePath))
console.log(`\nSwitched .env.local to ${target} profile.`)
