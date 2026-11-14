// Pure retry/accounting rules for proxy connections (kept free of runtime imports so they are unit-testable).

export const PROXY_DISABLE_AFTER = 5;

export type ProxyAttemptDeps<T> = {
  /** Opens a connection through the proxy; must throw an error with name "ProxyConnectError" for proxy-side failures. */
  attempt: () => Promise<T>;
  onProxyFailure: () => Promise<void>;
};

export const isProxyError = (e: unknown): boolean => e instanceof Error && e.name === "ProxyConnectError";

/**
 * One retry through the SAME proxy for proxy-side connection errors. If the retry fails as well,
 * the failure is counted exactly once. Any other error (e.g. SMTP auth) is rethrown untouched and not counted.
 */
export async function connectWithProxyRetry<T>(d: ProxyAttemptDeps<T>): Promise<T> {
  try {
    return await d.attempt();
  } catch (first) {
    if (!isProxyError(first)) throw first;
  }
  try {
    return await d.attempt();
  } catch (second) {
    if (isProxyError(second)) await d.onProxyFailure();
    throw second;
  }
}
