"use client";

import { useEffect, useState } from "react";
import { api, MileageSummary } from "@/lib/api";

const CYCLE = 6;

export default function MileagePanel({ patientId }: { patientId: number }) {
  const [summary, setSummary] = useState<MileageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = async () => {
    try {
      const data = await api<MileageSummary>(
        `/api/v1/mileage/patient/${patientId}`,
      );
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 실패");
    }
  };

  useEffect(() => {
    load();
  }, [patientId]);

  async function toggle(month_index: number, completed: boolean) {
    setBusy(month_index);
    try {
      const data = await api<MileageSummary>(
        `/api/v1/mileage/patient/${patientId}/toggle`,
        {
          method: "POST",
          body: JSON.stringify({ month_index, completed }),
        },
      );
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "토글 실패");
    } finally {
      setBusy(null);
    }
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }
  if (!summary) {
    return <p className="text-slate-500">불러오는 중...</p>;
  }

  const cycles: typeof summary.months[] = [];
  for (let i = 0; i < summary.months.length; i += CYCLE) {
    cycles.push(summary.months.slice(i, i + CYCLE));
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">통풍식이 마일리지</h2>

      <div className="mb-4 rounded-lg bg-brand-700 px-5 py-4 text-white">
        <p className="text-xs text-brand-100">마일리지 진행</p>
        <p className="text-2xl font-bold">
          {summary.completed_count}
          <span className="ml-2 text-sm font-medium text-brand-100">
            / {summary.total_months}월차
          </span>
        </p>
        <p className="mt-2 text-xs text-brand-100">
          완료 사이클 {summary.cycles_completed} / {cycles.length}
        </p>
      </div>

      <div className="space-y-3">
        {cycles.map((months, idx) => (
          <div
            key={idx}
            className="rounded-lg border bg-white p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-slate-700">{idx + 1}번째 사이클</p>
              <p className="text-xs text-slate-500">
                {idx * CYCLE + 1}월차 ~ {(idx + 1) * CYCLE}월차
              </p>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {months.map((m) => (
                <button
                  key={m.month_index}
                  type="button"
                  disabled={busy === m.month_index}
                  onClick={() => toggle(m.month_index, !m.completed)}
                  className="flex flex-col items-center gap-1 rounded p-2 hover:bg-slate-50 disabled:opacity-60"
                  title={
                    m.completed_at
                      ? `완료 ${new Date(m.completed_at).toLocaleString("ko-KR")}`
                      : "클릭하여 완료 표시"
                  }
                >
                  <div
                    className={[
                      "flex items-center justify-center rounded-full border-2",
                      m.is_hospital_visit
                        ? "h-12 w-12 border-amber-500"
                        : "h-9 w-9 border-slate-300",
                      m.completed
                        ? m.is_hospital_visit
                          ? "bg-amber-500 text-white"
                          : "bg-brand-600 text-white"
                        : "bg-white",
                    ].join(" ")}
                  >
                    {m.completed && (
                      <span className={m.is_hospital_visit ? "text-lg" : ""}>
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-600">
                    {m.month_index}월차
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        ※ 각 동그라미를 클릭하면 완료/미완료가 토글됩니다. 큰 동그라미(주황)는
        6개월차 병원 방문, 그 외는 매월 미션입니다.
      </p>
    </section>
  );
}
