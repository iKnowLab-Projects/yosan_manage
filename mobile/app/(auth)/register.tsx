import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "@/lib/api";

const PRIVACY_URL =
  "https://iknowlab-projects.github.io/yosan_manage/privacy.html";
const TERMS_URL = "https://iknowlab-projects.github.io/yosan_manage/terms.html";

type RegisterPayload = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  height_cm?: number;
  baseline_weight_kg?: number;
  baseline_uric_acid?: number;
  medications?: string;
};

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    password2: "",
    name: "",
    phone: "",
    birth_date: "",
    gender: "",
    height_cm: "",
    baseline_weight_kg: "",
    baseline_uric_acid: "",
    medications: "",
  });
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const set = (k: keyof typeof form, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  async function submit() {
    if (!form.email || !form.password || !form.name) {
      Alert.alert("입력 오류", "이메일, 비밀번호, 이름은 필수입니다.");
      return;
    }
    if (!agreed) {
      Alert.alert(
        "동의 필요",
        "개인정보 처리방침 및 이용약관에 동의해야 가입할 수 있습니다.",
      );
      return;
    }
    if (form.password.length < 6) {
      Alert.alert("입력 오류", "비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (form.password !== form.password2) {
      Alert.alert("입력 오류", "비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (form.birth_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.birth_date)) {
      Alert.alert("입력 오류", "생년월일은 YYYY-MM-DD 형식이어야 합니다.");
      return;
    }

    const payload: RegisterPayload = {
      email: form.email.trim(),
      password: form.password,
      name: form.name.trim(),
    };
    if (form.phone) payload.phone = form.phone;
    if (form.birth_date) payload.birth_date = form.birth_date;
    if (form.gender) payload.gender = form.gender;
    if (form.height_cm) payload.height_cm = Number(form.height_cm);
    if (form.baseline_weight_kg)
      payload.baseline_weight_kg = Number(form.baseline_weight_kg);
    if (form.baseline_uric_acid)
      payload.baseline_uric_acid = Number(form.baseline_uric_acid);
    if (form.medications) payload.medications = form.medications;

    setLoading(true);
    try {
      await api("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      Alert.alert(
        "신청 완료",
        "관리자 승인 후 로그인할 수 있습니다.",
        [{ text: "확인", onPress: () => router.replace("/(auth)/login") }],
      );
    } catch (err: any) {
      Alert.alert("가입 실패", err?.message ?? "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={styles.title}>가입 신청</Text>
        <Text style={styles.subtitle}>
          관리자 승인 후 로그인할 수 있습니다.
        </Text>

        <Section title="필수">
          <Field label="이메일" required>
            <TextInput
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(v) => set("email", v)}
            />
          </Field>
          <Field label="비밀번호 (6자 이상)" required>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={form.password}
              onChangeText={(v) => set("password", v)}
            />
          </Field>
          <Field label="비밀번호 확인" required>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={form.password2}
              onChangeText={(v) => set("password2", v)}
            />
          </Field>
          <Field label="이름" required>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => set("name", v)}
            />
          </Field>
        </Section>

        <Section title="개인정보 (선택)">
          <Field label="전화번호">
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(v) => set("phone", v)}
            />
          </Field>
          <Field label="생년월일 (YYYY-MM-DD)">
            <TextInput
              style={styles.input}
              placeholder="예: 1980-01-31"
              value={form.birth_date}
              onChangeText={(v) => set("birth_date", v)}
            />
          </Field>
          <Field label="성별">
            <View style={styles.genderRow}>
              {(
                [
                  { v: "male", label: "남성" },
                  { v: "female", label: "여성" },
                  { v: "other", label: "기타" },
                ] as const
              ).map((g) => (
                <TouchableOpacity
                  key={g.v}
                  onPress={() => set("gender", form.gender === g.v ? "" : g.v)}
                  style={[
                    styles.genderChip,
                    form.gender === g.v && styles.genderChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.genderChipText,
                      form.gender === g.v && { color: "white" },
                    ]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>
        </Section>

        <Section title="의료 정보 (선택)">
          <Field label="신장 (cm)">
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={form.height_cm}
              onChangeText={(v) => set("height_cm", v)}
            />
          </Field>
          <Field label="기준 체중 (kg)">
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={form.baseline_weight_kg}
              onChangeText={(v) => set("baseline_weight_kg", v)}
            />
          </Field>
          <Field label="기준 요산 수치 (mg/dL)">
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={form.baseline_uric_acid}
              onChangeText={(v) => set("baseline_uric_acid", v)}
            />
          </Field>
          <Field label="복용 약물">
            <TextInput
              style={[styles.input, { minHeight: 70 }]}
              multiline
              value={form.medications}
              onChangeText={(v) => set("medications", v)}
            />
          </Field>
        </Section>

        <TouchableOpacity
          style={styles.consent}
          activeOpacity={0.8}
          onPress={() => setAgreed((a) => !a)}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
            {agreed && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
          <Text style={styles.consentText}>
            <Text
              style={styles.consentLink}
              onPress={() => Linking.openURL(PRIVACY_URL)}
            >
              개인정보 처리방침
            </Text>
            {" 및 "}
            <Text
              style={styles.consentLink}
              onPress={() => Linking.openURL(TERMS_URL)}
            >
              이용약관
            </Text>
            에 동의하며, 건강(민감)정보의 수집·이용에 동의합니다. (필수)
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          본 앱은 의료기기가 아니며 정보는 참고용입니다. 의료적 판단은 전문의와 상담하세요.
        </Text>

        <TouchableOpacity
          style={[styles.button, (loading || !agreed) && { opacity: 0.5 }]}
          onPress={submit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "신청 중..." : "가입 신청"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          style={{ marginTop: 16, alignItems: "center" }}
        >
          <Text style={styles.linkText}>이미 계정이 있어요 · 로그인</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={{ color: "#dc2626" }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 24,
    paddingBottom: 60,
    backgroundColor: "#fff",
  },
  title: { fontSize: 24, fontWeight: "700", color: "#1d4ed8" },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  section: {
    backgroundColor: "#f8fafc",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
    fontSize: 13,
  },
  fieldLabel: { fontSize: 12, color: "#475569", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "white",
  },
  genderRow: { flexDirection: "row", gap: 8 },
  genderChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "white",
  },
  genderChipSelected: {
    backgroundColor: "#2563eb",
    borderColor: "#1d4ed8",
  },
  genderChipText: { color: "#334155", fontWeight: "600" },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
  linkText: { color: "#2563eb", fontWeight: "600" },
  consent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: "#2563eb", borderColor: "#1d4ed8" },
  checkboxMark: { color: "white", fontWeight: "800", fontSize: 13 },
  consentText: { flex: 1, fontSize: 13, color: "#475569", lineHeight: 19 },
  consentLink: { color: "#2563eb", fontWeight: "600" },
  disclaimer: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 10,
  },
});
