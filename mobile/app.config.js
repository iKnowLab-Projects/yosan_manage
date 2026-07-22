// 같은 소스코드를 두 개의 Expo 프로젝트로 배포하기 위한 동적 설정.
//
//   - 기본(Android)      : 내 프로젝트 (owner=ghkook,        projectId=32d09c89…)
//   - APP_TARGET=ios     : 동료 프로젝트 (owner=ghkooks-team, projectId=cf97fda0…) — iOS TestFlight 전용
//
// app.json 은 그대로 base 로 사용된다(name/slug/ios/android/plugins/extra.apiBase 등).
// 여기서는 프로젝트 정체성(owner · updates.url · extra.eas.projectId)만 대상별로 덮어쓴다.
// → apiBase 는 계속 app.json 에서 관리되므로 터널 자동화 스크립트도 그대로 동작한다.
//
// 사용:
//   Android → eas update --branch preview     --platform android
//   iOS     → set APP_TARGET=ios (PowerShell: $env:APP_TARGET="ios") 후
//             eas update --branch <iOS 채널> --platform ios

const PROJECTS = {
  android: {
    owner: "ghkook",
    projectId: "32d09c89-fecd-4b4f-9a0d-d9456e4eb4dc",
  },
  ios: {
    owner: "ghkooks-team",
    projectId: "cf97fda0-cb16-435e-b09a-b17324369682",
  },
};

module.exports = ({ config }) => {
  const target = process.env.APP_TARGET === "ios" ? "ios" : "android";
  const p = PROJECTS[target];

  return {
    ...config,
    owner: p.owner,
    updates: {
      ...(config.updates || {}),
      url: `https://u.expo.dev/${p.projectId}`,
    },
    extra: {
      ...(config.extra || {}),
      eas: {
        ...((config.extra && config.extra.eas) || {}),
        projectId: p.projectId,
      },
    },
  };
};
