import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  transpilePackages: ['@agendai/ui'],
  poweredByHeader: false,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  devIndicators: false,
};
export default config;
