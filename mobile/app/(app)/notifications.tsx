import { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, Notification, recordView } from "@/lib/api";

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const r = await api<Notification[]>("/api/v1/notifications/me");
      setItems(r);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: number) {
    try {
      await api(`/api/v1/notifications/${id}/read`, { method: "POST" });
      setItems((arr) => arr.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // ignore
    }
  }

  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }}
      data={items}
      keyExtractor={(n) => String(n.id)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
      ListEmptyComponent={
        <View style={{ alignItems: "center", padding: 32 }}>
          <Text style={{ color: "#94a3b8" }}>알림이 없습니다.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => {
            recordView("notification", item.id); // 조회수 집계
            if (!item.read) markRead(item.id);
          }}
          activeOpacity={0.8}
          style={[styles.card, !item.read && styles.unread]}
        >
          <View style={styles.row}>
            <Text style={styles.title}>{item.title}</Text>
            {!item.read && <View style={styles.dot} />}
          </View>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.meta}>
            {new Date(item.created_at).toLocaleString("ko-KR")} ·{" "}
            {labelOf(item.category)}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

function labelOf(c: string) {
  if (c === "reminder") return "보고 독촉";
  if (c === "alert") return "긴급";
  if (c === "inbody") return "인바디 피드백";
  if (c === "appointment") return "외래 진료 안내";
  return "안내";
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
  unread: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontWeight: "700", color: "#1e293b" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563eb" },
  body: { color: "#334155", marginTop: 6 },
  meta: { color: "#94a3b8", marginTop: 8, fontSize: 12 },
});
