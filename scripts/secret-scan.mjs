import { execFileSync } from 'node:child_process';

const revisions = execFileSync('git', ['rev-list', '--all'], {
  encoding: 'utf8',
  windowsHide: true
})
  .trim()
  .split(/\r?\n/u)
  .filter(Boolean);

if (revisions.length === 0) {
  throw new Error('Credential scan requires at least one committed revision.');
}

const patterns = [
  ['GitHub token', ['gh', '[pousr]_[A-Za-z0-9_]{20,}'].join('')],
  ['AWS access key', ['AK', 'IA[0-9A-Z]{16}'].join('')],
  ['private key', ['-----BEGIN ', '(RSA |EC |OPENSSH )?PRIVATE KEY-----'].join('')],
  [
    'bearer credential',
    [
      'Authorization[[:space:]]*[:=][[:space:]]*["\']?Bearer[[:space:]]+',
      '[A-Za-z0-9._~+/=-]{16,}'
    ].join('')
  ],
  [
    'assigned password',
    ['(password|passwd|pwd)[[:space:]]*[:=][[:space:]]*["\']', '[^"\']{8,}["\']'].join('')
  ]
];

const findings = [];
for (const revision of revisions) {
  for (const [label, pattern] of patterns) {
    try {
      const output = execFileSync(
        'git',
        ['grep', '-n', '-I', '-E', '-e', pattern, revision, '--', '.'],
        {
          encoding: 'utf8',
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe']
        }
      ).trim();
      if (output !== '') {
        findings.push(`${label}:\n${output}`);
      }
    } catch (error) {
      if (error.status !== 1) {
        throw error;
      }
    }
  }
}

if (findings.length > 0) {
  throw new Error(`Potential credentials found in repository history:\n${findings.join('\n')}`);
}

console.log(`Credential scan passed across ${revisions.length} committed revision(s).`);
