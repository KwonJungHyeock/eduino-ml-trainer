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
