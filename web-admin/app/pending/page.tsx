"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { api, Patient } from "@/lib/api";

export default function PendingPage() {
  return (
    <AuthGuard>
      <PendingView />
    </AuthGuard>
  );
}

function PendingView() {
  const [items, setItems] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api<Patient[]>("/api/v1/patients/pending");
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">가입 요청</h1>
          <p className="mt-1 text-sm text-slate-500">
            환자가 신청한 가입 요청을 검토하고 설문 그룹을 지정하여 승인합니다.
          </p>
        </div>
        <p className="text-sm text-slate-500">대기 {items.length}건</p>
      </div>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-slate-500">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border bg-white px-4 py-8 text-center text-slate-500">
          대기 중인 가입 요청이 없습니다.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((p) => (
            <PendingRow key={p.id} patient={p} onAction={load} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PendingRow({
  patient,
  onAction,
}: {
  patient: Patient;
  onAction: () => void;
}) {
  const [group, setGroup] = useState<"B" | "C">("B");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const prof = patient.profile ?? {};

  async function approve() {
    setBusy("approve");
    setErr(null);
    try {
      await api(`/api/v1/patients/${patient.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ survey_group: group }),
      });
      onAction();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "승인 실패");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (
      !confirm(`${patient.name} (${patient.email}) 의 가입을 거절(삭제)할까요?`)
    )
      return;
    setBusy("reject");
    setErr(null);
    try {
      await api(`/api/v1/patients/${patient.id}`, { method: "DELETE" });
      onAction();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "거절 실패");
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="rounded-lg border bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">{patient.name}</p>
          <p className="text-sm text-slate-600">{patient.email}</p>
          <p className="mt-1 text-xs text-slate-400">
            신청 {new Date(patient.created_at).toLocaleString("ko-KR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">설문 그룹</label>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value as "B" | "C")}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="B">B군 (저요산식단)</option>
            <option value="C">C군 (DASH식단)</option>
          </select>
          <button
            onClick={approve}
            disabled={busy !== null}
            className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy === "approve" ? "승인 중..." : "승인"}
          </button>
          <button
            onClick={reject}
            disabled={busy !== null}
            className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {busy === "reject" ? "처리 중..." : "거절"}
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-t pt-3 text-sm md:grid-cols-4">
        <Field label="전화번호" value={prof.phone ?? "—"} />
        <Field label="생년월일" value={prof.birth_date ?? "—"} />
        <Field label="성별" value={genderLabel(prof.gender)} />
        <Field
          label="신장"
          value={prof.height_cm ? `${prof.height_cm} cm` : "—"}
        />
        <Field
          label="기준 체중"
          value={
            prof.baseline_weight_kg ? `${prof.baseline_weight_kg} kg` : "—"
          }
        />
        <Field
          label="기준 요산"
          value={
            prof.baseline_uric_acid ? `${prof.baseline_uric_acid} mg/dL` : "—"
          }
        />
        <Field
          label="복용 약물"
          value={prof.medications ?? "—"}
          className="col-span-2"
        />
      </dl>

      {err && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </p>
      )}
    </li>
  );
}

function genderLabel(g?: string | null): string {
  if (g === "male") return "남성";
  if (g === "female") return "여성";
  if (g === "other") return "기타";
  return "—";
}

function Field({
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
