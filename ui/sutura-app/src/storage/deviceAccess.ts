let unlocked = true;
const listeners = new Set<() => void>();
export const deviceIsUnlocked = () => unlocked;
export function setDeviceUnlocked(value: boolean) {
  const resumed = value && !unlocked; unlocked = value;
  if (resumed) listeners.forEach(listener => listener());
}
export function subscribeDeviceUnlock(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
