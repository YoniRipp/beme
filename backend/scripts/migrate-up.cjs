const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const backendDir = path.resolve(__dirname, '..');
const envCandidates = ['.env.development', '.env.local', '.env'];

function loadEnvFile(envPath) {
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

for (const fileName of envCandidates) {
  const envPath = path.join(backendDir, fileName);
  if (fs.existsSync(envPath)) {
    loadEnvFile(envPath);
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing.');
  console.error('Set it in your shell or create backend/.env.development (or backend/.env).');
  process.exit(1);
}

const cliPath = require.resolve('node-pg-migrate/bin/node-pg-migrate.js');
const result = spawnSync(process.execPath, [cliPath, 'up', '--no-check-order'], {
  cwd: backendDir,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
