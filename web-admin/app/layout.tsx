import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요산 환자 모니터링 관리자",
  description: "요산 환자 일일 보고 및 알림 관리 콘솔",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
