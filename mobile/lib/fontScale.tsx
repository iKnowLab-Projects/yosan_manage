import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// 앱 전역 글씨 크기 배율. 사용자가 [설정]/[설문] 화면에서 조절하며 기기에 저장된다.
export type FontScaleKey = "s" | "m" | "l" | "xl";

const SCALE_VALUES: Record<FontScaleKey, number> = {
  s: 0.9,
  m: 1.0,
  l: 1.15,
  xl: 1.3,
};

export const FONT_SCALE_OPTIONS: { key: FontScaleKey; label: string }[] = [
  { key: "s", label: "작게" },
  { key: "m", label: "보통" },
  { key: "l", label: "크게" },
  { key: "xl", label: "아주 크게" },
];

const STORAGE_KEY = "yosan_font_scale";

type FontScaleCtx = {
  scaleKey: FontScaleKey;
  scale: number;
  setScaleKey: (k: FontScaleKey) => void;
  /** 기준 fontSize 를 현재 배율로 환산 */
  fs: (size: number) => number;
};

const FontScaleContext = createContext<FontScaleCtx>({
  scaleKey: "m",
  scale: 1,
  setScaleKey: () => {},
  fs: (s) => s,
});

export function FontScaleProvider({ children }: { children: React.ReactNode }) {
  const [scaleKey, setKey] = useState<FontScaleKey>("m");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v && v in SCALE_VALUES) setKey(v as FontScaleKey);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<FontScaleCtx>(() => {
    const scale = SCALE_VALUES[scaleKey];
    return {
      scaleKey,
      scale,
      setScaleKey: (k: FontScaleKey) => {
        setKey(k);
        AsyncStorage.setItem(STORAGE_KEY, k).catch(() => {});
      },
      fs: (size: number) => Math.round(size * scale),
    };
  }, [scaleKey]);

  return (
    <FontScaleContext.Provider value={value}>
      {children}
    </FontScaleContext.Provider>
  );
}

export function useFontScale() {
  return useContext(FontScaleContext);
}
