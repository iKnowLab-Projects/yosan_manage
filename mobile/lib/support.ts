// 앱에서 안내하는 운영/문의 연락처 — 단일 소스.
// 실제 운영 값으로 교체하세요. 비워두면(기본) UI에 가짜 번호를 노출하지 않고
// 안내 문구만 표시합니다. (스토어 심사: 미완성/플레이스홀더 노출 금지)
export const SUPPORT_PHONE = "010-9560-7916";
export const SUPPORT_EMAIL = "iknowlab1@gmail.com";

// 숫자만 남긴 다이얼용 문자열. 유효한 전화번호일 때만 값이 있음.
export function dialablePhone(): string | null {
  const digits = SUPPORT_PHONE.replace(/[^0-9]/g, "");
  return digits.length >= 8 ? digits : null;
}
