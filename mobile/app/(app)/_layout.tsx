import { Tabs } from "expo-router";
import { useEffect } from "react";
import { Image } from "react-native";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "@/lib/push";
import { tabIcons } from "@/lib/images";

// 아이콘이 컬러 일러스트이므로 tintColor 를 적용하지 않고 원본 색을 유지한다.
// 활성/비활성 상태는 투명도와 라벨 색상으로 표현한다.
function TabIcon({ source, focused }: { source: any; focused: boolean }) {
  return (
    <Image
      source={source}
      resizeMode="contain"
      style={{
        width: 28,
        height: 28,
        opacity: focused ? 1 : 0.45,
      }}
    />
  );
}

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
      initialRouteName="home"
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { color: "#1e293b" },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      {/* ===== 노출 탭: 마일리지 · 알림 · 홈 ===== */}
      <Tabs.Screen
        name="mileage"
        options={{
          title: "마일리지",
          tabBarLabel: "마일리지",
          tabBarIcon: ({ focused }) => (
            <TabIcon source={tabIcons.mileage} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "알림함",
          tabBarLabel: "알림",
          tabBarIcon: ({ focused }) => (
            <TabIcon source={tabIcons.alarm} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: "홈",
          tabBarLabel: "홈",
          tabBarIcon: ({ focused }) => (
            <TabIcon source={tabIcons.home} focused={focused} />
          ),
        }}
      />

      {/* ===== 숨김 라우트 (탭바 미노출, 네비게이션으로만 진입) ===== */}
      <Tabs.Screen name="profile" options={{ href: null, title: "내 정보" }} />
      <Tabs.Screen name="history" options={{ href: null, title: "나의 기록" }} />
      <Tabs.Screen name="survey" options={{ href: null, title: "설문" }} />
      <Tabs.Screen name="board" options={{ href: null, title: "공지 · FAQ" }} />
      <Tabs.Screen
        name="board-detail"
        options={{ href: null, title: "게시글" }}
      />
      <Tabs.Screen name="cardnews" options={{ href: null, title: "카드뉴스" }} />
      <Tabs.Screen
        name="cardnews-detail"
        options={{ href: null, title: "카드뉴스" }}
      />
    </Tabs>
  );
}
