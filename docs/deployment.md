# V2 단독 배포

저장소 루트의 `index.html` → `apps/play/src/main.ts`가 유일한 빌드 진입점이다. Vite + TypeScript + Three.js 정적 사이트로, 서버/DB/환경변수 없이 `dist/`를 호스팅한다.

## 로컬 확인

```powershell
npm.cmd ci
npm.cmd run test
npm.cmd run build
npm.cmd run dev
```

개발 서버는 `0.0.0.0:5173`에서 같은 Wi-Fi의 휴대폰 접속을 허용한다. 사진 저장의 네이티브 메뉴는 HTTPS 배포 주소에서 실기기 확인한다. LAN HTTP는 PNG 길게 누르기 대체 흐름을 사용한다.

## Vercel 설정

- Framework: Vite
- Root Directory: `package.json`과 `index.html`이 있는 저장소 루트 (`apps/play`가 아님)
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`
- 환경변수: 현재 필요 없음

`package-lock.json`은 업로드한다. `node_modules/`, `dist/`, 테스트 산출물, `.env` 계열 파일은 업로드하지 않는다. 개발 전용 `?stress=` 진입 코드는 프로덕션 빌드에서 제거된다. 실제 GitHub 커밋/푸시와 Vercel 연결은 별도 단계다.

## 로컬에만 남기는 파일

`.gitignore`로 아래 파일들을 제외했으며 삭제/이동하지 않았다.

- `legacy/`, `apps/mobile/`
- `packages/game-core/`, `packages/activity-core/`
- `tests/game.test.ts`
- V1 브라우저 스크립트: `scripts/browser-check.js`, `scripts/lan-check.js`, `scripts/sound-check.js`
- V1 구현 문서: `docs/prototype.md`
- 원본 참고 이미지: `ex/`

V2 효과음은 `apps/play/src/audio.ts`에 독립적으로 있다. V1의 두 소리 레시피만 가져왔으며 레거시 설정/로컬 저장소/UI는 포함하지 않는다. 기본 타입 검사 및 Vitest 설정도 V2만 대상으로 한다. 로컬 개발 서버에서는 남아 있는 `/legacy/`가 열릴 수 있지만, GitHub에 복제한 프로젝트와 `dist/`에는 포함되지 않는다.

이 로컬 보관본은 GitHub에 백업되지 않는다. PC 이동/정리 전에 별도 백업이 필요하다. 이미 추적 중인 파일에는 `.gitignore`만으로 추적 해제가 되지 않지만, 이번 정리 시점에는 저장소에 추적 파일이 없었다.
