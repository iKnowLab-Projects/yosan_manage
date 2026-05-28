import { Tabs } from "expo-router";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "@/lib/push";

export default function AppLayout() {
  useEffect(() => {
    registerForPushNotificationsAsync().catch(() => {});

    const sub = Notifications.addNotificationReceivedListener(() => {
      // 추후: 알림 카운터 갱신 등
    });
    return () => sub.remove();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { color: "#1e293b" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "오늘 보고", tabBarLabel: "보고" }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: "보고 이력", tabBarLabel: "이력" }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: "알림함", tabBarLabel: "알림" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "내 정보", tabBarLabel: "내 정보" }}
      />
    </Tabs>
  );
}
