import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, PatientMe } from "@/lib/api";
import { logoIcon } from "@/lib/images";

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState<PatientMe | null>(null);

  const load = useCallback(async () => {
    try {
      const meRes = await api<PatientMe>("/api/v1/patients/me").catch(() => null);
      setMe(meRes);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 탭 진입 시마다 최신화
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const p = me?.profile ?? {};

  return (
    <ScrollView
      style={{ backgroundColor: "#f8fafc" }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* ===== 헤더 / 인사 ===== */}
      <View style={styles.header}>
        <Image source={logoIcon} style={styles.logo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>
            안녕하세요,{" "}
            <Text style={{ fontWeight: "800" }}>{me?.name ?? "회원"}</Text>님
          </Text>
          <Text style={styles.helloSub}>오늘도 건강한 하루 되세요 🌿</Text>
        </View>
      </View>

      {/* ===== 내 정보 요약 ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>내 정보</Text>
          <TouchableOpacity onPress={() => router.push("/(app)/profile")}>
            <Text style={styles.more}>상세 보기 ›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.infoGrid}>
          <InfoCell
            label="기준 체중"
            value={p.baseline_weight_kg ? `${p.baseline_weight_kg} kg` : "—"}
          />
          <InfoCell
            label="기준 요산"
            value={p.baseline_uric_acid ? `${p.baseline_uric_acid} mg/dL` : "—"}
          />
          <InfoCell
            label="신장"
            value={p.height_cm ? `${p.height_cm} cm` : "—"}
          />
          <InfoCell
            label="설문 그룹"
            value={p.survey_group ? `${p.survey_group}군` : "—"}
          />
        </View>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => router.push("/(app)/history")}
        >
          <Text style={styles.historyBtnText}>일일 보고 기록 보기</Text>
        </TouchableOpacity>
      </View>

      {/* ===== 바로가기 ===== */}
      <View style={styles.shortcutRow}>
        <Shortcut
          emoji="🏅"
          label="마일리지"
          onPress={() => router.push("/(app)/mileage")}
        />
        <Shortcut
          emoji="🧍"
          label="내 기록"
          onPress={() => router.push("/(app)/records")}
        />
        <Shortcut
          emoji="📰"
          label="정보"
          onPress={() => router.push("/(app)/info")}
        />
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Shortcut({
  emoji,
  label,
  onPress,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.shortcut} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.shortcutEmoji}>{emoji}</Text>
      <Text style={styles.shortcutLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  logo: { width: 44, height: 44 },
  hello: { fontSize: 17, color: "#0f172a" },
  helloSub: { fontSize: 13, color: "#64748b", marginTop: 2 },
  section: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  more: { color: "#2563eb", fontWeight: "600", fontSize: 13 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap" },
  infoCell: {
    width: "50%",
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 12, color: "#94a3b8", marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  historyBtn: {
    marginTop: 8,
    backgroundColor: "#eff6ff",
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
  },
  historyBtnText: { color: "#2563eb", fontWeight: "700" },

  shortcutRow: { flexDirection: "row", gap: 12 },
  shortcut: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 18,
    alignItems: "center",
  },
  shortcutEmoji: { fontSize: 26, marginBottom: 6 },
  shortcutLabel: { fontSize: 13, fontWeight: "600", color: "#334155" },
});
