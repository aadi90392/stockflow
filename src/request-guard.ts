/** Prevent old poll responses from replacing a newer tab or mutation result. */
export function createRequestGuard() {
  let version = 0;
  return {
    begin: () => ++version,
    isCurrent: (request: number) => request === version,
    invalidate: () => {
      version++;
    },
  };
}
