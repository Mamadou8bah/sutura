const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

function load(file, dependencies, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, require: dependencies, TextDecoder, Uint8Array, setTimeout, clearTimeout, ...globals });
  return exports;
}
function device() {
  const secure = new Map(), disk = new Map(); const platform = { OS: 'android' };
  let now = 1000000, denied = false, failWrite = false;
  const prompts = [];
  const store = {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1, isAvailableAsync: async () => true,
    getItemAsync: async (key, options) => { if (options?.requireAuthentication) { prompts.push(options); if (denied) return null; } return secure.get(key) ?? null; },
    setItemAsync: async (key, value, options) => { if (failWrite) throw Error('device storage failed'); secure.set(key, value); },
    deleteItemAsync: async key => secure.delete(key),
  };
  const storage = { getItem: async key => disk.get(key) ?? null, setItem: async (key, value) => disk.set(key, value), removeItem: async key => disk.delete(key) };
  const aes = {
    getRandomBytesAsync: async count => crypto.randomBytes(count),
    AESEncryptionKey: { generate: async () => { const bytes = crypto.randomBytes(32); return { bytes, encoded: async () => bytes.toString('hex') }; }, import: async hex => ({ bytes: Buffer.from(hex, 'hex') }) },
    AESSealedData: { fromCombined: data => Buffer.from(data, 'base64') },
    aesEncryptAsync: async (plain, key, options) => {
      const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key.bytes, iv); cipher.setAAD(Buffer.from(options.additionalData));
      const bytes = Buffer.concat([iv, cipher.update(plain), cipher.final(), cipher.getAuthTag()]); return { combined: async () => bytes.toString('base64') };
    },
    aesDecryptAsync: async (sealed, key, options) => {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key.bytes, sealed.subarray(0, 12)); decipher.setAAD(Buffer.from(options.additionalData)); decipher.setAuthTag(sealed.subarray(-16));
      return Buffer.concat([decipher.update(sealed.subarray(12, -16)), decipher.final()]);
    },
  };
  let vault;
  const deps = name => {
    if (name === 'react-native') return { Platform: platform };
    if (name === 'expo-secure-store') return store;
    if (name === 'expo-crypto') return aes;
    if (name === '@react-native-async-storage/async-storage') return storage;
    if (name === './deviceVault') return vault;
    if (name === '@noble/hashes/pbkdf2.js') return { pbkdf2Async: async (_, pin, salt, options) => {
      assert.equal(options.c, 600000); assert.equal(options.dkLen, 32);
      return new Promise((resolve, reject) => crypto.pbkdf2(pin, salt, options.c, options.dkLen, 'sha256', (error, result) => error ? reject(error) : resolve(result)));
    } };
    if (name === 'expo-local-authentication') return { hasHardwareAsync: async () => true, isEnrolledAsync: async () => true, getEnrolledLevelAsync: async () => 3, SecurityLevel: { BIOMETRIC_STRONG: 3 }, authenticateAsync: async options => { assert.equal(options.biometricsSecurityLevel, 'strong'); assert.equal(options.disableDeviceFallback, true); return { success: true }; } };
    return require(name);
  };
  const makeVault = (fallback = false) => load('storage/deviceVault.ts', deps, { Date: { now: () => now }, ...(fallback ? { TextDecoder: undefined } : {}) });
  vault = makeVault();
  const security = load('storage/localSecurity.ts', deps, { Date: { now: () => now } });
  return { secure, disk, platform, prompts, vault, makeVault, security, time: value => now = value, deny: () => denied = true, failWrites: () => failWrite = true };
}
const normalise = value => JSON.parse(JSON.stringify(value));

test('native snapshots persist only AES-GCM ciphertext, survive restart and reject account substitution', async () => {
  const d = device(); const data = { wallets: [{ id: 9, balance: 12500 }], name: 'Private Customer - \u00f1 \u0639\u0631\u0628\u064a' };
  await d.vault.saveSnapshot('customer:one', data);
  const encrypted = d.disk.get(d.vault.deviceKey('customer:one', 'snapshot'));
  await d.vault.saveSnapshot('customer:one', data); assert.equal(d.disk.get(d.vault.deviceKey('customer:one', 'snapshot')), encrypted, 'Unchanged data does not rewrite disk');
  assert(!encrypted.includes('Private Customer')); assert(!encrypted.includes('balance'));
  assert.deepEqual(normalise((await d.makeVault().loadSnapshot('customer:one')).data), data);
  assert.deepEqual(normalise((await d.makeVault(true).loadSnapshot('customer:one')).data), data, 'Native UTF-8 fallback preserves international names');
  await d.vault.saveSnapshot('customer:two', { wallets: [] });
  d.disk.set(d.vault.deviceKey('customer:two', 'snapshot'), encrypted);
  assert.equal(await d.makeVault().loadSnapshot('customer:two'), null);
  const corrupt = Buffer.from(encrypted, 'base64'); corrupt[20] ^= 1;
  d.disk.set(d.vault.deviceKey('customer:one', 'snapshot'), corrupt.toString('base64'));
  assert.equal(await d.makeVault().loadSnapshot('customer:one'), null);
});
test('snapshot age, web memory-only caching and scoped sign-out cleanup are enforced', async () => {
  const d = device(); await d.vault.saveSnapshot('agent:a', { pending: [] }); await d.vault.saveSnapshot('agent:b', { completed: [] });
  d.secure.set(d.vault.deviceKey('agent:a', 'pin'), 'secret');
  await d.vault.clearDeviceData('agent:a'); assert.equal(await d.vault.loadSnapshot('agent:a'), null);
  assert.equal(d.secure.has(d.vault.deviceKey('agent:a', 'pin')), false); assert(await d.makeVault().loadSnapshot('agent:b'));
  d.time(1000000 + 25 * 60 * 60 * 1000); assert.equal(await d.vault.loadSnapshot('agent:b'), null);
  d.platform.OS = 'web'; const count = d.disk.size; await d.vault.saveSnapshot('customer:web', { balance: 3 }); assert.equal(d.disk.size, count);
  assert.deepEqual(normalise((await d.vault.loadSnapshot('customer:web')).data), { balance: 3 });
});
test('PIN enrollment uses random salt and a slow verifier, rejects weak PINs and cannot overwrite an existing lock', async () => {
  const d = device(); await assert.rejects(d.security.createPin('customer:a', '123456'), /consecutive/);
  const record = await d.security.createPin('customer:a', '294618'); assert.equal(record.salt.length, 32); assert.equal(record.verifier.length, 64);
  const expected = crypto.pbkdf2Sync('294618', Buffer.from(record.salt, 'hex'), 600000, 32, 'sha256').toString('hex'); assert.equal(record.verifier, expected);
  assert(!d.secure.get(d.vault.deviceKey('customer:a', 'pin')).includes('294618'));
  await assert.rejects(d.security.createPin('customer:a', '846291'), /Verify your current/);
  assert.equal((await d.security.verifyPin('customer:a', '294618')).failures, 0);
});
test('failed PIN attempts persist, survive a new reader, cool down and require password after ten failures', async () => {
  const d = device(); await d.security.createPin('agent:a', '294618');
  for (let i = 0; i < 5; i++) await assert.rejects(d.security.verifyPin('agent:a', '846291'), /Incorrect PIN/);
  assert.equal((await d.security.readLock('agent:a')).failures, 5);
  await assert.rejects(d.security.verifyPin('agent:a', '294618'), /Try again in/);
  d.time(1060001); assert.equal((await d.security.verifyPin('agent:a', '294618')).failures, 0);
  for (let i = 0; i < 10; i++) { d.time(1200000 + i * 61000); await assert.rejects(d.security.verifyPin('agent:a', '846291'), /Incorrect PIN|Too many/); }
  await assert.rejects(d.security.verifyPin('agent:a', '294618'), /Too many/);
});
test('changing or disabling a PIN requires the current PIN and biometric release uses protected storage', async () => {
  const d = device(); await d.security.createPin('merchant:a', '294618');
  await assert.rejects(d.security.removePin('merchant:a', '846291'), /Incorrect PIN/);
  await d.security.changePin('merchant:a', '294618', '846291'); await assert.rejects(d.security.verifyPin('merchant:a', '294618'), /Incorrect PIN/);
  await d.security.setBiometric('merchant:a', '846291', true); assert((await d.security.verifyBiometric('merchant:a')).biometricHash);
  assert(d.prompts.some(p => p.requireAuthentication === true)); d.deny(); await assert.rejects(d.security.verifyBiometric('merchant:a'), /cancelled|changed/);
  await d.security.removePin('merchant:a', '846291'); assert.equal(await d.security.readLock('merchant:a'), null);
});
test('failed secure writes never report successful PIN enrollment and corrupt records fail closed', async () => {
  const d = device(); d.failWrites(); await assert.rejects(d.security.createPin('customer:a', '294618'), /storage failed/); assert.equal(d.secure.size, 0);
  const other = device(); other.secure.set(other.vault.deviceKey('agent:a', 'pin'), '{"version":1}'); await assert.rejects(other.security.readLock('agent:a'), /could not be read/);
});

test('native token storage is device-only and cannot fall back to plaintext if secure storage fails', async () => {
  let saved, plainWrites = 0, unavailable = false;
  const sessions = load('storage/secureSession.ts', name => {
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    if (name === '@react-native-async-storage/async-storage') return { setItem: async () => plainWrites++ };
    if (name === 'expo-secure-store') {
      if (unavailable) throw Error('missing keychain');
      return { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7, setItemAsync: async (key, value, options) => { saved = { key, value, options }; } };
    }
    throw Error(name);
  });
  await sessions.saveSession('session', 'fixture-token'); assert.equal(saved.options.keychainAccessible, 7); assert.equal(plainWrites, 0);
  unavailable = true; await assert.rejects(sessions.saveSession('session', 'fixture-token'), /Secure device storage is unavailable/); assert.equal(plainWrites, 0);
});
test('customer, agent and merchant share the same vault, PIN rules and local lock implementation', () => {
  for (const file of ['storage/deviceVault.ts', 'storage/localSecurity.ts', 'storage/deviceAccess.ts', 'context/DeviceLockContext.tsx', 'components/DeviceSecuritySettings.tsx', 'api/sessionAuth.ts']) {
    const read = app => fs.readFileSync(path.join(__dirname, '../../', app, 'src', file), 'utf8');
    assert.equal(read('sutura-app'), read('sutura-agent')); assert.equal(read('sutura-app'), read('merchant-app'));
  }
});

test('sign-out clears tokens and the correct account cache/PIN in every app', async () => {
  for (const [app, role] of [['sutura-app', 'customer'], ['sutura-agent', 'agent'], ['merchant-app', 'merchant']]) {
    let index = 0, tokenCleared = false; const wiped = [];
    const session = { username: 'fixture@example.invalid', email: 'fixture@example.invalid', accessToken: 'fixture-access', refreshToken: 'fixture-refresh', userStatus: 'ACTIVE' };
    const source = fs.readFileSync(path.join(__dirname, '../../', app, 'src/context', role === 'merchant' ? 'AppContext.tsx' : 'AuthContext.tsx'), 'utf8');
    const jsx = (type, props) => ({ type, props }); const exports = {};
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { exports, require(name) {
      if (name === 'react') return { createContext: () => ({ Provider: 'Provider' }), useState: initial => [index++ === (role === 'merchant' ? 1 : 0) ? session : initial, () => {}], useRef: value => ({ current: value }), useCallback: fn => fn, useMemo: fn => fn(), useEffect() {} };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name.endsWith('deviceVault')) return { clearDeviceData: async scope => wiped.push(scope) };
      if (name.endsWith('/secureSession') || name.endsWith('/session')) return { clearSession: async () => { tokenCleared = true; } };
      if (name.endsWith('useBackNavigation')) return { useBackNavigation: () => ['home', () => {}, () => {}] };
      if (name.endsWith('useAutoRefresh')) return { useAutoRefresh() {} };
      return {};
    } });
    const provider = role === 'merchant' ? exports.AppProvider : exports.AuthProvider;
    await provider({ children: null }).props.value.signOut();
    assert.equal(tokenCleared, true); assert.deepEqual(wiped, [`${role}:fixture@example.invalid`]);
  }
});
