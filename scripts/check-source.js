const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const roots = ['electron', 'src', 'server', 'config', 'scripts', 'tests'];
let failed = false;
function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) inspect(file);
    else if (/\.(js|cjs|css|html|json|ps1)$/.test(file)) {
      const lines = fs.readFileSync(file, 'utf8').trimEnd().split(/\r?\n/).length;
      if (lines > 500) {
        console.error(`${file}: ${lines} lines exceeds the 500-line limit`);
        failed = true;
      }
      if (/\.(js|cjs)$/.test(file)) {
        const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
        if (result.status !== 0) failed = true;
      }
    }
  }
}
for (const directory of roots) inspect(directory);
if (failed) process.exitCode = 1;
else console.log('All source/test scripts pass syntax and file-size checks.');
