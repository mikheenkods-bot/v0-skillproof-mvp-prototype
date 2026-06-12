/** @type {import('next').NextConfig} */
const nextConfig = {
  // jspdf/qrcode are client-only libraries whose Node builds reference a
  // dynamic worker that the bundler can't resolve during the SSR pass.
  // Keeping them external means they're required at runtime instead of bundled.
  serverExternalPackages: ['jspdf', 'qrcode'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow embedding in iframes from specified domains
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://www.rabota.ru https://rabota.ru https://*.rabota.ru http://localhost:*",
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
        ],
      },
    ]
  },
}

export default nextConfig
