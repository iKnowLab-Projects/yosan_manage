import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, Announcement } from "@/lib/api";

const CATEGORY_LABEL: Record<string, string> = {
  notice: "공지",
  faq: "FAQ",
};

export default function Board() {
  const router = useRouter();
  const [items, setItems] = useState<Announcement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const r = await api<Announcement[]>("/api/v1/board?limit=50");
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
      style={{ backgroundColor: "#f8fafc" }}
      contentContainerStyle={{ padding: 16 }}
      data={items}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
      ListEmptyComponent={
        <View style={{ alignItems: "center", padding: 40 }}>
          <Text style={{ color: "#94a3b8" }}>등록된 게시글이 없습니다.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: "/(app)/board-detail",
              params: { id: String(item.id) },
            })
          }
        >
          <View style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {CATEGORY_LABEL[item.category] ?? item.category}
              </Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {item.is_pinned ? "📌 " : ""}
              {item.title}
            </Text>
          </View>
          <Text style={styles.preview} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.date}>{item.created_at.slice(0, 10)}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  badge: {
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { color: "#4338ca", fontSize: 11, fontWeight: "700" },
  title: { flex: 1, fontSize: 15, fontWeight: "700", color: "#0f172a" },
  preview: { fontSize: 13, color: "#64748b", lineHeight: 19 },
  date: { fontSize: 11, color: "#cbd5e1", marginTop: 8 },
});
