import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, setSession } from "@/lib/api";

type LoginResp = {
  access_token: string;
  user_id: number;
  name: string;
  role: string;
};

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !password) {
      Alert.alert("입력 오류", "이메일과 비밀번호를 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      const data = await api<LoginResp>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (data.role !== "patient") {
        Alert.alert("로그인 실패", "환자 계정으로만 로그인할 수 있습니다.");
        return;
      }
      await setSession(data.access_token, {
        user_id: data.user_id,
        name: data.name,
        role: data.role,
      });
      router.replace("/(app)/home");
    } catch (err: any) {
      Alert.alert("로그인 실패", err?.message ?? "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>요산 모니터링</Text>
      <Text style={styles.subtitle}>환자 보고 앱</Text>

      <TextInput
        style={styles.input}
        placeholder="이메일"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={submit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "로그인 중..." : "로그인"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.help}>
        계정은 관리자에게 문의해 주세요.
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    backgroundColor: "#fff",
  },
  title: { fontSize: 28, fontWeight: "700", color: "#1d4ed8" },
  subtitle: { fontSize: 16, color: "#64748b", marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
  help: { marginTop: 24, color: "#94a3b8", textAlign: "center" },
});
