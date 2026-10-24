# 테트리스 맨

## Product and audience
한국어로 즐기는 PC·모바일용 싱글 플레이 브라우저 아케이드 게임. 사용자가 제공한 팩맨 테마 이미지의 네온 블루 프레임, 어두운 보드, 컬러 고스트, 노란 팩맨을 시각적 근거로 삼는다. 주 행동은 게임 시작과 블록 조작이다.

## Visual direction
Workbench 구성의 실제 게임판이 중심이다. 데스크톱은 점수/홀드 · 게임판 · 다음 블록/조작법의 세 영역, 모바일은 상단 점수와 게임판 오른쪽의 작은 미리보기, 하단 터치 컨트롤을 사용한다. 마케팅 섹션은 추가하지 않는다.

## Token ownership
`tokens.css`가 런타임 토큰의 단일 원본(Model B)이다. `src/style.css`는 이를 import하고 daisyUI night 테마의 의미 색상에 연결한다. `src/renderer.ts`는 동일 CSS 변수를 읽어 캔버스에 적용한다.

| 역할 | 토큰 | 값 / 사용 |
| --- | --- | --- |
| 배경 | --color-paper | oklch(14% .027 266) |
| 패널 | --color-panel | oklch(17% .034 267) |
| 보드 | --color-board | oklch(12% .029 266) |
| 본문 | --color-ink | oklch(96% .012 260) |
| 보조 글자 | --color-muted | oklch(70% .035 258) |
| 주 행동, 팩맨 | --color-accent | oklch(92% .185 100) |
| 프레임 | --color-blue | oklch(62% .22 260) |
| 픽셀 라벨 | --font-display | Press Start 2P, 로컬 번들 |
| 본문 | --font-body | Space Grotesk, Apple SD Gothic Neo, Malgun Gothic, sans-serif |
| 간격 | --space-xs ~ --space-3xl | 4 / 8 / 16 / 24 / 32 / 48 / 64px |

고스트 색상은 블록 식별을 위해 cyan / yellow / purple / mint / red / blue / orange를 쓴다. 글꼴은 번들하여 외부 폰트 서비스에 의존하지 않는다.

## Interaction
- 주 CTA는 노란색, 부가 도구는 테두리 버튼. 키보드 초점은 노란 링.
- 점수 6자리, 레벨 2자리, 줄 3자리를 최소 자릿수로 표시하며 실제 값은 잘라내지 않는다.
- 터치는 방향키 150ms 지연 후 45ms 반복, 소프트 드롭은 35ms 반복. 터치 조작 버튼 최소 높이 56px.
- 게임 상태는 ready / playing / paused / clearing / gameover. 탭을 벗어나면 자동 일시정지. 재개는 명시적 조작으로 한다.
- 이펙트와 사운드는 각각 토글 가능. 동작 줄이기 OS 설정이면 파편과 흔들림을 기본적으로 끈다.
- 최고 점수와 사용자 사운드/이펙트 설정만 localStorage에 보관. 저장 실패 시에도 플레이 가능.
- 게임 방법은 네이티브 dialog로 초점 가두기, Esc 닫기, 닫은 뒤 초점 복귀를 제공한다.

## Verification
순수 엔진 규칙은 Vitest로, 실제 화면과 키보드/터치/일시정지/재시작은 브라우저에서 확인한다. 모바일 너비 320 / 375 / 414 / 768px와 데스크톱을 확인한다.
