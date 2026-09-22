import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(appRoot, '.next/standalone/apps/website');
const server = path.join(output, 'server.js');

if (!existsSync(server)) {
  console.error('Build de produção não encontrado. Execute pnpm build primeiro.');
  process.exit(1);
}

cpSync(path.join(appRoot, 'public'), path.join(output, 'public'), { recursive: true });
cpSync(path.join(appRoot, '.next/static'), path.join(output, '.next/static'), { recursive: true });
process.env.HOSTNAME ||= '0.0.0.0';
process.env.PORT ||= '3000';
await import(pathToFileURL(server).href);
