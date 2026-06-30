/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // برای استقرار Docker (فاز ۸)
};

export default nextConfig;
