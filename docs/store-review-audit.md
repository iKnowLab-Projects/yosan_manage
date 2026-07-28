# 스토어 심사 가이드라인 체크 & 자체 감사 결과

> 대상: **통풍식이 마일리지** (Expo React Native, iOS + Android)
> 기준: Apple *App Store Review Guidelines* · Google *Play Developer Program Policies*
> 감사일: 2026-07-28 · 근거: 코드/설정 실측 (파일:라인 표기)
> 판정 범례: ✅ 통과 · ⚠️ 주의(조치 권장) · ❌ 위반/제출 차단(반드시 조치) · ➖ 해당 없음 · ⬜ 콘솔/외부 작업

---

## 0. 요약 — 우선순위별 조치 목록

| # | 심각도 | 항목 | 근거 | 조치 상태 |
|---|---|---|---|---|
| 1 | ❌ **차단** | 백엔드 `apiBase`가 임시 Cloudflare 터널 | `app.json` extra.apiBase | 🔧 **배선 완료** — `app.config.js`가 EAS 환경변수 `API_BASE`(고정 도메인) 주입 지원. **남은 사용자 작업**: 운영 도메인 값 확정 후 EAS env 설정 + 재빌드 |
| 2 | ❌ **차단** | 데모/게스트 접근 불가 + 가입은 관리자 승인 필요 | `register.tsx:101`, `index.tsx:24` | ⬜ **사용자 작업** — 심사용 사전승인 환자 계정을 만들어 App Review 노트 / Play 테스트 안내에 기입 |
| 3 | ⚠️ 높음 | Play 계정삭제: 앱 외 웹 삭제 경로 없음 | `profile.tsx` (앱 내만 존재) | ✅ **수정됨** — `docs/account-deletion.html` 추가(앱 내 삭제 + 이메일 삭제 요청 안내). URL을 Play Console 등록 필요 |
| 4 | ⚠️ 높음 | Android `usesCleartextTraffic: true` | `app.json` | ✅ **수정됨** — `false`로 전환 |
| 5 | ⚠️ 중간 | 인증 토큰을 AsyncStorage 평문 저장 | `lib/api.ts` | ✅ **수정됨** — SecureStore(Keychain/Keystore)로 이전 + 레거시 자동 마이그레이션 |
| 6 | ⚠️ 중간 | 정책 문서 `【 】` 미기입 + Pages 미활성 | `docs/privacy.html`, `terms.html`, `account-deletion.html` | ⬜ **사용자 작업** — 실제 값 기입·법률 검토 후 GitHub Pages 활성화 |
| 7 | ⚠️ 낮음 | 플레이스홀더 전화번호 `010-XXXX-XXXX` 노출 | `login.tsx`, `mileage.tsx` | ✅ **수정됨** — 연락처를 `lib/support.ts` 단일 소스로 분리, 미설정 시 노출 안 함 |
| 8 | ⬜ 콘솔 | 데이터 안전/개인정보 라벨, 스크린샷, 연령등급 | — | ⬜ **사용자 작업** — Play Console / App Store Connect 입력 |

> **결론: 코드로 수정 가능한 항목(3·4·5·7)은 모두 조치 완료.** 남은 것은 인프라/계정/콘솔 작업인
> ① 고정 운영 도메인(배선은 완료) ② 심사용 데모 계정 ③ 정책 문서 값 기입·Pages 활성화 ④ 콘솔 양식 입력.

---

## A. Apple — App Store Review Guidelines

### 1. Safety
| 조항 | 내용 | 판정 | 근거·비고 |
|---|---|---|---|
| 1.1 | 불쾌·유해 콘텐츠 | ✅ | 의료 건강관리 앱, 유해 콘텐츠 없음 |
| 1.2 | 사용자 생성 콘텐츠(신고/차단/모더레이션) | ➖ | 사용자 간 콘텐츠·댓글·채팅 **없음**. 모든 콘텐츠는 관리자 발행(카드뉴스·공지·알림), 사용자 입력(설문·기록)은 본인·연구진에게만 제출. 1.2 요건 비해당 |
| 1.4.1 | 의료 앱 — 부정확 정보/오해 소지 금지, 면책 필요 | ✅ | 면책 고지 3곳: `home.tsx:127`, `register.tsx:268`, `profile.tsx:18/157`. "의료기기 아님·참고용·전문의 상담" 명시. 진단/치료 주장 없음 |
| 1.5 | 개발자 연락처(지원 URL/이메일) | ⚠️ | 지원 연락처를 스토어 리스팅에 기입 필요. 앱 내 문의 전화가 플레이스홀더(`login.tsx:107`) → 실제 값 필요 |

### 2. Performance
| 조항 | 내용 | 판정 | 근거·비고 |
|---|---|---|---|
| 2.1 | 완성도 — 크래시·미완성·리뷰어 접근 불가 금지 | ❌ | **(a)** `apiBase`가 임시 터널 → 심사 시점 접속 불가로 "빈 화면/오류" 리젝 위험(요약 #1). **(b)** 로그인 필수 + 관리자 승인제 → 리뷰어가 로그인 불가(요약 #2). 크래시 자체는 방어됨(모든 네트워크 오류 try/catch+Alert, `lib/api.ts:76-83`) |
| 2.3.1 | 숨겨진/미완성 기능 | ⚠️ | 플레이스홀더 전화번호(`mileage.tsx:17`) 등 정리 |
| 2.5.1 | 공개 API만 사용 | ✅ | Expo 표준 모듈만(notifications·video·updates). 비공개 API 없음 |
| 2.5.2 | 실행 중 코드 다운로드/변경 금지(예외: OTA) | ✅ | expo-updates OTA는 Apple 허용 범위(동일 기능 JS 갱신). 네이티브 우회 없음 |

### 3. Business
| 조항 | 판정 | 근거 |
|---|---|---|
| 3.x 결제/구독 | ➖ | 인앱 결제·구독·유료 콘텐츠 **없음**(StoreKit/IAP 코드 없음). 비해당 |

### 4. Design
| 조항 | 내용 | 판정 | 근거·비고 |
|---|---|---|---|
| 4.2 | 최소 기능성 | ✅ | 건강 보고 열람·마일리지·설문·InBody·카드뉴스(동영상)·알림 등 충분한 네이티브 기능 |
| 4.8 | 로그인 서비스(제3자 로그인 시 Sign in with Apple 병행) | ➖ | 소셜/제3자 로그인 미사용(자체 이메일/비밀번호). Sign in with Apple **불필요** |
| 5.1.1(v) | **인앱 계정 삭제** | ✅ | "회원 탈퇴" → `DELETE /auth/me`, 전 데이터 영구삭제 고지(`profile.tsx:57-79,167`). Apple 요건 충족 |

### 5. Legal
| 조항 | 내용 | 판정 | 근거·비고 |
|---|---|---|---|
| 5.1.1(i) | 개인정보 처리방침 링크 필수 | ⚠️ | 앱·리스팅에 정책 링크 존재(`profile.tsx:15-17`, `register.tsx:17-19`)하나 GitHub Pages 미활성·`【 】` 미기입 → **활성화·기입 필요** |
| 5.1.1(ii) | 권한 요청 시 목적 문자열 | ✅ | 사용 권한은 **푸시 알림뿐**. 카메라/사진/위치/마이크/연락처 API 미사용 → `NS*UsageDescription` 불필요(설정 grep로 확인) |
| 5.1.1(iii) | 데이터 최소수집·동의 | ✅ | 가입 시 건강(민감)정보 수집 **명시 동의 체크박스** 게이트(`register.tsx:242-266`) |
| 5.1.2 | 데이터 이용/제3자 공유 | ⚠️ | 정책 문서에 위탁·공유 항목 `【 】` 채우고 App Privacy 라벨과 일치시켜야 함 |
| 5.1.3 | **건강·의료 데이터** — 광고 이용 금지, 정책 명시 | ✅/⚠️ | 요산·복약·통증·체성분 등 건강데이터 수집. 광고 SDK 없음(✅). 정책에 건강데이터 처리 명시됨(⚠️ 값 기입·라벨 일치 필요) |
| 5.1.5 | 위치 서비스 | ➖ | 위치 미사용 |

### App Privacy(영양성분표) — App Store Connect 입력
- 선언 필요 데이터: **건강·피트니스**(요산·체성분·통증·복약), **연락처 정보**(이메일·전화), **식별자**, **사용 데이터**(콘텐츠 조회). 광고 트래킹 없음 → "데이터 추적 안 함". ⬜ 콘솔 입력.

---

## B. Google Play — Developer Program Policies

| 정책 | 내용 | 판정 | 근거·비고 |
|---|---|---|---|
| Data safety form | 수집·공유 데이터 신고(콘솔) | ⬜ | 건강데이터·개인식별정보 수집 정직하게 선언 필요. 전송 암호화(HTTPS)·삭제 요청 가능 표기 |
| Health apps | 건강 앱 정책·면책 | ✅ | 의료기기 아님 면책 명시. 진단/치료 주장 없음 |
| Health Connect/민감권한 | — | ➖ | Health Connect·SMS·통화기록·접근성 등 민감권한 미사용 |
| User Data / **계정 삭제** | 앱 내 **및 앱 외(URL) 삭제 경로** 모두 요구 | ✅ | 앱 내 삭제(`profile.tsx`) + 앱 외 삭제요청 페이지 `docs/account-deletion.html` 추가. Console에 URL 등록만 남음 |
| Permissions | 최소권한·목적 | ✅ | 위험권한은 알림(POST_NOTIFICATIONS)뿐. 과다권한 없음 |
| Broken functionality | 정상 동작 | ❌→🔧 | 임시 터널 `apiBase` 문제. `API_BASE` env 주입 배선 완료 → 고정 도메인 값·재빌드만 남음(요약 #1) |
| Cleartext traffic | 평문 HTTP 지양 | ✅ | `usesCleartextTraffic: false` 로 전환 완료 |
| 대상연령·콘텐츠 등급 | 설문 | ⬜ | 콘솔 IARC 설문 |
| 개인정보처리방침 URL | 콘솔·앱 내 | ⚠️ | Pages 활성화·값 기입 후 URL 등록 |

---

## C. 데이터 보안(양 스토어 공통) — 백엔드 실측
| 항목 | 판정 | 근거 |
|---|---|---|
| 비밀번호 저장 | ✅ | bcrypt 해싱(`core/security.py:9,13`) |
| 인증 | ✅ | JWT 서명(`core/security.py:25`) |
| 전송 암호화 | ✅(운영 전제) | 앱은 HTTPS 호출. 단 운영 도메인 확정 필요 |
| CORS | ✅ | 환경변수로 제한(`main.py:18`, 운영 예시 `admin.example.com`) |
| 계정삭제 데이터 정리 | ✅ | `DELETE /auth/me` → DB CASCADE로 하위데이터 삭제 |
| 클라이언트 토큰 저장 | ✅ | SecureStore(iOS Keychain / Android Keystore)로 이전 완료. 레거시 평문 값 자동 마이그레이션·삭제(`lib/api.ts`) |
| 서버 시크릿 | ⚠️ | 운영 `SECRET_KEY`/`JWT` 무작위 값 주입 확인(`.env.production.example`) |

---

## D. 반드시 선행할 2가지 (제출 전 필수)

1. **고정 운영 백엔드 도메인**: 임시 터널 → 고정 HTTPS 도메인으로 `app.json extra.apiBase` 교체 후 **재빌드**(OTA 아님, 빌드에 포함되는 값). 없으면 리뷰어 접속 불가로 확정 리젝.
2. **심사용 데모 환자 계정**: 관리자 승인까지 마친 로그인 가능한 계정을 준비하여
   - App Store Connect → *App Review Information* 의 데모 계정 필드
   - Play Console → *App content → App access* / 테스트 안내
   에 아이디/비밀번호 기입.

## E. 코드로 보완한 항목 — ✅ 완료 (branch `feat/store-compliance`)
- [x] `usesCleartextTraffic: false` 전환 — `app.json`
- [x] 토큰 저장 AsyncStorage → `expo-secure-store` 이전(+레거시 자동 마이그레이션) — `lib/api.ts`
- [x] 플레이스홀더 전화번호 제거 — 연락처를 `lib/support.ts` 단일 소스로 분리, 미설정 시 UI 비노출 — `login.tsx`, `mileage.tsx`
- [x] Play용 계정삭제 요청 안내 페이지 추가 — `docs/account-deletion.html` (+`index.html` 링크)
- [x] 운영 도메인 주입 배선 — `app.config.js`가 EAS env `API_BASE`로 고정 도메인 주입 지원

## E-2. 값이 정해지면 반영할 항목(코드 준비 완료, 입력만 필요)
- [ ] `lib/support.ts`의 `SUPPORT_PHONE` / `SUPPORT_EMAIL` 실제 값
- [ ] EAS 환경변수 `API_BASE` = 고정 운영 도메인 → 재빌드
- [ ] 정책 3문서(`privacy`·`terms`·`account-deletion`)의 `【 】` 기입

## F. 콘솔/외부 작업(개발 범위 밖)
- [ ] GitHub Pages 활성화(Settings→Pages→`main`/`docs`)
- [ ] App Privacy 라벨(App Store Connect) · Data safety 양식(Play)
- [ ] 스크린샷·앱 설명·연령등급·지원 연락처
- [ ] 정책 문서 법률 검토
