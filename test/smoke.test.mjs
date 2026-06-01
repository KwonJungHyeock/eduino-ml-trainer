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

test('메인 탭 전환 시 패널이 토글된다', async () => {
  const { doc } = await loadApp();
  doc.querySelector('.main-tab[data-tab="supervised"]').click();
  assert.equal(doc.getElementById('panel-supervised').classList.contains('active'), true);
  assert.equal(doc.getElementById('panel-direct').classList.contains('active'), false);
});

test('회귀: 카메라 켠 상태에서 탭 전환 시 스트림이 정지된다 (stopAllActivity)', async () => {
  const { window, doc } = await loadApp();
  await window.toggleCam(); // 이미지 탭 카메라 시작 → 가짜 스트림 생성
  assert.equal(window.__streams.length, 1, '카메라 스트림이 생성되어야 함');
  assert.equal(window.__streams[0]._track._stopped, false);
  assert.equal(doc.getElementById('cam-toggle').textContent, '카메라 끄기');

  // 다른 메인 탭으로 전환 → stopAllActivity 가 트랙을 정지해야 함
  doc.querySelector('.main-tab[data-tab="pretrained"]').click();
  assert.equal(window.__streams[0]._track._stopped, true, '탭 전환 후 카메라 트랙이 정지되어야 함');
  assert.equal(doc.getElementById('cam-toggle').textContent, '카메라 켜기');
});
