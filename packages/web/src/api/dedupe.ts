/**
 * In-flight query deduplication — presentation only, no business caching rules.
 */

const inflight = new Map<string, Promise<unknown>>();

export function dedupeAsync<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = run().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}
