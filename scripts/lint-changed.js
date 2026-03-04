import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { ESLint } from 'eslint';
import { getChangedFiles } from './changed-files.js';

const ROOT = process.cwd();
const LINTABLE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

function isLintableFile(relativePath) {
  const ext = path.extname(relativePath).toLowerCase();
  if (!LINTABLE_EXTENSIONS.has(ext)) return false;

  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.startsWith('dist/')) return false;
  if (normalized.startsWith('node_modules/')) return false;
  return true;
}

const changedFiles = getChangedFiles({ rootDir: ROOT });
const targets = changedFiles
  .filter(isLintableFile)
  .map((relativePath) => path.resolve(ROOT, relativePath))
  .filter((absolutePath) => fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile());

if (targets.length === 0) {
  console.log('Changed-file lint skipped: no lintable changed files found.');
  process.exit(0);
}

const eslint = new ESLint({});
const results = await eslint.lintFiles(targets);
const formatter = await eslint.loadFormatter('stylish');
const output = formatter.format(results);
if (output.trim() !== '') {
  console.log(output);
}

const errorCount = results.reduce((sum, result) => sum + (result.errorCount || 0), 0);
if (errorCount > 0) {
  process.exit(1);
}

console.log(`Changed-file lint passed for ${targets.length} file(s).`);
