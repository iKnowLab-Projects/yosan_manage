"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import BoardForm from "@/components/BoardForm";
import { Announcement, AnnouncementIn, api } from "@/lib/api";

export default function NewBoardPage() {
  return (
    <AuthGuard>
      <NewBoard />
    </AuthGuard>
  );
}

function NewBoard() {
  const router = useRouter();

  async function create(payload: AnnouncementIn) {
    await api<Announcement>("/api/v1/board", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    router.push("/board");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/board" className="text-sm text-brand-600 hover:underline">
          ← 공지 · FAQ 목록
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">새 글 작성</h1>
      </div>
      <BoardForm submitLabel="등록" onSubmit={create} />
    </div>
  );
}
