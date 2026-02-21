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
                    }
                ]
            }
        ]
    },

    // Enable React strict mode for development
    reactStrictMode: true,

    // Configure image domains for Next/Image optimization
    images: {
        remotePatterns: [],
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

    // Fix: webpack file watcher on Windows triggers spurious Fast Refresh rebuilds
    webpack: (config, { dev }) => {
        if (dev) {
            config.watchOptions = {
                ignored: ['**/node_modules/**', '**/.next/**', '**/.git/**', '**/.claude/**', '**/public/**'],
                aggregateTimeout: 3000, // Wait 3s after last change before rebuilding
            }
        }
        return config
    },
}

module.exports = nextConfig;
