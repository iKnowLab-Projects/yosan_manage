import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, clearSession } from "@/lib/api";
import FontSizeControl from "@/components/FontSizeControl";

// GitHub Pages(저장소 /docs)로 호스팅되는 정책 문서. Pages 활성화 후 접속 가능.
const PRIVACY_URL =
  "https://iknowlab-projects.github.io/yosan_manage/privacy.html";
const TERMS_URL = "https://iknowlab-projects.github.io/yosan_manage/terms.html";
const MEDICAL_DISCLAIMER =
  "본 앱은 의료기기가 아니며, 제공되는 정보와 마일리지는 건강관리 참고용입니다. " +
  "진단·치료 등 의료적 판단은 반드시 전문의와 상담하세요.";

type PatientMe = {
  id: number;
  email: string;
  name: string;
  profile: {
    phone?: string | null;
    birth_date?: string | null;
    height_cm?: number | null;
    baseline_weight_kg?: number | null;
    baseline_uric_acid?: number | null;
    medications?: string | null;
  } | null;
};

export default function Profile() {
  const router = useRouter();
  const [me, setMe] = useState<PatientMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    api<PatientMe>("/api/v1/patients/me")
      .then(setMe)
      .catch((err: any) => setError(err?.message ?? "조회 실패"));
  };

  useEffect(() => {
    load();
  }, []);

  async function logout() {
    await clearSession();
    router.replace("/(auth)/login");
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "회원 탈퇴",
      "탈퇴하면 계정과 모든 데이터(보고·설문·마일리지·InBody·알림 등)가 " +
        "영구 삭제되며 복구할 수 없습니다.\n\n정말 탈퇴하시겠어요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴",
          style: "destructive",
          onPress: async () => {
            try {
              await api("/api/v1/auth/me", { method: "DELETE" });
              await clearSession();
              router.replace("/(auth)/login");
            } catch (e: any) {
              Alert.alert("탈퇴 실패", e?.message ?? "오류가 발생했습니다.");
            }
          },
        },
      ],
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>내 정보를 불러올 수 없습니다</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.logout, { marginTop: 12 }]}
          onPress={logout}
        >
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!me) {
    return (
      <View style={styles.center}>
        <Text>불러오는 중...</Text>
      </View>
    );
  }

  const p = me.profile ?? {};
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <View style={styles.card}>
        <Text style={styles.name}>{me.name}</Text>
        <Text style={styles.email}>{me.email}</Text>
      </View>
      <View style={styles.card}>
        <Row label="전화번호" value={p.phone ?? "—"} />
        <Row label="생년월일" value={p.birth_date ?? "—"} />
        <Row label="신장" value={p.height_cm ? `${p.height_cm} cm` : "—"} />
        <Row
          label="기준 체중"
          value={p.baseline_weight_kg ? `${p.baseline_weight_kg} kg` : "—"}
        />
        <Row
          label="기준 요산"
          value={p.baseline_uric_acid ? `${p.baseline_uric_acid} mg/dL` : "—"}
        />
        <Row label="복용 약물" value={p.medications ?? "—"} />
      </View>
      <TouchableOpacity
        style={styles.historyBtn}
        onPress={() => router.push("/(app)/meal-scores")}
      >
        <Text style={styles.historyBtnText}>내 기록</Text>
      </TouchableOpacity>

      {/* 화면 설정 · 글씨 크기 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>글씨 크기</Text>
        <FontSizeControl />
      </View>

      {/* 약관 및 정책 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>약관 및 정책</Text>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL(PRIVACY_URL)}
        >
          <Text style={styles.linkText}>개인정보 처리방침</Text>
          <Text style={styles.linkChevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.linkRow, { borderBottomWidth: 0 }]}
          onPress={() => Linking.openURL(TERMS_URL)}
        >
          <Text style={styles.linkText}>이용약관</Text>
          <Text style={styles.linkChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 의료 면책 고지 */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerTitle}>의료 면책 고지</Text>
        <Text style={styles.disclaimerText}>{MEDICAL_DISCLAIMER}</Text>
      </View>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={confirmDeleteAccount}>
        <Text style={styles.deleteText}>회원 탈퇴</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: { fontWeight: "700", color: "#991b1b", marginBottom: 6 },
  errorBody: {
    color: "#475569",
    textAlign: "center",
    marginBottom: 12,
    fontSize: 13,
  },
  retry: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: "white", fontWeight: "600" },
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: "700", color: "#1e293b" },
  email: { color: "#64748b", marginTop: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  label: { color: "#64748b" },
  value: { color: "#0f172a", fontWeight: "500" },
  historyBtn: {
    backgroundColor: "#eff6ff",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  historyBtnText: { color: "#2563eb", fontWeight: "700" },
  logout: {
    marginTop: 8,
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutText: { color: "white", fontWeight: "700" },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 4,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  linkText: { color: "#334155", fontSize: 14 },
  linkChevron: { color: "#cbd5e1", fontSize: 18 },
  disclaimer: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 4,
  },
  disclaimerText: { fontSize: 12, color: "#94a3b8", lineHeight: 18 },
  deleteBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteText: {
    color: "#94a3b8",
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
