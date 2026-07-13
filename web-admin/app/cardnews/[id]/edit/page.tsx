"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import CardNewsForm from "@/components/CardNewsForm";
import { api, CardNews, CardNewsIn } from "@/lib/api";

export default function EditCardNewsPage() {
  return (
    <AuthGuard>
      <EditCardNews />
    </AuthGuard>
  );
}

function EditCardNews() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const router = useRouter();
  const [item, setItem] = useState<CardNews | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await api<CardNews>(`/api/v1/cardnews/${id}`);
        setItem(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "조회 실패");
      }
    })();
  }, [id]);

  async function update(payload: CardNewsIn) {
    await api<CardNews>(`/api/v1/cardnews/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    router.push("/cardnews");
  }

  if (error)
    return (
      <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
    );
  if (!item) return <p className="text-slate-500">불러오는 중...</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/cardnews"
          className="text-sm text-brand-600 hover:underline"
        >
          ← 카드뉴스 목록
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">카드뉴스 편집</h1>
      </div>
      <CardNewsForm initial={item} submitLabel="저장" onSubmit={update} />
    </div>
  );
}
