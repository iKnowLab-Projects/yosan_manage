/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker 슬림 이미지용 독립 실행 번들 (.next/standalone)
  output: "standalone",
  env: {
    // 미설정(개발) → localhost, 빈 문자열("") → 동일 출처(상대경로, 통합 배포용)
    NEXT_PUBLIC_API_BASE:
      process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:26610",
  },
};

export default nextConfig;
