import { cp, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
await mkdir(join(projectRoot, 'dist'), { recursive: true });
await cp(join(projectRoot, 'public'), join(projectRoot, 'dist'), { recursive: true });
const compilation = spawnSync(process.execPath, [join(projectRoot, 'node_modules/typescript/bin/tsc')], {
  cwd: projectRoot,
  stdio: 'inherit',
});
if (compilation.error) throw compilation.error;
process.exit(compilation.status ?? 1);
