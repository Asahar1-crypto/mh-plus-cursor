/**
 * Sentry error monitoring — wrapper module.
 *
 * Currently a NO-OP stub. To enable error monitoring in production:
 *
 *   1. Install packages:
 *        npm install --save @sentry/react @sentry/capacitor
 *
 *   2. Create a Sentry project at https://sentry.io and copy the DSN.
 *      Set VITE_SENTRY_DSN=<your-dsn> in .env.production.
 *
 *   3. Uncomment the block marked "ENABLE SENTRY" below.
 *
 * Why a stub? It keeps the build green before the packages are installed,
 * while the rest of the codebase (ErrorBoundary, main.tsx) already calls
 * initSentry() / Sentry.captureException(). No refactor needed later —
 * just uncomment.
 *
 * - On native (Android/iOS): @sentry/capacitor captures native crashes
 *   (Java/Kotlin + Objective-C/Swift) in addition to JS errors.
 * - On web: @sentry/react handles JS errors + performance tracing.
 */

type SentryLike = {
  captureException: (err: unknown) => void;
  withScope: (cb: (scope: { setExtras: (e: Record<string, unknown>) => void }) => void) => void;
};

const noopSentry: SentryLike = {
  captureException: () => {},
  withScope: (cb) => cb({ setExtras: () => {} }),
};

let sentryInstance: SentryLike = noopSentry;

export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  if (import.meta.env.MODE !== 'production') return;

  // ============ ENABLE SENTRY — uncomment after `npm install` ============
  //
  // try {
  //   const { Capacitor } = await import('@capacitor/core');
  //   const SentryReact = await import('@sentry/react');
  //   const SentryCapacitor = await import('@sentry/capacitor').catch(() => null);
  //
  //   const options = {
  //     dsn,
  //     environment: import.meta.env.MODE,
  //     release: import.meta.env.VITE_APP_VERSION || 'unknown',
  //     tracesSampleRate: 0.1,
  //     ignoreErrors: [
  //       'top.GLOBALS',
  //       'NetworkError',
  //       'Failed to fetch',
  //       'ResizeObserver loop limit exceeded',
  //       'ResizeObserver loop completed with undelivered notifications',
  //     ],
  //     integrations: [SentryReact.browserTracingIntegration()],
  //   };
  //
  //   if (Capacitor.isNativePlatform() && SentryCapacitor) {
  //     SentryCapacitor.init(options, SentryReact.init);
  //   } else {
  //     SentryReact.init(options);
  //   }
  //
  //   sentryInstance = SentryReact as unknown as SentryLike;
  // } catch (err) {
  //   console.warn('[sentry] Initialization skipped:', err);
  // }
  //
  // =======================================================================
}

export const Sentry: SentryLike = {
  captureException: (err) => sentryInstance.captureException(err),
  withScope: (cb) => sentryInstance.withScope(cb),
};
