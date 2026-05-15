import { useEffect, useRef } from 'react';

/**
 * Closes an open dialog/drawer on browser back / mobile swipe-back,
 * instead of navigating away from the current page.
 *
 * Strategy: push a sentinel history entry when the dialog opens; a popstate
 * listener then closes the dialog. On programmatic close, pops the sentinel.
 *
 * In Capacitor MemoryRouter (native), pushState is effectively a no-op and
 * popstate never fires — hook degrades silently.
 */
export function useDialogBackClose(
  isOpen: boolean,
  onClose: () => void,
  shouldPreventClose: boolean = false,
) {
  const sentinelIdRef = useRef<string>(Math.random().toString(36).slice(2));
  const sentinelPushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const shouldPreventCloseRef = useRef(shouldPreventClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    shouldPreventCloseRef.current = shouldPreventClose;
  }, [shouldPreventClose]);

  useEffect(() => {
    if (!isOpen) {
      if (sentinelPushedRef.current) {
        const state = window.history.state as { __dialogSentinel?: string } | null;
        if (state?.__dialogSentinel === sentinelIdRef.current) {
          window.history.back();
        }
        sentinelPushedRef.current = false;
      }
      return;
    }

    window.history.pushState(
      { __dialogSentinel: sentinelIdRef.current },
      '',
      window.location.href,
    );
    sentinelPushedRef.current = true;

    const handlePopstate = () => {
      if (shouldPreventCloseRef.current) {
        window.history.pushState(
          { __dialogSentinel: sentinelIdRef.current },
          '',
          window.location.href,
        );
        return;
      }
      sentinelPushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  }, [isOpen]);
}
