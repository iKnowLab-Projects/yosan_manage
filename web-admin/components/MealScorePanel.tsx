"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  deleteMealScore,
  listMealScores,
  MealScore,
  upsertMealScore,
} from "@/lib/api";

const inputCls =
  "w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500";

export default function MealScorePanel({ patientId }: { patientId: number }) {
  const [items, setItems] = useState<MealScore[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const [open, setOpen] = useState(false);
  const [yearMonth, setYearMonth] = useState("");
  const [score, setScore] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      setItems(await listMealScores(patientId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 실패");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  function resetForm() {
    setYearMonth("");
    setScore("");
    setComment("");
  }

  function editRow(m: MealScore) {
    setYearMonth(m.year_month);
    setScore(String(m.score));
    setComment(m.comment ?? "");
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      setError("월(YYYY-MM)을 선택해 주세요.");
      return;
    }
    const n = Number(score);
    if (score.trim() === "" || Number.isNaN(n) || n < 0 || n > 100) {
      setError("점수는 0~100 사이 숫자여야 합니다.");
      return;
    }
    setSubmitting(true);
    try {
      // (환자, 월) 기준 upsert — 같은 달이 있으면 자동 갱신
      await upsertMealScore(patientId, {
        year_month: yearMonth,
        score: n,
        comment: comment.trim() || null,
      });
      resetForm();
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("이 식사 점수를 삭제할까요?")) return;
    setBusy(id);
    try {
      await deleteMealScore(id);
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          식사 점수 ({items.length}건)
        </h2>
        <button
          onClick={() => {
            resetForm();
            setOpen((o) => !o);
          }}
          className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          {open ? "닫기" : "+ 점수 입력"}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {open && (
        <form
          onSubmit={submit}
          className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-slate-600">
                월 <span className="text-danger">*</span>
              </span>
              <input
                type="month"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                className={`mt-1 ${inputCls} bg-white`}
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">
                식사 점수 (0~100) <span className="text-danger">*</span>
              </span>
              <input
                type="number"
                min={0}
                max={100}
                step="any"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className={`mt-1 ${inputCls} bg-white`}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm text-slate-600">코멘트 (선택)</span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="예: 채소 섭취가 늘었습니다. 야식을 조금 더 줄여보세요."
              className={`mt-1 min-h-[80px] ${inputCls} bg-white`}
            />
          </label>
          <p className="text-xs text-slate-400">
            같은 달을 다시 입력하면 기존 점수·코멘트가 갱신됩니다.
          </p>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="rounded border bg-white px-4 py-6 text-center text-sm text-slate-500">
          등록된 식사 점수가 없습니다. 매월 점수를 입력하세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => (
            <li
              key={m.id}
              className="flex items-start justify-between gap-4 rounded-lg border bg-white p-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-800">
                  {m.year_month}
                  <span className="ml-2 text-brand-700">{m.score}점</span>
                </p>
                {m.comment && (
                  <p className="mt-1 text-sm text-slate-600">{m.comment}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-3">
                <button
                  onClick={() => editRow(m)}
                  className="text-xs text-brand-700 hover:underline"
                >
                  수정
                </button>
                <button
                  onClick={() => remove(m.id)}
                  disabled={busy === m.id}
                  className="text-xs text-red-600 hover:underline disabled:opacity-60"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
