// Sentry stub — @sentry/react not installed, no-op implementation
export const Sentry = {
  init: (_options: unknown) => {},
  captureException: (_error: unknown, _ctx?: unknown) => {},
  setTag: (_key: string, _value: string) => {},
};

const DSN = "https://a0a6a937e751b39ecf7303042f45cd6e@sentry.livinglogic.de/42";
const ENVIRONMENT = "dashboard-69e77876d73a38e6869c32b9";
const RELEASE = "0.0.110";
const APPGROUP_ID = "69e77876d73a38e6869c32b9";

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: ENVIRONMENT || undefined,
    release: RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
  if (APPGROUP_ID) {
    Sentry.setTag('appgroup_id', APPGROUP_ID);
  }
}
