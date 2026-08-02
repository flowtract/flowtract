import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath;
if (npmCli === undefined) throw new Error('npm_execpath is required for SBOM proof.');
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'flowtract-sbom-'));

try {
  const output = execFileSync(process.execPath, [npmCli, 'sbom', '--sbom-format', 'cyclonedx'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const sbom = JSON.parse(output);
  await writeFile(path.join(temporaryRoot, 'flowtract.cdx.json'), `${JSON.stringify(sbom)}\n`);
  if (sbom.bomFormat !== 'CycloneDX' || typeof sbom.specVersion !== 'string') {
    throw new Error('npm did not generate a CycloneDX SBOM.');
  }
  const names = new Set([
    sbom.metadata?.component?.name,
    ...(Array.isArray(sbom.components) ? sbom.components.map(component => component.name) : [])
  ]);
  for (const required of ['flowtract', 'zod', 'playwright', 'fast-check']) {
    if (!names.has(required)) throw new Error(`CycloneDX SBOM is missing ${required}.`);
  }
  if (!Array.isArray(sbom.dependencies) || sbom.dependencies.length === 0) {
    throw new Error('CycloneDX SBOM did not include the dependency graph.');
  }
  console.log(
    `CycloneDX SBOM proof passed with ${sbom.components.length} components and ${sbom.dependencies.length} dependency nodes.`
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
