# 모바일 개발·빌드 "도구" 컨테이너 (Expo / React Native)
#
# 주의: 모바일 앱은 휴대폰에서 도는 것이라 서버처럼 "실행"되지 않는다.
#       실제 빌드/OTA(eas build, eas update)는 EAS(Expo 클라우드)에서 수행되며,
#       이 컨테이너는 그 CLI·Node·의존성 "환경"만 이식 가능하게 담는다.
#
# 인증: 실행 시 EXPO_TOKEN(Expo 액세스 토큰)을 환경변수로 전달하면 무인 실행된다.
#       (expo.dev → Account → Access tokens 에서 발급)
#
# 사용 예 (저장소 루트에서):
#   docker compose -f docker-compose.prod.yml --profile mobile build mobile-builder
#   docker compose -f docker-compose.prod.yml --profile mobile run --rm mobile-builder \
#       eas update --branch production --platform all --message "설명"

FROM node:20-bookworm

WORKDIR /app

# EAS CLI 전역 설치
RUN npm install -g eas-cli

# 의존성 먼저 설치(레이어 캐시)
COPY package.json package-lock.json ./
RUN npm ci

# 소스 복사 (실사용 시 compose 볼륨으로 호스트 소스를 덮어써 라이브 개발)
COPY . .

CMD ["bash"]
