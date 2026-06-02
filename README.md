# EDUINO · AI 학습·추론 체험

> 브라우저에서 카메라·마이크로 직접 데이터를 모으고 → AI를 학습시키고 → 결과를 추론하는 교육용 웹 도구

엔트리(Entry) AI 모델 학습 흐름을 옮긴 지도학습 체험 도구입니다. 이미지·동작·음성 분류와 사전학습 모델 추론을 **좌측 사이드바(AI 학습 / 영상처리)** 로 영역별 분류해 제공하며, 모든 학습·추론이 브라우저 안에서 일어나 서버 부담 없이 수업 환경에서 그대로 사용할 수 있습니다. 기능이 늘어나면 해당 영역 아래로 쌓이는 확장형 구조입니다.

---

## 핵심 특징

- **전이학습 기반** — 사전학습 인코더(frozen) + 분류 헤드(trainable) 학습 패턴
- **브라우저 완결** — 학습·추론·데이터 보관 모두 사용자 브라우저에서 수행
- **서버 부담 0** — 정적 파일 1개(`index.html`)만 서빙되면 동작. EC2/RDS 불필요
- **개인정보 안전** — 학습 데이터·모델 가중치가 서버로 전송되지 않음
- **영역별 사이드바** — 좌측에서 AI 학습 / 영상처리로 나뉘며, 선택한 기능의 학습 종류·모델·개념이 상단 정보 카드로 표시됨 (확장형)

---

## 기능 구성

좌측 사이드바에서 **AI 학습**(직접 학습)과 **영상처리**(사전학습 추론) 두 영역으로 나뉩니다.

| 영역 | 기능 | 모델 | 세부 |
|---|---|---|---|
| AI 학습 | **이미지 분류** | MobileNet v2 | 클래스 정의 · 촬영(단발/연속) · 학습곡선 · 혼동행렬 · 샘플 갤러리(클릭 삭제) · 실시간 신뢰도 |
| AI 학습 | **동작 분류** | MoveNet | 포즈 오버레이 · 학습곡선 · 혼동행렬 · 실시간 신뢰도 |
| AI 학습 | **음성 분류** | Speech Commands | 단어별 녹음 · **녹음 목록 관리(스펙트로그램 썸네일 + 개별 삭제)** · 파형 · 실시간 인식 |
| 영상처리 | **객체 탐지** | COCO-SSD | 90개 클래스 · FPS/검출 수 |
| 영상처리 | **인물 분리** | BodyPix | 배경 크로마키(그린) / 인물 강조 토글 · 분리 비율 게이지 (얼굴 인식·분류 아님) |
| 영상처리 | **영상 필터** | Canvas · 프레임 차분 | 흑백·색반전·고대비·블러(즉시) + **모션 감지**(움직임 영역 표시 + 게이지) — "멈추기 게임" 등 수업 상호작용 |

> - 각 기능 상단에 **정보 카드**(학습 종류 · 모델/알고리즘 · 한 줄 개념)가 표시됩니다.
> - 기능을 전환하면 떠나는 기능의 카메라·마이크·추론 루프가 자동으로 정리됩니다(스트림 잔류 방지).

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
