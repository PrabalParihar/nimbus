/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  images: {
    domains: ['stormseer.app', 'ipfs.io', 'gateway.pinata.cloud'],
  },
  transpilePackages: [
    '@near-wallet-selector/core',
    '@near-wallet-selector/my-near-wallet',
    '@near-wallet-selector/meteor-wallet',
    '@near-wallet-selector/sender',
    '@near-wallet-selector/modal-ui',
  ],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_NEAR_NETWORK_ID: process.env.NEXT_PUBLIC_NEAR_NETWORK_ID || 'testnet',
    NEXT_PUBLIC_NEAR_CONTRACT_ID: process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID || 'prabal9.testnet',
    NEXT_PUBLIC_AGENT_API_URL: process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:3001',
  },
}

module.exports = nextConfig 