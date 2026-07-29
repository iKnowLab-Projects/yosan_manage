import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import UpdateGate from "@/components/UpdateGate";
import { setUnauthorizedHandler } from "@/lib/api";
import { FontScaleProvider } from "@/lib/fontScale";

export default function RootLayout() {
  const router = useRouter();

  // 401(토큰 만료/무효) 발생 시 로그인 화면으로 자동 이동
  useEffect(() => {
    setUnauthorizedHandler(() => router.replace("/(auth)/login"));
    return () => setUnauthorizedHandler(null);
  }, [router]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <FontScaleProvider>
        <UpdateGate>
          <Stack screenOptions={{ headerShown: false }} />
        </UpdateGate>
      </FontScaleProvider>
    </SafeAreaProvider>
  );
}
