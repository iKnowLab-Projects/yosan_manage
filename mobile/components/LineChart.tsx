import { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type ChartPoint = { label: string; value: number | null };

/**
 * 네이티브 의존성 없이(순수 React Native View) 그리는 경량 꺾은선 그래프.
 * - 선분은 두 점 사이 거리/각도로 회전한 얇은 View 로 표현 (react-native-svg 불필요 → OTA 반영 가능)
 * - value 가 null 인 지점은 건너뛰고 가용한 점끼리 연결
 * - onSelect 를 주면 그래프 위를 드래그/탭 하여 날짜(인덱스)를 선택할 수 있다.
 */
export default function LineChart({
  data,
  color = "#2563eb",
  height = 170,
  decimals = 1,
  selectedIndex = null,
  onSelect,
}: {
  data: ChartPoint[];
  color?: string;
  height?: number;
  decimals?: number;
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
}) {
  const [w, setW] = useState(0);

  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const plotW = Math.max(0, w - padL - padR);
  const plotH = height - padT - padB;

  const values = data
    .map((d) => d.value)
    .filter((v): v is number => v !== null && v !== undefined);
  const hasData = values.length >= 1;
  const min = hasData ? Math.min(...values) : 0;
  const max = hasData ? Math.max(...values) : 1;
  const span = max - min || 1;
  const lo = min - span * 0.1;
  const hi = max + span * 0.1;
  const range = hi - lo || 1;

  const n = data.length;
  const xAt = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (v: number) => padT + (1 - (v - lo) / range) * plotH;

  // 드래그/탭 → 가장 가까운 인덱스 선택
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!onSelect,
        onMoveShouldSetPanResponder: () => !!onSelect,
        onPanResponderGrant: (e) => selectAt(e.nativeEvent.locationX),
        onPanResponderMove: (e) => selectAt(e.nativeEvent.locationX),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSelect, w, n],
  );

  function selectAt(x: number) {
    if (!onSelect) return;
    if (n <= 1) return onSelect(0);
    const ratio = (x - padL) / (plotW || 1);
    let idx = Math.round(ratio * (n - 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    onSelect(idx);
  }

  const pts = data
    .map((d, i) =>
      d.value !== null && d.value !== undefined
        ? { i, x: xAt(i), y: yAt(d.value), v: d.value, label: d.label }
        : null,
    )
    .filter(Boolean) as {
    i: number;
    x: number;
    y: number;
    v: number;
    label: string;
  }[];

  const segments = [];
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1];
    const b = pts[k];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    segments.push({
      key: k,
      left: (a.x + b.x) / 2 - len / 2,
      top: (a.y + b.y) / 2 - 1,
      width: len,
      angle,
    });
  }

  const fmt = (v: number) => v.toFixed(decimals);
  const showLabel = (i: number) => n <= 6 || i % 2 === 0 || i === n - 1;

  const sel =
    selectedIndex != null && selectedIndex >= 0 && selectedIndex < n
      ? selectedIndex
      : null;
  const selVal = sel != null ? data[sel].value : null;

  return (
    <View
      style={{ height }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      {...(onSelect ? pan.panHandlers : {})}
    >
      {w > 0 && hasData && (
        <>
          {/* 상/하한 기준선 + y축 라벨 */}
          <View style={[styles.grid, { top: yAt(max), left: padL, width: plotW }]} />
          <View style={[styles.grid, { top: yAt(min), left: padL, width: plotW }]} />
          <Text style={[styles.yLabel, { top: yAt(max) - 7, width: padL - 6 }]}>
            {fmt(max)}
          </Text>
          <Text style={[styles.yLabel, { top: yAt(min) - 7, width: padL - 6 }]}>
            {fmt(min)}
          </Text>

          {/* 선택 세로선 */}
          {sel != null && (
            <View
              style={[
                styles.selLine,
                { left: xAt(sel), top: padT, height: plotH },
              ]}
            />
          )}

          {/* 선분 */}
          {segments.map((s) => (
            <View
              key={s.key}
              style={{
                position: "absolute",
                left: s.left,
                top: s.top,
                width: s.width,
                height: 2,
                borderRadius: 1,
                backgroundColor: color,
                transform: [{ rotate: `${s.angle}rad` }],
              }}
            />
          ))}

          {/* 점 + x축(날짜) 라벨 */}
          {pts.map((p) => (
            <View key={p.i}>
              <View
                style={{
                  position: "absolute",
                  left: p.x - 3.5,
                  top: p.y - 3.5,
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: color,
                  borderWidth: 1.5,
                  borderColor: "#ffffff",
                }}
              />
              {showLabel(p.i) && (
                <Text
                  style={[
                    styles.xLabel,
                    { left: p.x - 20, top: height - padB + 6 },
                    p.i === sel && { color, fontWeight: "700" },
                  ]}
                  numberOfLines={1}
                >
                  {p.label}
                </Text>
              )}
            </View>
          ))}

          {/* 선택된 점 강조 + 값 말풍선 */}
          {sel != null && selVal != null && (
            <>
              <View
                style={{
                  position: "absolute",
                  left: xAt(sel) - 6,
                  top: yAt(selVal) - 6,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "#ffffff",
                  borderWidth: 2.5,
                  borderColor: color,
                }}
              />
              <View
                style={[
                  styles.bubble,
                  {
                    left: Math.max(2, Math.min(w - 54, xAt(sel) - 26)),
                    top: Math.max(0, yAt(selVal) - 26),
                  },
                ]}
              >
                <Text style={styles.bubbleText}>{fmt(selVal)}</Text>
              </View>
            </>
          )}
        </>
      )}
      {w > 0 && !hasData && (
        <Text style={styles.empty}>표시할 데이터가 없습니다.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    position: "absolute",
    height: 1,
    backgroundColor: "#eef2f7",
  },
  selLine: {
    position: "absolute",
    width: 1.5,
    backgroundColor: "#cbd5e1",
    marginLeft: -0.75,
  },
  yLabel: {
    position: "absolute",
    left: 0,
    textAlign: "right",
    fontSize: 10,
    color: "#94a3b8",
  },
  xLabel: {
    position: "absolute",
    width: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#94a3b8",
  },
  bubble: {
    position: "absolute",
    minWidth: 40,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#0f172a",
    alignItems: "center",
  },
  bubbleText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#94a3b8",
    fontSize: 13,
  },
});
