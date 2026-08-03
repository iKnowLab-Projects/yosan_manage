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
import type { ImageSourcePropType } from "react-native";
import { api, PatientMe } from "@/lib/api";
import { logoIcon, tabIcons } from "@/lib/images";

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
        </View>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => router.push("/(app)/meal-scores")}
        >
          <Text style={styles.historyBtnText}>내 기록</Text>
        </TouchableOpacity>
      </View>

      {/* ===== 바로가기 ===== */}
      <View style={styles.shortcutRow}>
        <Shortcut
          icon={tabIcons.mileage}
          label="마일리지"
          onPress={() => router.push("/(app)/mileage")}
        />
        <Shortcut
          icon={tabIcons.records}
          label="InBody"
          onPress={() => router.push("/(app)/records")}
        />
        <Shortcut
          icon={tabIcons.info}
          label="정보"
          onPress={() => router.push("/(app)/info")}
        />
      </View>

      <Text style={styles.disclaimer}>
        본 앱은 의료기기가 아니며 정보는 참고용입니다. 의료적 판단은 전문의와 상담하세요.
      </Text>

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
  icon,
  label,
  onPress,
}: {
  icon: ImageSourcePropType;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.shortcut} onPress={onPress} activeOpacity={0.85}>
      <Image source={icon} style={styles.shortcutIcon} resizeMode="contain" />
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

  disclaimer: {
    marginTop: 16,
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 16,
  },
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
  shortcutIcon: { width: 30, height: 30, marginBottom: 6 },
  shortcutLabel: { fontSize: 13, fontWeight: "600", color: "#334155" },
});
