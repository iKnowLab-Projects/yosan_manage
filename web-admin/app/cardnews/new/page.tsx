"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import CardNewsForm from "@/components/CardNewsForm";
import { api, CardNews, CardNewsIn } from "@/lib/api";

export default function NewCardNewsPage() {
  return (
    <AuthGuard>
      <NewCardNews />
    </AuthGuard>
  );
}

function NewCardNews() {
  const router = useRouter();

  async function create(payload: CardNewsIn) {
    await api<CardNews>("/api/v1/cardnews", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    router.push("/cardnews");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/cardnews"
          className="text-sm text-brand-600 hover:underline"
        >
          ← 카드뉴스 목록
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">새 카드뉴스</h1>
      </div>
      <CardNewsForm submitLabel="등록" onSubmit={create} />
    </div>
  );
}
