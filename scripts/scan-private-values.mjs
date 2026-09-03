import { execFileSync } from 'node:child_process';
import { extname } from 'node:path';

const ALLOWED_EXTENSIONS = new Set(['.css', '.gs', '.html', '.js', '.json', '.md', '.mjs', '.yml', '.yaml']);
const EXCLUDED_PATHS = [/^tests\//, /^data\//, /^assets\//];
const PATTERNS = [
  { name: 'concrete browser identifier', pattern: /browser_[A-Za-z0-9_-]{16,}/g },
  { name: 'literal workbook identifier', pattern: /CGB_WORKBOOK_ID\s*=\s*['"][^'"]+['"]/g },
  { name: 'private key material', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'Google service-account credential', pattern: /"private_key_id"\s*:\s*"[^"\s]+"/g },
  { name: 'literal password or secret', pattern: /\b(?:password|client_secret|api_secret)\b\s*[:=]\s*['"][^'"]{8,}['"]/gi },
  { name: 'private email address', pattern: /[A-Z0-9._%+-]+@(?!calgoldenbars\.com\b)[A-Z0-9.-]+\.[A-Z]{2,}/gi }
];

function changedFiles() {
  const output = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', 'origin/main...HEAD'], {
    encoding: 'utf8'
  });
  return output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
}

function addedLines(file) {
  const output = execFileSync('git', [
    'diff', '--unified=0', '--no-color', '--diff-filter=ACMR', 'origin/main...HEAD', '--', file
  ], { encoding: 'utf8' });

  const lines = output.split(/\r?\n/);
  const additions = [];
  let newLineNumber = 0;
  let inHunk = false;

  for (const line of lines) {
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLineNumber = Number(hunk[1]);
      inHunk = true;
      continue;
    }
    if (!inHunk || line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) {
      additions.push({ line: newLineNumber, content: line.slice(1) });
      newLineNumber += 1;
      continue;
    }
    if (line.startsWith('-')) continue;
    newLineNumber += 1;
  }

  return additions;
}

const findings = [];
for (const file of changedFiles()) {
  if (!ALLOWED_EXTENSIONS.has(extname(file).toLowerCase())) continue;
  if (EXCLUDED_PATHS.some((pattern) => pattern.test(file))) continue;
  for (const addition of addedLines(file)) {
    for (const { name, pattern } of PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(addition.content)) findings.push(`${file}:${addition.line}: ${name}`);
    }
  }
}

if (findings.length) {
  console.error('Potential private values found in newly added public content:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log('No concrete browser IDs, credentials, private keys, workbook IDs, or contact values found in newly added public content.');
