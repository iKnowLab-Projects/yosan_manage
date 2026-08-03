import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, MealScoreTrend, MealScorePoint } from "@/lib/api";

const PLOT_H = 180; // 그래프 높이(px)
const DOT = 12;

function monthLabel(ym: string): string {
  const m = Number(ym.slice(5, 7));
  return `${m}월`;
}

// 0~100 점수를 그래프 y좌표(top)로 변환
function yFor(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return (1 - clamped / 100) * (PLOT_H - DOT);
}

export default function MealScoresScreen() {
  const [trend, setTrend] = useState<MealScoreTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<MealScoreTrend>("/api/v1/meal-scores/me").catch(
        () => null,
      );
      setTrend(data);
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const points = trend?.points ?? [];
  const hasData = points.length > 0;

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
          최근 6개월 식사 점수입니다. 파란 점은 나의 점수, 빨간 점은 평균
          점수예요.
        </Text>
      </View>

      {!hasData ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>아직 등록된 식사 점수가 없습니다</Text>
          <Text style={styles.emptyBody}>
            담당 연구원이 매월 점수를 등록하면 여기에 표시됩니다.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.legend}>
            <LegendDot color="#2563eb" label="나의 점수" />
            <LegendDot color="#ef4444" label="평균" />
          </View>

          <View style={styles.chartCard}>
            <View style={styles.chartRow}>
              {/* y축 라벨 */}
              <View style={styles.yAxis}>
                <Text style={styles.yLabel}>100</Text>
                <Text style={styles.yLabel}>50</Text>
                <Text style={styles.yLabel}>0</Text>
              </View>
              {/* 플롯 영역 */}
              <View style={styles.plot}>
                {/* 가로 기준선 */}
                <View style={[styles.gridLine, { top: 0 }]} />
                <View style={[styles.gridLine, { top: (PLOT_H - DOT) / 2 }]} />
                <View style={[styles.gridLine, { top: PLOT_H - DOT }]} />
                <View style={styles.cols}>
                  {points.map((p) => (
                    <View key={p.year_month} style={styles.col}>
                      {p.group_avg != null && (
                        <View
                          style={[
                            styles.dot,
                            styles.dotRed,
                            { top: yFor(p.group_avg) },
                          ]}
                        />
                      )}
                      {p.my_score != null && (
                        <View
                          style={[
                            styles.dot,
                            styles.dotBlue,
                            { top: yFor(p.my_score) },
                          ]}
                        />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>
            {/* x축 월 라벨 */}
            <View style={styles.xAxis}>
              {points.map((p) => (
                <Text key={p.year_month} style={styles.xLabel}>
                  {monthLabel(p.year_month)}
                </Text>
              ))}
            </View>
          </View>

          {/* 월별 점수 + 관리자 코멘트 */}
          <Text style={styles.sectionTitle}>월별 코멘트</Text>
          {[...points].reverse().map((p) => (
            <CommentRow key={p.year_month} point={p} />
          ))}
        </>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function CommentRow({ point }: { point: MealScorePoint }) {
  return (
    <View style={styles.commentCard}>
      <View style={styles.commentHead}>
        <Text style={styles.commentMonth}>{monthLabel(point.year_month)}</Text>
        <Text style={styles.commentScore}>
          {point.my_score != null ? `${point.my_score}점` : "—"}
          {point.group_avg != null ? (
            <Text style={styles.commentAvg}> · 평균 {point.group_avg}점</Text>
          ) : null}
        </Text>
      </View>
      {point.comment ? (
        <Text style={styles.commentText}>{point.comment}</Text>
      ) : (
        <Text style={styles.commentEmpty}>코멘트가 없습니다.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
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
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#334155" },
  emptyBody: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  legend: { flexDirection: "row", gap: 16, marginBottom: 8, paddingLeft: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: "#475569", fontSize: 12 },

  chartCard: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 16,
  },
  chartRow: { flexDirection: "row" },
  yAxis: {
    width: 28,
    height: PLOT_H,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 4,
  },
  yLabel: { fontSize: 10, color: "#94a3b8" },
  plot: { flex: 1, height: PLOT_H, position: "relative" },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  cols: { flexDirection: "row", height: PLOT_H },
  col: { flex: 1, height: PLOT_H, position: "relative" },
  dot: {
    position: "absolute",
    left: "50%",
    marginLeft: -DOT / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: "white",
  },
  dotBlue: { backgroundColor: "#2563eb" },
  dotRed: { backgroundColor: "#ef4444" },
  xAxis: {
    flexDirection: "row",
    marginLeft: 28,
    marginTop: 6,
  },
  xLabel: { flex: 1, textAlign: "center", fontSize: 11, color: "#64748b" },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
    marginLeft: 2,
  },
  commentCard: {
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 8,
  },
  commentHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  commentMonth: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  commentScore: { fontSize: 13, fontWeight: "700", color: "#2563eb" },
  commentAvg: { fontSize: 12, fontWeight: "600", color: "#94a3b8" },
  commentText: { fontSize: 13, color: "#475569", lineHeight: 19 },
  commentEmpty: { fontSize: 12, color: "#cbd5e1" },
});
