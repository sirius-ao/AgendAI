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
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://www.clarity.ms https://*.clarity.ms https://challenges.cloudflare.com https://accounts.google.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://www.clarity.ms https://*.clarity.ms https://challenges.cloudflare.com https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
      "frame-src https://challenges.cloudflare.com https://accounts.google.com",
      "worker-src 'self' blob:",
      ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
    ].join('; ');
    const common = [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=()' },
      ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
    ];
    return [
      { source: '/:path*', headers: common },
      { source: '/dashboard', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
      { source: '/dashboard/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
      { source: '/admin', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
      { source: '/admin/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
      { source: '/entrar', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
      { source: '/comecar', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
      { source: '/contacto', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
      { source: '/recuperar-palavra-passe', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
      { source: '/verificar-email', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
      { source: '/redefinir-palavra-passe', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
      { source: '/convites/aceitar', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
      { source: '/partilha/plano/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
      { source: '/newsletter/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
      { source: '/turnstile/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] },
    ];
  },
};
export default config;
