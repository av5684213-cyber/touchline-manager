import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export → out/ dizinine HTML/CSS/JS üretir (APK içine gömülür)
  output: "export",
  // WebView file:// yükleme için göreceli yollar
  assetPrefix: "./",
  images: { unoptimized: true },
  reactStrictMode: false,
  // API route'u static export'ta yok say
};

export default nextConfig;
