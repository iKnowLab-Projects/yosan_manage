import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, MileageMonth, MileageSummary } from "@/lib/api";

const CYCLE = 6;
const ADMIN_PHONE = "010-XXXX-XXXX";

export default function MileageScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<MileageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cycleIdx, setCycleIdx] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<MileageSummary>("/api/v1/mileage/me");
      setSummary(data);
      const firstIncomplete = data.months.find((m) => !m.completed);
      if (firstIncomplete) {
        setCycleIdx(Math.floor((firstIncomplete.month_index - 1) / CYCLE));
      } else {
        setCycleIdx(Math.floor((data.total_months - 1) / CYCLE));
      }
    } catch (err: any) {
      setError(err?.message ?? "마일리지 조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  // 설문 작성 후 돌아왔을 때 등, 화면에 들어올 때마다 최신 완료 현황 반영
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const cycles = useMemo<MileageMonth[][]>(() => {
    if (!summary) return [];
    const arr: MileageMonth[][] = [];
    for (let i = 0; i < summary.months.length; i += CYCLE) {
      arr.push(summary.months.slice(i, i + CYCLE));
    }
    return arr;
  }, [summary]);

  const currentMonthIndex = useMemo(() => {
    if (!summary) return null;
    const first = summary.months.find((m) => !m.completed);
    return first?.month_index ?? null;
  }, [summary]);

  const onPressCompleted = useCallback(
    (m: MileageMonth) => {
      if (m.survey_submission_id) {
        router.push({
          pathname: "/(app)/survey-view",
          params: { id: String(m.survey_submission_id) },
        });
      } else {
        Alert.alert(
          "완료된 미션",
          "이 달은 설문 없이 완료 처리되어 열람할 설문 응답이 없습니다.",
        );
      }
    },
    [router],
  );

  const onPressTarget = useCallback(() => {
    Alert.alert(
      "이번 달 미션",
      "한 달에 한 번 진행해요.\n어떻게 보고하시겠어요?",
      [
        {
          text: "전화 연결",
          onPress: () => {
            const digits = ADMIN_PHONE.replace(/[^0-9]/g, "");
            if (!digits || digits.includes("X")) {
              Alert.alert(
                "전화번호 미설정",
                "관리자 연락처가 아직 설정되지 않았습니다.\n관리자에게 문의해 주세요.",
              );
              return;
            }
            Linking.openURL(`tel:${digits}`).catch(() => {
              Alert.alert(
                "전화 연결 실패",
                "이 기기에서 전화를 걸 수 없습니다.",
              );
            });
          },
        },
        {
          text: "설문 작성",
          onPress: () => router.push("/(app)/survey"),
        },
        { text: "취소", style: "cancel" },
      ],
    );
  }, [router]);

  if (loading && !summary) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !summary) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>마일리지를 불러올 수 없습니다</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  const currentCycle = cycles[cycleIdx] ?? [];
  const earnedInCycle = currentCycle.filter((m) => m.completed).length;
  const targetInThisCycle =
    currentMonthIndex !== null &&
    Math.floor((currentMonthIndex - 1) / CYCLE) === cycleIdx;
  const canPrev = cycleIdx > 0;
  const canNext = cycleIdx < cycles.length - 1;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={styles.headerCard}>
        <Text style={styles.label}>마일리지 진행</Text>
        <Text style={styles.amount}>
          {summary.completed_count}
          <Text style={styles.amountMax}> / {summary.total_months}월차</Text>
        </Text>
        <View style={styles.metaRow}>
          <Meta
            label="완료한 사이클"
            value={`${summary.cycles_completed} / ${cycles.length}`}
          />
        </View>
      </View>

      <View style={styles.legend}>
        <LegendDot variant="small" label="매월 미션" />
        <LegendDot variant="big" label="6개월 병원 방문" />
        <LegendDot variant="current" label="진행할 미션" />
      </View>

      <View style={styles.cycleNav}>
        <Pressable
          onPress={() => setCycleIdx((i) => Math.max(0, i - 1))}
          disabled={!canPrev}
          style={[styles.navBtn, !canPrev && styles.navBtnDisabled]}
        >
          <Text
            style={[
              styles.navBtnText,
              !canPrev && styles.navBtnTextDisabled,
            ]}
          >
            ←
          </Text>
        </Pressable>
        <Text style={styles.cycleTitle}>{cycleIdx + 1}번째 사이클</Text>
        <Pressable
          onPress={() =>
            setCycleIdx((i) => Math.min(cycles.length - 1, i + 1))
          }
          disabled={!canNext}
          style={[styles.navBtn, !canNext && styles.navBtnDisabled]}
        >
          <Text
            style={[
              styles.navBtnText,
              !canNext && styles.navBtnTextDisabled,
            ]}
          >
            →
          </Text>
        </Pressable>
      </View>

      <View style={styles.cycleCard}>
        <View style={styles.cycleHeader}>
          <Text style={styles.cycleProgress}>
            {earnedInCycle} / {currentCycle.length} 완료
          </Text>
        </View>
        <View style={styles.row}>
          {currentCycle.map((m) => (
            <Circle
              key={m.month_index}
              month={m}
              isCurrent={m.month_index === currentMonthIndex}
              onPressCurrent={onPressTarget}
              onPressCompleted={() => onPressCompleted(m)}
            />
          ))}
        </View>
      </View>

      <Text style={styles.tapHint}>
        완료(✓)된 달을 누르면 그 달에 제출한 설문을 볼 수 있어요.
      </Text>

      {targetInThisCycle && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            ▶ 표시된 이번 달 미션을 눌러 시작하세요
          </Text>
          <Text style={styles.hintSub}>
            미션은 매월 1회만 진행됩니다.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function Circle({
  month,
  isCurrent,
  onPressCurrent,
  onPressCompleted,
}: {
  month: MileageMonth;
  isCurrent: boolean;
  onPressCurrent: () => void;
  onPressCompleted: () => void;
}) {
  const big = month.is_hospital_visit;
  const completed = month.completed;
  const showCurrent = isCurrent && !completed;

  const inner = (
    <View
      style={[
        big ? styles.bigCircle : styles.smallCircle,
        completed && (big ? styles.bigFilled : styles.smallFilled),
        showCurrent && styles.currentCircle,
      ]}
    >
      {completed ? (
        <Text style={[styles.checkText, big && { fontSize: 22 }]}>✓</Text>
      ) : showCurrent ? (
        <Text style={[styles.currentText, big && { fontSize: 22 }]}>▶</Text>
      ) : null}
    </View>
  );

  const label = (
    <Text style={[styles.cellMonth, showCurrent && styles.currentMonthLabel]}>
      {month.month_index}월차
    </Text>
  );

  if (showCurrent) {
    return (
      <Pressable
        onPress={onPressCurrent}
        style={styles.cell}
        hitSlop={8}
      >
        {inner}
        {label}
      </Pressable>
    );
  }
  // 완료된 달은 눌러서 해당 월 설문 응답을 열람할 수 있다.
  if (completed) {
    return (
      <Pressable onPress={onPressCompleted} style={styles.cell} hitSlop={8}>
        {inner}
        {label}
      </Pressable>
    );
  }
  return (
    <View style={styles.cell}>
      {inner}
      {label}
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function LegendDot({
  variant,
  label,
}: {
  variant: "small" | "big" | "current";
  label: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          variant === "big" ? styles.bigCircle : styles.smallCircle,
          variant === "current" && styles.currentCircle,
          {
            transform: [{ scale: variant === "small" ? 0.5 : 0.45 }],
            marginRight: 4,
          },
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 60, backgroundColor: "#f8fafc" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: { fontWeight: "700", color: "#991b1b", marginBottom: 6 },
  errorBody: { color: "#475569", textAlign: "center" },

  headerCard: {
    backgroundColor: "#1d4ed8",
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
  },
  label: { color: "#bfdbfe", fontSize: 13 },
  amount: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 12,
  },
  amountMax: { fontSize: 14, color: "#bfdbfe", fontWeight: "600" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  metaLabel: { color: "#bfdbfe", fontSize: 12 },
  metaValue: { color: "white", fontSize: 16, fontWeight: "700", marginTop: 2 },

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 14,
    paddingLeft: 6,
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendText: { color: "#475569", fontSize: 12 },

  cycleNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  navBtnText: {
    fontSize: 20,
    color: "#1e293b",
    fontWeight: "700",
  },
  navBtnTextDisabled: { color: "#94a3b8" },
  cycleTitle: { fontWeight: "700", color: "#0f172a", fontSize: 16 },

  cycleCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cycleHeader: {
    alignItems: "flex-end",
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  cycleProgress: { color: "#64748b", fontSize: 12 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cell: { alignItems: "center", flex: 1 },
  smallCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  smallFilled: {
    backgroundColor: "#2563eb",
    borderColor: "#1d4ed8",
  },
  bigCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  bigFilled: {
    backgroundColor: "#f59e0b",
    borderColor: "#b45309",
  },
  currentCircle: {
    borderColor: "#16a34a",
    backgroundColor: "#dcfce7",
    borderStyle: "dashed",
    opacity: 0.95,
  },
  checkText: { color: "white", fontWeight: "800", fontSize: 16 },
  currentText: { color: "#15803d", fontWeight: "800", fontSize: 16 },
  cellMonth: { fontSize: 10, color: "#475569", marginTop: 4 },
  currentMonthLabel: { color: "#15803d", fontWeight: "700" },

  tapHint: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
  },
  hint: {
    marginTop: 4,
    padding: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  hintText: {
    color: "#15803d",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },
  hintSub: {
    color: "#15803d",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    opacity: 0.8,
  },
});
