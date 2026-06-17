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
import { api, Announcement, CardNews, PatientMe } from "@/lib/api";
import { logoIcon, resolveCardImage } from "@/lib/images";

const CATEGORY_LABEL: Record<string, string> = {
  notice: "공지",
  faq: "FAQ",
};

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState<PatientMe | null>(null);
  const [cards, setCards] = useState<CardNews[]>([]);
  const [posts, setPosts] = useState<Announcement[]>([]);

  const load = useCallback(async () => {
    try {
      const [meRes, cardRes, boardRes] = await Promise.all([
        api<PatientMe>("/api/v1/patients/me").catch(() => null),
        api<CardNews[]>("/api/v1/cardnews?limit=10").catch(() => []),
        api<Announcement[]>("/api/v1/board?limit=3").catch(() => []),
      ]);
      setMe(meRes);
      setCards(cardRes);
      setPosts(boardRes);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 탭 진입 시마다 최신화
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const p = me?.profile ?? {};

  return (
    <ScrollView
      style={{ backgroundColor: "#f8fafc" }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* ===== 헤더 / 인사 ===== */}
      <View style={styles.header}>
        <Image source={logoIcon} style={styles.logo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>
            안녕하세요,{" "}
            <Text style={{ fontWeight: "800" }}>{me?.name ?? "회원"}</Text>님
          </Text>
          <Text style={styles.helloSub}>오늘도 건강한 하루 되세요 🌿</Text>
        </View>
      </View>

      {/* ===== 내 정보 요약 ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>내 정보</Text>
          <TouchableOpacity onPress={() => router.push("/(app)/profile")}>
            <Text style={styles.more}>상세 보기 ›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.infoGrid}>
          <InfoCell
            label="기준 체중"
            value={p.baseline_weight_kg ? `${p.baseline_weight_kg} kg` : "—"}
          />
          <InfoCell
            label="기준 요산"
            value={p.baseline_uric_acid ? `${p.baseline_uric_acid} mg/dL` : "—"}
          />
          <InfoCell
            label="신장"
            value={p.height_cm ? `${p.height_cm} cm` : "—"}
          />
          <InfoCell
            label="설문 그룹"
            value={p.survey_group ? `${p.survey_group}군` : "—"}
          />
        </View>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => router.push("/(app)/history")}
        >
          <Text style={styles.historyBtnText}>나의 기록 보기</Text>
        </TouchableOpacity>
      </View>

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

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  logo: { width: 44, height: 44 },
  hello: { fontSize: 17, color: "#0f172a" },
  helloSub: { fontSize: 13, color: "#64748b", marginTop: 2 },
  section: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  more: { color: "#2563eb", fontWeight: "600", fontSize: 13 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap" },
  infoCell: {
    width: "50%",
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 12, color: "#94a3b8", marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  historyBtn: {
    marginTop: 8,
    backgroundColor: "#eff6ff",
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
  },
  historyBtnText: { color: "#2563eb", fontWeight: "700" },
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
