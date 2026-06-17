import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, CardNews } from "@/lib/api";
import { resolveCardImage } from "@/lib/images";

export default function CardNewsList() {
  const router = useRouter();
  const [items, setItems] = useState<CardNews[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const r = await api<CardNews[]>("/api/v1/cardnews?limit=50");
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
          <Text style={{ color: "#94a3b8" }}>등록된 카드뉴스가 없습니다.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/(app)/cardnews-detail",
              params: { id: String(item.id) },
            })
          }
        >
          <Image
            source={resolveCardImage(item.image_key)}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            {!!item.summary && (
              <Text style={styles.summary} numberOfLines={2}>
                {item.summary}
              </Text>
            )}
          </View>
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
    overflow: "hidden",
    marginBottom: 14,
  },
  image: { width: "100%", height: 180, backgroundColor: "#f1f5f9" },
  body: { padding: 14 },
  title: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  summary: { fontSize: 13, color: "#64748b", marginTop: 6, lineHeight: 19 },
});
