import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, CardNews } from "@/lib/api";
import { resolveCardImage } from "@/lib/images";

export default function CardNewsDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<CardNews | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<CardNews>(`/api/v1/cardnews/${id}`)
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
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Image
        source={resolveCardImage(item.image_key)}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.body}>
        <Text style={styles.title}>{item.title}</Text>
        {!!item.summary && <Text style={styles.summary}>{item.summary}</Text>}
        {!!item.body && <Text style={styles.content}>{item.body}</Text>}
        {!!item.link_url && (
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => Linking.openURL(item.link_url!)}
          >
            <Text style={styles.linkText}>자세히 보기 ›</Text>
          </TouchableOpacity>
        )}
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
  image: { width: "100%", height: 240, backgroundColor: "#f1f5f9" },
  body: { padding: 18 },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a", lineHeight: 30 },
  summary: {
    fontSize: 15,
    color: "#475569",
    marginTop: 8,
    fontWeight: "600",
    lineHeight: 22,
  },
  content: { fontSize: 15, color: "#334155", marginTop: 16, lineHeight: 25 },
  linkBtn: {
    marginTop: 20,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  linkText: { color: "white", fontWeight: "700", fontSize: 15 },
});
