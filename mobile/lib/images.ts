// 정적 require() 경로 모음 (Metro 번들러는 동적 경로를 지원하지 않으므로 중앙 집중)
import type { ImageSourcePropType } from "react-native";

export const logoIcon: ImageSourcePropType = require("../image/logo_icon_refac_remove.png");

export const tabIcons = {
  mileage: require("../image/milege2.png"),
  alarm: require("../image/alarm2.png"),
  home: require("../image/home2.png"),
} as const;

// 카드뉴스 image_key → 번들 이미지 매핑 (샘플). 키가 없으면 URL로 간주.
const cardNewsImages: Record<string, ImageSourcePropType> = {
  cardnews_sample1: require("../image/cardnews_sample1.png"),
  cardnews_sample2: require("../image/cardnews_sample2.png"),
  cardnews_sample3: require("../image/cardnews_sample3.png"),
};

export function resolveCardImage(imageKey: string): ImageSourcePropType {
  if (cardNewsImages[imageKey]) return cardNewsImages[imageKey];
  return { uri: imageKey };
}
