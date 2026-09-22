const fs = require('node:fs');
const { parseEnv } = require('node:util');

function loadEnv(filePath, keys, target = process.env) {
  let contents;
  try {
    contents = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  const values = parseEnv(contents);
  for (const key of keys) {
    if (target[key] === undefined && values[key] !== undefined) target[key] = values[key];
  }
}

module.exports = { loadEnv };
