import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel deploy: standalone çıktı kullanma
  images: { unoptimized: true },
  reactStrictMode: false,
};

export default nextConfig;
