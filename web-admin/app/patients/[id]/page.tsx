"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import MileagePanel from "@/components/MileagePanel";
import InBodyPanel from "@/components/InBodyPanel";
import { api, DailyReport, Patient, SurveySubmission } from "@/lib/api";

const MEAL_LABEL: Record<string, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

export default function PatientDetailPage() {
  return (
    <AuthGuard>
      <PatientDetail />
    </AuthGuard>
  );
}

function PatientDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [surveys, setSurveys] = useState<SurveySubmission[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [p, r, s] = await Promise.all([
          api<Patient>(`/api/v1/patients/${id}`),
          api<DailyReport[]>(`/api/v1/reports/patient/${id}`),
          api<SurveySubmission[]>(`/api/v1/surveys/patient/${id}`),
        ]);
        setPatient(p);
        setReports(r);
        setSurveys(s);
      } catch (err) {
        setError(err instanceof Error ? err.message : "조회 실패");
      }
    })();
  }, [id]);

  if (error)
    return (
      <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
    );
  if (!patient) return <p className="text-slate-500">불러오는 중...</p>;

  const prof = patient.profile ?? {};

  return (
    <div className="space-y-8">
      <div>
        <Link href="/patients" className="text-sm text-brand-600 hover:underline">
          ← 환자 목록
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{patient.name}</h1>
        <p className="text-sm text-slate-500">{patient.email}</p>
      </div>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">기본 정보</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Row label="전화번호" value={prof.phone ?? "—"} />
          <Row label="생년월일" value={prof.birth_date ?? "—"} />
          <Row label="성별" value={prof.gender ?? "—"} />
          <Row label="신장" value={prof.height_cm ? `${prof.height_cm} cm` : "—"} />
          <Row
            label="기준 체중"
            value={prof.baseline_weight_kg ? `${prof.baseline_weight_kg} kg` : "—"}
          />
          <Row
            label="기준 요산"
            value={
              prof.baseline_uric_acid ? `${prof.baseline_uric_acid} mg/dL` : "—"
            }
          />
          <SurveyGroupEditor
            patientId={patient.id}
            current={prof.survey_group ?? null}
            onSaved={(g) =>
              setPatient((p) =>
                p
                  ? {
                      ...p,
                      profile: { ...(p.profile ?? {}), survey_group: g },
                    }
                  : p,
              )
            }
          />
          <Row
            label="복용 약물"
            value={prof.medications ?? "—"}
            className="col-span-2"
          />
          <Row label="비고" value={prof.notes ?? "—"} className="col-span-2" />
        </dl>
      </section>

      <MileagePanel patientId={patient.id} />

      <InBodyPanel patientId={patient.id} />

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          설문 제출 이력 ({surveys.length}건)
        </h2>
        {surveys.length === 0 ? (
          <p className="rounded-lg border bg-white px-4 py-8 text-center text-slate-500">
            설문 제출 이력이 없습니다.
          </p>
        ) : (
          <ul className="space-y-3">
            {surveys.map((s) => (
              <li key={s.id} className="rounded-lg border bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-800">
                      {s.check_date}
                    </span>
                    <span className="ml-2 rounded bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                      {s.survey_group}군
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    제출 {new Date(s.submitted_at).toLocaleString("ko-KR")}
                  </span>
                </div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {s.answers.map((a) => (
                    <li
                      key={a.question_code}
                      className="grid grid-cols-[120px_1fr] gap-3"
                    >
                      <span className="font-mono text-xs text-slate-500">
                        {a.question_code}
                      </span>
                      <span>{a.choice_label}</span>
                    </li>
                  ))}
                </ul>
                {s.notes && (
                  <p className="mt-3 border-t pt-3 text-sm text-slate-600">
                    {s.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          일일 보고 이력 ({reports.length}건)
        </h2>
        {reports.length === 0 ? (
          <p className="rounded-lg border bg-white px-4 py-8 text-center text-slate-500">
            보고 이력이 없습니다.
          </p>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-lg border bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-medium text-slate-800">
                    {r.report_date}
                  </span>
                  {r.flare_up && (
                    <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                      통풍 발작
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                  <Metric label="체중" value={r.weight_kg && `${r.weight_kg} kg`} />
                  <Metric
                    label="요산"
                    value={r.uric_acid && `${r.uric_acid} mg/dL`}
                  />
                  <Metric
                    label="수분 섭취"
                    value={r.water_intake_ml && `${r.water_intake_ml} ml`}
                  />
                  <Metric
                    label="운동"
                    value={
                      r.exercise_minutes !== null &&
                      r.exercise_minutes !== undefined
                        ? `${r.exercise_minutes} 분`
                        : null
                    }
                  />
                  <Metric label="통증 부위" value={r.pain_location} />
                  <Metric
                    label="통증 강도"
                    value={
                      r.pain_level !== null && r.pain_level !== undefined
                        ? `${r.pain_level}/10`
                        : null
                    }
                  />
                  <Metric
                    label="약물 복용"
                    value={
                      r.medication_taken === null ||
                      r.medication_taken === undefined
                        ? null
                        : r.medication_taken
                          ? "예"
                          : "아니오"
                    }
                  />
                </div>
                {r.meals.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <p className="mb-2 text-xs font-semibold text-slate-500">
                      식단
                    </p>
                    <ul className="space-y-1 text-sm">
                      {r.meals.map((m) => (
                        <li key={m.id}>
                          <span className="font-medium text-slate-700">
                            [{MEAL_LABEL[m.meal_type] ?? m.meal_type}]
                          </span>{" "}
                          <span className="text-slate-600">{m.description}</span>
                          {m.purine_estimate && (
                            <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              퓨린 {m.purine_estimate}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.notes && (
                  <p className="mt-3 border-t pt-3 text-sm text-slate-600">
                    {r.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}

function SurveyGroupEditor({
  patientId,
  current,
  onSaved,
}: {
  patientId: number;
  current: "B" | "C" | null;
  onSaved: (g: "B" | "C" | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(current ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/v1/patients/${patientId}/profile`, {
        method: "PUT",
        body: JSON.stringify({ survey_group: value || null }),
      });
      onSaved((value || null) as "B" | "C" | null);
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  const label =
    current === "B"
      ? "B군 (저요산식단)"
      : current === "C"
        ? "C군 (DASH식단)"
        : "미지정";

  return (
    <div>
      <dt className="text-xs text-slate-500">설문 그룹</dt>
      <dd className="flex items-center gap-2 text-slate-800">
        {editing ? (
          <>
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="">미지정</option>
              <option value="B">B군 (저요산식단)</option>
              <option value="C">C군 (DASH식단)</option>
            </select>
            <button
              onClick={save}
              disabled={busy}
              className="rounded bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "저장 중..." : "저장"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setValue(current ?? "");
                setErr(null);
              }}
              className="rounded border px-3 py-1 text-xs"
            >
              취소
            </button>
            {err && (
              <span className="text-xs text-red-700">{err}</span>
            )}
          </>
        ) : (
          <>
            <span>{label}</span>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-brand-600 hover:underline"
            >
              변경
            </button>
          </>
        )}
      </dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-slate-800">{value || "—"}</p>
    </div>
  );
}
