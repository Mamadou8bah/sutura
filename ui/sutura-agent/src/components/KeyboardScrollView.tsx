import { forwardRef, useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { Keyboard, Platform, ScrollView, StatusBar, StyleSheet, TextInput, type ScrollViewProps } from "react-native";
import { focusedScrollOffset, keyboardOverlap, subscribeKeyboardFocus } from "../utils/keyboardLayout";

/** One keyboard policy for forms, PIN unlock and modal searches. No native dependency. */
export const KeyboardScrollView = forwardRef<ComponentRef<typeof ScrollView>, ScrollViewProps>((props, forwardedRef) => {
  const scroll = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const offset = useRef(0);
  const reserved = useRef(0);
  const [overlap, setOverlap] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const active = useRef(true);
  const keyboardTop = useRef<number | undefined>(undefined);

  const reveal = useCallback(() => {
    if (Platform.OS === "web" || props.horizontal || !active.current) return;
    const view = scroll.current;
    if (!view) return;
    view.measureInWindow((_x, windowTop, _width, height) => {
      // Android measureInWindow excludes the status-bar origin; keyboard events
      // use screen coordinates. Compare them in the same coordinate space.
      const origin = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
      const top = windowTop + origin;
      if (!active.current || height <= 0) return;
      const bottom = top + height;
      const next = keyboardOverlap(bottom, reserved.current, keyboardTop.current);
      if (Math.abs(next - reserved.current) > 1) {
        reserved.current = next;
        setOverlap(next);
        return; // onLayout reveals the field after the new viewport is measured.
      }
      if (keyboardTop.current === undefined) return;
      const field = TextInput.State.currentlyFocusedInput();
      const inner = view.getInnerViewRef();
      if (!field || !inner) return;
      // measureLayout succeeds only for descendants: background screens and outer
      // scroll views must not scroll in response to a field in another modal.
      field.measureLayout(inner, () => {
        field.measureInWindow((_fieldX, windowFieldTop, _fieldWidth, fieldHeight) => {
          const fieldTop = windowFieldTop + origin;
          if (!active.current || keyboardTop.current === undefined || TextInput.State.currentlyFocusedInput() !== field) return;
          // Leave room for the next field/help text or the form's action, rather
          // than putting the caret directly against the keyboard toolbar.
          const visibleBottom = Math.min(bottom, keyboardTop.current ?? bottom);
          const context = Math.min(80, Math.max(0, (visibleBottom - top - fieldHeight) / 3));
          const y = focusedScrollOffset(offset.current, top, visibleBottom - context, fieldTop, fieldHeight);
          if (Math.abs(y - offset.current) > 1) view.scrollTo({ y, animated: false });
        });
      }, () => {});
    });
  }, [props.horizontal]);

  const schedule = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [0, 120, 350].map(delay => setTimeout(reveal, delay));
  }, [reveal]);

  useEffect(() => {
    active.current = true;
    if (Platform.OS === "web" || props.horizontal) return;
    keyboardTop.current = Keyboard.metrics()?.screenY;
    const show = Keyboard.addListener("keyboardDidShow", event => { keyboardTop.current = event.endCoordinates.screenY; schedule(); });
    const frame = Keyboard.addListener("keyboardWillChangeFrame", event => {
      // iOS emits this for predictive-text, keyboard type and hardware keyboard changes.
      keyboardTop.current = event.endCoordinates.height > 0 ? event.endCoordinates.screenY : undefined;
      schedule();
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => { keyboardTop.current = undefined; reserved.current = 0; setOverlap(0); });
    const unsubscribe = subscribeKeyboardFocus(schedule);
    schedule();
    return () => {
      active.current = false;
      show.remove(); frame.remove(); hide.remove(); unsubscribe();
      timers.current.forEach(clearTimeout);
    };
  }, [props.horizontal, schedule]);

  const style = StyleSheet.flatten(props.style);
  return <ScrollView {...props} ref={node => {
    scroll.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }}
    // The measured overlap is shared by both platforms; automatic iOS insets
    // would add keyboard height a second time inside existing avoidance views.
    automaticallyAdjustKeyboardInsets={false}
    keyboardShouldPersistTaps={props.keyboardShouldPersistTaps ?? "handled"}
    keyboardDismissMode={props.keyboardDismissMode ?? "on-drag"}
    style={[props.style, !props.horizontal && { minHeight: 0, marginBottom: (typeof style?.marginBottom === "number" ? style.marginBottom : 0) + overlap }]}
    scrollEventThrottle={props.scrollEventThrottle ?? 16}
    onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; props.onScroll?.(event); }}
    onLayout={event => { props.onLayout?.(event); schedule(); }}
    onContentSizeChange={(width, height) => { props.onContentSizeChange?.(width, height); schedule(); }}
  />;
});
