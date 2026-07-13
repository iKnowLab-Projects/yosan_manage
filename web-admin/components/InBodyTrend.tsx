"use client";

import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { assetUrl, InBodyResult } from "@/lib/api";

const TREND_METRICS: {
  key: keyof InBodyResult;
  title: string;
  unit: string;
  color: string;
}[] = [
  { key: "weight_kg", title: "체중", unit: "kg", color: "#2563eb" },
  { key: "percent_body_fat", title: "체지방률", unit: "%", color: "#ef4444" },
  { key: "bmi", title: "BMI", unit: "", color: "#16a34a" },
];

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

type Point = { label: string; value: number | null };

function num(r: InBodyResult, key: keyof InBodyResult): number | null {
  const v = r[key];
  return typeof v === "number" ? v : null;
}

function deltaText(cur: number | null, prev: number | null): string | null {
  if (cur == null || prev == null) return null;
  const d = Math.round((cur - prev) * 10) / 10;
  if (d === 0) return "±0";
  return d > 0 ? `▲ ${d}` : `▼ ${Math.abs(d)}`;
}

export default function InBodyTrend({ items }: { items: InBodyResult[] }) {
  // 최근 10회, 과거→현재 순
  const chrono = [...items].slice(0, 10).reverse();
  const [selIdx, setSelIdx] = useState(0);

  useEffect(() => {
    const len = Math.min(10, items.length);
    setSelIdx(len > 0 ? len - 1 : 0);
  }, [items]);

  if (chrono.length === 0) return null;

  const idx = Math.max(0, Math.min(selIdx, chrono.length - 1));
  const selected = chrono[idx];
  const prev = idx > 0 ? chrono[idx - 1] : undefined;

  const mkData = (key: keyof InBodyResult): Point[] =>
    chrono.map((r) => ({
      label: String(r.measured_date).slice(5).replace("-", "/"),
      value: num(r, key),
    }));

  return (
    <div className="space-y-4">
      {chrono.length >= 2 && (
        <div className="grid gap-4 md:grid-cols-3">
          {TREND_METRICS.map((m) => (
            <div key={m.key as string} className="rounded-lg border bg-white p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  {m.title}
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {selected && num(selected, m.key) != null
                    ? `${num(selected, m.key)}${m.unit ? ` ${m.unit}` : ""}`
                    : "—"}
                </span>
              </div>
              <MiniChart
                data={mkData(m.key)}
                color={m.color}
                selectedIndex={idx}
                onSelect={setSelIdx}
              />
            </div>
          ))}
        </div>
      )}

      {chrono.length >= 2 && (
        <p className="text-center text-xs text-slate-400">
          그래프를 클릭하거나 좌우로 드래그하면 해당 날짜의 상세가 아래에 표시됩니다.
        </p>
      )}

      {/* 선택된 날짜 세부 수치 */}
      {selected && (
        <div className="rounded-lg border-2 border-brand-100 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold text-slate-800">
              {selected.measured_date}
            </span>
            <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {idx === chrono.length - 1 ? "최근" : "선택"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            {FIELDS.map((f) => {
              const v = num(selected, f.key);
              const d = deltaText(v, prev ? num(prev, f.key) : null);
              const up = d?.startsWith("▲");
              const down = d?.startsWith("▼");
              return (
                <div key={f.key as string}>
                  <p className="text-xs text-slate-500">{f.label}</p>
                  <p className="text-slate-800">
                    {v ?? "—"}
                    {v != null && f.unit ? ` ${f.unit}` : ""}
                  </p>
                  {d && (
                    <p
                      className={
                        "text-xs " +
                        (up ? "text-red-600" : down ? "text-blue-600" : "text-slate-400")
                      }
                    >
                      {d} (직전 대비)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {selected.image_key && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(selected.image_key)}
              alt=""
              className="mt-3 max-h-64 rounded border border-slate-200 object-contain"
            />
          )}
          {selected.note && (
            <p className="mt-3 border-t pt-3 text-sm text-slate-600">
              {selected.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MiniChart({
  data,
  color,
  selectedIndex,
  onSelect,
}: {
  data: Point[];
  color: string;
  selectedIndex: number;
  onSelect: (i: number) => void;
}) {
  const VBW = 320;
  const VBH = 130;
  const padL = 30;
  const padR = 10;
  const padT = 12;
  const padB = 24;
  const plotW = VBW - padL - padR;
  const plotH = VBH - padT - padB;
  const n = data.length;

  const vals = data
    .map((d) => d.value)
    .filter((v): v is number => v !== null && v !== undefined);
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 1;
  const span = max - min || 1;
  const lo = min - span * 0.1;
  const hi = max + span * 0.1;
  const range = hi - lo || 1;

  const xAt = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (v: number) => padT + (1 - (v - lo) / range) * plotH;

  const pts = data
    .map((d, i) =>
      d.value !== null && d.value !== undefined
        ? { i, x: xAt(i), y: yAt(d.value), v: d.value }
        : null,
    )
    .filter((p): p is { i: number; x: number; y: number; v: number } => p !== null);

  const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const selVal =
    selectedIndex >= 0 && selectedIndex < n ? data[selectedIndex].value : null;

  const ref = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  function pick(clientX: number) {
    const el = ref.current;
    if (!el || n <= 1) {
      if (n === 1) onSelect(0);
      return;
    }
    const rect = el.getBoundingClientRect();
    const xv = ((clientX - rect.left) / rect.width) * VBW;
    let i = Math.round(((xv - padL) / (plotW || 1)) * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    onSelect(i);
  }

  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pick(e.clientX);
  };
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (dragging.current) pick(e.clientX);
  };
  const stop = () => {
    dragging.current = false;
  };

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${VBW} ${VBH}`}
      className="w-full cursor-pointer touch-none select-none"
      style={{ height: 130 }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={stop}
      onPointerLeave={stop}
    >
      <line x1={padL} x2={VBW - padR} y1={yAt(max)} y2={yAt(max)} stroke="#eef2f7" />
      <line x1={padL} x2={VBW - padR} y1={yAt(min)} y2={yAt(min)} stroke="#eef2f7" />
      <text x={padL - 4} y={yAt(max) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
        {max.toFixed(1)}
      </text>
      <text x={padL - 4} y={yAt(min) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
        {min.toFixed(1)}
      </text>

      {selectedIndex >= 0 && selectedIndex < n && (
        <line
          x1={xAt(selectedIndex)}
          x2={xAt(selectedIndex)}
          y1={padT}
          y2={padT + plotH}
          stroke="#cbd5e1"
          strokeDasharray="3 3"
        />
      )}

      {poly && <polyline points={poly} fill="none" stroke={color} strokeWidth="2" />}
      {pts.map((p) => (
        <circle key={p.i} cx={p.x} cy={p.y} r="3" fill={color} stroke="#fff" strokeWidth="1" />
      ))}
      {selVal != null && (
        <circle
          cx={xAt(selectedIndex)}
          cy={yAt(selVal)}
          r="5"
          fill="#fff"
          stroke={color}
          strokeWidth="2.5"
        />
      )}

      {data.map((d, i) =>
        i === 0 || i === n - 1 || i === selectedIndex ? (
          <text
            key={i}
            x={xAt(i)}
            y={VBH - 6}
            textAnchor="middle"
            fontSize="9"
            fill={i === selectedIndex ? color : "#94a3b8"}
          >
            {d.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
