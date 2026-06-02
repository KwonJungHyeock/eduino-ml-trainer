# Eduino AI Lab

> 브라우저에서 카메라·마이크로 직접 데이터를 모으고 → AI를 학습시키고 → 결과를 추론하는 **교육용 AI·영상처리 실험실**

엔트리(Entry) AI 모델 학습 흐름을 옮긴 체험 도구입니다. **AI 학습·추론(만드는 AI)** 과 **영상처리(체험하는 AI)** 를 좌측 사이드바로 영역별 제공하며, 모든 학습·추론이 브라우저(또는 데스크톱 앱) 안에서 일어나 서버 부담 없이 수업 환경에서 그대로 사용할 수 있습니다. 기능이 늘어나면 해당 영역 아래로 쌓이는 확장형 구조입니다.

![메인 화면](docs/images/01-home.png)

---

## 핵심 특징

- **전이학습 기반** — 사전학습 인코더(frozen) + 분류 헤드(trainable) 학습 패턴
- **브라우저 완결 · 개인정보 안전** — 학습 데이터·모델 가중치가 서버로 전송되지 않음(On-Device)
- **서버 부담 0** — 정적 파일 1개(`index.html`)만 서빙되면 동작
- **영역별 사이드바(확장형)** — 선택한 기능의 학습 종류·모델·개념·이론이 정보 카드로 표시
- **교사·학생 상호작용** — 단계 진행 표시(StepNav), 실시간 게이지/도넛, 영상처리 파라미터 슬라이더

---

## 기능 구성

좌측 사이드바에서 **AI 학습·추론**과 **AI 영상처리** 두 영역으로 나뉩니다.

| 영역 | 기능 | 모델/알고리즘 | 세부 |
|---|---|---|---|
| AI 학습 | **이미지 분류** | MobileNet v2 | 클래스 정의 · 촬영(단발/연속) · 학습곡선 · 혼동행렬 · 샘플 갤러리 · 도넛 게이지 |
| AI 학습 | **음성 분류** | Speech Commands | 단어별 녹음 · 녹음 목록 관리(스펙트로그램+삭제) · 파형 · 실시간 인식 |
| AI 학습 | **동작 분류** | MoveNet | 포즈 오버레이 · 학습곡선 · 혼동행렬 · 도넛 게이지 |
| AI 학습 | 텍스트 분류 | (준비중) | — |
| 영상처리 | **영상 효과(필터)** | Canvas · 프레임 차분 | 흑백·색반전·고대비·블러 + 모션 감지 · 밝기/대비/블러 슬라이더 · 원본 비교 |
| 영상처리 | **색상 추적** | RGB 임계값 | 프리셋 8색 + 색상 직접 입력 · 허용 범위 슬라이더 |
| 영상처리 | **얼굴 검출** | BlazeFace | 실시간 얼굴 박스 · 검출 수 게이지 |
| 영상처리 | **뼈대(포즈) 검출** | MoveNet | 관절 17개 + 뼈대 오버레이 · 표시 민감도 슬라이더 |
| 영상처리 | **객체 탐지** | COCO-SSD | 90종 사물 박스 · 신뢰도 임계값 슬라이더 |

> - 각 기능 상단에 **정보 카드**(학습 종류·모델·개념)와 **이론 영역**(학습 정보 / 알고리즘 정보, K-12 눈높이)이 표시됩니다.
> - 기능을 전환하면 떠나는 기능의 카메라·마이크·추론 루프가 자동 정리됩니다(스트림 잔류 방지).

| 영상 효과(필터) | 색상 추적 | 추론 결과(도넛) |
|---|---|---|
| ![필터](docs/images/02-filter.png) | ![색상추적](docs/images/03-colortrack.png) | ![추론도넛](docs/images/04-inference.png) |

---

## 워크플로우 (이미지·동작 학습 공통)

| 단계 | 내용 |
|---|---|
| ① 클래스 만들기 | 분류할 종류 직접 정의 (예: 가위 / 바위 / 보) |
| ② 데이터 수집 | 카메라로 클래스별 데이터 수집 (단발 / 꾹 누르기 연속) |
| ③ 모델 학습 | 사전학습 특징 추출 + 분류 헤드 학습 (정확도·학습곡선·혼동행렬 실시간 표시) |
| ④ 실시간 추론 | 카메라 영상을 실시간 분류 (클래스별 신뢰도 막대) |

---

## 기술 스택

- **ML 런타임** — TensorFlow.js 4.x (WebGL 백엔드)
- **이미지** — MobileNet v2 (α=1.0, ImageNet) 특징 추출 + 분류 헤드
- **동작** — MoveNet(pose-detection) 키포인트 + 분류 헤드
- **음성** — Speech Commands 전이학습
- **사전학습 추론** — COCO-SSD(객체 탐지) · BodyPix(인물 분리)
- **분류 헤드** — Dense(100, ReLU) → Dropout(0.2) → Dense(N, Softmax), Adam(lr=0.001)
- **UI** — HTML / CSS / JavaScript 단일 파일, Pretendard + JetBrains Mono
- **호스팅** — 정적 파일 호스팅 어디든 (S3+CloudFront, FastAPI, nginx 등)

---

## 로컬 실행

```bash
git clone https://github.com/KwonJungHyeock/eduino-ml-trainer.git
cd eduino-ml-trainer
python -m http.server 8000
```

브라우저에서 [http://localhost:8000](http://localhost:8000) 접속.

> **주의** 카메라 API 권한 조건상 `file://` 직접 열기는 불가. 반드시 로컬 서버(또는 HTTPS) 통해 접속.

---

## 테스트

브라우저 없이 jsdom 으로 인라인 스크립트를 로드해 **DOM 참조 무결성·클래스 관리·탭 전환 라이프사이클·학습/추론/혼동행렬 흐름**을 검증하는 스모크 테스트가 있습니다.

```bash
npm install   # 최초 1회 (jsdom)
npm test
```

`test/load-app.mjs` 가 TensorFlow.js·MobileNet·MoveNet 을 경량 스텁으로 주입해 CDN 없이 앱을 로드하고(실제 추론이 아닌 API 표면을 결정적으로 흉내냄), `test/smoke.test.mjs` 가 다음을 검증합니다.

- 기본 동작 — 스크립트 로드, 기본 클래스 렌더, 클래스 추가/제한, 막대·학습곡선 렌더
- 학습 흐름 — 이미지/동작 탭 모두 공통 `trainHead` 경로로 head 생성·fit·혼동행렬 렌더
- 추론 — 한 틱이 신뢰도 막대·도넛·최상위 예측을 갱신
- UI — 사이드바 config 생성, StepNav 진행 연동, 영상 필터/색상추적 파라미터
- 회귀 — 탭 전환 시 카메라 스트림 정지(`stopAllActivity`), 혼동행렬 텐서 use-after-dispose 방지

---

## 데스크톱에서 실행

### 방법 A — 더블클릭 런처 (권장 · 가장 안정적)
프로젝트 폴더의 **`start-app.bat` 을 더블클릭**하면 로컬 서버가 켜지고 브라우저로 앱이 열립니다(카메라 정상). 바탕화면에서 쓰려면 `start-app.bat` 우클릭 → **보내기 → 바탕 화면에 바로 가기 만들기**.
- 별도 설치 불필요(Node 의 `npx http-server` 사용), 사용을 마치면 "서버" 창을 닫으면 종료.

### 방법 B — Electron 단일 앱(.exe) (선택 · 환경 영향 큼)
독립 앱 창/단일 .exe 가 필요하면 Electron 으로 패키징합니다.

```bash
npm install          # 최초 1회 (electron, electron-builder 포함, 수백 MB 다운로드)
npm run app          # 앱 창으로 바로 실행
npm run dist         # 포터블 .exe 빌드 → dist/
```

> ⚠️ Electron 은 본체 바이너리 다운로드와 코드서명(winCodeSign) 단계에서 환경에 따라 실패할 수 있습니다.
> - `Electron failed to install correctly` → `node_modules\electron` 삭제 후 `npm install electron -D` 재설치(네트워크 양호 필요).
> - `npm run dist` 의 `winCodeSign … symbolic link` 오류 → **개발자 모드 ON**(설정 → 개인 정보 및 보안 → 개발자용) 또는 **관리자 권한 터미널**.
> 번거로우면 **방법 A** 를 쓰세요(동일하게 바탕화면 더블클릭 실행).

- 모델(TensorFlow.js)은 최초 실행 시 CDN 에서 받으므로 **첫 실행은 인터넷 필요**, 이후 캐시됩니다.

### 다른 PC로 보내서 실행하기

폴더를 **그대로 복사**하면 됩니다(`node_modules` 는 제외해도 됨). 단, 받는 PC에 다음이 필요합니다.

| 조건 | 이유 | 없으면 |
|---|---|---|
| **Node.js 설치** | `start-app.bat` 의 `npx http-server` 로 로컬 서버 구동 | 더블클릭해도 서버가 안 켜짐 → [nodejs.org](https://nodejs.org) LTS 설치 |
| **인터넷 연결** | AI 모델을 CDN 에서 다운로드(최초 1회) | 화면은 떠도 학습/추론 불가. 한 번 받으면 캐시됨 |

- 같은 사내/일반 PC(인터넷 O): **Node.js 설치 → 폴더 복사 → `start-app.bat` 더블클릭** 으로 끝.
- 무설치로 주려면 Electron 포터블 `.exe` 빌드 후 **`.exe` 만** 전달(Node 불필요, 인터넷은 필요).
- **완전 오프라인**(인터넷 차단 환경)까지 필요하면 TF.js·모델 파일을 폴더에 내장하는 *오프라인 패키징* 이 필요합니다(모델 용량 수십 MB 증가).

---

## AWS 배포

기존 `eduino-web-tutor` (FastAPI · AWS) 에 정적 라우트로 통합하는 것이 가장 가벼운 방식입니다.

```python
from fastapi.staticfiles import StaticFiles
app.mount("/ml-trainer", StaticFiles(directory="ml-trainer", html=True))
```

배포 옵션 비교 및 상세 절차는 아래 문서를 참고하세요.

- 빠른 배포 요약 — [`DEPLOY.md`](./DEPLOY.md)
- 시스템 구조 · 호스팅 옵션 비교 · 트러블슈팅 — [`docs/system-overview.html`](./docs/system-overview.html)

신규 단독 배포(S3+CloudFront 등)도 가능하며, 어떤 옵션이든 **HTTPS 필수**입니다 (카메라 API 조건).

---

## 개발 과정

단위 커밋과 테스트로 단계적으로 개발했습니다. 자세한 변경 이력은 [`CHANGELOG.md`](./CHANGELOG.md) 참고.

1. **구조 점검 · 정본화 · 안정화** — 앱 본체 `index.html` 일원화, 탭 전환 시 카메라/추론 루프 미정리 버그 수정, **jsdom 스모크/회귀 테스트 도입**(브라우저 없이 검증), 중복 로직 공통화, 혼동행렬 use-after-dispose 버그 수정.
2. **정보 구조 개편** — 상단 3탭 → **좌측 사이드바 2영역**(config 기반 생성), StepNav(진행 연동), 이론 영역, 신규 기능(얼굴·뼈대 검출·색상 추적), 추론 도넛 게이지.
3. **디자인 · 마감** — **다크 테마 + 코랄 브랜딩**, 한글 폰트 가독성, 영상처리 파라미터 슬라이더, 클래스 네이밍 통일, 불필요 UI 정리.
4. **패키징 · 배포** — 더블클릭 런처(`start-app.bat`) + Electron 데스크톱 앱, 다른 PC 배포 가이드.

> **개발 방식 메모(기록용):** 모든 변경은 *작은 단위로 커밋 → `npm test`(23종) 통과 확인 → 푸시* 순서로 진행했고, 브라우저 전용 동작(카메라·실모델)은 `localhost`/실기기에서 확인했습니다.

---

## 폴더 구조

```
eduino-ml-trainer/
├── index.html              # 앱 본체 (단일 파일 · 사이드바 + 전 기능)
├── electron-main.js        # 데스크톱 앱(Electron) 메인 프로세스
├── README.md               # 이 문서
├── CHANGELOG.md            # 개발 과정 · 변경 기록
├── DEPLOY.md               # AWS 배포 요약
├── package.json            # 테스트·앱 스크립트 + devDependencies
├── test/
│   ├── load-app.mjs        # jsdom 로더 + tf/모델 경량 스텁
│   └── smoke.test.mjs      # 스모크/회귀 테스트
├── docs/
│   └── system-overview.html  # 시스템 구조 설명서 (작업자 인계용)
└── .gitignore
```

---

## 문서

| 문서 | 대상 | 내용 |
|---|---|---|
| `DEPLOY.md` | 빠른 배포 | 통합 코드 + 핵심 요건 |
| `docs/system-overview.html` | 작업자 인계 | 시스템 구조 · AWS 옵션 비교 · 트러블슈팅 |
| `EDUINO-ML-INT-001` 인계서 (docx) | 실무자 정식 인계 | 별도 전달용, repo에 미포함 |

---

## 시스템 구조 한눈에

학습·추론은 사용자 브라우저에서, 서버는 페이지 첫 로드 시 HTML 1회 전송만 담당합니다.

```
[ 서버 (FastAPI 등) ]                          [ 브라우저 (사용자 PC) ]
    │                                              │
    │  HTML 1회 (약 30KB)                          │ MobileNet v2 (frozen)
    │ ──────────────────►                          │ 분류 헤드 (학습)
    │                                              │ 카메라 + 메모리
    │                                              │ 이후 통신 0회
```

자세한 다이어그램과 흐름은 `docs/system-overview.html`에서 확인하세요.

---

## 향후 확장

현재 이미지·동작·음성 분류와 사전학습 추론(객체 탐지/인물 분리)이 구현돼 있습니다. 같은 전이학습 패턴(frozen 인코더 + 학습 헤드)으로 다음을 추가할 수 있습니다.

- 텍스트 — Universal Sentence Encoder + 분류 헤드
- 숫자 예측 — 직접 정의한 선형 회귀 또는 작은 MLP

---

## 라이선스

내부 프로젝트 · 에듀이노

## 문의

권정혁 · 에듀이노 연구소장
