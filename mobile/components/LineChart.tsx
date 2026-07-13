import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

export type ChartPoint = { label: string; value: number | null };

/**
 * 네이티브 의존성 없이(순수 React Native View) 그리는 경량 꺾은선 그래프.
 * - 선분은 두 점 사이 거리/각도로 회전한 얇은 View 로 표현 (react-native-svg 불필요 → OTA 반영 가능)
 * - value 가 null 인 지점은 건너뛰고 가용한 점끼리 연결
 */
export default function LineChart({
  data,
  color = "#2563eb",
  height = 170,
  decimals = 1,
}: {
  data: ChartPoint[];
  color?: string;
  height?: number;
  decimals?: number;
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
  // 라벨이 너무 촘촘하면 솎아낸다 (점이 6개 초과면 하나 걸러 표시 + 마지막은 항상)
  const showLabel = (i: number) => n <= 6 || i % 2 === 0 || i === n - 1;

  return (
    <View
      style={{ height }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
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
                  style={[styles.xLabel, { left: p.x - 20, top: height - padB + 6 }]}
                  numberOfLines={1}
                >
                  {p.label}
                </Text>
              )}
            </View>
          ))}
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
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#94a3b8",
    fontSize: 13,
  },
});
