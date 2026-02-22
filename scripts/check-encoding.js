import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const TARGETS = ['src', 'api', 'config', 'public', 'index.html'];
const ALLOWED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.html', '.php', '.sql']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist']);

// Common mojibake markers from UTF-8 text mis-decoded as legacy encodings.
const MOJIBAKE_RE = /(Ã.|Â.|â€|â€™|â€œ|â€“|â€”|Ø.|Ù.|ï¿½|\uFFFD)/;

const findings = [];

function shouldScan(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (MOJIBAKE_RE.test(line)) {
      findings.push({
        file: path.relative(ROOT, filePath),
        line: index + 1,
        text: line.trim().slice(0, 140),
      });
    }
  });
}

function walk(entryPath) {
  if (!fs.existsSync(entryPath)) return;

  const stat = fs.statSync(entryPath);
  if (stat.isDirectory()) {
    const base = path.basename(entryPath);
    if (IGNORE_DIRS.has(base)) return;
    for (const child of fs.readdirSync(entryPath)) {
      walk(path.join(entryPath, child));
    }
    return;
  }

  if (shouldScan(entryPath)) {
    scanFile(entryPath);
  }
}

for (const target of TARGETS) {
  walk(path.join(ROOT, target));
}

if (findings.length > 0) {
  console.error('Encoding check failed: possible mojibake found.');
  findings.slice(0, 50).forEach((f) => {
    console.error(`- ${f.file}:${f.line} ${f.text}`);
  });
  if (findings.length > 50) {
    console.error(`... and ${findings.length - 50} more`);
  }
  process.exit(1);
}

console.log('Encoding check passed.');
