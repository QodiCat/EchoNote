const path = require('node:path');
const { spawnSync } = require('node:child_process');
const electron = require('electron');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
for (const file of ['electron-smoke.cjs', 'electron-import-smoke.cjs']) {
  const result = spawnSync(electron, [path.join(__dirname, '..', 'tests', file), root], {
    env,
    windowsHide: true,
    timeout: 60000,
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) {
    console.error(`${file} failed: ${result.error?.message || result.status}`);
    process.exit(1);
  }
  console.log(`${file} passed`);
}
