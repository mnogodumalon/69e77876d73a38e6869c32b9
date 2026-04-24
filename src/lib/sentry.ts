// Sentry is not installed — provide a no-op stub so imports don't break.
export const Sentry = {
  init: () => {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  captureException: (..._args: any[]) => {},
  setTag: () => {},
};
