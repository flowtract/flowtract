import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'packages', 'flowtract', 'tsconfig.json');
const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
if (loaded.error !== undefined) {
  throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, '\n'));
}
const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, path.dirname(configPath));
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length > 0) {
  throw new Error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: file => file,
      getCurrentDirectory: () => root,
      getNewLine: () => '\n'
    })
  );
}
const entry = program.getSourceFile(path.join(root, 'packages', 'flowtract', 'src', 'index.ts'));
if (entry === undefined) throw new Error('Could not load the root Flowtract entry point.');
const checker = program.getTypeChecker();
const moduleSymbol = checker.getSymbolAtLocation(entry);
if (moduleSymbol === undefined) throw new Error('Could not resolve the root Flowtract module.');
const undocumented = [];
const exports = checker.getExportsOfModule(moduleSymbol);
for (const exported of exports) {
  const target =
    (exported.flags & ts.SymbolFlags.Alias) === 0 ? exported : checker.getAliasedSymbol(exported);
  const documentation = ts.displayPartsToString(target.getDocumentationComment(checker)).trim();
  if (documentation.length === 0) undocumented.push(exported.name);
}
if (undocumented.length > 0) {
  throw new Error(
    `Root exports without IntelliSense documentation: ${undocumented.sort().join(', ')}`
  );
}
console.log(`API documentation proof passed for ${exports.length} root exports.`);
