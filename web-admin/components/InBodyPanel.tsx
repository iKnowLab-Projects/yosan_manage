"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { api, assetUrl, InBodyResult, uploadFile } from "@/lib/api";

const inputCls =
  "w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500";

// (필드 key, 라벨, 단위) — measured_date/이미지/비고는 별도 처리
const FIELDS: { key: keyof InBodyResult; label: string; unit: string }[] = [
  { key: "weight_kg", label: "체중", unit: "kg" },
  { key: "skeletal_muscle_mass", label: "골격근량", unit: "kg" },
  { key: "body_fat_mass", label: "체지방량", unit: "kg" },
  { key: "percent_body_fat", label: "체지방률", unit: "%" },
  { key: "bmi", label: "BMI", unit: "" },
  { key: "basal_metabolic_rate", label: "기초대사량", unit: "kcal" },
  { key: "total_body_water", label: "체수분", unit: "L" },
  { key: "inbody_score", label: "InBody 점수", unit: "점" },
];

const EMPTY_FORM: Record<string, string> = {
  measured_date: "",
  weight_kg: "",
  skeletal_muscle_mass: "",
  body_fat_mass: "",
  percent_body_fat: "",
  bmi: "",
  basal_metabolic_rate: "",
  total_body_water: "",
  inbody_score: "",
  note: "",
};

export default function InBodyPanel({ patientId }: { patientId: number }) {
  const [items, setItems] = useState<InBodyResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...EMPTY_FORM });
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (k: string, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  async function load() {
    try {
      const data = await api<InBodyResult[]>(
        `/api/v1/inbody/patient/${patientId}`
      );
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 실패");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { key } = await uploadFile(file);
      setImageKey(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function resetForm() {
    setForm({ ...EMPTY_FORM });
    setImageKey(null);
  }

  function num(v: string): number | null {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.measured_date) {
      setError("측정일을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await api(`/api/v1/inbody/patient/${patientId}`, {
        method: "POST",
        body: JSON.stringify({
          measured_date: form.measured_date,
          weight_kg: num(form.weight_kg),
          skeletal_muscle_mass: num(form.skeletal_muscle_mass),
          body_fat_mass: num(form.body_fat_mass),
          percent_body_fat: num(form.percent_body_fat),
          bmi: num(form.bmi),
          basal_metabolic_rate: num(form.basal_metabolic_rate),
          total_body_water: num(form.total_body_water),
          inbody_score: num(form.inbody_score),
          image_key: imageKey,
          note: form.note.trim() || null,
        }),
      });
      resetForm();
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록 실패");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("이 InBody 결과를 삭제할까요?")) return;
    setBusy(id);
    try {
      await api(`/api/v1/inbody/${id}`, { method: "DELETE" });
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
          InBody 결과 ({items.length}건)
        </h2>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          {open ? "닫기" : "+ 결과 등록"}
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
          <label className="block">
            <span className="text-sm text-slate-600">
              측정일 <span className="text-danger">*</span>
            </span>
            <input
              type="date"
              value={form.measured_date}
              onChange={(e) => update("measured_date", e.target.value)}
              className={`mt-1 ${inputCls} bg-white`}
            />
          </label>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {FIELDS.map((f) => (
              <label key={f.key as string} className="block">
                <span className="text-xs text-slate-600">
                  {f.label}
                  {f.unit ? ` (${f.unit})` : ""}
                </span>
                <input
                  type="number"
                  step="any"
                  value={form[f.key as string]}
                  onChange={(e) => update(f.key as string, e.target.value)}
                  className={`mt-1 ${inputCls} bg-white`}
                />
              </label>
            ))}
          </div>

          <label className="block">
            <span className="text-sm text-slate-600">비고</span>
            <textarea
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              className={`mt-1 min-h-[60px] ${inputCls} bg-white`}
            />
          </label>

          <div>
            <span className="text-sm text-slate-600">결과지 이미지 (선택)</span>
            <div className="mt-2 flex items-center gap-3">
              {imageKey && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetUrl(imageKey)}
                  alt=""
                  className="h-20 w-20 rounded border border-slate-200 object-cover"
                />
              )}
              <label className="cursor-pointer rounded border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-white">
                {uploading
                  ? "업로드 중..."
                  : imageKey
                    ? "이미지 변경"
                    : "+ 이미지 업로드"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onPickImage}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {imageKey && (
                <button
                  type="button"
                  onClick={() => setImageKey(null)}
                  className="text-sm text-red-600 hover:underline"
                >
                  제거
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? "등록 중..." : "등록"}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="rounded border bg-white px-4 py-6 text-center text-sm text-slate-500">
          등록된 InBody 결과가 없습니다. 병원 방문(6개월) 시 결과를 등록하세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-lg border bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-medium text-slate-800">
                  {r.measured_date}
                </span>
                <button
                  onClick={() => remove(r.id)}
                  disabled={busy === r.id}
                  className="text-xs text-red-600 hover:underline disabled:opacity-60"
                >
                  삭제
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                {FIELDS.map((f) => {
                  const v = r[f.key] as number | null | undefined;
                  return (
                    <div key={f.key as string}>
                      <p className="text-xs text-slate-500">{f.label}</p>
                      <p className="text-slate-800">
                        {v ?? "—"}
                        {v != null && f.unit ? ` ${f.unit}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
              {r.image_key && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetUrl(r.image_key)}
                  alt=""
                  className="mt-3 max-h-64 rounded border border-slate-200 object-contain"
                />
              )}
              {r.note && (
                <p className="mt-3 border-t pt-3 text-sm text-slate-600">
                  {r.note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
