/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ["192.168.1.*", "192.168.*", "10.0.*", "172.16.*"],
};

module.exports = nextConfig;
