import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceEntry = path.join(packageRoot, 'src', 'index.ts');
const outputDirectory = path.join(packageRoot, 'dist');
const esmTypes = path.join(outputDirectory, 'types', 'esm');
const cjsTypes = path.join(outputDirectory, 'types', 'cjs');

await Promise.all([
  build({
    entryPoints: [sourceEntry],
    outfile: path.join(outputDirectory, 'index.js'),
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    packages: 'external',
    sourcemap: true
  }),
  build({
    entryPoints: [sourceEntry],
    outfile: path.join(outputDirectory, 'index.cjs'),
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node22',
    packages: 'external',
    sourcemap: true
  })
]);

async function embedDeclarationSources(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await embedDeclarationSources(file);
      continue;
    }
    if (!entry.name.endsWith('.d.ts.map')) {
      continue;
    }

    const sourceMap = JSON.parse(await readFile(file, 'utf8'));
    const sourceRoot = sourceMap.sourceRoot ?? '';
    sourceMap.sourcesContent = await Promise.all(
      sourceMap.sources.map(source =>
        readFile(path.resolve(path.dirname(file), sourceRoot, source), 'utf8')
      )
    );
    await writeFile(file, `${JSON.stringify(sourceMap)}\n`, 'utf8');
  }
}

async function mirrorDeclarations(sourceDirectory, targetDirectory) {
  await mkdir(targetDirectory, { recursive: true });

  for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
    const source = path.join(sourceDirectory, entry.name);
    const targetName = entry.name
      .replace(/\.d\.ts\.map$/, '.d.cts.map')
      .replace(/\.d\.ts$/, '.d.cts');
    const target = path.join(targetDirectory, targetName);

    if (entry.isDirectory()) {
      await mirrorDeclarations(source, target);
      continue;
    }

    if (entry.name.endsWith('.d.ts')) {
      const declaration = await readFile(source, 'utf8');
      const rewritten = declaration
        .replace(/(from\s+['"]\.{1,2}\/[^'"]+)\.js(['"])/g, '$1.cjs$2')
        .replace(/sourceMappingURL=(.+)\.d\.ts\.map/g, 'sourceMappingURL=$1.d.cts.map');
      await writeFile(target, rewritten, 'utf8');
      continue;
    }

    if (entry.name.endsWith('.d.ts.map')) {
      const sourceMap = JSON.parse(await readFile(source, 'utf8'));
      sourceMap.file = String(sourceMap.file).replace(/\.d\.ts$/, '.d.cts');
      await writeFile(target, `${JSON.stringify(sourceMap)}\n`, 'utf8');
      continue;
    }

    await cp(source, target);
  }
}

await embedDeclarationSources(esmTypes);
await mirrorDeclarations(esmTypes, cjsTypes);
