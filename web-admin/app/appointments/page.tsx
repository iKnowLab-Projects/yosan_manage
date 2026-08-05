"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AppointmentMessagesEditor from "@/components/AppointmentMessagesEditor";
import {
  AppointmentStatus,
  getAppointmentStatus,
  runAppointmentReminders,
} from "@/lib/api";

export default function AppointmentsPage() {
  return (
    <AuthGuard>
      <AppointmentsView />
    </AuthGuard>
  );
}

const MILESTONE_LABEL: Record<number, string> = {
  6: "6개월",
  12: "12개월",
  18: "18개월",
  24: "24개월",
};

function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function AppointmentsView() {
  const [rows, setRows] = useState<AppointmentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getAppointmentStatus()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "조회 실패"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const today = todayStr();

  const sentCount = useMemo(
    () =>
      rows.reduce(
        (acc, r) => acc + r.milestones.filter((m) => m.sent).length,
        0
      ),
    [rows]
  );

  async function runNow() {
    setRunning(true);
    setMsg(null);
    try {
      const { sent } = await runAppointmentReminders();
      setMsg(`점검 완료 — ${sent}건 발송되었습니다.`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "실행 실패");
    } finally {
      setRunning(false);
    }
  }

  // 셀 상태: 발송됨 / 예정 / 미발송(누락)
  function cellState(m: AppointmentStatus["milestones"][number]) {
    if (m.sent) return "sent";
    if (m.reminder_date < today) return "missed"; // 발송일 지났는데 미발송
    return "pending";
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">외래 진료일 알림 현황</h1>
          <p className="mt-1 text-sm text-slate-500">
            등록일 기준 6·12·18·24개월 외래일의 <b>1주일 전</b>에 자동 발송됩니다.
            · 누적 발송 {sentCount}건
          </p>
        </div>
        <button
          onClick={runNow}
          disabled={running}
          className="rounded border border-brand-600 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
        >
          {running ? "점검 중..." : "지금 점검·발송"}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {msg && (
        <p className="mb-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {msg}
        </p>
      )}

      <AppointmentMessagesEditor />

      <div className="mb-3 flex gap-4 text-xs text-slate-500">
        <Legend color="bg-emerald-100 text-emerald-700" label="발송됨" />
        <Legend color="bg-slate-100 text-slate-500" label="예정" />
        <Legend color="bg-red-100 text-red-700" label="미발송(발송일 경과)" />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">환자</th>
              <th className="px-4 py-3">등록일</th>
              {[6, 12, 18, 24].map((m) => (
                <th key={m} className="px-4 py-3 text-center">
                  {MILESTONE_LABEL[m]}
                </th>
              ))}
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
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  대상 환자가 없습니다.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.patient_id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-slate-500">{r.email}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.enrollment_date}</td>
                {r.milestones.map((m) => {
                  const st = cellState(m);
                  const cls =
                    st === "sent"
                      ? "bg-emerald-50"
                      : st === "missed"
                        ? "bg-red-50"
                        : "";
                  return (
                    <td key={m.milestone} className={`px-4 py-3 ${cls}`}>
                      <p className="text-xs text-slate-500">외래 {m.appointment_date}</p>
                      <p className="text-xs text-slate-400">
                        알림 {m.reminder_date}
                      </p>
                      <p
                        className={`text-xs font-semibold ${
                          st === "sent"
                            ? "text-emerald-700"
                            : st === "missed"
                              ? "text-red-700"
                              : "text-slate-400"
                        }`}
                      >
                        {st === "sent"
                          ? `발송됨${m.sent_at ? ` (${m.sent_at.slice(0, 10)})` : ""}`
                          : st === "missed"
                            ? "미발송"
                            : "예정"}
                      </p>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-3 w-3 rounded ${color}`} />
      {label}
    </span>
  );
}
