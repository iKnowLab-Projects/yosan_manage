"use client";

import { useEffect, useState } from "react";
import {
  AppointmentMessage,
  getAppointmentMessages,
  resetAppointmentMessage,
  saveAppointmentMessage,
} from "@/lib/api";

const inputCls =
  "w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500";

export default function AppointmentMessagesEditor() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppointmentMessage[]>([]);
  const [drafts, setDrafts] = useState<
    Record<number, { title: string; body: string }>
  >({});
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function load() {
    getAppointmentMessages()
      .then((d) => {
        setItems(d);
        const dr: Record<number, { title: string; body: string }> = {};
        d.forEach((m) => (dr[m.milestone] = { title: m.title, body: m.body }));
        setDrafts(dr);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "조회 실패"));
  }

  useEffect(() => {
    if (open && items.length === 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function setDraft(m: number, k: "title" | "body", v: string) {
    setDrafts((s) => ({ ...s, [m]: { ...s[m], [k]: v } }));
  }

  async function save(m: number) {
    setBusy(m);
    setErr(null);
    setMsg(null);
    try {
      await saveAppointmentMessage(m, drafts[m]);
      setMsg(`${m}개월 메시지를 저장했습니다.`);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(null);
    }
  }

  async function reset(m: number) {
    if (!confirm(`${m}개월 메시지를 기본값으로 되돌릴까요?`)) return;
    setBusy(m);
    setErr(null);
    setMsg(null);
    try {
      await resetAppointmentMessage(m);
      setMsg(`${m}개월 메시지를 기본값으로 복원했습니다.`);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "복원 실패");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mb-6 rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">알림 메시지 편집</h2>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          {open ? "닫기" : "메시지 편집"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-5">
          <p className="text-xs text-slate-500">
            마일스톤별로 발송되는 알림 문구입니다. 편집하지 않으면 기본값이
            사용됩니다.
          </p>
          {msg && (
            <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {msg}
            </p>
          )}
          {err && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </p>
          )}

          {items.map((it) => (
            <div
              key={it.milestone}
              className="rounded-lg border border-slate-200 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="font-semibold text-slate-800">
                  {it.milestone}개월
                </span>
                {it.is_custom ? (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    편집됨
                  </span>
                ) : (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    기본값
                  </span>
                )}
              </div>
              <label className="block">
                <span className="text-xs text-slate-600">제목</span>
                <input
                  value={drafts[it.milestone]?.title ?? ""}
                  onChange={(e) =>
                    setDraft(it.milestone, "title", e.target.value)
                  }
                  className={`mt-1 ${inputCls}`}
                />
              </label>
              <label className="mt-2 block">
                <span className="text-xs text-slate-600">내용</span>
                <textarea
                  value={drafts[it.milestone]?.body ?? ""}
                  onChange={(e) =>
                    setDraft(it.milestone, "body", e.target.value)
                  }
                  className={`mt-1 min-h-[80px] ${inputCls}`}
                />
              </label>
              <div className="mt-3 flex justify-end gap-2">
                {it.is_custom && (
                  <button
                    onClick={() => reset(it.milestone)}
                    disabled={busy === it.milestone}
                    className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    기본값 복원
                  </button>
                )}
                <button
                  onClick={() => save(it.milestone)}
                  disabled={busy === it.milestone}
                  className="rounded bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {busy === it.milestone ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
