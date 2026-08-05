import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { ImageSourcePropType } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, PatientMe } from "@/lib/api";
import { logoIcon, tabIcons } from "@/lib/images";
import TutorialOverlay, {
  TutorialRect,
  TutorialStep,
} from "@/components/TutorialOverlay";

const TUTORIAL_KEY = "yosan_tutorial_seen_v1";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState<PatientMe | null>(null);

  // ===== 최초 로그인 튜토리얼 =====
  const [tutorial, setTutorial] = useState<TutorialStep[] | null>(null);
  const recordRef = useRef<any>(null);
  const mileageRef = useRef<any>(null);
  const inbodyRef = useRef<any>(null);
  const infoRef = useRef<any>(null);
  const tutorialChecked = useRef(false);

  const measure = (ref: React.RefObject<any>): Promise<TutorialRect | null> =>
    new Promise((res) => {
      const node = ref.current;
      if (!node?.measureInWindow) return res(null);
      node.measureInWindow((x: number, y: number, w: number, h: number) =>
        res({ x, y, w, h }),
      );
    });

  const startTutorial = useCallback(async () => {
    const [rec, mil, inb, inf] = await Promise.all([
      measure(recordRef),
      measure(mileageRef),
      measure(inbodyRef),
      measure(infoRef),
    ]);
    const { width: W, height: H } = Dimensions.get("window");
    const tabH = 52;
    const tabTop = H - insets.bottom - tabH;
    const tab = (idx: number): TutorialRect => ({
      x: (W / 5) * idx,
      y: tabTop,
      w: W / 5,
      h: tabH,
    });
    const filt = (arr: (TutorialRect | null)[]) =>
      arr.filter(Boolean) as TutorialRect[];
    setTutorial([
      {
        spots: filt([rec]),
        segments: [
          { t: "내 기록", hl: true },
          { t: " 버튼을 누르면 내가 시행한 " },
          { t: "설문지의 점수", hl: true },
          { t: "와 참여자들의 평균 점수를 볼 수 있습니다." },
        ],
      },
      {
        spots: filt([mil, tab(1)]),
        segments: [
          { t: "마일리지", hl: true },
          { t: " 버튼을 누르면 내가 " },
          { t: "작성한 설문지", hl: true },
          { t: "와 지금까지의 " },
          { t: "연구 진행도", hl: true },
          { t: "를 볼 수 있습니다." },
        ],
      },
      {
        spots: filt([inb, tab(2)]),
        segments: [
          { t: "인바디", hl: true },
          { t: " 버튼을 누르면 나의 " },
          { t: "요산수치와 체중, 체지방량, 근골격량, BMI 수치", hl: true },
          { t: "를 볼 수 있습니다." },
        ],
      },
      {
        spots: filt([inf, tab(3)]),
        segments: [
          { t: "정보", hl: true },
          { t: " 버튼을 누르면 통풍발작을 예방할 수 있는 다양한 " },
          { t: "영상과 카드뉴스", hl: true },
          { t: "들을 볼 수 있습니다." },
        ],
      },
      {
        spots: filt([tab(4)]),
        segments: [
          { t: "알림", hl: true },
          { t: " 버튼을 누르면 내가 " },
          { t: "잊고 보지 못했던 알림", hl: true },
          { t: "들을 모아서 볼 수 있습니다." },
        ],
      },
    ]);
  }, [insets.bottom]);

  const finishTutorial = useCallback(() => {
    setTutorial(null);
    AsyncStorage.setItem(TUTORIAL_KEY, "1").catch(() => {});
  }, []);

  // 최초 로그인(=아직 본 적 없음) 시 1회 실행
  useEffect(() => {
    if (!me || tutorialChecked.current) return;
    tutorialChecked.current = true;
    AsyncStorage.getItem(TUTORIAL_KEY).then((seen) => {
      if (!seen) setTimeout(startTutorial, 650); // 레이아웃 완료 후 측정
    });
  }, [me, startTutorial]);

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
    <>
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
          ref={recordRef}
          style={styles.historyBtn}
          onPress={() => router.push("/(app)/meal-scores")}
        >
          <Text style={styles.historyBtnText}>내 기록</Text>
        </TouchableOpacity>
      </View>

      {/* ===== 바로가기 ===== */}
      <View style={styles.shortcutRow}>
        <Shortcut
          innerRef={mileageRef}
          icon={tabIcons.mileage}
          label="마일리지"
          onPress={() => router.push("/(app)/mileage")}
        />
        <Shortcut
          innerRef={inbodyRef}
          icon={tabIcons.records}
          label="인바디"
          onPress={() => router.push("/(app)/records")}
        />
        <Shortcut
          innerRef={infoRef}
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
    {tutorial && (
      <TutorialOverlay steps={tutorial} onDone={finishTutorial} />
    )}
    </>
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
  innerRef,
}: {
  icon: ImageSourcePropType;
  label: string;
  onPress: () => void;
  innerRef?: React.Ref<any>;
}) {
  return (
    <TouchableOpacity
      ref={innerRef}
      style={styles.shortcut}
      onPress={onPress}
      activeOpacity={0.85}
    >
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
