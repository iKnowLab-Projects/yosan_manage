import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Expo Go(SDK 53+)에서는 원격 푸시 기능이 제거되어 건너뛴다.
  // 실제 development build / 배포 앱에서는 정상 동작한다.
  if (Constants.appOwnership === "expo") {
    console.warn("Expo Go에서는 푸시 알림을 건너뜁니다. 개발 빌드에서 테스트하세요.");
    return null;
  }

  if (!Device.isDevice) {
    console.warn("푸시 알림은 실제 디바이스에서만 동작합니다.");
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const tokenResp = await Notifications.getExpoPushTokenAsync();
  const token = tokenResp.data;

  try {
    await api("/api/v1/notifications/device-token", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch (err) {
    console.warn("디바이스 토큰 등록 실패:", err);
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "기본",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return token;
}
