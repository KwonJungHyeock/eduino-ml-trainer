# EDUINO 이미지 학습·추론 체험

> 브라우저에서 카메라로 직접 데이터를 모으고 → AI를 학습시키고 → 결과를 추론하는 교육용 웹 도구

엔트리(Entry) AI 모델 학습의 "분류: 이미지" 흐름을 그대로 옮긴 지도학습 체험 도구입니다. 모든 학습·추론이 브라우저 안에서 일어나기 때문에, 서버 부담 없이 학생 수업 환경에서 그대로 사용할 수 있습니다.

---

## 핵심 특징

- **전이학습 기반** — MobileNet v2 사전학습 모델(frozen) + 분류 헤드(trainable) 학습
- **브라우저 완결** — 학습·추론·데이터 보관 모두 사용자 브라우저에서 수행
- **서버 부담 0** — 정적 파일 1개만 서빙되면 동작. EC2/RDS 불필요
- **개인정보 안전** — 학습 이미지·모델 가중치가 서버로 전송되지 않음
- **3개 학습 탭** — ① 이미지 분류 ② 동작·음성 학습 ③ 사전학습 모델 추론 (모두 활성)

---

## 워크플로우

| 단계 | 내용 |
|---|---|
| ① 클래스 만들기 | 분류할 종류 직접 정의 (예: 가위 / 바위 / 보) |
| ② 데이터 수집 | 카메라로 클래스별 사진 촬영 (단발 / 꾹 누르기 연속) |
| ③ 모델 학습 | MobileNet 특징 추출 + 분류 헤드 학습 (정확도 실시간 표시) |
| ④ 실시간 추론 | 카메라 영상을 실시간 분류 (클래스별 신뢰도 막대) |

---

## 기술 스택

- **ML 런타임** — TensorFlow.js 4.x (WebGL 백엔드)
- **이미지** — MobileNet v2 (α=1.0, ImageNet) 특징 추출 + 분류 헤드
- **동작** — MoveNet(pose-detection) 키포인트 + 분류 헤드
- **음성** — Speech Commands 전이학습
- **사전학습 추론** — COCO-SSD(객체 탐지) · BodyPix(인물 분리) · Depth Estimation(깊이)
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
├── index.html              # 앱 본체 (단일 파일)
├── README.md               # 이 문서
├── DEPLOY.md               # AWS 배포 요약
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

현재 이미지·동작·음성 분류와 사전학습 추론(탐지/분리/깊이)이 구현돼 있습니다. 같은 전이학습 패턴(frozen 인코더 + 학습 헤드)으로 다음을 추가할 수 있습니다.

- 텍스트 — Universal Sentence Encoder + 분류 헤드
- 숫자 예측 — 직접 정의한 선형 회귀 또는 작은 MLP

---

## 라이선스

내부 프로젝트 · 에듀이노

## 문의

권정혁 · 에듀이노 연구소장
