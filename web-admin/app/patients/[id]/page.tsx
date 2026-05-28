"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { api, DailyReport, Patient } from "@/lib/api";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [p, r] = await Promise.all([
          api<Patient>(`/api/v1/patients/${id}`),
          api<DailyReport[]>(`/api/v1/reports/patient/${id}`),
        ]);
        setPatient(p);
        setReports(r);
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
          <Row
            label="복용 약물"
            value={prof.medications ?? "—"}
            className="col-span-2"
          />
          <Row label="비고" value={prof.notes ?? "—"} className="col-span-2" />
        </dl>
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

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-slate-800">{value || "—"}</p>
    </div>
  );
}
