import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export → out/ dizinine HTML/CSS/JS üretir (APK içine gömülür)
  output: "export",
  // WebView file:// yükleme için göreceli yollar
  assetPrefix: "./",
  images: { unoptimized: true },
  reactStrictMode: false,
  // v2.9.11: Production build'de source map üretme — APK boyutu küçülür, kod gizli kalır
  productionBrowserSourceMaps: false,
};

export default nextConfig;
