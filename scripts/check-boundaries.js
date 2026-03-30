import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { getChangedFiles } from './changed-files.js';

const ROOT = process.cwd();
const SRC_MODULES_DIR = path.join(ROOT, 'src', 'modules');
const API_MODULES_DIR = path.join(ROOT, 'api', 'modules');

const JS_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
const IMPORT_RE = /(?:import\s+[^'"]*from\s*|import\s*\(|export\s+[^'"]*from\s*)['"]([^'"]+)['"]/g;
const PHP_REQUIRE_RE = /\b(?:require|require_once|include|include_once)\s*\(?\s*__DIR__\s*\.\s*['"]([^'"]+)['"]\s*\)?\s*;/g;
const SQL_TABLE_RE = /\b(?:FROM|JOIN|UPDATE|INTO|DELETE\s+FROM)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/gi;
const ARGUMENTS = process.argv.slice(2);
const CHANGED_MODE = ARGUMENTS.includes('--changed');
const EXPLICIT_INPUTS = ARGUMENTS.filter((arg) => !arg.startsWith('--'));

/** @type {Array<{file:string, message:string}>} */
const violations = [];

const SHARED_TABLES = new Set(['users', 'system_settings', 'module_registry', 'audit_logs']);

/** @type {Record<string, RegExp[]>} */
const MODULE_TABLE_PATTERNS = {
  sales: [/^orders$/, /^order_financials$/, /^order_payments$/, /^order_request_idempotency$/],
  inventory: [/^inventory_/, /^inventory_v2_/],
  customers: [/^customers$/, /^customer_projects$/, /^customer_project_contacts$/],
  human_resources: [/^hr_employees$/],
  accounting: [/^acc_/],
  production: [/^prod_/],
  master_data: [/^master_/],
  users_access: [/^user_/],
};

function walk(dirPath, visitor) {
  if (!fs.existsSync(dirPath)) return;
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else {
        visitor(full);
      }
    }
  }
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function getModuleName(filePath, rootModulesDir) {
  const rel = path.relative(rootModulesDir, filePath);
  if (rel.startsWith('..')) return null;
  const [moduleName] = rel.split(path.sep);
  return moduleName || null;
}

function resolveJsImport(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [base];

  for (const ext of JS_EXTENSIONS) {
    candidates.push(base + ext);
  }
  for (const ext of JS_EXTENSIONS) {
    candidates.push(path.join(base, 'index' + ext));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function getAliasedFrontendTarget(specifier) {
  if (!specifier.startsWith('@/modules/')) return null;
  const rel = specifier.slice('@/modules/'.length);
  const [moduleName] = rel.split('/');
  return moduleName || null;
}

function checkFrontendBoundaries(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!JS_EXTENSIONS.includes(ext)) return;

  const source = fs.readFileSync(filePath, 'utf8');
  const currentModule = getModuleName(filePath, SRC_MODULES_DIR);
  if (!currentModule) return;

  let match;
  while ((match = IMPORT_RE.exec(source)) !== null) {
    const specifier = match[1];
    const aliasedTargetModule = getAliasedFrontendTarget(specifier);
    if (aliasedTargetModule && aliasedTargetModule !== currentModule) {
      violations.push({
        file: normalizePath(path.relative(ROOT, filePath)),
        message: `cross-module frontend import not allowed: ${specifier}`,
      });
      continue;
    }

    if (!specifier.startsWith('.')) continue;

    const resolved = resolveJsImport(filePath, specifier);
    if (!resolved) continue;

    const targetModule = getModuleName(resolved, SRC_MODULES_DIR);
    if (!targetModule || targetModule === currentModule) continue;

    violations.push({
      file: normalizePath(path.relative(ROOT, filePath)),
      message: `cross-module frontend import not allowed: ${specifier} -> ${normalizePath(path.relative(ROOT, resolved))}`,
    });
  }
}

function checkBackendBoundaries(filePath) {
  if (path.extname(filePath).toLowerCase() !== '.php') return;

  const source = fs.readFileSync(filePath, 'utf8');
  const currentModule = getModuleName(filePath, API_MODULES_DIR);
  if (!currentModule) return;

  let match;
  while ((match = PHP_REQUIRE_RE.exec(source)) !== null) {
    const relativeTarget = match[1];
    const resolved = path.resolve(path.dirname(filePath), relativeTarget);
    const targetModule = getModuleName(resolved, API_MODULES_DIR);
    if (!targetModule || targetModule === currentModule) continue;

    violations.push({
      file: normalizePath(path.relative(ROOT, filePath)),
      message: `cross-module backend require not allowed: ${relativeTarget} -> ${normalizePath(path.relative(ROOT, resolved))}`,
    });
  }
}

function tableOwner(tableName) {
  if (SHARED_TABLES.has(tableName)) return null;
  for (const [owner, patterns] of Object.entries(MODULE_TABLE_PATTERNS)) {
    if (patterns.some((re) => re.test(tableName))) {
      return owner;
    }
  }
  return null;
}

function checkBackendTableAccess(filePath) {
  if (path.extname(filePath).toLowerCase() !== '.php') return;
  const currentModule = getModuleName(filePath, API_MODULES_DIR);
  if (!currentModule) return;

  const relativeFile = normalizePath(path.relative(ROOT, filePath));
  const allowlist = {
    'api/modules/kernel/bootstrap.php': new Set(['orders']),
    'api/modules/human_resources/human_resources_payroll_read_model.php': new Set([
      'acc_payslips',
      'acc_payroll_periods',
    ]),
  };

  const source = fs.readFileSync(filePath, 'utf8');
  SQL_TABLE_RE.lastIndex = 0;
  let match;
  while ((match = SQL_TABLE_RE.exec(source)) !== null) {
    const table = match[1];
    const owner = tableOwner(table);
    if (!owner || owner === currentModule) continue;
    if (allowlist[relativeFile] && allowlist[relativeFile].has(table)) continue;
    violations.push({
      file: normalizePath(path.relative(ROOT, filePath)),
      message: `cross-module table access not allowed: ${table} is owned by ${owner}`,
    });
  }
}

function checkInputPaths(inputs) {
  inputs.forEach((input) => {
    const absolutePath = path.resolve(ROOT, input);
    if (!fs.existsSync(absolutePath)) return;

    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      walk(absolutePath, (filePath) => {
        checkFrontendBoundaries(filePath);
        checkBackendBoundaries(filePath);
        checkBackendTableAccess(filePath);
      });
      return;
    }

    checkFrontendBoundaries(absolutePath);
    checkBackendBoundaries(absolutePath);
    checkBackendTableAccess(absolutePath);
  });
}

if (EXPLICIT_INPUTS.length > 0) {
  checkInputPaths(EXPLICIT_INPUTS);
} else if (CHANGED_MODE) {
  const changedFiles = getChangedFiles({ rootDir: ROOT });
  if (changedFiles.length === 0) {
    console.log('Boundary check (changed) skipped: no changed files found.');
    process.exit(0);
  }
  checkInputPaths(changedFiles);
} else {
  walk(SRC_MODULES_DIR, checkFrontendBoundaries);
  walk(API_MODULES_DIR, checkBackendBoundaries);
  walk(API_MODULES_DIR, checkBackendTableAccess);
}

if (violations.length > 0) {
  console.error('Boundary check failed.');
  for (const v of violations) {
    console.error(`- ${v.file}: ${v.message}`);
  }
  process.exit(1);
}

console.log('Boundary check passed.');
