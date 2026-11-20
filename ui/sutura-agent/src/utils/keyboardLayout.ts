/** Only reserve overlap left after Android resize or an enclosing iOS avoider. */
export function keyboardOverlap(bottom: number, reserved: number, keyboardTop: number | undefined): number {
  return keyboardTop === undefined ? 0 : Math.max(0, bottom + reserved - keyboardTop);
}

export function focusedScrollOffset(offset: number, top: number, bottom: number, fieldTop: number, fieldHeight: number): number {
  const gap = 16;
  const visibleHeight = Math.max(0, bottom - top - gap * 2);
  if (fieldHeight > visibleHeight || fieldTop < top + gap) return Math.max(0, offset + fieldTop - top - gap);
  return Math.max(0, offset + Math.max(0, fieldTop + fieldHeight - bottom + gap));
}

const focusListeners = new Set<() => void>();
export function notifyKeyboardFocus() { focusListeners.forEach(listener => listener()); }
export function subscribeKeyboardFocus(listener: () => void) {
  focusListeners.add(listener);
  return () => { focusListeners.delete(listener); };
}
