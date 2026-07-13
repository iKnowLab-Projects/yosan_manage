"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { Announcement, api } from "@/lib/api";

const CATEGORY_LABEL: Record<string, string> = { notice: "공지", faq: "FAQ" };

export default function BoardListPage() {
  return (
    <AuthGuard>
      <BoardList />
    </AuthGuard>
  );
}

function BoardList() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "notice" | "faq">("all");

  async function load() {
    try {
      const data = await api<Announcement[]>(
        "/api/v1/board?include_unpublished=true&limit=100"
      );
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 실패");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const shown = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.category === filter)),
    [items, filter]
  );

  async function remove(id: number) {
    if (!window.confirm("이 게시글을 삭제할까요?")) return;
    setBusy(id);
    try {
      await api(`/api/v1/board/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">공지 · FAQ 관리</h1>
        <Link
          href="/board/new"
          className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + 새 글
        </Link>
      </div>

      <div className="flex gap-2">
        {(["all", "notice", "faq"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded border px-3 py-1 text-sm " +
              (filter === f
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "hover:bg-slate-50")
            }
          >
            {f === "all" ? "전체" : CATEGORY_LABEL[f]}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="rounded-lg border bg-white px-4 py-8 text-center text-slate-500">
          등록된 게시글이 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-4 rounded-lg border bg-white p-4"
            >
              <span
                className={
                  "flex-shrink-0 rounded px-2 py-0.5 text-xs font-semibold " +
                  (c.category === "faq"
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-amber-100 text-amber-700")
                }
              >
                {CATEGORY_LABEL[c.category] ?? c.category}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {c.is_pinned && <span title="상단 고정">📌</span>}
                  <span className="truncate font-medium text-slate-800">
                    {c.title}
                  </span>
                  {!c.is_published && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      미게시
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-slate-500">{c.body}</p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <Link
                  href={`/board/${c.id}/edit`}
                  className="rounded border px-3 py-1 text-sm hover:bg-slate-50"
                >
                  편집
                </Link>
                <button
                  onClick={() => remove(c.id)}
                  disabled={busy === c.id}
                  className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
