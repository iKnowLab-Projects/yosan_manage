import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FONT_SCALE_OPTIONS, useFontScale } from "@/lib/fontScale";

// 작게/보통/크게/아주 크게 4단계 글씨 크기 선택. 선택 즉시 전역 반영·저장.
export default function FontSizeControl() {
  const { scaleKey, setScaleKey, fs } = useFontScale();
  return (
    <View>
      <View style={styles.row}>
        {FONT_SCALE_OPTIONS.map((o) => {
          const active = scaleKey === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              style={[styles.chip, active && styles.chipOn]}
              onPress={() => setScaleKey(o.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.preview, { fontSize: fs(14) }]}>
        가나다 ABC 미리보기 — 이 크기로 표시됩니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "white",
  },
  chipOn: { backgroundColor: "#2563eb", borderColor: "#1d4ed8" },
  chipText: { color: "#334155", fontWeight: "600", fontSize: 13 },
  chipTextOn: { color: "white" },
  preview: { marginTop: 10, color: "#64748b" },
});
