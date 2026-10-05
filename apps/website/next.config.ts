import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  transpilePackages: ['@agendai/ui'],
  poweredByHeader: false,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  devIndicators: false,
  async rewrites() {
    const apiOrigin = process.env.API_INTERNAL_URL
      || (process.env.NODE_ENV === 'production' ? 'http://api:3001' : 'http://localhost:3001');
    return [{ source: '/api/v1/:path*', destination: `${apiOrigin}/api/v1/:path*` }];
  },
};
export default config;
