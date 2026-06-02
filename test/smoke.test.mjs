import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load-app.mjs';

test('인라인 스크립트가 오류 없이 로드된다 (DOM 참조 무결성)', async () => {
  const { errors } = await loadApp();
  assert.deepEqual(errors, [], '로드 중 스크립트 오류 발생: ' + errors.map(String).join(' | '));
});

test('기본 클래스가 각 학습 탭에 렌더링된다', async () => {
  const { doc } = await loadApp();
  // 이미지 탭: init() 이 클래스 2개 추가
  assert.equal(doc.querySelectorAll('#class-list .class-item').length, 2);
  // 동작 탭: poseInit() 이 클래스 2개 추가
  assert.equal(doc.querySelectorAll('#p-class-list .class-item').length, 2);
});

test('addClass / 최대 클래스 제한이 동작한다 (이미지 탭)', async () => {
  const { window, doc } = await loadApp();
  window.addClass('테스트');
  assert.equal(doc.querySelectorAll('#class-list .class-item').length, 3);
  // MAX_CLASSES(4) 초과 추가는 무시
  window.addClass('네번째');
  window.addClass('초과분');
  assert.equal(doc.querySelectorAll('#class-list .class-item').length, 4);
  assert.equal(doc.getElementById('add-class').disabled, true);
});

test('renderBars 가 클래스 수만큼 막대를 만든다', async () => {
  const { window, doc } = await loadApp();
  window.renderBars();
  const rows = doc.querySelectorAll('#bars .bar-row').length;
  assert.equal(rows, doc.querySelectorAll('#class-list .class-item').length);
});

test('사이드바 기능 전환 시 패널이 토글된다', async () => {
  const { doc } = await loadApp();
  doc.querySelector('.nav-item[data-feature="pose"]').click();
  assert.equal(doc.getElementById('panel-supervised').classList.contains('active'), true);
  assert.equal(doc.getElementById('panel-direct').classList.contains('active'), false);
  // 정보 카드도 갱신
  assert.equal(doc.getElementById('fi-model').textContent, 'MoveNet');
});

test('학습 곡선(pushChartPoint)이 polyline 좌표를 누적해 그린다', async () => {
  const { window, doc } = await loadApp();
  window.pushChartPoint(1, 5, 0.80, 0.40); // (ep, totalEp, loss, acc)
  window.pushChartPoint(2, 5, 0.40, 0.70);
  const acc = doc.getElementById('chart-acc').getAttribute('points');
  const loss = doc.getElementById('chart-loss').getAttribute('points');
  // 2개 점이 누적되어 "x,y x,y" 형태로 그려져야 함
  assert.equal(acc.trim().split(/\s+/).length, 2, 'acc polyline 점 2개');
  assert.equal(loss.trim().split(/\s+/).length, 2, 'loss polyline 점 2개');
  assert.match(acc, /^[\d.]+,[\d.]+\s+[\d.]+,[\d.]+$/);
});

// 이미지 탭에서 두 클래스에 임베딩을 수집하고 학습을 돌리는 헬퍼
async function trainImageTab(window, doc, { epochs = 5, perClass = 3 } = {}) {
  await window.toggleCam();
  const items = doc.querySelectorAll('#class-list .class-item');
  items[0].click();
  for (let i = 0; i < perClass; i++) window.captureSample();
  items[1].click();
  for (let i = 0; i < perClass; i++) window.captureSample();
  doc.getElementById('epochs').value = String(epochs);
  await window.train();
  await new Promise((r) => setTimeout(r, 0)); // 혼동행렬 마이크로태스크 정리
}

test('학습 흐름: head 생성·fit·학습곡선·혼동행렬이 동작한다 (이미지 탭)', async () => {
  const { window, doc, errors } = await loadApp();
  await trainImageTab(window, doc, { epochs: 5 });
  assert.deepEqual(errors, [], '학습 중 오류: ' + errors.map(String).join(' | '));
  // 학습 완료 안내
  assert.match(doc.getElementById('train-hint').textContent, /학습 완료/);
  // 학습곡선 5 epoch
  assert.equal(doc.getElementById('chart-acc').getAttribute('points').trim().split(/\s+/).length, 5);
});

test('혼동행렬이 클래스 수(2x2) 만큼 데이터 셀을 렌더한다', async () => {
  const { window, doc } = await loadApp();
  await trainImageTab(window, doc, { epochs: 5 });
  const cells = doc.querySelectorAll('#confusion-table-wrap tbody td').length;
  assert.equal(cells, 4, '2x2 = 4개 데이터 셀');
  assert.equal(doc.getElementById('confusion-box').classList.contains('on'), true);
});

test('학습 흐름(동작 탭): 공통 trainHead 경로가 동작한다', async () => {
  const { window, doc, errors } = await loadApp();
  doc.querySelector('.nav-item[data-feature="pose"]').click();
  await window.poseToggleCam();
  const items = doc.querySelectorAll('#p-class-list .class-item');
  items[0].click();
  for (let i = 0; i < 3; i++) await window.poseCaptureSample();
  items[1].click();
  for (let i = 0; i < 3; i++) await window.poseCaptureSample();
  doc.getElementById('p-epochs').value = '5';
  await window.poseTrain();
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(errors, [], '동작 학습 중 오류: ' + errors.map(String).join(' | '));
  assert.match(doc.getElementById('p-train-hint').textContent, /학습 완료/);
  assert.equal(doc.querySelectorAll('#p-confusion-table-wrap tbody td').length, 4);
});

test('추론 1틱이 막대와 최상위 예측을 갱신한다 (이미지 탭)', async () => {
  const { window, doc } = await loadApp();
  await trainImageTab(window, doc, { epochs: 5 });
  window.startInfer(); // RAF 는 stub 이라 inferLoop 1회만 실행
  await new Promise((r) => setTimeout(r, 0));
  // 막대 퍼센트가 채워졌는지(0% 가 아닌 값 또는 갱신 흔적)
  assert.ok(doc.getElementById('pct-0').textContent.endsWith('%'));
  const tpName = doc.querySelector('#top-pred .tp-name').textContent;
  assert.ok(tpName.length > 0, '최상위 예측 이름이 표시됨');
});

test('음성 녹음 관리 모달: 목록 표시 + 개별 삭제', async () => {
  const { window, doc } = await loadApp();
  doc.querySelector('.nav-item[data-feature="audio"]').click();
  // 첫 음성 클래스 선택 후 2회 녹음
  doc.querySelectorAll('#a-class-list .class-item')[0].click();
  await window.audioCapture();
  await window.audioCapture();
  // 카운트 배지 클릭 → 녹음 모달 열림
  doc.querySelector('#a-class-list .class-item .class-count').click();
  assert.equal(doc.getElementById('audio-rec-overlay').classList.contains('on'), true);
  assert.equal(doc.querySelectorAll('#audio-rec-grid .gallery-item').length, 2, '녹음 2개 표시');
  // 하나 삭제 → 1개 남음
  doc.querySelector('#audio-rec-grid .gallery-item').click();
  assert.equal(doc.querySelectorAll('#audio-rec-grid .gallery-item').length, 1, '삭제 후 1개');
});

test('사이드바가 config 기반 2그룹으로 생성되고 준비중 항목은 비활성', async () => {
  const { doc } = await loadApp();
  assert.equal(doc.querySelectorAll('#sidebar .nav-group').length, 2);
  assert.equal(doc.querySelectorAll('#sidebar .nav-item').length, 9);
  const text = doc.querySelector('.nav-item[data-feature="text"]');
  assert.equal(text.classList.contains('disabled'), true);
  assert.match(text.querySelector('.nav-badge').textContent, /준비중/);
  // 사전학습 뱃지
  assert.match(doc.querySelector('.nav-item[data-feature="detect"] .nav-badge').textContent, /사전학습/);
});

test('신규 영상처리 기능(뼈대·얼굴 검출) 패널이 활성화된다', async () => {
  const { doc } = await loadApp();
  doc.querySelector('.nav-item[data-feature="skeleton"]').click();
  assert.equal(doc.getElementById('sub-skeleton').classList.contains('active'), true);
  assert.equal(doc.getElementById('fi-model').textContent, 'MoveNet');
  doc.querySelector('.nav-item[data-feature="face"]').click();
  assert.equal(doc.getElementById('sub-face').classList.contains('active'), true);
  assert.equal(doc.getElementById('fi-model').textContent, 'BlazeFace');
});

test('StepNav 가 학습 진행에 따라 done 표시된다 (이미지)', async () => {
  const { window, doc } = await loadApp();
  const pills = () => doc.querySelectorAll('#step-nav .step-pill');
  // 기본 2클래스 → 1단계(클래스 만들기) 완료
  assert.equal(pills()[0].classList.contains('done'), true);
  assert.equal(pills()[2].classList.contains('done'), false);
  await trainImageTab(window, doc, { epochs: 3 });
  // 학습 완료 → 3단계(모델 학습) 완료
  assert.equal(pills()[2].classList.contains('done'), true);
});

test('추론 시 도넛 게이지(%)가 갱신된다 (이미지)', async () => {
  const { window, doc } = await loadApp();
  await trainImageTab(window, doc, { epochs: 3 });
  window.startInfer();
  await new Promise((r) => setTimeout(r, 0));
  assert.match(doc.getElementById('top-donut-pct').textContent, /\d+%/);
});

test('색상 추적: 프리셋 8색 + 색상 직접 입력이 동작한다', async () => {
  const { window, doc } = await loadApp();
  doc.querySelector('.nav-item[data-feature="colortrack"]').click();
  assert.equal(doc.querySelectorAll('#sub-colortrack .ct-color').length, 8);
  const pick = doc.getElementById('ct-pick');
  pick.value = '#00ff00';
  pick.dispatchEvent(new window.Event('input'));
  assert.equal(doc.querySelectorAll('.ct-color.active').length, 0); // 직접 입력 시 프리셋 해제
});

test('영상 필터 밝기 슬라이더가 CSS 필터에 실시간 반영된다', async () => {
  const { window, doc } = await loadApp();
  doc.querySelector('.nav-item[data-feature="filter"]').click();
  const b = doc.getElementById('ff-bright');
  b.value = '150';
  b.dispatchEvent(new window.Event('input'));
  assert.equal(doc.getElementById('ff-bright-val').textContent, '150%');
  assert.match(doc.getElementById('ff-webcam').style.filter, /brightness\(150%\)/);
});

test('객체 탐지 신뢰도 임계값 슬라이더가 라벨을 갱신한다', async () => {
  const { window, doc } = await loadApp();
  const thr = doc.getElementById('d-thr');
  thr.value = '70';
  thr.dispatchEvent(new window.Event('input'));
  assert.equal(doc.getElementById('d-thr-val').textContent, '70%');
});

test('이론 영역(학습/알고리즘 정보)이 기능별로 갱신된다', async () => {
  const { doc } = await loadApp();
  assert.match(doc.getElementById('fi-learn').textContent, /데이터셋/);
  doc.querySelector('.nav-item[data-feature="detect"]').click();
  assert.match(doc.getElementById('fi-algo').textContent, /COCO-SSD/);
});

test('단계 네비: 학습 기능은 4단계, 영상처리는 표시 안 함', async () => {
  const { doc } = await loadApp();
  assert.equal(doc.querySelectorAll('#step-nav .step-pill').length, 4);
  doc.querySelector('.nav-item[data-feature="detect"]').click();
  assert.equal(doc.querySelectorAll('#step-nav .step-pill').length, 0);
  assert.equal(doc.getElementById('step-nav').style.display, 'none');
});

test('영상 필터: 모드 버튼이 비디오에 CSS 필터를 적용한다', async () => {
  const { window, doc } = await loadApp();
  doc.querySelector('.nav-item[data-feature="filter"]').click();
  assert.equal(doc.getElementById('panel-pretrained').classList.contains('active'), true);
  assert.equal(doc.getElementById('sub-filter').classList.contains('active'), true);
  // 흑백 모드 → grayscale 필터 (밝기/대비/블러 파라미터가 합성됨)
  doc.querySelector('.ff-mode[data-fmode="gray"]').click();
  assert.match(doc.getElementById('ff-webcam').style.filter, /grayscale\(1\)/);
  assert.equal(doc.getElementById('ff-mode-name').textContent, '흑백');
  // 원본 모드 → grayscale 없음
  doc.querySelector('.ff-mode[data-fmode="none"]').click();
  assert.doesNotMatch(doc.getElementById('ff-webcam').style.filter, /grayscale/);
});

test('회귀: 카메라 켠 상태에서 탭 전환 시 스트림이 정지된다 (stopAllActivity)', async () => {
  const { window, doc } = await loadApp();
  await window.toggleCam(); // 이미지 탭 카메라 시작 → 가짜 스트림 생성
  assert.equal(window.__streams.length, 1, '카메라 스트림이 생성되어야 함');
  assert.equal(window.__streams[0]._track._stopped, false);
  assert.equal(doc.getElementById('cam-toggle').textContent, '카메라 끄기');

  // 다른 메인 탭으로 전환 → stopAllActivity 가 트랙을 정지해야 함
  doc.querySelector('.nav-item[data-feature="detect"]').click();
  assert.equal(window.__streams[0]._track._stopped, true, '탭 전환 후 카메라 트랙이 정지되어야 함');
  assert.equal(doc.getElementById('cam-toggle').textContent, '카메라 켜기');
});
