/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@tcg-monitor/shared"]
};

export default nextConfig;
