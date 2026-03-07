const isDev = process.env.NODE_ENV === 'development';
const { withSentryConfig } = isDev ? {} : require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Serve the app under /lms path
    basePath: '/lms',

    async headers() {
        return [
            {
                // Apply security headers to all routes
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin'
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()'
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: blob: https:",
                            "font-src 'self' data:",
                            "connect-src 'self' https://*.supabase.co https://*.upstash.io https://*.sentry.io https://*.ingest.sentry.io https://*.googleapis.com https://oauth2.googleapis.com",
                            "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://drive.google.com https://accounts.google.com",
                            "media-src 'self' blob:",
                            "object-src 'none'",
                            "base-uri 'self'",
                            "form-action 'self'",
                        ].join('; ')
                    }
                ]
            }
        ]
    },

    // Enable React strict mode for development
    reactStrictMode: true,

    // Configure image domains for Next/Image optimization
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
        // Enable image optimization
        unoptimized: false,
        // Optimize image formats
        formats: ['image/avif', 'image/webp'],
        // Cache optimized images for 1 year
        minimumCacheTTL: 31536000,
    },

    // Enable experimental features for performance
    experimental: {
        // Optimize package imports
        optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons'],
    },

    // webpack watchOptions only needed when NOT using Turbopack
    webpack: (config, { dev }) => {
        if (dev) {
            config.watchOptions = {
                ignored: ['**/node_modules/**', '**/.next/**', '**/.git/**', '**/.claude/**', '**/public/**', '**/prisma/**'],
            }
        }
        return config
    },
}

module.exports = isDev
    ? nextConfig
    : withSentryConfig(nextConfig, {
          silent: true,
          disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
          disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
      });
