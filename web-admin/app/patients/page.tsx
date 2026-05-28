"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { api, PatientListItem } from "@/lib/api";

export default function PatientsPage() {
  return (
    <AuthGuard>
      <PatientsView />
    </AuthGuard>
  );
}

function PatientsView() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "missed">("all");
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await api<PatientListItem[]>("/api/v1/patients");
      setPatients(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "missed") return patients.filter((p) => p.missed_today);
    return patients;
  }, [patients, filter]);

  const missedCount = patients.filter((p) => p.missed_today).length;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">환자 관리</h1>
          <p className="mt-1 text-sm text-slate-500">
            전체 {patients.length}명 · 오늘 미보고{" "}
            <span className="font-semibold text-danger">{missedCount}</span>명
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded border px-3 py-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "missed")}
          >
            <option value="all">전체 보기</option>
            <option value="missed">오늘 미보고만</option>
          </select>
          <Link
            href="/patients/new"
            className="rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            환자 등록
          </Link>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">이메일</th>
              <th className="px-4 py-3">최근 보고일</th>
              <th className="px-4 py-3">미보고일수</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  불러오는 중...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  해당하는 환자가 없습니다.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-slate-600">{p.email}</td>
                <td className="px-4 py-3 text-slate-600">
                  {p.last_report_date ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {p.days_since_last_report === null
                    ? "보고 이력 없음"
                    : `${p.days_since_last_report}일`}
                </td>
                <td className="px-4 py-3">
                  {p.missed_today ? (
                    <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                      오늘 미보고
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                      오늘 보고
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/patients/${p.id}`}
                    className="text-brand-600 hover:underline"
                  >
                    상세 보기
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
