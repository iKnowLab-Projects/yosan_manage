"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  adminSubmitSurvey,
  getSurveyTemplate,
  SurveyTemplate,
} from "@/lib/api";

const inputCls =
  "w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500";

function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function SurveyEntryPanel({
  patientId,
  group,
  onSubmitted,
}: {
  patientId: number;
  group: "B" | "C" | null | undefined;
  onSubmitted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tpl, setTpl] = useState<SurveyTemplate | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checkDate, setCheckDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && group && !tpl) {
      getSurveyTemplate(group)
        .then(setTpl)
        .catch((e) =>
          setError(e instanceof Error ? e.message : "템플릿 조회 실패")
        );
    }
  }, [open, group, tpl]);

  const questions = tpl?.sections.flatMap((s) => s.questions) ?? [];
  const remaining = questions.filter(
    (q) => answers[q.code] === undefined
  ).length;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (remaining > 0) {
      setError(`아직 ${remaining}개 문항이 미응답입니다.`);
      return;
    }
    setSubmitting(true);
    try {
      await adminSubmitSurvey(patientId, {
        check_date: checkDate,
        notes: notes.trim() || null,
        answers: Object.entries(answers).map(([question_code, choice_index]) => ({
          question_code,
          choice_index,
        })),
      });
      setAnswers({});
      setNotes("");
      setOpen(false);
      setOk(true);
      setTimeout(() => setOk(false), 3000);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">설문 대리 입력</h2>
        {group ? (
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            {open ? "닫기" : "+ 설문 입력"}
          </button>
        ) : null}
      </div>

      {!group && (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
          이 환자의 설문 그룹(B/C)이 지정되지 않아 설문을 입력할 수 없습니다.
          먼저 환자 정보에서 설문 그룹을 지정하세요.
        </p>
      )}

      {ok && (
        <p className="mb-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          설문을 저장했습니다.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {open && group && (
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-slate-600">작성일(검사일)</span>
              <input
                type="date"
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
            </label>
            <div className="flex items-end text-sm text-slate-500">
              미응답 {remaining} / {questions.length}
            </div>
          </div>

          {!tpl ? (
            <p className="text-sm text-slate-400">템플릿 불러오는 중...</p>
          ) : (
            tpl.sections.map((section) => (
              <div key={section.title} className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  {section.title}
                </h3>
                {section.questions.map((q, qi) => (
                  <div
                    key={q.code}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                  >
                    <p className="mb-2 text-sm text-slate-800">
                      {qi + 1}. {q.text}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt, oi) => {
                        const sel = answers[q.code] === oi;
                        return (
                          <button
                            key={oi}
                            type="button"
                            onClick={() =>
                              setAnswers((s) => ({ ...s, [q.code]: oi }))
                            }
                            className={`rounded-full border px-3 py-1.5 text-sm ${
                              sel
                                ? "border-brand-600 bg-brand-600 text-white"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}

          <label className="block">
            <span className="text-sm text-slate-600">비고 (선택)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`mt-1 min-h-[70px] ${inputCls}`}
            />
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? "저장 중..." : "설문 저장"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
