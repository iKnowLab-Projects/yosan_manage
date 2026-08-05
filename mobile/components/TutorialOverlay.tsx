import { useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// 강조 대상 사각형(화면 좌표)
export type TutorialRect = { x: number; y: number; w: number; h: number };
// 안내 문구 조각 — hl:true 면 강조(볼드+강조색)
export type TutorialSeg = { t: string; hl?: boolean };
export type TutorialStep = { spots: TutorialRect[]; segments: TutorialSeg[] };

const PAD = 8; // 강조 링 여백
const CARD_GAP = 18; // 강조 영역과 안내 카드 사이 최소 간격
const EST_CARD_H = 170; // 카드 예상 높이(배치 계산용)
const TOP_LIMIT = 96; // 상단 건너뛰기 버튼 아래
const EDGE = 24;

// 강조 영역과 겹치지 않는 가장 넓은 빈 공간에 안내 카드를 배치할 top 좌표 계산
function computeCardTop(spots: TutorialRect[]): number {
  const H = Dimensions.get("window").height;
  const bottomLimit = H - EDGE;
  const occ = spots
    .map(
      (s) =>
        [
          Math.max(TOP_LIMIT, s.y - PAD - CARD_GAP),
          Math.min(bottomLimit, s.y + s.h + PAD + CARD_GAP),
        ] as [number, number],
    )
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);

  // 겹치는 구간 병합
  const merged: [number, number][] = [];
  for (const iv of occ) {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
    else merged.push([iv[0], iv[1]]);
  }

  // 빈 구간(free band) 산출
  const free: [number, number][] = [];
  let cur = TOP_LIMIT;
  for (const [a, b] of merged) {
    if (a > cur) free.push([cur, a]);
    cur = Math.max(cur, b);
  }
  if (cur < bottomLimit) free.push([cur, bottomLimit]);

  // 가장 넓은 빈 구간 선택 후 그 안에서 카드 중앙 정렬
  let best: [number, number] = free[0] ?? [TOP_LIMIT, bottomLimit];
  for (const f of free) if (f[1] - f[0] > best[1] - best[0]) best = f;
  const bandH = best[1] - best[0];
  let top = best[0] + Math.max(0, (bandH - EST_CARD_H) / 2);
  top = Math.min(top, Math.max(best[0], best[1] - EST_CARD_H));
  return top;
}

export default function TutorialOverlay({
  steps,
  onDone,
}: {
  steps: TutorialStep[];
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const step = steps[i];
  if (!step) return null;

  const cardTop = computeCardTop(step.spots);

  const next = () => {
    if (i >= steps.length - 1) onDone();
    else setI((v) => v + 1);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      {/* 탭하면 다음 단계 */}
      <Pressable style={styles.fill} onPress={next}>
        {/* 나머지 영역을 어둡게 */}
        <View style={styles.dim} />

        {/* 강조 링 */}
        {step.spots.map((r, idx) => (
          <View
            key={idx}
            pointerEvents="none"
            style={[
              styles.ring,
              {
                left: r.x - PAD,
                top: r.y - PAD,
                width: r.w + PAD * 2,
                height: r.h + PAD * 2,
              },
            ]}
          />
        ))}

        {/* 안내 카드 — 강조 영역과 겹치지 않는 위치에 배치 */}
        <View pointerEvents="none" style={[styles.card, { top: cardTop }]}>
          <Text style={styles.body}>
            {step.segments.map((s, k) => (
              <Text key={k} style={s.hl ? styles.hl : undefined}>
                {s.t}
              </Text>
            ))}
          </Text>
          <Text style={styles.hint}>
            화면을 탭하면 다음으로 넘어갑니다 · {i + 1}/{steps.length}
          </Text>
        </View>

        {/* 건너뛰기 */}
        <Pressable style={styles.skip} onPress={onDone} hitSlop={12}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.72)" },
  ring: {
    position: "absolute",
    borderWidth: 3,
    borderColor: "#60a5fa",
    borderRadius: 14,
    backgroundColor: "rgba(96,165,250,0.18)",
  },
  card: {
    position: "absolute",
    left: 24,
    right: 24,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 18,
  },
  body: { fontSize: 16, lineHeight: 25, color: "#1e293b" },
  hl: { fontWeight: "800", color: "#2563eb" },
  hint: { marginTop: 12, fontSize: 12, color: "#94a3b8", textAlign: "center" },
  skip: {
    position: "absolute",
    top: 48,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  skipText: { fontSize: 13, color: "#334155", fontWeight: "600" },
});
