import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, CardNews } from "@/lib/api";
import { resolveCardImage } from "@/lib/images";

const { width: SCREEN_W } = Dimensions.get("window");

export default function CardNewsDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<CardNews | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

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

  // images 가 비어 있으면 대표 이미지 1장으로 대체
  const gallery = item.images && item.images.length > 0 ? item.images : [item.image_key];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== page) setPage(idx);
  };

  return (
    <ScrollView
      style={{ backgroundColor: "#f8fafc" }}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* ===== 이미지 카드뉴스 (좌우 스크롤) ===== */}
      <View>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          scrollEventThrottle={16}
        >
          {gallery.map((key, i) => (
            <Image
              key={`${key}-${i}`}
              source={resolveCardImage(key)}
              style={{ width: SCREEN_W, height: 280, backgroundColor: "#f1f5f9" }}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {gallery.length > 1 && (
          <>
            {/* 페이지 번호 */}
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {page + 1} / {gallery.length}
              </Text>
            </View>
            {/* 하단 점 인디케이터 */}
            <View style={styles.dots}>
              {gallery.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === page && styles.dotActive]}
                />
              ))}
            </View>
          </>
        )}
      </View>

      {/* ===== 글 영역 (이미지와 별개로 항상 보존) ===== */}
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
  counter: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(15,23,42,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: { color: "white", fontSize: 12, fontWeight: "600" },
  dots: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  dotActive: { backgroundColor: "white", width: 18 },
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
