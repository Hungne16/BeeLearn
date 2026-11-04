import {build} from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir=join(projectRoot,'dist');
// This directory contains generated build output only.
await rm(outputDir,{recursive:true,force:true});
await mkdir(outputDir, { recursive: true });
await cp(join(projectRoot, 'public'), join(projectRoot, 'dist'), { recursive: true });
const compilation = spawnSync(process.execPath, [join(projectRoot, 'node_modules/typescript/bin/tsc')], {
  cwd: projectRoot,
  stdio: 'inherit',
});
if (compilation.error) throw compilation.error;
if(compilation.status)process.exit(compilation.status);
await build({entryPoints:[join(projectRoot,'src/app.ts')],outfile:join(projectRoot,'dist/app.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
