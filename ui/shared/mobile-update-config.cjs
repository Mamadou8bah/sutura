const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = function configureMobileUpdates(config, env = process.env) {
  const projectId = env.SUTURA_EAS_PROJECT_ID || config.extra?.eas?.projectId;
  const requireUpdates = env.SUTURA_REQUIRE_OTA === '1';
  if (projectId && !UUID.test(projectId)) {
    throw new Error('SUTURA_EAS_PROJECT_ID must be the real project UUID from Expo.');
  }
  if (requireUpdates && !projectId) {
    throw new Error('Set SUTURA_EAS_PROJECT_ID before building or publishing an update.');
  }
  const channel = env.SUTURA_UPDATE_CHANNEL ||
    (env.EAS_BUILD_PROFILE === 'preview' ? 'preview' : 'production');
  if (!['preview', 'production'].includes(channel)) {
    throw new Error('SUTURA_UPDATE_CHANNEL must be preview or production.');
  }
  return {
    ...config,
    extra: {
      ...config.extra,
      ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}),
    },
    runtimeVersion: { policy: 'fingerprint' },
    updates: {
      ...config.updates,
      enabled: Boolean(projectId),
      ...(projectId ? { url: `https://u.expo.dev/${projectId}` } : {}),
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
      requestHeaders: { 'expo-channel-name': channel },
    },
  };
};
