import type { NextConfig } from "next";
import path from "node:path";

const isDev = process.env.NODE_ENV === 'development'

// CSP policy — no nonces (would force all pages to dynamic rendering via Proxy).
// 'unsafe-inline' on script-src is required by Next.js streaming SSR runtime
// (inline $RC() chunks that resolve Suspense boundaries). Migrate to nonce
// via middleware if a stricter policy is needed.
const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // 'unsafe-inline' for style-src: Recharts injects inline SVG styles and
  // Tailwind CSS-in-JS utilities rely on inline styles at runtime.
  "style-src 'self' 'unsafe-inline'",
  // blob: for chart canvas exports; data: for any base64 assets.
  // Allowed remote sources for <img> and next/image-served thumbnails:
  //  - *.cdninstagram.com / *.fbcdn.net  → Instagram post thumbnails + profile pics
  //  - i.ytimg.com / *.ggpht.com         → YouTube video thumbnails + channel avatars
  //  - *.supabase.co                     → user-uploaded avatars in Supabase Storage
  "img-src 'self' blob: data: https://*.cdninstagram.com https://*.fbcdn.net https://i.ytimg.com https://*.ggpht.com https://*.supabase.co",
  // Fonts self-hosted by next/font — no external CDN needed.
  "font-src 'self'",
  // API calls: Apify and Anthropic are called server-side only (Route Handlers).
  // Client-initiated fetches: our own API + Supabase Auth (signup/signin/session).
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // (img-src extended below to cover next/image-served thumbnails for YouTube/IG/Supabase)
  // Google Drive video embed for login page background.
  "frame-src https://drive.google.com https://drive.usercontent.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // frame-ancestors replaces X-Frame-Options for modern browsers.
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

const nextConfig: NextConfig = {
  output: 'standalone',
  // Pin Turbopack root to this project to silence the multi-lockfile warning
  // when there's a stray ~/package-lock.json on the user's machine.
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      // YouTube thumbnails + channel avatars
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: '**.ggpht.com' },
      // Supabase Storage (user-uploaded avatars). Hostname varies per project.
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Permissions-Policy',
            // Deny access to sensitive browser APIs not used by this dashboard.
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
