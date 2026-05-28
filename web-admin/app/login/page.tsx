"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, setSession } from "@/lib/api";

type LoginResponse = {
  access_token: string;
  user_id: number;
  name: string;
  role: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@yosan.local");
  const [password, setPassword] = useState("admin1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api<LoginResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (data.role !== "admin") {
        setError("관리자 계정만 접근할 수 있습니다.");
        return;
      }
      setSession(data.access_token, {
        user_id: data.user_id,
        name: data.name,
        role: data.role,
      });
      router.replace("/patients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm"
      >
        <h1 className="mb-6 text-xl font-semibold text-slate-800">
          요산 모니터링 관리자
        </h1>
        <label className="mb-3 block">
          <span className="text-sm text-slate-600">이메일</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded border px-3 py-2 outline-none focus:border-brand-500"
          />
        </label>
        <label className="mb-4 block">
          <span className="text-sm text-slate-600">비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded border px-3 py-2 outline-none focus:border-brand-500"
          />
        </label>
        {error && (
          <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
