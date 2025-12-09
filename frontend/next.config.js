/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    compress: true, // Activation de la compression gzip
    poweredByHeader: false,
    swcMinify: true,
    // Optimisation des images
    images: {
        unoptimized: false,
        formats: ['image/avif', 'image/webp'],
    },
    // Configuration des headers pour caching
    async headers() {
        return [
            {
                source: '/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
