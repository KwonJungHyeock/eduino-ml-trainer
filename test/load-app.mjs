// jsdom 기반 앱 로더 — 브라우저 없이 index.html 의 인라인 스크립트를 실행한다.
// CDN 의존(tf / mobilenet / pose-detection / speech-commands / coco-ssd / body-pix
// / depth-estimation)은 일부러 주입하지 않아, 각 init 의 graceful-degradation 경로
// (가드 return / try-catch)를 그대로 타게 한다. 검증 대상은 모델이 아니라 앱의
// DOM 참조 무결성·클래스 관리·탭 전환 라이프사이클 로직이다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const HTML = readFileSync(join(import.meta.dirname, '..', 'index.html'), 'utf8');

export async function loadApp() {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push(e));

  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      // RAF: 실제 루프를 돌리지 않고 한 프레임만 흉내(테스트 결정성 확보)
      window.requestAnimationFrame = () => 0;
      window.cancelAnimationFrame = () => {};

      // ── 가벼운 TensorFlow.js 스텁 ────────────────────────────────
      // 실제 학습이 아니라 앱이 호출하는 tf API 표면(시퀀스·학습 콜백·예측)을
      // 결정적으로 흉내내, 학습/추론/혼동행렬 경로를 브라우저 없이 검증한다.
      const flat = (a) => Array.isArray(a) && Array.isArray(a[0]) ? a.flat() : a;
      // 실제 tf 처럼 dispose 후 접근하면 예외 → use-after-dispose 버그를 테스트가 잡는다.
      const fakeTensor = (data) => {
        let disposed = false;
        const guard = () => { if (disposed) throw new Error('Tensor is disposed.'); };
        return {
          _data: data,
          array: async () => { guard(); return data; },
          data: async () => { guard(); return Float32Array.from(flat(data)); },
          dataSync: () => { guard(); return Float32Array.from(flat(data)); },
          flatten() { return fakeTensor(flat(data)); },
          dispose() { disposed = true; },
        };
      };
      const fakeModel = () => {
        let outUnits = 2;
        const m = {
          _classNames: null,
          add(layer) { if (layer && layer.units != null) outUnits = layer.units; return m; },
          compile() {},
          async fit(xs, ys, opts = {}) {
            const epochs = opts.epochs || 1;
            for (let e = 0; e < epochs; e++) {
              const logs = { loss: 1 / (e + 1), acc: Math.min(1, 0.5 + e * 0.05) };
              if (opts.callbacks && opts.callbacks.onEpochEnd) await opts.callbacks.onEpochEnd(e, logs);
            }
            return { history: {} };
          },
          predict(x) {
            const rows = Array.isArray(x._data) && Array.isArray(x._data[0]) ? x._data.length : 1;
            const out = Array.from({ length: rows }, () => new Array(outUnits).fill(1 / outUnits));
            return fakeTensor(out);
          },
          dispose() {},
        };
        return m;
      };
      window.tf = {
        tidy: (fn) => fn(),
        tensor2d: (arr) => fakeTensor(arr),
        sequential: () => fakeModel(),
        layers: {
          dense: (cfg) => ({ units: cfg.units }),
          dropout: () => ({}),
        },
        train: { adam: () => ({}) },
        ready: async () => {},
        setBackend: async () => true,
        getBackend: () => 'cpu',
      };
      // MobileNet 스텁: 1024 차원 특징 벡터 반환
      window.mobilenet = {
        load: async () => ({ infer: () => fakeTensor(new Array(1024).fill(0.1)) }),
      };
      // MoveNet(pose-detection) 스텁: 17개 키포인트 반환
      window.poseDetection = {
        SupportedModels: { MoveNet: 'MoveNet' },
        movenet: { modelType: { SINGLEPOSE_LIGHTNING: 'lightning' } },
        createDetector: async () => ({
          estimatePoses: async () => [{
            keypoints: Array.from({ length: 17 }, (_, i) => ({ x: i + 1, y: i + 2, score: 0.9 })),
          }],
        }),
      };

      // Speech Commands 스텁: 녹음 예제를 word 별로 메모리에 보관(uid 기반 삭제 지원)
      window.speechCommands = {
        create: () => {
          const examples = {};
          let uidSeq = 0;
          const transfer = {
            collectExample: async (word) => {
              (examples[word] = examples[word] || []).push({
                uid: 'u' + (++uidSeq),
                example: { spectrogram: { data: new Float32Array(43 * 232), frameSize: 232 } },
              });
            },
            countExamples: () => Object.fromEntries(Object.entries(examples).map(([w, a]) => [w, a.length])),
            getExamples: (word) => examples[word] || [],
            removeExample: (uid) => { for (const w in examples) examples[w] = examples[w].filter((e) => e.uid !== uid); },
            train: async (opts) => {
              const ep = opts.epochs || 1;
              for (let i = 0; i < ep; i++) opts.callback && opts.callback.onEpochEnd && (await opts.callback.onEpochEnd(i, { loss: 1 / (i + 1), acc: 0.6 }));
            },
            listen: async () => {}, stopListening: async () => {}, isListening: () => false,
            wordLabels: () => Object.keys(examples),
          };
          return { ensureModelLoaded: async () => {}, createTransfer: () => transfer };
        },
      };

      // jsdom 은 canvas 2d 컨텍스트를 구현하지 않으므로(썸네일·오버레이용) 최소 stub
      const ctx2d = {
        clearRect() {}, drawImage() {}, beginPath() {}, moveTo() {}, lineTo() {},
        stroke() {}, arc() {}, fill() {}, fillRect() {}, strokeRect() {}, fillText() {},
        measureText: () => ({ width: 0 }),
        getImageData: () => ({ data: new Uint8ClampedArray(0) }),
        createImageData: (w, h) => ({ data: new Uint8ClampedArray((w | 0) * (h | 0) * 4) }),
        putImageData() {},
      };
      window.HTMLCanvasElement.prototype.getContext = () => ctx2d;
      window.HTMLCanvasElement.prototype.toDataURL = () => 'data:,';

      // getUserMedia: stop() 호출을 추적할 수 있는 가짜 스트림 반환
      const streams = [];
      Object.defineProperty(window.navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => {
            const track = { kind: 'media', _stopped: false, stop() { this._stopped = true; } };
            const stream = {
              _track: track,
              getTracks: () => [track],
              getVideoTracks: () => [track],
              getAudioTracks: () => [track],
            };
            streams.push(stream);
            return stream;
          },
        },
      });
      window.__streams = streams;

      // 음성 탭 파형 루프용 최소 AudioContext stub
      window.AudioContext = class {
        createMediaStreamSource() { return { connect() {} }; }
        createAnalyser() { return { fftSize: 2048, getByteTimeDomainData() {} }; }
        close() {}
      };

      window.addEventListener('error', (e) => errors.push(e.error || e.message));
    },
  });

  // 인라인 스크립트 말미의 init() 들이 띄운 마이크로태스크 정리
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));

  return { dom, window: dom.window, doc: dom.window.document, errors };
}
