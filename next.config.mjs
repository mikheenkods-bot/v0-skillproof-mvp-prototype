/** @type {import('next').NextConfig} */

/*
 * ─────────────────────────────────────────────────────────────────────────
 * Security headers (closes the 9 DAST findings) — configured centrally here
 * so they apply to every response Next.js serves: pages (/candidate/*,
 * /verify/*), API routes, and static assets (/_next/static/*).
 *
 * Design constraints preserved:
 *   - Proctoring needs camera + microphone on our own origin.
 *   - The /embed/* widget must stay embeddable in partner iframes.
 *   - Vercel Analytics (va.vercel-scripts.com + *.vercel-insights.com),
 *     QR codes, and PDF certificates (blob:/data:) must keep working.
 *   - Next.js hydration relies on inline scripts/styles.
 * ─────────────────────────────────────────────────────────────────────────
 */

const isProd = process.env.NODE_ENV === 'production'

// Partner origins allowed to frame the /embed widget. Configurable without a
// code change via ALLOWED_EMBED_ORIGINS (space/comma separated). Falls back to
// the rabota.ru family. localhost is only trusted outside production.
const embedFrameAncestors = [
  "'self'",
  ...(
    process.env.ALLOWED_EMBED_ORIGINS ||
    'https://www.rabota.ru https://rabota.ru https://*.rabota.ru'
  )
    .split(/[\s,]+/)
    .filter(Boolean),
  ...(isProd ? [] : ['http://localhost:*']),
].join(' ')

// Shared CSP directives. frame-ancestors is appended per-context below.
function buildCsp(frameAncestors) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    // 'unsafe-inline' is required for Next.js hydration bootstrap scripts.
    // (A nonce-based policy is the future hardening step.)
    "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
    // Tailwind / Next inject inline styles.
    "style-src 'self' 'unsafe-inline'",
    // data:/blob: needed for generated QR codes and certificate previews.
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Vercel Analytics beacons + script; 'self' covers our API routes/DB proxy.
    "connect-src 'self' https://*.vercel-insights.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
    // blob: covers proctoring media + generated files.
    "media-src 'self' blob:",
    // qrcode/jspdf may spin up blob workers.
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
    'upgrade-insecure-requests',
  ].join('; ')
}

// Permissions-Policy: allow camera+microphone for OUR origin (proctoring),
// deny everything else we don't use.
const permissionsPolicy =
  'camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()'

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
  // Removes the informational `X-Powered-By: Next.js` header (DAST finding 7).
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Baseline hardening for EVERY response (pages, API, static assets).
        // These headers are identical everywhere, so there are no duplicates.
        source: '/:path*',
        headers: [
          // Finding 9: stop MIME sniffing.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Finding 6: lock down features, keep camera/mic for proctoring.
          { key: 'Permissions-Policy', value: permissionsPolicy },
          // Finding 5: isolate our browsing context group.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // Protect our own resources from cross-origin no-cors loads.
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
      {
        // Normal pages (everything EXCEPT /embed/*). The negative-lookahead
        // regex guarantees only ONE Content-Security-Policy header is ever
        // sent for a given path, so the embed policy below can differ safely.
        source: '/((?!embed).*)',
        headers: [
          // Findings 1 & 3: full CSP; frame-ancestors 'self' blocks framing.
          { key: 'Content-Security-Policy', value: buildCsp("'self'") },
          // Finding 3: legacy clickjacking defense alongside CSP.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Finding 4: credentialless (NOT require-corp) so the cross-origin
          // Vercel Analytics script and other resources keep loading. This is
          // the deliberate compatibility compromise noted in the report.
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
      {
        // The embed widget: framable by the partner allowlist. We deliberately
        // do NOT send X-Frame-Options or COEP here so the iframe keeps working
        // on partner domains. Framing is governed solely by frame-ancestors.
        source: '/embed/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: buildCsp(embedFrameAncestors),
          },
        ],
      },
    ]
  },
}

export default nextConfig
