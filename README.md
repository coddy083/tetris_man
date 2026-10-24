# 테트리스 맨 · TETRIS MAN

팩맨 테마의 고스트 블록 테트리스. PC 키보드와 모바일 터치로 플레이합니다.

## 실행

Node.js 20.19+ 또는 22.12+ 권장.

```sh
npm install
npm run dev
```

터미널에 표시된 주소를 브라우저에서 열면 됩니다. 같은 Wi-Fi의 모바일에서는 표시된 Network 주소를 사용하세요.

```sh
npm test       # 규칙 테스트
npm run build # 타입 검사 + 프로덕션 빌드
npm run preview
```

## 조작

| 기능 | PC | 모바일 |
| --- | --- | --- |
| 시작 / 재개 | Enter 또는 버튼 | 시작 / 계속하기 버튼 |
| 이동 | ← → | 좌우 버튼 또는 보드 좌우 스와이프 |
| 시계 방향 회전 | ↑ / X | 회전 버튼 또는 보드 탭 |
| 반시계 방향 회전 | Z | PC 키보드 지원 |
| 소프트 드롭 | ↓ | 내리기 버튼 길게 누르기 |
| 하드 드롭 | Space | 즉시 낙하 버튼 또는 아래로 스와이프 |
| 홀드 | C / Shift | HOLD 패널 터치 |
| 일시정지 | P / Esc | 보드 상단 일시정지 버튼 |

## 게임 규칙

- 10×20 보드, 7-bag 랜덤 생성, SRS 회전과 I 블록 전용 벽차기.
- 다음 블록 5개(좁은 화면은 3개), 착지 가이드, 블록 고정마다 한 번의 홀드.
- 500ms 고정 지연, 이동/회전으로 최대 15회 초기화.
- 줄 삭제 100 / 300 / 500 / 800 × 레벨. T-Spin, Mini, 콤보, Back-to-Back, 전체 보드 비우기 보너스.
- 소프트 드롭 칸당 1점, 하드 드롭 칸당 2점.
- 10줄마다 레벨 상승. 스폰 방해 또는 보드 위로 쌓이면 게임 종료.
- 탭 전환 시 자동 정지, 최고 기록과 환경설정 로컬 저장.

팩맨 스윕, 고스트 파편, 하드 드롭 잔상과 충격, Web Audio로 생성하는 오리지널 아케이드 멜로디와 효과음이 포함됩니다. 소리와 이펙트를 끌 수 있습니다. 로그인이나 외부 API 없이 실행됩니다.

## 구성

- `src/engine.ts`: 화면과 독립적인 규칙·상태·점수 엔진
- `src/renderer.ts`: Canvas 픽셀 고스트와 이펙트
- `src/audio.ts`: Web Audio 효과음과 오리지널 멜로디
- `src/main.ts`: 화면, 키보드, 터치, 접근성, 저장
- `tokens.css`, `src/style.css`: 디자인 토큰, daisyUI와 반응형 스타일

기본 플레이 동작은 [공식 Tetris 조작 안내](https://playstudios.helpshift.com/hc/en/16-tetris-mobile/faq/2944-tetris-controls/)를 참고했습니다. 이 프로젝트는 테마를 참고해 만든 독립 구현입니다.

## FTP 자동 배포

`master`에 푸시하면 GitHub Actions가 의존성 설치 → 규칙 테스트 → 프로덕션 빌드 → FTP 배포를 실행합니다. Actions 탭에서 `Build and deploy to FTP`를 수동 실행할 수도 있습니다.

배포 대상은 `tetrisman.iwinv.net`의 `public_html`입니다. 저장소의 Settings → Secrets and variables → Actions에 아래 Repository secrets를 등록합니다. 접속 비밀번호는 코드·빌드 결과물에 포함하지 않습니다.

| Secret | 용도 |
| --- | --- |
| `FTP_HOST` | FTP 호스트 |
| `FTP_USERNAME` | FTP 계정 |
| `FTP_PASSWORD` | FTP 비밀번호 |
| `FTP_REMOTE_DIR` | `public_html` |

배포 스크립트는 Python 표준 라이브러리만 사용하며 `dist/`의 파일만 업로드합니다. 새 리소스를 먼저 업로드하고, 임시 파일을 이름 변경하는 방식으로 교체한 뒤 `index.html`을 마지막에 게시합니다. 기존 서버 파일과 예전 해시 리소스는 삭제하지 않아 이미 열려 있는 게임이 참조하는 파일을 보존합니다. 동시 배포는 순서대로 실행하고, 마지막에 웹사이트의 HTML이 빌드 결과와 일치하는지 검증합니다.

접속 없이 업로드 파일 목록과 순서를 확인하려면:

```sh
npm run build
python3 scripts/deploy_ftp.py --dry-run
```
