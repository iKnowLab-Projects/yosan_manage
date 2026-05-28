import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { api, DailyReport } from "@/lib/api";

const MEAL_LABEL: Record<string, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

export default function History() {
  const [items, setItems] = useState<DailyReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const r = await api<DailyReport[]>("/api/v1/reports/me?limit=60");
      setItems(r);
    } catch {
      // 무시
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }}
      data={items}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
      ListEmptyComponent={
        <View style={{ alignItems: "center", padding: 32 }}>
          <Text style={{ color: "#94a3b8" }}>아직 보고 이력이 없습니다.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.date}>{item.report_date}</Text>
            {item.flare_up && (
              <Text style={styles.flare}>통풍 발작</Text>
            )}
          </View>
          <View style={styles.metrics}>
            <Metric label="체중" value={fmt(item.weight_kg, "kg")} />
            <Metric label="요산" value={fmt(item.uric_acid, "mg/dL")} />
            <Metric label="수분" value={fmt(item.water_intake_ml, "ml")} />
            <Metric label="운동" value={fmt(item.exercise_minutes, "분")} />
          </View>
          {item.meals.length > 0 && (
            <View style={styles.meals}>
              {item.meals.map((m) => (
                <Text key={m.id} style={styles.meal}>
                  • [{MEAL_LABEL[m.meal_type] ?? m.meal_type}] {m.description}
                </Text>
              ))}
            </View>
          )}
          {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
        </View>
      )}
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ minWidth: "45%", marginBottom: 6 }}>
      <Text style={{ fontSize: 12, color: "#94a3b8" }}>{label}</Text>
      <Text style={{ fontSize: 14, color: "#0f172a" }}>{value}</Text>
    </View>
  );
}

function fmt(v: number | null | undefined, unit: string) {
  return v === null || v === undefined ? "—" : `${v} ${unit}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  date: { fontWeight: "700", color: "#1e293b" },
  flare: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    fontWeight: "700",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  meals: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  meal: { fontSize: 13, color: "#334155", marginBottom: 2 },
  notes: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    fontSize: 13,
    color: "#475569",
  },
});
