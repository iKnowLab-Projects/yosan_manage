"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

type PasswordResetRequest = {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  note?: string | null;
  requested_at: string;
};

export default function PasswordResetsPage() {
  return (
    <AuthGuard>
      <View />
    </AuthGuard>
  );
}

function View() {
  const [items, setItems] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api<PasswordResetRequest[]>(
        "/api/v1/auth/password-reset/pending",
      );
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">비밀번호 초기화</h1>
          <p className="mt-1 text-sm text-slate-500">
            환자가 신청한 비밀번호 초기화를 본인 확인 후 승인/거절합니다.
            승인 즉시 새 비밀번호로 전환됩니다.
          </p>
        </div>
        <p className="text-sm text-slate-500">대기 {items.length}건</p>
      </div>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-slate-500">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border bg-white px-4 py-8 text-center text-slate-500">
          대기 중인 비밀번호 초기화 신청이 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <Row key={r.id} item={r} onAction={load} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({
  item,
  onAction,
}: {
  item: PasswordResetRequest;
  onAction: () => void;
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function approve() {
    if (
      !confirm(
        `${item.user_name} (${item.user_email}) 의 비밀번호 초기화를 승인하시겠습니까?\n승인 즉시 새 비밀번호로 전환됩니다.`,
      )
    )
      return;
    setBusy("approve");
    setErr(null);
    try {
      await api(`/api/v1/auth/password-reset/${item.id}/approve`, {
        method: "POST",
      });
      onAction();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "승인 실패");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (
      !confirm(`${item.user_name} 의 초기화 신청을 거절하시겠습니까?`)
    )
      return;
    setBusy("reject");
    setErr(null);
    try {
      await api(`/api/v1/auth/password-reset/${item.id}`, {
        method: "DELETE",
      });
      onAction();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "거절 실패");
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="rounded-lg border bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">{item.user_name}</p>
          <p className="text-sm text-slate-600">{item.user_email}</p>
          <p className="mt-1 text-xs text-slate-400">
            신청 {new Date(item.requested_at).toLocaleString("ko-KR")}
          </p>
          {item.note && (
            <div className="mt-3 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-600">사유: </span>
              {item.note}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={approve}
            disabled={busy !== null}
            className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy === "approve" ? "승인 중..." : "승인"}
          </button>
          <button
            onClick={reject}
            disabled={busy !== null}
            className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {busy === "reject" ? "처리 중..." : "거절"}
          </button>
        </div>
      </div>
      {err && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </p>
      )}
      <p className="mt-3 border-t pt-3 text-xs text-slate-500">
        ⚠️ 승인 전 반드시 본인 확인 (전화 / SMS 인증 등) 을 수행하세요.
        악의적 신청을 승인하면 계정이 탈취됩니다.
      </p>
    </li>
  );
}
