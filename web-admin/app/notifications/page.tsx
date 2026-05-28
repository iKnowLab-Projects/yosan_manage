"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { api, PatientListItem } from "@/lib/api";

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsView />
    </AuthGuard>
  );
}

function NotificationsView() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [title, setTitle] = useState("오늘의 보고를 잊지 마세요");
  const [body, setBody] = useState(
    "식단과 건강 상태를 앱에서 보고해 주세요. 보고가 어려우시면 전화 부탁드립니다.",
  );
  const [category, setCategory] = useState("reminder");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api<PatientListItem[]>("/api/v1/patients")
      .then(setPatients)
      .catch((err) => setError(err.message));
  }, []);

  const missedToday = useMemo(
    () => patients.filter((p) => p.missed_today),
    [patients],
  );

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllMissed = () => {
    setSelected(new Set(missedToday.map((p) => p.id)));
  };

  const clearAll = () => setSelected(new Set());

  async function send(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (selected.size === 0) {
      setError("수신자를 1명 이상 선택해 주세요.");
      return;
    }
    setSending(true);
    try {
      const sent = await api<unknown[]>("/api/v1/notifications/send", {
        method: "POST",
        body: JSON.stringify({
          recipient_ids: Array.from(selected),
          title,
          body,
          category,
        }),
      });
      setResult(`${sent.length}명에게 알림을 발송했습니다.`);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "발송 실패");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">수신자 선택</h2>
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              className="rounded border px-2 py-1"
              onClick={selectAllMissed}
            >
              오늘 미보고 전체
            </button>
            <button
              type="button"
              className="rounded border px-2 py-1"
              onClick={clearAll}
            >
              선택 해제
            </button>
          </div>
        </div>
        <div className="max-h-[500px] overflow-y-auto rounded-lg border bg-white">
          {patients.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center justify-between border-b px-4 py-3 last:border-b-0 hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                />
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.email}</p>
                </div>
              </div>
              {p.missed_today ? (
                <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                  오늘 미보고
                </span>
              ) : (
                <span className="text-xs text-slate-400">최근 {p.last_report_date}</span>
              )}
            </label>
          ))}
        </div>
      </div>

      <form onSubmit={send} className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">알림 메시지</h2>
        <label className="mb-3 block">
          <span className="text-sm text-slate-600">분류</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="reminder">보고 독촉</option>
            <option value="alert">긴급 안내</option>
            <option value="general">일반</option>
          </select>
        </label>
        <label className="mb-3 block">
          <span className="text-sm text-slate-600">제목</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="mb-3 block">
          <span className="text-sm text-slate-600">내용</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            className="mt-1 min-h-[140px] w-full rounded border px-3 py-2"
          />
        </label>

        <p className="mb-3 text-sm text-slate-600">
          선택된 수신자: <strong>{selected.size}</strong>명
        </p>

        {error && (
          <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {result && (
          <p className="mb-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {result}
          </p>
        )}
        <button
          type="submit"
          disabled={sending}
          className="w-full rounded bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {sending ? "발송 중..." : "알림 발송"}
        </button>
      </form>
    </div>
  );
}
