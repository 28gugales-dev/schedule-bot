import { useEffect, useRef } from 'react';

// Elements that can receive focus inside a dialog. Mirrors the WAI-ARIA
// authoring-practices focusable set; excludes programmatically-removed tab stops.
const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Traps keyboard focus within a container while `active`, cycles Tab/Shift+Tab,
// closes on Escape, and restores focus to the previously-focused element on exit.
// Returns a ref to spread onto the dialog container div.
export function useFocusTrap(active, { onClose, returnFocus = true } = {}) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);
  // Keep the latest onClose in a ref so a new inline callback identity on each
  // parent render does NOT re-run the trap effect (which would steal focus back
  // to the first focusable). The effect stays keyed on `active`/`returnFocus`.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    // SSR / not-yet-mounted guard: nothing to trap until the node exists.
    if (typeof document === 'undefined') return;
    const container = containerRef.current;
    if (!container) return;

    previousFocusRef.current = document.activeElement;

    const focusables = () => Array.from(container.querySelectorAll(FOCUSABLE));

    // Focus first focusable; fall back to the container itself.
    const first = focusables()[0];
    if (first) {
      first.focus();
    } else {
      container.tabIndex = -1;
      container.focus();
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        // Keep focus pinned to the container when there's nothing to cycle.
        e.preventDefault();
        return;
      }

      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === firstItem || !container.contains(activeEl)) {
          e.preventDefault();
          lastItem.focus();
        }
      } else if (activeEl === lastItem || !container.contains(activeEl)) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);

    return () => {
      container.removeEventListener('keydown', onKeyDown);
      // Restore focus to wherever it was before the trap engaged.
      if (returnFocus) {
        previousFocusRef.current?.focus?.();
      }
    };
  }, [active, returnFocus]);

  return containerRef;
}
