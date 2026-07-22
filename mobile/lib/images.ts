// 정적 require() 경로 모음 (Metro 번들러는 동적 경로를 지원하지 않으므로 중앙 집중)
import type { ImageSourcePropType } from "react-native";
import { API_BASE } from "./api";

export const logoIcon: ImageSourcePropType = require("../image/logo_icon_refac_remove.png");

export const tabIcons = {
  mileage: require("../image/milege2.png"),
  alarm: require("../image/alarm2.png"),
  home: require("../image/home2.png"),
  info: require("../image/info.png"),
} as const;

// 카드뉴스 image_key → 번들 이미지 매핑 (샘플). 키가 없으면 URL로 간주.
const cardNewsImages: Record<string, ImageSourcePropType> = {
  cardnews_sample1: require("../image/cardnews_sample1.png"),
  cardnews_sample2: require("../image/cardnews_sample2.png"),
  cardnews_sample3: require("../image/cardnews_sample3.png"),
};

// 번들 샘플 키 / 외부 URL / 백엔드 업로드 상대경로(/uploads/..) 를 모두 해석.
export function resolveImage(key?: string | null): ImageSourcePropType {
  if (!key) return { uri: "" };
  if (cardNewsImages[key]) return cardNewsImages[key];
  if (/^https?:\/\//.test(key)) return { uri: key };
  if (key.startsWith("/")) return { uri: `${API_BASE}${key}` }; // 백엔드 업로드
  return { uri: key };
}

// 하위 호환 별칭 (기존 카드뉴스 화면들이 사용)
export const resolveCardImage = resolveImage;
