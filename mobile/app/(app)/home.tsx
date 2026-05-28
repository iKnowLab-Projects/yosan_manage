import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, DailyReport, DailyReportPayload } from "@/lib/api";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

const today = () => new Date().toISOString().slice(0, 10);

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayReport, setTodayReport] = useState<DailyReport | null>(null);

  const [form, setForm] = useState({
    weight_kg: "",
    uric_acid: "",
    water_intake_ml: "",
    exercise_minutes: "",
    pain_level: "",
    pain_location: "",
    flare_up: false,
    medication_taken: false,
    notes: "",
  });
  const [meals, setMeals] = useState<
    { meal_type: MealType; description: string; purine_estimate: string }[]
  >([
    { meal_type: "breakfast", description: "", purine_estimate: "" },
    { meal_type: "lunch", description: "", purine_estimate: "" },
    { meal_type: "dinner", description: "", purine_estimate: "" },
  ]);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<DailyReport | null>("/api/v1/reports/me/today");
        if (r) {
          setTodayReport(r);
          setForm({
            weight_kg: r.weight_kg?.toString() ?? "",
            uric_acid: r.uric_acid?.toString() ?? "",
            water_intake_ml: r.water_intake_ml?.toString() ?? "",
            exercise_minutes: r.exercise_minutes?.toString() ?? "",
            pain_level: r.pain_level?.toString() ?? "",
            pain_location: r.pain_location ?? "",
            flare_up: !!r.flare_up,
            medication_taken: !!r.medication_taken,
            notes: r.notes ?? "",
          });
          if (r.meals.length > 0) {
            setMeals(
              r.meals.map((m) => ({
                meal_type: m.meal_type,
                description: m.description,
                purine_estimate: m.purine_estimate ?? "",
              })),
            );
          }
        }
      } catch (err: any) {
        Alert.alert("로딩 실패", err?.message ?? "");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function updateMeal(i: number, k: "description" | "purine_estimate", v: string) {
    setMeals((arr) => arr.map((m, idx) => (idx === i ? { ...m, [k]: v } : m)));
  }

  function addSnack() {
    setMeals((arr) => [
      ...arr,
      { meal_type: "snack", description: "", purine_estimate: "" },
    ]);
  }

  async function submit() {
    setSaving(true);
    try {
      const payload: DailyReportPayload = {
        report_date: today(),
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        uric_acid: form.uric_acid ? Number(form.uric_acid) : null,
        water_intake_ml: form.water_intake_ml
          ? Number(form.water_intake_ml)
          : null,
        exercise_minutes: form.exercise_minutes
          ? Number(form.exercise_minutes)
          : null,
        pain_level: form.pain_level ? Number(form.pain_level) : null,
        pain_location: form.pain_location || null,
        flare_up: form.flare_up,
        medication_taken: form.medication_taken,
        notes: form.notes || null,
        meals: meals
          .filter((m) => m.description.trim().length > 0)
          .map((m) => ({
            meal_type: m.meal_type,
            description: m.description,
            purine_estimate: m.purine_estimate || null,
          })),
      };

      const saved = await api<DailyReport>("/api/v1/reports", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setTodayReport(saved);
      Alert.alert("저장 완료", "오늘의 보고가 저장되었습니다.");
    } catch (err: any) {
      Alert.alert("저장 실패", err?.message ?? "");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>
          {todayReport ? "오늘 보고 완료" : "오늘 아직 보고하지 않았습니다"}
        </Text>
        <Text style={styles.bannerSub}>{today()}</Text>
      </View>

      <Section title="건강 정보">
        <NumField
          label="체중 (kg)"
          value={form.weight_kg}
          onChange={(v) => setField("weight_kg", v)}
        />
        <NumField
          label="요산 수치 (mg/dL)"
          value={form.uric_acid}
          onChange={(v) => setField("uric_acid", v)}
        />
        <NumField
          label="수분 섭취 (ml)"
          value={form.water_intake_ml}
          onChange={(v) => setField("water_intake_ml", v)}
        />
        <NumField
          label="운동 시간 (분)"
          value={form.exercise_minutes}
          onChange={(v) => setField("exercise_minutes", v)}
        />
      </Section>

      <Section title="통증">
        <NumField
          label="통증 강도 (0~10)"
          value={form.pain_level}
          onChange={(v) => setField("pain_level", v)}
        />
        <TextField
          label="통증 부위"
          value={form.pain_location}
          onChange={(v) => setField("pain_location", v)}
        />
        <SwitchRow
          label="통풍 발작 발생"
          value={form.flare_up}
          onChange={(v) => setField("flare_up", v)}
        />
      </Section>

      <Section title="복약">
        <SwitchRow
          label="오늘 약 복용"
          value={form.medication_taken}
          onChange={(v) => setField("medication_taken", v)}
        />
      </Section>

      <Section title="식단">
        {meals.map((m, i) => (
          <View key={`${m.meal_type}-${i}`} style={{ marginBottom: 10 }}>
            <Text style={styles.label}>{MEAL_LABEL[m.meal_type]}</Text>
            <TextInput
              style={styles.input}
              multiline
              placeholder="음식 / 양 / 특이사항"
              value={m.description}
              onChangeText={(v) => updateMeal(i, "description", v)}
            />
            <TextInput
              style={[styles.input, { marginTop: 6 }]}
              placeholder="퓨린 함량 추정 (낮음/중간/높음)"
              value={m.purine_estimate}
              onChangeText={(v) => updateMeal(i, "purine_estimate", v)}
            />
          </View>
        ))}
        <TouchableOpacity onPress={addSnack} style={styles.linkButton}>
          <Text style={styles.linkText}>+ 간식 추가</Text>
        </TouchableOpacity>
      </Section>

      <Section title="비고">
        <TextInput
          style={[styles.input, { minHeight: 80 }]}
          multiline
          placeholder="관리자에게 전달할 메모"
          value={form.notes}
          onChangeText={(v) => setField("notes", v)}
        />
      </Section>

      <TouchableOpacity
        style={[styles.submitButton, saving && { opacity: 0.6 }]}
        disabled={saving}
        onPress={submit}
      >
        <Text style={styles.submitText}>
          {saving ? "저장 중..." : todayReport ? "보고 수정" : "오늘 보고 저장"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        keyboardType="decimal-pad"
        onChangeText={onChange}
      />
    </View>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} />
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.label}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 60, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  banner: {
    backgroundColor: "#eef6ff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  bannerTitle: { fontSize: 16, fontWeight: "700", color: "#1d4ed8" },
  bannerSub: { color: "#64748b", marginTop: 4 },
  section: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  label: { fontSize: 13, color: "#475569", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "white",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  linkButton: { paddingVertical: 8 },
  linkText: { color: "#2563eb", fontWeight: "600" },
  submitButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { color: "white", fontWeight: "700", fontSize: 16 },
});
