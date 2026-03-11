import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
const errors = []

const vitestPkg = path.join(ROOT, 'node_modules', 'vitest', 'package.json')
if (!fs.existsSync(vitestPkg)) {
  errors.push('Vitest is not installed. Run `npm ci` before running tests.')
}

try {
  execSync('php -v', { stdio: 'ignore' })
} catch {
  errors.push('PHP is not available in PATH. Install PHP or use XAMPP shell before running PHP tests.')
}

if (errors.length > 0) {
  console.error('Test environment preflight failed:')
  errors.forEach((message) => console.error(`- ${message}`))
  process.exit(1)
}

console.log('Test environment preflight passed.')
