/** @type {import('next').NextConfig} */
const nextConfig = {
  // jspdf/qrcode are client-only libraries whose Node builds reference a
  // dynamic worker that the bundler can't resolve during the SSR pass.
  // Keeping them external means they're required at runtime instead of bundled.
  serverExternalPackages: ['jspdf', 'qrcode'],
  // Fail the production build on type errors instead of silently shipping them —
  // masked type errors can hide real (including security-relevant) bugs.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // Allow embedding in iframes from specified domains
  async headers() {
    return [
      {
        // Baseline hardening for every route. Frame protection is intentionally
        // NOT set here so the /embed route can still be embedded by rabota.ru;
        // camera is allowed for the proctoring flow.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
      {
        // The embed page is framed by rabota.ru. Framing is controlled by the
        // CSP `frame-ancestors` allowlist below. The embed's own scripts call
        // /api on the SAME origin, so no cross-origin (CORS) grant is needed —
        // and we deliberately do NOT send `Access-Control-Allow-Origin: *`, which
        // would let any third-party website script-call our API from a browser.
        source: '/embed/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://www.rabota.ru https://rabota.ru https://*.rabota.ru http://localhost:*",
          },
        ],
      },
    ]
  },
}

export default nextConfig
