// Stages a compiled library package of src/ui/components for design-sync.
// The app has no library build, so this emits real JS (esbuild) + .d.ts (tsc)
// into a gitignored package dir the converter reads like a published dist.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const OUT = '.design-sync/.cache/pkg';
const esbuild = createRequire(import.meta.url)('../.ds-sync/node_modules/esbuild');
const root = JSON.parse(readFileSync('package.json', 'utf8'));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/dist`, { recursive: true });

execFileSync('npx', ['tsc', '-p', 'tsconfig.app.json', '--noEmit', 'false', '--declaration',
  '--emitDeclarationOnly', '--rootDir', 'src', '--outDir', `${OUT}/types`, '--tsBuildInfoFile', `${OUT}/.tsbuildinfo`],
  { stdio: 'inherit' });

await esbuild.build({
  entryPoints: ['src/ui/components/index.ts'], bundle: true, format: 'esm', jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime'], outfile: `${OUT}/dist/index.js`, logLevel: 'warning',
});
// Global app CSS (tokens, base type, .row/.stack/.muted/.pos/.neg utilities).
await esbuild.build({ entryPoints: ['src/index.css'], bundle: true, outfile: `${OUT}/dist/global.css`, logLevel: 'warning' });
// One stylesheet in app load order: global first (main.tsx), then component CSS.
writeFileSync(`${OUT}/dist/styles.css`,
  readFileSync(`${OUT}/dist/global.css`, 'utf8') + '\n' + readFileSync(`${OUT}/dist/index.css`, 'utf8'));

writeFileSync(`${OUT}/package.json`, JSON.stringify({
  name: root.name, version: root.version, type: 'module', private: true,
  module: 'dist/index.js', main: 'dist/index.js', types: 'types/ui/components/index.d.ts',
  peerDependencies: { react: root.dependencies.react, 'react-dom': root.dependencies['react-dom'] },
}, null, 2));
console.log(`staged ${OUT}`);
