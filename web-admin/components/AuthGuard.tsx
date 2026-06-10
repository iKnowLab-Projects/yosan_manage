"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getStoredUser, StoredUser } from "@/lib/api";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || stored.role !== "admin") {
      router.replace("/login");
      return;
    }
    setUser(stored);
  }, [router]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <a href="/patients" className="text-lg font-semibold text-brand-700">
              요산 모니터링 관리자
            </a>
            <nav className="flex gap-4 text-sm">
              <a className="hover:underline" href="/patients">
                환자 관리
              </a>
              <a className="hover:underline" href="/pending">
                가입 요청
              </a>
              <a className="hover:underline" href="/password-resets">
                비밀번호 초기화
              </a>
              <a className="hover:underline" href="/notifications">
                알림 발송
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{user.name}</span>
            <button
              className="rounded border px-3 py-1 hover:bg-slate-50"
              onClick={() => {
                clearSession();
                router.replace("/login");
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
