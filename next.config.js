/** @type {import('next').NextConfig} */
const nextConfig = {
    // Serve the app under /lms path
    basePath: '/lms',

    async redirects() {
        return [
            {
                // Redirect /lms to /lms/it (default locale)
                source: '/',
                destination: '/it',
                permanent: false,
            },
        ]
    },

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

    // Configure image domains if using Next/Image
    images: {
        domains: [],
        unoptimized: true
    }
}

const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

module.exports = withNextIntl(nextConfig);
