import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const apiDir = path.join(rootDir, 'src', 'app', 'api');
const backupDir = path.join(rootDir, '.api_backup');

console.log('--- Preparing Next.js static export for GitHub Pages ---');

let moved = false;
try {
  if (fs.existsSync(apiDir)) {
    console.log('Temporarily stashing src/app/api for static export...');
    fs.renameSync(apiDir, backupDir);
    moved = true;
  }

  console.log('Executing next build with OUTPUT_EXPORT=true...');
  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      OUTPUT_EXPORT: 'true',
    },
  });

  const outDir = path.join(rootDir, 'out');
  if (fs.existsSync(outDir)) {
    // Crucial for GitHub Pages to serve _next assets
    fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
    console.log('Created out/.nojekyll successfully.');
  }
} finally {
  if (moved && fs.existsSync(backupDir)) {
    console.log('Restoring src/app/api...');
    fs.renameSync(backupDir, apiDir);
    console.log('Restored src/app/api.');
  }
}
