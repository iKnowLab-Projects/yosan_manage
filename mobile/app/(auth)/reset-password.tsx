import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "@/lib/api";

export default function ResetPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !password) {
      Alert.alert("입력 오류", "이메일과 새 비밀번호를 입력하세요.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("입력 오류", "비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== password2) {
      Alert.alert("입력 오류", "비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/v1/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          new_password: password,
          note: note || null,
        }),
      });
      Alert.alert(
        "신청 완료",
        "관리자 승인 후 새 비밀번호로 로그인할 수 있습니다.\n승인 전까지는 기존 비밀번호로 로그인 가능합니다.",
        [{ text: "확인", onPress: () => router.replace("/(auth)/login") }],
      );
    } catch (err: any) {
      Alert.alert("신청 실패", err?.message ?? "오류가 발생했습니다.");
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
        <Text style={styles.title}>비밀번호 초기화</Text>
        <Text style={styles.subtitle}>
          관리자 승인 후 새 비밀번호로 로그인할 수 있습니다.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            · 신청 후 관리자가 본인 확인 후 승인합니다.{"\n"}
            · 승인 전까지는 기존 비밀번호로 계속 로그인 가능합니다.{"\n"}
            · 동일 계정의 이전 신청은 새 신청으로 자동 교체됩니다.
          </Text>
        </View>

        <Field label="이메일" required>
          <TextInput
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </Field>
        <Field label="새 비밀번호 (6자 이상)" required>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </Field>
        <Field label="새 비밀번호 확인" required>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password2}
            onChangeText={setPassword2}
          />
        </Field>
        <Field label="사유 (선택, 관리자가 확인)">
          <TextInput
            style={[styles.input, { minHeight: 70 }]}
            multiline
            placeholder="예: 비밀번호를 잊었습니다."
            value={note}
            onChangeText={setNote}
          />
        </Field>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={submit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "신청 중..." : "초기화 신청"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          style={{ marginTop: 16, alignItems: "center" }}
        >
          <Text style={styles.linkText}>로그인으로 돌아가기</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 16 },
  infoBox: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  infoText: { fontSize: 12, color: "#1e40af", lineHeight: 18 },
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
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
  linkText: { color: "#2563eb", fontWeight: "600" },
});
