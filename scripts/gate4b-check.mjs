import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = {
  charter: 'docs/open-source/v0.1/gate-4b/00-charter-and-eligibility.md',
  onboarding: 'docs/open-source/v0.1/gate-4b/01-starter-and-onboarding.md',
  evidence: 'docs/open-source/v0.1/gate-4b/02-evidence-and-decision.md',
  approval: 'docs/open-source/v0.1/gate-4b/03-launch-approval-and-completion.md',
  ledger: 'docs/open-source/v0.1/gate-4b/evidence-ledger.md',
  evaluation: '.github/ISSUE_TEMPLATE/gate4b-evaluation.yml',
  contacts: '.github/ISSUE_TEMPLATE/config.yml',
  site: 'docs/site/evaluate.md',
  support: 'SUPPORT.md',
  security: 'SECURITY.md'
};

const sources = new Map();
for (const [name, relative] of Object.entries(files)) {
  sources.set(name, await readFile(path.join(root, relative), 'utf8'));
}

function requireText(sourceName, values) {
  const source = sources.get(sourceName) ?? '';
  for (const value of values) {
    if (!source.includes(value)) {
      throw new Error(`${files[sourceName]} is missing required Gate 4B text: ${value}`);
    }
  }
}

requireText('charter', [
  'five eligible external repository evaluations',
  'adds no telemetry or analytics',
  'not controlled by a',
  'Flowtract maintainer'
]);
requireText('onboarding', [
  '`flowtract@0.1.0`',
  '`flowtract/flowtract-starter`',
  'Ubuntu / Node 22',
  'Windows / Node 24',
  '`flowtract-starter: passed`'
]);
requireText('evidence', [
  'five eligible external evaluations are complete',
  'at least four complete the unchanged starter',
  'median first-success time is under ten minutes',
  'at least three complete one real authenticated',
  'at least two complete a second distinct workflow',
  '**Validated:**',
  '**Conditionally validated:**',
  '**Not validated:**',
  '**Blocked:**'
]);
requireText('approval', [
  '`a46d365c5a0d630914909b6254691780e048317c`',
  'Gate 4B repository implementation and private starter preparation only',
  'does not authorize PR merge'
]);
requireText('site', [
  'flowtract/flowtract-starter',
  'Gate 4B evaluation',
  'collects no product telemetry or analytics',
  '30–60 minutes'
]);
requireText('support', ['`flowtract@0.1.0`', 'two business days']);
requireText('security', ['`0.1.x`', 'private vulnerability reporting']);

const issue = sources.get('evaluation') ?? '';
for (const id of [
  'flowtract_version',
  'node_version',
  'operating_system',
  'workflow_category',
  'eligibility',
  'starter_result',
  'starter_minutes',
  'intervention',
  'real_workflow',
  'repeat_workflow',
  'value',
  'retention',
  'friction',
  'support_effort',
  'evidence_visibility',
  'privacy'
]) {
  if (!new RegExp(`^\\s+id: ${id}$`, 'mu').test(issue)) {
    throw new Error(`Gate 4B evaluation form is missing field: ${id}`);
  }
}
for (const label of ['evaluation', 'needs-triage']) {
  if (!issue.includes(`'${label}'`)) {
    throw new Error(`Gate 4B evaluation form is missing label: ${label}`);
  }
}
requireText('contacts', [
  'gate4b-evaluation.yml',
  'discussions/categories/q-a',
  'discussions/categories/ideas',
  'security/advisories/new'
]);

const ledger = sources.get('ledger') ?? '';
const expectedHeader = [
  'ID',
  'Visibility',
  'Profile',
  'Starter',
  'Minutes',
  'Intervention',
  'Real workflow',
  'Repeat workflow',
  'Value',
  'Retention',
  'Defects',
  'Blockers',
  'Response hours',
  'Support minutes',
  'Evidence',
  'State'
];
const headerLine = ledger.split(/\r?\n/u).find(line => /^\|\s*ID\s*\|/u.test(line));
const actualHeader = headerLine
  ?.split('|')
  .slice(1, -1)
  .map(value => value.trim());
if (JSON.stringify(actualHeader) !== JSON.stringify(expectedHeader)) {
  throw new Error('Gate 4B evidence ledger header has drifted.');
}

const allowed = {
  visibility: new Set(['public', 'anonymized', 'aggregate-only']),
  starter: new Set(['pending', 'pass', 'fail', 'withdrawn']),
  intervention: new Set([
    'pending',
    'none',
    'documentation',
    'synchronous',
    'maintainer-code',
    'abandoned'
  ]),
  outcome: new Set(['pending', 'pass', 'fail', 'not-attempted', 'withdrawn']),
  answer: new Set(['pending', 'yes', 'no', 'unsure', 'withdrawn']),
  state: new Set([
    'enrolled',
    'starter-complete',
    'real-workflow',
    'repeat-workflow',
    'blocked',
    'withdrawn',
    'complete'
  ])
};
const rows = ledger
  .split(/\r?\n/u)
  .filter(line => /^\| G4B-E\d{3} \|/u.test(line))
  .map(line =>
    line
      .split('|')
      .slice(1, -1)
      .map(value => value.trim())
  );
const ids = new Set();
for (const [index, row] of rows.entries()) {
  if (row.length !== 16)
    throw new Error(`Gate 4B evidence row ${index + 1} has ${row.length} cells.`);
  const [
    id,
    visibility,
    profile,
    starter,
    minutes,
    intervention,
    realWorkflow,
    repeatWorkflow,
    value,
    retention,
    defects,
    blockers,
    responseHours,
    supportMinutes,
    evidence,
    state
  ] = row;
  const expected = `G4B-E${String(index + 1).padStart(3, '0')}`;
  if (id !== expected || ids.has(id)) throw new Error(`Expected unique sequential ID ${expected}.`);
  ids.add(id);
  if (!allowed.visibility.has(visibility)) throw new Error(`${id} has invalid visibility.`);
  if (
    profile !== '-' &&
    !/^flowtract 0\.1\.0; Node (?:22|24); (?:Windows|Linux|macOS|Other)$/u.test(profile)
  ) {
    throw new Error(`${id} has invalid profile.`);
  }
  if (!allowed.starter.has(starter)) throw new Error(`${id} has invalid starter result.`);
  if (minutes !== '-' && !/^[1-9]\d*$/u.test(minutes))
    throw new Error(`${id} has invalid minutes.`);
  if (!allowed.intervention.has(intervention)) throw new Error(`${id} has invalid intervention.`);
  if (!allowed.outcome.has(realWorkflow) || !allowed.outcome.has(repeatWorkflow)) {
    throw new Error(`${id} has invalid workflow result.`);
  }
  if (!allowed.answer.has(value) || !allowed.answer.has(retention)) {
    throw new Error(`${id} has invalid value or retention answer.`);
  }
  for (const [label, amount] of [
    ['defects', defects],
    ['blockers', blockers],
    ['response hours', responseHours],
    ['support minutes', supportMinutes]
  ]) {
    if (amount !== '-' && !/^\d+$/u.test(amount)) throw new Error(`${id} has invalid ${label}.`);
  }
  if (
    evidence !== '-' &&
    !/^https:\/\/github\.com\/flowtract\/flowtract\/(?:issues|discussions)\/\d+$/u.test(evidence)
  ) {
    throw new Error(`${id} has invalid public evidence link.`);
  }
  if (!allowed.state.has(state)) throw new Error(`${id} has invalid state.`);
}

const rootPackage = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const flowtractPackage = JSON.parse(
  await readFile(path.join(root, 'packages', 'flowtract', 'package.json'), 'utf8')
);
if (flowtractPackage.version !== '0.1.0') throw new Error('Gate 4B must evaluate flowtract@0.1.0.');
if (rootPackage.dependencies !== undefined && Object.keys(rootPackage.dependencies).length > 0) {
  throw new Error('Gate 4B must not add a root production dependency.');
}
const repositoryText = [...sources.values()].join('\n').toLowerCase();
for (const forbidden of ['google analytics', 'google-analytics', 'segment.io', 'posthog']) {
  if (repositoryText.includes(forbidden))
    throw new Error(`Gate 4B evidence surfaces mention ${forbidden}.`);
}

console.log(`Gate 4B contract passed with ${rows.length} privacy-safe evidence row(s).`);
