import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, Text, TouchableOpacity } from "react-native";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "@/lib/push";
import { tabIcons } from "@/lib/images";

// 서브 화면용 뒤로가기 버튼 (헤더 좌측, 눈에 거슬리지 않는 표준 위치)
function HeaderBack() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/home"))}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{ paddingHorizontal: 14, paddingVertical: 4 }}
    >
      <Text style={{ fontSize: 26, color: "#2563eb", lineHeight: 28 }}>‹</Text>
    </TouchableOpacity>
  );
}

const hiddenScreen = (title: string) => ({
  href: null as null,
  title,
  headerLeft: () => <HeaderBack />,
});

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
      backBehavior="history"
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { color: "#1e293b" },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      {/* ===== 노출 탭: 홈 · 마일리지 · 인바디 · 정보 · 알림 ===== */}
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
        name="records"
        options={{
          title: "인바디",
          tabBarLabel: "인바디",
          tabBarIcon: ({ focused }) => (
            <TabIcon source={tabIcons.records} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="info"
        options={{
          title: "정보",
          tabBarLabel: "정보",
          tabBarIcon: ({ focused }) => (
            <TabIcon source={tabIcons.info} focused={focused} />
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

      {/* ===== 숨김 라우트 (탭바 미노출, 네비게이션으로만 진입) — 헤더 뒤로가기 제공 ===== */}
      <Tabs.Screen name="profile" options={hiddenScreen("내 정보")} />
      <Tabs.Screen name="history" options={hiddenScreen("나의 기록")} />
      <Tabs.Screen name="meal-scores" options={hiddenScreen("내 기록")} />
      <Tabs.Screen name="survey" options={hiddenScreen("설문")} />
      <Tabs.Screen name="survey-view" options={hiddenScreen("설문 응답")} />
      <Tabs.Screen name="board" options={hiddenScreen("공지 · FAQ")} />
      <Tabs.Screen name="board-detail" options={hiddenScreen("게시글")} />
      <Tabs.Screen name="cardnews" options={hiddenScreen("카드뉴스")} />
      <Tabs.Screen name="cardnews-detail" options={hiddenScreen("카드뉴스")} />
    </Tabs>
  );
}
