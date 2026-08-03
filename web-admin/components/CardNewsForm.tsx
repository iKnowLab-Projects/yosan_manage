"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import {
  assetUrl,
  CardNews,
  CardNewsIn,
  TARGET_GROUP_OPTIONS,
  uploadFile,
} from "@/lib/api";

const inputCls =
  "w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500";

export default function CardNewsForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: CardNews;
  submitLabel: string;
  onSubmit: (payload: CardNewsIn) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [linkUrl, setLinkUrl] = useState(initial?.link_url ?? "");
  const [displayOrder, setDisplayOrder] = useState(
    String(initial?.display_order ?? 0)
  );
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);
  const [targetGroup, setTargetGroup] = useState(
    initial?.target_group ?? "common"
  );
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [videoKey, setVideoKey] = useState<string | null>(
    initial?.video_key ?? null
  );
  const [videoUploading, setVideoUploading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPickFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const f of files) {
        const { key } = await uploadFile(f);
        uploaded.push(key);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      e.target.value = ""; // 같은 파일 다시 선택 가능하도록 초기화
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function makeThumbnail(idx: number) {
    setImages((prev) => {
      const next = [...prev];
      const [picked] = next.splice(idx, 1);
      next.unshift(picked);
      return next;
    });
  }

  async function onPickVideo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoUploading(true);
    setError(null);
    try {
      const { key } = await uploadFile(file);
      setVideoKey(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "동영상 업로드 실패");
    } finally {
      setVideoUploading(false);
      e.target.value = "";
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (images.length === 0 && !videoKey) {
      setError("이미지 또는 동영상 중 하나 이상 등록해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        author: author.trim() || null,
        summary: summary.trim() || null,
        body: body.trim() || null,
        image_key: images[0] ?? "", // 동영상만 있는 카드는 대표 이미지 없음
        images,
        video_key: videoKey,
        link_url: linkUrl.trim() || null,
        target_group: targetGroup,
        display_order: Number(displayOrder) || 0,
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

      <div className="grid grid-cols-3 gap-4">
        <label className="block">
          <span className="text-sm text-slate-600">게시자</span>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="예: 요산 관리팀"
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">노출 대상</span>
          <select
            value={targetGroup}
            onChange={(e) => setTargetGroup(e.target.value)}
            className={`mt-1 ${inputCls}`}
          >
            {TARGET_GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">노출 순서</span>
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            className={`mt-1 ${inputCls}`}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm text-slate-600">요약</span>
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className={`mt-1 ${inputCls}`}
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-600">본문</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={`mt-1 min-h-[140px] ${inputCls}`}
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-600">링크 URL (선택)</span>
        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://..."
          className={`mt-1 ${inputCls}`}
        />
      </label>

      {/* 이미지 업로드 */}
      <div>
        <span className="text-sm text-slate-600">
          이미지
          <span className="ml-1 text-xs text-slate-400">
            (첫 번째가 대표 썸네일 · 동영상만 등록할 경우 이미지는 생략 가능)
          </span>
        </span>
        <div className="mt-2 flex flex-wrap gap-3">
          {images.map((key, idx) => (
            <div
              key={`${key}-${idx}`}
              className="relative h-28 w-28 overflow-hidden rounded border border-slate-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(key)}
                alt=""
                className="h-full w-full object-cover"
              />
              {idx === 0 && (
                <span className="absolute left-1 top-1 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  대표
                </span>
              )}
              <div className="absolute bottom-0 flex w-full justify-between bg-black/40 px-1 py-0.5">
                {idx !== 0 ? (
                  <button
                    type="button"
                    onClick={() => makeThumbnail(idx)}
                    className="text-[10px] text-white hover:underline"
                  >
                    대표로
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="text-[10px] text-white hover:underline"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
          <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-slate-300 text-center text-xs text-slate-500 hover:bg-slate-50">
            {uploading ? "업로드 중..." : "+ 이미지 추가"}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onPickFiles}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* 동영상 (선택) */}
      <div>
        <span className="text-sm text-slate-600">
          동영상 (선택)
          <span className="ml-1 text-xs text-slate-400">
            (mp4/mov/webm, 최대 100MB)
          </span>
        </span>
        <div className="mt-2 flex items-center gap-3">
          {videoKey && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={assetUrl(videoKey)}
              controls
              className="h-28 rounded border border-slate-200 bg-black"
            />
          )}
          <label className="cursor-pointer rounded border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
            {videoUploading
              ? "업로드 중..."
              : videoKey
                ? "동영상 변경"
                : "+ 동영상 업로드"}
            <input
              type="file"
              accept="video/*"
              onChange={onPickVideo}
              className="hidden"
              disabled={videoUploading}
            />
          </label>
          {videoKey && (
            <button
              type="button"
              onClick={() => setVideoKey(null)}
              className="text-sm text-red-600 hover:underline"
            >
              제거
            </button>
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
        />
        게시(환자 앱에 노출)
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting || uploading || videoUploading}
          className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "저장 중..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
