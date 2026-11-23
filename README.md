# JLPT N2 기출 단어 정복

2022년 이후 JLPT N2 문자·어휘 파트에 나온 단어와 N2 필수 단어를 한자·읽기·뜻·예문·발음과 함께 카드로 외우는 모바일 웹앱.
단어 수와 기출 수집 현황은 `data/report.md` 에 있다.

- 카드 뒷면: 읽기, 뜻, 한자별 한국 훈음·음독·훈독, 후리가나 달린 예문, 기출 회차
- 발음 듣기: 단어·예문 (기기 내장 일본어 음성, 없으면 온라인 음성)
- 기억상자 복습, 게임 3종(스피드 퀴즈·짝 맞추기·한자 읽기), 레벨·배지·주간 랭킹

## 실행

```
npm install
npm run dev      # http://localhost:5173
npm test         # 학습 엔진·게임·배지 단위 테스트
npm run build    # dist/ 생성 (Vercel이 자동 실행)
```

날짜를 바꿔 복습 흐름을 확인하려면 주소 뒤에 `?debugDate=2026-11-25` 를 붙인다.

## 데이터 다시 만들기

```
python tools/prepare.py   # data/raw 의 N2 목록·KANJIDIC2 를 풀어 둔다 (원본은 저장소에 없음)
python tools/build.py     # data/*.json → public/data/vocab.json, data/report.md
```

뜻·훈음을 고치려면 `data/fixes.json` 에 적고 `tools/build.py` 를 다시 돌린다.

## Firebase 연결 (선택)

설정값이 없으면 기기에만 저장한다. 연결하면 기기 간 기록 동기화와 주간 랭킹이 켜진다.

1. Firebase 콘솔에서 웹 앱을 추가하고 `firebaseConfig` 값을 확인한다.
2. Authentication → 로그인 방법 → **익명** 사용 설정.
3. Firestore Database 생성 후 규칙 탭에 `firestore.rules` 내용을 붙여 넣는다.
4. `.env.example` 을 `.env.local` 로 복사해 값을 채운다. Vercel에는 같은 이름의 환경 변수로 넣는다.

## 문서

- `docs/01_PRD.md` — 기능 범위
- `docs/02_핵심로직_규칙_명세서.md` — 학습일·기억상자·기출 빈도·발음 규칙
- `docs/03_화면흐름_와이어프레임.md` — 화면 이동과 배치
- `docs/04_콘텐츠_DB_스키마.md` — 단어·한자·기출·사용자 데이터 구조
- `docs/05_피드백_게이미피케이션_기획서.md` — 효과·게임·보상
- `docs/06_MVP범위_기술검증.md` — 우선순위, 기술 위험, 배포
- `data/report.md`, `data/kichul_report.md` — 단어장 통계와 기출 수집 보고

## 출처와 권리

- JLPT 기출 문제는 공식 공개되지 않는다. 기출 정보는 웹에 공개된 복원 자료에서 단어·회차·유형만 모았고, 문제 문장은 싣지 않는다. 예문은 모두 새로 쓴 문장이다.
- 한자 음독·훈독은 [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) (EDRDG, CC BY-SA 4.0).
- 기본 단어 목록은 [open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) 의 N2 목록에서 출발했다.
