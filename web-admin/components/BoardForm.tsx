"use client";

import { FormEvent, useState } from "react";
import { Announcement, AnnouncementIn } from "@/lib/api";

const inputCls =
  "w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500";

export default function BoardForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Announcement;
  submitLabel: string;
  onSubmit: (payload: AnnouncementIn) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "notice");
  const [body, setBody] = useState(initial?.body ?? "");
  const [isPinned, setIsPinned] = useState(initial?.is_pinned ?? false);
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (!body.trim()) {
      setError("내용을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        body: body.trim(),
        category,
        is_pinned: isPinned,
        is_published: isPublished,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid grid-cols-[120px_1fr] gap-4">
        <label className="block">
          <span className="text-sm text-slate-600">분류</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`mt-1 ${inputCls}`}
          >
            <option value="notice">공지</option>
            <option value="faq">FAQ</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">
            제목 <span className="text-danger">*</span>
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`mt-1 ${inputCls}`}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm text-slate-600">
          내용 <span className="text-danger">*</span>
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={`mt-1 min-h-[180px] ${inputCls}`}
        />
      </label>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
          />
          상단 고정
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          게시(환자 앱에 노출)
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "저장 중..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
