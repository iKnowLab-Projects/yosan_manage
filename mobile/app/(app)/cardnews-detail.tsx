import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, CardNews } from "@/lib/api";
import { resolveCardImage } from "@/lib/images";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const IMG_ZOOM = 2; // 더블탭 확대 배율
// 확대 시 패닝(드래그) 가능한 최대 이동량 (화면 밖으로 벗어나지 않게 클램프)
const MAX_TX = ((IMG_ZOOM - 1) / 2) * SCREEN_W;
const MAX_TY = ((IMG_ZOOM - 1) / 2) * SCREEN_H;
const clampT = (v: number, max: number) => Math.max(-max, Math.min(max, v));

export default function CardNewsDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<CardNews | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  // 전체화면 이미지 뷰어
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomStart, setZoomStart] = useState(0); // 뷰어를 열 때 시작 인덱스
  const [zoomIndex, setZoomIndex] = useState(0); // 뷰어에서 현재 보는 인덱스
  const zoomRef = useRef<ScrollView>(null);
  // 더블탭 확대 + 패닝 상태
  const imgScale = useRef(new Animated.Value(1)).current;
  const imgTX = useRef(new Animated.Value(0)).current;
  const imgTY = useRef(new Animated.Value(0)).current;
  const baseTX = useRef(0);
  const baseTY = useRef(0);
  const [imgZoomed, setImgZoomed] = useState(false);
  const lastTap = useRef(0);

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

  const resetZoom = () => {
    imgScale.setValue(1);
    imgTX.setValue(0);
    imgTY.setValue(0);
    baseTX.current = 0;
    baseTY.current = 0;
    setImgZoomed(false);
  };

  const openZoom = (i: number) => {
    resetZoom();
    setZoomStart(i);
    setZoomIndex(i);
    setZoomVisible(true);
  };

  const onZoomScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== zoomIndex) {
      setZoomIndex(idx);
      resetZoom(); // 다른 이미지로 넘어가면 확대/이동 해제
    }
  };

  const toggleImgZoom = () => {
    if (imgZoomed) {
      // 원래 비율로 복귀 (이동도 0으로)
      baseTX.current = 0;
      baseTY.current = 0;
      setImgZoomed(false);
      Animated.parallel([
        Animated.timing(imgScale, { toValue: 1, duration: 180, useNativeDriver: false }),
        Animated.timing(imgTX, { toValue: 0, duration: 180, useNativeDriver: false }),
        Animated.timing(imgTY, { toValue: 0, duration: 180, useNativeDriver: false }),
      ]).start();
    } else {
      setImgZoomed(true);
      Animated.timing(imgScale, {
        toValue: IMG_ZOOM,
        duration: 180,
        useNativeDriver: false,
      }).start();
    }
  };

  // 더블탭 감지 → 확대/복귀 토글
  const onImgTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      toggleImgZoom();
    } else {
      lastTap.current = now;
    }
  };

  // 확대 중일 때만 드래그로 패닝 (미확대 시엔 좌우 페이징/탭이 동작하도록 양보)
  const imgPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) =>
          imgZoomed && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
        onPanResponderMove: (_e, g) => {
          imgTX.setValue(clampT(baseTX.current + g.dx, MAX_TX));
          imgTY.setValue(clampT(baseTY.current + g.dy, MAX_TY));
        },
        onPanResponderRelease: (_e, g) => {
          baseTX.current = clampT(baseTX.current + g.dx, MAX_TX);
          baseTY.current = clampT(baseTY.current + g.dy, MAX_TY);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [imgZoomed],
  );

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
            <Pressable key={`${key}-${i}`} onPress={() => openZoom(i)}>
              <Image
                source={resolveCardImage(key)}
                style={{ width: SCREEN_W, height: 280, backgroundColor: "#f1f5f9" }}
                resizeMode="cover"
              />
            </Pressable>
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
        {!!item.author && (
          <Text style={styles.author}>게시자 · {item.author}</Text>
        )}
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

      {/* ===== 전체화면 이미지 뷰어 ===== */}
      <Modal
        visible={zoomVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomVisible(false)}
      >
        <View style={styles.zoomBackdrop}>
          {zoomVisible && (
            <ScrollView
              ref={zoomRef}
              horizontal
              pagingEnabled
              scrollEnabled={!imgZoomed}
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: zoomStart * SCREEN_W, y: 0 }}
              onLayout={() =>
                zoomRef.current?.scrollTo({
                  x: zoomStart * SCREEN_W,
                  animated: false,
                })
              }
              onMomentumScrollEnd={onZoomScroll}
              scrollEventThrottle={16}
              style={StyleSheet.absoluteFill}
            >
              {gallery.map((key, i) => (
                <View
                  key={`zoom-${i}`}
                  style={styles.zoomPage}
                  {...imgPan.panHandlers}
                >
                  <Pressable onPress={onImgTap} style={styles.zoomImage}>
                    <Animated.Image
                      source={resolveCardImage(key)}
                      style={[
                        styles.zoomImage,
                        {
                          transform: [
                            { translateX: imgTX },
                            { translateY: imgTY },
                            { scale: imgScale },
                          ],
                        },
                      ]}
                      resizeMode="contain"
                    />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          {/* 좌측 상단 1/n */}
          <View style={[styles.zoomCounter, { top: insets.top + 12 }]}>
            <Text style={styles.zoomCounterText}>
              {zoomIndex + 1} / {gallery.length}
            </Text>
          </View>

          {/* 우측 상단 닫기 */}
          <TouchableOpacity
            style={[styles.zoomClose, { top: insets.top + 8 }]}
            onPress={() => setZoomVisible(false)}
            hitSlop={12}
          >
            <Text style={styles.zoomCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  author: { fontSize: 13, color: "#94a3b8", marginTop: 8 },
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

  // ===== 전체화면 이미지 뷰어 =====
  zoomBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  zoomPage: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomImage: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  zoomCounter: {
    position: "absolute",
    left: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  zoomCounterText: { color: "white", fontSize: 13, fontWeight: "700" },
  zoomClose: {
    position: "absolute",
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomCloseText: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
});
