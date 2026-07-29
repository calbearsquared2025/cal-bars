import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

const findings = [];
for (const file of changedFiles()) {
  if (!ALLOWED_EXTENSIONS.has(extname(file).toLowerCase())) continue;
  if (EXCLUDED_PATHS.some((pattern) => pattern.test(file))) continue;
  const content = readFileSync(file, 'utf8');
  for (const { name, pattern } of PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      findings.push(`${file}:${line}: ${name}`);
    }
  }
}

if (findings.length) {
  console.error('Potential private values found in changed public files:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log('No concrete browser IDs, credentials, private keys, workbook IDs, or contact values found in changed public files.');
