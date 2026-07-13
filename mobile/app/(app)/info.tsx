import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, Announcement, CardNews } from "@/lib/api";
import { resolveCardImage } from "@/lib/images";

const CATEGORY_LABEL: Record<string, string> = {
  notice: "공지",
  faq: "FAQ",
};

export default function InfoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cards, setCards] = useState<CardNews[]>([]);
  const [posts, setPosts] = useState<Announcement[]>([]);

  const load = useCallback(async () => {
    try {
      const [cardRes, boardRes] = await Promise.all([
        api<CardNews[]>("/api/v1/cardnews?limit=10").catch(() => []),
        api<Announcement[]>("/api/v1/board?limit=5").catch(() => []),
      ]);
      setCards(cardRes);
      setPosts(boardRes);
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
      {/* ===== 카드뉴스 ===== */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>건강 카드뉴스</Text>
        {cards.length > 0 && (
          <TouchableOpacity onPress={() => router.push("/(app)/cardnews")}>
            <Text style={styles.more}>전체 보기 ›</Text>
          </TouchableOpacity>
        )}
      </View>
      {cards.length === 0 ? (
        <EmptyBox text="등록된 카드뉴스가 없습니다." />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16, gap: 12 }}
          style={{ marginHorizontal: -16, paddingHorizontal: 16 }}
        >
          {cards.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.cardNews}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/(app)/cardnews-detail",
                  params: { id: String(c.id) },
                })
              }
            >
              <Image
                source={resolveCardImage(c.image_key)}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {c.title}
                </Text>
                {!!c.author && (
                  <Text style={styles.cardAuthor} numberOfLines={1}>
                    {c.author}
                  </Text>
                )}
                {!!c.summary && (
                  <Text style={styles.cardSummary} numberOfLines={2}>
                    {c.summary}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ===== 공지 · FAQ ===== */}
      <View style={[styles.sectionHead, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>공지 · FAQ</Text>
        <TouchableOpacity onPress={() => router.push("/(app)/board")}>
          <Text style={styles.more}>더 보기 ›</Text>
        </TouchableOpacity>
      </View>
      {posts.length === 0 ? (
        <EmptyBox text="등록된 게시글이 없습니다." />
      ) : (
        <View style={styles.section}>
          {posts.map((post, i) => (
            <TouchableOpacity
              key={post.id}
              style={[styles.postRow, i > 0 && styles.postDivider]}
              onPress={() =>
                router.push({
                  pathname: "/(app)/board-detail",
                  params: { id: String(post.id) },
                })
              }
            >
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {CATEGORY_LABEL[post.category] ?? post.category}
                </Text>
              </View>
              <Text style={styles.postTitle} numberOfLines={1}>
                {post.is_pinned ? "📌 " : ""}
                {post.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  more: { color: "#2563eb", fontWeight: "600", fontSize: 13 },
  section: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  cardNews: {
    width: 200,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: 120, backgroundColor: "#f1f5f9" },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  cardAuthor: { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  cardSummary: { fontSize: 12, color: "#64748b", marginTop: 4 },
  postRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 8,
  },
  postDivider: { borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  badge: {
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { color: "#4338ca", fontSize: 11, fontWeight: "700" },
  postTitle: { flex: 1, fontSize: 14, color: "#1e293b" },
  empty: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyText: { color: "#94a3b8", fontSize: 13 },
});
