import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { getChangedFiles } from './changed-files.js'

const ROOT = process.cwd()
const ARGUMENTS = process.argv.slice(2)
const CHANGED_MODE = ARGUMENTS.includes('--changed')
const EXPLICIT_INPUTS = ARGUMENTS.filter((arg) => !arg.startsWith('--'))

const JS_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx'])
const PHP_EXTENSIONS = new Set(['.php'])
const ALLOWED_MODULE_IDS = new Set(['auth', 'users-access', 'master-data', 'sales', 'customers', 'inventory', 'kernel'])
const ALLOWED_SNAKE_NAMESPACES = new Set(['auth', 'users_access', 'master_data', 'sales', 'customers', 'inventory', 'kernel'])
const violations = []

function normalizeRelative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/')
}

function pushViolation(filePath, message) {
  violations.push({ file: normalizeRelative(filePath), message })
}

function walk(entryPath, visitor) {
  if (!fs.existsSync(entryPath)) return
  const stat = fs.statSync(entryPath)
  if (stat.isFile()) {
    visitor(entryPath)
    return
  }
  if (!stat.isDirectory()) return
  const children = fs.readdirSync(entryPath)
  for (const child of children) {
    walk(path.join(entryPath, child), visitor)
  }
}

function isPascalCase(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name)
}

function isCamelCase(name) {
  return /^[a-z][A-Za-z0-9]*$/.test(name)
}

function isSnakeCase(name) {
  return /^[a-z][a-z0-9_]*$/.test(name)
}

function checkFrontendFileName(filePath, normalized) {
  const ext = path.extname(filePath).toLowerCase()
  if (!JS_EXTENSIONS.has(ext)) return

  const baseName = path.basename(filePath, ext)

  if (normalized.includes('/components/') && ext === '.jsx') {
    if (!isPascalCase(baseName)) {
      pushViolation(filePath, 'component filename must be PascalCase.jsx')
    }
    return
  }

  if (normalized.includes('/hooks/') && ext === '.js') {
    if (!/^use[A-Z][A-Za-z0-9]*$/.test(baseName)) {
      pushViolation(filePath, 'hook filename must follow useXxx.js convention')
    }
    return
  }

  if ((normalized.includes('/services/') || normalized.includes('/utils/')) && ext === '.js') {
    if (!isCamelCase(baseName)) {
      pushViolation(filePath, 'service/utils filename must be camelCase.js')
    }
  }
}

function checkBackendFileName(filePath, normalized) {
  const ext = path.extname(filePath).toLowerCase()
  if (!PHP_EXTENSIONS.has(ext)) return

  if (normalized.startsWith('api/modules/')) {
    const baseName = path.basename(filePath, ext)
    if (!isSnakeCase(baseName)) {
      pushViolation(filePath, 'backend module filename must be snake_case.php')
    }
  }
}

function checkModuleEnabledCalls(filePath, source) {
  const regex = /app_require_module_enabled\([^,]+,\s*'([^']+)'\)/g
  let match
  while ((match = regex.exec(source)) !== null) {
    const moduleId = match[1]
    if (!ALLOWED_MODULE_IDS.has(moduleId)) {
      pushViolation(filePath, `unknown module id '${moduleId}' in app_require_module_enabled`)
    }
  }
}

function checkPermissionKeys(filePath, source) {
  const regex = /app_require_permission\('([^']+)'/g
  let match
  while ((match = regex.exec(source)) !== null) {
    const key = match[1]
    const parts = key.split('.')
    if (parts.length < 2 || parts.length > 3) {
      pushViolation(filePath, `permission key '${key}' must have 2 or 3 dot-separated segments`)
      continue
    }

    const namespace = parts[0]
    if (namespace === 'profile') continue
    if (!ALLOWED_SNAKE_NAMESPACES.has(namespace)) {
      pushViolation(filePath, `permission namespace '${namespace}' is not in allowed snake_case map`)
    }
  }
}

function checkAuditEventTypes(filePath, source) {
  const regex = /app_audit_log\([^,]+,\s*'([^']+)'/g
  let match
  while ((match = regex.exec(source)) !== null) {
    const eventType = match[1]
    if (!/^(auth|users_access|master_data|sales|customers|inventory|kernel)\.[a-z_]+(\.[a-z_]+)+$/.test(eventType)) {
      pushViolation(filePath, `audit event type '${eventType}' must follow snake_case namespace.event.action`)
    }
  }
}

function checkEndpointWrapperNaming(filePath, source, normalized) {
  if (!normalized.startsWith('api/')) return
  if (normalized.slice('api/'.length).includes('/')) return
  const fileName = path.basename(filePath)
  if (!fileName.endsWith('.php') || fileName.startsWith('_')) return

  const wrapperRegex = /require_once\s+__DIR__\s*\.\s*'\/modules\/([^/]+)\/([^']+\.php)'/m
  const match = source.match(wrapperRegex)
  if (!match) return

  const targetFile = match[2]
  if (targetFile !== fileName) {
    pushViolation(filePath, `wrapper file name '${fileName}' must match module target '${targetFile}'`)
  }
}

function checkFile(filePath) {
  const normalized = normalizeRelative(filePath)
  checkFrontendFileName(filePath, normalized)
  checkBackendFileName(filePath, normalized)

  const ext = path.extname(filePath).toLowerCase()
  if (!JS_EXTENSIONS.has(ext) && !PHP_EXTENSIONS.has(ext)) return

  const source = fs.readFileSync(filePath, 'utf8')

  if (ext === '.php') {
    checkModuleEnabledCalls(filePath, source)
    checkPermissionKeys(filePath, source)
    checkAuditEventTypes(filePath, source)
    checkEndpointWrapperNaming(filePath, source, normalized)
  }
}

function resolveInputs(inputs) {
  return inputs
    .map((input) => path.resolve(ROOT, input))
    .filter((absolutePath) => fs.existsSync(absolutePath))
}

function runWithInputs(inputs) {
  resolveInputs(inputs).forEach((entryPath) => walk(entryPath, checkFile))
}

if (EXPLICIT_INPUTS.length > 0) {
  runWithInputs(EXPLICIT_INPUTS)
} else if (CHANGED_MODE) {
  const changedFiles = getChangedFiles({ rootDir: ROOT })
  if (changedFiles.length === 0) {
    console.log('Naming check (changed) skipped: no changed files found.')
    process.exit(0)
  }
  runWithInputs(changedFiles)
} else {
  runWithInputs(['src', 'api'])
}

if (violations.length > 0) {
  console.error('Naming check failed.')
  violations.forEach((v) => {
    console.error(`- ${v.file}: ${v.message}`)
  })
  process.exit(1)
}

console.log('Naming check passed.')
