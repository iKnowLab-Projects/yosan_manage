import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, Announcement } from "@/lib/api";

const CATEGORY_LABEL: Record<string, string> = {
  notice: "공지",
  faq: "FAQ",
};

export default function BoardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Announcement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<Announcement>(`/api/v1/board/${id}`)
      .then(setItem)
      .catch((e: any) => setError(e?.message ?? "조회 실패"));
  }, [id]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#94a3b8" }}>{error}</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: "#f8fafc" }}
      contentContainerStyle={{ padding: 16 }}
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {CATEGORY_LABEL[item.category] ?? item.category}
            </Text>
          </View>
          <Text style={styles.date}>{item.created_at.slice(0, 10)}</Text>
        </View>
        <Text style={styles.title}>
          {item.is_pinned ? "📌 " : ""}
          {item.title}
        </Text>
        <Text style={styles.body}>{item.body}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 18,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { color: "#4338ca", fontSize: 11, fontWeight: "700" },
  date: { fontSize: 12, color: "#94a3b8" },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 14,
    lineHeight: 28,
  },
  body: { fontSize: 15, color: "#334155", lineHeight: 24 },
});
