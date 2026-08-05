import { useState } from "react";
import {
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

        {/* 안내 카드 */}
        <View pointerEvents="none" style={styles.card}>
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
    top: "42%",
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
