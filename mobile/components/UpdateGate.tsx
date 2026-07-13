import * as Updates from "expo-updates";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { logoIcon } from "@/lib/images";

/**
 * OTA(eas update) 자동 적용 게이트.
 *
 * 앱 시작 시(그리고 포그라운드 복귀 시) 최신 버전 여부를 확인해서,
 * 새 업데이트가 있으면 안내 문구를 보여준 뒤 내려받아 앱을 재시작한다.
 * (사용자가 수동으로 앱을 껐다 켜지 않아도 자연스럽게 최신 버전이 적용됨)
 *
 * 개발 빌드/Expo Go 에서는 Updates.isEnabled 가 false 이므로 아무 동작도 하지 않는다.
 */
export default function UpdateGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [updating, setUpdating] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function checkAndApply() {
      if (!Updates.isEnabled || busy.current) return;
      busy.current = true;
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable && mounted) {
          setUpdating(true);
          await Updates.fetchUpdateAsync();
          // 안내 문구를 잠시 노출한 뒤 재시작하여 새 버전 적용
          setTimeout(() => {
            Updates.reloadAsync().catch(() => {
              if (mounted) {
                setUpdating(false);
                busy.current = false;
              }
            });
          }, 1200);
        } else {
          busy.current = false;
        }
      } catch {
        // 네트워크 오류 등은 무시하고 앱은 정상 진행
        busy.current = false;
      }
    }

    checkAndApply();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") checkAndApply();
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  if (updating) {
    return (
      <View style={styles.overlay}>
        <Image source={logoIcon} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>새로운 버전으로 업데이트 중</Text>
        <Text style={styles.body}>
          최신 버전 적용을 위해 앱을 재시작합니다.{"\n"}잠시만 기다려 주세요.
        </Text>
        <ActivityIndicator style={{ marginTop: 22 }} color="#2563eb" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  logo: { width: 72, height: 72, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  body: {
    marginTop: 10,
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 21,
  },
});
