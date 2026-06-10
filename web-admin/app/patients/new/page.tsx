"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

export default function NewPatientPage() {
  return (
    <AuthGuard>
      <NewPatientForm />
    </AuthGuard>
  );
}

function NewPatientForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    birth_date: "",
    gender: "",
    height_cm: "",
    baseline_weight_kg: "",
    baseline_uric_acid: "",
    medications: "",
    notes: "",
    survey_group: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api("/api/v1/patients", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          profile: {
            phone: form.phone || null,
            birth_date: form.birth_date || null,
            gender: form.gender || null,
            height_cm: form.height_cm ? Number(form.height_cm) : null,
            baseline_weight_kg: form.baseline_weight_kg
              ? Number(form.baseline_weight_kg)
              : null,
            baseline_uric_acid: form.baseline_uric_acid
              ? Number(form.baseline_uric_acid)
              : null,
            medications: form.medications || null,
            notes: form.notes || null,
            survey_group: form.survey_group || null,
          },
        }),
      });
      router.push("/patients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록 실패");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">환자 등록</h1>
      <form onSubmit={submit} className="space-y-4 rounded-lg border bg-white p-6">
        <Field label="이메일 (로그인용)" required>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            className="input"
          />
        </Field>
        <Field label="초기 비밀번호" required>
          <input
            type="text"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
            minLength={6}
            className="input"
          />
        </Field>
        <Field label="이름" required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            className="input"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="전화번호">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="생년월일">
            <input
              type="date"
              value={form.birth_date}
              onChange={(e) => update("birth_date", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="성별">
            <select
              value={form.gender}
              onChange={(e) => update("gender", e.target.value)}
              className="input"
            >
              <option value="">선택</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
              <option value="other">기타</option>
            </select>
          </Field>
          <Field label="신장 (cm)">
            <input
              type="number"
              step="0.1"
              value={form.height_cm}
              onChange={(e) => update("height_cm", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="기준 체중 (kg)">
            <input
              type="number"
              step="0.1"
              value={form.baseline_weight_kg}
              onChange={(e) => update("baseline_weight_kg", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="기준 요산 수치 (mg/dL)">
            <input
              type="number"
              step="0.1"
              value={form.baseline_uric_acid}
              onChange={(e) => update("baseline_uric_acid", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="설문 그룹">
            <select
              value={form.survey_group}
              onChange={(e) => update("survey_group", e.target.value)}
              className="input"
            >
              <option value="">선택 안 함</option>
              <option value="B">B군 (저요산식단)</option>
              <option value="C">C군 (DASH식단)</option>
            </select>
          </Field>
        </div>
        <Field label="복용 약물">
          <textarea
            value={form.medications}
            onChange={(e) => update("medications", e.target.value)}
            className="input min-h-[60px]"
          />
        </Field>
        <Field label="비고">
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="input min-h-[60px]"
          />
        </Field>

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border px-4 py-2 text-sm"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? "등록 중..." : "등록"}
          </button>
        </div>
      </form>
      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          outline: none;
          background: white;
        }
        .input:focus {
          border-color: rgb(59 130 246);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-600">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
