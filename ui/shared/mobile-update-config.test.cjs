const { test } = require('node:test');
const assert = require('node:assert/strict');
const configure = require('./mobile-update-config.cjs');
const projectId = '12345678-1234-4321-8123-123456789abc';

test('local development works without an Expo account', () => {
  assert.equal(configure({ name: 'Customer' }, {}).updates.enabled, false);
});

test('release builds and CI publishing require an actual project UUID', () => {
  assert.throws(() => configure({}, { SUTURA_REQUIRE_OTA: '1' }), /Set SUTURA_EAS_PROJECT_ID/);
  assert.throws(() => configure({}, { SUTURA_EAS_PROJECT_ID: 'sutura-customer-app' }), /UUID/);
});

test('builds and updates use the same project, channel and compatibility policy', () => {
  const result = configure({ extra: { existing: true } }, { SUTURA_EAS_PROJECT_ID: projectId });
  assert.equal(result.extra.eas.projectId, projectId);
  assert.equal(result.extra.existing, true);
  assert.equal(result.updates.url, `https://u.expo.dev/${projectId}`);
  assert.equal(result.updates.requestHeaders['expo-channel-name'], 'production');
  assert.equal(result.updates.checkAutomatically, 'ON_LOAD');
  assert.equal(result.updates.fallbackToCacheTimeout, 0);
  assert.deepEqual(result.runtimeVersion, { policy: 'fingerprint' });
});

test('preview builds cannot receive production updates', () => {
  const result = configure({}, { SUTURA_EAS_PROJECT_ID: projectId, EAS_BUILD_PROFILE: 'preview' });
  assert.equal(result.updates.requestHeaders['expo-channel-name'], 'preview');
  assert.throws(() => configure({}, { SUTURA_UPDATE_CHANNEL: 'typo' }), /preview or production/);
});

test('an EAS project linked by eas init remains supported', () => {
  assert.equal(configure({ extra: { eas: { projectId } } }, {}).extra.eas.projectId, projectId);
});
