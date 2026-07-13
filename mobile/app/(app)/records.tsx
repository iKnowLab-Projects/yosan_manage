import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, InBodyResult } from "@/lib/api";
import { resolveImage } from "@/lib/images";
import LineChart, { ChartPoint } from "@/components/LineChart";

// 추이 그래프로 보여줄 지표 (체중·체지방률·BMI)
const TREND_METRICS: {
  key: keyof InBodyResult;
  title: string;
  unit: string;
  color: string;
}[] = [
  { key: "weight_kg", title: "체중", unit: "kg", color: "#2563eb" },
  { key: "percent_body_fat", title: "체지방률", unit: "%", color: "#ef4444" },
  { key: "bmi", title: "BMI", unit: "", color: "#16a34a" },
];

// 표시할 InBody 수치 항목 정의 (단위 포함)
const METRICS: {
  key: keyof InBodyResult;
  label: string;
  unit: string;
  // 증감 방향 해석(추이 표시용): 좋아지는 방향이 감소인지 증가인지
}[] = [
  { key: "weight_kg", label: "체중", unit: "kg" },
  { key: "skeletal_muscle_mass", label: "골격근량", unit: "kg" },
  { key: "body_fat_mass", label: "체지방량", unit: "kg" },
  { key: "percent_body_fat", label: "체지방률", unit: "%" },
  { key: "bmi", label: "BMI", unit: "" },
  { key: "basal_metabolic_rate", label: "기초대사량", unit: "kcal" },
  { key: "total_body_water", label: "체수분", unit: "L" },
  { key: "inbody_score", label: "InBody 점수", unit: "점" },
];

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return String(v);
}

function delta(
  cur: number | null | undefined,
  prev: number | null | undefined,
): string | null {
  if (cur == null || prev == null) return null;
  const d = Math.round((cur - prev) * 10) / 10;
  if (d === 0) return "±0";
  return d > 0 ? `▲ ${d}` : `▼ ${Math.abs(d)}`;
}

export default function RecordsScreen() {
  const [items, setItems] = useState<InBodyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<InBodyResult[]>("/api/v1/inbody/me").catch(() => []);
      setItems(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // 최근 10회를 과거→현재 순으로 (그래프는 왼쪽이 과거)
  const chrono = [...items].slice(0, 10).reverse();
  const mkData = (key: keyof InBodyResult): ChartPoint[] =>
    chrono.map((r) => ({
      label: String(r.measured_date).slice(5).replace("-", "/"), // MM/DD
      value: (r[key] as number | null | undefined) ?? null,
    }));
  const latestVal = (key: keyof InBodyResult): number | null => {
    const found = items.find((r) => (r[key] as number | null | undefined) != null);
    return found ? (found[key] as number) : null;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: "#f8fafc" }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          InBody(체성분) 결과는 병원 방문(6개월) 시 담당 연구원이 등록합니다.
          {"\n"}여기에서 나의 결과와 변화를 확인할 수 있어요.
        </Text>
      </View>

      {/* ===== 추이 그래프 (체중·체지방률·BMI) ===== */}
      {items.length >= 2 && (
        <View style={styles.trendSection}>
          <Text style={styles.trendHeading}>추이 (최근 {chrono.length}회)</Text>
          {TREND_METRICS.map((m) => (
            <MetricChart
              key={m.key as string}
              title={m.title}
              unit={m.unit}
              color={m.color}
              latest={latestVal(m.key)}
              data={mkData(m.key)}
            />
          ))}
        </View>
      )}

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🧍</Text>
          <Text style={styles.emptyTitle}>아직 등록된 InBody 결과가 없습니다</Text>
          <Text style={styles.emptyBody}>
            다음 병원 방문 시 측정 결과가 등록됩니다.
          </Text>
        </View>
      ) : (
        items.map((r, idx) => {
          const prev = items[idx + 1]; // 목록은 최신순이므로 다음 항목이 이전 측정
          const isLatest = idx === 0;
          return (
            <View
              key={r.id}
              style={[styles.card, isLatest && styles.cardLatest]}
            >
              <View style={styles.cardHead}>
                <Text style={styles.date}>{r.measured_date}</Text>
                {isLatest && (
                  <View style={styles.latestBadge}>
                    <Text style={styles.latestBadgeText}>최근</Text>
                  </View>
                )}
              </View>

              <View style={styles.grid}>
                {METRICS.map((m) => {
                  const val = r[m.key] as number | null | undefined;
                  const d = isLatest
                    ? delta(val, prev?.[m.key] as number | null | undefined)
                    : null;
                  return (
                    <View key={m.key as string} style={styles.metric}>
                      <Text style={styles.metricLabel}>{m.label}</Text>
                      <Text style={styles.metricValue}>
                        {fmt(val)}
                        {val != null && m.unit ? (
                          <Text style={styles.metricUnit}> {m.unit}</Text>
                        ) : null}
                      </Text>
                      {d && (
                        <Text
                          style={[
                            styles.metricDelta,
                            d.startsWith("▲") && styles.deltaUp,
                            d.startsWith("▼") && styles.deltaDown,
                          ]}
                        >
                          {d} (직전 대비)
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>

              {!!r.image_key && (
                <Image
                  source={resolveImage(r.image_key)}
                  style={styles.sheet}
                  resizeMode="contain"
                />
              )}

              {!!r.note && <Text style={styles.note}>{r.note}</Text>}
            </View>
          );
        })
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function MetricChart({
  title,
  unit,
  color,
  latest,
  data,
}: {
  title: string;
  unit: string;
  color: string;
  latest: number | null;
  data: ChartPoint[];
}) {
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHead}>
        <View style={[styles.chartDot, { backgroundColor: color }]} />
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.chartLatest}>
          {latest != null ? `${latest}${unit ? ` ${unit}` : ""}` : "—"}
          <Text style={styles.chartLatestSub}>  최근</Text>
        </Text>
      </View>
      <LineChart data={data} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },

  trendSection: { marginBottom: 4 },
  trendHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
    marginLeft: 2,
  },
  chartCard: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 12,
  },
  chartHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  chartDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  chartTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b", flex: 1 },
  chartLatest: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  chartLatestSub: { fontSize: 11, fontWeight: "600", color: "#94a3b8" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  notice: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  noticeText: { color: "#1e40af", fontSize: 13, lineHeight: 19 },

  empty: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#334155" },
  emptyBody: { fontSize: 13, color: "#94a3b8", marginTop: 6 },

  card: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 12,
  },
  cardLatest: { borderColor: "#93c5fd", borderWidth: 2 },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  date: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  latestBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  latestBadgeText: { color: "#1d4ed8", fontSize: 11, fontWeight: "700" },

  grid: { flexDirection: "row", flexWrap: "wrap" },
  metric: { width: "50%", paddingVertical: 8, paddingRight: 8 },
  metricLabel: { fontSize: 12, color: "#94a3b8", marginBottom: 2 },
  metricValue: { fontSize: 17, fontWeight: "700", color: "#1e293b" },
  metricUnit: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  metricDelta: { fontSize: 11, marginTop: 2, color: "#64748b" },
  deltaUp: { color: "#dc2626" },
  deltaDown: { color: "#2563eb" },

  sheet: {
    width: "100%",
    height: 220,
    marginTop: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
  },
  note: {
    marginTop: 12,
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
});
