"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { api, assetUrl, CardNews } from "@/lib/api";

export default function CardNewsListPage() {
  return (
    <AuthGuard>
      <CardNewsList />
    </AuthGuard>
  );
}

function CardNewsList() {
  const [items, setItems] = useState<CardNews[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    try {
      const data = await api<CardNews[]>(
        "/api/v1/cardnews?include_unpublished=true&limit=100"
      );
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 실패");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: number) {
    if (!window.confirm("이 카드뉴스를 삭제할까요?")) return;
    setBusy(id);
    try {
      await api(`/api/v1/cardnews/${id}`, { method: "DELETE" });
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
        <h1 className="text-2xl font-semibold">카드뉴스 관리</h1>
        <Link
          href="/cardnews/new"
          className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + 새 카드뉴스
        </Link>
      </div>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-lg border bg-white px-4 py-8 text-center text-slate-500">
          등록된 카드뉴스가 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-4 rounded-lg border bg-white p-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(c.image_key)}
                alt=""
                className="h-16 w-16 flex-shrink-0 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-800">
                    {c.title}
                  </span>
                  {!c.is_published && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      미게시
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-slate-500">
                  {c.author ? `${c.author} · ` : ""}
                  순서 {c.display_order} · 이미지 {c.images?.length ?? 0}장
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <Link
                  href={`/cardnews/${c.id}/edit`}
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
