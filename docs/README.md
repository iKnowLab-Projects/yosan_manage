# 정책 문서 / 스토어 심사 준비

이 폴더(`docs/`)의 정적 페이지는 앱·스토어에서 링크하는 **개인정보 처리방침·이용약관**입니다.

- `privacy.html` — 개인정보 처리방침 (건강/민감정보 반영)
- `terms.html` — 이용약관 (의료 면책 포함)
- `index.html` — 두 문서로 가는 랜딩

## GitHub Pages 호스팅 (URL 활성화 — 1회 설정)
저장소 **Settings → Pages → Build and deployment → Source: "Deploy from a branch" → Branch: `main` / 폴더 `/docs`** 저장.
→ 공개 URL:
- `https://iknowlab-projects.github.io/yosan_manage/privacy.html`
- `https://iknowlab-projects.github.io/yosan_manage/terms.html`

앱(`mobile/app/(app)/profile.tsx`, `mobile/app/(auth)/register.tsx`)과 스토어 리스팅이 위 URL을 참조합니다.

> ⚠️ 두 문서의 `【 】` 자리(운영 기관명·대표자·연락처·개인정보 보호책임자·시행일·수탁사 등)를
> 실제 값으로 채우고, 배포 전 **법률 검토**를 받으세요. (건강 앱은 특히 민감정보 동의·안전조치가 중요)

## 스토어 심사 남은 항목 (코드/문서로 완료된 것 제외)
| 항목 | 상태 | 비고 |
|---|---|---|
| 인앱 회원 탈퇴 | ✅ 코드 | `DELETE /auth/me` + 프로필 |
| 의료 면책 고지 | ✅ 코드 | 홈·프로필·약관·가입 화면 |
| 개인정보/약관 링크 + 가입 동의 | ✅ 코드/문서 | 이 폴더 + 앱 링크·동의 체크박스 |
| 개인정보 처리방침·약관 문서 | ✅ 초안 | 【 】 채우고 법률 검토 필요 |
| GitHub Pages 활성화 | ⬜ 설정 | 위 절차 (1회) |
| **운영 백엔드 고정 HTTPS 도메인** | ⬜ 인프라 | 앱 `apiBase`를 임시 터널→운영 도메인으로 (재빌드) |
| 심사용 데모(환자) 계정 | ⬜ 준비 | App Store Connect 심사 노트에 기입 |
| 데이터 안전 양식/개인정보 라벨 | ⬜ 콘솔 | Play Console · App Store Connect |
| 스토어 리스팅(스크린샷·연령등급·정책 URL) | ⬜ 콘솔 | — |
| Android `google-services.json` | ⬜ 파일 | EAS 파일 환경변수로 등록 후 Android 재빌드 |
