import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 图片全部走本地文件，不做远程优化（服务器上没装 sharp 也能跑）
  images: {
    unoptimized: true,
  },
  // 后台会在运行时往 public/uploads 写文件，禁止缓存 404
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
