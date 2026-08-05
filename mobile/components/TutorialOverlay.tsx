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

// 화면 전체를 어둡게 덮되, 강조 영역(holes)만 구멍으로 남기는 어두운 사각형들 산출.
// (네이티브 마스킹 없이 순수 View 로, 여러 개 구멍도 지원)
function darkRects(
  holes: TutorialRect[],
  W: number,
  H: number,
): TutorialRect[] {
  const yset = new Set<number>([0, H]);
  for (const h of holes) {
    yset.add(Math.max(0, Math.min(H, h.y)));
    yset.add(Math.max(0, Math.min(H, h.y + h.h)));
  }
  const yEdges = [...yset].sort((a, b) => a - b);
  const rects: TutorialRect[] = [];

  for (let i = 0; i < yEdges.length - 1; i++) {
    const yA = yEdges[i];
    const yB = yEdges[i + 1];
    if (yB <= yA) continue;
    const midY = (yA + yB) / 2;

    // 이 가로 밴드에서 구멍이 차지하는 x구간
    const xints = holes
      .filter((h) => h.y <= midY && h.y + h.h >= midY)
      .map(
        (h) =>
          [Math.max(0, h.x), Math.min(W, h.x + h.w)] as [number, number],
      )
      .filter(([a, b]) => b > a)
      .sort((a, b) => a[0] - b[0]);

    const merged: [number, number][] = [];
    for (const iv of xints) {
      const last = merged[merged.length - 1];
      if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
      else merged.push([iv[0], iv[1]]);
    }

    // 구멍의 여집합 = 어둡게 덮을 x구간
    let cur = 0;
    for (const [a, b] of merged) {
      if (a > cur) rects.push({ x: cur, y: yA, w: a - cur, h: yB - yA });
      cur = Math.max(cur, b);
    }
    if (cur < W) rects.push({ x: cur, y: yA, w: W - cur, h: yB - yA });
  }
  return rects;
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
  const { width: W, height: H } = Dimensions.get("window");
  const holes: TutorialRect[] = step.spots.map((s) => ({
    x: s.x - PAD,
    y: s.y - PAD,
    w: s.w + PAD * 2,
    h: s.h + PAD * 2,
  }));

  const next = () => {
    if (i >= steps.length - 1) onDone();
    else setI((v) => v + 1);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      {/* 탭하면 다음 단계 */}
      <Pressable style={styles.fill} onPress={next}>
        {/* 강조 영역만 밝게 남기고 나머지를 어둡게 (구멍 뚫기) */}
        {darkRects(holes, W, H).map((r, idx) => (
          <View
            key={`dark-${idx}`}
            pointerEvents="none"
            style={[
              styles.darkCell,
              { left: r.x, top: r.y, width: r.w, height: r.h },
            ]}
          />
        ))}

        {/* 강조 링 (테두리만) */}
        {holes.map((r, idx) => (
          <View
            key={idx}
            pointerEvents="none"
            style={[
              styles.ring,
              { left: r.x, top: r.y, width: r.w, height: r.h },
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
  darkCell: { position: "absolute", backgroundColor: "rgba(0,0,0,0.72)" },
  ring: {
    position: "absolute",
    borderWidth: 3,
    borderColor: "#60a5fa",
    borderRadius: 14,
    // 채움 없음(테두리만) — 강조 영역이 원래 밝기로 보이도록
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
