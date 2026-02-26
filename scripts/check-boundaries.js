import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SRC_MODULES_DIR = path.join(ROOT, 'src', 'modules');
const API_MODULES_DIR = path.join(ROOT, 'api', 'modules');

const JS_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
const IMPORT_RE = /(?:import\s+[^'"]*from\s*|import\s*\(|export\s+[^'"]*from\s*)['"]([^'"]+)['"]/g;
const PHP_REQUIRE_RE = /\b(?:require|require_once|include|include_once)\s*\(?\s*__DIR__\s*\.\s*['"]([^'"]+)['"]\s*\)?\s*;/g;

/** @type {Array<{file:string, message:string}>} */
const violations = [];

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

function isAllowedFrontendModuleTarget(targetFile, targetModuleName) {
  const targetModuleRoot = path.join(SRC_MODULES_DIR, targetModuleName);
  const allowed = new Set(
    JS_EXTENSIONS.map((ext) => path.resolve(targetModuleRoot, 'index' + ext))
  );
  return allowed.has(path.resolve(targetFile));
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
    if (!specifier.startsWith('.')) continue;

    const resolved = resolveJsImport(filePath, specifier);
    if (!resolved) continue;

    const targetModule = getModuleName(resolved, SRC_MODULES_DIR);
    if (!targetModule || targetModule === currentModule) continue;

    if (!isAllowedFrontendModuleTarget(resolved, targetModule)) {
      violations.push({
        file: normalizePath(path.relative(ROOT, filePath)),
        message: `cross-module frontend import not allowed: ${specifier} -> ${normalizePath(path.relative(ROOT, resolved))}`,
      });
    }
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

walk(SRC_MODULES_DIR, checkFrontendBoundaries);
walk(API_MODULES_DIR, checkBackendBoundaries);

if (violations.length > 0) {
  console.error('Boundary check failed.');
  for (const v of violations) {
    console.error(`- ${v.file}: ${v.message}`);
  }
  process.exit(1);
}

console.log('Boundary check passed.');
