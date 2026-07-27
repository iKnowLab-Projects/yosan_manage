"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { api, ViewSummary } from "@/lib/api";

export default function StatsPage() {
  return (
    <AuthGuard>
      <Stats />
    </AuthGuard>
  );
}

function Stats() {
  const [s, setS] = useState<ViewSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ViewSummary>("/api/v1/views/summary")
      .then(setS)
      .catch((e) => setError(e instanceof Error ? e.message : "조회 실패"));
  }, []);

  if (error)
    return (
      <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
    );
  if (!s) return <p className="text-slate-500">불러오는 중...</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">조회 통계</h1>

      {/* 전체 조회수 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="카드뉴스 총 조회수" value={s.cardnews_total} />
        <StatCard label="알림 총 조회수" value={s.notification_total} />
        <StatCard
          label="전체 조회수"
          value={s.cardnews_total + s.notification_total}
          highlight
        />
      </div>

      {/* 카드뉴스별 조회수 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">카드뉴스별 조회수</h2>
        {s.by_cardnews.length === 0 ? (
          <p className="rounded-lg border bg-white px-4 py-6 text-center text-slate-500">
            아직 조회 기록이 없습니다.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border bg-white">
            {s.by_cardnews.map((c) => (
              <li
                key={c.content_id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="truncate pr-4 text-slate-800">{c.title}</span>
                <span className="flex-shrink-0 font-semibold text-brand-700">
                  {c.count.toLocaleString()}회
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 환자별 조회수 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">환자별 조회수</h2>
        {s.by_patient.length === 0 ? (
          <p className="rounded-lg border bg-white px-4 py-6 text-center text-slate-500">
            아직 조회 기록이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">환자</th>
                  <th className="px-4 py-2 text-right font-medium">카드뉴스</th>
                  <th className="px-4 py-2 text-right font-medium">알림</th>
                  <th className="px-4 py-2 text-right font-medium">합계</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {s.by_patient.map((p) => (
                  <tr key={p.patient_id}>
                    <td className="px-4 py-2 text-slate-800">{p.name}</td>
                    <td className="px-4 py-2 text-right text-slate-600">
                      {p.cardnews_views.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">
                      {p.notification_views.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-800">
                      {p.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border p-5 " +
        (highlight ? "border-brand-100 bg-brand-50" : "bg-white")
      }
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
