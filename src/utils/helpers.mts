/**
 * Pauses execution for a given number of milliseconds.
 *
 * @param ms - The number of milliseconds to wait.
 * @returns A Promise that resolves after the specified delay.
 *
 * @example
 * await delay(500); // waits 500ms before continuing
 */
export async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Repeatedly polls a condition function until it returns `true` or a timeout
 * is reached. The condition is checked in 10ms intervals.
 *
 * @param cond - A zero-argument predicate that returns `true` when the
 *   awaited condition has been met.
 * @param timeout - Maximum time in milliseconds to wait before giving up.
 *   Defaults to `700`.
 * @param grainSize - How long before it does another check on the condition
 * 	 Defaults to `10`.
 * @returns A Promise that resolves to `true` if the condition was met within
 *   the timeout, or `false` if the timeout elapsed first.
 *
 * @example
 * const success = await waitOrTimeout(() => element.isVisible(), 1000);
 * if (!success) console.warn('Timed out waiting for element');
 */
export async function waitOrTimeout(
  cond: () => Promise<boolean> | boolean,
  timeout: number = 700,
  grainSize: number = 10,
): Promise<boolean> {
  let acc = 0;
  while (!(await cond())) {
    if (acc >= timeout) {
      return false;
    }
    await delay(grainSize);
    acc += grainSize;
  }
  return true;
}
