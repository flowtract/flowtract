const expectedSha = process.env.FLOWTRACT_EXPECTED_SHA ?? '';
const allowed =
  process.env.FLOWTRACT_RELEASE_AUTHORIZED === '1' &&
  process.env.GITHUB_ACTIONS === 'true' &&
  /^[0-9a-f]{40}$/u.test(expectedSha) &&
  expectedSha === process.env.GITHUB_SHA &&
  ['bootstrap', 'final'].includes(process.env.FLOWTRACT_RELEASE_CHANNEL ?? '');

if (!allowed) {
  throw new Error(
    'Direct source publication is disabled. Use the exact-SHA Gate 4A release workflow.'
  );
}
