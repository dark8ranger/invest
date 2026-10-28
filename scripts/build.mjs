import { mkdir, copyFile, readdir, rm, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
// Only publish the static site. Source documentation, Git metadata and local files stay outside dist.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const files = ['index.html', 'styles.css', 'app.js', 'data.js', 'kline.js', 'crypto.js', 'vix.js', 'fx.js', 'favicon.svg', 'ads.txt', 'robots.txt'];
for (const file of files) await copyFile(path.join(root, file), path.join(output, file));
await cp(path.join(root, 'articles'), path.join(output, 'articles'), { recursive: true });
await cp(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
console.log(`Static site ready: dist/ (${files.length} files plus ${(await readdir(path.join(output, 'assets'))).length} assets)`);
