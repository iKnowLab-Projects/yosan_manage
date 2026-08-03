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
import { useVideoPlayer, VideoView } from "expo-video";
import { api, CardNews, recordView } from "@/lib/api";
import { resolveCardImage, resolveMediaUrl } from "@/lib/images";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const IMG_ZOOM = 2; // 더블탭 확대 배율
const MAX_ZOOM = 4; // 핀치(스프레드) 최대 배율

const clampNum = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
// 현재 배율에서 이미지가 화면 밖으로 벗어나지 않는 최대 이동량
const maxPanX = (scale: number) => ((scale - 1) / 2) * SCREEN_W;
const maxPanY = (scale: number) => ((scale - 1) / 2) * SCREEN_H;
// 두 손가락 사이 거리 (핀치 감지)
const touchDistance = (touches: any[]) =>
  Math.hypot(
    touches[0].pageX - touches[1].pageX,
    touches[0].pageY - touches[1].pageY,
  );

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
  // 확대(더블탭·핀치) + 패닝 상태
  const imgScale = useRef(new Animated.Value(1)).current;
  const imgTX = useRef(new Animated.Value(0)).current;
  const imgTY = useRef(new Animated.Value(0)).current;
  const curScale = useRef(1); // 현재 배율(제스처 계산용 동기 값)
  const curTX = useRef(0);
  const curTY = useRef(0);
  const lastDx = useRef(0); // 팬 증분 계산용
  const lastDy = useRef(0);
  const pinchRefDist = useRef(0); // 핀치 시작 시 손가락 거리
  const pinchRefScale = useRef(1); // 핀치 시작 시 배율
  const zoomedRef = useRef(false); // imgZoomed 미러 (중복 setState 방지)
  const [imgZoomed, setImgZoomed] = useState(false);
  const lastTap = useRef(0);

  useEffect(() => {
    if (!id) return;
    api<CardNews>(`/api/v1/cardnews/${id}`)
      .then((data) => {
        setItem(data);
        recordView("cardnews", data.id); // 조회수 집계
      })
      .catch((e: any) => setError(e?.message ?? "조회 실패"));
  }, [id]);

  // 핀치(스프레드) 확대/축소 + 확대 시 드래그 패닝. 순수 PanResponder 멀티터치(네이티브 의존성 X).
  // 훅(useMemo)이라 조기 return 앞에 둔다. 헬퍼는 팩토리 내부에 두어 refs/stable setter만 캡처.
  const imgPan = useMemo(() => {
    const applyPan = () => {
      const mx = maxPanX(curScale.current);
      const my = maxPanY(curScale.current);
      curTX.current = clampNum(curTX.current, -mx, mx);
      curTY.current = clampNum(curTY.current, -my, my);
      imgTX.setValue(curTX.current);
      imgTY.setValue(curTY.current);
    };
    const setZoomed = (z: boolean) => {
      if (zoomedRef.current !== z) {
        zoomedRef.current = z;
        setImgZoomed(z);
      }
    };
    const finalize = () => {
      pinchRefDist.current = 0;
      if (curScale.current <= 1.02) {
        curScale.current = 1;
        curTX.current = 0;
        curTY.current = 0;
        Animated.parallel([
          Animated.timing(imgScale, { toValue: 1, duration: 150, useNativeDriver: false }),
          Animated.timing(imgTX, { toValue: 0, duration: 150, useNativeDriver: false }),
          Animated.timing(imgTY, { toValue: 0, duration: 150, useNativeDriver: false }),
        ]).start();
        setZoomed(false);
      } else {
        setZoomed(true);
      }
    };
    const shouldClaim = (e: any, g: any) =>
      e.nativeEvent.touches.length >= 2 ||
      (curScale.current > 1.01 && (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2));
    return PanResponder.create({
      // 캡처 단계에서 먼저 잡아 자식 Pressable/좌우 ScrollView보다 우선 → 핀치 인식률 개선
      onStartShouldSetPanResponderCapture: (e) =>
        e.nativeEvent.touches.length >= 2,
      onMoveShouldSetPanResponderCapture: shouldClaim,
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: shouldClaim,
      onPanResponderGrant: (_e, g) => {
        lastDx.current = g.dx;
        lastDy.current = g.dy;
        pinchRefDist.current = 0;
      },
      onPanResponderMove: (e, g) => {
        const touches = e.nativeEvent.touches;
        if (touches.length >= 2) {
          // 핀치: 손가락 거리 비율로 배율 조정
          const d = touchDistance(touches);
          if (pinchRefDist.current === 0) {
            pinchRefDist.current = d || 1;
            pinchRefScale.current = curScale.current;
            return;
          }
          const ns = clampNum(
            pinchRefScale.current * (d / pinchRefDist.current),
            1,
            MAX_ZOOM,
          );
          curScale.current = ns;
          imgScale.setValue(ns);
          applyPan();
          setZoomed(ns > 1.01);
        } else if (touches.length === 1) {
          if (pinchRefDist.current !== 0) {
            // 핀치 → 한 손가락 전환: 팬 기준 재설정
            pinchRefDist.current = 0;
            lastDx.current = g.dx;
            lastDy.current = g.dy;
          }
          if (curScale.current > 1.01) {
            // 팬(증분)
            curTX.current += g.dx - lastDx.current;
            curTY.current += g.dy - lastDy.current;
            lastDx.current = g.dx;
            lastDy.current = g.dy;
            applyPan();
          } else {
            lastDx.current = g.dx;
            lastDy.current = g.dy;
          }
        }
      },
      onPanResponderRelease: finalize,
      onPanResponderTerminate: finalize,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // 이미지 목록 구성. 이미지 없이 동영상만 있는 카드도 허용(빈 배열).
  const gallery =
    item.images && item.images.length > 0
      ? item.images
      : item.image_key
        ? [item.image_key]
        : [];
  const hasImages = gallery.length > 0;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== page) setPage(idx);
  };

  const resetZoom = () => {
    curScale.current = 1;
    curTX.current = 0;
    curTY.current = 0;
    pinchRefDist.current = 0;
    lastDx.current = 0;
    lastDy.current = 0;
    imgScale.setValue(1);
    imgTX.setValue(0);
    imgTY.setValue(0);
    zoomedRef.current = false;
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
    if (curScale.current > 1.01) {
      // 원래 비율로 복귀 (이동도 0으로)
      curScale.current = 1;
      curTX.current = 0;
      curTY.current = 0;
      zoomedRef.current = false;
      setImgZoomed(false);
      Animated.parallel([
        Animated.timing(imgScale, { toValue: 1, duration: 180, useNativeDriver: false }),
        Animated.timing(imgTX, { toValue: 0, duration: 180, useNativeDriver: false }),
        Animated.timing(imgTY, { toValue: 0, duration: 180, useNativeDriver: false }),
      ]).start();
    } else {
      curScale.current = IMG_ZOOM;
      zoomedRef.current = true;
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

  return (
    <ScrollView
      style={{ backgroundColor: "#f8fafc" }}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* ===== 이미지 카드뉴스 (좌우 스크롤) — 동영상만 있는 카드는 생략 ===== */}
      {hasImages && (
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
      )}

      {/* ===== 글 영역 (이미지와 별개로 항상 보존) ===== */}
      <View style={styles.body}>
        <Text style={styles.title}>{item.title}</Text>
        {!!item.author && (
          <Text style={styles.author}>게시자 · {item.author}</Text>
        )}
        {!!item.summary && <Text style={styles.summary}>{item.summary}</Text>}
        {!!item.body && <Text style={styles.content}>{item.body}</Text>}
        {!!item.video_key && (
          <VideoBlock url={resolveMediaUrl(item.video_key)} />
        )}
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

// 첨부 동영상 재생 (expo-video). item 로드 후에만 렌더되므로 훅 규칙 안전.
function VideoBlock({ url }: { url: string }) {
  // 안정적인 문자열 소스로 전달(리렌더 시 재생성 방지) + 네이티브 컨트롤 노출
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  return (
    <View style={{ marginTop: 16 }}>
      <VideoView
        style={styles.video}
        player={player}
        nativeControls
        allowsFullscreen
        contentFit="contain"
      />
      <TouchableOpacity onPress={() => Linking.openURL(url)}>
        <Text style={styles.videoFallback}>
          재생이 안 되면 여기를 눌러 열기 ›
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: "#000",
  },
  videoFallback: {
    marginTop: 8,
    fontSize: 13,
    color: "#2563eb",
    fontWeight: "600",
    textAlign: "center",
  },
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
    overflow: "hidden", // 확대된 이미지가 옆 페이지로 넘쳐 겹치지 않도록 클립
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
