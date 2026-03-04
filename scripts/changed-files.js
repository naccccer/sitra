import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

function runGitCommand(command, rootDir) {
  try {
    return execSync(command, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
}

function toLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeRelative(filePath) {
  return filePath.split(path.sep).join('/');
}

function isGitRepo(rootDir) {
  const marker = runGitCommand('git rev-parse --is-inside-work-tree', rootDir).trim();
  return marker === 'true';
}

export function getChangedFiles(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const includeUnstaged = options.includeUnstaged !== false;
  const includeStaged = options.includeStaged !== false;
  const includeUntracked = options.includeUntracked !== false;

  if (!isGitRepo(rootDir)) {
    return [];
  }

  const files = new Set();

  if (includeUnstaged) {
    toLines(runGitCommand('git diff --name-only --diff-filter=ACMR', rootDir)).forEach((line) => {
      files.add(normalizeRelative(line));
    });
  }

  if (includeStaged) {
    toLines(runGitCommand('git diff --name-only --cached --diff-filter=ACMR', rootDir)).forEach((line) => {
      files.add(normalizeRelative(line));
    });
  }

  if (includeUntracked) {
    toLines(runGitCommand('git ls-files --others --exclude-standard', rootDir)).forEach((line) => {
      files.add(normalizeRelative(line));
    });
  }

  return Array.from(files).sort((a, b) => a.localeCompare(b));
}

function resolveExistingFiles(rootDir, candidates) {
  const resolved = [];
  for (const candidate of candidates) {
    const absolute = path.resolve(rootDir, candidate);
    if (!fs.existsSync(absolute)) continue;
    if (!fs.statSync(absolute).isFile()) continue;
    resolved.push(absolute);
  }
  return resolved;
}

const CURRENT_FILE = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(CURRENT_FILE)) {
  const rootDir = process.cwd();
  const changed = getChangedFiles({ rootDir });
  const existing = resolveExistingFiles(rootDir, changed);
  process.stdout.write(existing.map((file) => normalizeRelative(path.relative(rootDir, file))).join('\n'));
}
