/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    agentUpgrade: 'security',
  },
  allowedDevOrigins: [
    '172.30.80.1',
    '192.168.68.60',
  ],
};

export default nextConfig;