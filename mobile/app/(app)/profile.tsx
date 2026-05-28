import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { api, clearSession } from "@/lib/api";

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

  useEffect(() => {
    api<PatientMe>("/api/v1/patients/me").then(setMe).catch(() => {});
  }, []);

  async function logout() {
    await clearSession();
    router.replace("/(auth)/login");
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
    <View style={{ flex: 1, padding: 16, backgroundColor: "#f8fafc" }}>
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
      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  logout: {
    marginTop: 8,
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutText: { color: "white", fontWeight: "700" },
});
